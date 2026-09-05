import { useState, useMemo } from 'react'
import {
  CheckIcon,
  AlertCircleIcon,
  SearchIcon,
  LogOutIcon
} from '../Icons'
import { formatLiveDurationCompact } from '../../utils/timerUtils'

export default function VehicleExitView({
  slots = [],
  onReleaseSlot
}) {
  const [search, setSearch] = useState('')
  const [selectedSlotId, setSelectedSlotId] = useState('')
  const [gateStatus, setGateStatus] = useState('closed')
  const [exitLog, setExitLog] = useState(null)

  // Occupied bays currently inside campus
  const parkedVehicles = useMemo(() => {
    return slots.filter((s) => s.status === 'occupied' && s.plate)
  }, [slots])

  const filteredParked = useMemo(() => {
    if (!search.trim()) return parkedVehicles
    const q = search.toLowerCase().trim()
    return parkedVehicles.filter(
      (v) =>
        v.id.toLowerCase().includes(q) ||
        (v.plate && v.plate.toLowerCase().includes(q)) ||
        (v.owner && v.owner.toLowerCase().includes(q)) ||
        (v.rollNumber && v.rollNumber.toLowerCase().includes(q))
    )
  }, [parkedVehicles, search])

  const handleCheckout = (slotId) => {
    const target = slots.find((s) => s.id === slotId)
    if (!target) return

    setGateStatus('opening')
    setTimeout(() => {
      setGateStatus('open')

      const exitRecord = {
        plate: target.plate,
        owner: target.owner,
        rollNumber: target.rollNumber || 'N/A',
        slotId: target.id,
        floor: target.floor,
        entryTime: target.entryTime || 'Earlier Today',
        exitTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }

      if (onReleaseSlot) {
        onReleaseSlot(slotId)
      }

      setExitLog(exitRecord)
      setSelectedSlotId('')

      setTimeout(() => {
        setGateStatus('closing')
        setTimeout(() => setGateStatus('closed'), 600)
      }, 3000)
    }, 600)
  }

  return (
    <div className="admin-page-container">
      {/* Header */}
      <div className="page-section-header glass-card">
        <div className="psh-badge">
          <span>🛑 GATE 2 EGRESS TERMINAL</span>
        </div>
        <h1 className="psh-title">
          Vehicle <span className="gradient-text">Exit &amp; Checkout</span>
        </h1>
        <p className="psh-subtitle">
          Process departing vehicles, compute parking sessions, clear occupied bays back to available status, and log departures.
        </p>
      </div>

      <div className="terminal-grid-two">
        {/* Left: Search & Select Active Vehicle */}
        <div className="terminal-form-card glass-card">
          <div className="card-header-clean">
            <h3>Active Parked Vehicles ({parkedVehicles.length})</h3>
            <span className="text-muted text-xs">Select vehicle to authorize departure</span>
          </div>

          <div className="search-box mb-3">
            <SearchIcon className="w-4 h-4 text-muted" />
            <input
              type="text"
              placeholder="Search by plate, student name, or bay ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="search-input"
            />
          </div>

          <div className="active-parked-scroll-list">
            {filteredParked.length === 0 ? (
              <div className="empty-state p-4 text-center">
                <p className="text-muted text-sm">
                  {search ? 'No parked vehicle matches your search.' : 'No vehicles currently occupying bays.'}
                </p>
              </div>
            ) : (
              filteredParked.map((slot) => (
                <div
                  key={slot.id}
                  className={`parked-select-item glass-card ${selectedSlotId === slot.id ? 'active' : ''}`}
                  onClick={() => setSelectedSlotId(slot.id)}
                >
                  <div className="psi-left">
                    <span className="slot-id-pill font-mono">{slot.id}</span>
                    <div>
                      <strong className="text-sm block">{slot.owner || 'Student Member'}</strong>
                      <span className="text-xs text-muted font-mono">{slot.plate} &bull; {slot.floor}</span>
                    </div>
                  </div>
                  <div className="psi-right">
                    <span className="text-xs text-cyan font-mono">
                      {formatLiveDurationCompact(slot.entryTimestamp)}
                    </span>
                    <button
                      type="button"
                      className="btn btn-rose btn-xs"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleCheckout(slot.id)
                      }}
                      disabled={gateStatus !== 'closed'}
                    >
                      Exit Gate ↲
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: Gate Status & Checkout Confirmation */}
        <div className="gate-barrier-card glass-card">
          <div className="card-header-clean">
            <h3>Egress Barrier Telemetry</h3>
            <span className={`status-pill ${gateStatus === 'open' ? 'available' : gateStatus === 'closed' ? 'reserved' : 'occupied'}`}>
              Gate: {gateStatus.toUpperCase()}
            </span>
          </div>

          <div className="gate-barrier-stage">
            <div className={`barrier-arm ${gateStatus}`}></div>
            <div className="barrier-light-box">
              <div className={`barrier-light ${gateStatus === 'open' ? 'green' : 'red'}`}></div>
            </div>
            <span className="gate-sign-text">SCHOOL OF COMMERCE EGRESS</span>
          </div>

          {exitLog && (
            <div className="auth-alert success mt-4">
              <CheckIcon className="w-5 h-5 flex-shrink-0" />
              <div>
                <strong>Vehicle Departed Successfully</strong>
                <p className="text-xs mt-1 mb-0">
                  Vehicle <strong>{exitLog.plate}</strong> ({exitLog.owner}) cleared from <strong>Bay {exitLog.slotId}</strong> ({exitLog.floor}). Slot is now open for parking.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
