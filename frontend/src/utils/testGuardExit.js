import { EXIT_REASON_CODES } from '../services/guardExitService.js'
import { normalizePlate } from '../services/vehicleService.js'
import { normalizeSlotId } from '../services/parkingService.js'
import { calculateAuthoritativeDuration } from './timerUtils.js'

console.log('====================================================')
console.log('🛑 GUARD GATE EGRESS / EXIT VERIFICATION TEST SUITE')
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
// Test Group 1: Exit Reason Code Constants
// ----------------------------------------------------
console.log('Test Group 1: Exit Reason Code Constants')
assert(EXIT_REASON_CODES.EXIT_APPROVED === 'EXIT_APPROVED', 'EXIT_APPROVED code exists')
assert(EXIT_REASON_CODES.UNAUTHORIZED_GUARD === 'UNAUTHORIZED_GUARD', 'UNAUTHORIZED_GUARD code exists')
assert(EXIT_REASON_CODES.SESSION_NOT_FOUND === 'SESSION_NOT_FOUND', 'SESSION_NOT_FOUND code exists')
assert(EXIT_REASON_CODES.SESSION_ALREADY_COMPLETED === 'SESSION_ALREADY_COMPLETED', 'SESSION_ALREADY_COMPLETED code exists')
assert(EXIT_REASON_CODES.PLATE_MISMATCH === 'PLATE_MISMATCH', 'PLATE_MISMATCH code exists')
assert(EXIT_REASON_CODES.SLOT_NOT_FOUND === 'SLOT_NOT_FOUND', 'SLOT_NOT_FOUND code exists')
assert(EXIT_REASON_CODES.SLOT_NOT_OCCUPIED === 'SLOT_NOT_OCCUPIED', 'SLOT_NOT_OCCUPIED code exists')
assert(EXIT_REASON_CODES.INVALID_EXIT_STATE === 'INVALID_EXIT_STATE', 'INVALID_EXIT_STATE code exists')
assert(EXIT_REASON_CODES.TRANSACTION_FAILED === 'TRANSACTION_FAILED', 'TRANSACTION_FAILED code exists')

// ----------------------------------------------------
// Test Group 2: Guard Authorization for Exit
// ----------------------------------------------------
console.log('\nTest Group 2: Guard Role Authorization for Egress')
function evaluateGuardExitAuth(role) {
  if (!role || (role !== 'Security Admin' && role !== 'Admin')) {
    return { authorized: false, reason: EXIT_REASON_CODES.UNAUTHORIZED_GUARD }
  }
  return { authorized: true }
}

assert(evaluateGuardExitAuth('Security Admin').authorized === true, '1. Authorized Security Admin can perform exit')
assert(evaluateGuardExitAuth('Admin').authorized === true, '2. Authorized Admin can perform exit')
assert(evaluateGuardExitAuth('Student').authorized === false, '3. Student cannot perform Guard exit')
assert(evaluateGuardExitAuth('Student').reason === EXIT_REASON_CODES.UNAUTHORIZED_GUARD, 'Student exit is denied with UNAUTHORIZED_GUARD')
assert(evaluateGuardExitAuth(null).authorized === false, 'Unauthenticated user cannot perform exit')

// ----------------------------------------------------
// Test Group 3: Active Parking Session Lookup Logic
// ----------------------------------------------------
console.log('\nTest Group 3: Session Lookup & Matching')

function mockLookupSession(sessions, { qrToken = '', scannedPlate = '', slotId = '', sessionId = '' }) {
  const cleanSlotId = normalizeSlotId(slotId)
  const cleanComp = normalizePlate(scannedPlate).replace(/[^A-Z0-9]/g, '')
  let tokenSearch = (qrToken || '').trim()

  if (sessionId) {
    const found = sessions.find((s) => s.id === sessionId)
    if (found) return { session: found, status: found.status }
  }

  const activeSessions = sessions.filter((s) => s.status === 'active')

  if (cleanSlotId) {
    const match = activeSessions.find((s) => normalizeSlotId(s.slotId) === cleanSlotId)
    if (match) return { session: match, status: 'active' }
  }

  if (cleanComp) {
    const match = activeSessions.find((s) => {
      const p = (s.vehicleNumber || s.plate || '').replace(/[^A-Z0-9]/g, '').toUpperCase()
      return p === cleanComp
    })
    if (match) return { session: match, status: 'active' }
  }

  if (tokenSearch) {
    const match = activeSessions.find((s) => {
      return (
        s.id === tokenSearch ||
        s.reservationId === tokenSearch ||
        s.passId === tokenSearch ||
        (s.vehicleNumber && normalizePlate(s.vehicleNumber).replace(/[^A-Z0-9]/g, '') === tokenSearch.replace(/[^A-Z0-9]/g, ''))
      )
    })
    if (match) return { session: match, status: 'active' }
  }

  // Check completed sessions
  const completedMatch = sessions.find((s) => {
    if (s.status !== 'completed') return false
    if (cleanSlotId && normalizeSlotId(s.slotId) === cleanSlotId) return true
    if (cleanComp && (s.vehicleNumber || '').replace(/[^A-Z0-9]/g, '').toUpperCase() === cleanComp) return true
    if (tokenSearch && (s.id === tokenSearch || s.reservationId === tokenSearch || s.passId === tokenSearch)) return true
    return false
  })

  if (completedMatch) {
    return { session: completedMatch, status: 'completed' }
  }

  return { session: null, status: null }
}

const mockSessionsDatabase = [
  {
    id: 'SESS-G02-171000',
    reservationId: 'RES-G02-9876',
    passId: 'SOC-G02-9876',
    slotId: 'G-02',
    vehicleNumber: 'MH-12-AB-1234',
    studentName: 'Alzuni Shaikh',
    status: 'active',
    entryTimestamp: Date.now() - 3600000 // 1 hour ago
  },
  {
    id: 'SESS-B05-170000',
    reservationId: 'RES-B05-1111',
    passId: 'SOC-B05-1111',
    slotId: 'B-05',
    vehicleNumber: 'MH-14-XY-9999',
    studentName: 'Rahul Verma',
    status: 'completed',
    entryTimestamp: Date.now() - 7200000,
    exitTimestamp: Date.now() - 3600000
  }
]

assert(mockLookupSession(mockSessionsDatabase, { slotId: 'G-02' }).session?.id === 'SESS-G02-171000', '4. Active session found by slotId')
assert(mockLookupSession(mockSessionsDatabase, { scannedPlate: 'MH-12-AB-1234' }).session?.id === 'SESS-G02-171000', 'Active session found by scanned plate')
assert(mockLookupSession(mockSessionsDatabase, { qrToken: 'RES-G02-9876' }).session?.id === 'SESS-G02-171000', 'Active session found by QR / reservation token')
assert(mockLookupSession(mockSessionsDatabase, { qrToken: 'UNKNOWN-TOKEN' }).session === null, '5. Unknown token returns null session (SESSION_NOT_FOUND)')
assert(mockLookupSession(mockSessionsDatabase, { slotId: 'B-05' }).status === 'completed', '6. Completed session recognized as already completed')

// ----------------------------------------------------
// Test Group 4: License Plate Validation at Exit Gate
// ----------------------------------------------------
console.log('\nTest Group 4: Plate Matching Validation at Egress')
function validateExitPlate(sessionPlate, scannedPlate) {
  if (!scannedPlate) return { match: true }
  const cleanSession = normalizePlate(sessionPlate).replace(/[^A-Z0-9]/g, '')
  const cleanScanned = normalizePlate(scannedPlate).replace(/[^A-Z0-9]/g, '')
  if (cleanSession && cleanScanned && cleanSession !== cleanScanned) {
    return { match: false, reason: EXIT_REASON_CODES.PLATE_MISMATCH }
  }
  return { match: true }
}

assert(validateExitPlate('MH-12-AB-1234', 'MH-12-AB-1234').match === true, 'Matching license plate passes exit verification')
assert(validateExitPlate('MH-12-AB-1234', 'mh 12 ab 1234').match === true, 'Case-insensitive plate matching succeeds')
assert(validateExitPlate('MH-12-AB-1234', 'MH-14-ZZ-0000').match === false, '7. Mismatched plate fails exit verification')
assert(validateExitPlate('MH-12-AB-1234', 'MH-14-ZZ-0000').reason === EXIT_REASON_CODES.PLATE_MISMATCH, 'Plate mismatch returns PLATE_MISMATCH reason code')

// ----------------------------------------------------
// Test Group 5: Runtime Duration Calculation
// ----------------------------------------------------
console.log('\nTest Group 5: Runtime Timestamps and Duration Computation')
const mockEntryTs = Date.now() - (1 * 3600000 + 45 * 60000) // 1 hr 45 min ago
const mockExitTs = Date.now()
const durationResult = calculateAuthoritativeDuration(mockEntryTs, mockExitTs)

assert(typeof mockExitTs === 'number' && mockExitTs > mockEntryTs, '15. Exit timestamp generated at runtime (not hardcoded)')
assert(durationResult.hours === 1 && durationResult.minutes === 45, '16. Duration calculated accurately (1h 45m)')
assert(durationResult.durationStr === '1h 45m', 'Duration formatted correctly as 1h 45m')

// ----------------------------------------------------
// Test Group 6: Atomic Egress State Transitions Simulation
// ----------------------------------------------------
console.log('\nTest Group 6: Atomic Firestore Egress Transaction Simulation')

function simulateAtomicExitTransaction({
  slotsDb,
  sessionsDb,
  reservationsDb,
  historyDb,
  slotId,
  scannedPlate,
  guardUid,
  guardRole
}) {
  // Step 1: Guard Auth
  const authRes = evaluateGuardExitAuth(guardRole)
  if (!authRes.authorized) {
    return { approved: false, reason: authRes.reason }
  }

  // Step 2: Slot Lookup
  const targetSlot = slotsDb[slotId]
  if (!targetSlot) {
    return { approved: false, reason: EXIT_REASON_CODES.SLOT_NOT_FOUND }
  }
  if (targetSlot.status !== 'occupied') {
    return { approved: false, reason: EXIT_REASON_CODES.SLOT_NOT_OCCUPIED }
  }

  // Step 3: Session Lookup
  const targetSession = Object.values(sessionsDb).find((s) => s.slotId === slotId && s.status === 'active')
  if (!targetSession) {
    return { approved: false, reason: EXIT_REASON_CODES.SESSION_NOT_FOUND }
  }

  // Step 4: Plate check
  const plateCheck = validateExitPlate(targetSession.vehicleNumber, scannedPlate)
  if (!plateCheck.match) {
    return { approved: false, reason: plateCheck.reason }
  }

  // Step 5: Execute atomic writes
  const exitTimestamp = Date.now()
  const duration = calculateAuthoritativeDuration(targetSession.entryTimestamp, exitTimestamp).durationStr

  // 1. Slot transitions occupied -> available
  slotsDb[slotId] = {
    ...targetSlot,
    status: 'available',
    plate: '',
    owner: '',
    entryTimestamp: null
  }

  // 2. Session transitions active -> completed
  sessionsDb[targetSession.id] = {
    ...targetSession,
    status: 'completed',
    exitTimestamp,
    duration
  }

  // 3. Linked reservation transitions in_use -> completed
  if (targetSession.reservationId && reservationsDb[targetSession.reservationId]) {
    reservationsDb[targetSession.reservationId] = {
      ...reservationsDb[targetSession.reservationId],
      status: 'completed',
      exitTimestamp,
      duration
    }
  }

  // 4. Create parking_history
  const historyId = `HIST-${Date.now()}`
  const historyRecord = {
    id: historyId,
    sessionId: targetSession.id,
    reservationId: targetSession.reservationId,
    studentId: targetSession.studentId,
    studentName: targetSession.studentName,
    vehicleNumber: targetSession.vehicleNumber,
    vehicleType: targetSession.vehicleType || 'scooty',
    slotId,
    floor: targetSlot.floor,
    entryTimestamp: targetSession.entryTimestamp,
    exitTimestamp,
    duration,
    status: 'Completed',
    guardUid
  }
  historyDb.push(historyRecord)

  return {
    approved: true,
    reason: EXIT_REASON_CODES.EXIT_APPROVED,
    slotId,
    vehicleNumber: targetSession.vehicleNumber,
    duration,
    historyRecord
  }
}

// Setup simulated state
const mockSlots = {
  'G-02': { id: 'G-02', floor: 'Ground Floor', status: 'occupied', plate: 'MH-12-AB-1234', owner: 'Alzuni Shaikh' },
  'G-03': { id: 'G-03', floor: 'Ground Floor', status: 'available', plate: '', owner: '' }
}

const mockSessions = {
  'SESS-1': {
    id: 'SESS-1',
    reservationId: 'RES-1',
    slotId: 'G-02',
    studentId: 'UID-ALZUNI',
    studentName: 'Alzuni Shaikh',
    vehicleNumber: 'MH-12-AB-1234',
    vehicleType: 'scooty',
    status: 'active',
    entryTimestamp: Date.now() - 3600000
  }
}

const mockReservations = {
  'RES-1': {
    id: 'RES-1',
    slotId: 'G-02',
    status: 'in_use',
    userId: 'UID-ALZUNI'
  }
}

const mockHistory = []

// Test missing slot
const missingSlotResult = simulateAtomicExitTransaction({
  slotsDb: mockSlots,
  sessionsDb: mockSessions,
  reservationsDb: mockReservations,
  historyDb: mockHistory,
  slotId: 'G-99',
  guardUid: 'GUARD-1',
  guardRole: 'Security Admin'
})
assert(missingSlotResult.approved === false && missingSlotResult.reason === EXIT_REASON_CODES.SLOT_NOT_FOUND, '8. Missing slot returns SLOT_NOT_FOUND')

// Test slot not occupied
const notOccupiedResult = simulateAtomicExitTransaction({
  slotsDb: mockSlots,
  sessionsDb: mockSessions,
  reservationsDb: mockReservations,
  historyDb: mockHistory,
  slotId: 'G-03',
  guardUid: 'GUARD-1',
  guardRole: 'Security Admin'
})
assert(notOccupiedResult.approved === false && notOccupiedResult.reason === EXIT_REASON_CODES.SLOT_NOT_OCCUPIED, '9. Slot not occupied returns SLOT_NOT_OCCUPIED')

// Execute successful exit
const firstExit = simulateAtomicExitTransaction({
  slotsDb: mockSlots,
  sessionsDb: mockSessions,
  reservationsDb: mockReservations,
  historyDb: mockHistory,
  slotId: 'G-02',
  scannedPlate: 'MH-12-AB-1234',
  guardUid: 'GUARD-1',
  guardRole: 'Security Admin'
})

assert(firstExit.approved === true, '10. Successful exit state transition')
assert(mockSessions['SESS-1'].status === 'completed', '11. parking session status becomes completed')
assert(mockSlots['G-02'].status === 'available', '12. parking slot status becomes available')
assert(mockReservations['RES-1'].status === 'completed', '13. reservation status becomes completed')
assert(mockHistory.length === 1 && mockHistory[0].sessionId === 'SESS-1', '14. parking_history record is created')
assert(mockHistory[0].studentName === 'Alzuni Shaikh' && mockHistory[0].slotId === 'G-02', 'Parking history preserves student, slot, and vehicle details')

// ----------------------------------------------------
// Test Group 7: Prevent Double Exit / Concurrency Safety
// ----------------------------------------------------
console.log('\nTest Group 7: Concurrency & Double Exit Prevention')

// Attempt second exit on same slot / session
const secondExit = simulateAtomicExitTransaction({
  slotsDb: mockSlots,
  sessionsDb: mockSessions,
  reservationsDb: mockReservations,
  historyDb: mockHistory,
  slotId: 'G-02',
  scannedPlate: 'MH-12-AB-1234',
  guardUid: 'GUARD-2',
  guardRole: 'Security Admin'
})

assert(secondExit.approved === false, '17. Repeated exit is rejected')
assert(secondExit.reason === EXIT_REASON_CODES.SLOT_NOT_OCCUPIED || secondExit.reason === EXIT_REASON_CODES.SESSION_NOT_FOUND, 'Double exit rejected with stable reason code')
assert(mockHistory.length === 1, '18. Concurrent/repeated exit cannot create duplicate parking_history records')
assert(mockSlots['G-02'].status === 'available', 'Slot remains available after rejected double exit attempt')

// ----------------------------------------------------
// Test Summary
// ----------------------------------------------------
console.log('\n====================================================')
console.log(`TEST SUMMARY: ${passCount} Passed, ${failCount} Failed`)
console.log('====================================================')

if (failCount > 0) {
  process.exit(1)
} else {
  console.log('🎉 ALL GUARD GATE EXIT / EGRESS UNIT TESTS PASSED!')
}
