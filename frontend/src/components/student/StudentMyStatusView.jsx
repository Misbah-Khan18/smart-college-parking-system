import { useMemo } from 'react'
import {
  CheckIcon,
  AlertCircleIcon,
  ShieldIcon,
  PlusCircleIcon
} from '../Icons'
import { formatLiveDurationCompact } from '../../utils/timerUtils'
import { getFloorForVehicleType } from '../../services/vehicleService'

export default function StudentMyStatusView({
  user,
  userProfile,
  slots = [],
  onOpenBooking,
  onNavigateTab
}) {
  const displayName = userProfile?.displayName || user?.displayName || 'Alzuni Shaikh'
  const vehiclePlate = userProfile?.defaultPlate || userProfile?.vehicleNumber || 'MH-12-AB-1234'
  const vehicleType = userProfile?.vehicleType || 'scooty'
  const assignedFloor = getFloorForVehicleType(vehicleType)

  // Find if currently occupied in any slot
  const currentSlot = useMemo(() => {
    const cleanPlate = vehiclePlate.replace(/[^A-Z0-9]/g, '').toUpperCase()
    return slots.find(
      (s) => s.status === 'occupied' && s.plate && s.plate.replace(/[^A-Z0-9]/g, '').toUpperCase() === cleanPlate
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
          Real-time occupancy detection. Track your vehicle bay location, arrival timestamp, and campus session details.
        </p>
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
              <span className="msa-label">Assigned Bay</span>
              <strong className="msa-val text-cyan font-mono">{currentSlot.id}</strong>
            </div>

            <div className="msa-item">
              <span className="msa-label">Parking Level</span>
              <strong className="msa-val">{currentSlot.floor}</strong>
            </div>

            <div className="msa-item">
              <span className="msa-label">Department / Section</span>
              <span className="msa-val">{currentSlot.section || 'Student Two-Wheeler Area'}</span>
            </div>

            <div className="msa-item">
              <span className="msa-label">License Plate</span>
              <span className="plate-badge-mono font-mono font-bold">{vehiclePlate}</span>
            </div>

            <div className="msa-item">
              <span className="msa-label">Gate Entry Time</span>
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
              🛡️ Bay monitored by School of Commerce ANPR &amp; IoT sensors.
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
            Vehicle <strong>{vehiclePlate}</strong> is not currently occupying any bay in Ground Floor or Basement. Ready for entry through Gate 1.
          </p>

          <div className="mso-stats-row">
            <div className="mso-stat-item">
              <span className="text-muted text-xs">Designated Level</span>
              <strong className="text-cyan">{assignedFloor}</strong>
            </div>
            <div className="mso-stat-item">
              <span className="text-muted text-xs">Status</span>
              <strong className="text-emerald">Open for Entry</strong>
            </div>
          </div>

          <div className="mso-actions mt-4">
            <button
              type="button"
              className="btn btn-primary btn-md"
              onClick={() => onOpenBooking && onOpenBooking(null, 'slot')}
            >
              <PlusCircleIcon className="w-4 h-4" />
              <span>Reserve a Slot in Advance</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
