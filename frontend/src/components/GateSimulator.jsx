import { useState } from 'react'
import { GateIcon, CheckIcon, AlertCircleIcon } from './Icons'
import { verifyAndEnterGate, exitGate } from '../services/parkingApiService'

export default function GateSimulator({
  slots = [],
  registeredVehicles = [],
  onVehicleEntrySuccess,
  onVehicleExitSuccess,
  onShowPass,
  onNavigateToMap
}) {
  // Ingress mode: 'qr' or 'plate'
  const [entryMode, setEntryMode] = useState('qr')
  const [qrInput, setQrInput] = useState('')
  const [entryPlate, setEntryPlate] = useState('')
  const [entryDriver, setEntryDriver] = useState('')
  const [entryType, setEntryType] = useState('scooty')
  const [selectedStudentId, setSelectedStudentId] = useState('')

  // Exit state
  const [exitPlate, setExitPlate] = useState('')

  // Barrier animation & feedback
  const [gateStatus, setGateStatus] = useState('closed') // 'closed' | 'opening' | 'open' | 'closing'
  const [lastActionMsg, setLastActionMsg] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleStudentSelect = (studentId) => {
    setSelectedStudentId(studentId)
    const st = registeredVehicles.find((v) => v.id === studentId)
    if (st) {
      setEntryPlate(st.vehicleNumber)
      setEntryDriver(st.studentName)
      setEntryType(st.vehicleType || 'scooty')
    }
  }

  // Handle Gate Ingress
  const handleSimulateEntry = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    setLastActionMsg(null)

    try {
      const payload = entryMode === 'qr'
        ? { qrToken: qrInput.trim(), preferredFloor: entryType === 'scooty' ? 'Ground Floor' : 'Basement' }
        : {
            plate: entryPlate.toUpperCase().trim(),
            studentName: entryDriver.trim() || 'Student Member',
            vehicleType: entryType,
            preferredFloor: entryType === 'scooty' ? 'Ground Floor' : 'Basement'
          }

      const res = await verifyAndEnterGate(payload)

      // Animate gate open
      setGateStatus('opening')
      setTimeout(() => {
        setGateStatus('open')
        setLastActionMsg({
          type: 'success',
          title: `🚗 ${res.status}: Barrier Open!`,
          detail: `Vehicle ${res.slot.plate} dynamically allocated to Bay ${res.slotId} (${res.floor} - ${res.section}).`,
          passData: res.permit
        })

        if (onVehicleEntrySuccess) {
          onVehicleEntrySuccess(res)
        }

        setQrInput('')
        setEntryPlate('')
        setEntryDriver('')
        setSelectedStudentId('')

        // Auto close barrier after 3.5s
        setTimeout(() => {
          setGateStatus('closing')
          setTimeout(() => setGateStatus('closed'), 600)
        }, 3500)
      }, 600)
    } catch (err) {
      setLastActionMsg({
        type: 'error',
        title: err.status === 'PARKING_FULL' ? '⛔ PARKING FULL' : '❌ ACCESS DENIED',
        detail: err.message
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle Gate Egress
  const handleSimulateExit = async (e) => {
    e.preventDefault()
    if (!exitPlate.trim()) return

    setIsSubmitting(true)
    setLastActionMsg(null)

    try {
      const res = await exitGate({ plate: exitPlate.toUpperCase().trim() })

      setGateStatus('opening')
      setTimeout(() => {
        setGateStatus('open')
        setLastActionMsg({
          type: 'success',
          title: '🚙 Vehicle Checked Out',
          detail: `Vehicle ${exitPlate.toUpperCase()} cleared Bay ${res.slotId}. Slot released immediately & logged to history (${res.duration}).`
        })

        if (onVehicleExitSuccess) {
          onVehicleExitSuccess(res)
        }

        setExitPlate('')

        setTimeout(() => {
          setGateStatus('closing')
          setTimeout(() => setGateStatus('closed'), 600)
        }, 3500)
      }, 600)
    } catch (err) {
      setLastActionMsg({
        type: 'error',
        title: 'Exit Failed',
        detail: err.message
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const occupiedSlots = slots.filter((s) => s.status === 'occupied' || s.status === 'OCCUPIED')

  return (
    <div className="gate-simulator-container">
      {/* Barrier Animation & Feedback Header */}
      <div className="gate-barrier-visualizer glass-card">
        <div className="barrier-header">
          <div className="gate-title-tag">
            <GateIcon className="w-5 h-5 text-cyan" />
            <span>Campus Boom Barrier Telemetry Station</span>
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

      {/* 2 Clean Terminals: Ingress & Egress */}
      <div className="gate-terminals-grid">
        {/* Inbound Entry Terminal */}
        <div className="terminal-card glass-card">
          <div className="terminal-header">
            <span className="terminal-badge entry">VEHICLE INGRESS</span>
            <h4>Scan Permit QR &bull; Dynamic Bay Assignment</h4>
          </div>

          {/* Mode Switcher */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
            <button
              type="button"
              className={`btn btn-sm ${entryMode === 'qr' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ flex: 1 }}
              onClick={() => setEntryMode('qr')}
            >
              📷 Scan QR Token
            </button>
            <button
              type="button"
              className={`btn btn-sm ${entryMode === 'plate' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ flex: 1 }}
              onClick={() => setEntryMode('plate')}
            >
              🚗 License Plate
            </button>
          </div>

          <form onSubmit={handleSimulateEntry} className="terminal-form">
            {entryMode === 'qr' ? (
              <div className="form-group">
                <label>Permit QR Token / Scanned Payload *</label>
                <input
                  type="text"
                  placeholder="e.g. SOC-PRM-U09DOlBFUk1JVD..."
                  value={qrInput}
                  onChange={(e) => setQrInput(e.target.value)}
                  className="form-control font-mono"
                  required
                />
                <span style={{ fontSize: '11.5px', color: '#94a3b8', display: 'block', marginTop: '4px' }}>
                  💡 Paste the token from your active permit or scan from mobile camera.
                </span>
              </div>
            ) : (
              <>
                {registeredVehicles.length > 0 && (
                  <div className="form-group">
                    <label>Quick Select Registered Student</label>
                    <select
                      className="form-control"
                      value={selectedStudentId}
                      onChange={(e) => handleStudentSelect(e.target.value)}
                    >
                      <option value="">-- Choose Registered Student ({registeredVehicles.length}) --</option>
                      {registeredVehicles.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.studentName} &bull; {v.vehicleNumber} ({v.vehicleType})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="form-group">
                  <label>Vehicle License Plate *</label>
                  <input
                    type="text"
                    placeholder="e.g. MH-12-AB-1234"
                    value={entryPlate}
                    onChange={(e) => setEntryPlate(e.target.value)}
                    className="form-control uppercase-input font-mono font-bold"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Student Name</label>
                  <input
                    type="text"
                    placeholder="Student Name"
                    value={entryDriver}
                    onChange={(e) => setEntryDriver(e.target.value)}
                    className="form-control"
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
              </>
            )}

            <button
              type="submit"
              disabled={isSubmitting || gateStatus === 'opening' || gateStatus === 'open'}
              className="btn btn-primary w-full gate-btn"
            >
              {isSubmitting ? 'Verifying with Backend…' : 'Admit Vehicle &bull; Dynamic Bay Assignment'}
            </button>
          </form>
        </div>

        {/* Outbound Exit Terminal */}
        <div className="terminal-card glass-card">
          <div className="terminal-header">
            <span className="terminal-badge exit">VEHICLE EGRESS</span>
            <h4>Outbound Exit &bull; Free Bay Immediately</h4>
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
                    Bay {s.id} ({s.floor}): {s.plate} [{s.owner || 'Student'}]
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Or Enter License Plate Manually</label>
              <input
                type="text"
                placeholder="e.g. MH-12-AB-1234"
                value={exitPlate}
                onChange={(e) => setExitPlate(e.target.value)}
                className="form-control uppercase-input font-mono font-bold"
              />
            </div>

            <div className="exit-summary-box">
              <div className="info-row">
                <span>Action on Exit:</span>
                <span className="text-emerald">Frees Bay Immediately &bull; Records Session</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || gateStatus === 'opening' || gateStatus === 'open' || !exitPlate.trim()}
              className="btn btn-secondary w-full gate-btn"
            >
              {isSubmitting ? 'Processing Exit…' : 'Check Out Vehicle &bull; Release Bay'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
