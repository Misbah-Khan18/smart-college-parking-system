import { useState } from 'react'
import {
  CheckIcon,
  AlertCircleIcon
} from '../Icons'
import { getFloorForVehicleType } from '../../services/vehicleService'
import ParkingLotMap from '../ParkingLotMap'

export default function VehicleEntryView({
  slots = [],
  registeredVehicles = [],
  onVehicleEntry,
  onShowPass
}) {
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [entryPlate, setEntryPlate] = useState('')
  const [entryDriver, setEntryDriver] = useState('')
  const [entryRoll, setEntryRoll] = useState('')
  const [entryStream, setEntryStream] = useState('')
  const [entryType, setEntryType] = useState('scooty')
  const [gateStatus, setGateStatus] = useState('closed') // 'closed' | 'opening' | 'open' | 'closing'
  const [lastActionMsg, setLastActionMsg] = useState(null)
  const [currentVehicleEntry, setCurrentVehicleEntry] = useState(null)

  const [isSubmitting, setIsSubmitting] = useState(false)

  // Handle Quick Select from Registered Students
  const handleStudentSelect = (studentId) => {
    setSelectedStudentId(studentId)
    const st = registeredVehicles.find((v) => v.id === studentId)
    if (st) {
      setEntryPlate(st.vehicleNumber || '')
      setEntryDriver(st.studentName || '')
      setEntryRoll(st.rollNumber || '')
      setEntryStream(st.stream || '')
      setEntryType(st.vehicleType || 'scooty')
    }
  }

  // Auto-detect registered student when typing plate
  const handlePlateChange = (val) => {
    const uppercaseVal = val.toUpperCase()
    setEntryPlate(uppercaseVal)

    const cleanInput = uppercaseVal.replace(/[^A-Z0-9]/g, '')
    if (cleanInput.length >= 4) {
      const match = registeredVehicles.find((v) => {
        if (!v.vehicleNumber) return false
        return v.vehicleNumber.replace(/[^A-Z0-9]/g, '') === cleanInput
      })
      if (match) {
        setEntryDriver(match.studentName || '')
        setEntryRoll(match.rollNumber || '')
        setEntryStream(match.stream || '')
        setEntryType(match.vehicleType || 'scooty')
        setSelectedStudentId(match.id)
      }
    }
  }

  const handleSimulateEntry = async (e) => {
    e.preventDefault()
    if (!entryPlate.trim() || isSubmitting) return

    setLastActionMsg(null)
    setIsSubmitting(true)

    const cleanPlate = entryPlate.toUpperCase().trim()
    const preferredFloor = getFloorForVehicleType(entryType)

    if (onVehicleEntry) {
      const result = await onVehicleEntry({
        plate: cleanPlate,
        owner: entryDriver.trim(),
        rollNumber: entryRoll.trim(),
        stream: entryStream.trim(),
        type: entryType,
        category: 'Student',
        preferredFloor
      })

      if (result && result.success) {
        setGateStatus('opening')
        setTimeout(() => setGateStatus('open'), 500)

        const nowTimeFormatted = new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        })

        const activeEntryRecord = {
          ...(result.passData || {}),
          plate: cleanPlate,
          owner: entryDriver.trim() || result.passData?.owner || 'Student Member',
          rollNumber: entryRoll.trim() || result.passData?.rollNumber || '—',
          stream: entryStream.trim() || result.passData?.stream || '',
          vehicleType: entryType,
          floor: result.floor || preferredFloor,
          slotId: result.slotId,
          entryTime: result.passData?.entryTime || nowTimeFormatted,
          status: 'Vehicle Entered',
          session: 'Active',
          zone: result.passData?.zone || result.passData?.section || `${result.floor || preferredFloor} Parking Area`
        }

        // Store as current vehicle entry for focused UI and map spotlight
        setCurrentVehicleEntry(activeEntryRecord)

        setLastActionMsg({
          type: 'success',
          title: 'Vehicle Admitted & Slot Allocated',
          detail: `Vehicle ${cleanPlate} (${entryDriver || 'Student'}) dynamically allocated to Bay ${result.slotId} on ${result.floor}.`,
          passData: result.passData
        })

        // Reset form input fields
        setEntryPlate('')
        setEntryDriver('')
        setEntryRoll('')
        setEntryStream('')
        setSelectedStudentId('')

        setTimeout(() => {
          setGateStatus('closing')
          setTimeout(() => setGateStatus('closed'), 600)
        }, 3500)
      } else {
        setGateStatus('closed')
        setLastActionMsg({
          type: 'error',
          title: 'Entry Denied',
          detail: result?.message || 'Vehicle entry could not be processed.'
        })
      }
    }

    setIsSubmitting(false)
  }

  const targetFloor = getFloorForVehicleType(entryType)
  const availableBaysCount = (slots || []).filter(
    (s) => s && s.status === 'available' && (s.floor === targetFloor || (targetFloor.startsWith('Ground') ? (s.id && s.id.startsWith('G')) : (s.id && s.id.startsWith('B'))))
  ).length

  return (
    <div className="admin-page-container vehicle-entry-page-container">
      {/* 1. Page Header */}
      <div className="page-section-header glass-card">
        <div className="psh-badge">
          <span>🚗 GATE 1 INGRESS CONTROL</span>
        </div>
        <h1 className="psh-title">
          Vehicle <span className="gradient-text">Entry Terminal</span>
        </h1>
        <p className="psh-subtitle">
          ANPR camera gate ingress. Validates student registration, enforces floor allocation (Scooty &rarr; Ground, Bike &rarr; Basement), and assigns the closest available bay.
        </p>
      </div>

      {/* 2 & 10. Top Terminal Section: Left Form & Right Barrier */}
      <div className="terminal-grid-two">
        {/* Left: Vehicle Ingress Scanner Form */}
        <div className="terminal-form-card glass-card">
          <div className="card-header-clean">
            <div>
              <h3 className="card-heading">Vehicle Ingress Scanner</h3>
              <p className="text-muted text-xs">Simulate camera plate detection or manual entry</p>
            </div>
            <span className="ingress-live-tag">● ACTIVE INGRESS</span>
          </div>

          {/* Quick Select Registered Student */}
          <div className="form-group mb-3">
            <label className="form-label" htmlFor="quick-student-select">
              Quick Select Registered Student / Vehicle
            </label>
            <select
              id="quick-student-select"
              value={selectedStudentId}
              onChange={(e) => handleStudentSelect(e.target.value)}
              className="form-control select-modern"
            >
              <option value="">-- Choose Registered Student / Vehicle --</option>
              {registeredVehicles.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.studentName} ({st.rollNumber}) &bull; {st.vehicleNumber} [{st.vehicleType ? st.vehicleType.toUpperCase() : 'SCOOTY'}]
                </option>
              ))}
            </select>
          </div>

          <form onSubmit={handleSimulateEntry} className="ingress-form">
            {/* Vehicle License Plate */}
            <div className="form-group">
              <label className="form-label" htmlFor="entry-plate-input">
                Vehicle License Plate <span className="text-danger">*</span>
              </label>
              <div className="plate-input-wrapper">
                <span className="plate-country-badge">IND</span>
                <input
                  id="entry-plate-input"
                  type="text"
                  placeholder="e.g. MH-12-AB-1234"
                  value={entryPlate}
                  onChange={(e) => handlePlateChange(e.target.value)}
                  className="form-control font-mono font-bold uppercase-input plate-input-element"
                  required
                  autoComplete="off"
                />
              </div>
            </div>

            {/* Driver Name & Roll Number - stacked vertically on mobile */}
            <div className="form-row two-cols driver-roll-row">
              <div className="form-group">
                <label className="form-label" htmlFor="entry-driver-input">
                  Driver / Student Name
                </label>
                <input
                  id="entry-driver-input"
                  type="text"
                  placeholder="e.g. Alzuni Shaikh"
                  value={entryDriver}
                  onChange={(e) => setEntryDriver(e.target.value)}
                  className="form-control"
                  autoComplete="name"
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="entry-roll-input">
                  Roll Number
                </label>
                <input
                  id="entry-roll-input"
                  type="text"
                  placeholder="e.g. S2410701"
                  value={entryRoll}
                  onChange={(e) => setEntryRoll(e.target.value.toUpperCase())}
                  className="form-control font-mono uppercase-input"
                />
              </div>
            </div>

            {/* Vehicle Type selection */}
            <div className="form-group">
              <label className="form-label">Vehicle Type &amp; Designated Floor</label>
              <div className="vehicle-type-cards-grid">
                <label className={`vehicle-type-card ${entryType === 'scooty' ? 'active' : ''}`}>
                  <input
                    type="radio"
                    name="entryVType"
                    value="scooty"
                    checked={entryType === 'scooty'}
                    onChange={() => setEntryType('scooty')}
                    className="sr-only"
                  />
                  <span className="vt-card-icon">🛵</span>
                  <div className="vt-card-info">
                    <span className="vt-card-name">Scooty</span>
                    <span className="vt-card-floor">Ground Floor</span>
                  </div>
                  <span className="vt-card-level-chip">Level G</span>
                </label>

                <label className={`vehicle-type-card ${entryType === 'bike' ? 'active' : ''}`}>
                  <input
                    type="radio"
                    name="entryVType"
                    value="bike"
                    checked={entryType === 'bike'}
                    onChange={() => setEntryType('bike')}
                    className="sr-only"
                  />
                  <span className="vt-card-icon">🏍️</span>
                  <div className="vt-card-info">
                    <span className="vt-card-name">Bike</span>
                    <span className="vt-card-floor">Basement</span>
                  </div>
                  <span className="vt-card-level-chip">Level B</span>
                </label>
              </div>
            </div>

            {/* Designated Floor / Available Bay Capacity */}
            <div className="bay-capacity-banner">
              <div className="bcb-item">
                <span className="bcb-label">Designated Level:</span>
                <strong className="bcb-floor-text">{targetFloor}</strong>
              </div>
              <div className="bcb-status">
                <span className={`bcb-badge font-mono ${availableBaysCount > 0 ? 'available' : 'full'}`}>
                  {availableBaysCount > 0 ? `🟢 ${availableBaysCount} Bays Available` : '🔴 Level Full'}
                </span>
              </div>
            </div>

            {/* Submit / Ingress Action Button */}
            <button
              type="submit"
              className="btn btn-primary btn-md w-full mt-3 ingress-submit-btn"
              disabled={gateStatus !== 'closed' || isSubmitting}
            >
              <span>
                {isSubmitting
                  ? 'Allocating Bay & Authorizing...'
                  : gateStatus !== 'closed'
                  ? 'Processing Barrier...'
                  : 'Admit Vehicle & Assign Bay'}
              </span>
            </button>
          </form>
        </div>

        {/* Right: Gate Barrier Visualizer & Result */}
        <div className="gate-barrier-card glass-card">
          <div className="card-header-clean">
            <div>
              <h3 className="card-heading">Gate Telemetry Barrier</h3>
              <p className="text-muted text-xs">Real-time gate ingress barrier telemetry</p>
            </div>
            <span className={`status-pill ${gateStatus === 'open' ? 'available' : gateStatus === 'closed' ? 'reserved' : 'occupied'}`}>
              Barrier: {gateStatus.toUpperCase()}
            </span>
          </div>

          <div className="gate-barrier-stage">
            <div className={`barrier-arm ${gateStatus}`}></div>
            <div className="barrier-light-box">
              <div className={`barrier-light ${gateStatus === 'open' ? 'green' : 'red'}`}></div>
            </div>
            <span className="gate-sign-text">SOCMAC SMART PARK INGRESS</span>
          </div>

          {lastActionMsg && (
            <div className={`auth-alert ${lastActionMsg.type} mt-4`}>
              {lastActionMsg.type === 'success' ? (
                <CheckIcon className="w-5 h-5 flex-shrink-0" />
              ) : (
                <AlertCircleIcon className="w-5 h-5 flex-shrink-0" />
              )}
              <div>
                <strong>{lastActionMsg.title}</strong>
                <p className="text-xs mt-1 mb-0">{lastActionMsg.detail}</p>
                {lastActionMsg.passData && onShowPass && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-xs mt-2"
                    onClick={() => onShowPass(lastActionMsg.passData)}
                  >
                    🎫 View Issued Permit Pass
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 11. CURRENT VEHICLE ENTRY / VEHICLE ENTRY DETAILS SECTION */}
      <div className="vehicle-entry-details-section">
        {currentVehicleEntry ? (
          <div className="vehicle-entry-details-card glass-card">
            <div className="ved-card-header">
              <div className="ved-header-info">
                <span className="ved-pill-tag">● CURRENT VEHICLE ENTRY</span>
                <h3 className="ved-title">Vehicle Entry Details</h3>
                <p className="text-muted text-xs">Telemetry and bay allocation for the most recently entered vehicle</p>
              </div>
              <div className="ved-header-statuses">
                <span className="status-pill available">Status: {currentVehicleEntry.status || 'Vehicle Entered'}</span>
                <span className="status-pill active-pill">Session: {currentVehicleEntry.session || 'Active'}</span>
              </div>
            </div>

            <div className="ved-grid">
              <div className="ved-card-cell">
                <span className="ved-cell-label">Vehicle Number</span>
                <strong className="ved-cell-value font-mono plate-value-accent">
                  {currentVehicleEntry.plate || currentVehicleEntry.vehicleNumber}
                </strong>
              </div>

              <div className="ved-card-cell">
                <span className="ved-cell-label">Student / Driver Name</span>
                <span className="ved-cell-value">
                  {currentVehicleEntry.owner || currentVehicleEntry.studentName || 'Student Member'}
                </span>
              </div>

              <div className="ved-card-cell">
                <span className="ved-cell-label">Roll Number</span>
                <span className="ved-cell-value font-mono">
                  {currentVehicleEntry.rollNumber || '—'}
                </span>
              </div>

              <div className="ved-card-cell">
                <span className="ved-cell-label">Vehicle Type</span>
                <span className="ved-cell-value flex items-center gap-1">
                  <span>{currentVehicleEntry.vehicleType === 'bike' ? '🏍️ Bike' : '🛵 Scooty'}</span>
                </span>
              </div>

              <div className="ved-card-cell">
                <span className="ved-cell-label">Assigned Floor</span>
                <span className="ved-cell-value font-bold text-cyan">
                  {currentVehicleEntry.floor}
                </span>
              </div>

              <div className="ved-card-cell ved-slot-highlight-cell">
                <span className="ved-cell-label">Assigned Parking Slot</span>
                <strong className="ved-slot-badge font-mono">
                  📍 {currentVehicleEntry.slotId}
                </strong>
              </div>

              <div className="ved-card-cell">
                <span className="ved-cell-label">Entry Time</span>
                <span className="ved-cell-value font-mono">
                  {currentVehicleEntry.entryTime || 'Just now'}
                </span>
              </div>

              <div className="ved-card-cell">
                <span className="ved-cell-label">Parking Zone</span>
                <span className="ved-cell-value">
                  {currentVehicleEntry.zone || currentVehicleEntry.section || `${currentVehicleEntry.floor} General`}
                </span>
              </div>
            </div>

            {onShowPass && (
              <div className="ved-card-footer">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => onShowPass(currentVehicleEntry)}
                >
                  🎫 View Issued Permit Pass
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="vehicle-entry-empty-state glass-card">
            <div className="empty-state-graphic">🅿️</div>
            <h4 className="empty-state-title">No vehicle currently entered</h4>
            <p className="empty-state-subtitle">
              When a vehicle is admitted through the ingress barrier, its allocated parking slot, student driver details, and real-time session status will appear here.
            </p>
          </div>
        )}
      </div>

      {/* 12. Contextual Parking Map */}
      <div className="vehicle-entry-map-section">
        <div className="map-context-header glass-card">
          <div className="mch-info">
            <h3 className="mch-title">Interactive Parking Map &amp; Bay Allocations</h3>
            <p className="text-muted text-xs">
              {currentVehicleEntry
                ? `Spotlighting allocated Bay ${currentVehicleEntry.slotId} on ${currentVehicleEntry.floor}. Total 160 slots (80 Ground Scooty / 80 Basement Bike).`
                : 'Campus parking bay layout across Ground Floor (Scooty) and Basement (Bike). Total 160 slots.'}
            </p>
          </div>

          {currentVehicleEntry && (
            <div className="mch-spotlight-badge font-mono">
              <span>🎯 Allocated:</span>
              <strong>{currentVehicleEntry.slotId}</strong>
              <small>({currentVehicleEntry.floor})</small>
            </div>
          )}
        </div>

        <ParkingLotMap
          slots={slots}
          selectedSlotId={currentVehicleEntry?.slotId}
          isAdmin={true}
        />
      </div>
    </div>
  )
}
