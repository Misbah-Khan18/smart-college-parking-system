import { useState, useMemo } from 'react'
import {
  GateIcon,
  CheckIcon,
  AlertCircleIcon
} from './Icons'

export default function GateSimulator({
  slots = [],
  registeredVehicles = [],
  onVehicleEntry,
  onVehicleExit,
  onShowPass,
  onNavigateToMap,
  onNavigateToHistory
}) {
  // Entry Form State
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [entryPlate, setEntryPlate] = useState('')
  const [entryDriver, setEntryDriver] = useState('')
  const [entryType, setEntryType] = useState('scooty') // 'scooty' | 'bike'

  // Exit Form State
  const [exitPlate, setExitPlate] = useState('')

  // Gate Animation & Status
  const [gateStatus, setGateStatus] = useState('closed') // 'closed' | 'opening' | 'open' | 'closing'
  const [lastActionMsg, setLastActionMsg] = useState(null)

  // Handle student quick select
  const handleStudentSelect = (studentId) => {
    setSelectedStudentId(studentId)
    const st = registeredVehicles.find((v) => v.id === studentId)
    if (st) {
      setEntryPlate(st.vehicleNumber)
      setEntryDriver(st.studentName)
      setEntryType(st.vehicleType || 'scooty')
    }
  }

  // Execute Vehicle Entry
  const handleSimulateEntry = (e) => {
    e.preventDefault()
    if (!entryPlate.trim()) return

    const plateFormatted = entryPlate.toUpperCase().trim()
    const st = registeredVehicles.find((v) => v.vehicleNumber === plateFormatted) || {}

    setGateStatus('opening')
    setTimeout(() => {
      setGateStatus('open')

      const preferredFloor = entryType === 'scooty' ? 'Ground Floor' : 'Basement'

      const result = onVehicleEntry({
        plate: plateFormatted,
        owner: entryDriver.trim() || st.studentName || 'Student',
        rollNumber: st.rollNumber || '',
        stream: st.stream || '',
        phoneNumber: st.phoneNumber || '',
        type: entryType,
        category: 'Student',
        preferredFloor
      })

      if (result.success) {
        setLastActionMsg({
          type: 'success',
          title: '🚗 Vehicle Admitted & Nearest Slot Assigned',
          detail: `Vehicle ${plateFormatted} assigned to Bay ${result.slotId} (${result.floor}). Map updated immediately.`,
          passData: result.passData
        })
        setEntryPlate('')
        setEntryDriver('')
        setSelectedStudentId('')
      } else {
        setLastActionMsg({
          type: 'error',
          title: 'Entry Denied',
          detail: result.message
        })
      }

      setTimeout(() => {
        setGateStatus('closing')
        setTimeout(() => setGateStatus('closed'), 600)
      }, 3500)
    }, 600)
  }

  // Execute Vehicle Exit
  const handleSimulateExit = (e) => {
    e.preventDefault()
    if (!exitPlate.trim()) return

    const plateFormatted = exitPlate.toUpperCase().trim()

    setGateStatus('opening')
    setTimeout(() => {
      setGateStatus('open')

      const result = onVehicleExit(plateFormatted)

      if (result.success) {
        setLastActionMsg({
          type: 'success',
          title: '🚙 Vehicle Checked Out',
          detail: `Vehicle ${plateFormatted} cleared Bay ${result.slotId}. Slot released & saved to Parking History.`
        })
        setExitPlate('')
      } else {
        setLastActionMsg({
          type: 'error',
          title: 'Exit Failed',
          detail: result.message
        })
      }

      setTimeout(() => {
        setGateStatus('closing')
        setTimeout(() => setGateStatus('closed'), 600)
      }, 3500)
    }, 600)
  }

  const occupiedSlots = slots.filter((s) => s.status === 'occupied' || s.status === 'reserved')

  return (
    <div className="gate-simulator-container">
      {/* Barrier Animation & Feedback Header */}
      <div className="gate-barrier-visualizer glass-card">
        <div className="barrier-header">
          <div className="gate-title-tag">
            <GateIcon className="w-5 h-5 text-cyan" />
            <span>Campus Boom Barrier Station</span>
          </div>
          <div className={`gate-status-pill ${gateStatus}`}>
            <span className="gate-led"></span>
            <span>BARRIER {gateStatus.toUpperCase()}</span>
          </div>
        </div>

        <div className="barrier-stage">
          <div className="road-surface">
            <div className="road-line"></div>
            <div className="road-line"></div>
            <div className="road-text-marker">CAMPUS TWO-WHEELER INBOUND / OUTBOUND</div>
          </div>

          <div className="barrier-structure">
            <div className="barrier-pillar">
              <div
                className={`pillar-light ${
                  gateStatus === 'open' || gateStatus === 'opening' ? 'light-green' : 'light-red'
                }`}
              ></div>
            </div>
            <div className={`barrier-arm ${gateStatus}`}>
              <div className="arm-stripe arm-stripe-1"></div>
              <div className="arm-stripe arm-stripe-2"></div>
              <div className="arm-stripe arm-stripe-3"></div>
            </div>
          </div>
        </div>

        {lastActionMsg && (
          <div className={`gate-action-alert alert-${lastActionMsg.type}`}>
            <div className="alert-content">
              <div className="alert-title-row">
                {lastActionMsg.type === 'success' ? (
                  <CheckIcon className="w-5 h-5 text-emerald" />
                ) : (
                  <AlertCircleIcon className="w-5 h-5 text-rose" />
                )}
                <strong>{lastActionMsg.title}</strong>
              </div>
              <p>{lastActionMsg.detail}</p>

              <div className="alert-action-buttons">
                {lastActionMsg.passData && onShowPass && (
                  <button
                    type="button"
                    className="view-pass-btn"
                    onClick={() => onShowPass(lastActionMsg.passData)}
                  >
                    🎫 View Digital Pass
                  </button>
                )}
                {onNavigateToMap && (
                  <button
                    type="button"
                    className="view-map-jump-btn"
                    onClick={onNavigateToMap}
                  >
                    📍 View on Map
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 2 Clean Terminals: Entry & Exit */}
      <div className="gate-terminals-grid">
        {/* Module 5: Vehicle Entry */}
        <div className="terminal-card glass-card">
          <div className="terminal-header">
            <span className="terminal-badge entry">VEHICLE ENTRY</span>
            <h4>Inbound Entry &bull; Auto Nearest Slot</h4>
          </div>

          <form onSubmit={handleSimulateEntry} className="terminal-form">
            <div className="form-group">
              <label>Quick Select Registered Student (Optional)</label>
              <select
                className="form-control"
                value={selectedStudentId}
                onChange={(e) => handleStudentSelect(e.target.value)}
              >
                <option value="">-- Choose Registered Student ({registeredVehicles.length}) --</option>
                {registeredVehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.studentName} ({v.rollNumber}) &bull; {v.vehicleNumber}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Vehicle Number (License Plate) *</label>
              <input
                type="text"
                placeholder="e.g. MH-04-AB-1234"
                value={entryPlate}
                onChange={(e) => setEntryPlate(e.target.value)}
                className="form-control uppercase-input font-mono font-bold"
                required
              />
            </div>

            <div className="form-group">
              <label>Student Name *</label>
              <input
                type="text"
                placeholder="e.g. Ananya Deshmukh"
                value={entryDriver}
                onChange={(e) => setEntryDriver(e.target.value)}
                className="form-control"
                required
              />
            </div>

            <div className="form-group">
              <label>Vehicle Type *</label>
              <select
                value={entryType}
                onChange={(e) => setEntryType(e.target.value)}
                className="form-control"
              >
                <option value="scooty">🛵 Scooty &rarr; Auto Assigns Ground Floor</option>
                <option value="bike">🏍️ Bike &rarr; Auto Assigns Basement</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={gateStatus === 'opening' || gateStatus === 'open' || !entryPlate.trim()}
              className="btn btn-primary w-full gate-btn"
            >
              Admit Vehicle &bull; Auto Allocate Nearest Slot
            </button>
          </form>
        </div>

        {/* Module 6: Vehicle Exit */}
        <div className="terminal-card glass-card">
          <div className="terminal-header">
            <span className="terminal-badge exit">VEHICLE EXIT</span>
            <h4>Outbound Exit &bull; Free Slot</h4>
          </div>

          <form onSubmit={handleSimulateExit} className="terminal-form">
            <div className="form-group">
              <label>Select Parked Vehicle ({occupiedSlots.length} Active)</label>
              <select
                value={exitPlate}
                onChange={(e) => setExitPlate(e.target.value)}
                className="form-control"
              >
                <option value="">-- Choose Parked Vehicle to Exit --</option>
                {occupiedSlots.map((s) => (
                  <option key={s.id} value={s.plate}>
                    Slot {s.id} ({s.floor}): {s.plate} [{s.owner || 'Student'}]
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Or Enter License Plate Manually</label>
              <input
                type="text"
                placeholder="e.g. MH-04-AB-1234"
                value={exitPlate}
                onChange={(e) => setExitPlate(e.target.value)}
                className="form-control uppercase-input font-mono font-bold"
              />
            </div>

            <div className="exit-summary-box">
              <div className="info-row">
                <span>Action on Exit:</span>
                <span className="text-emerald">Frees Slot &bull; Saves History</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={gateStatus === 'opening' || gateStatus === 'open' || !exitPlate.trim()}
              className="btn btn-secondary w-full gate-btn"
            >
              Check Out Vehicle &bull; Release Slot
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
