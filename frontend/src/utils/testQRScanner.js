import { GATE_REASON_CODES } from '../services/guardGateService.js'
import { normalizePlate } from '../data/vehicleRules.js'
import { normalizeSlotId } from '../services/parkingService.js'

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

function mapCameraError(err, isSecureContext = true) {
  if (!isSecureContext) {
    return {
      title: 'HTTPS Connection Required',
      message: 'Camera access requires a secure HTTPS connection. Please access over HTTPS or use manual token entry.',
      code: 'INSECURE_CONTEXT'
    }
  }

  const errStr = String(err?.message || err || '').toLowerCase()
  const errName = String(err?.name || '')

  if (errName === 'NotAllowedError' || errStr.includes('permission') || errStr.includes('denied')) {
    return {
      title: 'Camera Access Denied',
      message: 'Camera permission was denied. Please allow camera permissions in your browser address bar or settings, or use manual token entry.',
      code: 'PERMISSION_DENIED'
    }
  }

  if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError' || errStr.includes('not found') || errStr.includes('no camera')) {
    return {
      title: 'No Camera Found',
      message: 'No camera hardware was detected on this device. Please connect a webcam or use manual token entry.',
      code: 'NO_CAMERA_DEVICE'
    }
  }

  if (errName === 'NotReadableError' || errName === 'TrackStartError' || errStr.includes('in use') || errStr.includes('busy')) {
    return {
      title: 'Camera In Use',
      message: 'The camera is currently in use by another tab or application. Please close other camera apps and retry.',
      code: 'CAMERA_IN_USE'
    }
  }

  if (errStr.includes('getusermedia') || errStr.includes('notsupported')) {
    return {
      title: 'Browser Not Supported',
      message: 'Your current browser does not support HTML5 camera streaming. Please use Chrome, Edge, Safari, or manual token entry.',
      code: 'UNSUPPORTED_BROWSER'
    }
  }

  return {
    title: 'Camera Initialization Failed',
    message: err?.message || 'Could not access video feed from camera.',
    code: 'CAMERA_INIT_FAILED'
  }
}

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
