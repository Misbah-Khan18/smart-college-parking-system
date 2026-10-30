import { useState, useMemo } from 'react'
import {
  ShieldIcon,
  PlusCircleIcon,
  LogOutIcon,
  XIcon
} from '../Icons'
import { formatLiveDurationCompact } from '../../utils/timerUtils'
import { getFloorForVehicleType } from '../../services/vehicleService'

export default function StudentMyStatusView({
  user,
  userProfile,
  slots = [],
  activeSessions = [],
  activePermit,
  activeReservation,
  onOpenBooking,
  onViewPass,
  onNavigateTab,
  onCancelReservation,
  onEndParkingSession
}) {
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [isEndingParking, setIsEndingParking] = useState(false)

  const displayName = userProfile?.displayName || user?.displayName || 'Student Member'
  const vehiclePlate = userProfile?.defaultPlate || userProfile?.vehicleNumber || 'MH-12-AB-1234'
  const vehicleType = userProfile?.vehicleType || 'scooty'
  const assignedFloor = getFloorForVehicleType(vehicleType)

  // Find if currently occupied or reserved strictly by authenticated Firebase UID
  const currentSlot = useMemo(() => {
    const currentUid = user?.uid || userProfile?.uid || ''
    const myRoll = (userProfile?.campusId || userProfile?.rollNumber || '').toUpperCase().trim()
    const myPlate = (userProfile?.defaultPlate || userProfile?.vehicleNumber || '').replace(/[^A-Z0-9]/g, '').toUpperCase()

    // Check activeSessions first for occupied state
    const activeSess = (activeSessions || []).find((s) => {
      if (s.status && s.status !== 'active') return false
      const sUid = s.studentId || s.userId || ''
      if (currentUid && sUid && sUid === currentUid) return true
      const sRoll = (s.rollNumber || '').toUpperCase().trim()
      if (myRoll && sRoll && sRoll === myRoll) return true
      const sPlate = (s.vehicleNumber || s.plate || '').replace(/[^A-Z0-9]/g, '').toUpperCase()
      if (myPlate && sPlate && sPlate === myPlate) return true
      return false
    })

    if (activeSess) {
      const found = slots.find((s) => s.id === activeSess.slotId)
      return {
        ...found,
        ...activeSess,
        id: activeSess.slotId,
        slotId: activeSess.slotId,
        plate: activeSess.vehicleNumber || found?.plate || vehiclePlate,
        status: 'occupied',
        entryTime: activeSess.entryTime || found?.entryTime || 'Active Session',
        entryTimestamp: activeSess.entryTimestamp || found?.entryTimestamp || 0
      }
    }

    if (activeReservation && activeReservation.slotId) {
      const found = slots.find((s) => s.id === activeReservation.slotId)
      if (found) return found
      return { ...activeReservation, status: 'reserved' }
    }

    return slots.find(
      (s) => (s.status === 'occupied' || s.status === 'OCCUPIED' || s.status === 'reserved' || s.status === 'RESERVED') && currentUid && (
        s.reservedBy === currentUid || s.userId === currentUid || s.studentId === currentUid
      )
    )
  }, [slots, activeSessions, activeReservation, user, userProfile, vehiclePlate])

  const isReserved = currentSlot && (currentSlot.status === 'reserved' || currentSlot.status === 'RESERVED')

  const handleConfirmExit = async () => {
    if (!currentSlot || isEndingParking) return
    setIsEndingParking(true)
    try {
      if (onEndParkingSession) {
        await onEndParkingSession(currentSlot)
      }
      setShowConfirmModal(false)
    } catch (err) {
      console.error('[StudentMyStatusView] End parking error:', err)
    } finally {
      setIsEndingParking(false)
    }
  }

  return (
    <div className="student-page-container">
      {/* Header */}
      <div className="page-section-header glass-card">
        <div className="psh-badge">
          <span>📍 LIVE VEHICLE TELEMETRY</span>
        </div>
        <h1 className="psh-title">
          My <span className="gradient-text">Parking Status</span>
        </h1>
        <p className="psh-subtitle">
          Member: <strong>{displayName}</strong> &bull; Real-time dynamic bay telemetry &amp; permit verification. Track your active permit validity, assigned bay, and gate ingress status.
        </p>
      </div>

      {/* Permit / Reservation Overview Strip */}
      <div className="glass-card" style={{ padding: '16px 20px', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <ShieldIcon className="w-6 h-6 text-cyan" />
          <div>
            <div style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Active Campus Pass / Permit
            </div>
            <strong style={{ fontSize: '15px', color: '#f1f5f9' }}>
              {isReserved
                ? `Reserved Bay ${currentSlot.id} (${currentSlot.floor})`
                : activePermit
                ? `${activePermit.permitType || 'Monthly'} Permit (${activePermit.paymentStatus || 'PAID'})`
                : 'No Active Permit / Reservation'}
            </strong>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {isReserved ? (
            <>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => onViewPass && onViewPass({
                  id: currentSlot.passId || `SOC-${currentSlot.id}`,
                  slotId: currentSlot.id,
                  plate: currentSlot.plate || vehiclePlate,
                  owner: displayName,
                  userName: displayName,
                  floor: currentSlot.floor,
                  section: currentSlot.section,
                  zone: currentSlot.zone || `${currentSlot.floor} - ${currentSlot.section || 'General'}`,
                  passType: currentSlot.passType || 'Parking Pass',
                  permitType: currentSlot.passType || 'Parking Pass',
                  status: 'ACTIVE',
                  reservationStatus: 'Reserved',
                  entryTime: currentSlot.entryTime || 'Active',
                  validUntil: currentSlot.reservedUntil || 'Active Session',
                  reservedUntil: currentSlot.reservedUntil || 'Active Session'
                })}
              >
                🎫 View Ingress QR
              </button>
              <button
                type="button"
                className="btn btn-sm"
                style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)', color: '#fca5a5' }}
                onClick={() => onCancelReservation && onCancelReservation(currentSlot)}
              >
                Release Bay
              </button>
            </>
          ) : activePermit ? (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => onViewPass && onViewPass(activePermit)}
            >
              🎫 View Permit QR
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => onNavigateTab ? onNavigateTab('student-available-parking') : onOpenBooking && onOpenBooking(null, 'slot')}
            >
              💳 Reserve a Bay
            </button>
          )}
        </div>
      </div>

      {currentSlot ? (
        /* Status: Currently Parked or Reserved */
        <div className="my-status-active-card glass-card" style={{
          border: isReserved ? '1px solid rgba(245, 158, 11, 0.4)' : undefined
        }}>
          <div className="msa-top">
            <div className={`msa-indicator ${isReserved ? 'pulse-amber' : 'pulse-green'}`} style={{
              background: isReserved ? 'rgba(245, 158, 11, 0.15)' : undefined,
              color: isReserved ? '#fbbf24' : undefined,
              borderColor: isReserved ? 'rgba(245, 158, 11, 0.4)' : undefined
            }}>
              <span className="msa-dot" style={{ background: isReserved ? '#f59e0b' : undefined }}></span>
              <span>{isReserved ? 'BAY CURRENTLY RESERVED' : 'VEHICLE CURRENTLY PARKED'}</span>
            </div>
            <span className="slot-id-pill font-mono large-pill">{currentSlot.id}</span>
          </div>

          <div className="msa-details-grid">
            <div className="msa-item">
              <span className="msa-label">{isReserved ? 'Reserved Bay ID' : 'Dynamically Assigned Bay'}</span>
              <strong className="msa-val text-cyan font-mono">{currentSlot.id}</strong>
            </div>

            <div className="msa-item">
              <span className="msa-label">Parking Level</span>
              <strong className="msa-val">{currentSlot.floor}</strong>
            </div>

            <div className="msa-item">
              <span className="msa-label">Department / Section</span>
              <span className="msa-val">{currentSlot.section || 'Student Area'}</span>
            </div>

            <div className="msa-item">
              <span className="msa-label">License Plate</span>
              <span className="plate-badge-mono font-mono font-bold">{currentSlot.plate || vehiclePlate}</span>
            </div>

            <div className="msa-item">
              <span className="msa-label">Reservation / Entry Time</span>
              <span className="msa-val font-mono">{currentSlot.entryTime || 'Active Session'}</span>
            </div>

            {currentSlot.entryTimestamp && (
              <div className="msa-item">
                <span className="msa-label">Live Elapsed Duration</span>
                <span className="msa-val font-mono font-bold" style={{ color: '#38bdf8' }}>
                  ⏱️ {formatLiveDurationCompact(currentSlot.entryTimestamp)}
                </span>
              </div>
            )}

            <div className="msa-item">
              <span className="msa-label">Status</span>
              <span className={`msa-val font-bold ${isReserved ? 'text-amber' : 'text-emerald'}`}>
                {isReserved ? '🟡 Reserved (Pre-booked Pass)' : '🟢 Occupied (Active)'}
              </span>
            </div>
          </div>

          <div className="msa-footer-bar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
            <span className="text-xs text-muted" style={{ flex: 1, minWidth: '220px' }}>
              🛡️ {isReserved ? 'Bay is secured exclusively for your vehicle. Scan permit at gate on arrival.' : 'You have an active parking session. When leaving college, release your slot below.'}
            </span>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {!isReserved && (
                <button
                  type="button"
                  className="btn btn-sm"
                  style={{
                    background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.18), rgba(185, 28, 28, 0.28))',
                    border: '1px solid rgba(239, 68, 68, 0.45)',
                    color: '#fecaca',
                    fontWeight: 600
                  }}
                  onClick={() => setShowConfirmModal(true)}
                  disabled={isEndingParking}
                >
                  <LogOutIcon className="w-4 h-4 mr-1 inline" />
                  End Parking &amp; Release Slot
                </button>
              )}
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => onNavigateTab && onNavigateTab('student-available-parking')}
              >
                View Campus Map &rarr;
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Status: Not Parked / Outside Campus */
        <div className="my-status-outside-card glass-card">
          <div className="mso-icon-box">
            <span className="mso-emoji">🛵</span>
          </div>
          <h3>Vehicle is Outside Campus</h3>
          <p className="text-muted max-w-md">
            Vehicle <strong>{vehiclePlate}</strong> is not currently occupying or reserving any bay. Select an open bay from Available Parking or scan your pass upon Gate 1 arrival.
          </p>

          <div className="mso-stats-row">
            <div className="mso-stat-item">
              <span className="text-muted text-xs">Compatible Level</span>
              <strong className="text-cyan">{assignedFloor}</strong>
            </div>
            <div className="mso-stat-item">
              <span className="text-muted text-xs">Gate Telemetry</span>
              <strong className="text-emerald">Ready for Ingress</strong>
            </div>
          </div>

          <div className="mso-actions mt-4" style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              className="btn btn-primary btn-md"
              onClick={() => onNavigateTab ? onNavigateTab('student-available-parking') : onOpenBooking && onOpenBooking(null, 'slot')}
            >
              <PlusCircleIcon className="w-4 h-4" />
              <span>Select &amp; Reserve Parking Bay</span>
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Dialog for Ending Parking */}
      {showConfirmModal && (
        <div
          className="modal-backdrop confirmation-backdrop"
          onClick={() => !isEndingParking && setShowConfirmModal(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="confirmation-modal-card glass-card"
            style={{ maxWidth: '440px', textAlign: 'center' }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="confirm-close-btn"
              onClick={() => !isEndingParking && setShowConfirmModal(false)}
              disabled={isEndingParking}
              aria-label="Cancel"
            >
              <XIcon className="w-4 h-4" />
            </button>

            <div className="confirm-icon-wrapper" style={{ background: 'rgba(239, 68, 68, 0.12)', borderColor: 'rgba(239, 68, 68, 0.35)', margin: '0 auto 16px' }}>
              <LogOutIcon className="w-7 h-7 text-rose" />
            </div>

            <h3 className="confirm-title" style={{ color: '#f8fafc', letterSpacing: '0.5px', marginBottom: '8px' }}>
              End Parking?
            </h3>

            <p style={{ margin: '0 0 18px', fontSize: '13.5px', color: '#cbd5e1', lineHeight: '1.5' }}>
              Your parking session will be completed and this parking slot will become available for other students.
            </p>

            {currentSlot && (
              <div
                style={{
                  background: 'rgba(15, 23, 42, 0.65)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '10px',
                  padding: '12px 16px',
                  marginBottom: '20px',
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '10px',
                  fontSize: '12.5px',
                  textAlign: 'left'
                }}
              >
                <div>
                  <span style={{ color: '#94a3b8', display: 'block', fontSize: '11px', textTransform: 'uppercase' }}>Parking Slot</span>
                  <strong style={{ color: '#38bdf8', fontFamily: 'monospace', fontSize: '14px' }}>{currentSlot.id}</strong>
                </div>
                <div>
                  <span style={{ color: '#94a3b8', display: 'block', fontSize: '11px', textTransform: 'uppercase' }}>Vehicle</span>
                  <strong style={{ color: '#f1f5f9', fontFamily: 'monospace', fontSize: '13px' }}>{currentSlot.plate || vehiclePlate}</strong>
                </div>
                <div>
                  <span style={{ color: '#94a3b8', display: 'block', fontSize: '11px', textTransform: 'uppercase' }}>Floor</span>
                  <span style={{ color: '#cbd5e1' }}>{currentSlot.floor}</span>
                </div>
                <div>
                  <span style={{ color: '#94a3b8', display: 'block', fontSize: '11px', textTransform: 'uppercase' }}>Entry Time</span>
                  <span style={{ color: '#cbd5e1', fontFamily: 'monospace' }}>{currentSlot.entryTime}</span>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', width: '100%' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ flex: 1, padding: '9px 16px' }}
                onClick={() => setShowConfirmModal(false)}
                disabled={isEndingParking}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-sm"
                style={{
                  flex: 1,
                  padding: '9px 16px',
                  background: 'linear-gradient(135deg, #e11d48, #be123c)',
                  color: '#ffffff',
                  border: '1px solid rgba(244, 63, 94, 0.4)',
                  boxShadow: '0 4px 14px rgba(225, 29, 72, 0.35)',
                  fontWeight: 600
                }}
                onClick={handleConfirmExit}
                disabled={isEndingParking}
              >
                {isEndingParking ? 'Releasing Bay...' : 'Confirm Exit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
