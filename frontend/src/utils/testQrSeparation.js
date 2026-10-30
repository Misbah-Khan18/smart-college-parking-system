/**
 * Automated Verification Suite for QR Separation Architecture:
 * - Payment QR (UPI / GPay ₹10) vs Parking Entry QR (Gate Ingress)
 * - Unique Token Generation
 * - One-time Use Enforcement
 * - Gate Scanner Rejection Rules
 * - Floor & Vehicle Validation
 * - Capacity Integrity (160 slots)
 */

import {
  QR_TYPES,
  detectQrType,
  generateUniqueEntryToken,
  createEntryQrPayload,
  parseEntryQr,
  createUpiPaymentUri
} from './qrTokenUtils.js'
import { GATE_REASON_CODES } from '../services/guardGateService.js'
import { normalizePlate } from '../services/vehicleService.js'
import { normalizeSlotId } from '../services/parkingService.js'
import {
  getFloorForVehicleType,
  isSlotAllowedForVehicleType
} from '../data/vehicleRules.js'
import { INITIAL_SLOTS } from '../data/initialSlots.js'

let passed = 0
let failed = 0

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`)
    passed++
  } else {
    console.error(`  ✗ FAIL: ${message}`)
    failed++
  }
}

console.log('================================================================')
console.log('TEST SUITE: QR PURPOSE SEPARATION & SECURITY ARCHITECTURE')
console.log('================================================================\n')

// -------------------------------------------------------------
// TEST GROUP 1: QR Type Detection & Classification
// -------------------------------------------------------------
console.log('[Group 1: QR Type Classification]')

const upiPaymentUri = createUpiPaymentUri({
  vpa: 'parking.soc@upi',
  merchantName: 'SOCMAC Smart Park',
  amountINR: 10,
  slotId: 'G-01',
  plate: 'MH-12-AB-1234'
})
assert(detectQrType(upiPaymentUri) === QR_TYPES.PAYMENT, 'NPCI UPI URI detected as PAYMENT QR')
assert(detectQrType('upi://pay?pa=test@upi&pn=Test&am=10.00') === QR_TYPES.PAYMENT, 'Standard upi:// URI detected as PAYMENT QR')
assert(detectQrType('PAYMENT-1727376000000-abcd1234ef') === QR_TYPES.PAYMENT, 'PAYMENT-* token detected as PAYMENT QR')
assert(detectQrType(JSON.stringify({ type: 'PAYMENT', amount: 10 })) === QR_TYPES.PAYMENT, 'JSON payload with type PAYMENT detected as PAYMENT QR')

const sampleEntryToken = generateUniqueEntryToken('ENTRY')
assert(detectQrType(sampleEntryToken) === QR_TYPES.PARKING_ENTRY, 'ENTRY-* token detected as PARKING_ENTRY QR')

const entryPayload = createEntryQrPayload({
  entryToken: sampleEntryToken,
  reservationId: 'RES-G01-12345',
  slotId: 'G-01',
  plate: 'MH-12-AB-1234',
  vehicleType: 'scooty',
  floor: 'Ground Floor'
})
assert(detectQrType(entryPayload) === QR_TYPES.PARKING_ENTRY, 'Structured Entry JSON payload detected as PARKING_ENTRY QR')
assert(detectQrType('SOC-RES-G-01-MH12AB1234') === QR_TYPES.PARKING_ENTRY, 'Legacy SOC-RES-* detected as PARKING_ENTRY QR')
assert(detectQrType('RANDOM_BARCODE_STRING') === QR_TYPES.UNKNOWN, 'Random string detected as UNKNOWN QR')

// -------------------------------------------------------------
// TEST GROUP 2: Unique, Unpredictable Entry Token Generation
// -------------------------------------------------------------
console.log('\n[Group 2: Entry Token Generation & Parsing]')

const tokenA = generateUniqueEntryToken('ENTRY')
const tokenB = generateUniqueEntryToken('ENTRY')
assert(tokenA !== tokenB, 'Consecutive tokens are uniquely distinct')
assert(tokenA.startsWith('ENTRY-'), 'Token follows ENTRY-<timestamp>-<entropy> convention')
assert(tokenA.length >= 25, 'Token contains sufficient cryptographic entropy')

const parsedEntry = parseEntryQr(entryPayload)
assert(parsedEntry.entryToken === sampleEntryToken, 'Entry payload parser extracts entryToken correctly')
assert(parsedEntry.slotId === 'G-01', 'Entry payload parser extracts slotId correctly')
assert(parsedEntry.plate === 'MH-12-AB-1234', 'Entry payload parser extracts plate correctly')

// -------------------------------------------------------------
// TEST GROUP 3: Guard Gate Scanner Rejection Logic
// -------------------------------------------------------------
console.log('\n[Group 3: Guard Gate Scanner Validation Logic]')

// Simulate Guard verification scanner logic for Payment QR
function simulateGateScan(scannedQr, reservationState) {
  // Step 2: QR classification
  const qrType = detectQrType(scannedQr)
  if (qrType === QR_TYPES.PAYMENT) {
    return {
      approved: false,
      reason: GATE_REASON_CODES.PAYMENT_QR_NOT_ALLOWED,
      message: 'Invalid QR: Payment QR cannot be used for parking entry.'
    }
  }

  if (!reservationState) {
    return {
      approved: false,
      reason: GATE_REASON_CODES.RESERVATION_NOT_FOUND,
      message: 'Reservation not found.'
    }
  }

  // Step 4: One-time use check
  if (reservationState.entryQrStatus === 'USED' || reservationState.status === 'in_use' || reservationState.status === 'completed') {
    return {
      approved: false,
      reason: GATE_REASON_CODES.ENTRY_QR_ALREADY_USED,
      message: 'Entry QR has already been used.'
    }
  }

  if (reservationState.status === 'cancelled') {
    return {
      approved: false,
      reason: GATE_REASON_CODES.RESERVATION_CANCELLED,
      message: 'Reservation cancelled.'
    }
  }

  // Vehicle floor validation
  const slotId = normalizeSlotId(reservationState.slotId)
  const vType = reservationState.vehicleType || 'scooty'
  if (!isSlotAllowedForVehicleType(slotId, vType)) {
    return {
      approved: false,
      reason: GATE_REASON_CODES.WRONG_FLOOR,
      message: 'Floor/zone mismatch.'
    }
  }

  // Simulating successful ingress
  return {
    approved: true,
    reason: GATE_REASON_CODES.ENTRY_APPROVED,
    slotId,
    newEntryQrStatus: 'USED',
    newStatus: 'in_use'
  }
}

// Case 1: Student scans Payment QR at Gate
const paymentScanResult = simulateGateScan(upiPaymentUri, {
  slotId: 'G-01',
  vehicleType: 'scooty',
  status: 'active',
  entryQrStatus: 'ACTIVE'
})
assert(paymentScanResult.approved === false, 'Payment QR rejected at Security Gate')
assert(paymentScanResult.reason === GATE_REASON_CODES.PAYMENT_QR_NOT_ALLOWED, 'Rejected with reason PAYMENT_QR_NOT_ALLOWED')
assert(paymentScanResult.message === 'Invalid QR: Payment QR cannot be used for parking entry.', 'Exact rejection message returned')

// Case 2: Student scans active Entry QR at Gate (First Time)
let reservationRecord = {
  slotId: 'G-01',
  vehicleType: 'scooty',
  status: 'active',
  entryQrStatus: 'ACTIVE'
}
const firstEntryScan = simulateGateScan(sampleEntryToken, reservationRecord)
assert(firstEntryScan.approved === true, 'Active Entry QR approved on first scan')
assert(firstEntryScan.newEntryQrStatus === 'USED', 'Entry QR transitioned to USED state')

// Case 3: Student attempts to re-scan the same Entry QR (Second Time / Replay Attack)
reservationRecord.entryQrStatus = firstEntryScan.newEntryQrStatus
reservationRecord.status = firstEntryScan.newStatus

const secondEntryScan = simulateGateScan(sampleEntryToken, reservationRecord)
assert(secondEntryScan.approved === false, 'Duplicate / Used Entry QR rejected')
assert(secondEntryScan.reason === GATE_REASON_CODES.ENTRY_QR_ALREADY_USED, 'Rejected with reason ENTRY_QR_ALREADY_USED')
assert(secondEntryScan.message === 'Entry QR has already been used.', 'Exact already used message returned')

// Case 4: Vehicle / Floor Zoning rules
const scootyInBasement = simulateGateScan(sampleEntryToken, {
  slotId: 'B-01',
  vehicleType: 'scooty',
  status: 'active',
  entryQrStatus: 'ACTIVE'
})
assert(scootyInBasement.approved === false, 'Scooty assigned to Basement bay rejected')
assert(scootyInBasement.reason === GATE_REASON_CODES.WRONG_FLOOR, 'Rejected with WRONG_FLOOR')

const bikeOnGround = simulateGateScan(sampleEntryToken, {
  slotId: 'G-01',
  vehicleType: 'bike',
  status: 'active',
  entryQrStatus: 'ACTIVE'
})
assert(bikeOnGround.approved === false, 'Bike assigned to Ground bay rejected')
assert(bikeOnGround.reason === GATE_REASON_CODES.WRONG_FLOOR, 'Rejected with WRONG_FLOOR')

// -------------------------------------------------------------
// TEST GROUP 4: Parking Capacity Architecture (160 Slots)
// -------------------------------------------------------------
console.log('\n[Group 4: Parking Capacity Integrity]')

assert(INITIAL_SLOTS.length === 160, `Total capacity is exactly 160 (got ${INITIAL_SLOTS.length})`)
const gSlots = INITIAL_SLOTS.filter(s => s.floor === 'Ground Floor')
const bSlots = INITIAL_SLOTS.filter(s => s.floor === 'Basement')
assert(gSlots.length === 80, `Ground capacity is exactly 80 (got ${gSlots.length})`)
assert(bSlots.length === 80, `Basement capacity is exactly 80 (got ${bSlots.length})`)
assert(gSlots[0].id === 'G-01', 'Ground slot 1 is G-01')
assert(gSlots[79].id === 'G-80', 'Ground slot 80 is G-80')
assert(bSlots[0].id === 'B-01', 'Basement slot 1 is B-01')
assert(bSlots[79].id === 'B-80', 'Basement slot 80 is B-80')

// -------------------------------------------------------------
// SUMMARY
// -------------------------------------------------------------
console.log('\n================================================================')
console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`)
console.log('================================================================')

if (failed > 0) {
  process.exit(1)
} else {
  process.exit(0)
}
