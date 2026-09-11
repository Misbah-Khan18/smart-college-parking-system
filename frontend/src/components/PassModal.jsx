import { useState } from 'react'
import { XIcon, ShieldIcon, CheckIcon } from './Icons'

export default function PassModal({ pass, onClose }) {
  const [copied, setCopied] = useState(false)
  if (!pass) return null

  const displayPassId = pass.id || pass.passId || 'SMP-PERMIT-CURRENT'
  const permitType = pass.permitType || pass.passType || 'Monthly Pass'
  const isMonthly = permitType.includes('Monthly')
  const isSemester = permitType.includes('Semester')
  const isDaily = permitType.includes('Daily')

  const validUntilStr = pass.validUntil
    ? new Date(pass.validUntil).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : (pass.reservedUntil || '30 Days Active')

  const qrSrc = pass.qrCodeDataUrl || pass.qrCode
  const qrToken = pass.qrToken || pass.id

  const handleCopyToken = () => {
    if (qrToken) {
      navigator.clipboard.writeText(qrToken).catch(() => {})
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  // Dynamic bay assignment status
  const currentSlotId = pass.currentAssignedSlotId || (pass.slotId && pass.slotId !== 'DYNAMIC' ? pass.slotId : null)

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content glass-card pass-card-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-wrap">
            <ShieldIcon className="w-5 h-5 text-emerald" />
            <h3 className="modal-title">
              {isSemester ? 'Semester Term Pass' : isMonthly ? '30-Day Monthly Permit' : isDaily ? 'Daily Parking Permit' : 'Official Campus Permit'}
            </h3>
          </div>
          <button type="button" className="close-btn" onClick={onClose} aria-label="Close pass modal">
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="pass-ticket">
          <div className="ticket-top">
            <div className="college-header">
              <h4>SCHOOL OF COMMERCE &bull; SMART PARKING</h4>
              <span className="ticket-id">PERMIT #{displayPassId}</span>
            </div>
            <div className={`status-ribbon ${isMonthly || isSemester ? 'monthly' : ''}`}>
              <span className="pulse-indicator"></span>
              <span>{pass.paymentStatus === 'PAID' || pass.status === 'ACTIVE' ? 'VERIFIED & ACTIVE' : 'PENDING'}</span>
            </div>
          </div>

          <div className="ticket-body">
            {/* Dynamic Bay Assignment Banner */}
            <div className="slot-hero-badge">
              <span className="slot-hero-label">
                {currentSlotId ? 'CURRENTLY ASSIGNED BAY' : 'PARKING BAY ASSIGNMENT'}
              </span>
              <span className="slot-hero-id font-mono">
                {currentSlotId || 'DYNAMIC'}
              </span>
              <span className="slot-hero-zone">
                {currentSlotId
                  ? `${pass.floor || 'Campus Level'} &bull; In Active Session`
                  : 'Nearest bay dynamically allocated at Gate Ingress (Scooty &rarr; Ground Floor, Bike &rarr; Basement)'}
              </span>
            </div>

            <div className="ticket-details-grid">
              <div className="detail-item">
                <span className="detail-label">Vehicle Plate</span>
                <span className="detail-val plate-styled">{pass.vehiclePlate || pass.plate || 'REGISTERED'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Owner / Holder</span>
                <span className="detail-val">{pass.studentName || pass.owner || 'Campus Member'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Permit Tier</span>
                <span className="detail-val badge-category">
                  {permitType} ({pass.vehicleType === 'bike' ? '🏍️ Bike' : '🛵 Scooty'})
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Valid Until</span>
                <span className="detail-val text-emerald font-bold">
                  {validUntilStr}
                </span>
              </div>
            </div>

            {/* Real QR Section */}
            <div className="qr-section">
              <div className="qr-box" style={{ background: '#ffffff', padding: '8px', borderRadius: '12px', display: 'inline-block' }}>
                {qrSrc ? (
                  <img
                    src={qrSrc}
                    alt="Campus Permit Verification QR Code"
                    width={180}
                    height={180}
                    style={{ display: 'block', borderRadius: '6px' }}
                  />
                ) : (
                  <div style={{ width: 180, height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '12px', textAlign: 'center', padding: '12px' }}>
                    Payment verification pending. Complete Stripe checkout to generate QR.
                  </div>
                )}
              </div>
              <p className="qr-hint">
                Scan at School of Commerce Boom Barrier Reader for Contactless Ingress
              </p>
              {qrToken && (
                <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <code style={{ fontSize: '11px', background: 'rgba(255,255,255,0.08)', padding: '3px 8px', borderRadius: '4px', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {qrToken}
                  </code>
                  <button
                    type="button"
                    onClick={handleCopyToken}
                    className="btn btn-sm btn-secondary"
                    style={{ padding: '3px 8px', fontSize: '11px' }}
                    title="Copy Token to Gate Simulator"
                  >
                    {copied ? <CheckIcon className="w-3 h-3 text-emerald" /> : '📋 Copy'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Done
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => window.print()}
          >
            🖨️ Print / Save Pass
          </button>
        </div>
      </div>
    </div>
  )
}
