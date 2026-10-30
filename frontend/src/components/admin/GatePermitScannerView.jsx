import { useState, useRef } from 'react'
import {
  CheckIcon,
  AlertCircleIcon,
  QrIcon,
  CameraIcon
} from '../Icons'
import { auth } from '../../firebase/firebase'
import {
  verifyAndAdmitGatePass,
  GATE_REASON_CODES
} from '../../services/guardGateService'
import QRScanner from './QRScanner'

export default function GatePermitScannerView({
  showToast,
  registeredVehicles = [],
  slots = [],
  user = null,
  userProfile = null
}) {
  const [scanMode, setScanMode] = useState('camera') // 'camera' | 'manual'
  const [tokenInput, setTokenInput] = useState('')
  const [gateFloor, setGateFloor] = useState('Ground Floor')
  const [scannedPlate, setScannedPlate] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const [verificationResult, setVerificationResult] = useState(null)
  const [barrierState, setBarrierState] = useState('closed') // 'closed' | 'opening' | 'open' | 'closing'
  const lastScannedTokenRef = useRef('')

  // Authoritative Guard Ingress Verification Executor
  const executeVerification = async (targetToken = '', targetPlate = '') => {
    const rawInput = (targetToken || tokenInput).trim()
    const rawPlate = (targetPlate || scannedPlate).trim()

    if (!rawInput && !rawPlate) {
      setVerificationResult({
        approved: false,
        reason: GATE_REASON_CODES.INVALID_QR,
        message: 'Please align QR code in camera view or enter a valid permit token.'
      })
      return
    }

    if (isVerifying) return

    setIsVerifying(true)
    setVerificationResult(null)

    try {
      const currentGuardUid = auth.currentUser ? auth.currentUser.uid : (user?.uid || '')
      const guardDisplayName = userProfile?.displayName || user?.displayName || 'Security Guard'

      // Call authoritative Firestore Guard gate verification service
      const result = await verifyAndAdmitGatePass({
        qrToken: rawInput || rawPlate,
        scannedPlate: rawPlate,
        gateFloor,
        guardUid: currentGuardUid
      })

      if (result.approved) {
        setVerificationResult({
          ...result,
          guardName: guardDisplayName
        })

        // Trigger barrier opening sequence: closed -> opening -> open (4s) -> closing -> closed
        setBarrierState('opening')
        setTimeout(() => {
          setBarrierState('open')
          setTimeout(() => {
            setBarrierState('closing')
            setTimeout(() => setBarrierState('closed'), 800)
          }, 4000)
        }, 600)

        if (showToast) {
          showToast(
            'Entry Approved 🎉',
            `Bay ${result.slotId} (${result.floor}) is now OCCUPIED for ${result.vehicleNumber}. Barrier opened.`,
            'success'
          )
        }
      } else {
        setBarrierState('closed')
        setVerificationResult({
          ...result,
          guardName: guardDisplayName
        })

        if (showToast) {
          showToast(
            'Entry Denied 🛑',
            result.message || `Validation failed: ${result.reason}`,
            'error'
          )
        }
      }
    } catch (err) {
      console.error('[GatePermitScannerView] Verification exception:', err)
      setBarrierState('closed')
      setVerificationResult({
        approved: false,
        reason: GATE_REASON_CODES.TRANSACTION_FAILED,
        message: err.message || 'An unexpected error occurred during Firestore gate verification.'
      })
      if (showToast) {
        showToast('Verification Error', err.message || 'Could not verify pass.', 'error')
      }
    } finally {
      setIsVerifying(false)
    }
  }

  // Camera QR detection callback
  const handleCameraScan = async (detectedToken) => {
    if (isVerifying || !detectedToken) return
    lastScannedTokenRef.current = detectedToken
    setTokenInput(detectedToken)

    // Automatically trigger authoritative verification for detected QR
    await executeVerification(detectedToken, scannedPlate)
  }

  // Manual Form Submit Handler
  const handleManualSubmit = (e) => {
    if (e) e.preventDefault()
    executeVerification(tokenInput, scannedPlate)
  }

  // Reset / Scan Next Vehicle
  const handleReset = () => {
    setTokenInput('')
    setScannedPlate('')
    setVerificationResult(null)
    setBarrierState('closed')
    setIsVerifying(false)
    lastScannedTokenRef.current = ''
  }

  // Quick test items from currently active reserved slots or loaded vehicles
  const reservedSlots = (slots || []).filter((s) => s.status === 'reserved')
  const testItems = reservedSlots.length > 0
    ? reservedSlots.slice(0, 4).map((s) => ({
        id: s.id,
        label: `Reserved Bay ${s.id}`,
        token: s.passId || `SOC-RES-${s.id}-${s.plate}`,
        plate: s.plate,
        type: s.type,
        owner: s.owner
      }))
    : (registeredVehicles || []).slice(0, 4).map((v) => ({
        id: v.id,
        label: `${v.studentName} (${v.rollNumber})`,
        token: v.passId || v.vehicleNumber,
        plate: v.vehicleNumber,
        type: v.vehicleType,
        owner: v.studentName
      }))

  return (
    <div className="admin-page-container">
      {/* Page Header */}
      <div className="page-section-header glass-card">
        <div className="psh-badge">
          <span className="badge-icon">🛡️</span>
          <span>CAMPUS SECURITY RFID &amp; OPTICAL QR SCANNER</span>
        </div>
        <h1 className="psh-title">
          Gate QR Permit <span className="gradient-text">Verification Terminal</span>
        </h1>
        <p className="psh-subtitle">
          Authoritative real-time security gate ingress scanner. Validates physical student passes and digital QR tokens directly against Firestore, verifies designated floor zoning rules, executes atomic bay status transition (Reserved &rarr; Occupied), and triggers automated boom barrier access.
        </p>
      </div>

      <div className="terminal-grid-two">
        {/* Left: Live Camera & Token Scanner Terminal */}
        <div className="terminal-form-card glass-card">
          <div className="card-header-clean">
            <div className="flex items-center gap-2">
              <QrIcon className="w-5 h-5 text-cyan" />
              <h3>Scan / Verify Student Pass</h3>
            </div>
            <span className="telemetry-live-tag">
              <span className="live-dot-pulse"></span>
              <span>GATE 1 &bull; INGRESS</span>
            </span>
          </div>

          {/* Mode Navigation Tabs */}
          <div className="scanner-mode-nav mt-3">
            <button
              type="button"
              className={`scanner-mode-tab ${scanMode === 'camera' ? 'active' : ''}`}
              onClick={() => setScanMode('camera')}
            >
              <CameraIcon className="w-4 h-4" />
              <span>📷 Live QR Camera</span>
            </button>
            <button
              type="button"
              className={`scanner-mode-tab ${scanMode === 'manual' ? 'active' : ''}`}
              onClick={() => setScanMode('manual')}
            >
              <QrIcon className="w-4 h-4" />
              <span>⌨️ Manual Token Entry</span>
            </button>
          </div>

          {/* TAB 1: LIVE QR CAMERA SCANNER */}
          {scanMode === 'camera' && (
            <div className="camera-mode-section">
              <QRScanner
                onScan={handleCameraScan}
                isProcessing={isVerifying}
                autoStart={false}
                scannerId="gate-qr-reader"
              />

              {/* Gate Floor & Plate Sensors */}
              <div className="form-grid-2 mt-3">
                <div className="form-group">
                  <label>Physical Gate Location</label>
                  <select
                    value={gateFloor}
                    onChange={(e) => setGateFloor(e.target.value)}
                    className="custom-select"
                    disabled={isVerifying}
                  >
                    <option value="Ground Floor">Ground Floor Gate (Scooties)</option>
                    <option value="Basement">Basement Ramp Gate (Bikes)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>ANPR Camera Plate (Optional)</label>
                  <input
                    type="text"
                    placeholder="Optional plate sensor"
                    value={scannedPlate}
                    onChange={(e) => setScannedPlate(e.target.value.toUpperCase())}
                    className="font-mono custom-input"
                    disabled={isVerifying}
                  />
                </div>
              </div>

              {tokenInput && (
                <div className="mt-2.5 p-2 rounded glass-card text-xs font-mono flex items-center justify-between">
                  <span className="text-muted">Detected Token:</span>
                  <span className="text-cyan font-bold truncate max-w-xs">{tokenInput}</span>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: MANUAL TOKEN ENTRY FALLBACK */}
          {scanMode === 'manual' && (
            <form onSubmit={handleManualSubmit} className="scanner-form">
              <div className="form-group">
                <label htmlFor="gate-token-input">
                  QR Permit Token, Pass ID, or Reservation Code <span className="required-star">*</span>
                </label>
                <div className="input-wrapper">
                  <input
                    id="gate-token-input"
                    type="text"
                    placeholder="e.g. SOC-RES-G-01-MH12AB1234, SOC-G01-1234, or RES-..."
                    value={tokenInput}
                    onChange={(e) => setTokenInput(e.target.value)}
                    className="font-mono"
                    disabled={isVerifying}
                    required
                  />
                </div>
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label>Physical Gate Location</label>
                  <select
                    value={gateFloor}
                    onChange={(e) => setGateFloor(e.target.value)}
                    className="custom-select"
                    disabled={isVerifying}
                  >
                    <option value="Ground Floor">Ground Floor Gate (Scooties)</option>
                    <option value="Basement">Basement Ramp Gate (Bikes)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Simulated ANPR Plate Camera</label>
                  <input
                    type="text"
                    placeholder="Optional camera plate read"
                    value={scannedPlate}
                    onChange={(e) => setScannedPlate(e.target.value.toUpperCase())}
                    className="font-mono custom-input"
                    disabled={isVerifying}
                  />
                </div>
              </div>

              <div className="scanner-actions-row flex gap-2 mt-2">
                <button
                  type="submit"
                  className="btn btn-primary submit-verify-btn flex-1"
                  disabled={isVerifying || (!tokenInput.trim() && !scannedPlate.trim())}
                >
                  {isVerifying ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="live-dot-pulse" style={{ background: '#38bdf8' }}></span>
                      Verifying with Firestore...
                    </span>
                  ) : (
                    '⚡ Verify & Authorize Ingress'
                  )}
                </button>

                {verificationResult && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-md"
                    onClick={handleReset}
                    disabled={isVerifying}
                    title="Reset form for next vehicle"
                  >
                    🔄 Reset
                  </button>
                )}
              </div>
            </form>
          )}

          {/* Quick Test Chips (Available in both modes) */}
          <div className="recent-permits-box mt-3">
            <span className="recent-label">
              {reservedSlots.length > 0 ? 'Active Reserved Slots in Firestore:' : 'Quick Test Simulators:'}
            </span>
            <div className="recent-permits-scroll">
              {testItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="recent-permit-chip"
                  onClick={() => {
                    setTokenInput(item.token)
                    setScannedPlate(item.plate)
                    executeVerification(item.token, item.plate)
                  }}
                  disabled={isVerifying}
                  title={`Click to test pass for ${item.owner || item.label}`}
                >
                  <span className="chip-pass">{item.id}</span>
                  <span className="chip-plate">{item.plate}</span>
                  <span className="chip-tier">{item.type}</span>
                </button>
              ))}

              {/* Explicit Test Chip for Payment QR Refusal */}
              <button
                type="button"
                className="recent-permit-chip"
                style={{ borderColor: 'rgba(239, 68, 68, 0.4)', background: 'rgba(239, 68, 68, 0.1)' }}
                onClick={() => {
                  const samplePaymentQr = 'upi://pay?pa=parking.soc@upi&pn=SOCMAC%20Smart%20Park&am=10.00&cu=INR&tn=SOCMAC-G-01-MH12AB1234'
                  setTokenInput(samplePaymentQr)
                  executeVerification(samplePaymentQr, '')
                }}
                disabled={isVerifying}
                title="Test Gate refusal on Payment QR"
              >
                <span className="chip-pass" style={{ color: '#f87171' }}>💳 Test Payment QR Refusal</span>
                <span className="chip-plate">upi://pay...</span>
                <span className="chip-tier" style={{ color: '#f87171' }}>Reject (₹10)</span>
              </button>
            </div>
          </div>
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
            <div className={`verification-badge-card ${verificationResult.approved ? 'granted' : 'denied'}`}>
              <div className="vbc-header">
                <div className="vbc-icon">
                  {verificationResult.approved ? (
                    <CheckIcon className="w-6 h-6 text-emerald" />
                  ) : (
                    <AlertCircleIcon className="w-6 h-6 text-rose" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <h3 className="vbc-title">
                      {verificationResult.approved ? '✓ ENTRY APPROVED' : '✕ ENTRY DENIED'}
                    </h3>
                    {verificationResult.reason && (
                      <span className={`text-2xs font-mono px-2 py-0.5 rounded ${verificationResult.approved ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
                        {verificationResult.reason}
                      </span>
                    )}
                  </div>
                  <p className="vbc-subtitle mt-0.5">
                    {verificationResult.message || (verificationResult.approved ? 'Access granted. Boom barrier activated.' : 'Verification failed.')}
                  </p>
                </div>
              </div>

              {verificationResult.approved && (
                <div className="vbc-details-grid font-mono text-xs mt-3">
                  <div><strong>Student:</strong> {verificationResult.studentName || 'Campus Member'}</div>
                  <div><strong>Vehicle:</strong> {verificationResult.vehicleNumber} ({verificationResult.vehicleType === 'bike' ? '🏍️ Bike' : '🛵 Scooty'})</div>
                  <div><strong>Slot:</strong> <span className="text-cyan font-bold">{verificationResult.slotId}</span></div>
                  <div><strong>Floor:</strong> {verificationResult.floor}</div>
                  <div><strong>Zone:</strong> {verificationResult.zone || verificationResult.section || 'Campus Bay'}</div>
                  <div><strong>Reservation:</strong> <span className="text-emerald font-bold">OCCUPIED (In Use)</span></div>
                  <div><strong>Entry Time:</strong> {verificationResult.enteredAt || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}</div>
                  <div><strong>Guard:</strong> {verificationResult.guardName || 'Security Admin'}</div>
                </div>
              )}

              <div className="mt-3 pt-2 border-t border-slate-700/50 flex justify-end">
                <button
                  type="button"
                  className="btn btn-primary btn-xs"
                  onClick={handleReset}
                >
                  Scan Next Vehicle &rarr;
                </button>
              </div>
            </div>
          ) : (
            <div className="gate-idle-placeholder">
              <span className="idle-icon">📡</span>
              <p>Awaiting QR camera scan or permit token submission from security gate sensor...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
