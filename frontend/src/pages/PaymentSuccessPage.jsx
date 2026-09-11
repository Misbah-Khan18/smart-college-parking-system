import { useState, useEffect } from 'react'
import { verifyPaymentSession } from '../services/paymentService'
import { ShieldIcon, CheckIcon, AlertCircleIcon } from '../components/Icons'
import PassModal from '../components/PassModal'

export default function PaymentSuccessPage({ onNavigateHome }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [sessionData, setSessionData] = useState(null)
  const [showPassModal, setShowPassModal] = useState(false)

  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search)
    const sessionId = queryParams.get('session_id')
    const regId = queryParams.get('reg_id')

    if (!sessionId) {
      setError('No payment session found in URL.')
      setLoading(false)
      return
    }

    async function loadSession() {
      try {
        const data = await verifyPaymentSession(sessionId)
        setSessionData(data)
      } catch (err) {
        console.error('Session verify failed:', err)
        setError(err.message || 'Could not verify payment session.')
      } finally {
        setLoading(false)
      }
    }

    loadSession()
  }, [])

  if (loading) {
    return (
      <div className="payment-return-container">
        <div className="payment-card glass-card text-center">
          <div className="payment-spinner"></div>
          <h2 className="mt-3">Verifying Stripe Webhook Payment...</h2>
          <p className="text-muted">Minting your cryptographically secure campus QR parking permit</p>
        </div>
      </div>
    )
  }

  if (error || !sessionData?.permit) {
    return (
      <div className="payment-return-container">
        <div className="payment-card glass-card text-center">
          <div className="payment-status-icon error">⚠️</div>
          <h2>Payment Verification Pending</h2>
          <p className="text-muted mt-2">{error || 'Permit details could not be retrieved.'}</p>
          <button
            type="button"
            className="btn btn-secondary mt-4"
            onClick={() => {
              window.location.href = '/'
            }}
          >
            Return to Campus Dashboard
          </button>
        </div>
      </div>
    )
  }

  const { permit, registration } = sessionData
  const qrImage = permit.qrCodeDataUrl || ''

  return (
    <div className="payment-return-container">
      <div className="payment-card glass-card">
        {/* Success Header */}
        <div className="payment-success-header">
          <div className="payment-status-icon success">
            <CheckIcon className="w-8 h-8 text-white" />
          </div>
          <span className="payment-badge-status">STRIPE PAYMENT VERIFIED • ACTIVE</span>
          <h1 className="payment-title">Payment Successful!</h1>
          <p className="payment-subtitle">
            Your vehicle has been registered and authorized for School of Commerce parking.
          </p>
        </div>

        {/* Transaction & Permit Summary Box */}
        <div className="payment-details-box">
          <div className="pdb-row">
            <span className="pdb-label">Permit Pass ID</span>
            <strong className="pdb-val font-mono text-cyan">{permit.passId}</strong>
          </div>
          <div className="pdb-row">
            <span className="pdb-label">Student Holder</span>
            <span className="pdb-val">{permit.studentName} ({permit.rollNumber})</span>
          </div>
          <div className="pdb-row">
            <span className="pdb-label">Vehicle Plate</span>
            <span className="plate-badge-mono font-mono font-bold">{permit.vehicleNumber}</span>
          </div>
          <div className="pdb-row">
            <span className="pdb-label">Designated Floor</span>
            <span className="pdb-val font-bold">{permit.allocatedFloor}</span>
          </div>
          <div className="pdb-row">
            <span className="pdb-label">Permit Plan</span>
            <span className="pdb-val">{permit.planName} (Paid ₹{permit.amountPaidINR})</span>
          </div>
          <div className="pdb-row">
            <span className="pdb-label">Valid Until</span>
            <span className="pdb-val text-emerald font-bold">
              {new Date(permit.expiresAt).toLocaleDateString([], {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              })}
            </span>
          </div>
        </div>

        {/* Dynamic QR Code Pass Card */}
        <div className="qr-pass-showcase">
          <div className="qr-img-wrapper">
            {qrImage ? (
              <img src={qrImage} alt="Secure QR Permit Code" className="qr-img" />
            ) : (
              <div className="qr-box-fallback font-mono">SECURE QR</div>
            )}
          </div>
          <div className="qr-info-right">
            <h4>Encrypted Gate QR Permit</h4>
            <p className="text-muted text-xs">
              This QR code encodes a signed cryptographic token. Scan directly at Gate 1 &amp; Gate 2 sensors for instant automated boom barrier entry.
            </p>
            <div className="qr-security-tag">
              <span>🛡️ Zero Card Data Encoded • Signed Security Token</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="payment-actions-row">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              window.location.href = '/'
            }}
          >
            &larr; Back to Dashboard
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => window.print()}
          >
            🖨️ Print / Save Official Receipt &amp; Pass
          </button>
        </div>
      </div>
    </div>
  )
}
