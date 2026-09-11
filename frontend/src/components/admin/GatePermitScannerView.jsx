import { useState, useEffect } from 'react'
import {
  ShieldIcon,
  CheckIcon,
  AlertCircleIcon,
  SearchIcon,
  QrIcon
} from '../Icons'
import { verifyPermitAccess, fetchAllVerifiedPermits } from '../../services/paymentService'

export default function GatePermitScannerView({ showToast }) {
  const [tokenInput, setTokenInput] = useState('')
  const [gateFloor, setGateFloor] = useState('Ground Floor')
  const [scannedPlate, setScannedPlate] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const [verificationResult, setVerificationResult] = useState(null)
  const [recentPermits, setRecentPermits] = useState([])
  const [barrierState, setBarrierState] = useState('closed') // 'closed' | 'opening' | 'open' | 'closing'

  // Load verified permits from backend on mount
  useEffect(() => {
    async function loadPermits() {
      const list = await fetchAllVerifiedPermits()
      setRecentPermits(list)
    }
    loadPermits()
  }, [])

  const handleVerify = async (e) => {
    if (e) e.preventDefault()
    if (!tokenInput.trim() && !scannedPlate.trim()) return

    setIsVerifying(true)
    setVerificationResult(null)

    try {
      const result = await verifyPermitAccess({
        token: tokenInput.trim(),
        passId: tokenInput.trim(),
        scannedVehiclePlate: scannedPlate.trim(),
        gateFloor
      })

      setVerificationResult(result)

      if (result.access === 'GRANTED') {
        setBarrierState('opening')
        setTimeout(() => {
          setBarrierState('open')
          setTimeout(() => {
            setBarrierState('closing')
            setTimeout(() => setBarrierState('closed'), 800)
          }, 4000)
        }, 600)

        if (showToast) {
          showToast('Access Granted', `Permit verified for ${result.permitDetails.vehicleNumber}. Barrier opened.`, 'success')
        }
      } else {
        setBarrierState('closed')
        if (showToast) {
          showToast('Access Denied', result.reason || 'Permit validation failed.', 'error')
        }
      }
    } catch (err) {
      console.error('Gate check error:', err)
      setVerificationResult({
        access: 'DENIED',
        reason: 'Internal gate scanner communication error.'
      })
    } finally {
      setIsVerifying(false)
    }
  }

  // Quick auto-populate helper from recently paid permits list
  const handleSelectRecentPermit = (p) => {
    setTokenInput(p.secureToken || p.passId)
    setScannedPlate(p.vehicleNumber)
    setGateFloor(p.allocatedFloor)
  }

  return (
    <div className="admin-page-container">
      {/* Page Header */}
      <div className="page-section-header glass-card">
        <div className="psh-badge">
          <span className="badge-icon">🛡️</span>
          <span>CAMPUS SECURITY RFID &amp; QR SCANNER</span>
        </div>
        <h1 className="psh-title">
          Gate QR Permit <span className="gradient-text">Verification Terminal</span>
        </h1>
        <p className="psh-subtitle">
          Real-time security gate ingress scanner. Validates cryptographic permit tokens, verifies Stripe payment status, checks expiration windows, and triggers automated barrier access.
        </p>
      </div>

      <div className="terminal-grid-two">
        {/* Left: QR / Token Scanner Terminal */}
        <div className="terminal-form-card glass-card">
          <div className="card-header-clean">
            <div className="flex items-center gap-2">
              <QrIcon className="w-5 h-5 text-cyan" />
              <h3>Scan / Enter Permit Token</h3>
            </div>
            <span className="telemetry-live-tag">
              <span className="live-dot-pulse"></span>
              <span>GATE 1 ONLINE</span>
            </span>
          </div>

          <form onSubmit={handleVerify} className="scanner-form mt-3">
            {/* Input: Token / Pass ID */}
            <div className="form-group">
              <label htmlFor="gate-token-input">
                Permit Token or Pass ID <span className="required-star">*</span>
              </label>
              <div className="input-wrapper">
                <input
                  id="gate-token-input"
                  type="text"
                  placeholder="Paste secure token (e.g. e4f7... or SOC-G-1234)"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  className="font-mono"
                  required
                />
              </div>
            </div>

            {/* Optional Gate Sensor Inputs */}
            <div className="form-grid-2">
              <div className="form-group">
                <label>Gate Floor Sensor Location</label>
                <select
                  value={gateFloor}
                  onChange={(e) => setGateFloor(e.target.value)}
                  className="custom-select"
                >
                  <option value="Ground Floor">Ground Floor Gate (Scooties)</option>
                  <option value="Basement">Basement Ramp Gate (Bikes)</option>
                </select>
              </div>

              <div className="form-group">
                <label>Simulated ANPR Plate Camera</label>
                <input
                  type="text"
                  placeholder="Optional plate camera input"
                  value={scannedPlate}
                  onChange={(e) => setScannedPlate(e.target.value.toUpperCase())}
                  className="font-mono custom-input"
                />
              </div>
            </div>

            <div className="scanner-actions-row">
              <button
                type="submit"
                className="btn btn-primary submit-verify-btn"
                disabled={isVerifying}
              >
                {isVerifying ? 'Verifying with Backend...' : '⚡ Verify & Trigger Barrier'}
              </button>
            </div>
          </form>

          {/* Quick Select from Active Permits */}
          {recentPermits.length > 0 && (
            <div className="recent-permits-box mt-4">
              <span className="recent-label">Quick Test with Active Verified Permits:</span>
              <div className="recent-permits-scroll">
                {recentPermits.map((p) => (
                  <button
                    key={p.passId}
                    type="button"
                    className="recent-permit-chip"
                    onClick={() => handleSelectRecentPermit(p)}
                  >
                    <span className="chip-pass font-mono">{p.passId}</span>
                    <span className="chip-plate font-mono">{p.vehicleNumber}</span>
                    <span className="chip-tier">₹{p.amountPaidINR}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Real-time Telemetry & Boom Barrier Simulation */}
        <div className="terminal-status-card glass-card">
          <div className="card-header-clean">
            <h3>Gate Access Telemetry</h3>
            <span className={`status-barrier-tag ${barrierState}`}>
              Barrier: {barrierState.toUpperCase()}
            </span>
          </div>

          {/* Visual Barrier Graphic */}
          <div className={`barrier-visual-box ${barrierState}`}>
            <div className="barrier-stanchion left">
              <div className={`sensor-light ${barrierState === 'open' ? 'green' : 'red'}`}></div>
            </div>
            <div className={`barrier-arm ${barrierState}`}>
              <div className="barrier-stripes"></div>
            </div>
            <div className="barrier-stanchion right">
              <div className={`sensor-light ${barrierState === 'open' ? 'green' : 'red'}`}></div>
            </div>
          </div>

          {/* Verification Result Output Display */}
          {verificationResult ? (
            <div className={`verification-badge-card ${verificationResult.access === 'GRANTED' ? 'granted' : 'denied'}`}>
              <div className="vbc-header">
                <div className="vbc-icon">
                  {verificationResult.access === 'GRANTED' ? (
                    <CheckIcon className="w-6 h-6 text-emerald" />
                  ) : (
                    <AlertCircleIcon className="w-6 h-6 text-rose" />
                  )}
                </div>
                <div>
                  <h3 className="vbc-title">
                    ACCESS {verificationResult.access}
                  </h3>
                  <p className="vbc-subtitle">{verificationResult.message || verificationResult.reason}</p>
                </div>
              </div>

              {verificationResult.permitDetails && (
                <div className="vbc-details-grid font-mono text-xs">
                  <div><strong>Pass:</strong> {verificationResult.permitDetails.passId}</div>
                  <div><strong>Student:</strong> {verificationResult.permitDetails.studentName}</div>
                  <div><strong>Vehicle:</strong> {verificationResult.permitDetails.vehicleNumber}</div>
                  <div><strong>Floor:</strong> {verificationResult.permitDetails.allocatedFloor}</div>
                  <div><strong>Plan:</strong> {verificationResult.permitDetails.planName}</div>
                  <div><strong>Validity:</strong> {verificationResult.permitDetails.validUntil}</div>
                </div>
              )}
            </div>
          ) : (
            <div className="gate-idle-placeholder">
              <span className="idle-icon">📡</span>
              <p>Awaiting QR scan or permit token submission from security gate sensor...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
