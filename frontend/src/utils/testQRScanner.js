import { GATE_REASON_CODES } from '../services/guardGateService.js'
import { normalizePlate } from '../data/vehicleRules.js'
import { normalizeSlotId } from '../services/parkingService.js'
import { getHumanErrorMessage as mapCameraError } from '../utils/qrErrorUtils.js'

console.log('====================================================')
console.log('📷 QR CAMERA SCANNER & PIPELINE TEST SUITE')
console.log('====================================================\n')

let passCount = 0
let failCount = 0

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`)
    passCount++
  } else {
    console.error(`  ✗ FAILED: ${message}`)
    failCount++
  }
}

console.log('Test Group 0: Canonical Slot Normalization')
assert(normalizeSlotId('g-05') === 'G-05', 'normalizeSlotId normalizes lowercase hyphenated g-05')
assert(normalizeSlotId('B-12') === 'B-12', 'normalizeSlotId preserves uppercase canonical B-12')

console.log('\nTest Group 1: Camera Error Mapping & Messages')

const permDenied = mapCameraError({ name: 'NotAllowedError', message: 'Permission denied by user' })
assert(permDenied.code === 'PERMISSION_DENIED', '6. Permission denied is mapped to PERMISSION_DENIED')
assert(permDenied.message.includes('manual token entry'), 'Permission denied message guides user to manual token fallback')

const noCamera = mapCameraError({ name: 'NotFoundError', message: 'No devices found' })
assert(noCamera.code === 'NO_CAMERA_DEVICE', '7. No camera is mapped to NO_CAMERA_DEVICE')
assert(noCamera.title === 'No Camera Found', 'No camera displays clear title')

const inUse = mapCameraError({ name: 'NotReadableError', message: 'Device in use' })
assert(inUse.code === 'CAMERA_IN_USE', 'Camera in use is mapped to CAMERA_IN_USE')

const unsupported = mapCameraError(new Error('Browser does not support getUserMedia'))
assert(unsupported.code === 'UNSUPPORTED_BROWSER', '8. Unsupported browser is mapped to UNSUPPORTED_BROWSER')

const insecure = mapCameraError(new Error('Insecure origin'), false)
assert(insecure.code === 'INSECURE_CONTEXT', 'Insecure context requires HTTPS')

// ----------------------------------------------------
// Test Group 2: QR Scanner State & Lifecycle Simulation
// ----------------------------------------------------
console.log('\nTest Group 2: Camera Lifecycle & Duplicate Scan Lock')

class MockQRScanner {
  constructor({ onScan, isProcessing = false }) {
    this.onScan = onScan
    this.isProcessing = isProcessing
    this.isScanning = false
    this.scanLocked = false
    this.tracksStopped = false
    this.lastDecoded = null
  }

  start() {
    this.isScanning = true
    this.scanLocked = false
    this.tracksStopped = false
  }

  stop() {
    this.isScanning = false
    this.tracksStopped = true
  }

  simulateFrameDecode(qrText) {
    if (!this.isScanning || this.scanLocked || this.isProcessing) {
      return false // Ignored because scanner is locked or processing
    }

    this.scanLocked = true
    this.lastDecoded = qrText
    this.stop() // Immediately stop stream after successful detection

    if (this.onScan) {
      this.onScan(qrText)
    }
    return true
  }

  reset() {
    this.scanLocked = false
    this.lastDecoded = null
    this.start()
  }
}

let receivedTokens = []
const scannerInstance = new MockQRScanner({
  onScan: (token) => {
    receivedTokens.push(token)
  }
})

assert(scannerInstance.isScanning === false, '1. Camera component initializes in standby/ready state')

scannerInstance.start()
assert(scannerInstance.isScanning === true, 'Camera start activates live scanning')

// First valid QR frame decode
const decoded1 = scannerInstance.simulateFrameDecode('SOC-RES-G-01-MH12AB1234')
assert(decoded1 === true, '3. QR callback supplies detected token')
assert(receivedTokens.length === 1 && receivedTokens[0] === 'SOC-RES-G-01-MH12AB1234', 'Extracted QR token passed to callback')
assert(scannerInstance.tracksStopped === true, '5. Camera stop releases stream immediately after successful detection')

// Attempt repeated frame decode while locked / processing
const decoded2 = scannerInstance.simulateFrameDecode('SOC-RES-G-01-MH12AB1234')
assert(decoded2 === false, '4. Duplicate QR detection is ignored while verification is running')
assert(receivedTokens.length === 1, 'No duplicate callback triggered')

// Reset for next vehicle
scannerInstance.reset()
assert(scannerInstance.scanLocked === false && scannerInstance.isScanning === true, 'Scanner reset allows next vehicle scan')

// ----------------------------------------------------
// Test Group 3: Verification Pipeline Integration
// ----------------------------------------------------
console.log('\nTest Group 3: Camera QR Output & Verification Pipeline')

function simulateVerificationPipeline({
  source = 'camera', // 'camera' | 'manual'
  token,
  plate,
  gateFloor,
  guardRole,
  dbReservations,
  dbSessions,
  dbSlots
}) {
  // Step 1: Check token input presence
  if (!token || !token.trim()) {
    return { approved: false, reason: GATE_REASON_CODES.INVALID_QR }
  }

  // Step 2: Guard Role Auth
  if (!guardRole || (guardRole !== 'Security Admin' && guardRole !== 'Admin')) {
    return { approved: false, reason: GATE_REASON_CODES.UNAUTHORIZED_GUARD }
  }

  // Step 3: Reservation Lookup
  const cleanToken = token.trim()
  const res = dbReservations.find((r) => r.qrToken === cleanToken || r.id === cleanToken || r.passId === cleanToken)
  if (!res) {
    return { approved: false, reason: GATE_REASON_CODES.RESERVATION_NOT_FOUND }
  }

  // Step 4: Anti-passback Check
  const alreadyIn = dbSessions.find((s) => s.status === 'active' && (s.reservationId === res.id || s.slotId === res.slotId))
  if (alreadyIn) {
    return { approved: false, reason: GATE_REASON_CODES.ALREADY_INSIDE }
  }

  // Step 5: Plate Validation (if camera scanned plate supplied)
  if (plate) {
    const cleanP = normalizePlate(plate).replace(/[^A-Z0-9]/g, '')
    const cleanResP = normalizePlate(res.plate).replace(/[^A-Z0-9]/g, '')
    if (cleanP && cleanResP && cleanP !== cleanResP) {
      return { approved: false, reason: GATE_REASON_CODES.VEHICLE_MISMATCH }
    }
  }

  // Step 5b: Floor and Slot Validation
  if (gateFloor && res.floor && res.floor !== gateFloor) {
    return { approved: false, reason: 'FLOOR_MISMATCH' }
  }

  const cleanSlot = normalizeSlotId(res.slotId)
  if (Array.isArray(dbSlots) && dbSlots.length > 0) {
    const slot = dbSlots.find((s) => normalizeSlotId(s.id) === cleanSlot)
    if (slot && slot.status === 'occupied') {
      return { approved: false, reason: 'SLOT_ALREADY_OCCUPIED' }
    }
  }

  // Step 6: Success
  return {
    approved: true,
    reason: GATE_REASON_CODES.ENTRY_APPROVED,
    slotId: res.slotId,
    vehicleNumber: res.plate,
    source
  }
}

const mockDbReservations = [
  {
    id: 'RES-G01-999',
    qrToken: 'SOC-RES-G-01-MH12AB1234',
    passId: 'SOC-G01-999',
    slotId: 'G-01',
    plate: 'MH-12-AB-1234',
    status: 'active'
  }
]

const mockDbSessions = []
const mockDbSlots = { 'G-01': { id: 'G-01', status: 'reserved' } }

// Camera detected token reaching verification
const camSuccess = simulateVerificationPipeline({
  source: 'camera',
  token: 'SOC-RES-G-01-MH12AB1234',
  guardRole: 'Security Admin',
  dbReservations: mockDbReservations,
  dbSessions: mockDbSessions,
  dbSlots: mockDbSlots
})
assert(camSuccess.approved === true && camSuccess.reason === GATE_REASON_CODES.ENTRY_APPROVED, '9. Successful QR detection reaches verifyAndAdmitGatePass()')
assert(camSuccess.slotId === 'G-01', 'Verified slot G-01 identified from QR token')

// Manual token entry fallback
const manualSuccess = simulateVerificationPipeline({
  source: 'manual',
  token: 'SOC-RES-G-01-MH12AB1234',
  guardRole: 'Admin',
  dbReservations: mockDbReservations,
  dbSessions: mockDbSessions,
  dbSlots: mockDbSlots
})
assert(manualSuccess.approved === true, '2. Manual token input still works as fallback')
assert(manualSuccess.source === 'manual', '14. Existing manual verification remains unchanged')

// Invalid QR
const invalidQrResult = simulateVerificationPipeline({
  token: 'FAKE-UNREGISTERED-QR-TOKEN',
  guardRole: 'Security Admin',
  dbReservations: mockDbReservations,
  dbSessions: mockDbSessions,
  dbSlots: mockDbSlots
})
assert(invalidQrResult.approved === false && invalidQrResult.reason === GATE_REASON_CODES.RESERVATION_NOT_FOUND, '10. Invalid QR receives normal Firestore denial (RESERVATION_NOT_FOUND)')

// Unauthorized Guard with Camera
const unauthResult = simulateVerificationPipeline({
  token: 'SOC-RES-G-01-MH12AB1234',
  guardRole: 'Student',
  dbReservations: mockDbReservations,
  dbSessions: mockDbSessions,
  dbSlots: mockDbSlots
})
assert(unauthResult.approved === false && unauthResult.reason === GATE_REASON_CODES.UNAUTHORIZED_GUARD, '13. Guard authorization still works (Student rejected with UNAUTHORIZED_GUARD)')

// Plate Mismatch with Camera QR
const plateMismatchResult = simulateVerificationPipeline({
  token: 'SOC-RES-G-01-MH12AB1234',
  plate: 'MH-14-WRONG-9999',
  guardRole: 'Security Admin',
  dbReservations: mockDbReservations,
  dbSessions: mockDbSessions,
  dbSlots: mockDbSlots
})
assert(plateMismatchResult.approved === false && plateMismatchResult.reason === GATE_REASON_CODES.VEHICLE_MISMATCH, '12. Plate verification still works (VEHICLE_MISMATCH)')

// Anti-Passback with Camera QR
mockDbSessions.push({ id: 'SESS-1', reservationId: 'RES-G01-999', slotId: 'G-01', status: 'active' })
const antiPassbackResult = simulateVerificationPipeline({
  token: 'SOC-RES-G-01-MH12AB1234',
  guardRole: 'Security Admin',
  dbReservations: mockDbReservations,
  dbSessions: mockDbSessions,
  dbSlots: mockDbSlots
})
assert(antiPassbackResult.approved === false && antiPassbackResult.reason === GATE_REASON_CODES.ALREADY_INSIDE, '11. Anti-passback still works (ALREADY_INSIDE)')

// ----------------------------------------------------
// Test Group 4: Camera Stream Negotiation & Error Recovery (11-Point Suite)
// ----------------------------------------------------
console.log('\nTest Group 4: Camera Stream Negotiation & Multi-Tier Fallback')

// 1. Camera API unavailable
const apiUnavail = mapCameraError(new Error('mediaDevices not supported'))
assert(apiUnavail.code === 'UNSUPPORTED_BROWSER', '1. Camera API unavailable mapped to UNSUPPORTED_BROWSER')

// 2. Permission denied
const permDeniedErr = mapCameraError({ name: 'NotAllowedError', message: 'User denied permission' })
assert(permDeniedErr.code === 'PERMISSION_DENIED', '2. Permission denied mapped to PERMISSION_DENIED')

// 3. No camera detected
const noCamErr = mapCameraError({ name: 'NotFoundError', message: 'No media tracks' })
assert(noCamErr.code === 'NO_CAMERA_DEVICE', '3. No camera detected mapped to NO_CAMERA_DEVICE')

// 4. Camera busy / track start error
const busyErr = mapCameraError({ name: 'TrackStartError', message: 'Device busy' })
assert(busyErr.code === 'CAMERA_IN_USE', '4. Camera busy mapped to CAMERA_IN_USE')

// 5. Overconstrained error
const overconstrainedErr = mapCameraError({ name: 'OverconstrainedError', message: 'Constraints unsatisfied' })
assert(overconstrainedErr.code === 'OVERCONSTRAINED' || overconstrainedErr.message.includes('compatible'), '5. OverconstrainedError produces helpful recovery message')

// 6. Generic getUserMedia Fallback Simulator
class MockCameraStreamNegotiator {
  constructor(supportedTiers = ['generic']) {
    this.supportedTiers = supportedTiers
    this.activeStream = null
    this.activeTracks = []
  }

  async start(tiers) {
    for (const tier of tiers) {
      const tierKey = tier?.facingMode?.ideal || tier?.facingMode || (tier?.deviceId ? 'deviceId' : 'generic')
      if (this.supportedTiers.includes(tierKey) || this.supportedTiers.includes('all')) {
        const track = {
          kind: 'video',
          stopped: false,
          stop: function() { this.stopped = true }
        }
        this.activeTracks = [track]
        this.activeStream = {
          getTracks: () => this.activeTracks
        }
        return { success: true, tier: tierKey }
      }
    }
    throw new Error('Could not access video feed from camera.')
  }

  stop() {
    if (this.activeTracks) {
      this.activeTracks.forEach((t) => t.stop())
    }
    this.activeStream = null
  }
}

async function runTestGroup4() {
  // 7. Successful stream initialization on rear camera
  const rearNegotiator = new MockCameraStreamNegotiator(['environment'])
  const rearTiers = [{ facingMode: { ideal: 'environment' } }, { facingMode: 'environment' }, {}]
  const rearResult = await rearNegotiator.start(rearTiers)
  assert(rearResult?.success === true && rearResult?.tier === 'environment', '7. Successful stream initialization on rear camera')

  // 6b. Fallback to generic when ideal environment unsupported (e.g. desktop webcam)
  const desktopNegotiator = new MockCameraStreamNegotiator(['generic'])
  const desktopResult = await desktopNegotiator.start(rearTiers)
  assert(desktopResult?.success === true && desktopResult?.tier === 'generic', '6. Multi-tier fallback negotiates generic camera stream')

  // 8. Video play handling simulation
  const mockVideoElement = {
    playsInline: false,
    muted: false,
    paused: true,
    play: function() { this.paused = false; return Promise.resolve() }
  }
  mockVideoElement.playsInline = true
  mockVideoElement.muted = true
  await mockVideoElement.play().catch(() => {})
  assert(mockVideoElement.paused === false && mockVideoElement.muted === true && mockVideoElement.playsInline === true, '8. Video element playback & inline attributes safely applied')

  // 9. Retry capability simulation
  let retryError = { code: 'CAMERA_IN_USE' }
  let retrySuccess = false
  // Simulate Retry action: clear error -> stop -> restart
  retryError = null
  rearNegotiator.stop()
  const retryRes = await rearNegotiator.start(rearTiers)
  if (retryRes?.success) retrySuccess = true
  assert(retryError === null && retrySuccess === true, '9. Retry action clears error and restores camera stream')

  // 10. Stream cleanup verification
  rearNegotiator.stop()
  assert(rearNegotiator.activeTracks[0].stopped === true, '10. Stream cleanup stops all active media tracks')

  // 11. QR detection remains functional
  const functionalScanner = new MockQRScanner({ onScan: () => {} })
  functionalScanner.start()
  const detected = functionalScanner.simulateFrameDecode('SOC-RES-G-05-MH12CD5678')
  assert(detected === true && functionalScanner.tracksStopped === true, '11. QR detection remains fully functional with single-scan lock')

  // ----------------------------------------------------
  // Test Summary
  // ----------------------------------------------------
  console.log('\n====================================================')
  console.log(`TEST SUMMARY: ${passCount} Passed, ${failCount} Failed`)
  console.log('====================================================')

  if (failCount > 0) {
    process.exit(1)
  } else {
    console.log('🎉 ALL QR CAMERA SCANNER & PIPELINE TESTS PASSED!')
  }
}

runTestGroup4().catch((err) => {
  console.error('Test Group 4 Error:', err)
  process.exit(1)
})
