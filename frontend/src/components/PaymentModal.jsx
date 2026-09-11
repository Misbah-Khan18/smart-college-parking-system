import { useState } from 'react'
import { XIcon } from './Icons'

// UPI payment details for parking admin
const UPI_ID = 'parking.soc@upi'
const MERCHANT_NAME = 'SOC Smart Parking'
const PARKING_FEE = 10

// Build UPI deeplink for GPay / PhonePe / Paytm
function buildUPILink({ upiId, name, amount, note }) {
  const params = new URLSearchParams({
    pa: upiId,
    pn: name,
    am: String(amount),
    cu: 'INR',
    tn: note
  })
  return `upi://pay?${params.toString()}`
}

// Generates a Google Chart API QR code image (scannable, real UPI link)
function UPIQRCode({ upiLink, size = 200 }) {
  const encoded = encodeURIComponent(upiLink)
  const src = `https://chart.googleapis.com/chart?chs=${size}x${size}&cht=qr&chl=${encoded}&choe=UTF-8`
  return (
    <>
      <img
        src={src}
        alt="GPay / UPI Payment QR Code"
        width={size}
        height={size}
        className="payment-qr-img"
        onError={(e) => {
          e.target.style.display = 'none'
          const sibling = e.target.nextSibling
          if (sibling) sibling.style.display = 'block'
        }}
      />
      {/* Fallback SVG if Google Charts is unreachable */}
      <svg
        viewBox="0 0 100 100"
        width={size - 20}
        height={size - 20}
        className="payment-qr-fallback"
        style={{ display: 'none' }}
      >
        <rect x="5" y="5" width="26" height="26" fill="#000" rx="3" />
        <rect x="9" y="9" width="18" height="18" fill="#fff" />
        <rect x="13" y="13" width="10" height="10" fill="#000" />
        <rect x="69" y="5" width="26" height="26" fill="#000" rx="3" />
        <rect x="73" y="9" width="18" height="18" fill="#fff" />
        <rect x="77" y="13" width="10" height="10" fill="#000" />
        <rect x="5" y="69" width="26" height="26" fill="#000" rx="3" />
        <rect x="9" y="73" width="18" height="18" fill="#fff" />
        <rect x="13" y="77" width="10" height="10" fill="#000" />
        <rect x="36" y="8" width="6" height="6" fill="#000" />
        <rect x="46" y="8" width="6" height="6" fill="#000" />
        <rect x="56" y="8" width="6" height="6" fill="#000" />
        <rect x="36" y="18" width="6" height="6" fill="#000" />
        <rect x="46" y="24" width="6" height="6" fill="#000" />
        <rect x="56" y="18" width="6" height="6" fill="#000" />
        <rect x="8" y="36" width="6" height="6" fill="#000" />
        <rect x="18" y="36" width="6" height="6" fill="#000" />
        <rect x="28" y="36" width="6" height="6" fill="#000" />
        <rect x="38" y="36" width="6" height="6" fill="#000" />
        <rect x="48" y="36" width="6" height="6" fill="#000" />
        <rect x="58" y="36" width="6" height="6" fill="#000" />
        <rect x="68" y="36" width="6" height="6" fill="#000" />
        <rect x="78" y="36" width="6" height="6" fill="#000" />
        <rect x="88" y="36" width="6" height="6" fill="#000" />
        <rect x="36" y="46" width="6" height="6" fill="#000" />
        <rect x="52" y="46" width="6" height="6" fill="#000" />
        <rect x="68" y="46" width="6" height="6" fill="#000" />
        <rect x="36" y="58" width="6" height="6" fill="#000" />
        <rect x="48" y="58" width="6" height="6" fill="#000" />
        <rect x="62" y="58" width="6" height="6" fill="#000" />
        <rect x="76" y="58" width="6" height="6" fill="#000" />
        <rect x="36" y="70" width="6" height="6" fill="#000" />
        <rect x="50" y="70" width="6" height="6" fill="#000" />
        <rect x="64" y="70" width="6" height="6" fill="#000" />
        <rect x="80" y="70" width="6" height="6" fill="#000" />
        <rect x="36" y="82" width="6" height="6" fill="#000" />
        <rect x="48" y="82" width="6" height="6" fill="#000" />
        <rect x="60" y="82" width="6" height="6" fill="#000" />
        <rect x="74" y="82" width="6" height="6" fill="#000" />
        <rect x="86" y="82" width="6" height="6" fill="#000" />
      </svg>
    </>
  )
}

export default function PaymentModal({ bookingData, onPaymentSuccess, onClose }) {
  const [step, setStep] = useState('pay') // 'pay' | 'confirming' | 'done'

  if (!bookingData) return null

  const { slotId, vehicleNumber, passType } = bookingData
  const isMonthly = passType === 'Monthly Pass'
  // ₹300 for Monthly Pass, ₹10 flat fee for regular slot bookings
  const fee = isMonthly ? 300 : PARKING_FEE

  const upiNote = `Parking Bay ${slotId} - ${vehicleNumber}`
  const upiLink = buildUPILink({
    upiId: UPI_ID,
    name: MERCHANT_NAME,
    amount: fee,
    note: upiNote
  })

  const handlePaidClick = () => {
    setStep('confirming')
    // Dummy verification: 1.8s wait → "verified" → calls onPaymentSuccess
    setTimeout(() => {
      setStep('done')
      setTimeout(() => {
        onPaymentSuccess()
      }, 900)
    }, 1800)
  }

  return (
    <div className="modal-backdrop payment-backdrop" onClick={step === 'pay' ? onClose : undefined}>
      <div
        className="payment-modal-card glass-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Payment"
      >
        {/* Header */}
        <div className="payment-modal-header">
          <div className="payment-header-left">
            <span className="payment-icon-wrap">💳</span>
            <div>
              <h3 className="payment-title">Campus Parking Fee</h3>
              <p className="payment-subtitle">Pay ₹{fee} to complete your reservation</p>
            </div>
          </div>
          {step === 'pay' && (
            <button
              type="button"
              className="close-btn"
              onClick={onClose}
              aria-label="Close payment"
            >
              <XIcon className="w-5 h-5" />
            </button>
          )}
        </div>

        {step === 'pay' && (
          <>
            {/* Fee Banner */}
            <div className="payment-fee-banner">
              <div className="fee-amount-display">
                <span className="fee-rupee">₹</span>
                <span className="fee-value">{fee}</span>
                <span className="fee-flat-label">FLAT</span>
              </div>
              <div className="fee-meta">
                <span className="fee-note">Bay {slotId} · {isMonthly ? 'Monthly Pass' : 'Slot Booking'}</span>
                <span className="fee-vehicle">{vehicleNumber}</span>
              </div>
            </div>

            {/* UPI ID strip */}
            <div className="upi-info-strip">
              <span className="upi-chip">UPI ID</span>
              <span className="upi-id-text">{UPI_ID}</span>
              <span className="upi-merchant-label">{MERCHANT_NAME}</span>
            </div>

            {/* QR Code */}
            <div className="payment-qr-section">
              <p className="qr-scan-label">📷 Scan with any UPI app</p>
              <div className="payment-qr-box">
                <UPIQRCode upiLink={upiLink} size={200} />
              </div>
              <div className="upi-app-logos">
                <span>🟢 GPay</span>
                <span>🟣 PhonePe</span>
                <span>🔵 Paytm</span>
                <span>🟠 BHIM</span>
              </div>
            </div>

            {/* Or tap to open app */}
            <a
              href={upiLink}
              className="btn btn-gpay"
              rel="noopener noreferrer"
            >
              <span>📱 Open GPay / UPI App</span>
            </a>

            {/* Disclaimer */}
            <p className="payment-disclaimer">
              ⚠️ Payment is collected by <strong>SOC Parking Admin</strong> and not processed through this app.
              This is a demo — your phone's GPay will open but <strong>no money is deducted</strong> from this interface.
            </p>

            {/* CTA */}
            <div className="payment-actions">
              <button
                type="button"
                id="btn-ive-paid"
                className="btn btn-payment-done"
                onClick={handlePaidClick}
              >
                ✅ I've Paid — Confirm Booking
              </button>
              <button
                type="button"
                className="btn btn-payment-cancel"
                onClick={onClose}
              >
                Cancel
              </button>
            </div>
          </>
        )}

        {/* Confirming state */}
        {step === 'confirming' && (
          <div className="payment-confirming-state">
            <div className="payment-spinner" />
            <p className="confirming-text">Verifying payment...</p>
            <p className="confirming-sub">Checking with campus payment gateway</p>
          </div>
        )}

        {/* Done state */}
        {step === 'done' && (
          <div className="payment-success-state">
            <div className="payment-success-checkmark">✅</div>
            <p className="payment-success-text">Payment Verified!</p>
            <p className="payment-success-sub">Locking in your parking slot...</p>
          </div>
        )}
      </div>
    </div>
  )
}
