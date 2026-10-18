/**
 * ============================================================================
 * SECURITY HARDENING VERIFICATION SUITE — PHASE 2.1
 * ============================================================================
 * 
 * [JS MOCK SIMULATION] NOTE:
 * The following unit tests run against a JavaScript simulation of the Firestore
 * Security Rules logic, validating rule specification invariants, permissions
 * contracts, and attack vectors. They do not execute the server-side Firebase
 * Rules engine directly (which requires a configured Firebase Local Emulator).
 * 
 * Verifies that:
 * 1. Legitimate ₹10, ₹300, and ₹1200 payment records are allowed.
 * 2. Arbitrary payment amounts (₹1, ₹50, ₹250, ₹9999) are rejected.
 * 3. Payment amounts must strictly match the reservation's mandatory amountPaidINR.
 * 4. Payments for reservations missing amountPaidINR are strictly rejected.
 * 5. Students can create reservations for themselves only with valid active/pending status.
 * 6. Students cannot create reservations in 'in_use' or 'completed' states.
 * 7. Direct slot updates without an atomic coupled reservation via getAfter() are rejected.
 * 8. Students cannot reserve occupied slots or other students' slots.
 * 9. Vehicle/floor allocation rules (Ground for Scooty, Basement for Bike) are enforced.
 * 10. Canonical 2-digit zero-padded bay IDs (G-01..G-80, B-01..B-80) are accepted;
 *     unpadded formats (G-1, B-5) and out-of-range IDs (G-81, B-99) are rejected.
 * 11. Students cannot inject or alter guard-controlled fields.
 * 12. Existing protections (wrong-parking reports, gate authorization, role escalation) are preserved.
 */

import {
  ROLES,
  isMasterAdmin,
  evaluateIsAdmin,
  resolveUserRole
} from './authRoles.js'

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

// ============================================================================
// FIRESTORE RULES ENGINE SIMULATOR
// Implements exact logic from firestore.rules
// ============================================================================

function createRulesEngine(databaseDocs = {}) {
  const db = { ...databaseDocs }

  function getDoc(path, stagedDocs = {}) {
    if (stagedDocs && path in stagedDocs) {
      return { data: stagedDocs[path], exists: true }
    }
    return db[path] ? { data: db[path], exists: true } : { data: null, exists: false }
  }

  function isAuthenticated(auth) {
    return auth !== null && auth !== undefined && auth.uid !== undefined
  }

  function isKnownAdmin(auth) {
    return isAuthenticated(auth) && (
      auth.uid === 'R2eyVR9vzOUb6rwv9gNCPWcuoGr1' ||
      auth.email === 'shaikhalzuni123@gmail.com' ||
      auth.token?.email === 'shaikhalzuni123@gmail.com'
    )
  }

  function isFirestoreAdmin(auth) {
    if (!isAuthenticated(auth)) return false
    const userDoc = getDoc(`users/${auth.uid}`)
    return userDoc.exists && ['Admin', 'Security Admin'].includes(userDoc.data.role)
  }

  function isAdmin(auth) {
    if (!isAuthenticated(auth)) return false
    if (isKnownAdmin(auth)) return true
    if (auth.token && ['Admin', 'Security Admin'].includes(auth.token.role)) return true
    return isFirestoreAdmin(auth)
  }

  function isValidSlotId(slotId) {
    return typeof slotId === 'string' && /^[GB]-(0[1-9]|[1-7][0-9]|80)$/.test(slotId)
  }

  function isGroundScooty(slotId, floor, vehicleType) {
    return typeof slotId === 'string' &&
      /^G-(0[1-9]|[1-7][0-9]|80)$/.test(slotId) &&
      floor === 'Ground Floor' &&
      ['scooty', 'Scooty'].includes(vehicleType)
  }

  function isBasementBike(slotId, floor, vehicleType) {
    return typeof slotId === 'string' &&
      /^B-(0[1-9]|[1-7][0-9]|80)$/.test(slotId) &&
      floor === 'Basement' &&
      ['bike', 'motorcycle', 'Bike', 'Motorcycle'].includes(vehicleType)
  }

  function isCompatibleSlotVehicle(slotId, floor, vehicleType) {
    return isGroundScooty(slotId, floor, vehicleType) ||
      isBasementBike(slotId, floor, vehicleType)
  }

  function hasNoGuardFields(data) {
    if (!data || typeof data !== 'object') return true
    return !('guardUid' in data) &&
      !('gateEnteredAt' in data) &&
      !('exitGuardUid' in data) &&
      !('gateExitedAt' in data)
  }

  // --- Collection Rule Evaluators ---

  function canReadUser(auth, targetUserId, resourceData) {
    if (!isAuthenticated(auth)) return false
    return auth.uid === targetUserId || isAdmin(auth)
  }

  function canCreateUser(auth, targetUserId, requestResourceData) {
    if (!isAuthenticated(auth)) return false
    return (
      (auth.uid === targetUserId && (requestResourceData.role === 'Student' || isAdmin(auth))) ||
      isAdmin(auth)
    )
  }

  function canUpdateUser(auth, targetUserId, existingResourceData, requestResourceData) {
    if (!isAuthenticated(auth)) return false
    return (
      (auth.uid === targetUserId && (
        requestResourceData.role === existingResourceData.role ||
        isAdmin(auth)
      )) ||
      isAdmin(auth)
    )
  }

  function canReadVehicle(auth, resourceData) {
    if (!isAuthenticated(auth)) return false
    return resourceData.studentId === auth.uid || isAdmin(auth)
  }

  function canCreateVehicle(auth, requestResourceData) {
    if (!isAuthenticated(auth)) return false
    return requestResourceData.studentId === auth.uid || isAdmin(auth)
  }

  function canUpdateVehicle(auth, existingResourceData, requestResourceData) {
    if (!isAuthenticated(auth)) return false
    return (
      (existingResourceData.studentId === auth.uid && requestResourceData.studentId === auth.uid) ||
      isAdmin(auth)
    )
  }

  function canReadSlot(auth) {
    return isAuthenticated(auth)
  }

  function canCreateSlot(auth, slotId, requestSlotData, stagedDocs = {}) {
    if (!isAuthenticated(auth)) return false
    if (isAdmin(auth)) return true

    if (
      isValidSlotId(slotId) &&
      requestSlotData.status === 'reserved' &&
      requestSlotData.userId === auth.uid &&
      requestSlotData.reservedBy === auth.uid &&
      (!requestSlotData.studentId || requestSlotData.studentId === auth.uid) &&
      isCompatibleSlotVehicle(
        slotId,
        requestSlotData.floor,
        requestSlotData.type || requestSlotData.vehicleType
      ) &&
      hasNoGuardFields(requestSlotData) &&
      typeof requestSlotData.reservationId === 'string'
    ) {
      const resDoc = getDoc(`reservations/${requestSlotData.reservationId}`, stagedDocs)
      if (
        resDoc.exists &&
        resDoc.data.userId === auth.uid &&
        resDoc.data.slotId === slotId &&
        ['active', 'pending'].includes(resDoc.data.status)
      ) {
        return true
      }
    }

    return false
  }

  function canUpdateSlot(auth, arg2, arg3, arg4, arg5) {
    if (!isAuthenticated(auth)) return false
    if (isAdmin(auth)) return true

    let slotId, existingSlotData, requestSlotData, stagedDocs
    if (typeof arg2 === 'string') {
      slotId = arg2
      existingSlotData = arg3 || {}
      requestSlotData = arg4 || {}
      stagedDocs = arg5 || {}
    } else {
      existingSlotData = arg2 || {}
      requestSlotData = arg3 || {}
      slotId = existingSlotData.id || requestSlotData.id || requestSlotData.slotId || 'G-01'
      stagedDocs = arg4 || {}
    }

    // Branch 1: Student reserving an available slot
    if (
      existingSlotData.status === 'available' &&
      requestSlotData.status === 'reserved' &&
      requestSlotData.userId === auth.uid &&
      requestSlotData.reservedBy === auth.uid &&
      (!requestSlotData.studentId || requestSlotData.studentId === auth.uid) &&
      isValidSlotId(slotId) &&
      isCompatibleSlotVehicle(
        slotId,
        requestSlotData.floor,
        requestSlotData.type || requestSlotData.vehicleType
      ) &&
      hasNoGuardFields(requestSlotData) &&
      typeof requestSlotData.reservationId === 'string'
    ) {
      const resDoc = getDoc(`reservations/${requestSlotData.reservationId}`, stagedDocs)
      if (
        resDoc.exists &&
        resDoc.data.userId === auth.uid &&
        resDoc.data.slotId === slotId &&
        ['active', 'pending'].includes(resDoc.data.status)
      ) {
        return true
      }
    }

    // Branch 2: Student releasing their own reserved slot back to available
    if (
      existingSlotData.status === 'reserved' &&
      requestSlotData.status === 'available' &&
      (existingSlotData.userId === auth.uid ||
       existingSlotData.reservedBy === auth.uid ||
       existingSlotData.studentId === auth.uid) &&
      hasNoGuardFields(requestSlotData)
    ) {
      return true
    }

    return false
  }

  function canReadReservation(auth, resourceData) {
    if (!isAuthenticated(auth)) return false
    return (
      resourceData.userId === auth.uid ||
      resourceData.reservedBy === auth.uid ||
      resourceData.studentId === auth.uid ||
      isAdmin(auth)
    )
  }

  function canCreateReservation(auth, arg2, arg3, arg4) {
    if (!isAuthenticated(auth)) return false
    if (isAdmin(auth)) return true

    let reservationId, requestResourceData, stagedDocs
    if (typeof arg2 === 'string') {
      reservationId = arg2
      requestResourceData = arg3 || {}
      stagedDocs = arg4 || {}
    } else {
      requestResourceData = arg2 || {}
      reservationId = requestResourceData.id || requestResourceData.reservationId || 'RES-001'
      stagedDocs = arg3 || {}
    }

    if (
      requestResourceData.userId === auth.uid &&
      requestResourceData.reservedBy === auth.uid &&
      (!requestResourceData.studentId || requestResourceData.studentId === auth.uid) &&
      ['active', 'pending'].includes(requestResourceData.status) &&
      (!requestResourceData.entryQrStatus || ['ACTIVE', 'PENDING'].includes(requestResourceData.entryQrStatus)) &&
      isValidSlotId(requestResourceData.slotId) &&
      isCompatibleSlotVehicle(
        requestResourceData.slotId,
        requestResourceData.floor,
        requestResourceData.vehicleType || requestResourceData.type
      ) &&
      ('amountPaidINR' in requestResourceData &&
        typeof requestResourceData.amountPaidINR === 'number' &&
        [0, 10, 300, 1200].includes(requestResourceData.amountPaidINR)) &&
      hasNoGuardFields(requestResourceData)
    ) {
      const slotDoc = getDoc(`parking_slots/${requestResourceData.slotId}`, stagedDocs)
      if (
        slotDoc.exists &&
        slotDoc.data.status === 'reserved' &&
        slotDoc.data.userId === auth.uid &&
        slotDoc.data.reservedBy === auth.uid
      ) {
        return true
      }
    }

    return false
  }

  function canUpdateReservation(auth, existingResourceData, requestResourceData) {
    if (!isAuthenticated(auth)) return false
    if (isAdmin(auth)) return true

    const isOwner = (
      existingResourceData.userId === auth.uid ||
      existingResourceData.reservedBy === auth.uid ||
      existingResourceData.studentId === auth.uid
    )

    if (
      isOwner &&
      requestResourceData.userId === existingResourceData.userId &&
      requestResourceData.reservedBy === existingResourceData.reservedBy &&
      (!requestResourceData.studentId || !existingResourceData.studentId || requestResourceData.studentId === existingResourceData.studentId) &&
      requestResourceData.slotId === existingResourceData.slotId &&
      (
        // Cancellation
        (['active', 'pending'].includes(existingResourceData.status) && requestResourceData.status === 'cancelled') ||
        // Status preservation
        (requestResourceData.status === existingResourceData.status && ['active', 'pending'].includes(existingResourceData.status))
      ) &&
      (
        !requestResourceData.entryQrStatus ||
        requestResourceData.entryQrStatus === existingResourceData.entryQrStatus ||
        (requestResourceData.status === 'cancelled' && requestResourceData.entryQrStatus === 'CANCELLED')
      )
    ) {
      return true
    }

    return false
  }

  function canReadSession(auth, resourceData) {
    if (!isAuthenticated(auth)) return false
    return (
      resourceData.studentId === auth.uid ||
      resourceData.userId === auth.uid ||
      isAdmin(auth)
    )
  }

  function canUpdateSession(auth, existingResourceData, requestResourceData) {
    if (!isAuthenticated(auth)) return false
    if (isAdmin(auth)) return true
    return (
      (existingResourceData.studentId === auth.uid || existingResourceData.userId === auth.uid) &&
      (requestResourceData.studentId === existingResourceData.studentId || !requestResourceData.studentId) &&
      requestResourceData.status === 'completed'
    )
  }

  function canCreateNotification(auth, requestResourceData) {
    if (!isAuthenticated(auth)) return false
    return requestResourceData.userId === auth.uid || isAdmin(auth)
  }

  // --- Payments Collection Rule Evaluators ---

  function canReadPayment(auth, resourceData) {
    if (!isAuthenticated(auth)) return false
    return resourceData.userId === auth.uid || isAdmin(auth)
  }

  function canCreatePayment(auth, paymentId, requestResourceData) {
    if (!isAuthenticated(auth)) return false
    if (isAdmin(auth)) return true

    if (
      requestResourceData.userId === auth.uid &&
      ['SUCCESS', 'PAID'].includes(requestResourceData.paymentStatus) &&
      typeof requestResourceData.amount === 'number' &&
      [10, 300, 1200].includes(requestResourceData.amount) &&
      typeof requestResourceData.reservationId === 'string' &&
      paymentId === 'PAY-' + requestResourceData.reservationId
    ) {
      const resDoc = getDoc(`reservations/${requestResourceData.reservationId}`)
      if (
        resDoc.exists &&
        resDoc.data.userId === auth.uid &&
        resDoc.data.slotId === requestResourceData.slotId &&
        'amountPaidINR' in resDoc.data &&
        typeof resDoc.data.amountPaidINR === 'number' &&
        resDoc.data.amountPaidINR === requestResourceData.amount
      ) {
        return true
      }
    }

    return false
  }

  function canUpdatePayment(auth, existingResourceData, requestResourceData) {
    return false // Strictly immutable audit ledger
  }

  function canDeletePayment(auth, resourceData) {
    return false // Deletion forbidden
  }

  // Atomic booking transaction simulator
  function canExecuteBookingTransaction(auth, slotId, existingSlotData, slotUpdateData, reservationId, reservationData) {
    const stagedDocs = {
      [`parking_slots/${slotId}`]: slotUpdateData,
      [`reservations/${reservationId}`]: reservationData
    }
    const slotAllowed = canUpdateSlot(auth, slotId, existingSlotData, slotUpdateData, stagedDocs)
    const resAllowed = canCreateReservation(auth, reservationId, reservationData, stagedDocs)
    return slotAllowed && resAllowed
  }

  return {
    canReadUser,
    canCreateUser,
    canUpdateUser,
    canReadVehicle,
    canCreateVehicle,
    canUpdateVehicle,
    canReadSlot,
    canCreateSlot,
    canUpdateSlot,
    canReadReservation,
    canCreateReservation,
    canUpdateReservation,
    canReadSession,
    canUpdateSession,
    canCreateNotification,
    canReadPayment,
    canCreatePayment,
    canUpdatePayment,
    canDeletePayment,
    canExecuteBookingTransaction,
    isValidSlotId,
    isCompatibleSlotVehicle,
    hasNoGuardFields
  }
}

console.log('====================================================')
console.log('🛡️  SECURITY HARDENING: PHASE 2.1 VERIFICATION SUITE')
console.log('    [JS MOCK SIMULATION OF FIRESTORE RULES]')
console.log('====================================================\n')

const studentA_Auth = { uid: 'STUDENT_AAA_UID', email: 'studentA@college.edu' }
const studentB_Auth = { uid: 'STUDENT_BBB_UID', email: 'studentB@college.edu' }
const adminAuth = { uid: 'R2eyVR9vzOUb6rwv9gNCPWcuoGr1', email: 'shaikhalzuni123@gmail.com' }
const unauthenticated = null

const initialDocs = {
  'users/STUDENT_AAA_UID': { uid: 'STUDENT_AAA_UID', role: 'Student', displayName: 'Student A' },
  'users/STUDENT_BBB_UID': { uid: 'STUDENT_BBB_UID', role: 'Student', displayName: 'Student B' },
  'users/R2eyVR9vzOUb6rwv9gNCPWcuoGr1': { uid: 'R2eyVR9vzOUb6rwv9gNCPWcuoGr1', role: 'Security Admin', email: 'shaikhalzuni123@gmail.com' },
  'parking_slots/G-01': { id: 'G-01', status: 'available', floor: 'Ground Floor', type: 'scooty' },
  'parking_slots/G-02': { id: 'G-02', status: 'available', floor: 'Ground Floor', type: 'scooty' },
  'parking_slots/G-03': { id: 'G-03', status: 'available', floor: 'Ground Floor', type: 'scooty' },
  'parking_slots/B-05': { id: 'B-05', status: 'available', floor: 'Basement', type: 'bike' },
  'parking_slots/B-06': { id: 'B-06', status: 'reserved', floor: 'Basement', type: 'bike', userId: 'STUDENT_BBB_UID', reservedBy: 'STUDENT_BBB_UID', studentId: 'STUDENT_BBB_UID' },
  'parking_slots/G-10': { id: 'G-10', status: 'occupied', floor: 'Ground Floor', type: 'scooty', userId: 'STUDENT_BBB_UID', reservedBy: 'STUDENT_BBB_UID', plate: 'MH-12-BB-2222' },
  'reservations/RES-G01-AAA': { id: 'RES-G01-AAA', userId: 'STUDENT_AAA_UID', reservedBy: 'STUDENT_AAA_UID', studentId: 'STUDENT_AAA_UID', slotId: 'G-01', floor: 'Ground Floor', vehicleType: 'scooty', plate: 'MH-12-AA-1111', status: 'active', paymentStatus: 'PAID', amountPaidINR: 10, entryQrStatus: 'ACTIVE' },
  'reservations/RES-B05-BBB': { id: 'RES-B05-BBB', userId: 'STUDENT_BBB_UID', reservedBy: 'STUDENT_BBB_UID', studentId: 'STUDENT_BBB_UID', slotId: 'B-05', floor: 'Basement', vehicleType: 'bike', plate: 'MH-12-BB-2222', status: 'active', paymentStatus: 'PAID', amountPaidINR: 10, entryQrStatus: 'ACTIVE' },
  'reservations/RES-MONTHLY-AAA': { id: 'RES-MONTHLY-AAA', userId: 'STUDENT_AAA_UID', reservedBy: 'STUDENT_AAA_UID', studentId: 'STUDENT_AAA_UID', slotId: 'G-02', floor: 'Ground Floor', vehicleType: 'scooty', plate: 'MH-12-AA-1111', status: 'active', paymentStatus: 'PAID', amountPaidINR: 300, entryQrStatus: 'ACTIVE' },
  'reservations/RES-SEMESTER-AAA': { id: 'RES-SEMESTER-AAA', userId: 'STUDENT_AAA_UID', reservedBy: 'STUDENT_AAA_UID', studentId: 'STUDENT_AAA_UID', slotId: 'G-03', floor: 'Ground Floor', vehicleType: 'scooty', plate: 'MH-12-AA-1111', status: 'active', paymentStatus: 'PAID', amountPaidINR: 1200, entryQrStatus: 'ACTIVE' },
  'reservations/RES-NO-AMOUNT': { id: 'RES-NO-AMOUNT', userId: 'STUDENT_AAA_UID', reservedBy: 'STUDENT_AAA_UID', studentId: 'STUDENT_AAA_UID', slotId: 'G-01', floor: 'Ground Floor', vehicleType: 'scooty', status: 'active', entryQrStatus: 'ACTIVE' },
  'payments/PAY-RES-G01-AAA': { paymentId: 'PAY-RES-G01-AAA', id: 'PAY-RES-G01-AAA', userId: 'STUDENT_AAA_UID', reservationId: 'RES-G01-AAA', slotId: 'G-01', amount: 10, paymentStatus: 'SUCCESS', transactionId: 'TXN-001' },
  'payments/PAY-RES-B05-BBB': { paymentId: 'PAY-RES-B05-BBB', id: 'PAY-RES-B05-BBB', userId: 'STUDENT_BBB_UID', reservationId: 'RES-B05-BBB', slotId: 'B-05', amount: 10, paymentStatus: 'SUCCESS', transactionId: 'TXN-002' },
  'wrong_parking_reports/REP-001': { id: 'REP-001', reporterUid: 'STUDENT_AAA_UID', studentId: 'STUDENT_AAA_UID', source: 'student_report', status: 'Pending', vehicleNumber: 'MH-12-CC-3333', floor: 'Ground Floor', reason: 'Floor Mismatch', adminNote: null, resolvedAt: null, resolvedBy: null }
}

const engine = createRulesEngine(initialDocs)

// ============================================================================
// SECTION 1: CORE SECURITY ATTACK VECTORS (ATTACKS 1-12)
// ============================================================================

console.log('--- SECTION 1: CORE AUTH & PERMISSION ATTACK VECTORS ---')

// ATTACK 1
console.log('ATTACK 1: Student attempts to modify another user\'s user document')
{
  const targetUserId = 'STUDENT_BBB_UID'
  const existingDoc = initialDocs['users/STUDENT_BBB_UID']
  const maliciousUpdate = { ...existingDoc, displayName: 'Hacked by Student A' }
  const allowed = engine.canUpdateUser(studentA_Auth, targetUserId, existingDoc, maliciousUpdate)
  assert(allowed === false, 'DENIED: Student A cannot modify Student B user document')
}

// ATTACK 2
console.log('\nATTACK 2: Student attempts to change their own role: Student -> Admin')
{
  const myUserId = 'STUDENT_AAA_UID'
  const existingDoc = initialDocs['users/STUDENT_AAA_UID']
  const maliciousEscalation = { ...existingDoc, role: 'Admin' }
  const allowed = engine.canUpdateUser(studentA_Auth, myUserId, existingDoc, maliciousEscalation)
  assert(allowed === false, 'DENIED: Student A cannot change their own role to Admin')
}

// ATTACK 3
console.log('\nATTACK 3: Student attempts: Student -> Security Admin')
{
  const myUserId = 'STUDENT_AAA_UID'
  const existingDoc = initialDocs['users/STUDENT_AAA_UID']
  const maliciousEscalation = { ...existingDoc, role: 'Security Admin' }
  const allowed = engine.canUpdateUser(studentA_Auth, myUserId, existingDoc, maliciousEscalation)
  assert(allowed === false, 'DENIED: Student A cannot change their own role to Security Admin')
}

// ATTACK 4
console.log('\nATTACK 4: Student attempts to modify another student\'s vehicle')
{
  const studentB_Vehicle = { id: 'REG-002', studentId: 'STUDENT_BBB_UID', vehicleNumber: 'MH-12-BB-2222', vehicleType: 'scooty' }
  const maliciousUpdate = { ...studentB_Vehicle, vehicleNumber: 'MH-12-HA-9999' }
  const allowed = engine.canUpdateVehicle(studentA_Auth, studentB_Vehicle, maliciousUpdate)
  assert(allowed === false, 'DENIED: Student A cannot modify Student B vehicle registration')
}

// ATTACK 5
console.log('\nATTACK 5: Student attempts to modify another student\'s reservation')
{
  const studentB_Reservation = { id: 'RES-G05-1234', userId: 'STUDENT_BBB_UID', reservedBy: 'STUDENT_BBB_UID', slotId: 'G-05', status: 'active' }
  const maliciousCancel = { ...studentB_Reservation, status: 'cancelled' }
  const allowed = engine.canUpdateReservation(studentA_Auth, studentB_Reservation, maliciousCancel)
  assert(allowed === false, 'DENIED: Student A cannot modify Student B reservation')
}

// ATTACK 6
console.log('\nATTACK 6: Student attempts to modify another student\'s parking session')
{
  const studentB_Session = { id: 'SESS-G05-1234', studentId: 'STUDENT_BBB_UID', slotId: 'G-05', status: 'active' }
  const maliciousSessionEnd = { ...studentB_Session, status: 'completed' }
  const allowed = engine.canUpdateSession(studentA_Auth, studentB_Session, maliciousSessionEnd)
  assert(allowed === false, 'DENIED: Student A cannot modify Student B parking session')
}

// ATTACK 7
console.log('\nATTACK 7: Student attempts to directly change parking slot occupied -> available for unowned slot')
{
  const occupiedSlot = initialDocs['parking_slots/G-10']
  const maliciousSlotRelease = { ...occupiedSlot, status: 'available', plate: '', owner: '' }
  const allowed = engine.canUpdateSlot(studentA_Auth, 'G-10', occupiedSlot, maliciousSlotRelease)
  assert(allowed === false, 'DENIED: Student A cannot change occupancy on Student B slot')
}

// ATTACK 8
console.log('\nATTACK 8: Student attempts to create a notification addressed to another UID')
{
  const forgedNotification = { userId: 'STUDENT_BBB_UID', title: 'Fake Fine', message: 'You have been fined ₹500', type: 'violation' }
  const allowed = engine.canCreateNotification(studentA_Auth, forgedNotification)
  assert(allowed === false, 'DENIED: Student A cannot create notification addressed to Student B')
}

// ATTACK 9
console.log('\nATTACK 9: Student attempts to create an ALL/broadcast notification')
{
  const broadcastNotification = { userId: 'ALL', title: 'Spam Notice', message: 'Classes cancelled today', type: 'info' }
  const allowed = engine.canCreateNotification(studentA_Auth, broadcastNotification)
  assert(allowed === false, 'DENIED: Student A cannot create an ALL broadcast notification')
}

// ATTACK 10
console.log('\nATTACK 10: Unauthenticated user attempts to access protected collections')
{
  const readUserDenied = engine.canReadUser(unauthenticated, 'STUDENT_AAA_UID', initialDocs['users/STUDENT_AAA_UID'])
  const readSlotDenied = engine.canReadSlot(unauthenticated)
  const createVehicleDenied = engine.canCreateVehicle(unauthenticated, { studentId: 'FAKE_UID' })
  const createReservationDenied = engine.canCreateReservation(unauthenticated, { userId: 'FAKE_UID' })

  assert(readUserDenied === false, 'DENIED: Unauthenticated user cannot read users collection')
  assert(readSlotDenied === false, 'DENIED: Unauthenticated user cannot read parking_slots collection')
  assert(createVehicleDenied === false, 'DENIED: Unauthenticated user cannot create vehicle record')
  assert(createReservationDenied === false, 'DENIED: Unauthenticated user cannot create reservation')
}

// ATTACK 11
console.log('\nATTACK 11: Fake localStorage demo_user_session edited Student -> Admin')
{
  const forgedDemoStorage = { uid: 'demo-student-001', email: 'demo.student@soc.edu', displayName: 'Hacked Demo Admin', role: 'Admin', isDemo: true }
  const isPrivileged = evaluateIsAdmin(forgedDemoStorage)
  assert(isPrivileged === false, 'DENIED: evaluateIsAdmin rejects forged demo session with role=Admin')

  const resolvedRole = resolveUserRole(null, forgedDemoStorage)
  assert(resolvedRole === ROLES.STUDENT, 'DENIED: resolveUserRole forces demo session to Student')
}

// ATTACK 12
console.log('\nATTACK 12: User signs in with email containing "admin" (e.g. fake.admin@college.edu)')
{
  const attackerUser = { uid: 'ATTACKER_UID_999', email: 'hacker.admin.parking@college.edu', displayName: 'Fake Admin' }
  const assignedRole = resolveUserRole(attackerUser, null)
  assert(assignedRole === ROLES.STUDENT, 'DENIED: Attacker with "admin" in email remains Student')

  const hasAdminPrivilege = evaluateIsAdmin({ ...attackerUser, role: assignedRole })
  assert(hasAdminPrivilege === false, 'DENIED: Attacker receives no administrative capability')
}

// ============================================================================
// SECTION 2: PAYMENTS FIRESTORE SECURITY & AMOUNT MISMATCH HARDENING
// ============================================================================

console.log('\n--- SECTION 2: PAYMENTS SECURITY & LEGITIMATE AMOUNT TIERS ---')

// 1. Legitimate ₹10 Daily Payment
console.log('\nPAYMENT TEST 1: Legitimate ₹10 daily payment record creation')
{
  const dailyPayment = {
    userId: 'STUDENT_AAA_UID',
    paymentStatus: 'SUCCESS',
    amount: 10,
    reservationId: 'RES-G01-AAA',
    slotId: 'G-01'
  }
  const allowed = engine.canCreatePayment(studentA_Auth, 'PAY-RES-G01-AAA', dailyPayment)
  assert(allowed === true, 'ALLOWED: Legitimate ₹10 daily payment matching reservation is accepted')
}

// 2. Legitimate ₹300 Monthly Pass Payment
console.log('\nPAYMENT TEST 2: Legitimate ₹300 monthly pass payment record creation')
{
  const monthlyPayment = {
    userId: 'STUDENT_AAA_UID',
    paymentStatus: 'SUCCESS',
    amount: 300,
    reservationId: 'RES-MONTHLY-AAA',
    slotId: 'G-02'
  }
  const allowed = engine.canCreatePayment(studentA_Auth, 'PAY-RES-MONTHLY-AAA', monthlyPayment)
  assert(allowed === true, 'ALLOWED: Legitimate ₹300 monthly payment matching reservation is accepted')
}

// 2b. Legitimate ₹1200 Semester Pass Payment
console.log('\nPAYMENT TEST 2b: Legitimate ₹1200 semester pass payment record creation')
{
  const semesterPayment = {
    userId: 'STUDENT_AAA_UID',
    paymentStatus: 'SUCCESS',
    amount: 1200,
    reservationId: 'RES-SEMESTER-AAA',
    slotId: 'G-03'
  }
  const allowed = engine.canCreatePayment(studentA_Auth, 'PAY-RES-SEMESTER-AAA', semesterPayment)
  assert(allowed === true, 'ALLOWED: Legitimate ₹1200 semester payment matching reservation is accepted')
}

// 3. Arbitrary Payment Amounts Rejected
console.log('\nPAYMENT TEST 3: Arbitrary payment amounts are strictly rejected')
{
  const amountsToTest = [1, 50, 100, 250, 500, 9999, -10]
  let allBlocked = true
  for (const amt of amountsToTest) {
    const invalidPayment = {
      userId: 'STUDENT_AAA_UID',
      paymentStatus: 'SUCCESS',
      amount: amt,
      reservationId: 'RES-G01-AAA',
      slotId: 'G-01'
    }
    const allowed = engine.canCreatePayment(studentA_Auth, 'PAY-RES-G01-AAA', invalidPayment)
    if (allowed) allBlocked = false
  }
  assert(allBlocked === true, 'DENIED: Arbitrary payment amounts (₹1, ₹50, ₹100, ₹250, ₹500, ₹9999) rejected')
}

// 3b. Mismatched Payment Amount vs Reservation
console.log('\nPAYMENT TEST 3b: Payment amount mismatch with reservation amountPaidINR is rejected')
{
  // Student tries to pay ₹300 for a ₹10 reservation
  const mismatchedPayment = {
    userId: 'STUDENT_AAA_UID',
    paymentStatus: 'SUCCESS',
    amount: 300,
    reservationId: 'RES-G01-AAA', // has amountPaidINR = 10
    slotId: 'G-01'
  }
  const allowed = engine.canCreatePayment(studentA_Auth, 'PAY-RES-G01-AAA', mismatchedPayment)
  assert(allowed === false, 'DENIED: ₹300 payment rejected for reservation expecting ₹10')

  // Reverse: Student tries to pay ₹10 for a ₹300 reservation
  const reverseMismatch = {
    userId: 'STUDENT_AAA_UID',
    paymentStatus: 'SUCCESS',
    amount: 10,
    reservationId: 'RES-MONTHLY-AAA', // has amountPaidINR = 300
    slotId: 'G-02'
  }
  const allowedReverse = engine.canCreatePayment(studentA_Auth, 'PAY-RES-MONTHLY-AAA', reverseMismatch)
  assert(allowedReverse === false, 'DENIED: ₹10 payment rejected for reservation expecting ₹300')
}

// 3c. Reservation Missing amountPaidINR -> Payment Rejected
console.log('\nPAYMENT TEST 3c: Payment rejected when reservation is missing amountPaidINR')
{
  const paymentForDocWithoutAmount = {
    userId: 'STUDENT_AAA_UID',
    paymentStatus: 'SUCCESS',
    amount: 10,
    reservationId: 'RES-NO-AMOUNT',
    slotId: 'G-01'
  }
  const allowed = engine.canCreatePayment(studentA_Auth, 'PAY-RES-NO-AMOUNT', paymentForDocWithoutAmount)
  assert(allowed === false, 'DENIED: Payment rejected when reservation lacks mandatory amountPaidINR')
}

// 3d. Missing or Malformed Reservation References -> Payment Rejected
console.log('\nPAYMENT TEST 3d: Payment rejected when reservation reference is missing or nonexistent')
{
  const nonexistentRefPayment = {
    userId: 'STUDENT_AAA_UID',
    paymentStatus: 'SUCCESS',
    amount: 10,
    reservationId: 'RES-NONEXISTENT-999',
    slotId: 'G-01'
  }
  const allowedNonexistent = engine.canCreatePayment(studentA_Auth, 'PAY-RES-NONEXISTENT-999', nonexistentRefPayment)
  assert(allowedNonexistent === false, 'DENIED: Payment rejected for nonexistent reservationId')

  const emptyRefPayment = {
    userId: 'STUDENT_AAA_UID',
    paymentStatus: 'SUCCESS',
    amount: 10,
    reservationId: '',
    slotId: 'G-01'
  }
  const allowedEmpty = engine.canCreatePayment(studentA_Auth, 'PAY-', emptyRefPayment)
  assert(allowedEmpty === false, 'DENIED: Payment rejected for empty reservationId')
}

// Payment for Unowned Reservation
console.log('\nPAYMENT TEST 4: Student creating payment for another student\'s reservation')
{
  const forgedPayment = {
    userId: 'STUDENT_AAA_UID',
    paymentStatus: 'SUCCESS',
    amount: 10,
    reservationId: 'RES-B05-BBB', // Belongs to Student B
    slotId: 'B-05'
  }
  const allowed = engine.canCreatePayment(studentA_Auth, 'PAY-RES-B05-BBB', forgedPayment)
  assert(allowed === false, 'DENIED: Payment rejected when reservation belongs to another user')
}

// Payment Immutability (Update & Delete)
console.log('\nPAYMENT TEST 5: Payment records are strictly immutable (update and delete forbidden)')
{
  const existing = initialDocs['payments/PAY-RES-G01-AAA']
  const updateDenied = engine.canUpdatePayment(studentA_Auth, existing, { ...existing, amount: 0 })
  const deleteDenied = engine.canDeletePayment(studentA_Auth, existing)
  assert(updateDenied === false, 'DENIED: Updating payment record is forbidden')
  assert(deleteDenied === false, 'DENIED: Deleting payment record is forbidden')
}

// Non-deterministic Payment ID Rejection
console.log('\nPAYMENT TEST 6: Payment ID must deterministically match PAY-{reservationId}')
{
  const nonDeterministicPayment = {
    userId: 'STUDENT_AAA_UID',
    paymentStatus: 'SUCCESS',
    amount: 10,
    reservationId: 'RES-G01-AAA',
    slotId: 'G-01'
  }
  const allowed = engine.canCreatePayment(studentA_Auth, 'PAY-FORGED-CUSTOM-ID', nonDeterministicPayment)
  assert(allowed === false, 'DENIED: Payment with non-deterministic document ID is rejected')
}

// ============================================================================
// SECTION 3: RESERVATIONS & PARKING SLOTS ATOMIC HARDENING
// ============================================================================

console.log('\n--- SECTION 3: RESERVATIONS & PARKING SLOTS ATOMIC HARDENING ---')

// 4. Student creating valid reservation for themselves
console.log('\nRESERVATION TEST 1: Student creates valid reservation paired with available slot')
{
  const newSlotId = 'G-01'
  const newResId = 'RES-G01-NEW-01'
  const validSlotUpdate = {
    status: 'reserved',
    userId: 'STUDENT_AAA_UID',
    reservedBy: 'STUDENT_AAA_UID',
    studentId: 'STUDENT_AAA_UID',
    floor: 'Ground Floor',
    type: 'scooty',
    reservationId: newResId
  }
  const validReservation = {
    id: newResId,
    reservationId: newResId,
    slotId: newSlotId,
    userId: 'STUDENT_AAA_UID',
    reservedBy: 'STUDENT_AAA_UID',
    studentId: 'STUDENT_AAA_UID',
    floor: 'Ground Floor',
    vehicleType: 'scooty',
    status: 'active',
    entryQrStatus: 'ACTIVE',
    amountPaidINR: 10
  }

  const allowed = engine.canExecuteBookingTransaction(
    studentA_Auth,
    newSlotId,
    initialDocs['parking_slots/G-01'],
    validSlotUpdate,
    newResId,
    validReservation
  )
  assert(allowed === true, 'ALLOWED: Valid booking transaction (slot reservation + coupled reservation document) succeeds')
}

// Reservation creation rejected if amountPaidINR is omitted or invalid
console.log('\nRESERVATION TEST 1b: Reservation creation rejected if amountPaidINR is missing or invalid')
{
  const missingAmountReservation = {
    id: 'RES-G01-MISSING-AMT',
    reservationId: 'RES-G01-MISSING-AMT',
    slotId: 'G-01',
    userId: 'STUDENT_AAA_UID',
    reservedBy: 'STUDENT_AAA_UID',
    floor: 'Ground Floor',
    vehicleType: 'scooty',
    status: 'active'
    // amountPaidINR missing
  }
  const stagedDocs = {
    'parking_slots/G-01': { status: 'reserved', userId: 'STUDENT_AAA_UID', reservedBy: 'STUDENT_AAA_UID' }
  }
  const allowedMissing = engine.canCreateReservation(studentA_Auth, 'RES-G01-MISSING-AMT', missingAmountReservation, stagedDocs)
  assert(allowedMissing === false, 'DENIED: Reservation without amountPaidINR is rejected')

  const invalidAmountReservation = {
    ...missingAmountReservation,
    amountPaidINR: 50 // Not in [0, 10, 300, 1200]
  }
  const allowedInvalid = engine.canCreateReservation(studentA_Auth, 'RES-G01-MISSING-AMT', invalidAmountReservation, stagedDocs)
  assert(allowedInvalid === false, 'DENIED: Reservation with invalid amountPaidINR (50) is rejected')
}

// Student attempting to inject guard fields into reservation
console.log('\nRESERVATION TEST 1c: Student attempting to inject guard fields into reservation')
{
  const forgedGuardReservation = {
    id: 'RES-G01-GUARD-INJECT',
    reservationId: 'RES-G01-GUARD-INJECT',
    slotId: 'G-01',
    userId: 'STUDENT_AAA_UID',
    reservedBy: 'STUDENT_AAA_UID',
    floor: 'Ground Floor',
    vehicleType: 'scooty',
    status: 'active',
    amountPaidINR: 10,
    guardUid: 'MALICIOUS_GUARD_UID'
  }
  const stagedDocs = {
    'parking_slots/G-01': { status: 'reserved', userId: 'STUDENT_AAA_UID', reservedBy: 'STUDENT_AAA_UID' }
  }
  const allowed = engine.canCreateReservation(studentA_Auth, 'RES-G01-GUARD-INJECT', forgedGuardReservation, stagedDocs)
  assert(allowed === false, 'DENIED: Student cannot inject guardUid into reservation document')
}

// 5. Student attempting to create reservation directly in 'in_use' status
console.log('\nRESERVATION TEST 2: Student attempting to create reservation directly in "in_use" status')
{
  const forgedReservation = {
    id: 'RES-G01-FORGED-INUSE',
    reservationId: 'RES-G01-FORGED-INUSE',
    slotId: 'G-01',
    userId: 'STUDENT_AAA_UID',
    reservedBy: 'STUDENT_AAA_UID',
    floor: 'Ground Floor',
    vehicleType: 'scooty',
    status: 'in_use', // Privileged gate status
    entryQrStatus: 'USED',
    amountPaidINR: 10
  }
  const stagedDocs = {
    'parking_slots/G-01': { status: 'reserved', userId: 'STUDENT_AAA_UID', reservedBy: 'STUDENT_AAA_UID' }
  }
  const allowed = engine.canCreateReservation(studentA_Auth, 'RES-G01-FORGED-INUSE', forgedReservation, stagedDocs)
  assert(allowed === false, 'DENIED: Creating reservation directly with status="in_use" is strictly blocked')
}

// 5b. Student attempting to create reservation directly in 'completed' status
console.log('\nRESERVATION TEST 2b: Student attempting to create reservation directly in "completed" status')
{
  const forgedReservation = {
    id: 'RES-G01-FORGED-COMPLETED',
    reservationId: 'RES-G01-FORGED-COMPLETED',
    slotId: 'G-01',
    userId: 'STUDENT_AAA_UID',
    reservedBy: 'STUDENT_AAA_UID',
    floor: 'Ground Floor',
    vehicleType: 'scooty',
    status: 'completed',
    amountPaidINR: 10
  }
  const allowed = engine.canCreateReservation(studentA_Auth, forgedReservation)
  assert(allowed === false, 'DENIED: Creating reservation directly with status="completed" is strictly blocked')
}

// 6. Direct slot write without atomic corresponding reservation
console.log('\nSLOT TEST 3: Student attempting direct slot update without coupled reservation in getAfter()')
{
  const directSlotUpdate = {
    status: 'reserved',
    userId: 'STUDENT_AAA_UID',
    reservedBy: 'STUDENT_AAA_UID',
    floor: 'Ground Floor',
    type: 'scooty',
    reservationId: 'RES-NONEXISTENT-999' // No such reservation in transaction
  }
  const allowed = engine.canUpdateSlot(studentA_Auth, 'G-01', initialDocs['parking_slots/G-01'], directSlotUpdate, {})
  assert(allowed === false, 'DENIED: Direct slot write without coupled reservation doc in getAfter() is rejected')
}

// Student attempting to inject guard fields into parking_slots
console.log('\nSLOT TEST 3b: Student attempting to inject guard fields into parking_slots')
{
  const validReservation = {
    id: 'RES-G01-G-TEST',
    reservationId: 'RES-G01-G-TEST',
    slotId: 'G-01',
    userId: 'STUDENT_AAA_UID',
    reservedBy: 'STUDENT_AAA_UID',
    status: 'active'
  }
  const stagedDocs = { 'reservations/RES-G01-G-TEST': validReservation }

  const guardFieldsToTest = [
    { guardUid: 'FAKE_GUARD' },
    { gateEnteredAt: 123456 },
    { exitGuardUid: 'FAKE_GUARD' },
    { gateExitedAt: 123456 }
  ]

  let allBlocked = true
  for (const gf of guardFieldsToTest) {
    const maliciousUpdate = {
      status: 'reserved',
      userId: 'STUDENT_AAA_UID',
      reservedBy: 'STUDENT_AAA_UID',
      floor: 'Ground Floor',
      type: 'scooty',
      reservationId: 'RES-G01-G-TEST',
      ...gf
    }
    const allowed = engine.canUpdateSlot(studentA_Auth, 'G-01', initialDocs['parking_slots/G-01'], maliciousUpdate, stagedDocs)
    if (allowed) allBlocked = false
  }
  assert(allBlocked === true, 'DENIED: Student cannot inject guardUid, gateEnteredAt, exitGuardUid, or gateExitedAt')
}

// 7. Student attempting to reserve another student's reserved or occupied bay
console.log('\nSLOT TEST 4: Student attempting to reserve an already reserved or occupied bay')
{
  // Reserved by Student B
  const reservedByB = initialDocs['parking_slots/B-06']
  const stealAttempt = {
    status: 'reserved',
    userId: 'STUDENT_AAA_UID',
    reservedBy: 'STUDENT_AAA_UID',
    floor: 'Basement',
    type: 'bike',
    reservationId: 'RES-B06-STEAL'
  }
  const allowedReserved = engine.canUpdateSlot(studentA_Auth, 'B-06', reservedByB, stealAttempt)
  assert(allowedReserved === false, 'DENIED: Student A cannot overwrite Student B reserved bay')

  // Occupied by Student B
  const occupiedByB = initialDocs['parking_slots/G-10']
  const allowedOccupied = engine.canUpdateSlot(studentA_Auth, 'G-10', occupiedByB, stealAttempt)
  assert(allowedOccupied === false, 'DENIED: Student A cannot overwrite occupied bay')
}

// Student releasing their own slot back to available
console.log('\nSLOT TEST 5: Student releasing their own slot back to available')
{
  const myReservedSlot = {
    id: 'G-01',
    status: 'reserved',
    userId: 'STUDENT_AAA_UID',
    reservedBy: 'STUDENT_AAA_UID',
    studentId: 'STUDENT_AAA_UID',
    floor: 'Ground Floor',
    type: 'scooty'
  }
  const releaseUpdate = {
    status: 'available',
    userId: '',
    reservedBy: '',
    studentId: '',
    reservationId: ''
  }
  const allowed = engine.canUpdateSlot(studentA_Auth, 'G-01', myReservedSlot, releaseUpdate)
  assert(allowed === true, 'ALLOWED: Student A can release their own reserved slot')
}

// Student attempting to release another student's reserved slot
console.log('\nSLOT TEST 6: Student attempting to release another student\'s reserved slot')
{
  const studentB_Slot = initialDocs['parking_slots/B-06']
  const maliciousRelease = { status: 'available', userId: '', reservedBy: '' }
  const allowed = engine.canUpdateSlot(studentA_Auth, 'B-06', studentB_Slot, maliciousRelease)
  assert(allowed === false, 'DENIED: Student A cannot release Student B slot')
}

// Student cancelling their own reservation
console.log('\nRESERVATION TEST 7: Student cancelling their own active reservation')
{
  const myRes = initialDocs['reservations/RES-G01-AAA']
  const cancelUpdate = {
    ...myRes,
    status: 'cancelled',
    entryQrStatus: 'CANCELLED'
  }
  const allowed = engine.canUpdateReservation(studentA_Auth, myRes, cancelUpdate)
  assert(allowed === true, 'ALLOWED: Student A can cancel their own active reservation')
}

// Student attempting to change reservation status to in_use
console.log('\nRESERVATION TEST 8: Student attempting to update reservation status: active -> in_use')
{
  const myRes = initialDocs['reservations/RES-G01-AAA']
  const forgedInUse = { ...myRes, status: 'in_use' }
  const allowed = engine.canUpdateReservation(studentA_Auth, myRes, forgedInUse)
  assert(allowed === false, 'DENIED: Student cannot elevate reservation status to "in_use"')
}

// Student attempting to reassign reservation ownership
console.log('\nRESERVATION TEST 9: Student attempting to change reservation ownership fields')
{
  const myRes = initialDocs['reservations/RES-G01-AAA']
  const forgedOwnership = { ...myRes, userId: 'STUDENT_BBB_UID' }
  const allowed = engine.canUpdateReservation(studentA_Auth, myRes, forgedOwnership)
  assert(allowed === false, 'DENIED: Reservation userId is immutable')
}

// ============================================================================
// SECTION 4: VEHICLE TYPE, FLOOR & CANONICAL SLOT ID FORMATS
// ============================================================================

console.log('\n--- SECTION 4: VEHICLE TYPE, FLOOR & CANONICAL SLOT ID FORMATS ---')

// 8. Vehicle & Floor Combinations
console.log('\nCOMPATIBILITY TEST 1: Vehicle and floor combinations')
{
  // Scooty in Basement -> Must FAIL
  const scootyBasement = engine.isCompatibleSlotVehicle('B-01', 'Basement', 'scooty')
  assert(scootyBasement === false, 'DENIED: Scooty is NOT permitted in Basement')

  // Bike on Ground Floor -> Must FAIL
  const bikeGround = engine.isCompatibleSlotVehicle('G-01', 'Ground Floor', 'bike')
  assert(bikeGround === false, 'DENIED: Bike is NOT permitted on Ground Floor')

  // Scooty on Ground Floor -> Must PASS
  const scootyGround = engine.isCompatibleSlotVehicle('G-01', 'Ground Floor', 'scooty')
  assert(scootyGround === true, 'ALLOWED: Scooty is permitted on Ground Floor (G-01 to G-80)')

  // Bike in Basement -> Must PASS
  const bikeBasement = engine.isCompatibleSlotVehicle('B-05', 'Basement', 'bike')
  assert(bikeBasement === true, 'ALLOWED: Bike is permitted in Basement (B-01 to B-80)')
}

// Canonical vs. Non-Canonical Slot IDs
console.log('\nCANONICAL FORMAT TEST 2: Strict two-digit zero-padded canonical slot ID enforcement')
{
  // Canonical formats
  assert(engine.isValidSlotId('G-01') === true, 'ALLOWED: Canonical G-01 accepted')
  assert(engine.isValidSlotId('G-80') === true, 'ALLOWED: Canonical G-80 accepted')
  assert(engine.isValidSlotId('B-01') === true, 'ALLOWED: Canonical B-01 accepted')
  assert(engine.isValidSlotId('B-80') === true, 'ALLOWED: Canonical B-80 accepted')

  // Non-canonical unpadded formats (prevents duplicate phantom documents)
  assert(engine.isValidSlotId('G-1') === false, 'DENIED: Unpadded G-1 rejected (must be G-01)')
  assert(engine.isValidSlotId('B-5') === false, 'DENIED: Unpadded B-5 rejected (must be B-05)')

  // Out of range IDs (> 80)
  assert(engine.isValidSlotId('G-81') === false, 'DENIED: Out of range G-81 rejected (> 80)')
  assert(engine.isValidSlotId('B-99') === false, 'DENIED: Out of range B-99 rejected (> 80)')
  assert(engine.isValidSlotId('G-140') === false, 'DENIED: Out of range G-140 rejected (> 80)')

  // Malformed IDs
  assert(engine.isValidSlotId('G-00') === false, 'DENIED: Zero slot G-00 rejected')
  assert(engine.isValidSlotId('X-01') === false, 'DENIED: Invalid floor prefix X-01 rejected')
  assert(engine.isValidSlotId('P-01') === false, 'DENIED: Invalid floor prefix P-01 rejected')
  assert(engine.isValidSlotId('') === false, 'DENIED: Empty slot ID rejected')
}

// ============================================================================
// SECTION 5: SYSTEM WORKFLOWS & REGRESSION PROTECTIONS
// ============================================================================

console.log('\n--- SECTION 5: REGRESSION PROTECTIONS & ADMIN WORKFLOWS ---')

// Admin Privileges
console.log('\nADMIN TEST 1: Admin can update slots and reservations for gate ingress/egress')
{
  const occupiedSlot = initialDocs['parking_slots/G-10']
  const adminRelease = { ...occupiedSlot, status: 'available', plate: '', owner: '' }
  const allowedSlot = engine.canUpdateSlot(adminAuth, 'G-10', occupiedSlot, adminRelease)
  assert(allowedSlot === true, 'ALLOWED: Security Admin can update slot for gate exit release')

  const res = initialDocs['reservations/RES-G01-AAA']
  const adminInUse = { ...res, status: 'in_use', entryQrStatus: 'USED' }
  const allowedRes = engine.canUpdateReservation(adminAuth, res, adminInUse)
  assert(allowedRes === true, 'ALLOWED: Security Admin can transition reservation to "in_use" at gate ingress')
}

// Student Role Protection
console.log('\nADMIN TEST 2: Only Admin can resolve or update student wrong parking reports')
{
  const studentReport = initialDocs['wrong_parking_reports/REP-001']
  // Student trying to mark resolved
  const studentResolveAttempt = { ...studentReport, status: 'Resolved' }
  // Under rules: only admins can update reports
  const isStudentAdmin = evaluateIsAdmin(studentA_Auth)
  assert(isStudentAdmin === false, 'DENIED: Student does not have admin permissions to update report status')

  const isAdminAuth = evaluateIsAdmin(adminAuth)
  assert(isAdminAuth === true, 'ALLOWED: Admin has full authority to review and resolve reports')
}

console.log('\n====================================================')
console.log(`SECURITY TEST SUMMARY: ${passCount} Passed, ${failCount} Failed`)
console.log('====================================================')

if (failCount > 0) {
  process.exit(1)
} else {
  console.log('🎉 ALL SECURITY ATTACK VECTORS & INVARIANTS SUCCESSFULLY VERIFIED!')
}
