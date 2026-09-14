import { useState } from 'react'
import {
  ShieldIcon,
  CheckIcon,
  AlertCircleIcon,
  QrIcon
} from '../Icons'
import {
  normalizePlate,
  getFloorForVehicleType,
  getRegisteredVehicles,
  getRegisteredVehiclesAsync
} from '../../services/vehicleService'

export default function GatePermitScannerView({ showToast, registeredVehicles = [] }) {
  const [tokenInput, setTokenInput] = useState('')
  const [gateFloor, setGateFloor] = useState('Ground Floor')
  const [scannedPlate, setScannedPlate] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const [verificationResult, setVerificationResult] = useState(null)
  const [barrierState, setBarrierState] = useState('closed') // 'closed' | 'opening' | 'open' | 'closing'

  const handleVerify = async (e) => {
    if (e) e.preventDefault()

    const rawInput = tokenInput.trim()
    const rawPlate = scannedPlate.trim()

    if (!rawInput && !rawPlate) {
      setVerificationResult({
        access: 'DENIED',
        reason: 'Please enter a permit token, pass ID, roll number, or license plate to verify.',
        message: 'Input Required • Access Denied'
      })
      return
    }

    setIsVerifying(true)
    setVerificationResult(null)

    try {
      // 1. Retrieve registered vehicles (from prop, in-memory cache, or Firestore async)
      let list = Array.isArray(registeredVehicles) && registeredVehicles.length > 0
        ? registeredVehicles
        : getRegisteredVehicles()

      if (!list || list.length === 0) {
        list = await getRegisteredVehiclesAsync()
      }

      // 2. Clean inputs for exact and substring matching
      const cleanInputComp = rawInput.toUpperCase().replace(/[^A-Z0-9]/g, '')
      const cleanPlateComp = normalizePlate(rawPlate).replace(/[^A-Z0-9]/g, '')

      // 3. Find matching registered vehicle in Firestore records
      const matchedVehicle = (list || []).find((v) => {
        const vPlateComp = normalizePlate(v.vehicleNumber || '').replace(/[^A-Z0-9]/g, '')
        const vRollComp = (v.rollNumber || v.campusId || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
        const vPassComp = (v.passId || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
        const vIdComp = (v.id || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
        const vStudentId = (v.studentId || '').trim()

        // Match simulated plate input if provided
        if (cleanPlateComp && vPlateComp === cleanPlateComp) {
          return true
        }

        // Match token / pass ID / roll number input
        if (cleanInputComp) {
          if (vPlateComp && (vPlateComp === cleanInputComp || cleanInputComp.includes(vPlateComp))) {
            return true
          }
          if (vRollComp && (vRollComp === cleanInputComp || cleanInputComp.includes(vRollComp))) {
            return true
          }
          if (vPassComp && (vPassComp === cleanInputComp || cleanInputComp.includes(vPassComp))) {
            return true
          }
          if (vIdComp && (vIdComp === cleanInputComp || cleanInputComp.includes(vIdComp))) {
            return true
          }
          if (vStudentId && (vStudentId === rawInput || cleanInputComp.includes(vStudentId.toUpperCase().replace(/[^A-Z0-9]/g, '')))) {
            return true
          }
        }

        return false
      })

      // 4. Handle Unregistered / Unknown Vehicle
      if (!matchedVehicle) {
        setVerificationResult({
          access: 'DENIED',
          reason: `No campus registration record found for "${rawInput || rawPlate}". Vehicle is unauthorized.`,
          message: 'Vehicle Not Registered • Access Denied',
          verifiedAt: new Date().toISOString()
        })
        if (showToast) {
          showToast('Access Denied', `No registration found for "${rawInput || rawPlate}".`, 'error')
        }
        return
      }

      // 5. Handle Registered Vehicle — Determine designated floor and compatibility
      const vehicleType = (matchedVehicle.vehicleType || 'scooty').toLowerCase()
      const designatedFloor = getFloorForVehicleType(vehicleType)
      const isFloorMismatch = (gateFloor === 'Ground Floor' && vehicleType === 'bike') || (gateFloor === 'Basement' && vehicleType === 'scooty')

      const passIdDisplay = matchedVehicle.passId || `SOC-${matchedVehicle.rollNumber || 'REG'}-PASS`
      const studentNameDisplay = matchedVehicle.studentName || 'Campus Member'
      const vehicleNumberDisplay = matchedVehicle.vehicleNumber || rawPlate || rawInput
      const rollNumberDisplay = matchedVehicle.rollNumber || matchedVehicle.campusId || 'N/A'
      const streamDisplay = matchedVehicle.stream || 'School of Commerce'
      const planDisplay = matchedVehicle.category ? `${matchedVehicle.category} Parking Permit` : 'Campus Parking Permit (Active)'

      const result = {
        access: 'GRANTED',
        reason: isFloorMismatch
          ? `Vehicle authorized for ${designatedFloor}. (Gate Notice: Please proceed to ${designatedFloor}).`
          : `Verified campus registration for ${studentNameDisplay} (${rollNumberDisplay}). Valid for ${designatedFloor}.`,
        message: isFloorMismatch
          ? `Authorized • Assigned Floor: ${designatedFloor}`
          : 'Authorized Campus Permit • Boom Barrier Activated',
        permitDetails: {
          passId: passIdDisplay,
          studentName: studentNameDisplay,
          rollNumber: rollNumberDisplay,
          vehicleNumber: vehicleNumberDisplay,
          vehicleType: vehicleType.charAt(0).toUpperCase() + vehicleType.slice(1),
          allocatedFloor: designatedFloor,
          stream: streamDisplay,
          planName: planDisplay,
          validUntil: 'Active Academic Term'
        },
        verifiedAt: new Date().toISOString()
      }

      setVerificationResult(result)

      // Trigger boom barrier animation on success
      setBarrierState('opening')
      setTimeout(() => {
        setBarrierState('open')
        setTimeout(() => {
          setBarrierState('closing')
          setTimeout(() => setBarrierState('closed'), 800)
        }, 4000)
      }, 600)

      if (showToast) {
        showToast('Access Granted', `Permit verified for ${vehicleNumberDisplay} (${studentNameDisplay}). Barrier opened.`, 'success')
      }
    } catch (err) {
      console.error('Gate check error:', err)
      setVerificationResult({
        access: 'DENIED',
        reason: err.message || 'Internal gate scanner validation error.',
        message: 'Validation Error • Access Denied'
      })
      if (showToast) {
        showToast('Validation Error', err.message || 'Could not verify permit.', 'error')
      }
    } finally {
      setIsVerifying(false)
    }
  }

  // Quick test items from currently loaded vehicles
  const testVehicles = Array.isArray(registeredVehicles) && registeredVehicles.length > 0
    ? registeredVehicles.slice(0, 4)
    : getRegisteredVehicles().slice(0, 4)

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
          Real-time security gate ingress scanner. Validates registered vehicles against Firestore directory, verifies assigned parking floor rules, and triggers automated boom barrier access.
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
                Permit Token, Pass ID, Roll Number, or Plate <span className="required-star">*</span>
              </label>
              <div className="input-wrapper">
                <input
                  id="gate-token-input"
                  type="text"
                  placeholder="e.g. MH-12-AB-1234, S2410701, or SOC-PRM-..."
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
                {isVerifying ? 'Verifying with Firestore...' : '⚡ Verify & Trigger Barrier'}
              </button>
            </div>

            {/* Quick Test Chips for Loaded Registered Vehicles */}
            {testVehicles.length > 0 && (
              <div className="recent-permits-box mt-3">
                <span className="recent-label">Quick Test Registered Vehicles:</span>
                <div className="recent-permits-scroll">
                  {testVehicles.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      className="recent-permit-chip"
                      onClick={() => {
                        setTokenInput(v.vehicleNumber)
                        setScannedPlate(v.vehicleNumber)
                      }}
                      title={`Click to test ${v.studentName} (${v.vehicleNumber})`}
                    >
                      <span className="chip-pass">{v.rollNumber}</span>
                      <span className="chip-plate">{v.vehicleNumber}</span>
                      <span className="chip-tier">{v.vehicleType}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </form>
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
                  <div><strong>Student:</strong> {verificationResult.permitDetails.studentName} ({verificationResult.permitDetails.rollNumber})</div>
                  <div><strong>Vehicle:</strong> {verificationResult.permitDetails.vehicleNumber} ({verificationResult.permitDetails.vehicleType})</div>
                  <div><strong>Floor:</strong> {verificationResult.permitDetails.allocatedFloor}</div>
                  <div><strong>Stream:</strong> {verificationResult.permitDetails.stream}</div>
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
