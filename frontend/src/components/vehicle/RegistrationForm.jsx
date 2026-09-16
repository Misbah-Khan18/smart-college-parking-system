import { useState } from 'react'
import {
  UserIcon,
  IdCardIcon,
  AlertCircleIcon,
  ShieldIcon
} from '../Icons'
import {
  VEHICLE_TYPE_OPTIONS,
  COMMON_STREAMS,
  getFloorForVehicleType,
  validateVehicleInput,
  normalizePlate,
  registerVehicle
} from '../../services/vehicleService'

const PERMIT_TIERS = [
  {
    id: 'daily',
    name: 'Daily Pass',
    price: '₹50',
    amountINR: 50,
    badge: '1 Day',
    description: 'Single day campus parking ingress'
  },
  {
    id: 'monthly',
    name: 'Monthly Permit',
    price: '₹500',
    amountINR: 500,
    badge: '30 Days • Most Popular',
    recommended: true,
    description: '30-Day unlimited contactless gate access'
  },
  {
    id: 'semester',
    name: 'Semester Term Pass',
    price: '₹1,200',
    amountINR: 1200,
    badge: '180 Days • Best Value',
    description: 'Priority bay allocation for entire term'
  }
]

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
  const [selectedPlanId, setSelectedPlanId] = useState('monthly')

  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [serverError, setServerError] = useState('')

  const handleInputChange = (field, value) => {
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next[field]
        return next
      })
    }
    setServerError('')

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

  const handleRegisterSubmit = async (e) => {
    e.preventDefault()
    setServerError('')

    const selectedPlan = PERMIT_TIERS.find((p) => p.id === selectedPlanId) || PERMIT_TIERS[1]

    const formData = {
      studentName: studentName.trim(),
      rollNumber: rollNumber.trim().toUpperCase(),
      stream: stream.trim(),
      phoneNumber: phoneNumber.trim(),
      vehicleNumber: normalizePlate(vehicleNumber),
      vehicleType,
      category: 'Student',
      passType: selectedPlan.name
    }

    const validation = validateVehicleInput(formData, registeredVehicles)

    if (!validation.isValid) {
      setErrors(validation.errors)
      return
    }

    setIsSubmitting(true)

    try {
      const newRecord = await registerVehicle(formData)

      // Clear form on success
      setStudentName('')
      setRollNumber('')
      setStream(COMMON_STREAMS[0])
      setPhoneNumber('')
      setVehicleNumber('')
      setVehicleType('scooty')
      setErrors({})

      if (onRegisterSuccess) {
        onRegisterSuccess(newRecord)
      }

      if (showToast) {
        showToast(
          'Vehicle Registered',
          `${newRecord.studentName} (${newRecord.vehicleNumber}) registered in Firestore! 🎉`,
          'success'
        )
      }
    } catch (err) {
      console.error('Registration error:', err)
      if (err.validationErrors) {
        setErrors(err.validationErrors)
      } else {
        setServerError(err.message || 'Registration failed. Please check form details.')
      }
      if (showToast) {
        showToast('Registration Error', err.message || 'Could not register vehicle.', 'error')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const designatedFloor = getFloorForVehicleType(vehicleType)
  const selectedPlan = PERMIT_TIERS.find((p) => p.id === selectedPlanId) || PERMIT_TIERS[1]

  return (
    <div className="registration-form-card glass-card">
      <div className="form-card-header">
        <div className="header-icon-box">
          <ShieldIcon className="w-5 h-5 text-cyan" />
        </div>
        <div>
          <h3 className="form-card-title">Register Student &amp; Vehicle</h3>
          <p className="form-card-subtitle">
            Official vehicle registration with designated floor allocation &amp; QR Gate Pass issuance
          </p>
        </div>
      </div>

      {serverError && (
        <div className="auth-alert error mb-4">
          <AlertCircleIcon className="w-5 h-5 flex-shrink-0" />
          <div>
            <strong>Registration Notice:</strong>
            <p className="text-xs">{serverError}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleRegisterSubmit} className="vehicle-reg-form" noValidate>
        {/* Row 1: Student Name & Roll Number */}
        <div className="form-grid-2">
          <div className="input-group">
            <label htmlFor="reg-student-name">
              Student Full Name <span className="required-star">*</span>
            </label>
            <div className={`input-wrapper ${errors.studentName ? 'has-error' : ''}`}>
              <UserIcon className="input-icon" />
              <input
                id="reg-student-name"
                type="text"
                placeholder="e.g. Rahul Sharma"
                value={studentName}
                onChange={(e) => handleInputChange('studentName', e.target.value)}
                disabled={isSubmitting}
                required
              />
            </div>
            {errors.studentName && <span className="field-error-msg">{errors.studentName}</span>}
          </div>

          <div className="input-group">
            <label htmlFor="reg-roll-number">
              College Roll / PRN Number <span className="required-star">*</span>
            </label>
            <div className={`input-wrapper ${errors.rollNumber ? 'has-error' : ''}`}>
              <IdCardIcon className="input-icon" />
              <input
                id="reg-roll-number"
                type="text"
                placeholder="e.g. S2410701"
                value={rollNumber}
                onChange={(e) => handleInputChange('rollNumber', e.target.value)}
                disabled={isSubmitting}
                required
              />
            </div>
            {errors.rollNumber && <span className="field-error-msg">{errors.rollNumber}</span>}
          </div>
        </div>

        {/* Row 2: Stream & Mobile Phone */}
        <div className="form-grid-2">
          <div className="input-group">
            <label htmlFor="reg-stream">
              Department / Stream <span className="required-star">*</span>
            </label>
            <div className={`input-wrapper ${errors.stream ? 'has-error' : ''}`}>
              <select
                id="reg-stream"
                value={stream}
                onChange={(e) => handleInputChange('stream', e.target.value)}
                disabled={isSubmitting}
                className="custom-select"
              >
                {COMMON_STREAMS.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>
            {errors.stream && <span className="field-error-msg">{errors.stream}</span>}
          </div>

          <div className="input-group">
            <label htmlFor="reg-phone">
              Contact Mobile Number <span className="required-star">*</span>
            </label>
            <div className={`input-wrapper ${errors.phoneNumber ? 'has-error' : ''}`}>
              <span className="input-prefix-tag">+91</span>
              <input
                id="reg-phone"
                type="tel"
                placeholder="98765 43210"
                value={phoneNumber}
                onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                disabled={isSubmitting}
                maxLength={14}
                required
              />
            </div>
            {errors.phoneNumber && <span className="field-error-msg">{errors.phoneNumber}</span>}
          </div>
        </div>

        {/* Row 3: Vehicle Type & License Plate */}
        <div className="form-grid-2">
          <div className="input-group">
            <label>
              Vehicle Classification <span className="required-star">*</span>
            </label>
            <div className="vehicle-choice-row">
              {VEHICLE_TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  className={`vehicle-choice-btn ${vehicleType === opt.id ? 'active' : ''}`}
                  onClick={() => handleInputChange('vehicleType', opt.id)}
                  disabled={isSubmitting}
                >
                  <span className="v-icon">{opt.emoji}</span>
                  <div className="v-text-col">
                    <strong>{opt.label}</strong>
                    <small>{opt.floor}</small>
                  </div>
                </button>
              ))}
              {VEHICLE_TYPE_OPTIONS.map((opt) => {
                const val = opt.value || opt.id
                return (
                  <button
                    key={val}
                    type="button"
                    className={`vehicle-choice-btn ${vehicleType === val ? 'active' : ''}`}
                    onClick={() => handleInputChange('vehicleType', val)}
                    disabled={isSubmitting}
                  >
                    <span className="v-icon">{opt.emoji}</span>
                    <div className="v-text-col">
                      <strong>{opt.label}</strong>
                      <small>{opt.floor}</small>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="input-group">
            <label htmlFor="reg-vehicle-number">
              Vehicle Plate Number <span className="required-star">*</span>
            </label>
            <div className={`input-wrapper ${errors.vehicleNumber ? 'has-error' : ''}`}>
              <span className="input-prefix-tag font-mono">IND</span>
              <input
                id="reg-vehicle-number"
                type="text"
                placeholder="MH-12-AB-1234"
                value={vehicleNumber}
                onChange={(e) => handleInputChange('vehicleNumber', e.target.value)}
                disabled={isSubmitting}
                className="font-mono"
                required
              />
            </div>
            {errors.vehicleNumber && <span className="field-error-msg">{errors.vehicleNumber}</span>}
          </div>
        </div>

        {/* Permit Tier Selection */}
        <div className="permit-plans-section">
          <label className="section-subhead">
            Select Parking Permit Pass Plan &bull; <span className="text-cyan">Academic Duration</span>
          </label>
          <div className="plans-grid-three">
            {PERMIT_TIERS.map((tier) => (
              <div
                key={tier.id}
                className={`plan-tier-card ${selectedPlanId === tier.id ? 'selected' : ''}`}
                onClick={() => setSelectedPlanId(tier.id)}
              >
                <div className="plan-badge-pill">{tier.badge}</div>
                <div className="plan-name">{tier.name}</div>
                <div className="plan-price-large">{tier.price}</div>
                <p className="plan-desc">{tier.description}</p>
                <div className="plan-select-indicator">
                  <div className="radio-circle"></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Dynamic Floor Allocation Info Banner */}
        <div className="floor-rule-info-box">
          <div className="frib-left">
            <span className="frib-icon">🏢</span>
            <div>
              <span className="frib-label">Mandatory Designated Parking Floor</span>
              <strong className="frib-floor">{designatedFloor}</strong>
            </div>
          </div>
          <div className="frib-right">
            <span className="frib-notice">
              {vehicleType === 'scooty'
                ? 'Ground Floor reserved for Scooties'
                : 'Basement Floor reserved for Motorcycles/Bikes'}
            </span>
          </div>
        </div>

        {/* Submit Button */}
        <div className="form-submit-row">
          <div className="payment-security-note">
            <span>🔒 Campus Verified &bull; Automatic {designatedFloor} Allocation</span>
          </div>
          <button
            type="submit"
            className="btn btn-primary submit-reg-btn pay-btn-large"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <span className="spinner-dots"></span>
                <span>Registering Vehicle...</span>
              </>
            ) : (
              <>
                <CheckIcon className="w-5 h-5" />
                <span>Register Vehicle &amp; Issue Pass</span>
                <span className="pay-arrow">&rarr;</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
