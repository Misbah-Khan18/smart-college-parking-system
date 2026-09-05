import { useState, useEffect } from 'react'
import {
  XIcon,
  CheckIcon,
  UserIcon,
  IdCardIcon,
  AlertCircleIcon
} from '../Icons'
import {
  VEHICLE_TYPE_OPTIONS,
  COMMON_STREAMS,
  validateVehicleInput,
  getFloorForVehicleType,
  normalizePlate
} from '../../services/vehicleService'

export default function EditVehicleModal({
  isOpen,
  vehicle,
  registeredVehicles = [],
  onSave,
  onClose
}) {
  const [studentName, setStudentName] = useState('')
  const [rollNumber, setRollNumber] = useState('')
  const [stream, setStream] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [vehicleNumber, setVehicleNumber] = useState('')
  const [vehicleType, setVehicleType] = useState('scooty')
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Populate form when vehicle changes
  useEffect(() => {
    if (vehicle) {
      setStudentName(vehicle.studentName || '')
      setRollNumber(vehicle.rollNumber || '')
      setStream(vehicle.stream || COMMON_STREAMS[0])
      setPhoneNumber(vehicle.phoneNumber || '')
      setVehicleNumber(vehicle.vehicleNumber || '')
      setVehicleType(vehicle.vehicleType || 'scooty')
      setErrors({})
    }
  }, [vehicle])

  if (!isOpen || !vehicle) return null

  const handleFieldChange = (field, value) => {
    // Clear specific field error on edit
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next[field]
        return next
      })
    }

    switch (field) {
      case 'studentName':
        setStudentName(value)
        break
      case 'rollNumber':
        setRollNumber(value.toUpperCase())
        break
      case 'stream':
        setStream(value)
        break
      case 'phoneNumber':
        setPhoneNumber(value)
        break
      case 'vehicleNumber':
        setVehicleNumber(value.toUpperCase())
        break
      case 'vehicleType':
        setVehicleType(value)
        break
      default:
        break
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setIsSubmitting(true)

    const formData = {
      studentName: studentName.trim(),
      rollNumber: rollNumber.trim().toUpperCase(),
      stream: stream.trim(),
      phoneNumber: phoneNumber.trim(),
      vehicleNumber: normalizePlate(vehicleNumber),
      vehicleType
    }

    const validation = validateVehicleInput(formData, registeredVehicles, vehicle.id)

    if (!validation.isValid) {
      setErrors(validation.errors)
      setIsSubmitting(false)
      return
    }

    try {
      if (onSave) {
        onSave(vehicle.id, formData)
      }
      onClose()
    } catch (err) {
      if (err.validationErrors) {
        setErrors(err.validationErrors)
      } else {
        setErrors({ form: err.message || 'Failed to update vehicle registration.' })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const targetFloor = getFloorForVehicleType(vehicleType)

  return (
    <div className="modal-backdrop active" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="modal-box glass-card edit-vehicle-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-header-text">
            <h3 className="modal-title">Edit Vehicle Registration</h3>
            <span className="modal-subtitle">
              Update student details &amp; campus permit allocation
            </span>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close edit modal"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Form Error Banner */}
        {errors.form && (
          <div className="auth-alert error mb-4">
            <AlertCircleIcon className="w-4 h-4 flex-shrink-0" />
            <span>{errors.form}</span>
          </div>
        )}

        {/* Edit Form */}
        <form onSubmit={handleSubmit} className="vehicle-form-body">
          {/* Student Name */}
          <div className="form-group">
            <label className="form-label" htmlFor="edit-student-name">
              Student Name <span className="text-rose">*</span>
            </label>
            <div className="input-with-icon">
              <UserIcon className="input-icon" />
              <input
                id="edit-student-name"
                type="text"
                placeholder="e.g. Alzuni Shaikh"
                value={studentName}
                onChange={(e) => handleFieldChange('studentName', e.target.value)}
                className={`form-control ${errors.studentName ? 'is-invalid' : ''}`}
                autoFocus
              />
            </div>
            {errors.studentName && (
              <span className="inline-error-msg">{errors.studentName}</span>
            )}
          </div>

          {/* Roll Number & Phone Number Row */}
          <div className="form-row two-cols">
            <div className="form-group">
              <label className="form-label" htmlFor="edit-roll-number">
                Roll Number <span className="text-rose">*</span>
              </label>
              <div className="input-with-icon">
                <IdCardIcon className="input-icon" />
                <input
                  id="edit-roll-number"
                  type="text"
                  placeholder="e.g. S2410701"
                  value={rollNumber}
                  onChange={(e) => handleFieldChange('rollNumber', e.target.value)}
                  className={`form-control font-mono font-bold uppercase-input ${
                    errors.rollNumber ? 'is-invalid' : ''
                  }`}
                />
              </div>
              {errors.rollNumber && (
                <span className="inline-error-msg">{errors.rollNumber}</span>
              )}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="edit-phone-number">
                Phone Number <span className="text-rose">*</span>
              </label>
              <input
                id="edit-phone-number"
                type="tel"
                placeholder="e.g. 9876543210"
                value={phoneNumber}
                onChange={(e) => handleFieldChange('phoneNumber', e.target.value)}
                className={`form-control font-mono ${errors.phoneNumber ? 'is-invalid' : ''}`}
              />
              {errors.phoneNumber && (
                <span className="inline-error-msg">{errors.phoneNumber}</span>
              )}
            </div>
          </div>

          {/* Stream / Class */}
          <div className="form-group">
            <label className="form-label" htmlFor="edit-stream">
              Stream / Class <span className="text-rose">*</span>
            </label>
            <select
              id="edit-stream"
              value={stream}
              onChange={(e) => handleFieldChange('stream', e.target.value)}
              className={`form-control ${errors.stream ? 'is-invalid' : ''}`}
            >
              {COMMON_STREAMS.map((st, idx) => (
                <option key={idx} value={st}>
                  {st}
                </option>
              ))}
            </select>
            {errors.stream && (
              <span className="inline-error-msg">{errors.stream}</span>
            )}
          </div>

          {/* Vehicle Number */}
          <div className="form-group">
            <label className="form-label" htmlFor="edit-vehicle-number">
              Vehicle Number (License Plate) <span className="text-rose">*</span>
            </label>
            <input
              id="edit-vehicle-number"
              type="text"
              placeholder="e.g. MH-12-AB-1234"
              value={vehicleNumber}
              onChange={(e) => handleFieldChange('vehicleNumber', e.target.value)}
              className={`form-control font-mono font-bold uppercase-input ${
                errors.vehicleNumber ? 'is-invalid' : ''
              }`}
            />
            {errors.vehicleNumber && (
              <span className="inline-error-msg">{errors.vehicleNumber}</span>
            )}
          </div>

          {/* Vehicle Type Selection */}
          <div className="form-group">
            <label className="form-label">
              Vehicle Type <span className="text-rose">*</span>
            </label>
            <div className="vehicle-type-cards-grid">
              {VEHICLE_TYPE_OPTIONS.map((opt) => (
                <label
                  key={opt.id}
                  className={`vehicle-type-card ${vehicleType === opt.id ? 'active' : ''}`}
                >
                  <input
                    type="radio"
                    name="editVehicleType"
                    value={opt.id}
                    checked={vehicleType === opt.id}
                    onChange={() => handleFieldChange('vehicleType', opt.id)}
                    className="sr-only"
                  />
                  <div className="vt-card-icon">{opt.emoji}</div>
                  <div className="vt-card-info">
                    <strong className="vt-card-name">{opt.label}</strong>
                    <span className="vt-card-floor">{opt.floor}</span>
                  </div>
                </label>
              ))}
            </div>
            {errors.vehicleType && (
              <span className="inline-error-msg">{errors.vehicleType}</span>
            )}
          </div>

          {/* Centralized Rule Summary - Compact Micro Badge */}
          <div className="allocation-rule-compact">
            <span className="rule-pill-tag">Campus Rule</span>
            <span className="rule-compact-text">
              <strong>{vehicleType.toUpperCase()}</strong> &rarr; <span className="rule-floor-highlight">{targetFloor}</span>
            </span>
          </div>

          {/* Modal Actions */}
          <div className="modal-actions-bar">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              <CheckIcon className="w-4 h-4" />
              <span>{isSubmitting ? 'Saving Changes...' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
