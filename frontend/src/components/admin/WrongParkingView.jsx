import { useState, useMemo } from 'react'
import {
  AlertCircleIcon,
  CheckIcon,
  ShieldIcon,
  SearchIcon
} from '../Icons'

export default function WrongParkingView({
  slots = [],
  onReleaseSlot,
  showToast
}) {
  const [filterType, setFilterType] = useState('all') // 'all' | 'floor-mismatch' | 'overstay'
  const [resolvedIds, setResolvedIds] = useState(new Set())

  // Detect violations
  const violations = useMemo(() => {
    const list = []

    slots.forEach((slot) => {
      if (slot.status !== 'occupied' || !slot.plate) return
      if (resolvedIds.has(slot.id)) return

      const isScootyBay = slot.floor === 'Ground Floor'
      const isBikeBay = slot.floor === 'Basement'

      // Violation 1: Bike on Ground Floor Scooty bay
      if (isScootyBay && slot.type === 'bike') {
        list.push({
          id: `VIOL-${slot.id}`,
          slotId: slot.id,
          floor: slot.floor,
          type: 'floor-mismatch',
          severity: 'high',
          title: 'Unauthorized Vehicle Type on Floor',
          description: `Bike (${slot.plate}) is parked in Scooty-only Ground Floor bay ${slot.id}. Rules mandate Basement for bikes.`,
          plate: slot.plate,
          owner: slot.owner,
          rollNumber: slot.rollNumber || 'N/A',
          vehicleType: 'bike',
          detectedTime: slot.entryTime || 'Active Session'
        })
      }

      // Violation 2: Scooty on Basement Bike bay
      if (isBikeBay && slot.type === 'scooty') {
        list.push({
          id: `VIOL-${slot.id}`,
          slotId: slot.id,
          floor: slot.floor,
          type: 'floor-mismatch',
          severity: 'medium',
          title: 'Floor Rule Mismatch',
          description: `Scooty (${slot.plate}) is parked in Basement bike bay ${slot.id}. Ground floor preferred for Scooties.`,
          plate: slot.plate,
          owner: slot.owner,
          rollNumber: slot.rollNumber || 'N/A',
          vehicleType: 'scooty',
          detectedTime: slot.entryTime || 'Active Session'
        })
      }

      // Violation 3: Simulated random ANPR mismatch or overstay
      if (slot.id === 'G-41' || slot.id === 'B-61') {
        list.push({
          id: `VIOL-ANPR-${slot.id}`,
          slotId: slot.id,
          floor: slot.floor,
          type: 'overstay',
          severity: 'low',
          title: 'ANPR Tag Sensor Flag',
          description: `Vehicle (${slot.plate}) entered during morning peak without QR permit badge tap.`,
          plate: slot.plate,
          owner: slot.owner,
          rollNumber: slot.rollNumber || 'N/A',
          vehicleType: slot.type,
          detectedTime: slot.entryTime || 'Active Session'
        })
      }
    })

    return list
  }, [slots, resolvedIds])

  const filteredViolations = useMemo(() => {
    if (filterType === 'all') return violations
    return violations.filter((v) => v.type === filterType)
  }, [violations, filterType])

  const handleIssueNotice = (v) => {
    setResolvedIds((prev) => new Set([...prev, v.slotId]))
    if (showToast) {
      showToast(
        'Violation Notice Issued',
        `Notice dispatched to student ${v.owner} (${v.plate}) for Bay ${v.slotId}.`,
        'info'
      )
    }
  }

  const handleRelocate = (slotId) => {
    if (onReleaseSlot) {
      onReleaseSlot(slotId)
    }
    setResolvedIds((prev) => new Set([...prev, slotId]))
    if (showToast) {
      showToast(
        'Bay Cleared & Reallocated',
        `Bay ${slotId} marked for enforcement re-allocation.`,
        'success'
      )
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
            <span className="kpi-label">Resolved Notices</span>
            <strong className="kpi-value text-emerald">{resolvedIds.size}</strong>
            <span className="kpi-sub">Handled by security</span>
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
          🚫 Floor Mismatches
        </button>
        <button
          type="button"
          className={`pill-btn ${filterType === 'overstay' ? 'active' : ''}`}
          onClick={() => setFilterType('overstay')}
        >
          ⏱️ ANPR Tag Alerts
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
          filteredViolations.map((v) => (
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
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleIssueNotice(v)}
                >
                  📩 Send Notice
                </button>
                <button
                  type="button"
                  className="btn btn-rose btn-sm"
                  onClick={() => handleRelocate(v.slotId)}
                >
                  Relocate / Clear ↲
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
