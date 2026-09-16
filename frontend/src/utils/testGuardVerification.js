import { GATE_REASON_CODES } from '../services/guardGateService.js'
import {
  getFloorForVehicleType,
  isSlotAllowedForVehicleType,
  normalizePlate
} from '../data/vehicleRules.js'
import { normalizeSlotId } from '../services/parkingService.js'

console.log('====================================================')
console.log('🛡️  GUARD GATE INGRESS VERIFICATION TEST SUITE')
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

// ----------------------------------------------------
// Test Group 1: Reason Code Stability
// ----------------------------------------------------
console.log('Test Group 1: Reason Code Constants')
assert(GATE_REASON_CODES.ENTRY_APPROVED === 'ENTRY_APPROVED', 'ENTRY_APPROVED code exists')
assert(GATE_REASON_CODES.UNAUTHORIZED_GUARD === 'UNAUTHORIZED_GUARD', 'UNAUTHORIZED_GUARD code exists')
assert(GATE_REASON_CODES.INVALID_QR === 'INVALID_QR', 'INVALID_QR code exists')
assert(GATE_REASON_CODES.RESERVATION_NOT_FOUND === 'RESERVATION_NOT_FOUND', 'RESERVATION_NOT_FOUND code exists')
assert(GATE_REASON_CODES.RESERVATION_CANCELLED === 'RESERVATION_CANCELLED', 'RESERVATION_CANCELLED code exists')
assert(GATE_REASON_CODES.RESERVATION_EXPIRED === 'RESERVATION_EXPIRED', 'RESERVATION_EXPIRED code exists')
assert(GATE_REASON_CODES.PAYMENT_NOT_VERIFIED === 'PAYMENT_NOT_VERIFIED', 'PAYMENT_NOT_VERIFIED code exists')
assert(GATE_REASON_CODES.SLOT_NOT_FOUND === 'SLOT_NOT_FOUND', 'SLOT_NOT_FOUND code exists')
assert(GATE_REASON_CODES.SLOT_NOT_RESERVED === 'SLOT_NOT_RESERVED', 'SLOT_NOT_RESERVED code exists')
assert(GATE_REASON_CODES.VEHICLE_MISMATCH === 'VEHICLE_MISMATCH', 'VEHICLE_MISMATCH code exists')
assert(GATE_REASON_CODES.WRONG_FLOOR === 'WRONG_FLOOR', 'WRONG_FLOOR code exists')
assert(GATE_REASON_CODES.ALREADY_INSIDE === 'ALREADY_INSIDE', 'ALREADY_INSIDE code exists')
assert(GATE_REASON_CODES.ENTRY_ALREADY_PROCESSED === 'ENTRY_ALREADY_PROCESSED', 'ENTRY_ALREADY_PROCESSED code exists')
assert(GATE_REASON_CODES.TRANSACTION_FAILED === 'TRANSACTION_FAILED', 'TRANSACTION_FAILED code exists')

// ----------------------------------------------------
// Test Group 2: Floor & Vehicle Type Zoning Rules
// ----------------------------------------------------
console.log('\nTest Group 2: Floor & Vehicle Type Rules')
assert(getFloorForVehicleType('scooty') === 'Ground Floor', 'Scooty maps to Ground Floor')
assert(getFloorForVehicleType('bike') === 'Basement', 'Bike maps to Basement')
assert(isSlotAllowedForVehicleType('G-05', 'scooty') === true, 'G-05 allowed for scooty')
assert(isSlotAllowedForVehicleType('G-05', 'bike') === false, 'G-05 rejected for bike')
assert(isSlotAllowedForVehicleType('B-12', 'bike') === true, 'B-12 allowed for bike')
assert(isSlotAllowedForVehicleType('B-12', 'scooty') === false, 'B-12 rejected for scooty')

// ----------------------------------------------------
// Test Group 3: Slot ID & Plate Normalization
// ----------------------------------------------------
console.log('\nTest Group 3: Slot & Plate Normalization')
assert(normalizeSlotId('g-05') === 'G-05', 'g-05 normalizes to G-05')
assert(normalizeSlotId('G-5') === 'G-05', 'G-5 normalizes to G-05')
assert(normalizeSlotId('b-80') === 'B-80', 'b-80 normalizes to B-80')
assert(normalizePlate('mh-12-ab-1234') === 'MH-12-AB-1234', 'License plate normalizes to uppercase')

// ----------------------------------------------------
// Test Group 4: Guard Role Authorization Simulation
// ----------------------------------------------------
console.log('\nTest Group 4: Guard Role Evaluation')
function evaluateGuardRole(role) {
  if (!role || (role !== 'Security Admin' && role !== 'Admin')) {
    return { authorized: false, reason: GATE_REASON_CODES.UNAUTHORIZED_GUARD }
  }
  return { authorized: true }
}

assert(evaluateGuardRole('Security Admin').authorized === true, 'Security Admin is authorized')
assert(evaluateGuardRole('Admin').authorized === true, 'Admin is authorized')
assert(evaluateGuardRole('Student').authorized === false, 'Student is denied')
assert(evaluateGuardRole('Faculty').authorized === false, 'Faculty is denied')
assert(evaluateGuardRole(null).authorized === false, 'Null role is denied')
assert(evaluateGuardRole('Student').reason === GATE_REASON_CODES.UNAUTHORIZED_GUARD, 'Student denial reason code is UNAUTHORIZED_GUARD')

// ----------------------------------------------------
// Test Group 5: Vehicle ANPR / Scanned Plate Matching
// ----------------------------------------------------
console.log('\nTest Group 5: Vehicle Plate Verification Logic')
function verifyPlateMatch(reservationPlate, scannedPlate) {
  if (!scannedPlate) return { match: true }
  const cleanRes = normalizePlate(reservationPlate).replace(/[^A-Z0-9]/g, '')
  const cleanScanned = normalizePlate(scannedPlate).replace(/[^A-Z0-9]/g, '')
  if (cleanRes && cleanScanned && cleanRes !== cleanScanned) {
    return { match: false, reason: GATE_REASON_CODES.VEHICLE_MISMATCH }
  }
  return { match: true }
}

assert(verifyPlateMatch('MH-12-AB-1234', 'MH-12-AB-1234').match === true, 'Exact plate matches')
assert(verifyPlateMatch('MH-12-AB-1234', 'mh 12 ab 1234').match === true, 'Different format plate matches')
assert(verifyPlateMatch('MH-12-AB-1234', 'MH-14-XY-9999').match === false, 'Mismatched plate fails')
assert(verifyPlateMatch('MH-12-AB-1234', 'MH-14-XY-9999').reason === GATE_REASON_CODES.VEHICLE_MISMATCH, 'Plate mismatch returns VEHICLE_MISMATCH')
assert(verifyPlateMatch('MH-12-AB-1234', '').match === true, 'Empty scanned plate does not block entry')

// ----------------------------------------------------
// Test Group 6: Gate Sensor Location Floor Check
// ----------------------------------------------------
console.log('\nTest Group 6: Gate Sensor Floor Verification')
function verifyGateFloorMatch(vehicleType, gateFloor) {
  if (!gateFloor) return { match: true }
  const expectedFloor = getFloorForVehicleType(vehicleType)
  const cleanGate = gateFloor.trim().toLowerCase()
  const cleanExpected = expectedFloor.trim().toLowerCase()
  if (cleanGate !== cleanExpected && !cleanGate.includes(cleanExpected) && !cleanExpected.includes(cleanGate)) {
    return { match: false, reason: GATE_REASON_CODES.WRONG_FLOOR }
  }
  return { match: true }
}

assert(verifyGateFloorMatch('scooty', 'Ground Floor').match === true, 'Scooty at Ground Floor matches')
assert(verifyGateFloorMatch('bike', 'Basement').match === true, 'Bike at Basement matches')
assert(verifyGateFloorMatch('scooty', 'Basement').match === false, 'Scooty at Basement is rejected')
assert(verifyGateFloorMatch('scooty', 'Basement').reason === GATE_REASON_CODES.WRONG_FLOOR, 'Floor mismatch returns WRONG_FLOOR')

// ----------------------------------------------------
// Test Group 7: Anti-Passback Simulation
// ----------------------------------------------------
console.log('\nTest Group 7: Anti-Passback Validation')
function checkAntiPassback(activeSessions, reservation) {
  const cleanResPlate = normalizePlate(reservation.plate).replace(/[^A-Z0-9]/g, '')
  const found = activeSessions.find((s) => {
    const sPlate = normalizePlate(s.vehicleNumber).replace(/[^A-Z0-9]/g, '')
    const sSlot = normalizeSlotId(s.slotId)
    const sResId = s.reservationId
    return sResId === reservation.id || (cleanResPlate && sPlate === cleanResPlate) || sSlot === normalizeSlotId(reservation.slotId)
  })
  if (found) {
    return { inside: true, reason: GATE_REASON_CODES.ALREADY_INSIDE }
  }
  return { inside: false }
}

const mockActiveSessions = [
  {
    id: 'SESS-1',
    reservationId: 'RES-G01-123',
    vehicleNumber: 'MH-12-AB-1234',
    slotId: 'G-01',
    status: 'active'
  }
]

assert(checkAntiPassback(mockActiveSessions, { id: 'RES-G01-123', plate: 'MH-12-AB-1234', slotId: 'G-01' }).inside === true, 'Active session detected by reservationId')
assert(checkAntiPassback(mockActiveSessions, { id: 'RES-G02-999', plate: 'MH-12-AB-1234', slotId: 'G-02' }).inside === true, 'Active session detected by plate')
assert(checkAntiPassback(mockActiveSessions, { id: 'RES-G01-999', plate: 'MH-14-XY-0000', slotId: 'G-01' }).inside === true, 'Active session detected by slotId')
assert(checkAntiPassback(mockActiveSessions, { id: 'RES-B05-777', plate: 'MH-14-ZZ-8888', slotId: 'B-05' }).inside === false, 'Non-parked vehicle passes anti-passback check')

// ----------------------------------------------------
// Test Summary
// ----------------------------------------------------
console.log('\n====================================================')
console.log(`TEST SUMMARY: ${passCount} Passed, ${failCount} Failed`)
console.log('====================================================')

if (failCount > 0) {
  process.exit(1)
} else {
  console.log('🎉 ALL GUARD GATE VERIFICATION UNIT TESTS PASSED!')
}
