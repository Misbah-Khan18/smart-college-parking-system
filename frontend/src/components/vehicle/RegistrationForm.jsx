import { useState, useEffect, useRef } from 'react'
import {
  UserIcon,
  IdCardIcon,
  AlertCircleIcon,
  ShieldIcon,
  CheckIcon
} from '../Icons'
import {
  VEHICLE_TYPE_OPTIONS,
  COMMON_STREAMS,
  getFloorForVehicleType,
  validateVehicleInput,
  normalizePlate,
  registerVehicle
} from '../../services/vehicleService'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '../../firebase/firebase'

const PERMIT_TIERS = [
  {
    id: 'daily',
    name: 'Daily Pass',
    price: '₹10',
    amountINR: 10,
    badge: '1 Day',
    description: 'Single day campus parking ingress'
  },
  {
    id: 'monthly',
    name: 'Monthly Permit',
    price: '₹300',
    amountINR: 300,
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
  user,
  userProfile,
  registeredVehicles = [],
  onRegisterSuccess,
  showToast
}) {
  const [studentName, setStudentName] = useState(() => userProfile?.displayName || user?.displayName || '')
  const [email, setEmail] = useState(() => userProfile?.email || user?.email || '')
  const [rollNumber, setRollNumber] = useState(() => userProfile?.rollNumber || userProfile?.campusId || '')
  const [stream, setStream] = useState(() => userProfile?.stream || COMMON_STREAMS[0])
  const [phoneNumber, setPhoneNumber] = useState(() => userProfile?.phoneNumber || '')
  const [vehicleNumber, setVehicleNumber] = useState(() => userProfile?.vehicleNumber || userProfile?.defaultPlate || userProfile?.vehiclePlate || '')
  const [vehicleType, setVehicleType] = useState(() => userProfile?.vehicleType || 'scooty')
  const [selectedPlanId, setSelectedPlanId] = useState('monthly')

  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [serverError, setServerError] = useState('')

  const hasUserEditedRef = useRef(false)

  // Safe Google account autofill: only populate empty fields if user has not yet edited
  useEffect(() => {
    if (!hasUserEditedRef.current && (userProfile || user)) {
      const timer = setTimeout(() => {
        setStudentName((prev) => prev || userProfile?.displayName || user?.displayName || '')
        setEmail((prev) => prev || userProfile?.email || user?.email || '')
        setRollNumber((prev) => prev || userProfile?.rollNumber || userProfile?.campusId || '')
        setPhoneNumber((prev) => prev || userProfile?.phoneNumber || '')
        setVehicleNumber((prev) => prev || userProfile?.vehicleNumber || userProfile?.defaultPlate || userProfile?.vehiclePlate || '')
        if (userProfile?.vehicleType) setVehicleType(userProfile.vehicleType)
        if (userProfile?.stream) setStream(userProfile.stream)
      }, 0)
      return () => clearTimeout(timer)
    }
  }, [user, userProfile])

  const handleInputChange = (field, value) => {
    hasUserEditedRef.current = true
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
      case 'email':
        setEmail(value)
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
    const cleanPlate = normalizePlate(vehicleNumber)
    const cleanRoll = rollNumber.trim().toUpperCase()
    const cleanName = studentName.trim()
    const cleanPhone = phoneNumber.trim()
    const targetUid = user?.uid || (auth.currentUser ? auth.currentUser.uid : '')

    const formData = {
      studentId: targetUid,
      studentName: cleanName,
      rollNumber: cleanRoll,
      campusId: cleanRoll,
      stream: stream.trim(),
      phoneNumber: cleanPhone,
      vehicleNumber: cleanPlate,
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
      // 1. Register vehicle in Firestore (registered_vehicles collection)
      const newRecord = await registerVehicle(formData)

      // 2. Persist student profile in Firestore (users/{uid})
      const preferredFloor = getFloorForVehicleType(vehicleType)
      const updatedProfileData = {
        uid: targetUid,
        displayName: cleanName,
        email: user?.email || email || '',
        role: 'Student',
        campusId: cleanRoll,
        rollNumber: cleanRoll,
        stream: stream.trim(),
        phoneNumber: cleanPhone,
        vehicleNumber: cleanPlate,
        vehiclePlate: cleanPlate,
        defaultPlate: cleanPlate,
        vehicleType,
        preferredFloor,
        passType: selectedPlan.name,
        permitPlanId: selectedPlan.id,
        isRegistered: true
      }

      if (targetUid && db) {
        try {
          await setDoc(doc(db, 'users', targetUid), {
            ...updatedProfileData,
            updatedAt: serverTimestamp()
          }, { merge: true })

          try {
            localStorage.setItem(`user_profile_${targetUid}`, JSON.stringify(updatedProfileData))
            localStorage.setItem(`custom_student_vehicle_profile_${targetUid}`, JSON.stringify(updatedProfileData))
          } catch (storageErr) {
            console.warn('Storage cache notice:', storageErr)
          }
        } catch (fsErr) {
          console.warn('Firestore profile save warning:', fsErr)
        }
      }

      // Clear form on success
      setStudentName('')
      setRollNumber('')
      setStream(COMMON_STREAMS[0])
      setPhoneNumber('')
      setVehicleNumber('')
      setVehicleType('scooty')
      setErrors({})

      if (onRegisterSuccess) {
        onRegisterSuccess(newRecord, updatedProfileData)
      }

      if (showToast) {
        showToast(
          'Registration Complete',
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

      {serverError && (
        <div className="auth-alert error mb-4">
          <AlertCircleIcon className="w-5 h-5 flex-shrink-0" />
          <span>{serverError}</span>
        </div>
      )}

      <form onSubmit={handleRegisterSubmit} className="admin-registration-form" noValidate>
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
              placeholder="e.g. Rahul Sharma"
              value={studentName}
              onChange={(e) => handleInputChange('studentName', e.target.value)}
              className={`form-control ${errors.studentName ? 'is-invalid' : ''}`}
              disabled={isSubmitting}
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
                disabled={isSubmitting}
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
              disabled={isSubmitting}
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
            disabled={isSubmitting}
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
            disabled={isSubmitting}
          />
          {errors.vehicleNumber && (
            <span className="inline-error-msg">{errors.vehicleNumber}</span>
          )}
        </div>

        {/* Vehicle Type (Scooty, Bike) */}
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
                  disabled={isSubmitting}
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
            <strong>{vehicleType.toUpperCase()}</strong> &rarr; <span className="rule-floor-highlight">{designatedFloor}</span>
          </span>
        </div>

        {/* Permit Plan Selection */}
        <div className="form-group mt-3">
          <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ShieldIcon className="w-4 h-4 text-emerald" style={{ color: '#34d399' }} />
            <span>Select Campus Parking Permit Tier</span>
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(135px, 1fr))', gap: '10px', marginTop: '6px' }}>
            {PERMIT_TIERS.map((tier) => {
              const isSelected = selectedPlanId === tier.id
              return (
                <div
                  key={tier.id}
                  onClick={() => setSelectedPlanId(tier.id)}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: isSelected ? '1px solid #10b981' : '1px solid rgba(51, 65, 85, 0.6)',
                    background: isSelected ? 'rgba(16, 185, 129, 0.12)' : 'rgba(15, 23, 42, 0.5)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#f1f5f9' }}>{tier.name}</span>
                    {isSelected && <CheckIcon style={{ color: '#34d399', width: 15, height: 15 }} />}
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: '#38bdf8', marginTop: '3px' }}>{tier.price}</div>
                  <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>{tier.description}</div>
                </div>
              )
            })}
          </div>
          <div className="selected-plan-summary mt-2" style={{ fontSize: '12px', color: '#38bdf8' }}>
            <span>Selected Plan: <strong>{selectedPlan.name}</strong> ({selectedPlan.price}) — {selectedPlan.description}</span>
          </div>
        </div>

        {/* Submit Button */}
        <div className="form-submit-row">
          <button
            type="submit"
            className="btn btn-primary btn-md w-full register-action-btn"
            disabled={isSubmitting}
          >
            <span>{isSubmitting ? 'Registering Vehicle...' : `Register Vehicle (${selectedPlan.name})`}</span>
          </button>
        </div>
      </form>
    </div>
  )
}
