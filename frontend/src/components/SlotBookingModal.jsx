import { useState } from 'react'
import { XIcon, QrIcon, CheckIcon } from './Icons'

export default function SlotBookingModal({
  isOpen,
  onClose,
  initialSlot,
  availableSlots = [],
  registeredVehicles = [],
  prefilledData = null,
  onConfirmBooking,
  currentRole = 'Student',
  user,
  userProfile
}) {
  if (!isOpen) return null

  return (
    <SlotBookingContent
      key={initialSlot?.id || prefilledData?.vehicleNumber || 'default-booking'}
      onClose={onClose}
      initialSlot={initialSlot}
      availableSlots={availableSlots}
      registeredVehicles={registeredVehicles}
      prefilledData={prefilledData}
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
  registeredVehicles = [],
  prefilledData = null,
  onConfirmBooking,
  currentRole,
  user,
  userProfile
}) {
  const defaultSlotId = initialSlot?.id || availableSlots[0]?.id || ''
  const defaultSlot = initialSlot || availableSlots.find((s) => s.id === defaultSlotId)

  const [slotId, setSlotId] = useState(defaultSlotId)
  const [vehicleNumber, setVehicleNumber] = useState(
    prefilledData?.vehicleNumber || userProfile?.defaultPlate || ''
  )
  const [ownerName, setOwnerName] = useState(
    prefilledData?.ownerName || userProfile?.displayName || user?.displayName || ''
  )
  const [category, setCategory] = useState(
    prefilledData?.category || userProfile?.role || (currentRole === 'Faculty' ? 'Faculty' : 'Student')
  )
  const [durationHours, setDurationHours] = useState('2')
  const [vehicleType, setVehicleType] = useState(
    prefilledData?.vehicleType || defaultSlot?.type || 'scooty'
  )
  const [errorMsg, setErrorMsg] = useState('')

  const handleSelectRegistered = (regId) => {
    if (!regId) return
    const found = registeredVehicles.find((v) => v.id === regId)
    if (found) {
      setOwnerName(found.studentName)
      setVehicleNumber(found.vehicleNumber)
      setVehicleType(found.vehicleType || 'scooty')
      setCategory(found.category || 'Student')

      // Auto pick suitable slot
      const preferred = availableSlots.find(
        (s) => s.floor === found.preferredFloor
      )
      if (preferred) {
        setSlotId(preferred.id)
      }
    }
  }

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
            <h3 className="modal-title">Reserve Parking Bay</h3>
          </div>
          <button type="button" className="close-btn" onClick={onClose} aria-label="Close booking modal">
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="booking-form">
          {errorMsg && <div className="error-banner">{errorMsg}</div>}

          {/* Quick Select from Registered Students */}
          {registeredVehicles.length > 0 && !prefilledData && (
            <div className="form-group">
              <label>Auto-fill from Registered Student Directory</label>
              <select
                className="form-control"
                onChange={(e) => handleSelectRegistered(e.target.value)}
                defaultValue=""
              >
                <option value="">-- Choose Registered Student (Optional) --</option>
                {registeredVehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.studentName} ({v.rollNumber}) &bull; {v.vehicleNumber} [{v.vehicleType.toUpperCase()}]
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Select Slot */}
          <div className="form-group">
            <label htmlFor="slot-select">Select Available Bay *</label>
            <select
              id="slot-select"
              value={slotId}
              onChange={(e) => handleSlotSelect(e.target.value)}
              className="form-control"
              required
            >
              {availableSlots.length === 0 ? (
                <option value="">No bays currently available</option>
              ) : (
                availableSlots.map((s) => (
                  <option key={s.id} value={s.id}>
                    Bay {s.id} &bull; {s.floor} ({s.section}) [{s.type.toUpperCase()}]
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="form-row">
            {/* Owner Name */}
            <div className="form-group">
              <label htmlFor="owner-name">Student / Driver Name *</label>
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
              <label htmlFor="vehicle-plate">Vehicle Plate *</label>
              <input
                id="vehicle-plate"
                type="text"
                placeholder="MH-04-AB-1234"
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value)}
                className="form-control uppercase-input font-mono font-bold"
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

            {/* Vehicle Model */}
            <div className="form-group">
              <label htmlFor="vehicle-model">Two-Wheeler Type</label>
              <select
                id="vehicle-model"
                value={vehicleType}
                onChange={(e) => setVehicleType(e.target.value)}
                className="form-control"
              >
                <option value="scooty">🛵 Scooty (Normal Petrol)</option>
                <option value="scooty-ev">⚡ EV Scooty (Electric)</option>
                <option value="bike">🏍️ Bike / Motorcycle (Normal)</option>
                <option value="bike-ev">⚡ EV Bike (Electric)</option>
              </select>
            </div>

            {/* Duration */}
            <div className="form-group">
              <label htmlFor="duration-select">Duration</label>
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
