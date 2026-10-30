import { useState, useEffect } from 'react'
import QRCode from 'qrcode'
import { XIcon, ShieldIcon, CheckIcon } from './Icons'

export default function PassModal({ pass, onClose }) {
  const qrToken = pass ? (pass.qrToken || pass.passId || pass.reservationId || pass.id || '') : ''
  const [copied, setCopied] = useState(false)
  const [qrSrc, setQrSrc] = useState('')
  const [qrGenerating, setQrGenerating] = useState(Boolean(pass && qrToken))
  const [qrError, setQrError] = useState(!pass || !qrToken)

  useEffect(() => {
    let isMounted = true

    if (!pass || !qrToken) {
      return
    }

    QRCode.toDataURL(qrToken, {
      width: 200,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff'
      },
      errorCorrectionLevel: 'M'
    })
      .then((url) => {
        if (isMounted) {
          setQrSrc(url)
          setQrGenerating(false)
          setQrError(false)
        }
      })
      .catch((err) => {
        console.error('[PassModal] Client-side QR generation error:', err)
        if (isMounted) {
          setQrSrc('')
          setQrGenerating(false)
          setQrError(true)
        }
      })

    return () => {
      isMounted = false
    }
  }, [pass, qrToken])

  if (!pass) return null

  const displayPassId = pass.id || pass.passId || 'SOC-PASS-CURRENT'
  const permitType = pass.permitType || pass.passType || 'Parking Pass'
  const isMonthly = permitType.includes('Monthly')
  const isSemester = permitType.includes('Semester')
  const isDaily = permitType.includes('Daily')

  const validUntilStr = pass.validUntil
    ? (pass.validUntil.includes('T') ? new Date(pass.validUntil).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : pass.validUntil)
    : (pass.reservedUntil || 'Active Session')

  const handleCopyToken = () => {
    if (qrToken) {
      navigator.clipboard.writeText(qrToken).catch(() => {})
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  // Assigned bay
  const assignedSlotId = pass.slotId && pass.slotId !== 'DYNAMIC' ? pass.slotId : (pass.currentAssignedSlotId || null)
  const zoneInfo = pass.zone || (pass.section ? `${pass.floor || 'Campus'} - ${pass.section}` : `${pass.floor || 'Ground Floor'} Parking`)

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content glass-card pass-card-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-wrap">
            <ShieldIcon className="w-5 h-5 text-emerald" />
            <h3 className="modal-title">
              {assignedSlotId ? `Reserved Bay Pass (${assignedSlotId})` : isSemester ? 'Semester Term Pass' : isMonthly ? '30-Day Monthly Permit' : isDaily ? 'Daily Parking Permit' : 'Official Campus Pass'}
            </h3>
          </div>
          <button type="button" className="close-btn" onClick={onClose} aria-label="Close pass modal">
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="pass-ticket">
          <div className="ticket-top">
            <div className="college-header">
              <h4>SOCMAC &bull; SMART PARK</h4>
              <span className="ticket-id">PERMIT #{displayPassId}</span>
            </div>
            <div className={`status-ribbon ${isMonthly || isSemester ? 'monthly' : ''}`}>
              <span className="pulse-indicator"></span>
              <span>{pass.status === 'ACTIVE' || pass.paymentStatus === 'PAID' || pass.reservationStatus === 'Reserved' ? 'VERIFIED & ACTIVE' : 'RESERVED'}</span>
            </div>
          </div>

          <div className="ticket-body">
            {/* Slot Hero Badge */}
            <div className="slot-hero-badge">
              <span className="slot-hero-label">
                {assignedSlotId ? 'RESERVED PARKING BAY' : 'PARKING BAY ASSIGNMENT'}
              </span>
              <span className="slot-hero-id font-mono">
                {assignedSlotId || 'DYNAMIC'}
              </span>
              <span className="slot-hero-zone">
                {assignedSlotId
                  ? `${zoneInfo} • Status: Reserved`
                  : 'Nearest bay dynamically allocated at Gate Ingress (Scooty → Ground Floor, Bike → Basement)'}
              </span>
            </div>

            <div className="ticket-details-grid">
              <div className="detail-item">
                <span className="detail-label">Vehicle Plate</span>
                <span className="detail-val plate-styled">{pass.vehiclePlate || pass.plate || 'REGISTERED'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Owner / Holder</span>
                <span className="detail-val">{pass.studentName || pass.userName || pass.owner || 'Campus Member'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Pass Type</span>
                <span className="detail-val badge-category">
                  {permitType} ({pass.vehicleType === 'bike' ? '🏍️ Bike' : '🛵 Scooty'})
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Validity / Time</span>
                <span className="detail-val text-emerald font-bold">
                  {pass.entryTime ? `${pass.entryTime} • ` : ''}{validUntilStr}
                </span>
              </div>
            </div>

            {/* QR Section */}
            <div className="qr-section">
              <div className="qr-badge-header" style={{ textAlign: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '1.5px', color: '#38bdf8', textTransform: 'uppercase', background: 'rgba(56, 189, 248, 0.12)', padding: '3px 10px', borderRadius: '999px', border: '1px solid rgba(56, 189, 248, 0.25)' }}>
                  PARKING ENTRY QR
                </span>
              </div>
              <div className="qr-image-wrap" style={{ minHeight: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {qrSrc && !qrError ? (
                  <img
                    src={qrSrc}
                    alt="Campus Parking Entry QR Code"
                    width={200}
                    height={200}
                    onError={() => setQrError(true)}
                    style={{ display: 'block', borderRadius: '8px', background: '#fff', padding: '4px' }}
                  />
                ) : qrGenerating && !qrError ? (
                  <div style={{ width: 200, height: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(15, 23, 42, 0.6)', borderRadius: '8px' }}>
                    <div className="live-dot-pulse mb-2" style={{ background: '#38bdf8', width: 12, height: 12 }}></div>
                    <span className="text-2xs font-mono text-muted">Generating Secure Entry QR...</span>
                  </div>
                ) : (
                  <div style={{ width: 200, height: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(15, 23, 42, 0.8)', borderRadius: '8px', border: '1px dashed #64748b' }}>
                    <ShieldIcon className="w-8 h-8 text-cyan mb-1" />
                    <span className="text-2xs font-mono text-slate-300">ENTRY PASS CODE</span>
                    <code className="text-xs font-mono text-cyan mt-1">{qrToken}</code>
                  </div>
                )}
              </div>
              <p className="qr-hint" style={{ fontWeight: 600, color: '#e2e8f0', marginTop: '8px' }}>
                Show this QR to Security at the parking gate
              </p>
              <p className="text-2xs text-muted" style={{ textAlign: 'center', marginTop: '2px', fontSize: '11px' }}>
                Single-use entry token. Automatically activates bay occupancy at barrier ingress.
              </p>
              {qrToken && (
                <div className="qr-token-row">
                  <code className="qr-token-code">{qrToken}</code>
                  <button
                    type="button"
                    onClick={handleCopyToken}
                    className="btn btn-sm btn-secondary"
                    style={{ padding: '4px 10px', fontSize: '11px', flexShrink: 0 }}
                    title="Copy Entry Token"
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
