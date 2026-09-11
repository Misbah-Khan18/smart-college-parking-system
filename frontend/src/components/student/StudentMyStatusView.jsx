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
  onOpenBooking,
  onViewPass,
  onNavigateTab
}) {
  const displayName = userProfile?.displayName || user?.displayName || 'Student Member'
  const vehiclePlate = userProfile?.defaultPlate || userProfile?.vehicleNumber || 'MH-12-AB-1234'
  const vehicleType = userProfile?.vehicleType || 'scooty'
  const assignedFloor = getFloorForVehicleType(vehicleType)

  // Find if currently occupied in any slot
  const currentSlot = useMemo(() => {
    const cleanPlate = vehiclePlate.replace(/[^A-Z0-9]/g, '').toUpperCase()
    return slots.find(
      (s) => (s.status === 'occupied' || s.status === 'OCCUPIED') && s.plate && s.plate.replace(/[^A-Z0-9]/g, '').toUpperCase() === cleanPlate
    )
  }, [slots, vehiclePlate])

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

      {/* Permit Overview Strip */}
      <div className="glass-card" style={{ padding: '16px 20px', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <ShieldIcon className="w-6 h-6 text-cyan" />
          <div>
            <div style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Active Campus Permit
            </div>
            <strong style={{ fontSize: '15px', color: '#f1f5f9' }}>
              {activePermit ? `${activePermit.permitType || 'Monthly'} Permit (${activePermit.paymentStatus || 'PAID'})` : 'No Active Permit'}
            </strong>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {activePermit ? (
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
              onClick={() => onOpenBooking && onOpenBooking(null, 'permit')}
            >
              💳 Buy Permit
            </button>
          )}
        </div>
      </div>

      {currentSlot ? (
        /* Status: Currently Parked */
        <div className="my-status-active-card glass-card">
          <div className="msa-top">
            <div className="msa-indicator pulse-green">
              <span className="msa-dot"></span>
              <span>VEHICLE CURRENTLY PARKED</span>
            </div>
            <span className="slot-id-pill font-mono large-pill">{currentSlot.id}</span>
          </div>

          <div className="msa-details-grid">
            <div className="msa-item">
              <span className="msa-label">Dynamically Assigned Bay</span>
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
              <span className="plate-badge-mono font-mono font-bold">{vehiclePlate}</span>
            </div>

            <div className="msa-item">
              <span className="msa-label">Gate Ingress Time</span>
              <span className="msa-val font-mono">{currentSlot.entryTime || 'Active Session'}</span>
            </div>

            <div className="msa-item">
              <span className="msa-label">Session Duration</span>
              <span className="msa-val font-mono text-emerald">
                {formatLiveDurationCompact(currentSlot.entryTimestamp)}
              </span>
            </div>
          </div>

          <div className="msa-footer-bar">
            <span className="text-xs text-muted">
              🛡️ Dynamic bay assigned per session. Bay will be released automatically upon Gate exit.
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
            Vehicle <strong>{vehiclePlate}</strong> is not currently occupying any bay. On arrival at Gate 1, scan your permit QR or detect plate to be automatically assigned the nearest available bay on {assignedFloor}.
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
            {activePermit ? (
              <button
                type="button"
                className="btn btn-primary btn-md"
                onClick={() => onViewPass && onViewPass(activePermit)}
              >
                <span>🎫 Show Ingress QR Pass</span>
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-primary btn-md"
                onClick={() => onOpenBooking && onOpenBooking(null, 'permit')}
              >
                <PlusCircleIcon className="w-4 h-4" />
                <span>Purchase Parking Permit</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
