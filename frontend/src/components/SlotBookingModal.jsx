import { useState } from 'react'
import { XIcon, QrIcon, CheckIcon } from './Icons'

export default function SlotBookingModal({
  isOpen,
  onClose,
  initialSlot,
  availableSlots = [],
  onConfirmBooking,
  currentRole = 'Student',
  user,
  userProfile
}) {
  if (!isOpen) return null

  return (
    <SlotBookingContent
      key={initialSlot?.id || 'default-booking'}
      onClose={onClose}
      initialSlot={initialSlot}
      availableSlots={availableSlots}
      onConfirmBooking={onConfirmBooking}
      currentRole={currentRole}
      user={user}
      userProfile={userProfile}
    />
  )
}

function SlotBookingContent({
  onClose,
  initialSlot,
  availableSlots = [],
  onConfirmBooking,
  currentRole,
  user,
  userProfile
}) {
  const defaultSlotId = initialSlot?.id || availableSlots[0]?.id || ''
  const defaultSlot = initialSlot || availableSlots.find((s) => s.id === defaultSlotId)

  const [slotId, setSlotId] = useState(defaultSlotId)
  const [vehicleNumber, setVehicleNumber] = useState(userProfile?.defaultPlate || '')
  const [ownerName, setOwnerName] = useState(userProfile?.displayName || user?.displayName || '')
  const [category, setCategory] = useState(userProfile?.role || (currentRole === 'Faculty' ? 'Faculty' : 'Student'))
  const [durationHours, setDurationHours] = useState('2')
  const [vehicleType, setVehicleType] = useState(defaultSlot?.type || 'bike')
  const [errorMsg, setErrorMsg] = useState('')

  const handleSlotSelect = (selectedId) => {
    setSlotId(selectedId)
    const selected = availableSlots.find((s) => s.id === selectedId)
    if (selected?.type) {
      setVehicleType(selected.type)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!slotId) {
      setErrorMsg('Please select an available parking slot.')
      return
    }
    if (!vehicleNumber.trim()) {
      setErrorMsg('Please enter vehicle registration plate number.')
      return
    }
    if (!ownerName.trim()) {
      setErrorMsg('Please enter student / faculty / driver name.')
      return
    }

    const now = new Date()
    const expTime = new Date(now.getTime() + parseInt(durationHours, 10) * 60 * 60 * 1000)
    const formattedExpiry = expTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

    onConfirmBooking({
      slotId,
      vehicleNumber: vehicleNumber.toUpperCase().trim(),
      ownerName: ownerName.trim(),
      category,
      vehicleType,
      durationHours: parseInt(durationHours, 10),
      reservedUntil: formattedExpiry,
    })

    onClose()
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content glass-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-wrap">
            <QrIcon className="w-5 h-5 text-cyan" />
            <h3 className="modal-title">Reserve Parking Slot</h3>
          </div>
          <button type="button" className="close-btn" onClick={onClose} aria-label="Close booking modal">
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="booking-form">
          {errorMsg && <div className="error-banner">{errorMsg}</div>}

          {/* Select Slot */}
          <div className="form-group">
            <label htmlFor="slot-select">Select Available Slot</label>
            <select
              id="slot-select"
              value={slotId}
              onChange={(e) => handleSlotSelect(e.target.value)}
              className="form-control"
              required
            >
              {availableSlots.length === 0 ? (
                <option value="">No slots currently available</option>
              ) : (
                availableSlots.map((s) => (
                  <option key={s.id} value={s.id}>
                    Slot {s.id} &bull; {s.floor} ({s.section}) [{s.type.toUpperCase()}]
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="form-row">
            {/* Owner Name */}
            <div className="form-group">
              <label htmlFor="owner-name">Full Name</label>
              <input
                id="owner-name"
                type="text"
                placeholder="Driver or Student Name"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                className="form-control"
                required
              />
            </div>

            {/* Vehicle Number */}
            <div className="form-group">
              <label htmlFor="vehicle-plate">Vehicle Plate</label>
              <input
                id="vehicle-plate"
                type="text"
                placeholder="MH-04-AB-1234"
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value)}
                className="form-control uppercase-input"
                required
              />
            </div>
          </div>

          <div className="form-row">
            {/* Category */}
            <div className="form-group">
              <label htmlFor="user-category">Role / Category</label>
              <select
                id="user-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="form-control"
              >
                <option value="Student">Student</option>
                <option value="Faculty">Faculty / Professor</option>
                <option value="Staff">College Staff</option>
                <option value="Security Admin">Security Admin</option>
                <option value="Visitor">Visitor</option>
              </select>
            </div>

            {/* Duration */}
            <div className="form-group">
              <label htmlFor="duration-select">Reservation Duration</label>
              <select
                id="duration-select"
                value={durationHours}
                onChange={(e) => setDurationHours(e.target.value)}
                className="form-control"
              >
                <option value="1">1 Hour</option>
                <option value="2">2 Hours</option>
                <option value="4">4 Hours</option>
                <option value="8">Full Day (8 Hours)</option>
              </select>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              <CheckIcon className="w-4 h-4" />
              Confirm Reservation
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
