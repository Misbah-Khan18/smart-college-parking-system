import { useState, useEffect } from 'react'
import QRCode from 'qrcode'
import { XIcon, ShieldIcon, CheckIcon } from './Icons'
import { playScannerBeep, playSuccessChime, playGateOpenBuzz } from '../utils/gateAudio'
import './MetroGatePaymentGateway.css'

export default function PassModal({ pass, onClose }) {
  const qrToken = pass ? (pass.qrToken || pass.passId || pass.reservationId || pass.id || '') : ''
  const [copied, setCopied] = useState(false)
  const [qrSrc, setQrSrc] = useState('')
  const [qrGenerating, setQrGenerating] = useState(Boolean(pass && qrToken))
  const [qrError, setQrError] = useState(!pass || !qrToken)

  // System.in Gate Reader state: 'idle' | 'scanning' | 'granted'
  const [gateScanState, setGateScanState] = useState('idle')
  const [barrierOpen, setBarrierOpen] = useState(false)

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

  // Trigger System.in Optical Scan
  const handleScanAtGate = () => {
    if (gateScanState === 'scanning' || gateScanState === 'granted') return
    playScannerBeep()
    setGateScanState('scanning')

    setTimeout(() => {
      playSuccessChime()
      playGateOpenBuzz()
      setGateScanState('granted')
      setBarrierOpen(true)
    }, 1200)
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
              <div className="qr-image-wrap" style={{ minHeight: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {qrSrc && !qrError ? (
                  <img
                    src={qrSrc}
                    alt="Campus Permit Verification QR Code"
                    width={200}
                    height={200}
                    onError={() => setQrError(true)}
                    style={{ display: 'block', borderRadius: '8px', background: '#fff', padding: '4px' }}
                  />
                ) : qrGenerating && !qrError ? (
                  <div style={{ width: 200, height: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(15, 23, 42, 0.6)', borderRadius: '8px' }}>
                    <div className="live-dot-pulse mb-2" style={{ background: '#38bdf8', width: 12, height: 12 }}></div>
                    <span className="text-2xs font-mono text-muted">Generating Secure QR...</span>
                  </div>
                ) : (
                  <div style={{ width: 200, height: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(15, 23, 42, 0.8)', borderRadius: '8px', border: '1px dashed #64748b' }}>
                    <ShieldIcon className="w-8 h-8 text-cyan mb-1" />
                    <span className="text-2xs font-mono text-slate-300">PASS CODE</span>
                    <code className="text-xs font-mono text-cyan mt-1">{qrToken}</code>
                  </div>
                )}
              </div>
              <p className="qr-hint">
                Scan at SOCMAC Smart Park Boom Barrier for contactless gate ingress
              </p>
              {qrToken && (
                <div className="qr-token-row">
                  <code className="qr-token-code">{qrToken}</code>
                  <button
                    type="button"
                    onClick={handleCopyToken}
                    className="btn btn-sm btn-secondary"
                    style={{ padding: '4px 10px', fontSize: '11px', flexShrink: 0 }}
                    title="Copy Token"
                  >
                    {copied ? <CheckIcon className="w-3 h-3 text-emerald" /> : '📋 Copy'}
                  </button>
                </div>
              )}
            </div>

            {/* ── ENTRY GATE BARRIER SCANNER ── */}
            <div className="entry-gate-scanner-card">
              <div className="scanner-card-header">
                <div className="scanner-badge">
                  <span className={`scanner-status-dot ${gateScanState === 'granted' ? 'dot-green' : ''}`} />
                  <span>Entry Gate Scanner</span>
                </div>
                <span className="scanner-state-label font-mono">
                  {gateScanState === 'granted' ? 'GATE OPEN' : gateScanState === 'scanning' ? 'VERIFYING...' : 'READY'}
                </span>
              </div>

              {gateScanState === 'idle' && (
                <button
                  type="button"
                  id="btn-scan-at-gate"
                  className="btn-scan-at-gate"
                  onClick={handleScanAtGate}
                >
                  <span>📲 Tap to Scan Pass &amp; Open Gate Barrier</span>
                </button>
              )}

              {gateScanState === 'scanning' && (
                <div className="scanner-active-view font-mono">
                  <div className="scanner-laser-bar" />
                  <span className="scanner-scanning-text">Verifying parking pass at gate...</span>
                </div>
              )}

              {gateScanState === 'granted' && (
                <div className="gate-open-success-view">
                  <div className="gate-barrier-row">
                    <div className="barrier-pillar">
                      <div className="pillar-light" />
                    </div>
                    <div className={`barrier-pole ${barrierOpen ? 'barrier-up' : ''}`} />
                    <span className="gate-status-pill font-mono">BARRIER OPEN</span>
                  </div>
                  <p className="gate-success-msg">
                    ✅ Barrier raised! Proceed to park in Bay {assignedSlotId || 'G-76'}.
                  </p>
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
