import { useState, useEffect, useMemo } from 'react'
import {
  XIcon,
  AlertCircleIcon,
  CheckIcon,
  ShieldIcon,
  ClockIcon,
  MapPinIcon
} from '../Icons'
import {
  submitStudentWrongParkingReport,
  subscribeToStudentWrongParkingReports,
  STUDENT_REPORT_STATUSES,
  STUDENT_REPORT_FLOORS,
  STUDENT_REPORT_REASONS,
  normalizeSlotId
} from '../../services/parkingService'
import { normalizePlate } from '../../services/vehicleService'
import { createNotification } from '../../services/notificationService'
import { auth } from '../../firebase/firebase'
import './StudentWrongParkingReport.css'

/**
 * Format timestamp safely into human-readable date/time string
 */
function formatReportTimestamp(createdAt) {
  if (!createdAt) return 'Just now'
  let millis = null
  if (typeof createdAt.toMillis === 'function') millis = createdAt.toMillis()
  else if (createdAt.seconds) millis = createdAt.seconds * 1000
  else if (typeof createdAt === 'number') millis = createdAt
  else if (createdAt instanceof Date) millis = createdAt.getTime()
  else if (typeof createdAt === 'string') {
    const parsed = new Date(createdAt).getTime()
    if (!isNaN(parsed)) millis = parsed
  }

  if (!millis) return 'Recent'

  return new Date(millis).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export default function StudentWrongParkingReport({
  isOpen = false,
  onClose,
  user,
  userProfile,
  slots = [],
  showToast,
  initialTab = 'form',
  isPage = false
}) {
  const shouldRender = isPage || Boolean(isOpen)
  const [activeTab, setActiveTab] = useState(initialTab) // 'form' | 'reports'

  // Form State
  const [vehicleNumber, setVehicleNumber] = useState('')
  const [floor, setFloor] = useState('Ground Floor')
  const [slotId, setSlotId] = useState('')
  const [reason, setReason] = useState(STUDENT_REPORT_REASONS[0] || 'Floor Mismatch')
  const [description, setDescription] = useState('')

  // Submission Status
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState(null)
  const [submittedReportId, setSubmittedReportId] = useState(null)

  // Real-time Student Reports State
  const [reports, setReports] = useState([])
  const [reportsLoading, setReportsLoading] = useState(false)
  const [reportsError, setReportsError] = useState(null)

  // Current authenticated student identity
  const currentUid = user?.uid || auth?.currentUser?.uid || ''
  const displayName = userProfile?.displayName || user?.displayName || 'Student'
  const email = user?.email || userProfile?.email || ''
  const rollNumber = userProfile?.campusId || userProfile?.rollNumber || ''

  // Sync initial tab when opened or initialTab changes
  useEffect(() => {
    if (shouldRender) {
      setActiveTab(initialTab)
      setFormError(null)
      setSubmittedReportId(null)
    }
  }, [shouldRender, initialTab])

  // Real-time Firestore subscription to this student's reports
  useEffect(() => {
    if (!shouldRender || !currentUid) {
      return
    }

    setReportsLoading(true)
    setReportsError(null)

    const unsubscribe = subscribeToStudentWrongParkingReports(
      currentUid,
      (list) => {
        setReports(list || [])
        setReportsLoading(false)
      },
      (err) => {
        console.warn('[StudentWrongParkingReport] Subscription notice:', err?.message)
        setReportsError(err?.message || 'Failed to load reports')
        setReportsLoading(false)
      }
    )

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe()
      }
    }
  }, [shouldRender, currentUid])

  // Close on Escape key (modal mode only)
  useEffect(() => {
    if (isPage || !isOpen) return
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isSubmitting) {
        onClose && onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isPage, isOpen, isSubmitting, onClose])

  // Filter slots for dropdown: Ground vs Basement
  const groundSlots = useMemo(() => {
    const list = slots.filter((s) => s.floor === 'Ground Floor' || s.id?.startsWith('G-'))
    if (list.length > 0) return list
    // Fallback standard 80 ground bays
    return Array.from({ length: 80 }, (_, i) => ({
      id: `G-${String(i + 1).padStart(2, '0')}`,
      floor: 'Ground Floor'
    }))
  }, [slots])

  const basementSlots = useMemo(() => {
    const list = slots.filter((s) => s.floor === 'Basement' || s.id?.startsWith('B-'))
    if (list.length > 0) return list
    // Fallback standard 80 basement bays
    return Array.from({ length: 80 }, (_, i) => ({
      id: `B-${String(i + 1).padStart(2, '0')}`,
      floor: 'Basement'
    }))
  }, [slots])

  // Form submission handler
  const handleSubmit = async (e) => {
    if (e) e.preventDefault()
    if (isSubmitting) return

    setFormError(null)

    // 1. Authenticated User Check
    if (!currentUid) {
      setFormError('Authentication required. Please log in to file a report.')
      return
    }

    // 2. Validate Vehicle Number
    const cleanPlate = normalizePlate(vehicleNumber)
    if (!cleanPlate || cleanPlate.length < 3) {
      setFormError('Please enter a valid vehicle registration number (at least 3 characters).')
      return
    }

    // 3. Validate Floor
    if (!floor || !STUDENT_REPORT_FLOORS.includes(floor)) {
      setFormError(`Please select a valid floor: ${STUDENT_REPORT_FLOORS.join(', ')}`)
      return
    }

    // 4. Validate Reason
    if (!reason || !STUDENT_REPORT_REASONS.includes(reason)) {
      setFormError(`Please select a valid reason: ${STUDENT_REPORT_REASONS.join(', ')}`)
      return
    }

    setIsSubmitting(true)
    try {
      const cleanSlotId = slotId ? normalizeSlotId(slotId) : null

      const reportId = await submitStudentWrongParkingReport({
        reporterUid: currentUid,
        reporterName: displayName,
        reporterEmail: email,
        vehicleNumber: cleanPlate,
        slotId: cleanSlotId,
        floor,
        reason,
        description: (description || '').trim()
      })

      // Secondary non-blocking persistent student notification
      try {
        createNotification({
          userId: currentUid,
          title: 'Wrong Parking Report Submitted',
          message: `Your report for vehicle ${cleanPlate} (${cleanSlotId ? `Bay ${cleanSlotId}, ` : ''}${floor}) has been received. Ref: ${reportId}`,
          type: 'info',
          relatedSlotId: cleanSlotId,
          relatedVehiclePlate: cleanPlate
        }).catch(() => {})
      } catch {
        // Safe non-blocking hook
      }

      if (showToast) {
        showToast(
          'Report Submitted',
          `Report for vehicle ${cleanPlate} submitted successfully. Ref: ${reportId}`,
          'success'
        )
      }

      // Reset form state only on successful submission
      setVehicleNumber('')
      setSlotId('')
      setDescription('')
      setSubmittedReportId(reportId)
    } catch (err) {
      console.error('[StudentWrongParkingReport] Submission failed:', err)
      setFormError(err.message || 'Failed to submit report. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancelForm = () => {
    if (isPage) {
      setVehicleNumber('')
      setSlotId('')
      setDescription('')
      setFormError(null)
    } else {
      if (!isSubmitting && onClose) onClose()
    }
  }

  if (!shouldRender) return null

  const renderBodyContent = () => (
    <>
      {activeTab === 'form' ? (
        submittedReportId ? (
          /* Success Confirmation View */
          <div className="swpr-success-box">
            <div className="swpr-success-icon-wrap">
              <CheckIcon className="w-8 h-8 text-emerald" />
            </div>
            <h4 className="swpr-success-title">Report Filed Successfully</h4>
            <p className="swpr-success-desc">
              Thank you for helping maintain campus parking compliance. Security administration has received your report and will verify bay telemetry.
            </p>

            <div className="swpr-receipt-card font-mono">
              <div className="swpr-receipt-row">
                <span className="swpr-receipt-label">Reference ID</span>
                <strong className="swpr-receipt-val text-cyan">{submittedReportId}</strong>
              </div>
              <div className="swpr-receipt-row">
                <span className="swpr-receipt-label">Status</span>
                <span className="swpr-status-pill pending">⏳ PENDING</span>
              </div>
              <div className="swpr-receipt-row">
                <span className="swpr-receipt-label">Reporter</span>
                <span className="swpr-receipt-val">{displayName}</span>
              </div>
              <div className="swpr-receipt-row">
                <span className="swpr-receipt-label">Time</span>
                <span className="swpr-receipt-val">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setSubmittedReportId(null)}
              >
                + Report Another Vehicle
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => setActiveTab('reports')}
              >
                View in My Reports &rarr;
              </button>
            </div>
          </div>
        ) : (
          /* Report Input Form */
          <form onSubmit={handleSubmit} className="swpr-form" noValidate>
            {formError && (
              <div className="swpr-error-banner" role="alert">
                <AlertCircleIcon className="w-4 h-4 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* Vehicle Plate */}
            <div className="form-group">
              <label htmlFor="swpr-vehicle-plate" className="swpr-label">
                Vehicle Registration Number <span className="swpr-required">*</span>
              </label>
              <input
                id="swpr-vehicle-plate"
                type="text"
                className="swpr-input font-mono"
                placeholder="e.g. MH-12-AB-1234"
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                disabled={isSubmitting}
                required
                autoComplete="off"
              />
            </div>

            {/* Floor and Bay Row */}
            <div className="swpr-field-row">
              {/* Floor Selector */}
              <div className="form-group">
                <label htmlFor="swpr-floor-select" className="swpr-label">
                  Floor / Location <span className="swpr-required">*</span>
                </label>
                <select
                  id="swpr-floor-select"
                  className="swpr-select"
                  value={floor}
                  onChange={(e) => setFloor(e.target.value)}
                  disabled={isSubmitting}
                  required
                >
                  {STUDENT_REPORT_FLOORS.map((fl) => (
                    <option key={fl} value={fl}>
                      {fl === 'Ground Floor' ? '🛵 Ground Floor (Scooties)' : fl === 'Basement' ? '🏍️ Basement (Bikes)' : fl}
                    </option>
                  ))}
                </select>
              </div>

              {/* Slot Bay Selector (Optional) */}
              <div className="form-group">
                <label htmlFor="swpr-slot-select" className="swpr-label">
                  Parking Bay <span className="swpr-optional">(Optional)</span>
                </label>
                <select
                  id="swpr-slot-select"
                  className="swpr-select font-mono"
                  value={slotId}
                  onChange={(e) => setSlotId(e.target.value)}
                  disabled={isSubmitting}
                >
                  <option value="">-- No Bay / Unknown / Ramp --</option>
                  <optgroup label="Ground Floor (G-01 to G-80)">
                    {groundSlots.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.id}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Basement (B-01 to B-80)">
                    {basementSlots.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.id}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>
            </div>

            {/* Reason Selector */}
            <div className="form-group">
              <label htmlFor="swpr-reason-select" className="swpr-label">
                Reason for Violation Report <span className="swpr-required">*</span>
              </label>
              <select
                id="swpr-reason-select"
                className="swpr-select"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                disabled={isSubmitting}
                required
              >
                {STUDENT_REPORT_REASONS.map((rsn) => (
                  <option key={rsn} value={rsn}>
                    {rsn}
                  </option>
                ))}
              </select>
            </div>

            {/* Description Textarea */}
            <div className="form-group">
              <label htmlFor="swpr-description" className="swpr-label">
                Additional Details <span className="swpr-optional">(Optional)</span>
              </label>
              <textarea
                id="swpr-description"
                className="swpr-textarea"
                placeholder="Provide details (e.g. vehicle model, color, blocking aisle, obstructing entrance)..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={300}
                disabled={isSubmitting}
              />
              <span className="swpr-char-hint">
                {description.length}/300 characters
              </span>
            </div>

            {/* Reporter Verified Profile Chip */}
            <div className="swpr-reporter-chip">
              <span className="swpr-chip-dot" />
              <div>
                Reporting as verified student: <strong style={{ color: '#f8fafc' }}>{displayName}</strong>
                {rollNumber ? ` (${rollNumber})` : ''}
                {email ? ` &bull; ${email}` : ''}
              </div>
            </div>

            {/* Actions */}
            <div className="swpr-actions">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleCancelForm}
                disabled={isSubmitting}
              >
                {isPage ? 'Clear Form' : 'Cancel'}
              </button>
              <button
                type="submit"
                className="btn btn-rose btn-sm"
                disabled={isSubmitting}
                style={{
                  background: 'linear-gradient(135deg, #f43f5e, #be123c)',
                  border: '1px solid rgba(244, 63, 94, 0.5)',
                  color: '#ffffff',
                  boxShadow: '0 4px 14px rgba(244, 63, 94, 0.35)',
                  fontWeight: 600,
                  minWidth: '130px'
                }}
              >
                {isSubmitting ? 'Submitting...' : '📩 Submit Report'}
              </button>
            </div>
          </form>
        )
      ) : (
        /* My Reports Real-time List (Tab 2) */
        <div className="swpr-reports-container">
          {reportsLoading ? (
            <div className="swpr-loading-state">
              <ClockIcon className="w-6 h-6 animate-spin text-cyan mx-auto mb-2" />
              <p>Loading your reports from Firestore...</p>
            </div>
          ) : reportsError ? (
            <div className="swpr-error-banner">
              <AlertCircleIcon className="w-5 h-5 flex-shrink-0" />
              <span>{reportsError}</span>
            </div>
          ) : reports.length === 0 ? (
            <div className="swpr-empty-state">
              <span className="swpr-empty-icon">🛡️</span>
              <h4 style={{ color: '#f8fafc', margin: '0 0 6px', fontSize: '15px' }}>
                No Reports Filed
              </h4>
              <p style={{ fontSize: '13px', margin: 0 }}>
                You have not submitted any wrong parking reports yet. If you spot a vehicle violating parking rules, use the form tab to alert campus enforcement.
              </p>
              <button
                type="button"
                className="btn btn-secondary btn-sm mt-3"
                onClick={() => setActiveTab('form')}
              >
                + Report Wrong Parking
              </button>
            </div>
          ) : (
            reports.map((report) => {
              const statusKey = (report.status || 'Pending').toLowerCase().replace(/\s+/g, '-')
              return (
                <div key={report.id} className="swpr-report-card">
                  <div className="swpr-card-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="swpr-plate-badge">
                        {report.vehicleNumber || report.plate || 'UNKNOWN'}
                      </span>
                      <span className={`swpr-status-pill ${statusKey}`}>
                        {report.status === 'Resolved' ? '✓ RESOLVED' : report.status === 'Under Review' ? '🔍 UNDER REVIEW' : report.status === 'Dismissed' ? '✕ DISMISSED' : '⏳ PENDING'}
                      </span>
                    </div>
                    <span className="text-xs font-mono text-muted">
                      {formatReportTimestamp(report.createdAt)}
                    </span>
                  </div>

                  <div className="swpr-card-meta">
                    <div className="swpr-meta-item">
                      <span>📍 Location:</span>
                      <strong>{report.slotId ? `Bay ${report.slotId}` : report.floor || 'Campus'}</strong>
                    </div>
                    <div className="swpr-meta-item">
                      <span>🏢 Floor:</span>
                      <strong>{report.floor}</strong>
                    </div>
                    <div className="swpr-meta-item" style={{ gridColumn: 'span 2' }}>
                      <span>⚠️ Reason:</span>
                      <strong className="text-amber">{report.reason}</strong>
                    </div>
                  </div>

                  {report.description && (
                    <p className="swpr-card-desc">
                      "{report.description}"
                    </p>
                  )}

                  {/* Admin Resolution Note (if attached) */}
                  {report.adminNote && (
                    <div className="swpr-admin-note">
                      <div className="swpr-admin-note-header">
                        <span>🛡️ Security Resolution Note</span>
                        {report.resolvedBy && (
                          <span style={{ color: '#94a3b8', fontSize: '11px' }}>
                            by {report.resolvedBy}
                          </span>
                        )}
                      </div>
                      <p className="swpr-admin-note-text">
                        "{report.adminNote}"
                      </p>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      )}
    </>
  )

  if (isPage) {
    return (
      <div className="student-reports-page">
        {/* Page Section Header */}
        <div className="page-section-header glass-card">
          <div
            className="psh-badge"
            style={{
              background: 'rgba(244, 63, 94, 0.12)',
              borderColor: 'rgba(244, 63, 94, 0.35)',
              color: '#fb7185'
            }}
          >
            <span>⚠️ CAMPUS ENFORCEMENT &amp; BAY COMPLIANCE</span>
          </div>
          <div className="psh-title-row">
            <h1 className="psh-title">
              Wrong Parking <span className="gradient-text">Reports</span>
            </h1>
          </div>
          <p className="psh-subtitle">
            Report incorrectly parked vehicles or unauthorized bay obstructions, and track the status of your submitted enforcement reports in real time.
          </p>
        </div>

        {/* Dedicated Page Card */}
        <div className="swpr-page-card glass-card">
          {/* Navigation Tabs */}
          <div className="swpr-tabs swpr-page-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              id="swpr-page-tab-form"
              aria-selected={activeTab === 'form'}
              className={`swpr-tab-btn ${activeTab === 'form' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('form')
                setSubmittedReportId(null)
              }}
            >
              <span>⚠️ Report Wrong Parking</span>
            </button>

            <button
              type="button"
              role="tab"
              id="swpr-page-tab-reports"
              aria-selected={activeTab === 'reports'}
              className={`swpr-tab-btn ${activeTab === 'reports' ? 'active' : ''}`}
              onClick={() => setActiveTab('reports')}
            >
              <span>📋 My Reports</span>
              <span className="swpr-tab-count font-mono">{reports.length}</span>
            </button>
          </div>

          {/* Page Body */}
          <div className="swpr-body swpr-page-body">
            {renderBodyContent()}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className="modal-backdrop"
      onClick={() => !isSubmitting && onClose && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="swpr-title"
    >
      <div
        className="swpr-modal-card glass-card"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="swpr-header">
          <div className="swpr-header-left">
            <div className="swpr-icon-badge">
              <AlertCircleIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 id="swpr-title" className="swpr-header-title">
                Wrong Parking <span className="gradient-text">Enforcement</span>
              </h3>
              <p className="swpr-header-subtitle">
                SOCMAC Smart Park &bull; Two-Wheeler Campus Security
              </p>
            </div>
          </div>
          <button
            type="button"
            className="swpr-close-btn"
            onClick={() => !isSubmitting && onClose && onClose()}
            disabled={isSubmitting}
            aria-label="Close report modal"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="swpr-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            id="swpr-modal-tab-form"
            aria-selected={activeTab === 'form'}
            className={`swpr-tab-btn ${activeTab === 'form' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('form')
              setSubmittedReportId(null)
            }}
          >
            <span>⚠️ Report Wrong Parking</span>
          </button>

          <button
            type="button"
            role="tab"
            id="swpr-modal-tab-reports"
            aria-selected={activeTab === 'reports'}
            className={`swpr-tab-btn ${activeTab === 'reports' ? 'active' : ''}`}
            onClick={() => setActiveTab('reports')}
          >
            <span>📋 My Reports</span>
            <span className="swpr-tab-count font-mono">{reports.length}</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="swpr-body">
          {renderBodyContent()}
        </div>
      </div>
    </div>
  )
}
