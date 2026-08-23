import { useState } from 'react'
import { GateIcon } from './Icons'

export default function GateSimulator({
  slots = [],
  onVehicleEntry,
  onVehicleExit,
  onShowPass
}) {
  const [entryPlate, setEntryPlate] = useState('')
  const [entryDriver, setEntryDriver] = useState('')
  const [entryType, setEntryType] = useState('bike') // 'bike' | 'scooty' | 'ev' | 'car'
  const [entryCategory, setEntryCategory] = useState('Student')
  const [entryFloorTarget, setEntryFloorTarget] = useState('auto') // 'auto' | 'Ground Floor' | 'Basement'

  const [exitPlate, setExitPlate] = useState('')

  const [gateStatus, setGateStatus] = useState('closed') // 'closed' | 'opening' | 'open' | 'closing'
  const [lastActionMsg, setLastActionMsg] = useState(null)

  const handleSimulateEntry = (e) => {
    e.preventDefault()
    if (!entryPlate.trim()) return

    const plateFormatted = entryPlate.toUpperCase().trim()

    // Trigger barrier open animation
    setGateStatus('opening')
    setTimeout(() => {
      setGateStatus('open')

      const result = onVehicleEntry({
        plate: plateFormatted,
        owner: entryDriver.trim() || 'Campus Driver',
        type: entryType,
        category: entryCategory,
        preferredFloor: entryFloorTarget !== 'auto' ? entryFloorTarget : undefined
      })

      if (result.success) {
        setLastActionMsg({
          type: 'success',
          title: 'Gate Barrier Opened • Inbound Vehicle Admitted',
          detail: `Assigned Slot: ${result.slotId} (${result.floor || 'Campus'} - ${result.section || 'General'}) for ${plateFormatted}`,
          passData: result.passData
        })
        setEntryPlate('')
        setEntryDriver('')
      } else {
        setLastActionMsg({
          type: 'error',
          title: 'Entry Denied • Gate Closed',
          detail: result.message
        })
      }

      // Auto close after 4s
      setTimeout(() => {
        setGateStatus('closing')
        setTimeout(() => setGateStatus('closed'), 600)
      }, 4000)
    }, 600)
  }

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
          title: 'Exit Approved • Outbound Barrier Opened',
          detail: `Vehicle ${plateFormatted} cleared from Slot ${result.slotId}. Duration: ${result.duration || '45m'}. Institutional Parking: Free.`
        })
        setExitPlate('')
      } else {
        setLastActionMsg({
          type: 'error',
          title: 'Exit Clearance Failed',
          detail: result.message
        })
      }

      setTimeout(() => {
        setGateStatus('closing')
        setTimeout(() => setGateStatus('closed'), 600)
      }, 4000)
    }, 600)
  }

  const occupiedSlots = slots.filter((s) => s.status === 'occupied' || s.status === 'reserved')

  return (
    <div className="gate-simulator-container">
      {/* Animated Barrier Visualizer */}
      <div className="gate-barrier-visualizer glass-card">
        <div className="barrier-header">
          <div className="gate-title-tag">
            <GateIcon className="w-5 h-5 text-cyan" />
            <span>Campus Main Security Boom Barrier &bull; ANPR Station #1</span>
          </div>
          <div className={`gate-status-pill ${gateStatus}`}>
            <span className="gate-led"></span>
            <span>BARRIER {gateStatus.toUpperCase()}</span>
          </div>
        </div>

        <div className="barrier-stage">
          {/* Road markings */}
          <div className="road-surface">
            <div className="road-line"></div>
            <div className="road-line"></div>
            <div className="road-line"></div>
            <div className="road-text-marker">CAMPUS PARKING INBOUND / OUTBOUND</div>
          </div>

          {/* Boom Barrier Pillar & Arm */}
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
              <div className="arm-stripe arm-stripe-4"></div>
            </div>
          </div>
        </div>

        {lastActionMsg && (
          <div className={`gate-action-alert alert-${lastActionMsg.type}`}>
            <div className="alert-content">
              <strong>{lastActionMsg.title}</strong>
              <p>{lastActionMsg.detail}</p>
              {lastActionMsg.passData && onShowPass && (
                <button
                  type="button"
                  className="view-pass-btn mt-2"
                  onClick={() => onShowPass(lastActionMsg.passData)}
                >
                  🎫 View Digital Parking Pass
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Terminal Controls Grid */}
      <div className="gate-terminals-grid">
        {/* Entry Gate Simulator */}
        <div className="terminal-card glass-card">
          <div className="terminal-header">
            <span className="terminal-badge entry">INBOUND TERMINAL #1</span>
            <h4>ANPR Automatic Vehicle Inbound Scanner</h4>
          </div>

          <form onSubmit={handleSimulateEntry} className="terminal-form">
            <div className="form-group">
              <label>License Plate Number *</label>
              <input
                type="text"
                placeholder="e.g. MH-04-AZ-9988"
                value={entryPlate}
                onChange={(e) => setEntryPlate(e.target.value)}
                className="form-control uppercase-input"
                required
              />
            </div>

            <div className="form-group">
              <label>Driver / Student / Staff Name</label>
              <input
                type="text"
                placeholder="e.g. Aryan Sharma"
                value={entryDriver}
                onChange={(e) => setEntryDriver(e.target.value)}
                className="form-control"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Vehicle Type</label>
                <select
                  value={entryType}
                  onChange={(e) => setEntryType(e.target.value)}
                  className="form-control"
                >
                  <option value="bike">🏍️ Two-Wheeler / Bike</option>
                  <option value="scooty">🛵 Scooty (Girls Ground Floor)</option>
                  <option value="ev">⚡ EV Two-Wheeler</option>
                  <option value="car">🚗 4-Wheeler Car</option>
                </select>
              </div>

              <div className="form-group">
                <label>Campus Role</label>
                <select
                  value={entryCategory}
                  onChange={(e) => setEntryCategory(e.target.value)}
                  className="form-control"
                >
                  <option value="Student">Student</option>
                  <option value="Faculty">Faculty</option>
                  <option value="Staff">College Staff</option>
                  <option value="Visitor">Visitor</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Target Parking Floor</label>
              <select
                value={entryFloorTarget}
                onChange={(e) => setEntryFloorTarget(e.target.value)}
                className="form-control"
              >
                <option value="auto">🤖 Auto Assign Optimal Floor &amp; Bay</option>
                <option value="Ground Floor">🅿️ Ground Floor (Girls Scooty - 80 Slots)</option>
                <option value="Basement">🅿️ Basement (Boys Two-Wheeler - 80 Slots)</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={gateStatus === 'opening' || gateStatus === 'open'}
              className="btn btn-primary w-full gate-btn"
            >
              Simulate Inbound Vehicle Entry &amp; Open Barrier
            </button>
          </form>
        </div>

        {/* Exit Gate Simulator */}
        <div className="terminal-card glass-card">
          <div className="terminal-header">
            <span className="terminal-badge exit">OUTBOUND TERMINAL #2</span>
            <h4>Outbound Checkout &amp; Slot Clearance</h4>
          </div>

          <form onSubmit={handleSimulateExit} className="terminal-form">
            <div className="form-group">
              <label>Select Parked Vehicle to Exit</label>
              <select
                value={exitPlate}
                onChange={(e) => setExitPlate(e.target.value)}
                className="form-control"
              >
                <option value="">-- Choose Parked Vehicle from Lot --</option>
                {occupiedSlots.map((s) => (
                  <option key={s.id} value={s.plate}>
                    Slot {s.id} ({s.floor}) : {s.plate} [{s.owner || 'Driver'}] - {s.status.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Or Type License Plate Manually</label>
              <input
                type="text"
                placeholder="e.g. MH-04-CD-5678"
                value={exitPlate}
                onChange={(e) => setExitPlate(e.target.value)}
                className="form-control uppercase-input"
              />
            </div>

            <div className="exit-summary-box">
              <div className="info-row">
                <span>Validation Rule:</span>
                <span className="text-emerald">Institutional Smart Permit Verified</span>
              </div>
              <div className="info-row">
                <span>Parking Fee:</span>
                <span className="fee-badge">₹0.00 (Campus Pass Covered)</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={gateStatus === 'opening' || gateStatus === 'open' || !exitPlate.trim()}
              className="btn btn-secondary w-full gate-btn exit-btn"
            >
              Simulate Outbound Vehicle Exit &amp; Clear Slot
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
