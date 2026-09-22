import { useState, useEffect, useMemo } from 'react'
import {
  AlertCircleIcon,
  CheckIcon,
  ShieldIcon
} from '../Icons'
import {
  subscribeToWrongParkingReports,
  saveWrongParkingNotice,
  resolveWrongParkingNotice
} from '../../services/parkingService'

export default function WrongParkingView({
  slots = [],
  onReleaseSlot,
  showToast
}) {
  const [filterType, setFilterType] = useState('all') // 'all' | 'floor-mismatch' | 'overstay'
  const [savedReports, setSavedReports] = useState([])
  const [processingId, setProcessingId] = useState(null)

  // Real-time Firestore subscription to wrong_parking_reports
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

  // Map of persisted reports indexed by doc ID and slot ID
  const savedReportsMap = useMemo(() => {
    const map = new Map()
    savedReports.forEach((r) => {
      if (r.id) map.set(r.id, r)
      if (r.slotId) map.set(r.slotId, r)
    })
    return map
  }, [savedReports])

  // Detect floor mismatches from active slots & merge with persisted Firestore reports
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
        const matchedSaved = savedReportsMap.get(`VIOL-${slot.id}`) || savedReportsMap.get(slot.id)
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
          detectedTime: slot.entryTime || matchedSaved?.detectedTime || 'Active Session',
          status: matchedSaved?.status || 'Detected',
          noticeIssued: Boolean(matchedSaved)
        })
        processedSlotIds.add(slot.id)
      }

      // Violation 2: Scooty on Basement Bike bay
      if (isBikeBay && slot.type === 'scooty') {
        const matchedSaved = savedReportsMap.get(`VIOL-${slot.id}`) || savedReportsMap.get(slot.id)
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
          detectedTime: slot.entryTime || matchedSaved?.detectedTime || 'Active Session',
          status: matchedSaved?.status || 'Detected',
          noticeIssued: Boolean(matchedSaved)
        })
        processedSlotIds.add(slot.id)
      }
    })

    // 2. Include any additional persisted reports in Firestore (e.g. overstay or manual flags)
    savedReports.forEach((r) => {
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
          detectedTime: r.detectedTime || slotMatch.entryTime || 'Active Session',
          status: r.status || 'Notice Issued',
          noticeIssued: true
        })
      }
    })

    return list
  }, [slots, savedReports, savedReportsMap])

  const filteredViolations = useMemo(() => {
    if (filterType === 'all') return violations
    return violations.filter((v) => v.type === filterType)
  }, [violations, filterType])

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
      // 1. Resolve / delete the wrong parking notice in Firestore
      if (reportId) {
        await resolveWrongParkingNotice(reportId)
      }
      if (slotId && reportId !== `VIOL-${slotId}`) {
        await resolveWrongParkingNotice(`VIOL-${slotId}`)
      }

      // 2. Release the parking bay in Firestore
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
          Automated rule compliance monitor. Detects bikes parked on Ground Floor, scooties in basement, and unauthorized vehicles.
        </p>
      </div>

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
            <strong className="kpi-value text-emerald">{savedReports.length}</strong>
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
    </div>
  )
}
