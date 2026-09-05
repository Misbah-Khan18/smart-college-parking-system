import { useState } from 'react'
import {
  CheckIcon,
  AlertCircleIcon,
  ShieldIcon,
  PlusCircleIcon
} from '../Icons'
import { getFloorForVehicleType } from '../../services/vehicleService'

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

  // Handle Quick Select from Registered Students
  const handleStudentSelect = (studentId) => {
    setSelectedStudentId(studentId)
    const st = registeredVehicles.find((v) => v.id === studentId)
    if (st) {
      setEntryPlate(st.vehicleNumber)
      setEntryDriver(st.studentName)
      setEntryRoll(st.rollNumber)
      setEntryStream(st.stream || '')
      setEntryType(st.vehicleType || 'scooty')
    }
  }

  const handleSimulateEntry = (e) => {
    e.preventDefault()
    if (!entryPlate.trim()) return

    const cleanPlate = entryPlate.toUpperCase().trim()
    const st = registeredVehicles.find((v) => v.vehicleNumber === cleanPlate) || {}

    // Check if vehicle is already parked inside
    const alreadyParked = slots.find(
      (s) => s.status === 'occupied' && s.plate && s.plate.replace(/[^A-Z0-9]/g, '') === cleanPlate.replace(/[^A-Z0-9]/g, '')
    )

    if (alreadyParked) {
      setLastActionMsg({
        type: 'error',
        title: 'Vehicle Already Inside Campus',
        detail: `Vehicle ${cleanPlate} is already occupying Bay ${alreadyParked.id} (${alreadyParked.floor}). Exit vehicle first.`
      })
      return
    }

    setGateStatus('opening')
    setTimeout(() => {
      setGateStatus('open')

      const preferredFloor = getFloorForVehicleType(entryType)

      if (onVehicleEntry) {
        const result = onVehicleEntry({
          plate: cleanPlate,
          owner: entryDriver.trim() || st.studentName || 'Student Member',
          rollNumber: entryRoll || st.rollNumber || 'S2410701',
          stream: entryStream || st.stream || 'BCA',
          type: entryType,
          category: 'Student',
          preferredFloor
        })

        if (result && result.success) {
          setLastActionMsg({
            type: 'success',
            title: 'Vehicle Admitted & Slot Allocated',
            detail: `Vehicle ${cleanPlate} assigned to Bay ${result.slotId} on ${result.floor}.`,
            passData: result.passData
          })
          setEntryPlate('')
          setEntryDriver('')
          setEntryRoll('')
          setEntryStream('')
          setSelectedStudentId('')
        } else {
          setLastActionMsg({
            type: 'error',
            title: 'Entry Denied',
            detail: result?.message || 'No available parking bays for this vehicle type on designated floor.'
          })
        }
      }

      setTimeout(() => {
        setGateStatus('closing')
        setTimeout(() => setGateStatus('closed'), 600)
      }, 3500)
    }, 600)
  }

  return (
    <div className="admin-page-container">
      {/* Header */}
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

      <div className="terminal-grid-two">
        {/* Left: Gate Entry Form */}
        <div className="terminal-form-card glass-card">
          <div className="card-header-clean">
            <h3>Vehicle Ingress Scanner</h3>
            <span className="text-muted text-xs">Simulate camera plate detection or manual entry</span>
          </div>

          {/* Quick Select Registered Student */}
          <div className="form-group mb-3">
            <label className="form-label">Quick Select Registered Student</label>
            <select
              value={selectedStudentId}
              onChange={(e) => handleStudentSelect(e.target.value)}
              className="form-control"
            >
              <option value="">-- Choose Registered Student / Vehicle --</option>
              {registeredVehicles.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.studentName} ({st.rollNumber}) &bull; {st.vehicleNumber} [{st.vehicleType.toUpperCase()}]
                </option>
              ))}
            </select>
          </div>

          <form onSubmit={handleSimulateEntry} className="ingress-form">
            <div className="form-group">
              <label className="form-label">Vehicle License Plate *</label>
              <input
                type="text"
                placeholder="e.g. MH-12-AB-1234"
                value={entryPlate}
                onChange={(e) => setEntryPlate(e.target.value.toUpperCase())}
                className="form-control font-mono font-bold uppercase-input"
                required
              />
            </div>

            <div className="form-row two-cols">
              <div className="form-group">
                <label className="form-label">Driver / Student Name</label>
                <input
                  type="text"
                  placeholder="e.g. Alzuni Shaikh"
                  value={entryDriver}
                  onChange={(e) => setEntryDriver(e.target.value)}
                  className="form-control"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Roll Number</label>
                <input
                  type="text"
                  placeholder="e.g. S2410701"
                  value={entryRoll}
                  onChange={(e) => setEntryRoll(e.target.value.toUpperCase())}
                  className="form-control font-mono uppercase-input"
                />
              </div>
            </div>

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
                  <span className="vt-card-name">Scooty</span>
                  <span className="vt-card-floor">Ground Floor</span>
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
                  <span className="vt-card-name">Bike</span>
                  <span className="vt-card-floor">Basement</span>
                </label>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-md w-full mt-3"
              disabled={gateStatus !== 'closed'}
            >
              <span>{gateStatus !== 'closed' ? 'Processing Barrier...' : 'Admit Vehicle & Assign Bay'}</span>
            </button>
          </form>
        </div>

        {/* Right: Gate Barrier Visualizer & Result */}
        <div className="gate-barrier-card glass-card">
          <div className="card-header-clean">
            <h3>Gate Telemetry Barrier</h3>
            <span className={`status-pill ${gateStatus === 'open' ? 'available' : gateStatus === 'closed' ? 'reserved' : 'occupied'}`}>
              Barrier: {gateStatus.toUpperCase()}
            </span>
          </div>

          <div className="gate-barrier-stage">
            <div className={`barrier-arm ${gateStatus}`}></div>
            <div className="barrier-light-box">
              <div className={`barrier-light ${gateStatus === 'open' ? 'green' : 'red'}`}></div>
            </div>
            <span className="gate-sign-text">SCHOOL OF COMMERCE INGRESS</span>
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
    </div>
  )
}
