import { XIcon } from './Icons'

export default function ConfirmationModal({ confirmation, onViewReservation, onClose }) {
  if (!confirmation) return null

  const {
    slotId = 'A-01',
    floor = 'Ground Floor',
    passType = 'Hourly Slot',
    dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }),
    vehicleNumber = ''
  } = confirmation

  const isMonthly = passType === 'Monthly Pass'

  return (
    <div className="modal-backdrop confirmation-backdrop" onClick={onClose}>
      <div
        className="confirmation-modal-card glass-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Top Close Button */}
        <button
          type="button"
          className="confirm-close-btn"
          onClick={onClose}
          aria-label="Close confirmation"
        >
          <XIcon className="w-4 h-4" />
        </button>

        {/* Checkmark Animation */}
        <div className="confirm-icon-wrapper">
          <svg className="confirm-checkmark-svg" viewBox="0 0 52 52">
            <circle
              className="confirm-circle"
              cx="26"
              cy="26"
              r="23"
              fill="none"
            />
            <path
              className="confirm-check"
              fill="none"
              d="M14.1 27.2l7.1 7.2 16.7-16.8"
            />
          </svg>
        </div>

        {/* Title */}
        <h3 className="confirm-title">
          {isMonthly ? 'MONTHLY PASS CONFIRMED' : 'SLOT RESERVED'}
        </h3>

        {/* Slot Bay ID */}
        <div className="confirm-slot-hero">
          <span className="confirm-slot-id font-mono">{slotId}</span>
          {vehicleNumber && (
            <span className="confirm-plate-badge font-mono">{vehicleNumber}</span>
          )}
        </div>

        {/* Floor & Details */}
        <div className="confirm-meta-details">
          <div className="confirm-floor-text">
            <span>{floor}</span>
          </div>

          <div className="confirm-datetime-block">
            <span className="confirm-date">{dateStr}</span>
            <span className="confirm-time">{timeStr}</span>
          </div>
        </div>

        {/* Divider */}
        <div className="confirm-divider"></div>

        {/* Actions */}
        <div className="confirm-actions">
          <button
            type="button"
            className="btn-view-reservation"
            onClick={() => {
              if (onViewReservation) {
                onViewReservation()
              }
            }}
          >
            <span>View Reservation</span>
            <span className="arrow-icon">&rarr;</span>
          </button>
          
          <button
            type="button"
            className="btn-confirm-dismiss"
            onClick={onClose}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
