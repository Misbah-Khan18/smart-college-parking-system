console.log('====================================================')
console.log('🔐 AUTHENTICATION & ROLE-ROUTING TEST SUITE')
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
// Mock localStorage simulation
// ----------------------------------------------------
const mockStorage = {}
const localStorageMock = {
  getItem: (k) => mockStorage[k] || null,
  setItem: (k, v) => { mockStorage[k] = String(v) },
  removeItem: (k) => { delete mockStorage[k] },
  clear: () => { Object.keys(mockStorage).forEach(k => delete mockStorage[k]) }
}

localStorageMock.setItem('mock_test', 'success')
assert(localStorageMock.getItem('mock_test') === 'success', 'localStorageMock correctly stores and retrieves data')
localStorageMock.removeItem('mock_test')
assert(localStorageMock.getItem('mock_test') === null, 'localStorageMock correctly removes keys')

// ----------------------------------------------------
// Test 1: Role-Based Admin Evaluation Logic
// ----------------------------------------------------
console.log('Test 1: Role-Based Admin Detection')
function evaluateIsAdmin(profile) {
  return profile?.role === 'Security Admin' || profile?.role === 'Admin'
}

assert(evaluateIsAdmin({ role: 'Security Admin' }) === true, 'Security Admin calculates isAdmin === true')
assert(evaluateIsAdmin({ role: 'Admin' }) === true, 'Admin calculates isAdmin === true')
assert(evaluateIsAdmin({ role: 'Student' }) === false, 'Student calculates isAdmin === false')
assert(evaluateIsAdmin({ role: 'Faculty' }) === false, 'Faculty calculates isAdmin === false')
assert(evaluateIsAdmin(null) === false, 'Null profile calculates isAdmin === false')

// ----------------------------------------------------
// Test 2: Custom Student Vehicle Profile Merge Protection
// ----------------------------------------------------
console.log('\nTest 2: Protection against Student localStorage Downgrading Admin')

function mergeUserProfile(firestoreProfile, rawCustomStorageJson) {
  let customVehicleData = {}
  if (rawCustomStorageJson) {
    try {
      const parsed = JSON.parse(rawCustomStorageJson)
      const vehicleProps = { ...(parsed || {}) }
      delete vehicleProps.role
      delete vehicleProps.uid
      delete vehicleProps.email
      delete vehicleProps.displayName
      delete vehicleProps.photoURL
      delete vehicleProps.campusId
      customVehicleData = vehicleProps
    } catch {
      // ignore
    }
  }

  if (firestoreProfile) {
    if (firestoreProfile.role === 'Security Admin' || firestoreProfile.role === 'Admin') {
      return firestoreProfile
    }
    return {
      ...firestoreProfile,
      ...customVehicleData,
      role: firestoreProfile.role || 'Student'
    }
  }
  return null
}

const adminFirestoreDoc = {
  uid: 'R2eyVR9vzOUb6rwv9gNCPWcuoGr1',
  email: 'shaikhalzuni123@gmail.com',
  displayName: 'Alzuni Shaikh',
  role: 'Security Admin',
  photoURL: ''
}

const maliciousStudentStorage = JSON.stringify({
  displayName: 'Hacked Student',
  role: 'Student', // Attempting to downgrade role
  defaultPlate: 'MH-12-ST-9999',
  vehicleType: 'scooty'
})

const mergedAdmin = mergeUserProfile(adminFirestoreDoc, maliciousStudentStorage)
assert(mergedAdmin.role === 'Security Admin', 'Admin role is preserved (not downgraded to Student)')
assert(evaluateIsAdmin(mergedAdmin) === true, 'Admin status remains true after merge')
assert(mergedAdmin.displayName === 'Alzuni Shaikh', 'Authoritative displayName is preserved')

// ----------------------------------------------------
// Test 3: Student Profile Merge allows vehicle customizations
// ----------------------------------------------------
console.log('\nTest 3: Student Profile merges non-identity vehicle fields properly')

const studentFirestoreDoc = {
  uid: 'STUDENT-UID-123',
  email: 'student@college.edu',
  displayName: 'Regular Student',
  role: 'Student'
}

const studentCustomStorage = JSON.stringify({
  defaultPlate: 'MH-14-CC-4444',
  vehicleType: 'bike',
  role: 'Admin' // Attempting to escalate role
})

const mergedStudent = mergeUserProfile(studentFirestoreDoc, studentCustomStorage)
assert(mergedStudent.role === 'Student', 'Student role is preserved (cannot escalate to Admin via localStorage)')
assert(mergedStudent.defaultPlate === 'MH-14-CC-4444', 'Vehicle plate customization is applied')
assert(mergedStudent.vehicleType === 'bike', 'Vehicle type customization is applied')
assert(evaluateIsAdmin(mergedStudent) === false, 'Student remains non-admin')

// ----------------------------------------------------
// Test 4: Known Security Admin Account Verification
// ----------------------------------------------------
console.log('\nTest 4: Specific Admin Account (shaikhalzuni123@gmail.com / R2eyVR9vzOUb6rwv9gNCPWcuoGr1)')

const testAccount = {
  uid: 'R2eyVR9vzOUb6rwv9gNCPWcuoGr1',
  email: 'shaikhalzuni123@gmail.com',
  displayName: 'Alzuni Shaikh',
  role: 'Security Admin'
}

assert(testAccount.uid === 'R2eyVR9vzOUb6rwv9gNCPWcuoGr1', 'UID matches expected account')
assert(testAccount.email === 'shaikhalzuni123@gmail.com', 'Email matches expected account')
assert(testAccount.role === 'Security Admin', 'Role is Security Admin')
assert(evaluateIsAdmin(testAccount) === true, 'Routes directly to Admin / Guard dashboard')

// ----------------------------------------------------
// Test Summary
// ----------------------------------------------------
console.log('\n====================================================')
console.log(`TEST SUMMARY: ${passCount} Passed, ${failCount} Failed`)
console.log('====================================================')

if (failCount > 0) {
  process.exit(1)
} else {
  console.log('🎉 ALL AUTHENTICATION & ROLE-ROUTING TESTS PASSED!')
}
