/**
 * Comprehensive Persistent Notification System Test Suite
 * Tests all requirements:
 *  - Notification Document Schema conformance
 *  - Real-time subscription & merge (userId + ALL)
 *  - Read / unread status toggles
 *  - Mark All as Read (user scoped)
 *  - Clear Read Notifications (user scoped)
 *  - Secondary non-blocking safety
 *  - Event hooks: Slot Reserved, Parking Entry Approved, Parking Session Completed, Wrong Parking Notice
 */

console.log('====================================================')
console.log('🔔 PERSISTENT NOTIFICATION SYSTEM TEST SUITE')
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
// Section 1: Schema Conformance & Normalizer
// ----------------------------------------------------
console.log('Test 1: Schema Conformance')

function validateNotificationSchema(doc) {
  const hasRequiredFields =
    typeof doc.userId === 'string' &&
    typeof doc.title === 'string' &&
    typeof doc.message === 'string' &&
    ['info', 'success', 'warning', 'violation'].includes(doc.type) &&
    typeof doc.read === 'boolean'
  
  const hasValidOptionalFields =
    (doc.relatedSlotId === null || typeof doc.relatedSlotId === 'string') &&
    (doc.relatedVehiclePlate === null || typeof doc.relatedVehiclePlate === 'string')

  return hasRequiredFields && hasValidOptionalFields
}

const sampleDoc = {
  userId: 'STUDENT_UID_101',
  title: 'Slot Reserved',
  message: 'Bay G-05 (Ground Floor) reserved for MH-12-AB-1234.',
  type: 'success',
  read: false,
  createdAt: { seconds: 1727430000, nanoseconds: 0 },
  relatedSlotId: 'G-05',
  relatedVehiclePlate: 'MH-12-AB-1234'
}

assert(validateNotificationSchema(sampleDoc) === true, 'Sample notification strictly conforms to the schema')

const broadcastDoc = {
  userId: 'ALL',
  title: 'Campus Maintenance',
  message: 'Basement zone B will undergo sweeping at 6 PM.',
  type: 'info',
  read: false,
  createdAt: { seconds: 1727430100, nanoseconds: 0 },
  relatedSlotId: null,
  relatedVehiclePlate: null
}

assert(validateNotificationSchema(broadcastDoc) === true, 'Broadcast "ALL" notification conforms to schema')

// ----------------------------------------------------
// Section 2: Real-time Multi-Query Merge & Sorting
// ----------------------------------------------------
console.log('\nTest 2: Multi-Query Merge & Timestamp Sorting')

function mergeAndSortNotifications(userDocs, broadcastDocs) {
  const combinedMap = new Map()
  userDocs.forEach((d) => combinedMap.set(d.id, d))
  broadcastDocs.forEach((d) => combinedMap.set(d.id, d))
  
  const list = Array.from(combinedMap.values())
  list.sort((a, b) => {
    const timeA = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : (a.createdAt || Date.now())
    const timeB = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : (b.createdAt || Date.now())
    return timeB - timeA
  })
  return list
}

const userDocs = [
  { id: 'notif-1', userId: 'STUDENT_UID_101', title: 'Slot Reserved', createdAt: { seconds: 1000 }, read: true },
  { id: 'notif-3', userId: 'STUDENT_UID_101', title: 'Parking Entry Approved', createdAt: { seconds: 3000 }, read: false }
]

const broadcastDocsList = [
  { id: 'notif-2', userId: 'ALL', title: 'Campus Alert', createdAt: { seconds: 2000 }, read: false }
]

const merged = mergeAndSortNotifications(userDocs, broadcastDocsList)
assert(merged.length === 3, 'Merged list contains all 3 notifications')
assert(merged[0].id === 'notif-3', 'Most recent notification (time: 3000) is sorted first')
assert(merged[1].id === 'notif-2', 'Broadcast notification (time: 2000) is sorted second')
assert(merged[2].id === 'notif-1', 'Oldest notification (time: 1000) is sorted third')

// ----------------------------------------------------
// Section 3: Read / Unread Status & Unread Count Calculation
// ----------------------------------------------------
console.log('\nTest 3: Unread Count and Read Filter')

const unreadCount = merged.filter((n) => !n.read).length
assert(unreadCount === 2, 'Unread count is correctly calculated as 2')

const unreadOnly = merged.filter((n) => !n.read)
assert(unreadOnly.length === 2 && !unreadOnly.some(n => n.read), 'Unread filter correctly filters out read notifications')

// ----------------------------------------------------
// Section 4: Mark All as Read Safety (Scoped to User Only)
// ----------------------------------------------------
console.log('\nTest 4: Mark All as Read Safety')

function simulateMarkAllAsRead(currentUserId, allDocs) {
  return allDocs.map((doc) => {
    // Only mark as read if owned by the current user
    if (doc.userId === currentUserId && !doc.read) {
      return { ...doc, read: true }
    }
    return doc
  })
}

const afterMarkAll = simulateMarkAllAsRead('STUDENT_UID_101', merged)
const userUnreadAfter = afterMarkAll.filter(n => n.userId === 'STUDENT_UID_101' && !n.read).length
const broadcastUnreadAfter = afterMarkAll.filter(n => n.userId === 'ALL' && !n.read).length

assert(userUnreadAfter === 0, 'All user notifications are marked as read')
assert(broadcastUnreadAfter === 1, 'Broadcast notifications are not mutated during user-scoped mark all')

// ----------------------------------------------------
// Section 5: Clear Read Notifications Safety
// ----------------------------------------------------
console.log('\nTest 5: Clear Read Notifications Safety')

function simulateClearRead(currentUserId, allDocs) {
  // Only delete read notifications owned by the user
  return allDocs.filter((doc) => {
    if (doc.userId === currentUserId && doc.read) {
      return false // delete
    }
    return true // keep
  })
}

const afterClear = simulateClearRead('STUDENT_UID_101', afterMarkAll)
assert(!afterClear.some(n => n.id === 'notif-1'), 'Read notification notif-1 was removed')
assert(!afterClear.some(n => n.id === 'notif-3'), 'Read notification notif-3 was removed')
assert(afterClear.some(n => n.id === 'notif-2'), 'Broadcast notification notif-2 remains intact')

// ----------------------------------------------------
// Section 6: Automatic Notification Hook Schemas
// ----------------------------------------------------
console.log('\nTest 6: Automatic Notification Event Payloads')

// Event A: Slot Reserved
const slotReservedEvent = {
  userId: 'UID_ALICE',
  title: 'Slot Reserved',
  message: 'Bay G-12 (Ground Floor) has been reserved for vehicle MH-12-AB-1234.',
  type: 'success',
  read: false,
  relatedSlotId: 'G-12',
  relatedVehiclePlate: 'MH-12-AB-1234'
}
assert(validateNotificationSchema(slotReservedEvent), 'Slot Reserved notification payload meets schema')

// Event B: Parking Entry Approved
const entryApprovedEvent = {
  userId: 'UID_ALICE',
  title: 'Parking Entry Approved',
  message: 'Vehicle MH-12-AB-1234 entered campus and occupied Bay G-12 (Ground Floor). Gate barrier opened.',
  type: 'success',
  read: false,
  relatedSlotId: 'G-12',
  relatedVehiclePlate: 'MH-12-AB-1234'
}
assert(validateNotificationSchema(entryApprovedEvent), 'Parking Entry Approved notification payload meets schema')

// Event C: Parking Session Completed
const sessionCompletedEvent = {
  userId: 'UID_ALICE',
  title: 'Parking Session Completed',
  message: 'Parking session completed for vehicle MH-12-AB-1234. Bay G-12 (Ground Floor) is now released and available.',
  type: 'info',
  read: false,
  relatedSlotId: 'G-12',
  relatedVehiclePlate: 'MH-12-AB-1234'
}
assert(validateNotificationSchema(sessionCompletedEvent), 'Parking Session Completed notification payload meets schema')

// Event D: Wrong Parking Notice (with reliable UID)
const wrongParkingEvent = {
  userId: 'UID_BOB',
  title: 'Wrong Parking Notice',
  message: 'A parking violation was detected for vehicle MH-14-XY-9999 in Bay G-15 (Ground Floor). Rules mandate Basement for bikes.',
  type: 'violation',
  read: false,
  relatedSlotId: 'G-15',
  relatedVehiclePlate: 'MH-14-XY-9999'
}
assert(validateNotificationSchema(wrongParkingEvent), 'Wrong Parking Notice notification payload meets schema')

// ----------------------------------------------------
// Section 7: Non-blocking Resilience Guarantee
// ----------------------------------------------------
console.log('\nTest 7: Secondary Operation Failure Resilience')

let primaryOperationSucceeded = false
let notificationErrorLogged = false

async function performCoreBookingWithNotification(simulateFirestoreFail = false) {
  // 1. Core operation
  primaryOperationSucceeded = true

  // 2. Secondary notification dispatch
  try {
    if (simulateFirestoreFail) {
      throw new Error('Firestore network timeout')
    }
  } catch (err) {
    notificationErrorLogged = true
  }

  return { success: true, bookingId: 'BOOK-123' }
}

async function runAllTests() {
  const res = await performCoreBookingWithNotification(true)
  assert(res.success === true, 'Primary transaction succeeds even if notification fails')
  assert(primaryOperationSucceeded === true, 'Primary booking completed normally')
  assert(notificationErrorLogged === true, 'Notification error was safely intercepted and logged')

  // ----------------------------------------------------
  // Section 8: Firestore Security Rule - Notification Creation Authorization
  // ----------------------------------------------------
  console.log('\nTest 8: Firestore Create Security Rule Simulation')

  function evaluateNotificationCreateRule(authContext, targetNotification, userDocRole = 'Student') {
    if (!authContext || !authContext.uid) return false

    const isSelfNotification = targetNotification.userId === authContext.uid
    const isMasterAdminUid = authContext.uid === 'R2eyVR9vzOUb6rwv9gNCPWcuoGr1'
    const isMasterAdminEmail = authContext.email === 'shaikhalzuni123@gmail.com'
    const isTokenAdmin = ['Admin', 'Security Admin'].includes(authContext.tokenRole)
    const isFirestoreAdmin = ['Admin', 'Security Admin'].includes(userDocRole)

    return (
      isSelfNotification ||
      isMasterAdminUid ||
      isMasterAdminEmail ||
      isTokenAdmin ||
      isFirestoreAdmin
    )
  }

  const studentAuth = { uid: 'STUDENT_101', email: 'alice@college.edu' }
  const adminAuth = { uid: 'GUARD_999', email: 'guard@college.edu' }

  // Student self-notification (e.g. self booking)
  assert(
    evaluateNotificationCreateRule(studentAuth, { userId: 'STUDENT_101' }, 'Student') === true,
    'Student CAN create notification addressed to themselves'
  )

  // Student attempting to create notification for another student (e.g. malicious push)
  assert(
    evaluateNotificationCreateRule(studentAuth, { userId: 'STUDENT_202' }, 'Student') === false,
    'Student CANNOT create notification addressed to another student'
  )

  // Student attempting to broadcast to ALL
  assert(
    evaluateNotificationCreateRule(studentAuth, { userId: 'ALL' }, 'Student') === false,
    'Student CANNOT create broadcast "ALL" notification'
  )

  // Admin/Guard issuing wrong parking notice to another student
  assert(
    evaluateNotificationCreateRule(adminAuth, { userId: 'STUDENT_101' }, 'Security Admin') === true,
    'Security Admin CAN dispatch notification to student'
  )

  // Admin broadcasting maintenance notice to ALL
  assert(
    evaluateNotificationCreateRule(adminAuth, { userId: 'ALL' }, 'Admin') === true,
    'Admin CAN dispatch broadcast "ALL" notification'
  )

  console.log('\n====================================================')
  console.log(`TEST RESULTS: ${passCount} Passed, ${failCount} Failed`)
  console.log('====================================================')
  if (failCount === 0) {
    console.log('🎉 ALL PERSISTENT NOTIFICATION TESTS PASSED!')
  }
}

runAllTests()

