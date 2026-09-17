import { useState, useMemo } from 'react'
import {
  CheckIcon,
  AlertCircleIcon,
  SearchIcon,
  LogOutIcon,
  QrIcon
} from '../Icons'
import { formatLiveDurationCompact } from '../../utils/timerUtils'
import { auth } from '../../firebase/firebase'
import {
  verifyAndCompleteGateExit,
  EXIT_REASON_CODES
} from '../../services/guardExitService'

export default function VehicleExitView({
  slots = [],
  activeSessions = [],
  onReleaseSlot,
  user = null,
  userProfile = null,
  showToast
}) {
  const [search, setSearch] = useState('')
  const [tokenInput, setTokenInput] = useState('')
  const [scannedPlate, setScannedPlate] = useState('')
  const [selectedSlotId, setSelectedSlotId] = useState('')
  const [gateStatus, setGateStatus] = useState('closed') // 'closed' | 'opening' | 'open' | 'closing'
  const [exitResult, setExitResult] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)

  // Derive currently parked vehicles from live Firestore slots & active sessions
  const parkedVehicles = useMemo(() => {
    // 1. Primary source: occupied bays from Firestore parking_slots
    const occupiedSlots = (slots || []).filter((s) => s.status === 'occupied' && s.plate)

    // 2. Map occupied slots into enriched display records
    const list = occupiedSlots.map((slot) => {
      const session = (activeSessions || []).find(
        (sess) =>
          sess.slotId === slot.id ||
          (sess.vehicleNumber && slot.plate && sess.vehicleNumber.replace(/[^A-Z0-9]/g, '') === slot.plate.replace(/[^A-Z0-9]/g, ''))
      )

      return {
        id: slot.id,
        slotId: slot.id,
        sessionId: session?.id || '',
        reservationId: session?.reservationId || slot.reservationId || slot.passId || '',
        plate: slot.plate || session?.vehicleNumber || 'UNKNOWN',
        owner: slot.owner || session?.studentName || 'Student Member',
        rollNumber: slot.rollNumber || session?.rollNumber || '',
        stream: slot.stream || session?.stream || '',
        type: slot.type || session?.vehicleType || (slot.id.startsWith('G') ? 'scooty' : 'bike'),
        floor: slot.floor || session?.floor || (slot.id.startsWith('G') ? 'Ground Floor' : 'Basement'),
        section: slot.section || session?.section || '',
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

  // Core Egress Checkout Handler
  const handleAuthorizeExit = async ({ slotId = '', plate = '', token = '' } = {}) => {
    if (isProcessing || gateStatus !== 'closed') return

    const targetSlot = slotId || selectedSlotId || ''
    const targetPlate = plate || scannedPlate.trim() || ''
    const targetToken = token || tokenInput.trim() || ''

    if (!targetSlot && !targetPlate && !targetToken) {
      setExitResult({
        approved: false,
        reason: EXIT_REASON_CODES.INVALID_EXIT_STATE,
        message: 'Please select an active parked vehicle or enter a license plate / pass token.'
      })
      return
    }

    setIsProcessing(true)
    setExitResult(null)

    try {
      const currentGuardUid = auth.currentUser ? auth.currentUser.uid : (user?.uid || '')
      const guardDisplayName = userProfile?.displayName || user?.displayName || 'Security Guard'

      const result = await verifyAndCompleteGateExit({
        slotId: targetSlot,
        scannedPlate: targetPlate,
        qrToken: targetToken,
        guardUid: currentGuardUid
      })

      if (result.approved) {
        setExitResult({
          ...result,
          guardName: guardDisplayName
        })
        setSelectedSlotId('')
        setTokenInput('')
        setScannedPlate('')

        // Trigger barrier sequence: closed -> opening -> open (3.5s) -> closing -> closed
        setGateStatus('opening')
        setTimeout(() => {
          setGateStatus('open')
          setTimeout(() => {
            setGateStatus('closing')
            setTimeout(() => {
              setGateStatus('closed')
              setIsProcessing(false)
            }, 600)
          }, 3500)
        }, 500)

        if (showToast) {
          showToast(
            'Vehicle Checked Out',
            `Vehicle ${result.vehicleNumber} checked out from Bay ${result.slotId}. Slot is now available.`,
            'success'
          )
        }
      } else {
        setGateStatus('closed')
        setIsProcessing(false)
        setExitResult({
          ...result,
          guardName: guardDisplayName
        })

        if (showToast) {
          showToast('Exit Denied', result.message || result.reason, 'error')
        }
      }
    } catch (err) {
      console.error('[VehicleExitView] Egress exception:', err)
      setGateStatus('closed')
      setIsProcessing(false)
      setExitResult({
        approved: false,
        reason: EXIT_REASON_CODES.TRANSACTION_FAILED,
        message: err.message || 'An error occurred during gate checkout.'
      })
      if (showToast) {
        showToast('Exit Error', err.message || 'Checkout failed.', 'error')
      }
    }
  }

  // Reset / Next scan
  const handleReset = () => {
    setTokenInput('')
    setScannedPlate('')
    setSelectedSlotId('')
    setExitResult(null)
    setGateStatus('closed')
    setIsProcessing(false)
  }

  return (
    <div className="admin-page-container">
      {/* Header */}
      <div className="page-section-header glass-card">
        <div className="psh-badge">
          <span>🛑 GATE 2 &bull; EGRESS TERMINAL</span>
        </div>
        <h1 className="psh-title">
          Vehicle <span className="gradient-text">Exit &amp; Checkout Terminal</span>
        </h1>
        <p className="psh-subtitle">
          Authoritative real-time security gate checkout scanner. Validates departing vehicles against active Firestore sessions, calculates authoritative parking duration, atomically releases bays (Occupied &rarr; Available), archives departure history, and triggers boom barrier egress.
        </p>
      </div>

      <div className="terminal-grid-two">
        {/* Left: Active Vehicles & Quick Token Checkout */}
        <div className="terminal-form-card glass-card">
          <div className="card-header-clean">
            <div className="flex items-center gap-2">
              <QrIcon className="w-5 h-5 text-cyan" />
              <h3>Active Parked Vehicles ({parkedVehicles.length})</h3>
            </div>
            <span className="telemetry-live-tag">
              <span className="live-dot-pulse"></span>
              <span>GATE 2 ONLINE</span>
            </span>
          </div>

          {/* Quick Scanner Bar for Direct Exit Scan */}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleAuthorizeExit()
            }}
            className="scanner-form mt-3 mb-3 p-3 glass-card"
            style={{ border: '1px solid rgba(56, 189, 248, 0.2)' }}
          >
            <div className="form-group mb-2">
              <label htmlFor="exit-token-input" className="text-xs">
                Scan Pass / Enter Plate or Bay ID:
              </label>
              <div className="input-wrapper">
                <input
                  id="exit-token-input"
                  type="text"
                  placeholder="e.g. MH-12-AB-1234, G-01, or SOC-RES-..."
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  className="font-mono text-xs"
                  disabled={isProcessing}
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="btn btn-primary btn-sm flex-1"
                disabled={isProcessing || (!tokenInput.trim() && !selectedSlotId)}
              >
                {isProcessing ? 'Verifying Checkout...' : '⚡ Authorize Egress & Open Gate'}
              </button>
              {exitResult && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleReset}
                  disabled={isProcessing}
                >
                  🔄 Reset
                </button>
              )}
            </div>
          </form>

          {/* Search Box */}
          <div className="search-box mb-3">
            <SearchIcon className="w-4 h-4 text-muted" />
            <input
              type="text"
              placeholder="Filter by plate, student name, roll number, or bay ID..."
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

          {/* Scrollable Active Parked List */}
          <div className="active-parked-scroll-list">
            {filteredParked.length === 0 ? (
              <div className="empty-state p-4 text-center">
                <p className="text-muted text-sm">
                  {search ? 'No parked vehicle matches your search.' : 'No vehicles currently occupying bays in Firestore.'}
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
                        handleAuthorizeExit({ slotId: item.slotId, plate: item.plate })
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

        {/* Right: Egress Telemetry & Boom Barrier */}
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
            <span className="gate-sign-text">SOCMAC SMART PARK EGRESS</span>
          </div>

          {/* Selected Vehicle Telemetry Preview (before checkout) */}
          {selectedVehicle && !exitResult && (
            <div className="glass-card mt-3 p-3" style={{ border: '1px solid rgba(56, 189, 248, 0.2)' }}>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-muted font-mono uppercase">Selected Vehicle for Departure</span>
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
                  <span className="text-muted block">Type / Floor</span>
                  <span className="text-slate-200">
                    {selectedVehicle.type === 'scooty' ? '🛵 Scooty' : '🏍️ Bike'} &bull; {selectedVehicle.floor}
                  </span>
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
                onClick={() => handleAuthorizeExit({ slotId: selectedVehicle.slotId, plate: selectedVehicle.plate })}
                disabled={isProcessing || gateStatus !== 'closed'}
              >
                <LogOutIcon className="w-4 h-4 mr-1 inline" /> Authorize Egress &amp; Open Gate ↲
              </button>
            </div>
          )}

          {/* Verification / Exit Result Badge */}
          {exitResult && (
            <div className={`verification-badge-card mt-4 ${exitResult.approved ? 'granted' : 'denied'}`}>
              <div className="vbc-header">
                <div className="vbc-icon">
                  {exitResult.approved ? (
                    <CheckIcon className="w-6 h-6 text-emerald" />
                  ) : (
                    <AlertCircleIcon className="w-6 h-6 text-rose" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <h3 className="vbc-title">
                      {exitResult.approved ? '✓ EXIT APPROVED' : '✕ EXIT DENIED'}
                    </h3>
                    {exitResult.reason && (
                      <span className={`text-2xs font-mono px-2 py-0.5 rounded ${exitResult.approved ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
                        {exitResult.reason}
                      </span>
                    )}
                  </div>
                  <p className="vbc-subtitle mt-0.5">
                    {exitResult.message || (exitResult.approved ? 'Vehicle departed. Bay released.' : 'Exit denied.')}
                  </p>
                </div>
              </div>

              {exitResult.approved && (
                <div className="vbc-details-grid font-mono text-xs mt-3">
                  <div><strong>Student:</strong> {exitResult.studentName} {exitResult.rollNumber ? `(${exitResult.rollNumber})` : ''}</div>
                  <div><strong>Vehicle:</strong> {exitResult.vehicleNumber} ({exitResult.vehicleType === 'bike' ? '🏍️ Bike' : '🛵 Scooty'})</div>
                  <div><strong>Released Bay:</strong> <span className="text-cyan font-bold">{exitResult.slotId}</span></div>
                  <div><strong>Floor:</strong> {exitResult.floor}</div>
                  <div><strong>Duration:</strong> <span className="text-emerald font-bold">{exitResult.duration}</span></div>
                  <div><strong>Exit Time:</strong> {exitResult.exitTime}</div>
                  <div><strong>New Status:</strong> <span className="text-emerald font-bold">AVAILABLE</span></div>
                  <div><strong>Authorizing Guard:</strong> {exitResult.guardName || 'Security Admin'}</div>
                </div>
              )}

              <div className="mt-3 pt-2 border-t border-slate-700/50 flex justify-end">
                <button
                  type="button"
                  className="btn btn-primary btn-xs"
                  onClick={handleReset}
                >
                  Scan Next Vehicle &rarr;
                </button>
              </div>
            </div>
          )}

          {!selectedVehicle && !exitResult && (
            <div className="gate-idle-placeholder">
              <span className="idle-icon">📡</span>
              <p>Awaiting vehicle departure selection or exit token scan from security gate sensor...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
