import { useState, useEffect, useMemo } from 'react'
import {
  AlertCircleIcon,
  CheckIcon,
  ShieldIcon,
  ClockIcon,
  XIcon
} from '../Icons'
import {
  subscribeToWrongParkingReports,
  saveWrongParkingNotice,
  resolveWrongParkingNotice,
  subscribeToAllStudentWrongParkingReports,
  updateStudentWrongParkingReportStatus,
  STUDENT_REPORT_STATUSES
} from '../../services/parkingService'
import { createNotification } from '../../services/notificationService'
import { evaluateIsAdmin } from '../../utils/authRoles'
import { auth } from '../../firebase/firebase'
import './WrongParkingView.css'

/**
 * Format timestamp safely into human-readable date/time string
 */
function formatReportTimestamp(createdAt) {
  if (!createdAt) return 'Recent'
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

export default function WrongParkingView({
  slots = [],
  onReleaseSlot,
  showToast,
  user,
  userProfile
}) {
  // Automated Violations State
  const [filterType, setFilterType] = useState('all') // 'all' | 'floor-mismatch' | 'overstay'
  const [savedReports, setSavedReports] = useState([])
  const [processingId, setProcessingId] = useState(null)

  // Student Wrong Parking Reports State
  const [studentReports, setStudentReports] = useState([])
  const [reportsLoading, setReportsLoading] = useState(true)
  const [reportsError, setReportsError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all') // 'all' | 'Pending' | 'Under Review' | 'Resolved' | 'Dismissed'

  // Admin Review Modal State
  const [reviewModalReport, setReviewModalReport] = useState(null)
  const [reviewTargetStatus, setReviewTargetStatus] = useState('Resolved') // 'Resolved' | 'Dismissed' | 'Under Review'
  const [reviewAdminNote, setReviewAdminNote] = useState('')
  const [isSubmittingReview, setIsSubmittingReview] = useState(false)
  const [updatingReportId, setUpdatingReportId] = useState(null)

  // Verify Admin Authorization
  const currentAdmin = userProfile || user || auth.currentUser
  const isAdmin = evaluateIsAdmin(currentAdmin)
  const adminDisplayName = userProfile?.displayName || user?.displayName || currentAdmin?.displayName || currentAdmin?.email || 'Campus Admin'

  // 1. Real-time Firestore subscription to wrong_parking_reports (Automated Notices)
  useEffect(() => {
    const unsubscribe = subscribeToWrongParkingReports(
      (reports) => {
        setSavedReports(reports || [])
      },
      (err) => {
        console.warn('Wrong parking reports listener notice:', err?.message)
      }
    )

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe()
      }
    }
  }, [])

  // 2. Real-time Firestore subscription to all Student-Submitted Reports (Admin Scoped)
  useEffect(() => {
    if (!isAdmin) {
      setReportsLoading(false)
      setReportsError('Unauthorized: Only administrators are permitted to retrieve student reports.')
      return
    }

    setReportsLoading(true)
    setReportsError(null)

    const unsubscribe = subscribeToAllStudentWrongParkingReports(
      (list) => {
        setStudentReports(list || [])
        setReportsLoading(false)
      },
      (err) => {
        console.warn('[WrongParkingView] Student reports subscription notice:', err?.message)
        setReportsError(err?.message || 'Could not load student reports from Firestore.')
        setReportsLoading(false)
      }
    )

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe()
      }
    }
  }, [isAdmin])

  // Filter out student-submitted reports from automated notices so they are never double-counted
  const automatedNotices = useMemo(() => {
    return savedReports.filter((r) => r.source !== 'student_report')
  }, [savedReports])

  // Map of persisted automated notices indexed by doc ID and slot ID
  const automatedNoticesMap = useMemo(() => {
    const map = new Map()
    automatedNotices.forEach((r) => {
      if (r.id) map.set(r.id, r)
      if (r.slotId) map.set(r.slotId, r)
    })
    return map
  }, [automatedNotices])

  // Detect floor mismatches from active slots & merge strictly with automated Firestore notices
  const violations = useMemo(() => {
    const list = []
    const processedSlotIds = new Set()

    // 1. Detect floor mismatches dynamically from active slots in parking_slots
    slots.forEach((slot) => {
      if (slot.status !== 'occupied' || !slot.plate) return

      const isScootyBay = slot.floor === 'Ground Floor'
      const isBikeBay = slot.floor === 'Basement'

      // Violation 1: Bike on Ground Floor Scooty bay
      if (isScootyBay && slot.type === 'bike') {
        const matchedSaved = automatedNoticesMap.get(`VIOL-${slot.id}`) || automatedNoticesMap.get(slot.id)
        list.push({
          id: matchedSaved?.id || `VIOL-${slot.id}`,
          slotId: slot.id,
          floor: slot.floor,
          type: 'floor-mismatch',
          severity: 'high',
          title: 'Unauthorized Vehicle Type on Floor',
          description: `Bike (${slot.plate}) is parked in Scooty-only Ground Floor bay ${slot.id}. Rules mandate Basement for bikes.`,
          plate: slot.plate,
          owner: slot.owner || 'Campus Member',
          rollNumber: slot.rollNumber || 'N/A',
          vehicleType: 'bike',
          userId: slot.userId || slot.studentId || slot.reservedBy || matchedSaved?.userId || null,
          detectedTime: slot.entryTime || matchedSaved?.detectedTime || 'Active Session',
          status: matchedSaved?.status || 'Detected',
          noticeIssued: Boolean(matchedSaved)
        })
        processedSlotIds.add(slot.id)
      }

      // Violation 2: Scooty on Basement Bike bay
      if (isBikeBay && slot.type === 'scooty') {
        const matchedSaved = automatedNoticesMap.get(`VIOL-${slot.id}`) || automatedNoticesMap.get(slot.id)
        list.push({
          id: matchedSaved?.id || `VIOL-${slot.id}`,
          slotId: slot.id,
          floor: slot.floor,
          type: 'floor-mismatch',
          severity: 'medium',
          title: 'Floor Rule Mismatch',
          description: `Scooty (${slot.plate}) is parked in Basement bike bay ${slot.id}. Ground floor preferred for Scooties.`,
          plate: slot.plate,
          owner: slot.owner || 'Campus Member',
          rollNumber: slot.rollNumber || 'N/A',
          vehicleType: 'scooty',
          userId: slot.userId || slot.studentId || slot.reservedBy || matchedSaved?.userId || null,
          detectedTime: slot.entryTime || matchedSaved?.detectedTime || 'Active Session',
          status: matchedSaved?.status || 'Detected',
          noticeIssued: Boolean(matchedSaved)
        })
        processedSlotIds.add(slot.id)
      }
    })

    // 2. Include any additional persisted automated notices in Firestore (e.g. overstay or manual flags)
    automatedNotices.forEach((r) => {
      const reportSlotId = r.slotId
      if (reportSlotId && processedSlotIds.has(reportSlotId)) {
        return
      }
      if (list.some((item) => item.id === r.id)) {
        return
      }

      const slotMatch = slots.find((s) => s.id === reportSlotId)
      if (slotMatch && slotMatch.status === 'occupied') {
        list.push({
          id: r.id,
          slotId: r.slotId || slotMatch.id,
          floor: r.floor || slotMatch.floor,
          type: r.type || 'overstay',
          severity: r.severity || 'medium',
          title: r.title || 'Parking Rule Flag',
          description: r.description || `Vehicle (${r.plate || slotMatch.plate}) flagged for parking compliance check.`,
          plate: r.plate || slotMatch.plate,
          owner: r.owner || slotMatch.owner || 'Campus Member',
          rollNumber: r.rollNumber || slotMatch.rollNumber || 'N/A',
          vehicleType: r.vehicleType || slotMatch.type || 'scooty',
          userId: r.userId || slotMatch.userId || slotMatch.studentId || slotMatch.reservedBy || null,
          detectedTime: r.detectedTime || slotMatch.entryTime || 'Active Session',
          status: r.status || 'Notice Issued',
          noticeIssued: true
        })
      }
    })

    return list
  }, [slots, automatedNotices, automatedNoticesMap])

  const filteredViolations = useMemo(() => {
    if (filterType === 'all') return violations
    return violations.filter((v) => v.type === filterType)
  }, [violations, filterType])

  // Automated notice actions
  const handleIssueNotice = async (v) => {
    setProcessingId(v.id || v.slotId)
    try {
      const noticePayload = {
        id: v.id || `VIOL-${v.slotId}`,
        slotId: v.slotId,
        floor: v.floor,
        type: v.type || 'floor-mismatch',
        severity: v.severity || 'high',
        title: v.title,
        description: v.description,
        plate: v.plate,
        owner: v.owner,
        rollNumber: v.rollNumber || 'N/A',
        vehicleType: v.vehicleType,
        detectedTime: v.detectedTime || 'Active Session',
        status: 'Notice Issued'
      }
      await saveWrongParkingNotice(noticePayload)
      if (showToast) {
        showToast(
          'Violation Notice Issued',
          `Notice dispatched to student ${v.owner} (${v.plate}) for Bay ${v.slotId} and saved to Firestore.`,
          'info'
        )
      }

      const reliableUserId = v.userId || null
      if (reliableUserId) {
        try {
          createNotification({
            userId: reliableUserId,
            title: 'Wrong Parking Notice',
            message: `A parking violation was detected for vehicle ${v.plate || 'registered'} in Bay ${v.slotId} (${v.floor}). ${v.description || 'Please relocate vehicle to the designated floor immediately.'}`,
            type: 'violation',
            relatedSlotId: v.slotId,
            relatedVehiclePlate: v.plate || null
          }).catch((notifErr) => {
            console.warn('[WrongParkingView] Notice notification warning:', notifErr?.message)
          })
        } catch (notifErr) {
          console.warn('[WrongParkingView] Notice notification sync warning:', notifErr?.message)
        }
      }
    } catch (err) {
      console.error('Error issuing notice:', err)
      if (showToast) {
        showToast('Notice Error', 'Could not save notice to Firestore.', 'error')
      }
    } finally {
      setProcessingId(null)
    }
  }

  const handleRelocate = async (v) => {
    const slotId = typeof v === 'object' ? v.slotId : v
    const reportId = typeof v === 'object' ? v.id : `VIOL-${slotId}`
    setProcessingId(reportId || slotId)

    try {
      if (reportId) {
        await resolveWrongParkingNotice(reportId)
      }
      if (slotId && reportId !== `VIOL-${slotId}`) {
        await resolveWrongParkingNotice(`VIOL-${slotId}`)
      }

      if (onReleaseSlot && slotId) {
        await onReleaseSlot(slotId)
      }

      if (showToast) {
        showToast(
          'Bay Cleared & Reallocated',
          `Bay ${slotId} marked for enforcement re-allocation and report resolved.`,
          'success'
        )
      }
    } catch (err) {
      console.error('Error resolving violation:', err)
      if (showToast) {
        showToast('Action Failed', 'Could not complete bay relocation.', 'error')
      }
    } finally {
      setProcessingId(null)
    }
  }

  // -------------------------------------------------------------------------
  // Student Wrong Parking Reports: KPI Counts & Search/Filter
  // -------------------------------------------------------------------------
  const totalStudentReports = studentReports.length
  const pendingReportsCount = useMemo(() => studentReports.filter((r) => r.status === 'Pending').length, [studentReports])
  const underReviewReportsCount = useMemo(() => studentReports.filter((r) => r.status === 'Under Review').length, [studentReports])
  const resolvedReportsCount = useMemo(() => studentReports.filter((r) => r.status === 'Resolved').length, [studentReports])
  const dismissedReportsCount = useMemo(() => studentReports.filter((r) => r.status === 'Dismissed').length, [studentReports])

  const filteredStudentReports = useMemo(() => {
    let list = studentReports

    // Status filter
    if (statusFilter !== 'all') {
      list = list.filter((r) => r.status === statusFilter)
    }

    // Search query: vehicle number, slot, reporter name/email, reason, report ID
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      list = list.filter((r) => {
        const plate = (r.vehicleNumber || r.plate || '').toLowerCase()
        const slot = (r.slotId || '').toLowerCase()
        const reporterName = (r.reporterName || '').toLowerCase()
        const reporterEmail = (r.reporterEmail || '').toLowerCase()
        const reason = (r.reason || '').toLowerCase()
        const id = (r.id || '').toLowerCase()
        const floor = (r.floor || '').toLowerCase()
        return (
          plate.includes(q) ||
          slot.includes(q) ||
          reporterName.includes(q) ||
          reporterEmail.includes(q) ||
          reason.includes(q) ||
          id.includes(q) ||
          floor.includes(q)
        )
      })
    }

    return list
  }, [studentReports, statusFilter, searchQuery])

  // -------------------------------------------------------------------------
  // Student Report Review Actions (Admins Only)
  // -------------------------------------------------------------------------
  // Direct Action: Move Pending report to Under Review
  const handleMarkUnderReview = async (report) => {
    if (updatingReportId || isSubmittingReview) return
    setUpdatingReportId(report.id)

    try {
      await updateStudentWrongParkingReportStatus(report.id, {
        status: 'Under Review',
        adminNote: report.adminNote || null,
        resolvedBy: adminDisplayName
      })

      // Secondary non-blocking notification to reporting student
      if (report.reporterUid) {
        try {
          createNotification({
            userId: report.reporterUid,
            title: 'Report Under Review',
            message: `Your report for vehicle ${report.vehicleNumber || report.plate} has been placed under active investigation by campus security.`,
            type: 'info',
            relatedSlotId: report.slotId || null,
            relatedVehiclePlate: report.vehicleNumber || report.plate || null
          }).catch((err) => {
            console.warn('[WrongParkingView] Notification dispatch notice:', err?.message)
          })
        } catch {
          // safe non-blocking
        }
      }

      if (showToast) {
        showToast(
          'Report Under Review',
          `Report ${report.id} for vehicle ${report.vehicleNumber || report.plate} marked Under Review.`,
          'info'
        )
      }
    } catch (err) {
      console.error('[WrongParkingView] Failed to mark Under Review:', err)
      if (showToast) {
        showToast('Update Failed', err.message || 'Could not update report status.', 'error')
      }
    } finally {
      setUpdatingReportId(null)
    }
  }

  // Open modal to finalize Resolved or Dismissed or Edit Note
  const handleOpenReviewModal = (report, targetStatus) => {
    setReviewModalReport(report)
    setReviewTargetStatus(targetStatus)
    setReviewAdminNote(report.adminNote || '')
  }

  // Submit final review from modal
  const handleConfirmReviewSubmit = async (e) => {
    if (e) e.preventDefault()
    if (!reviewModalReport || isSubmittingReview) return

    setIsSubmittingReview(true)
    const report = reviewModalReport
    const targetStatus = reviewTargetStatus
    const noteText = (reviewAdminNote || '').trim()

    try {
      await updateStudentWrongParkingReportStatus(report.id, {
        status: targetStatus,
        adminNote: noteText || null,
        resolvedBy: adminDisplayName
      })

      // Secondary student notification scoped strictly to reporterUid
      if (report.reporterUid) {
        try {
          createNotification({
            userId: report.reporterUid,
            title: `Wrong Parking Report ${targetStatus}`,
            message: `Your report for vehicle ${report.vehicleNumber || report.plate} has been reviewed by security and marked ${targetStatus}.${noteText ? ` Security note: "${noteText}"` : ''}`,
            type: targetStatus === 'Resolved' ? 'success' : 'info',
            relatedSlotId: report.slotId || null,
            relatedVehiclePlate: report.vehicleNumber || report.plate || null
          }).catch((err) => {
            console.warn('[WrongParkingView] Student resolution notification notice:', err?.message)
          })
        } catch {
          // safe non-blocking
        }
      }

      if (showToast) {
        showToast(
          `Report ${targetStatus}`,
          `Report for vehicle ${report.vehicleNumber || report.plate} successfully marked as ${targetStatus}.`,
          'success'
        )
      }

      setReviewModalReport(null)
      setReviewAdminNote('')
    } catch (err) {
      console.error('[WrongParkingView] Final review submission failed:', err)
      if (showToast) {
        showToast('Review Failed', err.message || 'Could not finalize report status.', 'error')
      }
    } finally {
      setIsSubmittingReview(false)
    }
  }

  return (
    <div className="admin-page-container">
      {/* Header */}
      <div className="page-section-header glass-card">
        <div className="psh-badge">
          <span>⚠️ CAMPUS ENFORCEMENT &amp; COMPLIANCE</span>
        </div>
        <h1 className="psh-title">
          Wrong Parking <span className="gradient-text">Management</span>
        </h1>
        <p className="psh-subtitle">
          Automated rule compliance monitor &amp; student report review console. Detects floor rule mismatches, overstays, and processes student allegations.
        </p>
      </div>

      {/* ------------------------------------------------------------------
          SECTION 1: AUTOMATED VIOLATIONS & NOTICES (EXISTING WORKFLOW)
          ------------------------------------------------------------------ */}
      {/* KPI & Filter Row */}
      <div className="kpi-grid mb-4">
        <div className="kpi-card glass-card">
          <div className="kpi-icon-box rose">
            <AlertCircleIcon className="w-5 h-5 text-rose" />
          </div>
          <div className="kpi-data">
            <span className="kpi-label">Active Flags</span>
            <strong className="kpi-value text-rose">{violations.length}</strong>
            <span className="kpi-sub">Requiring attention</span>
          </div>
        </div>

        <div className="kpi-card glass-card">
          <div className="kpi-icon-box amber">
            <ShieldIcon className="w-5 h-5 text-amber" />
          </div>
          <div className="kpi-data">
            <span className="kpi-label">Floor Rule Mismatches</span>
            <strong className="kpi-value text-amber">
              {violations.filter((v) => v.type === 'floor-mismatch').length}
            </strong>
            <span className="kpi-sub">Scooty / Bike reversed</span>
          </div>
        </div>

        <div className="kpi-card glass-card">
          <div className="kpi-icon-box emerald">
            <CheckIcon className="w-5 h-5 text-emerald" />
          </div>
          <div className="kpi-data">
            <span className="kpi-label">Active Notices</span>
            <strong className="kpi-value text-emerald">{automatedNotices.length}</strong>
            <span className="kpi-sub">Persisted in Firestore</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="filter-tabs-row mb-3">
        <button
          type="button"
          className={`pill-btn ${filterType === 'all' ? 'active' : ''}`}
          onClick={() => setFilterType('all')}
        >
          All Violations ({violations.length})
        </button>
        <button
          type="button"
          className={`pill-btn ${filterType === 'floor-mismatch' ? 'active' : ''}`}
          onClick={() => setFilterType('floor-mismatch')}
        >
          🚫 Floor Mismatches ({violations.filter((v) => v.type === 'floor-mismatch').length})
        </button>
        <button
          type="button"
          className={`pill-btn ${filterType === 'overstay' ? 'active' : ''}`}
          onClick={() => setFilterType('overstay')}
        >
          ⏱️ ANPR Tag Alerts ({violations.filter((v) => v.type === 'overstay').length})
        </button>
      </div>

      {/* Violations List */}
      <div className="violations-list-container">
        {filteredViolations.length === 0 ? (
          <div className="empty-state glass-card p-5 text-center">
            <span className="empty-icon">🛡️</span>
            <h4>No Parking Violations Detected</h4>
            <p className="text-muted">
              All vehicles on Ground Floor (Scooties) and Basement (Bikes) are parked in accordance with campus parking rules.
            </p>
          </div>
        ) : (
          filteredViolations.map((v) => {
            const isProcessing = processingId === (v.id || v.slotId)
            return (
              <div key={v.id} className="violation-card glass-card mb-3">
                <div className="violation-left">
                  <div className={`violation-icon-box ${v.severity}`}>
                    <AlertCircleIcon className="w-5 h-5" />
                  </div>
                  <div className="violation-details">
                    <div className="v-title-row">
                      <strong>{v.title}</strong>
                      <span className={`severity-tag ${v.severity}`}>
                        {v.severity.toUpperCase()}
                      </span>
                      {v.noticeIssued && (
                        <span
                          className="severity-tag info"
                          style={{
                            background: 'rgba(56, 189, 248, 0.15)',
                            color: '#38bdf8',
                            border: '1px solid rgba(56, 189, 248, 0.3)'
                          }}
                        >
                          NOTICE ISSUED
                        </span>
                      )}
                      <span className="slot-id-pill font-mono">{v.slotId}</span>
                    </div>
                    <p className="v-desc text-sm text-muted">{v.description}</p>
                    <div className="v-meta-row text-xs font-mono text-muted">
                      <span>Owner: <strong>{v.owner}</strong> ({v.rollNumber})</span>
                      <span>&bull;</span>
                      <span>Plate: <strong className="text-amber">{v.plate}</strong></span>
                      <span>&bull;</span>
                      <span>Time: {v.detectedTime}</span>
                    </div>
                  </div>
                </div>

                <div className="violation-actions">
                  <button
                    type="button"
                    className={`btn btn-secondary btn-sm ${v.noticeIssued ? 'opacity-85' : ''}`}
                    onClick={() => handleIssueNotice(v)}
                    disabled={isProcessing}
                  >
                    {v.noticeIssued ? '✓ Notice Dispatched' : '📩 Send Notice'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-rose btn-sm"
                    onClick={() => handleRelocate(v)}
                    disabled={isProcessing}
                  >
                    Relocate / Clear ↲
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* ------------------------------------------------------------------
          SECTION 2: STUDENT WRONG PARKING REPORTS (PHASE 3 ADMIN CONSOLE)
          ------------------------------------------------------------------ */}
      <section className="swpr-admin-section" aria-labelledby="swpr-admin-heading">
        <div className="swpr-admin-section-header">
          <div className="swpr-admin-title-row">
            <h2 id="swpr-admin-heading" className="swpr-admin-title">
              <span>📋 Student Allegation Reports</span>
              <span className="swpr-tab-count font-mono" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
                {totalStudentReports} {totalStudentReports === 1 ? 'Report' : 'Reports'}
              </span>
            </h2>
            <div className="text-xs font-mono text-muted">
              Real-time Firestore &bull; source: student_report
            </div>
          </div>
          <p className="swpr-admin-subtitle">
            Community-driven parking compliance reports submitted by authenticated students from their dashboard. Review bay telemetry, investigate allegations, and update report resolution.
          </p>
        </div>

        {/* 5 KPI Summary Cards for Student Reports */}
        <div className="swpr-admin-kpi-grid">
          <div className="swpr-admin-kpi-card glass-card">
            <div className="swpr-kpi-icon total">
              <span>📊</span>
            </div>
            <div className="swpr-kpi-data">
              <span className="swpr-kpi-label">Total Reports</span>
              <strong className="swpr-kpi-val">{totalStudentReports}</strong>
              <span className="swpr-kpi-sub">All-time student filings</span>
            </div>
          </div>

          <div className="swpr-admin-kpi-card glass-card pending">
            <div className="swpr-kpi-icon pending">
              <span>⏳</span>
            </div>
            <div className="swpr-kpi-data">
              <span className="swpr-kpi-label">Pending</span>
              <strong className="swpr-kpi-val text-amber">{pendingReportsCount}</strong>
              <span className="swpr-kpi-sub">Awaiting investigation</span>
            </div>
          </div>

          <div className="swpr-admin-kpi-card glass-card under-review">
            <div className="swpr-kpi-icon under-review">
              <span>🔍</span>
            </div>
            <div className="swpr-kpi-data">
              <span className="swpr-kpi-label">Under Review</span>
              <strong className="swpr-kpi-val text-cyan">{underReviewReportsCount}</strong>
              <span className="swpr-kpi-sub">Security dispatched</span>
            </div>
          </div>

          <div className="swpr-admin-kpi-card glass-card resolved">
            <div className="swpr-kpi-icon resolved">
              <span>✓</span>
            </div>
            <div className="swpr-kpi-data">
              <span className="swpr-kpi-label">Resolved</span>
              <strong className="swpr-kpi-val text-emerald">{resolvedReportsCount}</strong>
              <span className="swpr-kpi-sub">Enforced / Relocated</span>
            </div>
          </div>

          <div className="swpr-admin-kpi-card glass-card dismissed">
            <div className="swpr-kpi-icon dismissed">
              <span>✕</span>
            </div>
            <div className="swpr-kpi-data">
              <span className="swpr-kpi-label">Dismissed</span>
              <strong className="swpr-kpi-val text-muted">{dismissedReportsCount}</strong>
              <span className="swpr-kpi-sub">Permitted / Invalid</span>
            </div>
          </div>
        </div>

        {/* Search & Status Filter Controls */}
        <div className="swpr-admin-controls-card glass-card">
          <div className="swpr-admin-search-wrap">
            <span className="swpr-admin-search-icon">🔍</span>
            <input
              type="text"
              className="swpr-admin-search-input font-mono"
              placeholder="Search by plate, bay (G-14), reporter name, email, report ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search student reports"
            />
          </div>

          <div className="swpr-admin-filter-pills" role="tablist" aria-label="Status filters">
            <button
              type="button"
              className={`swpr-pill-btn ${statusFilter === 'all' ? 'active' : ''}`}
              onClick={() => setStatusFilter('all')}
            >
              All ({totalStudentReports})
            </button>
            <button
              type="button"
              className={`swpr-pill-btn pending ${statusFilter === 'Pending' ? 'active pending' : ''}`}
              onClick={() => setStatusFilter('Pending')}
            >
              ⏳ Pending ({pendingReportsCount})
            </button>
            <button
              type="button"
              className={`swpr-pill-btn under-review ${statusFilter === 'Under Review' ? 'active under-review' : ''}`}
              onClick={() => setStatusFilter('Under Review')}
            >
              🔍 Under Review ({underReviewReportsCount})
            </button>
            <button
              type="button"
              className={`swpr-pill-btn resolved ${statusFilter === 'Resolved' ? 'active resolved' : ''}`}
              onClick={() => setStatusFilter('Resolved')}
            >
              ✓ Resolved ({resolvedReportsCount})
            </button>
            <button
              type="button"
              className={`swpr-pill-btn dismissed ${statusFilter === 'Dismissed' ? 'active dismissed' : ''}`}
              onClick={() => setStatusFilter('Dismissed')}
            >
              ✕ Dismissed ({dismissedReportsCount})
            </button>
          </div>
        </div>

        {/* Student Reports List */}
        <div className="swpr-admin-list">
          {reportsLoading ? (
            <div className="glass-card p-5 text-center text-muted">
              <ClockIcon className="w-6 h-6 animate-spin text-cyan mx-auto mb-2" />
              <p style={{ margin: 0 }}>Subscribing to live student reports from Firestore...</p>
            </div>
          ) : reportsError ? (
            <div className="glass-card p-4 text-rose" style={{ border: '1px solid rgba(244, 63, 94, 0.4)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <AlertCircleIcon className="w-5 h-5 flex-shrink-0" />
                <span>{reportsError}</span>
              </div>
            </div>
          ) : filteredStudentReports.length === 0 ? (
            <div className="empty-state glass-card p-5 text-center">
              <span className="empty-icon">🛡️</span>
              <h4 style={{ color: '#f8fafc', marginBottom: '6px' }}>
                {searchQuery || statusFilter !== 'all' ? 'No Matching Student Reports Found' : 'No Student Reports Filed'}
              </h4>
              <p className="text-muted" style={{ margin: 0 }}>
                {searchQuery || statusFilter !== 'all'
                  ? 'Try adjusting your search query or status filter.'
                  : 'No student has submitted a wrong parking report yet. Student submissions will appear here in real time.'}
              </p>
            </div>
          ) : (
            filteredStudentReports.map((report) => {
              const statusClass = (report.status || 'Pending').toLowerCase().replace(/\s+/g, '-')
              const isUpdatingThis = updatingReportId === report.id

              return (
                <div key={report.id} className={`swpr-admin-card glass-card ${statusClass}`}>
                  {/* Top Bar */}
                  <div className="swpr-card-top">
                    <div className="swpr-card-top-left">
                      <span className="swpr-plate-badge-admin">
                        {report.vehicleNumber || report.plate || 'UNKNOWN'}
                      </span>
                      <span className={`swpr-status-pill-admin ${statusClass}`}>
                        {report.status === 'Resolved' ? '✓ RESOLVED' : report.status === 'Under Review' ? '🔍 UNDER REVIEW' : report.status === 'Dismissed' ? '✕ DISMISSED' : '⏳ PENDING'}
                      </span>
                      <span className="swpr-report-id-chip">
                        Ref: {report.id}
                      </span>
                    </div>

                    <div className="text-xs font-mono text-muted">
                      <span>Submitted: </span>
                      <strong style={{ color: '#cbd5e1' }}>{formatReportTimestamp(report.createdAt)}</strong>
                    </div>
                  </div>

                  {/* Metadata Grid */}
                  <div className="swpr-card-grid">
                    <div className="swpr-meta-item-admin">
                      <span className="swpr-meta-label">Location Bay</span>
                      <span className="swpr-meta-value font-mono">
                        {report.slotId ? `Bay ${report.slotId}` : 'Driveway / Ramp / Unspecified'}
                      </span>
                    </div>

                    <div className="swpr-meta-item-admin">
                      <span className="swpr-meta-label">Floor</span>
                      <span className="swpr-meta-value">
                        {report.floor}
                      </span>
                    </div>

                    <div className="swpr-meta-item-admin">
                      <span className="swpr-meta-label">Alleged Reason</span>
                      <span className="swpr-meta-value reason">
                        ⚠️ {report.reason}
                      </span>
                    </div>

                    <div className="swpr-meta-item-admin">
                      <span className="swpr-meta-label">Reporting Student</span>
                      <span className="swpr-meta-value reporter">
                        👤 {report.reporterName || 'Student'} {report.reporterEmail ? `(${report.reporterEmail})` : ''}
                      </span>
                    </div>
                  </div>

                  {/* Student Description / Allegation */}
                  {report.description && (
                    <div className="swpr-allegation-box">
                      <strong>Student Statement:</strong>
                      "{report.description}"
                    </div>
                  )}

                  {/* Security Resolution Note (if recorded) */}
                  {report.adminNote && (
                    <div className={`swpr-admin-resolution-box ${statusClass}`}>
                      <div className="swpr-admin-res-header">
                        <span>🛡️ Security Resolution Note</span>
                        {report.resolvedBy && (
                          <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                            by {report.resolvedBy}
                          </span>
                        )}
                      </div>
                      <p className="swpr-admin-res-text">
                        "{report.adminNote}"
                      </p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="swpr-card-actions-admin">
                    {/* Action 1: Pending -> Under Review */}
                    {report.status === 'Pending' && (
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        style={{
                          background: 'rgba(56, 189, 248, 0.12)',
                          border: '1px solid rgba(56, 189, 248, 0.35)',
                          color: '#38bdf8'
                        }}
                        onClick={() => handleMarkUnderReview(report)}
                        disabled={isUpdatingThis || isSubmittingReview}
                      >
                        {isUpdatingThis ? 'Updating...' : '🔍 Mark Under Review'}
                      </button>
                    )}

                    {/* Action 2: Resolve Report (Allowed from Pending or Under Review) */}
                    {(report.status === 'Pending' || report.status === 'Under Review') && (
                      <button
                        type="button"
                        className="btn btn-sm"
                        style={{
                          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(5, 150, 105, 0.35))',
                          border: '1px solid rgba(16, 185, 129, 0.5)',
                          color: '#6ee7b7',
                          fontWeight: 600
                        }}
                        onClick={() => handleOpenReviewModal(report, 'Resolved')}
                        disabled={isUpdatingThis || isSubmittingReview}
                      >
                        ✓ Resolve Report
                      </button>
                    )}

                    {/* Action 3: Dismiss Report (Allowed from Pending or Under Review) */}
                    {(report.status === 'Pending' || report.status === 'Under Review') && (
                      <button
                        type="button"
                        className="btn btn-sm"
                        style={{
                          background: 'rgba(148, 163, 184, 0.12)',
                          border: '1px solid rgba(148, 163, 184, 0.35)',
                          color: '#cbd5e1'
                        }}
                        onClick={() => handleOpenReviewModal(report, 'Dismissed')}
                        disabled={isUpdatingThis || isSubmittingReview}
                      >
                        ✕ Dismiss Report
                      </button>
                    )}

                    {/* Terminal Status Re-evaluation Actions */}
                    {(report.status === 'Resolved' || report.status === 'Dismissed') && (
                      <>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          style={{
                            background: 'rgba(56, 189, 248, 0.08)',
                            border: '1px solid rgba(56, 189, 248, 0.25)',
                            color: '#7dd3fc'
                          }}
                          onClick={() => handleMarkUnderReview(report)}
                          disabled={isUpdatingThis || isSubmittingReview}
                          title="Re-open report for follow-up review"
                        >
                          {isUpdatingThis ? 'Re-opening...' : '🔄 Re-open (Under Review)'}
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleOpenReviewModal(report, report.status)}
                          disabled={isUpdatingThis || isSubmittingReview}
                        >
                          ✏️ Edit Resolution Note
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </section>

      {/* ------------------------------------------------------------------
          REVIEW CONFIRMATION & ADMIN NOTE MODAL
          ------------------------------------------------------------------ */}
      {reviewModalReport && (
        <div
          className="modal-backdrop"
          onClick={() => !isSubmittingReview && setReviewModalReport(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="swpr-review-title"
        >
          <div
            className="swpr-review-modal-card glass-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="swpr-modal-header">
              <h3 id="swpr-review-title" className="swpr-modal-title">
                {reviewTargetStatus === 'Resolved' ? '✓ Resolve Student Report' : reviewTargetStatus === 'Dismissed' ? '✕ Dismiss Student Report' : 'Review Student Report'}
              </h3>
              <button
                type="button"
                className="confirm-close-btn"
                onClick={() => !isSubmittingReview && setReviewModalReport(null)}
                disabled={isSubmittingReview}
                aria-label="Close review dialog"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>

            {/* Summary Details */}
            <div className="swpr-modal-summary font-mono">
              <div>
                <span>Vehicle: </span>
                <strong style={{ color: '#38bdf8' }}>{reviewModalReport.vehicleNumber || reviewModalReport.plate}</strong>
              </div>
              <div>
                <span>Location: </span>
                <strong>{reviewModalReport.slotId ? `Bay ${reviewModalReport.slotId}` : reviewModalReport.floor}</strong>
              </div>
              <div>
                <span>Allegation: </span>
                <strong style={{ color: '#fbbf24' }}>{reviewModalReport.reason}</strong>
              </div>
              <div>
                <span>Reporter: </span>
                <strong>{reviewModalReport.reporterName}</strong>
              </div>
            </div>

            <form onSubmit={handleConfirmReviewSubmit}>
              <label htmlFor="swpr-admin-resolution-note" className="swpr-label">
                Security Resolution Note <span className="swpr-optional">(Optional)</span>
              </label>
              <textarea
                id="swpr-admin-resolution-note"
                className="swpr-modal-textarea"
                placeholder={
                  reviewTargetStatus === 'Resolved'
                    ? 'Enter resolution details (e.g. Guard verified violation; vehicle relocated to designated basement bay)...'
                    : reviewTargetStatus === 'Dismissed'
                    ? 'Enter dismissal reason (e.g. Vehicle held valid security exemption; no violation observed)...'
                    : 'Add note...'
                }
                value={reviewAdminNote}
                onChange={(e) => setReviewAdminNote(e.target.value)}
                maxLength={400}
                disabled={isSubmittingReview}
              />

              <div className="swpr-modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setReviewModalReport(null)}
                  disabled={isSubmittingReview}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`btn btn-sm ${reviewTargetStatus === 'Resolved' ? 'btn-primary' : 'btn-rose'}`}
                  disabled={isSubmittingReview}
                  style={
                    reviewTargetStatus === 'Resolved'
                      ? {
                          background: 'linear-gradient(135deg, #10b981, #059669)',
                          border: '1px solid rgba(16, 185, 129, 0.5)',
                          color: '#ffffff',
                          boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
                          fontWeight: 600,
                          minWidth: '150px'
                        }
                      : {
                          background: 'linear-gradient(135deg, #64748b, #475569)',
                          border: '1px solid rgba(148, 163, 184, 0.4)',
                          color: '#ffffff',
                          fontWeight: 600,
                          minWidth: '150px'
                        }
                  }
                >
                  {isSubmittingReview
                    ? 'Updating...'
                    : reviewTargetStatus === 'Resolved'
                    ? '✓ Confirm & Resolve'
                    : reviewTargetStatus === 'Dismissed'
                    ? '✕ Confirm & Dismiss'
                    : 'Save Note'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
