import { useMemo } from 'react'
import {
  ShieldIcon,
  PlusCircleIcon
} from '../Icons'
import { formatLiveDurationCompact } from '../../utils/timerUtils'
import { getFloorForVehicleType } from '../../services/vehicleService'

export default function StudentMyStatusView({
  user,
  userProfile,
  slots = [],
  activePermit,
  activeReservation,
  onOpenBooking,
  onViewPass,
  onNavigateTab,
  onCancelReservation
}) {
  const displayName = userProfile?.displayName || user?.displayName || 'Student Member'
  const vehiclePlate = userProfile?.defaultPlate || userProfile?.vehicleNumber || 'MH-12-AB-1234'
  const vehicleType = userProfile?.vehicleType || 'scooty'
  const assignedFloor = getFloorForVehicleType(vehicleType)

  // Find if currently occupied or reserved strictly by authenticated Firebase UID
  const currentSlot = useMemo(() => {
    if (activeReservation && activeReservation.slotId) {
      const found = slots.find((s) => s.id === activeReservation.slotId)
      if (found) return found
      return { ...activeReservation, status: 'reserved' }
    }
    return slots.find(
      (s) => (s.status === 'occupied' || s.status === 'OCCUPIED' || s.status === 'reserved' || s.status === 'RESERVED') && user?.uid && (
        s.reservedBy === user.uid || s.userId === user.uid || s.studentId === user.uid
      )
    )
  }, [slots, activeReservation, user?.uid])

  const isReserved = currentSlot && (currentSlot.status === 'reserved' || currentSlot.status === 'RESERVED')

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

            <div className="msa-item">
              <span className="msa-label">Status</span>
              <span className={`msa-val font-bold ${isReserved ? 'text-amber' : 'text-emerald'}`}>
                {isReserved ? '🟡 Reserved (Pre-booked Pass)' : '🟢 Occupied (Active)'}
              </span>
            </div>
          </div>

          <div className="msa-footer-bar">
            <span className="text-xs text-muted">
              🛡️ {isReserved ? 'Bay is secured exclusively for your vehicle. Scan permit at gate on arrival.' : 'Dynamic bay assigned per session. Bay will be released automatically upon Gate exit.'}
            </span>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => onNavigateTab && onNavigateTab('student-available-parking')}
            >
              View Campus Layout Map &rarr;
            </button>
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
    </div>
  )
}
