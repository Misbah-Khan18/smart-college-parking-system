import {
  XIcon,
  AlertCircleIcon,
  ShieldIcon
} from '../Icons'
import { isVehicleCurrentlyParked } from '../../services/vehicleService'

export default function DeleteConfirmModal({
  isOpen,
  vehicle,
  slots = [],
  onConfirmDelete,
  onClose
}) {
  if (!isOpen || !vehicle) return null

  // Check if this vehicle is currently occupying any parking bay
  const parkedSlot = isVehicleCurrentlyParked(vehicle.vehicleNumber, slots)
  const isParked = Boolean(parkedSlot)

  const handleDelete = () => {
    if (isParked) return
    if (onConfirmDelete) {
      onConfirmDelete(vehicle.id)
    }
    onClose()
  }

  return (
    <div className="modal-backdrop active" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="modal-box glass-card delete-confirm-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <div className="modal-header-text">
            <h3 className="modal-title text-rose">
              {isParked ? 'Cannot Remove Registration' : 'Confirm Removal'}
            </h3>
            <span className="modal-subtitle">
              {isParked
                ? 'Active parking session detected'
                : 'Remove student & vehicle from campus registration'}
            </span>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close delete modal"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="delete-modal-body">
          {/* Target Vehicle Preview Card */}
          <div className="target-vehicle-preview glass-card">
            <div className="tv-header">
              <span className="tv-name">{vehicle.studentName}</span>
              <span className="tv-roll font-mono">{vehicle.rollNumber}</span>
            </div>
            <div className="tv-details">
              <span className="plate-badge-mono font-mono">{vehicle.vehicleNumber}</span>
              <span className="tv-type">
                {vehicle.vehicleType === 'scooty' ? '🛵 Scooty' : '🏍️ Bike'}
              </span>
              <span className="tv-stream">{vehicle.stream}</span>
            </div>
          </div>

          {/* Parked Warning Notice or Normal Confirmation Message */}
          {isParked ? (
            <div className="parked-block-warning glass-card">
              <div className="pb-icon-box">
                <AlertCircleIcon className="w-6 h-6 text-rose" />
              </div>
              <div className="pb-text">
                <strong className="text-rose">
                  This vehicle is currently parked and cannot be removed from registration.
                </strong>
                <p className="pb-sub">
                  Occupying <strong>Bay {parkedSlot.id}</strong> ({parkedSlot.floor}).
                  The admin must check out / exit the vehicle from the parking layout before deleting its registration.
                </p>
              </div>
            </div>
          ) : (
            <div className="delete-prompt-box">
              <div className="dp-icon-box">
                <ShieldIcon className="w-5 h-5 text-amber" />
              </div>
              <p className="delete-prompt-text">
                Are you sure you want to remove this vehicle registration? This student will no longer be able to park under registered campus privileges.
              </p>
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="modal-actions-bar">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
          >
            {isParked ? 'Close' : 'Cancel'}
          </button>

          {!isParked && (
            <button
              type="button"
              className="btn btn-rose"
              onClick={handleDelete}
            >
              <span>Yes, Remove Registration</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
