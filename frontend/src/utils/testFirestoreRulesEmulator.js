/**
 * ============================================================================
 * COMPREHENSIVE FIRESTORE RULES EMULATOR TEST SUITE — PHASE 3 STEP 4E
 * ============================================================================
 * 
 * Executes genuine security tests against the actual root `firestore.rules` file
 * using the official Firebase C++ Rules Engine in the local Firestore Emulator.
 * Powered by `@firebase/rules-unit-testing` (assertSucceeds, assertFails).
 * 
 * Safety: Uses isolated test project `smart-college-parking-test`.
 * Zero interaction with production Firebase.
 */

import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing'
import { readFileSync } from 'fs'
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch
} from 'firebase/firestore'

const PROJECT_ID = 'smart-college-parking-test'
const RULES_PATH = new URL('../../../firestore.rules', import.meta.url)

let passCount = 0
let failCount = 0
const failures = []
const observations = []

async function runTest(testName, testFn) {
  try {
    await testFn()
    console.log(`  ✓ PASS: ${testName}`)
    passCount++
  } catch (err) {
    console.error(`  ✗ FAIL: ${testName}`)
    console.error(`    Error: ${err.message}`)
    failCount++
    failures.push({ testName, error: err.message })
  }
}

async function runTestSuite() {
  console.log('====================================================')
  console.log('🛡️  FIRESTORE RULES EMULATOR: COMPREHENSIVE SECURITY SUITE')
  console.log('====================================================')

  console.log('Loading actual firestore.rules from:', RULES_PATH.pathname)
  const rules = readFileSync(RULES_PATH, 'utf8')
  console.log(`Rules loaded successfully (${rules.length} bytes).`)

  console.log('Connecting to Firestore Emulator on 127.0.0.1:8080...')
  const testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      host: '127.0.0.1',
      port: 8080,
      rules
    }
  })

  // Define Authenticated Contexts
  const studentAContext = testEnv.authenticatedContext('STUDENT_A', {
    email: 'student_a@college.edu',
    email_verified: true,
    role: 'Student'
  })
  const studentADb = studentAContext.firestore()

  const studentBContext = testEnv.authenticatedContext('STUDENT_B', {
    email: 'student_b@college.edu',
    email_verified: true,
    role: 'Student'
  })
  const studentBDb = studentBContext.firestore()

  const guardContext = testEnv.authenticatedContext('GUARD_01', {
    email: 'guard_01@college.edu',
    email_verified: true,
    role: 'Security Admin'
  })
  const guardDb = guardContext.firestore()

  const unauthContext = testEnv.unauthenticatedContext()
  const unauthDb = unauthContext.firestore()

  try {
    // ========================================================================
    // SECTION 1: AUTHENTICATION & USER PROFILE ISOLATION
    // ========================================================================
    console.log('\n--- SECTION 1: AUTHENTICATION & USER PROFILE ISOLATION ---')

    await runTest('Test 1.1: Authenticated student reading parking slots (read allowed)', async () => {
      await assertSucceeds(getDoc(doc(studentADb, 'parking_slots', 'G-01')))
    })

    await runTest('Test 1.2: Unauthenticated user attempting to write users/STUDENT_A (write denied)', async () => {
      await assertFails(setDoc(doc(unauthDb, 'users', 'STUDENT_A'), { role: 'Student' }))
    })

    await runTest('Test 1.3: Student A attempting to write users/STUDENT_B (cross-user write denied)', async () => {
      await assertFails(setDoc(doc(studentADb, 'users', 'STUDENT_B'), { role: 'Student' }))
    })

    await runTest('Test 1.4: Student A can create their own profile with role "Student"', async () => {
      await assertSucceeds(setDoc(doc(studentADb, 'users', 'STUDENT_A'), {
        uid: 'STUDENT_A',
        name: 'Student A',
        email: 'student_a@college.edu',
        role: 'Student'
      }))
    })

    await runTest('Test 1.5: Student A can read their own profile document', async () => {
      await assertSucceeds(getDoc(doc(studentADb, 'users', 'STUDENT_A')))
    })

    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'users', 'STUDENT_B'), {
        uid: 'STUDENT_B',
        role: 'Student',
        email: 'student_b@college.edu'
      })
    })
    await runTest('Test 1.6: Student A cannot read Student B profile', async () => {
      await assertFails(getDoc(doc(studentADb, 'users', 'STUDENT_B')))
    })

    await runTest('Test 1.7: Student A cannot elevate role to "Admin"', async () => {
      await assertFails(updateDoc(doc(studentADb, 'users', 'STUDENT_A'), { role: 'Admin' }))
    })
    await runTest('Test 1.8: Student A cannot elevate role to "Security Admin"', async () => {
      await assertFails(updateDoc(doc(studentADb, 'users', 'STUDENT_A'), { role: 'Security Admin' }))
    })

    // ========================================================================
    // SECTION 2: REGISTERED VEHICLES ISOLATION
    // ========================================================================
    console.log('\n--- SECTION 2: REGISTERED VEHICLES ISOLATION ---')

    await runTest('Test 2.1: Student A can register their own vehicle (studentId == auth.uid)', async () => {
      await assertSucceeds(setDoc(doc(studentADb, 'registered_vehicles', 'VEH_A_01'), {
        studentId: 'STUDENT_A',
        vehicleNumber: 'MH-12-AB-1234',
        vehicleType: 'scooty'
      }))
    })

    await runTest('Test 2.2: Student A cannot register vehicle under Student B ID', async () => {
      await assertFails(setDoc(doc(studentADb, 'registered_vehicles', 'VEH_FORGED'), {
        studentId: 'STUDENT_B',
        vehicleNumber: 'MH-12-XY-9999',
        vehicleType: 'bike'
      }))
    })

    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'registered_vehicles', 'VEH_B_01'), {
        studentId: 'STUDENT_B',
        vehicleNumber: 'MH-12-CD-5678',
        vehicleType: 'bike'
      })
    })

    await runTest('Test 2.3: Student A cannot read Student B vehicle registration', async () => {
      await assertFails(getDoc(doc(studentADb, 'registered_vehicles', 'VEH_B_01')))
    })

    await runTest('Test 2.4: Student A cannot modify Student B vehicle registration', async () => {
      await assertFails(updateDoc(doc(studentADb, 'registered_vehicles', 'VEH_B_01'), {
        vehicleNumber: 'MH-12-HACKED'
      }))
    })

    // ========================================================================
    // SECTION 3: RESERVATIONS & PARKING SLOTS ATOMIC COUPLING (getAfter)
    // ========================================================================
    console.log('\n--- SECTION 3: RESERVATIONS & PARKING SLOTS ATOMIC COUPLING ---')

    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'parking_slots', 'G-01'), {
        id: 'G-01',
        status: 'available',
        floor: 'Ground Floor',
        type: 'scooty',
        userId: '',
        reservedBy: '',
        reservationId: ''
      })
      await setDoc(doc(context.firestore(), 'parking_slots', 'B-01'), {
        id: 'B-01',
        status: 'available',
        floor: 'Basement',
        type: 'bike',
        userId: '',
        reservedBy: '',
        reservationId: ''
      })
    })

    await runTest('Test 3.1: Valid atomic booking succeeds (slot reservation + coupled reservation doc in getAfter)', async () => {
      const batch = writeBatch(studentADb)
      batch.set(doc(studentADb, 'parking_slots', 'G-01'), {
        id: 'G-01',
        status: 'reserved',
        userId: 'STUDENT_A',
        reservedBy: 'STUDENT_A',
        floor: 'Ground Floor',
        type: 'scooty',
        reservationId: 'RES_G01_A'
      }, { merge: true })

      batch.set(doc(studentADb, 'reservations', 'RES_G01_A'), {
        id: 'RES_G01_A',
        slotId: 'G-01',
        userId: 'STUDENT_A',
        reservedBy: 'STUDENT_A',
        status: 'active',
        entryQrStatus: 'ACTIVE',
        floor: 'Ground Floor',
        vehicleType: 'scooty',
        amountPaidINR: 10
      })
      await assertSucceeds(batch.commit())
    })

    await runTest('Test 3.2: Direct reservation create rejected without coupled slot in getAfter()', async () => {
      await assertFails(setDoc(doc(studentADb, 'reservations', 'RES_ORPHAN'), {
        id: 'RES_ORPHAN',
        slotId: 'B-01',
        userId: 'STUDENT_A',
        reservedBy: 'STUDENT_A',
        status: 'active',
        floor: 'Basement',
        vehicleType: 'bike',
        amountPaidINR: 10
      }))
    })

    await runTest('Test 3.3: Direct slot update to "reserved" rejected without coupled reservation in getAfter()', async () => {
      await assertFails(updateDoc(doc(studentADb, 'parking_slots', 'B-01'), {
        status: 'reserved',
        userId: 'STUDENT_A',
        reservedBy: 'STUDENT_A',
        reservationId: 'NONEXISTENT_RES'
      }))
    })

    await runTest('Test 3.4: Student cannot inject guardUid into reservation document', async () => {
      const batch = writeBatch(studentADb)
      batch.set(doc(studentADb, 'parking_slots', 'B-01'), {
        id: 'B-01',
        status: 'reserved',
        userId: 'STUDENT_A',
        reservedBy: 'STUDENT_A',
        floor: 'Basement',
        type: 'bike',
        reservationId: 'RES_GUARD_INJECT'
      }, { merge: true })

      batch.set(doc(studentADb, 'reservations', 'RES_GUARD_INJECT'), {
        id: 'RES_GUARD_INJECT',
        slotId: 'B-01',
        userId: 'STUDENT_A',
        reservedBy: 'STUDENT_A',
        status: 'active',
        floor: 'Basement',
        vehicleType: 'bike',
        amountPaidINR: 10,
        guardUid: 'FAKE_GUARD_UID'
      })
      await assertFails(batch.commit())
    })

    await runTest('Test 3.5: Student cannot inject gateEnteredAt into parking_slots document', async () => {
      const batch = writeBatch(studentADb)
      batch.set(doc(studentADb, 'parking_slots', 'B-01'), {
        id: 'B-01',
        status: 'reserved',
        userId: 'STUDENT_A',
        reservedBy: 'STUDENT_A',
        floor: 'Basement',
        type: 'bike',
        reservationId: 'RES_SLOT_INJECT',
        gateEnteredAt: new Date().toISOString()
      }, { merge: true })

      batch.set(doc(studentADb, 'reservations', 'RES_SLOT_INJECT'), {
        id: 'RES_SLOT_INJECT',
        slotId: 'B-01',
        userId: 'STUDENT_A',
        reservedBy: 'STUDENT_A',
        status: 'active',
        floor: 'Basement',
        vehicleType: 'bike',
        amountPaidINR: 10
      })
      await assertFails(batch.commit())
    })

    await runTest('Test 3.6: Student creating reservation directly in "in_use" status rejected', async () => {
      const batch = writeBatch(studentADb)
      batch.set(doc(studentADb, 'parking_slots', 'B-01'), {
        id: 'B-01',
        status: 'reserved',
        userId: 'STUDENT_A',
        reservedBy: 'STUDENT_A',
        floor: 'Basement',
        type: 'bike',
        reservationId: 'RES_IN_USE'
      }, { merge: true })

      batch.set(doc(studentADb, 'reservations', 'RES_IN_USE'), {
        id: 'RES_IN_USE',
        slotId: 'B-01',
        userId: 'STUDENT_A',
        reservedBy: 'STUDENT_A',
        status: 'in_use',
        floor: 'Basement',
        vehicleType: 'bike',
        amountPaidINR: 10
      })
      await assertFails(batch.commit())
    })

    await runTest('Test 3.7: Vehicle/Floor rule violation (scooty in Basement B-01) rejected', async () => {
      const batch = writeBatch(studentADb)
      batch.set(doc(studentADb, 'parking_slots', 'B-01'), {
        id: 'B-01',
        status: 'reserved',
        userId: 'STUDENT_A',
        reservedBy: 'STUDENT_A',
        floor: 'Basement',
        type: 'scooty',
        reservationId: 'RES_WRONG_FLOOR'
      }, { merge: true })

      batch.set(doc(studentADb, 'reservations', 'RES_WRONG_FLOOR'), {
        id: 'RES_WRONG_FLOOR',
        slotId: 'B-01',
        userId: 'STUDENT_A',
        reservedBy: 'STUDENT_A',
        status: 'active',
        floor: 'Basement',
        vehicleType: 'scooty',
        amountPaidINR: 10
      })
      await assertFails(batch.commit())
    })

    await runTest('Test 3.8: Non-canonical unpadded slot ID "G-1" rejected (must be G-01)', async () => {
      const batch = writeBatch(studentADb)
      batch.set(doc(studentADb, 'parking_slots', 'G-1'), {
        id: 'G-1',
        status: 'reserved',
        userId: 'STUDENT_A',
        reservedBy: 'STUDENT_A',
        floor: 'Ground Floor',
        type: 'scooty',
        reservationId: 'RES_UNPADDED'
      }, { merge: true })

      batch.set(doc(studentADb, 'reservations', 'RES_UNPADDED'), {
        id: 'RES_UNPADDED',
        slotId: 'G-1',
        userId: 'STUDENT_A',
        reservedBy: 'STUDENT_A',
        status: 'active',
        floor: 'Ground Floor',
        vehicleType: 'scooty',
        amountPaidINR: 10
      })
      await assertFails(batch.commit())
    })

    await runTest('Test 3.9: Out-of-range slot ID "G-81" (> 80) rejected', async () => {
      const batch = writeBatch(studentADb)
      batch.set(doc(studentADb, 'parking_slots', 'G-81'), {
        id: 'G-81',
        status: 'reserved',
        userId: 'STUDENT_A',
        reservedBy: 'STUDENT_A',
        floor: 'Ground Floor',
        type: 'scooty',
        reservationId: 'RES_OOR'
      }, { merge: true })

      batch.set(doc(studentADb, 'reservations', 'RES_OOR'), {
        id: 'RES_OOR',
        slotId: 'G-81',
        userId: 'STUDENT_A',
        reservedBy: 'STUDENT_A',
        status: 'active',
        floor: 'Ground Floor',
        vehicleType: 'scooty',
        amountPaidINR: 10
      })
      await assertFails(batch.commit())
    })

    await runTest('Test 3.10: Unsupported reservation fee amount (₹50) rejected', async () => {
      const batch = writeBatch(studentADb)
      batch.set(doc(studentADb, 'parking_slots', 'B-01'), {
        id: 'B-01',
        status: 'reserved',
        userId: 'STUDENT_A',
        reservedBy: 'STUDENT_A',
        floor: 'Basement',
        type: 'bike',
        reservationId: 'RES_BAD_FEE'
      }, { merge: true })

      batch.set(doc(studentADb, 'reservations', 'RES_BAD_FEE'), {
        id: 'RES_BAD_FEE',
        slotId: 'B-01',
        userId: 'STUDENT_A',
        reservedBy: 'STUDENT_A',
        status: 'active',
        floor: 'Basement',
        vehicleType: 'bike',
        amountPaidINR: 50
      })
      await assertFails(batch.commit())
    })

    await runTest('Test 3.11: Valid permit tiers: Monthly pass (₹300) booking succeeds', async () => {
      const batch = writeBatch(studentADb)
      batch.set(doc(studentADb, 'parking_slots', 'B-01'), {
        id: 'B-01',
        status: 'reserved',
        userId: 'STUDENT_A',
        reservedBy: 'STUDENT_A',
        floor: 'Basement',
        type: 'bike',
        reservationId: 'RES_MONTHLY'
      }, { merge: true })

      batch.set(doc(studentADb, 'reservations', 'RES_MONTHLY'), {
        id: 'RES_MONTHLY',
        slotId: 'B-01',
        userId: 'STUDENT_A',
        reservedBy: 'STUDENT_A',
        status: 'active',
        floor: 'Basement',
        vehicleType: 'bike',
        amountPaidINR: 300
      })
      await assertSucceeds(batch.commit())
    })

    // ========================================================================
    // SECTION 4: SLOT RELEASE, CANCELLATION & ANTI-TAKEOVER
    // ========================================================================
    console.log('\n--- SECTION 4: SLOT RELEASE, CANCELLATION & ANTI-TAKEOVER ---')

    await runTest('Test 4.1: Student A can release their own reserved slot (G-01 -> available)', async () => {
      await assertSucceeds(updateDoc(doc(studentADb, 'parking_slots', 'G-01'), {
        status: 'available',
        userId: '',
        reservedBy: '',
        reservationId: ''
      }))
    })

    await runTest('Test 4.2: Student B cannot release Student A\'s reserved slot (B-01)', async () => {
      await assertFails(updateDoc(doc(studentBDb, 'parking_slots', 'B-01'), {
        status: 'available',
        userId: '',
        reservedBy: '',
        reservationId: ''
      }))
    })

    await runTest('Test 4.3: Student B cannot overwrite Student A\'s reserved bay B-01', async () => {
      const batch = writeBatch(studentBDb)
      batch.set(doc(studentBDb, 'parking_slots', 'B-01'), {
        id: 'B-01',
        status: 'reserved',
        userId: 'STUDENT_B',
        reservedBy: 'STUDENT_B',
        floor: 'Basement',
        type: 'bike',
        reservationId: 'RES_STEAL'
      }, { merge: true })

      batch.set(doc(studentBDb, 'reservations', 'RES_STEAL'), {
        id: 'RES_STEAL',
        slotId: 'B-01',
        userId: 'STUDENT_B',
        reservedBy: 'STUDENT_B',
        status: 'active',
        floor: 'Basement',
        vehicleType: 'bike',
        amountPaidINR: 10
      })
      await assertFails(batch.commit())
    })

    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'parking_slots', 'G-10'), {
        id: 'G-10',
        status: 'occupied',
        floor: 'Ground Floor',
        type: 'scooty',
        userId: 'STUDENT_A',
        reservedBy: 'STUDENT_A'
      })
    })

    await runTest('Test 4.4: Student cannot release an occupied slot back to available', async () => {
      await assertFails(updateDoc(doc(studentADb, 'parking_slots', 'G-10'), {
        status: 'available',
        userId: '',
        reservedBy: '',
        reservationId: ''
      }))
    })

    await runTest('Test 4.5: Student A can cancel their own active reservation', async () => {
      await assertSucceeds(updateDoc(doc(studentADb, 'reservations', 'RES_G01_A'), {
        status: 'cancelled',
        entryQrStatus: 'CANCELLED'
      }))
    })

    await runTest('Test 4.6: Student B cannot cancel Student A reservation', async () => {
      await assertFails(updateDoc(doc(studentBDb, 'reservations', 'RES_MONTHLY'), {
        status: 'cancelled',
        entryQrStatus: 'CANCELLED'
      }))
    })

    // Fixtures for guard field cancellation tests
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'parking_slots', 'G-30'), {
        id: 'G-30',
        status: 'reserved',
        floor: 'Ground Floor',
        type: 'scooty',
        userId: 'STUDENT_A',
        reservedBy: 'STUDENT_A',
        reservationId: 'RES_CANCEL_GUARD_A'
      })
      await setDoc(doc(context.firestore(), 'reservations', 'RES_CANCEL_GUARD_A'), {
        id: 'RES_CANCEL_GUARD_A',
        slotId: 'G-30',
        userId: 'STUDENT_A',
        reservedBy: 'STUDENT_A',
        status: 'active',
        entryQrStatus: 'ACTIVE',
        amountPaidINR: 10
      })
    })

    // Test 4.7: Student attempting to inject exitGuardUid on slot release
    await runTest('Test 4.7: Student cannot inject exitGuardUid into parking_slots on release', async () => {
      await assertFails(updateDoc(doc(studentADb, 'parking_slots', 'G-30'), {
        status: 'available',
        userId: '',
        reservedBy: '',
        reservationId: '',
        exitGuardUid: 'MALICIOUS_GUARD_UID'
      }))
    })

    // Test 4.8: Student attempting to inject exitGuardUid on reservation cancellation
    await runTest('Test 4.8: Student cannot inject exitGuardUid on reservation cancellation', async () => {
      await assertFails(updateDoc(doc(studentADb, 'reservations', 'RES_CANCEL_GUARD_A'), {
        status: 'cancelled',
        entryQrStatus: 'CANCELLED',
        exitGuardUid: 'MALICIOUS_GUARD_UID'
      }))
    })

    // Test 4.9: Verify reservation state remains active and unmodified after rejected exitGuardUid injection
    await runTest('Test 4.9: Reservation state remains active and unmodified after rejected exitGuardUid injection', async () => {
      const snap = await getDoc(doc(studentADb, 'reservations', 'RES_CANCEL_GUARD_A'))
      if (!snap.exists()) {
        throw new Error('Expected reservation RES_CANCEL_GUARD_A to still exist')
      }
      const data = snap.data()
      if (data.status !== 'active') {
        throw new Error(`Expected status to remain 'active', found: ${data.status}`)
      }
      if (data.entryQrStatus !== 'ACTIVE') {
        throw new Error(`Expected entryQrStatus to remain 'ACTIVE', found: ${data.entryQrStatus}`)
      }
      if (data.exitGuardUid !== undefined) {
        throw new Error(`Expected exitGuardUid to be undefined, found: ${data.exitGuardUid}`)
      }
    })

    // Fixture for Test 4.10 (gateExitedAt injection test)
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'reservations', 'RES_CANCEL_GATE_A'), {
        id: 'RES_CANCEL_GATE_A',
        slotId: 'G-30',
        userId: 'STUDENT_A',
        reservedBy: 'STUDENT_A',
        status: 'active',
        entryQrStatus: 'ACTIVE',
        amountPaidINR: 10
      })
    })

    // Test 4.10: Student attempting to inject gateExitedAt on reservation cancellation
    await runTest('Test 4.10: Student cannot inject gateExitedAt on reservation cancellation', async () => {
      await assertFails(updateDoc(doc(studentADb, 'reservations', 'RES_CANCEL_GATE_A'), {
        status: 'cancelled',
        entryQrStatus: 'CANCELLED',
        gateExitedAt: new Date().toISOString()
      }))
    })

    // Test 4.11: Verify reservation state remains active and unmodified after rejected gateExitedAt injection
    await runTest('Test 4.11: Reservation state remains active and unmodified after rejected gateExitedAt injection', async () => {
      const snap = await getDoc(doc(studentADb, 'reservations', 'RES_CANCEL_GATE_A'))
      if (!snap.exists()) {
        throw new Error('Expected reservation RES_CANCEL_GATE_A to still exist')
      }
      const data = snap.data()
      if (data.status !== 'active') {
        throw new Error(`Expected status to remain 'active', found: ${data.status}`)
      }
      if (data.gateExitedAt !== undefined) {
        throw new Error(`Expected gateExitedAt to be undefined, found: ${data.gateExitedAt}`)
      }
    })

    // Test 4.12: Legitimate student cancellation succeeds when no guard fields are injected
    await runTest('Test 4.12: Legitimate student cancellation succeeds when no guard fields are injected', async () => {
      await assertSucceeds(updateDoc(doc(studentADb, 'reservations', 'RES_CANCEL_GUARD_A'), {
        status: 'cancelled',
        entryQrStatus: 'CANCELLED'
      }))
      const snap = await getDoc(doc(studentADb, 'reservations', 'RES_CANCEL_GUARD_A'))
      if (snap.data().status !== 'cancelled' || snap.data().entryQrStatus !== 'CANCELLED') {
        throw new Error('Expected reservation status to transition to cancelled')
      }
      if (snap.data().exitGuardUid !== undefined) {
        throw new Error('Expected exitGuardUid to remain undefined on cancellation')
      }
    })

    // ========================================================================
    // SECTION 5: PAYMENT INTEGRITY & FINANCIAL AUDIT LEDGER (REPAIRED FIXTURES)
    // ========================================================================
    console.log('\n--- SECTION 5: PAYMENT INTEGRITY (ISOLATED FIXTURES) ---')

    // Seed isolated prerequisite reservations for each payment test
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore()

      // Fixture for Test 5.1 (Valid ₹10 payment)
      await setDoc(doc(db, 'reservations', 'RES_PAY_10'), {
        id: 'RES_PAY_10',
        slotId: 'G-02',
        userId: 'STUDENT_A',
        status: 'active',
        amountPaidINR: 10
      })

      // Fixture for Test 5.2 (Valid ₹300 monthly pass payment)
      await setDoc(doc(db, 'reservations', 'RES_PAY_300'), {
        id: 'RES_PAY_300',
        slotId: 'G-03',
        userId: 'STUDENT_A',
        status: 'active',
        amountPaidINR: 300
      })

      // Fixture for Test 5.3 (Valid ₹1200 semester pass payment)
      await setDoc(doc(db, 'reservations', 'RES_PAY_1200'), {
        id: 'RES_PAY_1200',
        slotId: 'G-04',
        userId: 'STUDENT_A',
        status: 'active',
        amountPaidINR: 1200
      })

      // Fixture for Test 5.4 (Amount Mismatch: reservation expects 10, payment will attempt 300)
      await setDoc(doc(db, 'reservations', 'RES_PAY_MISMATCH'), {
        id: 'RES_PAY_MISMATCH',
        slotId: 'G-05',
        userId: 'STUDENT_A',
        status: 'active',
        amountPaidINR: 10
      })

      // Fixture for Test 5.5 (Missing amountPaidINR in reservation)
      await setDoc(doc(db, 'reservations', 'RES_NO_AMOUNT'), {
        id: 'RES_NO_AMOUNT',
        slotId: 'G-06',
        userId: 'STUDENT_A',
        status: 'active'
      })

      // Fixture for Test 5.6 (Arbitrary ₹50 payment: reservation expects 10)
      await setDoc(doc(db, 'reservations', 'RES_PAY_ARBITRARY'), {
        id: 'RES_PAY_ARBITRARY',
        slotId: 'G-07',
        userId: 'STUDENT_A',
        status: 'active',
        amountPaidINR: 10
      })

      // Fixture for Test 5.7 (₹0 payment: reservation is 0)
      await setDoc(doc(db, 'reservations', 'RES_PAY_ZERO'), {
        id: 'RES_PAY_ZERO',
        slotId: 'G-08',
        userId: 'STUDENT_A',
        status: 'active',
        amountPaidINR: 0
      })

      // Fixture for Test 5.8 (Non-deterministic ID: reservation expects 10)
      await setDoc(doc(db, 'reservations', 'RES_PAY_FORGED_ID'), {
        id: 'RES_PAY_FORGED_ID',
        slotId: 'G-09',
        userId: 'STUDENT_A',
        status: 'active',
        amountPaidINR: 10
      })

      // Fixture for Test 5.9 (Cross-Student: reservation belongs to Student A, Student B attempts to pay)
      await setDoc(doc(db, 'reservations', 'RES_PAY_STUDENT_A_CROSS'), {
        id: 'RES_PAY_STUDENT_A_CROSS',
        slotId: 'G-11',
        userId: 'STUDENT_A',
        status: 'active',
        amountPaidINR: 10
      })
    })

    // Test 5.1: Legitimate ₹10 payment creation matching reservation
    await runTest('Test 5.1: Legitimate ₹10 payment creation matching reservation succeeds', async () => {
      await assertSucceeds(setDoc(doc(studentADb, 'payments', 'PAY-RES_PAY_10'), {
        id: 'PAY-RES_PAY_10',
        paymentId: 'PAY-RES_PAY_10',
        userId: 'STUDENT_A',
        reservationId: 'RES_PAY_10',
        amount: 10,
        paymentStatus: 'SUCCESS'
      }))
    })

    // Test 5.2: Legitimate ₹300 monthly pass payment
    await runTest('Test 5.2: Legitimate ₹300 monthly pass payment succeeds', async () => {
      await assertSucceeds(setDoc(doc(studentADb, 'payments', 'PAY-RES_PAY_300'), {
        id: 'PAY-RES_PAY_300',
        paymentId: 'PAY-RES_PAY_300',
        userId: 'STUDENT_A',
        reservationId: 'RES_PAY_300',
        amount: 300,
        paymentStatus: 'PAID'
      }))
    })

    // Test 5.3: Legitimate ₹1200 semester pass payment
    await runTest('Test 5.3: Legitimate ₹1200 semester pass payment succeeds', async () => {
      await assertSucceeds(setDoc(doc(studentADb, 'payments', 'PAY-RES_PAY_1200'), {
        id: 'PAY-RES_PAY_1200',
        paymentId: 'PAY-RES_PAY_1200',
        userId: 'STUDENT_A',
        reservationId: 'RES_PAY_1200',
        amount: 1200,
        paymentStatus: 'SUCCESS'
      }))
    })

    // Test 5.4: Payment amount mismatch with reservation amountPaidINR rejected (isolated fixture)
    await runTest('Test 5.4: Payment amount mismatch (₹300 payment for ₹10 reservation) rejected', async () => {
      // Document PAY-RES_PAY_MISMATCH does not exist; path matches reservationId exactly
      await assertFails(setDoc(doc(studentADb, 'payments', 'PAY-RES_PAY_MISMATCH'), {
        id: 'PAY-RES_PAY_MISMATCH',
        paymentId: 'PAY-RES_PAY_MISMATCH',
        userId: 'STUDENT_A',
        reservationId: 'RES_PAY_MISMATCH',
        amount: 300, // Mismatch (reservation expects 10)
        paymentStatus: 'SUCCESS'
      }))
    })

    // Test 5.5: Payment rejected when reservation lacks amountPaidINR (isolated fixture)
    await runTest('Test 5.5: Payment rejected when reservation lacks amountPaidINR', async () => {
      await assertFails(setDoc(doc(studentADb, 'payments', 'PAY-RES_NO_AMOUNT'), {
        id: 'PAY-RES_NO_AMOUNT',
        paymentId: 'PAY-RES_NO_AMOUNT',
        userId: 'STUDENT_A',
        reservationId: 'RES_NO_AMOUNT',
        amount: 10,
        paymentStatus: 'SUCCESS'
      }))
    })

    // Test 5.6: Payment with arbitrary amount (₹50) rejected (isolated fixture)
    await runTest('Test 5.6: Payment with arbitrary amount (₹50) rejected', async () => {
      // Document PAY-RES_PAY_ARBITRARY does not exist; path matches reservationId exactly
      await assertFails(setDoc(doc(studentADb, 'payments', 'PAY-RES_PAY_ARBITRARY'), {
        id: 'PAY-RES_PAY_ARBITRARY',
        paymentId: 'PAY-RES_PAY_ARBITRARY',
        userId: 'STUDENT_A',
        reservationId: 'RES_PAY_ARBITRARY',
        amount: 50, // Not in [10, 300, 1200]
        paymentStatus: 'SUCCESS'
      }))
    })

    // Test 5.7: Payment with ₹0 rejected (isolated fixture)
    await runTest('Test 5.7: Payment record with ₹0 rejected', async () => {
      // Document PAY-RES_PAY_ZERO does not exist; path matches reservationId exactly
      await assertFails(setDoc(doc(studentADb, 'payments', 'PAY-RES_PAY_ZERO'), {
        id: 'PAY-RES_PAY_ZERO',
        paymentId: 'PAY-RES_PAY_ZERO',
        userId: 'STUDENT_A',
        reservationId: 'RES_PAY_ZERO',
        amount: 0, // 0 not in [10, 300, 1200]
        paymentStatus: 'SUCCESS'
      }))
    })

    // Test 5.8: Non-deterministic payment ID rejected
    await runTest('Test 5.8: Payment with non-deterministic document ID rejected', async () => {
      await assertFails(setDoc(doc(studentADb, 'payments', 'FORGED_PAY_ID'), {
        id: 'FORGED_PAY_ID',
        paymentId: 'FORGED_PAY_ID',
        userId: 'STUDENT_A',
        reservationId: 'RES_PAY_FORGED_ID',
        amount: 10,
        paymentStatus: 'SUCCESS'
      }))
    })

    // Test 5.9: Student B creating payment for Student A's reservation rejected (isolated fixture)
    await runTest('Test 5.9: Student B cannot create payment for Student A\'s reservation', async () => {
      // Document PAY-RES_PAY_STUDENT_A_CROSS does not exist; path matches reservationId exactly
      await assertFails(setDoc(doc(studentBDb, 'payments', 'PAY-RES_PAY_STUDENT_A_CROSS'), {
        id: 'PAY-RES_PAY_STUDENT_A_CROSS',
        paymentId: 'PAY-RES_PAY_STUDENT_A_CROSS',
        userId: 'STUDENT_B',
        reservationId: 'RES_PAY_STUDENT_A_CROSS',
        amount: 10,
        paymentStatus: 'SUCCESS'
      }))
    })

    // Test 5.10: Financial audit ledger update strictly forbidden
    await runTest('Test 5.10: Payment record update strictly forbidden (immutable audit ledger)', async () => {
      await assertFails(updateDoc(doc(studentADb, 'payments', 'PAY-RES_PAY_10'), {
        amount: 300
      }))
    })

    // Test 5.11: Financial audit ledger delete strictly forbidden
    await runTest('Test 5.11: Payment record deletion strictly forbidden (immutable audit ledger)', async () => {
      await assertFails(deleteDoc(doc(studentADb, 'payments', 'PAY-RES_PAY_10')))
    })

    // ========================================================================
    // SECTION 6: SESSIONS, REPORTS, PARKING HISTORY & NOTIFICATIONS
    // ========================================================================
    console.log('\n--- SECTION 6: SESSIONS, REPORTS, PARKING HISTORY & NOTIFICATIONS ---')

    // Seed session for Student B
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'parking_sessions', 'SESS_B_01'), {
        id: 'SESS_B_01',
        studentId: 'STUDENT_B',
        userId: 'STUDENT_B',
        slotId: 'B-02',
        status: 'active'
      })
    })

    await runTest('Test 6.1: Student A cannot read Student B parking session', async () => {
      await assertFails(getDoc(doc(studentADb, 'parking_sessions', 'SESS_B_01')))
    })

    await runTest('Test 6.2: Student A cannot modify Student B parking session', async () => {
      await assertFails(updateDoc(doc(studentADb, 'parking_sessions', 'SESS_B_01'), {
        status: 'completed'
      }))
    })

    await runTest('Test 6.3: Student A can submit a legitimate wrong parking report', async () => {
      await assertSucceeds(setDoc(doc(studentADb, 'wrong_parking_reports', 'REP_001'), {
        source: 'student_report',
        reporterUid: 'STUDENT_A',
        studentId: 'STUDENT_A',
        status: 'Pending',
        vehicleNumber: 'MH-12-XX-9999',
        floor: 'Ground Floor',
        reason: 'Blocking Driveway or Ramp',
        adminNote: null,
        resolvedAt: null,
        resolvedBy: null
      }))
    })

    await runTest('Test 6.4: Student A cannot resolve or update wrong parking report', async () => {
      await assertFails(updateDoc(doc(studentADb, 'wrong_parking_reports', 'REP_001'), {
        status: 'Resolved'
      }))
    })

    // --- Task 2: PARKING HISTORY TESTS ---
    await runTest('Test 6.5: Student A can create parking history log for themselves with status "Completed"', async () => {
      await assertSucceeds(setDoc(doc(studentADb, 'parking_history', 'HIST_A_01'), {
        id: 'HIST_A_01',
        studentId: 'STUDENT_A',
        userId: 'STUDENT_A',
        slotId: 'G-01',
        status: 'Completed',
        entryTime: '10:00 AM',
        exitTime: '11:30 AM',
        duration: '1h 30m'
      }))
    })

    await runTest('Test 6.6: Student A cannot create parking history log for Student B', async () => {
      await assertFails(setDoc(doc(studentADb, 'parking_history', 'HIST_FORGED_B'), {
        id: 'HIST_FORGED_B',
        studentId: 'STUDENT_B',
        userId: 'STUDENT_B',
        slotId: 'G-01',
        status: 'Completed'
      }))
    })

    await runTest('Test 6.7: Student A cannot create parking history log with non-completed status', async () => {
      await assertFails(setDoc(doc(studentADb, 'parking_history', 'HIST_ACTIVE'), {
        id: 'HIST_ACTIVE',
        studentId: 'STUDENT_A',
        userId: 'STUDENT_A',
        slotId: 'G-01',
        status: 'Active' // Rules require status == 'Completed'
      }))
    })

    await runTest('Test 6.8: Student A can read their own parking history log', async () => {
      await assertSucceeds(getDoc(doc(studentADb, 'parking_history', 'HIST_A_01')))
    })

    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'parking_history', 'HIST_B_01'), {
        id: 'HIST_B_01',
        studentId: 'STUDENT_B',
        userId: 'STUDENT_B',
        slotId: 'B-01',
        status: 'Completed'
      })
    })

    await runTest('Test 6.9: Student A cannot read Student B parking history log', async () => {
      await assertFails(getDoc(doc(studentADb, 'parking_history', 'HIST_B_01')))
    })

    await runTest('Test 6.10: Student A cannot update parking history log (read-only audit trail)', async () => {
      await assertFails(updateDoc(doc(studentADb, 'parking_history', 'HIST_A_01'), {
        duration: '5h 00m'
      }))
    })

    await runTest('Test 6.11: Student A cannot delete parking history log', async () => {
      await assertFails(deleteDoc(doc(studentADb, 'parking_history', 'HIST_A_01')))
    })

    await runTest('Test 6.12: Security Admin can update and delete parking history logs', async () => {
      await assertSucceeds(updateDoc(doc(guardDb, 'parking_history', 'HIST_A_01'), {
        adminNote: 'Verified by Security Admin'
      }))
      await assertSucceeds(deleteDoc(doc(guardDb, 'parking_history', 'HIST_B_01')))
    })

    // --- Task 3: NOTIFICATIONS TESTS ---
    await runTest('Test 6.13: Student A can create notification addressed to themselves', async () => {
      await assertSucceeds(setDoc(doc(studentADb, 'notifications', 'NOTIF_A_01'), {
        id: 'NOTIF_A_01',
        userId: 'STUDENT_A',
        title: 'Booking Confirmed',
        message: 'Your bay G-01 is reserved.',
        read: false,
        createdAt: new Date().toISOString()
      }))
    })

    await runTest('Test 6.14: Student A cannot create notification addressed to Student B', async () => {
      await assertFails(setDoc(doc(studentADb, 'notifications', 'NOTIF_FORGED_B'), {
        id: 'NOTIF_FORGED_B',
        userId: 'STUDENT_B',
        title: 'Spam',
        message: 'Forged notice'
      }))
    })

    await runTest('Test 6.15: Student A cannot create broadcast notification (userId: "ALL")', async () => {
      await assertFails(setDoc(doc(studentADb, 'notifications', 'NOTIF_BROADCAST_STUDENT'), {
        id: 'NOTIF_BROADCAST_STUDENT',
        userId: 'ALL',
        title: 'Campus Alert',
        message: 'Unauthorized student broadcast'
      }))
    })

    await runTest('Test 6.16: Security Admin can create broadcast notification (userId: "ALL")', async () => {
      await assertSucceeds(setDoc(doc(guardDb, 'notifications', 'NOTIF_BROADCAST_ADMIN'), {
        id: 'NOTIF_BROADCAST_ADMIN',
        userId: 'ALL',
        title: 'Gate Maintenance',
        message: 'Basement gate maintenance between 2 PM - 3 PM.',
        read: false
      }))
    })

    await runTest('Test 6.17: Student A can read their own notification', async () => {
      await assertSucceeds(getDoc(doc(studentADb, 'notifications', 'NOTIF_A_01')))
    })

    await runTest('Test 6.18: Student A can read broadcast notification addressed to "ALL"', async () => {
      await assertSucceeds(getDoc(doc(studentADb, 'notifications', 'NOTIF_BROADCAST_ADMIN')))
    })

    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'notifications', 'NOTIF_B_PRIVATE'), {
        id: 'NOTIF_B_PRIVATE',
        userId: 'STUDENT_B',
        title: 'Personal Notice',
        message: 'Confidential message for Student B',
        read: false
      })
    })

    await runTest('Test 6.19: Student A cannot read Student B private notification', async () => {
      await assertFails(getDoc(doc(studentADb, 'notifications', 'NOTIF_B_PRIVATE')))
    })

    await runTest('Test 6.20: Student A can update their own notification (mark as read)', async () => {
      await assertSucceeds(updateDoc(doc(studentADb, 'notifications', 'NOTIF_A_01'), {
        read: true
      }))
    })

    await runTest('Test 6.21: Student A can delete their own read notification (read == true)', async () => {
      await assertSucceeds(deleteDoc(doc(studentADb, 'notifications', 'NOTIF_A_01')))
    })

    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'notifications', 'NOTIF_A_UNREAD'), {
        id: 'NOTIF_A_UNREAD',
        userId: 'STUDENT_A',
        title: 'Unread Alert',
        read: false
      })
    })

    await runTest('Test 6.22: Student A cannot delete unread notification (read == false required by line 394)', async () => {
      await assertFails(deleteDoc(doc(studentADb, 'notifications', 'NOTIF_A_UNREAD')))
    })

    await runTest('Test 6.23: Student A cannot delete Student B notification', async () => {
      await assertFails(deleteDoc(doc(studentADb, 'notifications', 'NOTIF_B_PRIVATE')))
    })

    // ========================================================================
    // SECTION 7: SECURITY ADMIN / GUARD GATE INGRESS & EGRESS WORKFLOWS
    // ========================================================================
    console.log('\n--- SECTION 7: SECURITY ADMIN GATE INGRESS & EGRESS WORKFLOWS ---')

    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'parking_slots', 'G-20'), {
        id: 'G-20',
        status: 'reserved',
        userId: 'STUDENT_A',
        reservedBy: 'STUDENT_A',
        reservationId: 'RES_GATE_01',
        floor: 'Ground Floor',
        type: 'scooty'
      })
      await setDoc(doc(context.firestore(), 'reservations', 'RES_GATE_01'), {
        id: 'RES_GATE_01',
        slotId: 'G-20',
        userId: 'STUDENT_A',
        status: 'active',
        entryQrStatus: 'ACTIVE'
      })
      await setDoc(doc(context.firestore(), 'users', 'GUARD_01'), {
        uid: 'GUARD_01',
        role: 'Security Admin',
        email: 'guard_01@college.edu'
      })
    })

    await runTest('Test 7.1: Security Admin can update slot to "occupied" with guardUid at ingress', async () => {
      await assertSucceeds(updateDoc(doc(guardDb, 'parking_slots', 'G-20'), {
        status: 'occupied',
        guardUid: 'GUARD_01',
        gateEnteredAt: new Date().toISOString()
      }))
    })

    await runTest('Test 7.2: Security Admin can update reservation to "in_use" with entryQrStatus "USED"', async () => {
      await assertSucceeds(updateDoc(doc(guardDb, 'reservations', 'RES_GATE_01'), {
        status: 'in_use',
        entryQrStatus: 'USED',
        guardUid: 'GUARD_01',
        gateEnteredAt: new Date().toISOString()
      }))
    })

    await runTest('Test 7.3: Security Admin can release slot to "available" with exitGuardUid at egress', async () => {
      await assertSucceeds(updateDoc(doc(guardDb, 'parking_slots', 'G-20'), {
        status: 'available',
        userId: '',
        reservedBy: '',
        reservationId: '',
        exitGuardUid: 'GUARD_01',
        gateExitedAt: new Date().toISOString()
      }))
    })

    await runTest('Test 7.4: Ordinary student cannot perform gate ingress update on slot', async () => {
      await assertFails(updateDoc(doc(studentADb, 'parking_slots', 'G-20'), {
        status: 'occupied',
        guardUid: 'STUDENT_A'
      }))
    })

    await runTest('Test 7.5: Security Admin can update reservation to "completed" with exitGuardUid at egress', async () => {
      await assertSucceeds(updateDoc(doc(guardDb, 'reservations', 'RES_GATE_01'), {
        status: 'completed',
        exitGuardUid: 'GUARD_01',
        gateExitedAt: new Date().toISOString()
      }))
      const snap = await getDoc(doc(guardDb, 'reservations', 'RES_GATE_01'))
      if (snap.data().status !== 'completed' || snap.data().exitGuardUid !== 'GUARD_01') {
        throw new Error('Expected reservation to be completed with exitGuardUid GUARD_01')
      }
    })

    await runTest('Test 7.6: Ordinary student cannot mark reservation completed or inject egress audit fields', async () => {
      await assertFails(updateDoc(doc(studentADb, 'reservations', 'RES_GATE_01'), {
        status: 'completed',
        exitGuardUid: 'STUDENT_A',
        gateExitedAt: new Date().toISOString()
      }))
    })

    // ========================================================================
    // TEST SUMMARY & REPORTING
    // ========================================================================
    console.log('\n====================================================')
    console.log(`EMULATOR TEST SUITE COMPLETED: ${passCount} Passed, ${failCount} Failed`)
    console.log('====================================================')

    if (observations.length > 0) {
      console.log('\n🔍 ARCHITECTURAL OBSERVATIONS & DISCREPANCIES:')
      observations.forEach((obs, idx) => {
        console.log(`  [${idx + 1}] ${obs}`)
      })
    }

    if (failCount > 0) {
      console.error('\n❌ FAILURES SUMMARY:')
      failures.forEach((f, idx) => {
        console.error(`  ${idx + 1}. ${f.testName}`)
        console.error(`     Details: ${f.error}`)
      })
      process.exit(1)
    } else {
      console.log('🎉 ALL NATIVE RULES ENGINE TESTS PASSED WITH 100% SUCCESS!')
    }
  } finally {
    await testEnv.cleanup()
  }
}

runTestSuite().catch((err) => {
  console.error('\n❌ FATAL TEST RUNNER ERROR:', err)
  process.exit(1)
})
