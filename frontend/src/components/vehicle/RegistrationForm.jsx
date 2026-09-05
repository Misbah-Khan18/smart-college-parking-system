import { useState } from 'react'
import {
  UserIcon,
  IdCardIcon,
  CheckIcon,
  AlertCircleIcon
} from '../Icons'
import {
  VEHICLE_TYPE_OPTIONS,
  COMMON_STREAMS,
  getFloorForVehicleType,
  validateVehicleInput,
  registerVehicle,
  normalizePlate
} from '../../services/vehicleService'

export default function RegistrationForm({
  registeredVehicles = [],
  onRegisterSuccess,
  showToast
}) {
  const [studentName, setStudentName] = useState('')
  const [rollNumber, setRollNumber] = useState('')
  const [stream, setStream] = useState(COMMON_STREAMS[0])
  const [phoneNumber, setPhoneNumber] = useState('')
  const [vehicleNumber, setVehicleNumber] = useState('')
  const [vehicleType, setVehicleType] = useState('scooty')

  const [errors, setErrors] = useState({})
  const [successBanner, setSuccessBanner] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleInputChange = (field, value) => {
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
    setSuccessBanner('')
    setIsSubmitting(true)

    const formData = {
      studentName: studentName.trim(),
      rollNumber: rollNumber.trim().toUpperCase(),
      stream: stream.trim(),
      phoneNumber: phoneNumber.trim(),
      vehicleNumber: normalizePlate(vehicleNumber),
      vehicleType
    }

    const validation = validateVehicleInput(formData, registeredVehicles)

    if (!validation.isValid) {
      setErrors(validation.errors)
      setIsSubmitting(false)
      return
    }

    try {
      const createdRecord = registerVehicle(formData)

      // Reset Form
      setStudentName('')
      setRollNumber('')
      setStream(COMMON_STREAMS[0])
      setPhoneNumber('')
      setVehicleNumber('')
      setVehicleType('scooty')
      setErrors({})

      const successMsg = `Vehicle ${createdRecord.vehicleNumber} registered successfully for ${createdRecord.studentName}.`
      setSuccessBanner(successMsg)

      if (showToast) {
        showToast(
          'Registration Successful',
          `Vehicle ${createdRecord.vehicleNumber} (${createdRecord.vehicleType.toUpperCase()}) registered for ${createdRecord.studentName}.`,
          'success'
        )
      }

      if (onRegisterSuccess) {
        onRegisterSuccess(createdRecord)
      }

      setTimeout(() => {
        setSuccessBanner('')
      }, 5000)
    } catch (err) {
      if (err.validationErrors) {
        setErrors(err.validationErrors)
      } else {
        setErrors({ form: err.message || 'Failed to register vehicle.' })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const currentFloorAssignment = getFloorForVehicleType(vehicleType)

  return (
    <div className="admin-form-panel glass-card">
      <div className="form-panel-header">
        <div className="fph-title-wrap">
          <h2 className="form-panel-title">New Vehicle Registration</h2>
          <span className="form-panel-subtitle">
            Enter student credentials &amp; vehicle registration number
          </span>
        </div>
        <span className="required-legend">* Required Fields</span>
      </div>

      {/* Form Success Banner */}
      {successBanner && (
        <div className="auth-alert success mb-4">
          <CheckIcon className="w-5 h-5 flex-shrink-0" />
          <span>{successBanner}</span>
        </div>
      )}

      {/* Form Error Banner */}
      {errors.form && (
        <div className="auth-alert error mb-4">
          <AlertCircleIcon className="w-5 h-5 flex-shrink-0" />
          <span>{errors.form}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="admin-registration-form" noValidate>
        {/* Student Information */}
        <div className="form-section-divider">
          <span className="section-divider-title">Student Information</span>
        </div>

        {/* Student Name */}
        <div className="form-group">
          <label className="form-label" htmlFor="reg-student-name">
            Student Name <span className="text-rose">*</span>
          </label>
          <div className="input-with-icon">
            <UserIcon className="input-icon" />
            <input
              id="reg-student-name"
              type="text"
              placeholder="e.g. Alzuni Shaikh"
              value={studentName}
              onChange={(e) => handleInputChange('studentName', e.target.value)}
              className={`form-control ${errors.studentName ? 'is-invalid' : ''}`}
            />
          </div>
          {errors.studentName && (
            <span className="inline-error-msg">{errors.studentName}</span>
          )}
        </div>

        {/* Roll Number & Phone Number */}
        <div className="form-row two-cols">
          <div className="form-group">
            <label className="form-label" htmlFor="reg-roll-number">
              Roll Number <span className="text-rose">*</span>
            </label>
            <div className="input-with-icon">
              <IdCardIcon className="input-icon" />
              <input
                id="reg-roll-number"
                type="text"
                placeholder="e.g. S2410701"
                value={rollNumber}
                onChange={(e) => handleInputChange('rollNumber', e.target.value)}
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
            <label className="form-label" htmlFor="reg-phone-number">
              Phone Number <span className="text-rose">*</span>
            </label>
            <input
              id="reg-phone-number"
              type="tel"
              placeholder="e.g. 9876543210"
              value={phoneNumber}
              onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
              className={`form-control font-mono ${errors.phoneNumber ? 'is-invalid' : ''}`}
            />
            {errors.phoneNumber && (
              <span className="inline-error-msg">{errors.phoneNumber}</span>
            )}
          </div>
        </div>

        {/* Stream / Class */}
        <div className="form-group">
          <label className="form-label" htmlFor="reg-stream">
            Stream / Class <span className="text-rose">*</span>
          </label>
          <select
            id="reg-stream"
            value={stream}
            onChange={(e) => handleInputChange('stream', e.target.value)}
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

        {/* Vehicle Information */}
        <div className="form-section-divider mt-4">
          <span className="section-divider-title">Vehicle Information</span>
        </div>

        {/* Vehicle Number */}
        <div className="form-group">
          <label className="form-label" htmlFor="reg-vehicle-number">
            Vehicle Number (License Plate) <span className="text-rose">*</span>
          </label>
          <input
            id="reg-vehicle-number"
            type="text"
            placeholder="e.g. MH12AB1234"
            value={vehicleNumber}
            onChange={(e) => handleInputChange('vehicleNumber', e.target.value)}
            className={`form-control font-mono font-bold uppercase-input ${
              errors.vehicleNumber ? 'is-invalid' : ''
            }`}
          />
          {errors.vehicleNumber && (
            <span className="inline-error-msg">{errors.vehicleNumber}</span>
          )}
        </div>

        {/* Vehicle Type (Scooty, Bike, Car) */}
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
                  name="registrationVehicleType"
                  value={opt.id}
                  checked={vehicleType === opt.id}
                  onChange={() => handleInputChange('vehicleType', opt.id)}
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
            <strong>{vehicleType.toUpperCase()}</strong> &rarr; <span className="rule-floor-highlight">{currentFloorAssignment}</span>
          </span>
        </div>

        {/* Submit Button */}
        <div className="form-submit-row">
          <button
            type="submit"
            className="btn btn-primary btn-md w-full register-action-btn"
            disabled={isSubmitting}
          >
            <span>{isSubmitting ? 'Registering Vehicle...' : 'Register Vehicle'}</span>
          </button>
        </div>
      </form>
    </div>
  )
}
