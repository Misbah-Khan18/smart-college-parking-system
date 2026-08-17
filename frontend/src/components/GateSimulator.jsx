import React, { useState } from 'react'
import { GateIcon, CheckIcon, CarIcon, BikeIcon, EvIcon, ClockIcon, ShieldIcon } from './Icons'

export default function GateSimulator({
  slots,
  onVehicleEntry,
  onVehicleExit,
  onShowPass
}) {
  const [entryPlate, setEntryPlate] = useState('')
  const [entryDriver, setEntryDriver] = useState('')
  const [entryType, setEntryType] = useState('car')
  const [entryCategory, setEntryCategory] = useState('Student')

  const [exitPlate, setExitPlate] = useState('')

  const [gateStatus, setGateStatus] = useState('closed') // 'closed' | 'opening' | 'open' | 'closing'
  const [lastActionMsg, setLastActionMsg] = useState(null)

  const handleSimulateEntry = (e) => {
    e.preventDefault()
    if (!entryPlate.trim()) return

    const plateFormatted = entryPlate.toUpperCase().trim()

    // Trigger gate animation
    setGateStatus('opening')
    setTimeout(() => {
      setGateStatus('open')
      
      const result = onVehicleEntry({
        plate: plateFormatted,
        owner: entryDriver.trim() || 'Campus Driver',
        type: entryType,
        category: entryCategory
      })

      if (result.success) {
        setLastActionMsg({
          type: 'success',
          title: 'Gate Opened • Vehicle Admitted',
          detail: `Assigned Slot: ${result.slotId} (${result.zone}) for ${plateFormatted}`
        })
        setEntryPlate('')
        setEntryDriver('')
      } else {
        setLastActionMsg({
          type: 'error',
          title: 'Entry Denied',
          detail: result.message
        })
      }

      // Auto close after 3.5s
      setTimeout(() => {
        setGateStatus('closing')
        setTimeout(() => setGateStatus('closed'), 600)
      }, 3500)
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
          title: 'Exit Approved • Gate Opened',
          detail: `Vehicle ${plateFormatted} checked out from Slot ${result.slotId}. Duration: ${result.duration || '45 mins'}. Fee: Campus Covered.`
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
      {/* Animated Barrier Visualizer */}
      <div className="gate-barrier-visualizer glass-card">
        <div className="barrier-header">
          <div className="gate-title-tag">
            <GateIcon className="w-5 h-5 text-cyan" />
            <span>Campus Main Security Boom Barrier</span>
          </div>
          <div className={`gate-status-pill ${gateStatus}`}>
            <span className="gate-led"></span>
            <span>GATE {gateStatus.toUpperCase()}</span>
          </div>
        </div>

        <div className="barrier-stage">
          {/* Road markings */}
          <div className="road-surface">
            <div className="road-line"></div>
            <div className="road-line"></div>
            <div className="road-line"></div>
          </div>

          {/* Boom Barrier Pillar & Arm */}
          <div className="barrier-structure">
            <div className="barrier-pillar">
              <div className={`pillar-light ${gateStatus === 'open' || gateStatus === 'opening' ? 'light-green' : 'light-red'}`}></div>
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
            </div>
          </div>
        )}
      </div>

      {/* Terminal Controls Grid */}
      <div className="gate-terminals-grid">
        {/* Entry Gate Simulator */}
        <div className="terminal-card glass-card">
          <div className="terminal-header">
            <span className="terminal-badge entry">ENTRY TERMINAL #1</span>
            <h4>ANPR Automatic Vehicle Inbound</h4>
          </div>

          <form onSubmit={handleSimulateEntry} className="terminal-form">
            <div className="form-group">
              <label>License Plate Number</label>
              <input
                type="text"
                placeholder="e.g. KA-05-MH-9988"
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
                placeholder="e.g. Samarth Jain"
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
                  <option value="car">🚗 4-Wheeler Car</option>
                  <option value="ev">⚡ EV Charger Slot</option>
                  <option value="bike">🏍️ Two-Wheeler / Bike</option>
                </select>
              </div>

              <div className="form-group">
                <label>Affiliation</label>
                <select
                  value={entryCategory}
                  onChange={(e) => setEntryCategory(e.target.value)}
                  className="form-control"
                >
                  <option value="Student">Student</option>
                  <option value="Faculty">Faculty</option>
                  <option value="Staff">Staff</option>
                  <option value="Visitor">Visitor</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={gateStatus === 'opening' || gateStatus === 'open'}
              className="btn btn-primary w-full gate-btn"
            >
              Simulate Inbound Vehicle Entry
            </button>
          </form>
        </div>

        {/* Exit Gate Simulator */}
        <div className="terminal-card glass-card">
          <div className="terminal-header">
            <span className="terminal-badge exit">EXIT TERMINAL #2</span>
            <h4>Outbound Checkout & Slot Clearance</h4>
          </div>

          <form onSubmit={handleSimulateExit} className="terminal-form">
            <div className="form-group">
              <label>Select Parked Vehicle to Exit</label>
              <select
                value={exitPlate}
                onChange={(e) => setExitPlate(e.target.value)}
                className="form-control"
                required
              >
                <option value="">-- Choose Parked Vehicle --</option>
                {occupiedSlots.map((s) => (
                  <option key={s.id} value={s.plate}>
                    Slot {s.id} : {s.plate} ({s.owner || 'Driver'}) - {s.status.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Or Type Plate Manually</label>
              <input
                type="text"
                placeholder="e.g. KA-05-MB-4412"
                value={exitPlate}
                onChange={(e) => setExitPlate(e.target.value)}
                className="form-control uppercase-input"
              />
            </div>

            <div className="exit-summary-box">
              <div className="info-row">
                <span>Validation Rule:</span>
                <span className="text-emerald">Campus QR / RFID Tag</span>
              </div>
              <div className="info-row">
                <span>Parking Charges:</span>
                <span className="fee-badge">₹0.00 (Institutional Pass)</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={gateStatus === 'opening' || gateStatus === 'open' || !exitPlate}
              className="btn btn-secondary w-full gate-btn exit-btn"
            >
              Simulate Outbound Vehicle Exit
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
