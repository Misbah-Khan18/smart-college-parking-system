import React, { useState } from 'react'
import { XIcon, CarIcon, BikeIcon, EvIcon, QrIcon, CheckIcon } from './Icons'

export default function SlotBookingModal({
  isOpen,
  onClose,
  initialSlot,
  availableSlots,
  onConfirmBooking,
  currentRole
}) {
  const [slotId, setSlotId] = useState(initialSlot ? initialSlot.id : (availableSlots[0]?.id || ''))
  const [vehicleNumber, setVehicleNumber] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [category, setCategory] = useState(currentRole === 'Faculty' ? 'Faculty' : 'Student')
  const [durationHours, setDurationHours] = useState('2')
  const [vehicleType, setVehicleType] = useState(initialSlot?.type || 'car')
  const [errorMsg, setErrorMsg] = useState('')

  if (!isOpen) return null

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!slotId) {
      setErrorMsg('Please select an available parking slot.')
      return
    }
    if (!vehicleNumber.trim()) {
      setErrorMsg('Please enter vehicle registration number.')
      return
    }
    if (!ownerName.trim()) {
      setErrorMsg('Please enter driver / student / faculty name.')
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
            <h3 className="modal-title">Reserve Campus Parking Slot</h3>
          </div>
          <button type="button" className="close-btn" onClick={onClose}>
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="booking-form">
          {errorMsg && <div className="error-banner">{errorMsg}</div>}

          {/* Select Slot */}
          <div className="form-group">
            <label htmlFor="slot-select">Choose Parking Slot</label>
            <select
              id="slot-select"
              value={slotId}
              onChange={(e) => setSlotId(e.target.value)}
              className="form-control"
              required
            >
              {availableSlots.length === 0 ? (
                <option value="">No available slots</option>
              ) : (
                availableSlots.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.id} - {s.zone} ({s.type.toUpperCase()})
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="form-row">
            {/* Owner Name */}
            <div className="form-group">
              <label htmlFor="owner-name">Full Name / ID</label>
              <input
                id="owner-name"
                type="text"
                placeholder="e.g. Aryan Sharma (CS21B04)"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                className="form-control"
                required
              />
            </div>

            {/* Vehicle Number */}
            <div className="form-group">
              <label htmlFor="vehicle-plate">License Plate Number</label>
              <input
                id="vehicle-plate"
                type="text"
                placeholder="e.g. KA-05-AB-1234"
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
              <label htmlFor="user-category">Campus Category</label>
              <select
                id="user-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="form-control"
              >
                <option value="Student">Student (Registered)</option>
                <option value="Faculty">Faculty / Professor</option>
                <option value="Staff">College Staff</option>
                <option value="Visitor">Official Guest / Visitor</option>
              </select>
            </div>

            {/* Vehicle Type */}
            <div className="form-group">
              <label htmlFor="vehicle-type-select">Vehicle Type</label>
              <select
                id="vehicle-type-select"
                value={vehicleType}
                onChange={(e) => setVehicleType(e.target.value)}
                className="form-control"
              >
                <option value="car">🚗 4-Wheeler Car</option>
                <option value="ev">⚡ Electric Vehicle (EV)</option>
                <option value="bike">🏍️ Two-Wheeler / Scooter</option>
              </select>
            </div>
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
              <option value="1">1 Hour (Quick Visit)</option>
              <option value="2">2 Hours (Lecture Period)</option>
              <option value="4">4 Hours (Lab Session / Half Day)</option>
              <option value="8">8 Hours (Full Campus Day)</option>
            </select>
          </div>

          <div className="booking-info-box">
            <div className="info-row">
              <span>Campus Parking Fee:</span>
              <span className="fee-badge">FREE (Institutional Pass)</span>
            </div>
            <div className="info-row">
              <span>Gate Entry Access:</span>
              <span className="text-emerald font-bold">Automatic ANPR / QR Scan</span>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              <CheckIcon className="w-4 h-4" />
              Generate Digital Pass
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
