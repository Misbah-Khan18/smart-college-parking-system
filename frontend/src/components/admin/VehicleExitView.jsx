import { useState, useMemo } from 'react'
import {
  CheckIcon,
  SearchIcon
} from '../Icons'
import { formatLiveDurationCompact } from '../../utils/timerUtils'

export default function VehicleExitView({
  slots = [],
  activeSessions = [],
  onReleaseSlot
}) {
  const [search, setSearch] = useState('')
  const [selectedSlotId, setSelectedSlotId] = useState('')
  const [gateStatus, setGateStatus] = useState('closed')
  const [exitLog, setExitLog] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  // Derive currently parked vehicles from live Firestore slots & active sessions
  const parkedVehicles = useMemo(() => {
    // 1. Primary source: occupied bays from Firestore parking_slots
    const occupiedSlots = (slots || []).filter((s) => s.status === 'occupied' && s.plate)

    // 2. Map occupied slots into enriched display records
    const list = occupiedSlots.map((slot) => {
      // Find matching active session if available for extra telemetry
      const session = (activeSessions || []).find(
        (sess) =>
          sess.slotId === slot.id ||
          (sess.vehicleNumber && slot.plate && sess.vehicleNumber.replace(/[^A-Z0-9]/g, '') === slot.plate.replace(/[^A-Z0-9]/g, ''))
      )

      return {
        id: slot.id,
        slotId: slot.id,
        plate: slot.plate || session?.vehicleNumber || 'UNKNOWN',
        owner: slot.owner || session?.studentName || 'Student Member',
        rollNumber: slot.rollNumber || session?.rollNumber || '',
        stream: slot.stream || session?.stream || '',
        type: slot.type || session?.vehicleType || (slot.id.startsWith('G') ? 'scooty' : 'bike'),
        floor: slot.floor || session?.floor || (slot.id.startsWith('G') ? 'Ground Floor' : 'Basement'),
        entryTime: slot.entryTime || session?.entryTime || 'Earlier Today',
        entryTimestamp: slot.entryTimestamp || session?.entryTimestamp || Date.now()
      }
    })

    return list
  }, [slots, activeSessions])

  const filteredParked = useMemo(() => {
    if (!search.trim()) return parkedVehicles
    const q = search.toLowerCase().trim()
    return parkedVehicles.filter(
      (v) =>
        v.slotId.toLowerCase().includes(q) ||
        (v.plate && v.plate.toLowerCase().includes(q)) ||
        (v.owner && v.owner.toLowerCase().includes(q)) ||
        (v.rollNumber && v.rollNumber.toLowerCase().includes(q)) ||
        (v.floor && v.floor.toLowerCase().includes(q))
    )
  }, [parkedVehicles, search])

  const selectedVehicle = useMemo(() => {
    if (!selectedSlotId) return null
    return parkedVehicles.find((v) => v.slotId === selectedSlotId) || null
  }, [parkedVehicles, selectedSlotId])

  const handleCheckout = async (slotId, vehiclePlate = null) => {
    if (isProcessing || gateStatus !== 'closed') return

    const target = parkedVehicles.find((v) => v.slotId === slotId)
    if (!target && !slotId && !vehiclePlate) {
      setErrorMsg('Vehicle is not currently parked.')
      return
    }

    setIsProcessing(true)
    setErrorMsg('')
    setExitLog(null)
    setGateStatus('opening')

    try {
      // Simulate gate barrier opening sequence
      await new Promise((resolve) => setTimeout(resolve, 500))
      setGateStatus('open')

      let checkoutResult = null
      if (onReleaseSlot) {
        checkoutResult = await onReleaseSlot(slotId, vehiclePlate || target?.plate)
      }

      const exitRecord = {
        plate: checkoutResult?.vehicleNumber || target?.plate || vehiclePlate || 'N/A',
        owner: checkoutResult?.studentName || target?.owner || 'Student Member',
        rollNumber: checkoutResult?.rollNumber || target?.rollNumber || 'N/A',
        slotId: checkoutResult?.slotId || slotId,
        floor: checkoutResult?.floor || target?.floor || 'Campus Level',
        duration: checkoutResult?.duration || '15 min',
        entryTime: checkoutResult?.entryTime || target?.entryTime || 'Earlier Today',
        exitTime: checkoutResult?.exitTime || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
      }

      setExitLog(exitRecord)
      setSelectedSlotId('')

      // Hold barrier open for 3 seconds, then close automatically
      setTimeout(() => {
        setGateStatus('closing')
        setTimeout(() => {
          setGateStatus('closed')
          setIsProcessing(false)
        }, 600)
      }, 3000)
    } catch (err) {
      console.error('[VehicleExitView] Checkout error:', err)
      setGateStatus('closed')
      setIsProcessing(false)
      setErrorMsg(err.message || 'Vehicle is not currently parked or checkout failed.')
    }
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
          Process departing vehicles, compute authoritative parking duration, clear occupied bays back to available status, and archive departure history.
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
              placeholder="Search by plate, student name, roll number, or bay ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="search-input"
            />
            {search && (
              <button
                type="button"
                className="search-clear-btn"
                onClick={() => setSearch('')}
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          <div className="active-parked-scroll-list">
            {filteredParked.length === 0 ? (
              <div className="empty-state p-4 text-center">
                <p className="text-muted text-sm">
                  {search ? 'No parked vehicle matches your search.' : 'No vehicles currently occupying bays.'}
                </p>
              </div>
            ) : (
              filteredParked.map((item) => (
                <div
                  key={item.slotId}
                  className={`parked-select-item glass-card ${selectedSlotId === item.slotId ? 'active' : ''}`}
                  onClick={() => setSelectedSlotId(item.slotId)}
                >
                  <div className="psi-left">
                    <span className="slot-id-pill font-mono">{item.slotId}</span>
                    <div>
                      <strong className="text-sm block">{item.owner || 'Student Member'}</strong>
                      <span className="text-xs text-muted font-mono">
                        {item.plate} &bull; {item.type === 'scooty' ? '🛵 Scooty' : '🏍️ Bike'} &bull; {item.floor}
                        {item.rollNumber ? ` &bull; ${item.rollNumber}` : ''}
                      </span>
                      <span className="text-xs text-muted block mt-0.5">
                        Entered: {item.entryTime}
                      </span>
                    </div>
                  </div>
                  <div className="psi-right">
                    <span className="text-xs text-cyan font-mono" title="Live parking duration">
                      {formatLiveDurationCompact(item.entryTimestamp)}
                    </span>
                    <button
                      type="button"
                      className="btn btn-rose btn-xs"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleCheckout(item.slotId, item.plate)
                      }}
                      disabled={isProcessing || gateStatus !== 'closed'}
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

          {/* Selected Vehicle Telemetry Preview */}
          {selectedVehicle && !exitLog && !errorMsg && (
            <div className="glass-card mt-3 p-3" style={{ border: '1px solid rgba(56, 189, 248, 0.2)' }}>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-muted font-mono uppercase">Selected Vehicle Departure</span>
                <span className="slot-id-pill font-mono">{selectedVehicle.slotId}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-muted block">Student Name</span>
                  <strong className="text-slate-100">{selectedVehicle.owner}</strong>
                </div>
                <div>
                  <span className="text-muted block">Vehicle Plate</span>
                  <strong className="text-cyan font-mono">{selectedVehicle.plate}</strong>
                </div>
                <div>
                  <span className="text-muted block">Vehicle Type / Floor</span>
                  <span className="text-slate-200">{selectedVehicle.type === 'scooty' ? '🛵 Scooty' : '🏍️ Bike'} &bull; {selectedVehicle.floor}</span>
                </div>
                <div>
                  <span className="text-muted block">Current Duration</span>
                  <span className="text-emerald font-mono font-bold">
                    {formatLiveDurationCompact(selectedVehicle.entryTimestamp)}
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="btn btn-rose btn-sm w-full mt-3"
                onClick={() => handleCheckout(selectedVehicle.slotId, selectedVehicle.plate)}
                disabled={isProcessing || gateStatus !== 'closed'}
              >
                <LogOutIcon className="w-4 h-4 mr-1 inline" /> Authorize Egress &amp; Open Gate ↲
              </button>
            </div>
          )}

          {/* Error Alert */}
          {errorMsg && (
            <div className="auth-alert error mt-4">
              <AlertCircleIcon className="w-5 h-5 flex-shrink-0" />
              <div>
                <strong>Exit Denied</strong>
                <p className="text-xs mt-1 mb-0">{errorMsg}</p>
              </div>
            </div>
          )}

          {/* Success Departure Log */}
          {exitLog && (
            <div className="auth-alert success mt-4">
              <CheckIcon className="w-5 h-5 flex-shrink-0" />
              <div>
                <strong>Vehicle Departed Successfully</strong>
                <p className="text-xs mt-1 mb-0">
                  Vehicle <strong>{exitLog.plate}</strong> ({exitLog.owner} {exitLog.rollNumber ? `• ${exitLog.rollNumber}` : ''}) cleared from <strong>Bay {exitLog.slotId}</strong> ({exitLog.floor}). Duration: <strong>{exitLog.duration}</strong>. Slot is now available for new parking.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
