/**
 * ============================================================================
 * SECURITY HARDENING VERIFICATION SUITE — 12 ATTACK VECTORS
 * ============================================================================
 * 
 * Verifies that the server-side Firestore security rules logic and frontend
 * authentication role resolution strictly block all unauthorized operations.
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

  function getDoc(path) {
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

  function canUpdateSlot(auth, existingSlotData, requestSlotData) {
    if (!isAuthenticated(auth)) return false
    if (isAdmin(auth)) return true

    // Student reserving an available slot for themselves
    if (
      existingSlotData.status === 'available' &&
      requestSlotData.status === 'reserved' &&
      requestSlotData.userId === auth.uid &&
      requestSlotData.reservedBy === auth.uid
    ) {
      return true
    }

    // Student releasing their own slot back to available
    if (
      requestSlotData.status === 'available' &&
      (existingSlotData.userId === auth.uid ||
       existingSlotData.reservedBy === auth.uid ||
       existingSlotData.studentId === auth.uid)
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

  function canCreateReservation(auth, requestResourceData) {
    if (!isAuthenticated(auth)) return false
    return (
      (requestResourceData.userId === auth.uid &&
       requestResourceData.reservedBy === auth.uid &&
       (!requestResourceData.studentId || requestResourceData.studentId === auth.uid)) ||
      isAdmin(auth)
    )
  }

  function canUpdateReservation(auth, existingResourceData, requestResourceData) {
    if (!isAuthenticated(auth)) return false
    return (
      (
        (existingResourceData.userId === auth.uid ||
         existingResourceData.reservedBy === auth.uid ||
         existingResourceData.studentId === auth.uid) &&
        requestResourceData.userId === existingResourceData.userId &&
        requestResourceData.reservedBy === existingResourceData.reservedBy
      ) ||
      isAdmin(auth)
    )
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
      requestResourceData.amount === 10 &&
      typeof requestResourceData.reservationId === 'string' &&
      paymentId === 'PAY-' + requestResourceData.reservationId
    ) {
      const resDoc = getDoc(`reservations/${requestResourceData.reservationId}`)
      if (
        resDoc.exists &&
        resDoc.data.userId === auth.uid &&
        resDoc.data.slotId === requestResourceData.slotId
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

  return {
    canReadUser,
    canCreateUser,
    canUpdateUser,
    canReadVehicle,
    canCreateVehicle,
    canUpdateVehicle,
    canReadSlot,
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
    canDeletePayment
  }
}

console.log('====================================================')
console.log('🛡️  SECURITY HARDENING: 12 ATTACK VECTOR TEST SUITE')
console.log('====================================================\n')

const studentA_Auth = { uid: 'STUDENT_AAA_UID', email: 'studentA@college.edu' }
const studentB_Auth = { uid: 'STUDENT_BBB_UID', email: 'studentB@college.edu' }
const unauthenticated = null

const initialDocs = {
  'users/STUDENT_AAA_UID': { uid: 'STUDENT_AAA_UID', role: 'Student', displayName: 'Student A' },
  'users/STUDENT_BBB_UID': { uid: 'STUDENT_BBB_UID', role: 'Student', displayName: 'Student B' },
  'users/R2eyVR9vzOUb6rwv9gNCPWcuoGr1': { uid: 'R2eyVR9vzOUb6rwv9gNCPWcuoGr1', role: 'Security Admin', email: 'shaikhalzuni123@gmail.com' },
  'reservations/RES-G01-AAA': { id: 'RES-G01-AAA', userId: 'STUDENT_AAA_UID', slotId: 'G-01', plate: 'MH-12-AA-1111', status: 'active', paymentStatus: 'PAID', amountPaidINR: 10 },
  'reservations/RES-B05-BBB': { id: 'RES-B05-BBB', userId: 'STUDENT_BBB_UID', slotId: 'B-05', plate: 'MH-12-BB-2222', status: 'active', paymentStatus: 'PAID', amountPaidINR: 10 },
  'payments/PAY-RES-G01-AAA': { paymentId: 'PAY-RES-G01-AAA', id: 'PAY-RES-G01-AAA', userId: 'STUDENT_AAA_UID', reservationId: 'RES-G01-AAA', slotId: 'G-01', amount: 10, paymentStatus: 'SUCCESS', transactionId: 'TXN-001' },
  'payments/PAY-RES-B05-BBB': { paymentId: 'PAY-RES-B05-BBB', id: 'PAY-RES-B05-BBB', userId: 'STUDENT_BBB_UID', reservationId: 'RES-B05-BBB', slotId: 'B-05', amount: 10, paymentStatus: 'SUCCESS', transactionId: 'TXN-002' }
}

const engine = createRulesEngine(initialDocs)

// ----------------------------------------------------------------------------
// ATTACK 1: Student attempts to modify another user's user document
// ----------------------------------------------------------------------------
console.log('ATTACK 1: Student attempts to modify another user\'s user document')
{
  const targetUserId = 'STUDENT_BBB_UID'
  const existingDoc = initialDocs['users/STUDENT_BBB_UID']
  const maliciousUpdate = { ...existingDoc, displayName: 'Hacked by Student A' }

  const allowed = engine.canUpdateUser(studentA_Auth, targetUserId, existingDoc, maliciousUpdate)
  assert(allowed === false, 'DENIED: Student A cannot modify Student B user document')
}

// ----------------------------------------------------------------------------
// ATTACK 2: Student attempts to change their own role: Student -> Admin
// ----------------------------------------------------------------------------
console.log('\nATTACK 2: Student attempts to change their own role: Student -> Admin')
{
  const myUserId = 'STUDENT_AAA_UID'
  const existingDoc = initialDocs['users/STUDENT_AAA_UID']
  const maliciousEscalation = { ...existingDoc, role: 'Admin' }

  const allowed = engine.canUpdateUser(studentA_Auth, myUserId, existingDoc, maliciousEscalation)
  assert(allowed === false, 'DENIED: Student A cannot change their own role to Admin')
}

// ----------------------------------------------------------------------------
// ATTACK 3: Student attempts: Student -> Security Admin
// ----------------------------------------------------------------------------
console.log('\nATTACK 3: Student attempts: Student -> Security Admin')
{
  const myUserId = 'STUDENT_AAA_UID'
  const existingDoc = initialDocs['users/STUDENT_AAA_UID']
  const maliciousEscalation = { ...existingDoc, role: 'Security Admin' }

  const allowed = engine.canUpdateUser(studentA_Auth, myUserId, existingDoc, maliciousEscalation)
  assert(allowed === false, 'DENIED: Student A cannot change their own role to Security Admin')
}

// ----------------------------------------------------------------------------
// ATTACK 4: Student attempts to modify another student's vehicle
// ----------------------------------------------------------------------------
console.log('\nATTACK 4: Student attempts to modify another student\'s vehicle')
{
  const studentB_Vehicle = {
    id: 'REG-002',
    studentId: 'STUDENT_BBB_UID',
    vehicleNumber: 'MH-12-BB-2222',
    vehicleType: 'scooty'
  }
  const maliciousUpdate = {
    ...studentB_Vehicle,
    vehicleNumber: 'MH-12-HA-9999'
  }

  const allowed = engine.canUpdateVehicle(studentA_Auth, studentB_Vehicle, maliciousUpdate)
  assert(allowed === false, 'DENIED: Student A cannot modify Student B vehicle registration')
}

// ----------------------------------------------------------------------------
// ATTACK 5: Student attempts to modify another student's reservation
// ----------------------------------------------------------------------------
console.log('\nATTACK 5: Student attempts to modify another student\'s reservation')
{
  const studentB_Reservation = {
    id: 'RES-G05-1234',
    userId: 'STUDENT_BBB_UID',
    reservedBy: 'STUDENT_BBB_UID',
    slotId: 'G-05',
    status: 'active'
  }
  const maliciousCancel = {
    ...studentB_Reservation,
    status: 'cancelled'
  }

  const allowed = engine.canUpdateReservation(studentA_Auth, studentB_Reservation, maliciousCancel)
  assert(allowed === false, 'DENIED: Student A cannot modify Student B reservation')
}

// ----------------------------------------------------------------------------
// ATTACK 6: Student attempts to modify another student's parking session
// ----------------------------------------------------------------------------
console.log('\nATTACK 6: Student attempts to modify another student\'s parking session')
{
  const studentB_Session = {
    id: 'SESS-G05-1234',
    studentId: 'STUDENT_BBB_UID',
    slotId: 'G-05',
    status: 'active'
  }
  const maliciousSessionEnd = {
    ...studentB_Session,
    status: 'completed'
  }

  const allowed = engine.canUpdateSession(studentA_Auth, studentB_Session, maliciousSessionEnd)
  assert(allowed === false, 'DENIED: Student A cannot modify Student B parking session')
}

// ----------------------------------------------------------------------------
// ATTACK 7: Student attempts to directly change a parking slot from:
// occupied -> available for a slot they do not own
// ----------------------------------------------------------------------------
console.log('\nATTACK 7: Student attempts to directly change parking slot occupied -> available for unowned slot')
{
  const occupiedSlot = {
    id: 'G-05',
    status: 'occupied',
    userId: 'STUDENT_BBB_UID',
    reservedBy: 'STUDENT_BBB_UID',
    studentId: 'STUDENT_BBB_UID',
    plate: 'MH-12-BB-2222'
  }
  const maliciousSlotRelease = {
    ...occupiedSlot,
    status: 'available',
    plate: '',
    owner: ''
  }

  const allowed = engine.canUpdateSlot(studentA_Auth, occupiedSlot, maliciousSlotRelease)
  assert(allowed === false, 'DENIED: Student A cannot change occupancy on Student B slot')
}

// ----------------------------------------------------------------------------
// ATTACK 8: Student attempts to create a notification addressed to another UID
// ----------------------------------------------------------------------------
console.log('\nATTACK 8: Student attempts to create a notification addressed to another UID')
{
  const forgedNotification = {
    userId: 'STUDENT_BBB_UID', // Addressed to Student B
    title: 'Fake Fine',
    message: 'You have been fined ₹500',
    type: 'violation'
  }

  const allowed = engine.canCreateNotification(studentA_Auth, forgedNotification)
  assert(allowed === false, 'DENIED: Student A cannot create notification addressed to Student B')
}

// ----------------------------------------------------------------------------
// ATTACK 9: Student attempts to create an ALL/broadcast notification
// ----------------------------------------------------------------------------
console.log('\nATTACK 9: Student attempts to create an ALL/broadcast notification')
{
  const broadcastNotification = {
    userId: 'ALL', // Broadcast to all users
    title: 'Spam Notice',
    message: 'Classes cancelled today',
    type: 'info'
  }

  const allowed = engine.canCreateNotification(studentA_Auth, broadcastNotification)
  assert(allowed === false, 'DENIED: Student A cannot create an ALL broadcast notification')
}

// ----------------------------------------------------------------------------
// ATTACK 10: Unauthenticated user attempts to access protected Firestore collections
// ----------------------------------------------------------------------------
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

// ----------------------------------------------------------------------------
// ATTACK 11: A fake localStorage demo_user_session is edited from Student -> Admin
// ----------------------------------------------------------------------------
console.log('\nATTACK 11: Fake localStorage demo_user_session edited Student -> Admin')
{
  const forgedDemoStorage = {
    uid: 'demo-student-001',
    email: 'demo.student@soc.edu',
    displayName: 'Hacked Demo Admin',
    role: 'Admin', // Injected role
    isDemo: true
  }

  // Test evaluateIsAdmin on forged demo session
  const isPrivileged = evaluateIsAdmin(forgedDemoStorage)
  assert(isPrivileged === false, 'DENIED: evaluateIsAdmin rejects forged demo session with role=Admin')

  // Test resolveUserRole on demo session
  const resolvedRole = resolveUserRole(null, forgedDemoStorage)
  assert(resolvedRole === ROLES.STUDENT, 'DENIED: resolveUserRole forces demo session to Student')
}

// ----------------------------------------------------------------------------
// ATTACK 12: User signs in with an email containing "admin" but is not authorized
// ----------------------------------------------------------------------------
console.log('\nATTACK 12: User signs in with email containing "admin" (e.g. fake.admin@college.edu)')
{
  const attackerUser = {
    uid: 'ATTACKER_UID_999',
    email: 'hacker.admin.parking@college.edu',
    displayName: 'Fake Admin'
  }

  const existingProfile = null // New registration / initial Google sign-in
  const assignedRole = resolveUserRole(attackerUser, existingProfile)
  assert(assignedRole === ROLES.STUDENT, 'DENIED: Attacker with "admin" in email remains Student')

  const hasAdminPrivilege = evaluateIsAdmin({ ...attackerUser, role: assignedRole })
  assert(hasAdminPrivilege === false, 'DENIED: Attacker receives no administrative capability')
}

// ============================================================================
// PAYMENTS COLLECTION SECURITY ATTACK VECTORS (ATTACKS 13-26)
// ============================================================================

console.log('\n----------------------------------------------------')
console.log('💳 PAYMENTS FIRESTORE SECURITY ATTACK VECTORS')
console.log('----------------------------------------------------')

const adminAuth = { uid: 'R2eyVR9vzOUb6rwv9gNCPWcuoGr1', email: 'shaikhalzuni123@gmail.com' }

// PAYMENTS ATTACK 1: Unauthenticated user reads payments -> Expected: DENIED
console.log('\nPAYMENTS ATTACK 1: Unauthenticated user reads payments')
{
  const allowed = engine.canReadPayment(unauthenticated, initialDocs['payments/PAY-RES-G01-AAA'])
  assert(allowed === false, 'DENIED: Unauthenticated user cannot read payments collection')
}

// PAYMENTS ATTACK 2: Student A reads Student B payment -> Expected: DENIED
console.log('\nPAYMENTS ATTACK 2: Student A reads Student B payment')
{
  const allowed = engine.canReadPayment(studentA_Auth, initialDocs['payments/PAY-RES-B05-BBB'])
  assert(allowed === false, 'DENIED: Student A cannot read Student B payment')
}

// PAYMENTS ATTACK 3: Student creates payment for Student B -> Expected: DENIED
console.log('\nPAYMENTS ATTACK 3: Student creates payment for Student B')
{
  const forgedPayment = {
    userId: 'STUDENT_BBB_UID',
    paymentStatus: 'SUCCESS',
    amount: 10,
    reservationId: 'RES-B05-BBB',
    slotId: 'B-05'
  }
  const allowed = engine.canCreatePayment(studentA_Auth, 'PAY-RES-B05-BBB', forgedPayment)
  assert(allowed === false, 'DENIED: Student A cannot create payment for Student B')
}

// PAYMENTS ATTACK 4: Student creates ₹9999 payment -> Expected: DENIED
console.log('\nPAYMENTS ATTACK 4: Student creates ₹9999 payment')
{
  const invalidAmountPayment = {
    userId: 'STUDENT_AAA_UID',
    paymentStatus: 'SUCCESS',
    amount: 9999,
    reservationId: 'RES-G01-AAA',
    slotId: 'G-01'
  }
  const allowed = engine.canCreatePayment(studentA_Auth, 'PAY-RES-G01-AAA', invalidAmountPayment)
  assert(allowed === false, 'DENIED: ₹9999 payment rejected (must be ₹10)')
}

// PAYMENTS ATTACK 5: Student creates ₹1 payment -> Expected: DENIED
console.log('\nPAYMENTS ATTACK 5: Student creates ₹1 payment')
{
  const invalidAmountPayment = {
    userId: 'STUDENT_AAA_UID',
    paymentStatus: 'SUCCESS',
    amount: 1,
    reservationId: 'RES-G01-AAA',
    slotId: 'G-01'
  }
  const allowed = engine.canCreatePayment(studentA_Auth, 'PAY-RES-G01-AAA', invalidAmountPayment)
  assert(allowed === false, 'DENIED: ₹1 payment rejected (must be ₹10)')
}

// PAYMENTS ATTACK 6: Student creates SUCCESS payment for unrelated reservation -> Expected: DENIED
console.log('\nPAYMENTS ATTACK 6: Student creates SUCCESS payment for unrelated reservation')
{
  const unrelatedPayment = {
    userId: 'STUDENT_AAA_UID',
    paymentStatus: 'SUCCESS',
    amount: 10,
    reservationId: 'RES-B05-BBB', // Belongs to Student B
    slotId: 'B-05'
  }
  const allowed = engine.canCreatePayment(studentA_Auth, 'PAY-RES-B05-BBB', unrelatedPayment)
  assert(allowed === false, 'DENIED: Payment rejected for unrelated reservation')
}

// PAYMENTS ATTACK 7: Student changes existing payment amount -> Expected: DENIED
console.log('\nPAYMENTS ATTACK 7: Student changes existing payment amount')
{
  const existing = initialDocs['payments/PAY-RES-G01-AAA']
  const modified = { ...existing, amount: 0 }
  const allowed = engine.canUpdatePayment(studentA_Auth, existing, modified)
  assert(allowed === false, 'DENIED: Payment amount modification is forbidden')
}

// PAYMENTS ATTACK 8: Student changes transaction ID -> Expected: DENIED
console.log('\nPAYMENTS ATTACK 8: Student changes transaction ID')
{
  const existing = initialDocs['payments/PAY-RES-G01-AAA']
  const modified = { ...existing, transactionId: 'TXN-FORGED-999' }
  const allowed = engine.canUpdatePayment(studentA_Auth, existing, modified)
  assert(allowed === false, 'DENIED: Transaction ID modification is forbidden')
}

// PAYMENTS ATTACK 9: Student changes paymentStatus -> Expected: DENIED
console.log('\nPAYMENTS ATTACK 9: Student changes paymentStatus')
{
  const existing = initialDocs['payments/PAY-RES-G01-AAA']
  const modified = { ...existing, paymentStatus: 'REFUNDED' }
  const allowed = engine.canUpdatePayment(studentA_Auth, existing, modified)
  assert(allowed === false, 'DENIED: Payment status modification is forbidden')
}

// PAYMENTS ATTACK 10: Student deletes payment -> Expected: DENIED
console.log('\nPAYMENTS ATTACK 10: Student deletes payment')
{
  const existing = initialDocs['payments/PAY-RES-G01-AAA']
  const allowed = engine.canDeletePayment(studentA_Auth, existing)
  assert(allowed === false, 'DENIED: Student deletion of payment is forbidden')
}

// PAYMENTS ATTACK 11: Admin reads all payment records -> Expected: ALLOWED
console.log('\nPAYMENTS ATTACK 11: Admin reads all payment records')
{
  const readA = engine.canReadPayment(adminAuth, initialDocs['payments/PAY-RES-G01-AAA'])
  const readB = engine.canReadPayment(adminAuth, initialDocs['payments/PAY-RES-B05-BBB'])
  assert(readA === true && readB === true, 'ALLOWED: Admin can read all payment records')
}

// PAYMENTS ATTACK 12: Student reads own payment -> Expected: ALLOWED
console.log('\nPAYMENTS ATTACK 12: Student reads own payment')
{
  const allowed = engine.canReadPayment(studentA_Auth, initialDocs['payments/PAY-RES-G01-AAA'])
  assert(allowed === true, 'ALLOWED: Student A can read own payment document')
}

// PAYMENTS ATTACK 13: Legitimate booking/payment flow creates payment -> Expected: ALLOWED
console.log('\nPAYMENTS ATTACK 13: Legitimate booking/payment flow creates payment')
{
  const legitimatePayment = {
    userId: 'STUDENT_AAA_UID',
    paymentStatus: 'SUCCESS',
    amount: 10,
    reservationId: 'RES-G01-AAA',
    slotId: 'G-01'
  }
  const allowed = engine.canCreatePayment(studentA_Auth, 'PAY-RES-G01-AAA', legitimatePayment)
  assert(allowed === true, 'ALLOWED: Legitimate payment matching reservation is allowed')
}

// PAYMENTS ATTACK 14: Duplicate payment for same reservation cannot create a second record
console.log('\nPAYMENTS ATTACK 14: Duplicate payment for same reservation / Deterministic ID enforcement')
{
  const forgedDuplicateId = 'PAY-ARBITRARY-SECOND-RECORD'
  const duplicatePayment = {
    userId: 'STUDENT_AAA_UID',
    paymentStatus: 'SUCCESS',
    amount: 10,
    reservationId: 'RES-G01-AAA',
    slotId: 'G-01'
  }
  const allowed = engine.canCreatePayment(studentA_Auth, forgedDuplicateId, duplicatePayment)
  assert(allowed === false, 'DENIED: Non-deterministic second payment record rejected')
}

console.log('\n====================================================')
console.log(`SECURITY TEST SUMMARY: ${passCount} Passed, ${failCount} Failed`)
console.log('====================================================')

if (failCount > 0) {
  process.exit(1)
} else {
  console.log('🎉 ALL SECURITY ATTACK VECTORS (AUTH + PAYMENTS) SUCCESSFULLY MITIGATED & TESTED!')
}
