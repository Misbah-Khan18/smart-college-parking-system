import { useState, useEffect } from 'react'
import { XIcon, ShieldIcon } from './Icons'
import { normalizeSlotId } from '../services/parkingService'
import MetroGatePaymentGateway from './MetroGatePaymentGateway'
import GatePassActivationScreen from './GatePassActivationScreen'

const PERMIT_TIERS = [
  { id: 'Daily', name: 'Daily Permit', price: 10, duration: '1 Day', days: 1, desc: 'Valid for current date. Single entry/exit session.' },
  { id: 'Monthly', name: '30-Day Monthly Pass', price: 300, duration: '30 Days', days: 30, desc: 'Unlimited gate entries during the 30-day validity window.' },
  { id: 'Semester', name: 'Semester Term Pass', price: 1200, duration: '180 Days', days: 180, desc: 'Full academic term access with zero repeated payments.' }
]

// Impure helper intentionally defined outside the component so the
// React Compiler does not flag Date.now() as an impure render call.
function getNow() { return Date.now() }

// Read the latest saved profile from localStorage (UID-scoped custom profile takes
// highest priority, then the demo session, then the userProfile prop).
function resolveLatestProfile(userProfile, user) {
  const uid = user?.uid || userProfile?.uid || 'demo'
  try {
    const customRaw = localStorage.getItem(`custom_student_vehicle_profile_${uid}`)
    if (customRaw) {
      const custom = JSON.parse(customRaw)
      // Merge: custom overrides userProfile for vehicle fields
      return {
        ...(userProfile || {}),
        ...custom,
        // keep canonical field names consistent
        defaultPlate: custom.defaultPlate || custom.vehiclePlate || custom.vehicleNumber || userProfile?.defaultPlate || '',
        vehiclePlate: custom.vehiclePlate || custom.defaultPlate || custom.vehicleNumber || userProfile?.vehiclePlate || '',
        vehicleNumber: custom.vehicleNumber || custom.defaultPlate || userProfile?.vehicleNumber || '',
        vehicleType: custom.vehicleType || userProfile?.vehicleType || 'scooty',
        displayName: custom.displayName || userProfile?.displayName || user?.displayName || 'Student',
      }
    }
  } catch {
    // ignore storage parse errors
  }
  return userProfile || null
}

export default function SlotBookingModal({
  isOpen,
  onClose,
  selectedSlot = null,
  availableSlots = [],
  registeredVehicles = [],
  onActivatePass,
  onPermitActivated,
  user,
  userProfile,
  isSlotsInitialized = true
}) {
  if (!isOpen) return null

  return (
    <SlotBookingContent
      onClose={onClose}
      selectedSlot={selectedSlot}
      availableSlots={availableSlots}
      registeredVehicles={registeredVehicles}
      onActivatePass={onActivatePass}
      onPermitActivated={onPermitActivated}
      user={user}
      userProfile={userProfile}
      isSlotsInitialized={isSlotsInitialized}
    />
  )
}

function SlotBookingContent({
  onClose,
  selectedSlot = null,
  availableSlots = [],
  registeredVehicles = [],
  onActivatePass,
  onPermitActivated,
  user,
  userProfile,
  isSlotsInitialized = true
}) {
  // ── Resolve the latest profile (includes UID-scoped localStorage custom profile) ──
  const latestProfile = resolveLatestProfile(userProfile, user)

  const [selectedTier, setSelectedTier] = useState('Daily')
  const [chosenSlotId, setChosenSlotId] = useState(
    selectedSlot?.id ? normalizeSlotId(selectedSlot.id) : ''
  )
  const [vehicleNumber, setVehicleNumber] = useState(
    latestProfile?.defaultPlate || latestProfile?.vehicleNumber || latestProfile?.vehiclePlate || ''
  )
  const [ownerName, setOwnerName] = useState(
    latestProfile?.displayName || user?.displayName || 'Student'
  )
  const [vehicleType, setVehicleType] = useState(
    selectedSlot?.type || latestProfile?.vehicleType || 'scooty'
  )
  const [isProcessing, setIsProcessing] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  // State for Metro Gate Payment Gateway (between Step 1 Reserve Modal and Step 2 Pass Receipt)
  const [pendingPaymentPayload, setPendingPaymentPayload] = useState(null)
  const [gateScreenPass, setGateScreenPass] = useState(null)

  // ── Always re-sync vehicle data when userProfile / user changes ──
  // This fires whenever the user updates "My Vehicle" tab and App re-renders.
  // setState calls are deferred via setTimeout to avoid synchronous setState-in-effect
  // warnings from the React Compiler (cascading render prevention).
  useEffect(() => {
    const latest = resolveLatestProfile(userProfile, user)
    if (!latest) return
    const plate = latest.defaultPlate || latest.vehicleNumber || latest.vehiclePlate || ''
    const name  = latest.displayName || user?.displayName || 'Student'
    const type  = latest.vehicleType || 'scooty'
    const timer = setTimeout(() => {
      if (plate) setVehicleNumber(plate)
      if (name)  setOwnerName(name)
      // Only override vehicle type from profile if no slot type is specified
      if (!selectedSlot?.type) setVehicleType(type)
    }, 0)
    return () => clearTimeout(timer)
  }, [userProfile, user, selectedSlot])

  // Sync slot when selectedSlot prop changes
  useEffect(() => {
    if (selectedSlot) {
      const timer = setTimeout(() => {
        setChosenSlotId(normalizeSlotId(selectedSlot.id))
        if (selectedSlot.type) {
          setVehicleType(selectedSlot.type)
        }
      }, 0)
      return () => clearTimeout(timer)
    }
  }, [selectedSlot])

  const tier = PERMIT_TIERS.find(t => t.id === selectedTier) || PERMIT_TIERS[0]

  const handleSelectRegistered = (regId) => {
    if (!regId) return
    const found = registeredVehicles.find((v) => v.id === regId)
    if (found) {
      setOwnerName(found.studentName || '')
      setVehicleNumber(found.vehicleNumber || '')
      if (found.vehicleType) {
        setVehicleType(found.vehicleType)
      }
    }
  }

  // Active target slot object
  const activeSlotObj = selectedSlot || availableSlots.find(
    (s) => normalizeSlotId(s.id) === normalizeSlotId(chosenSlotId)
  )

  const handleActivateSubmit = (e) => {
    e.preventDefault()
    setErrorMsg('')

    const targetSlotId = normalizeSlotId(chosenSlotId || selectedSlot?.id)
    if (!targetSlotId) {
      setErrorMsg('Please select an available parking bay.')
      return
    }

    const cleanPlate = (vehicleNumber || '').toUpperCase().trim()
    if (!cleanPlate) {
      setErrorMsg('Vehicle license plate number is required.')
      return
    }

    const days = tier.days || 1
    const expiryDate = new Date(getNow() + days * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })

    const payload = {
      slotId: targetSlotId,
      slot: activeSlotObj,
      floor: activeSlotObj?.floor || (targetSlotId.startsWith('G') ? 'Ground Floor' : 'Basement'),
      section: activeSlotObj?.section || `${targetSlotId.startsWith('G') ? 'Ground Floor' : 'Basement'} Parking Area`,
      zone: activeSlotObj?.zone || `${targetSlotId.startsWith('G') ? 'Ground Floor' : 'Basement'} - General`,
      plate: cleanPlate,
      vehiclePlate: cleanPlate,
      vehicleNumber: cleanPlate,
      owner: ownerName.trim() || 'Student',
      userName: ownerName.trim() || 'Student',
      userEmail: user?.email || userProfile?.email || '',
      rollNumber: latestProfile?.campusId || latestProfile?.rollNumber || '',
      stream: latestProfile?.stream || 'School of Commerce',
      phoneNumber: latestProfile?.phoneNumber || '',
      category: userProfile?.role || 'Student',
      vehicleType,
      type: vehicleType,
      passType: `${tier.name} (${targetSlotId})`,
      permitType: tier.name,
      amountPaidINR: tier.price,
      reservedUntil: expiryDate,
      days,
      qrToken: `SOC-${targetSlotId}-${cleanPlate}-${getNow()}`
    }

    // Route to Metro Gate Payment Gateway (Between Image 1 and Image 2)
    setPendingPaymentPayload(payload)
  }

  // Called when payment is confirmed in MetroGatePaymentGateway
  const handlePaymentSuccess = async (paidPayload) => {
    setIsProcessing(true)
    setErrorMsg('')

    try {
      if (onActivatePass) {
        await onActivatePass(paidPayload)
      } else if (onPermitActivated) {
        onPermitActivated(paidPayload)
      }

      setPendingPaymentPayload(null)
      setIsProcessing(false)
      onClose()
    } catch (err) {
      console.error('[SlotBookingModal] Pass Activation Error:', err)
      setErrorMsg(err.message || 'Payment confirmed, but failed to record slot reservation.')
      setIsProcessing(false)
      setPendingPaymentPayload(null)
    }
  }

  // Called when gate animation finishes (auto or tap)
  const handleGateDone = () => {
    setGateScreenPass(null)
    onClose()
  }

  // 1. Show Metro Gate Payment Gateway (between Step 1 and Step 2)
  if (pendingPaymentPayload) {
    return (
      <MetroGatePaymentGateway
        isOpen={true}
        bookingData={pendingPaymentPayload}
        onPaymentSuccess={handlePaymentSuccess}
        onCancel={() => setPendingPaymentPayload(null)}
      />
    )
  }

  // 2. Show gate animation full-screen overlay if active
  if (gateScreenPass) {
    return <GatePassActivationScreen passData={gateScreenPass} onDone={handleGateDone} />
  }

  // ── Is vehicle data sourced from saved profile? ──
  const profileVehicleNumber = latestProfile?.defaultPlate || latestProfile?.vehicleNumber || latestProfile?.vehiclePlate || ''
  const isSyncedFromProfile = profileVehicleNumber && vehicleNumber === profileVehicleNumber.toUpperCase().trim()

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-content glass-card slot-booking-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Activate Parking Pass & Reserve Slot"
      >
        <div className="modal-header">
          <div className="modal-title-wrap">
            <ShieldIcon className="w-5 h-5 text-cyan" />
            <h3 className="modal-title">
              {chosenSlotId ? `Reserve Bay ${chosenSlotId}` : 'Campus Parking Pass'}
            </h3>
          </div>
          <button type="button" className="close-btn" onClick={onClose} aria-label="Close modal">
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleActivateSubmit} className="booking-modal-body">
          {/* Selected Bay Highlight Banner */}
          {activeSlotObj ? (
            <div style={{
              background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.15), rgba(59, 130, 246, 0.15))',
              border: '1px solid rgba(56, 189, 248, 0.4)',
              borderRadius: '12px',
              padding: '14px 16px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px'
            }}>
              <div>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.6px', color: '#38bdf8', fontWeight: 700 }}>
                  📍 Selected Parking Slot
                </div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#f8fafc', fontFamily: 'monospace', marginTop: '2px' }}>
                  {activeSlotObj.id} <span style={{ fontSize: '13px', fontWeight: 500, color: '#94a3b8', fontFamily: 'sans-serif' }}>&bull; {activeSlotObj.floor}</span>
                </div>
                <div style={{ fontSize: '12px', color: '#cbd5e1', marginTop: '3px' }}>
                  {activeSlotObj.section || 'Campus Two-Wheeler Bay'}
                </div>
              </div>
              <div style={{
                background: 'rgba(16, 185, 129, 0.2)',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                color: '#34d399',
                padding: '4px 10px',
                borderRadius: '999px',
                fontSize: '11px',
                fontWeight: 700
              }}>
                🟢 AVAILABLE
              </div>
            </div>
          ) : (
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '12.5px', color: '#cbd5e1', fontWeight: 600 }}>
                Select Parking Bay *
              </label>
              <select
                className="form-control font-mono font-bold"
                value={chosenSlotId}
                onChange={(e) => setChosenSlotId(e.target.value)}
                required
              >
                <option value="">-- Choose Available Slot --</option>
                {availableSlots.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.id} &bull; {s.floor} ({s.section})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Select Permit Tier */}
          <div className="form-group">
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '13px', color: '#cbd5e1' }}>
              Select Pass Duration / Tier
            </label>
            <div className="permit-tier-grid">
              {PERMIT_TIERS.map(t => {
                const isSelected = selectedTier === t.id
                return (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTier(t.id)}
                    style={{
                      cursor: 'pointer',
                      padding: '12px 10px',
                      borderRadius: '10px',
                      border: isSelected ? '2px solid #38bdf8' : '1px solid rgba(255,255,255,0.1)',
                      background: isSelected ? 'rgba(37, 99, 235, 0.25)' : 'rgba(15, 23, 42, 0.6)',
                      transition: 'all 0.2s ease',
                      textAlign: 'center'
                    }}
                  >
                    <div style={{ fontSize: '18px', fontWeight: 800, color: '#f8fafc' }}>
                      ₹{t.price}
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: isSelected ? '#38bdf8' : '#94a3b8', marginTop: '2px' }}>
                      {t.name}
                    </div>
                    <div style={{ fontSize: '10.5px', color: '#64748b', marginTop: '4px' }}>
                      {t.duration}
                    </div>
                  </div>
                )
              })}
            </div>
            <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#94a3b8' }}>
              {tier.desc}
            </p>
          </div>

          {/* Quick select registered student */}
          {registeredVehicles.length > 0 && (
            <div className="form-group" style={{ marginTop: '14px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '12.5px', color: '#cbd5e1' }}>
                Autofill from Registered Vehicle
              </label>
              <select
                className="form-control"
                onChange={(e) => handleSelectRegistered(e.target.value)}
                defaultValue=""
              >
                <option value="">-- Choose Registered Vehicle --</option>
                {registeredVehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.vehicleNumber} &bull; {v.studentName} ({v.vehicleType})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Vehicle Number Input */}
          <div className="form-group" style={{ marginTop: '14px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '12.5px', color: '#cbd5e1' }}>
              Vehicle License Plate *
            </label>
            <input
              type="text"
              placeholder="e.g. MH-12-AB-1234"
              value={vehicleNumber}
              onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
              className="form-control uppercase-input font-mono font-bold"
              required
            />
            {isSyncedFromProfile && (
              <div style={{ fontSize: '11px', color: '#22c55e', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span>✓</span>
                <span>Auto-filled from your saved My Vehicle profile</span>
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '14px' }}>
            <div className="form-group">
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '12.5px', color: '#cbd5e1' }}>
                Student Name *
              </label>
              <input
                type="text"
                placeholder="Student Name"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                className="form-control"
                required
              />
            </div>

            <div className="form-group">
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '12.5px', color: '#cbd5e1' }}>
                Vehicle Type *
              </label>
              <select
                value={vehicleType}
                onChange={(e) => setVehicleType(e.target.value)}
                className="form-control"
              >
                <option value="scooty">🛵 Scooty (Ground Floor)</option>
                <option value="bike">🏍️ Bike (Basement)</option>
              </select>
            </div>
          </div>

          {errorMsg && (
            <div style={{
              marginTop: '14px',
              padding: '10px 14px',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              borderRadius: '8px',
              color: '#fca5a5',
              fontSize: '13px',
              lineHeight: '1.4'
            }}>
              ⚠️ {errorMsg}
            </div>
          )}

          <div className="modal-actions" style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
            <button
              type="submit"
              disabled={isProcessing || !isSlotsInitialized}
              className="btn btn-primary w-full"
              style={{ padding: '12px 18px', fontSize: '14px' }}
            >
              {!isSlotsInitialized
                ? '⏳ Connecting to Firestore Slots…'
                : isProcessing
                ? '🔒 Securing Slot in Firestore…'
                : `🎫 Activate Pass & Reserve Slot (${chosenSlotId || 'Bay'}) →`}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={isProcessing}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
