import { useState } from 'react'
import { XIcon, ShieldIcon } from './Icons'
import { createPermitCheckoutSession, simulateStripeWebhookPayment } from '../services/parkingApiService'

const PERMIT_TIERS = [
  { id: 'Daily', name: 'Daily Permit', price: 20, duration: '1 Day', desc: 'Valid for current date. Single entry/exit session.' },
  { id: 'Monthly', name: '30-Day Monthly Pass', price: 300, duration: '30 Days', desc: 'Unlimited gate entries during the 30-day validity window.' },
  { id: 'Semester', name: 'Semester Term Pass', price: 1200, duration: '180 Days', desc: 'Full academic term access with zero repeated payments.' }
]

export default function SlotBookingModal({
  isOpen,
  onClose,
  registeredVehicles = [],
  onPermitActivated,
  user,
  userProfile
}) {
  if (!isOpen) return null

  return (
    <SlotBookingContent
      onClose={onClose}
      registeredVehicles={registeredVehicles}
      onPermitActivated={onPermitActivated}
      user={user}
      userProfile={userProfile}
    />
  )
}

function SlotBookingContent({
  onClose,
  registeredVehicles = [],
  onPermitActivated,
  user,
  userProfile
}) {
  const [selectedTier, setSelectedTier] = useState('Monthly')
  const [vehicleNumber, setVehicleNumber] = useState(
    userProfile?.defaultPlate || userProfile?.vehicleNumber || 'MH-12-AB-1234'
  )
  const [ownerName, setOwnerName] = useState(
    userProfile?.displayName || user?.displayName || 'Student Member'
  )
  const [vehicleType, setVehicleType] = useState(
    userProfile?.vehicleType || 'scooty'
  )
  const [isProcessing, setIsProcessing] = useState(false)
  const [pendingCheckout, setPendingCheckout] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')

  const tier = PERMIT_TIERS.find(t => t.id === selectedTier) || PERMIT_TIERS[1]

  const handleSelectRegistered = (regId) => {
    if (!regId) return
    const found = registeredVehicles.find((v) => v.id === regId)
    if (found) {
      setOwnerName(found.studentName)
      setVehicleNumber(found.vehicleNumber)
      setVehicleType(found.vehicleType || 'scooty')
    }
  }

  const handleCreateCheckout = async (e) => {
    e.preventDefault()
    if (!vehicleNumber.trim()) {
      setErrorMsg('Vehicle number is required.')
      return
    }

    setIsProcessing(true)
    setErrorMsg('')

    try {
      const studentId = userProfile?.campusId || user?.uid || 'student-demo'
      const res = await createPermitCheckoutSession({
        studentId,
        studentName: ownerName.trim(),
        rollNumber: userProfile?.campusId || 'S2410701',
        stream: userProfile?.stream || 'School of Commerce',
        phoneNumber: userProfile?.phoneNumber || '+91 98765 43210',
        vehiclePlate: vehicleNumber.toUpperCase().trim(),
        vehicleType,
        permitType: selectedTier
      })

      if (res.checkoutUrl) {
        // Live Stripe Checkout session
        window.location.href = res.checkoutUrl
        return
      }

      // Test Mode session
      setPendingCheckout(res)
      setIsProcessing(false)
    } catch (err) {
      console.error('Checkout creation error:', err)
      setErrorMsg(err.message || 'Failed to initialize permit checkout.')
      setIsProcessing(false)
    }
  }

  const handleCompleteWebhookPayment = async () => {
    if (!pendingCheckout) return
    setIsProcessing(true)
    try {
      const res = await simulateStripeWebhookPayment(pendingCheckout.permitId)
      setIsProcessing(false)
      if (onPermitActivated) {
        onPermitActivated(res.permit)
      }
      onClose()
    } catch (err) {
      console.error('Webhook execution error:', err)
      setErrorMsg(err.message || 'Payment verification failed.')
      setIsProcessing(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-content glass-card slot-booking-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Buy Parking Permit"
      >
        <div className="modal-header">
          <div className="modal-title-wrap">
            <ShieldIcon className="w-5 h-5 text-cyan" />
            <h3 className="modal-title">Campus Parking Permit</h3>
          </div>
          <button type="button" className="close-btn" onClick={onClose} aria-label="Close modal">
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        {!pendingCheckout ? (
          <form onSubmit={handleCreateCheckout} className="booking-modal-body">
            {/* Explainer banner: Dynamic allocation */}
            <div style={{
              background: 'rgba(56, 189, 248, 0.08)',
              border: '1px solid rgba(56, 189, 248, 0.25)',
              borderRadius: '10px',
              padding: '12px 16px',
              marginBottom: '16px'
            }}>
              <p style={{ margin: 0, fontSize: '13px', color: '#e2e8f0', lineHeight: '1.4' }}>
                🛡️ <strong>Dynamic Bay Allocation:</strong> Permits belong to your vehicle profile. Physical parking bays are not locked permanently — your nearest compatible bay ({vehicleType === 'bike' ? 'Basement' : 'Ground Floor'}) is dynamically assigned each time you arrive at the gate.
              </p>
            </div>

            {/* Select Permit Tier */}
            <div className="form-group">
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '13px', color: '#cbd5e1' }}>
                Select Permit Tier
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
                onChange={(e) => setVehicleNumber(e.target.value)}
                className="form-control uppercase-input font-mono font-bold"
                required
              />
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
              <div style={{ marginTop: '14px', padding: '8px 12px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', color: '#fca5a5', fontSize: '12.5px' }}>
                {errorMsg}
              </div>
            )}

            <div className="modal-actions" style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
              <button
                type="submit"
                disabled={isProcessing}
                className="btn btn-primary w-full"
              >
                {isProcessing ? 'Connecting to Stripe…' : `Proceed to Stripe Payment (₹${tier.price}) &rarr;`}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          /* Stripe Test Simulation Card */
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '42px', marginBottom: '10px' }}>💳</div>
            <h4 style={{ margin: '0 0 6px', color: '#f8fafc', fontSize: '18px' }}>
              Stripe Checkout (Test Mode)
            </h4>
            <p style={{ margin: '0 0 16px', color: '#94a3b8', fontSize: '13px' }}>
              Permit created with session: <code style={{ color: '#38bdf8' }}>{pendingCheckout.sessionId}</code>
            </p>

            <div style={{
              background: 'rgba(15, 23, 42, 0.7)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '20px',
              textAlign: 'left'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: '#94a3b8', fontSize: '13px' }}>Permit Tier:</span>
                <strong style={{ color: '#f1f5f9', fontSize: '13px' }}>{selectedTier} ({tier.duration})</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: '#94a3b8', fontSize: '13px' }}>Vehicle:</span>
                <strong style={{ color: '#38bdf8', fontFamily: 'monospace', fontSize: '13px' }}>{vehicleNumber.toUpperCase()}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#94a3b8', fontSize: '13px' }}>Amount Due:</span>
                <strong style={{ color: '#10b981', fontSize: '16px' }}>₹{tier.price}</strong>
              </div>
            </div>

            <div style={{
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '8px',
              padding: '10px 14px',
              marginBottom: '20px',
              fontSize: '12px',
              color: '#6ee7b7'
            }}>
              ⚡ <strong>Webhook Verification:</strong> Clicking below triggers the verified backend Stripe webhook handler to mark the permit as PAID and generate your real secure QR code.
            </div>

            {errorMsg && (
              <div style={{ marginBottom: '14px', padding: '8px 12px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', color: '#fca5a5', fontSize: '12.5px' }}>
                {errorMsg}
              </div>
            )}

            <button
              type="button"
              disabled={isProcessing}
              className="btn btn-primary w-full"
              style={{ padding: '12px', fontSize: '15px' }}
              onClick={handleCompleteWebhookPayment}
            >
              {isProcessing ? 'Verifying Webhook…' : '✅ Verify Stripe Webhook & Issue Active QR'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
