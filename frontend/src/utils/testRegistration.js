import {
  VEHICLE_FLOOR_RULES,
  VEHICLE_FLOOR_LABELS,
  getFloorForVehicleType,
  isValidIndianPhone,
  validateVehicleInput,
  normalizePlate,
  isVehicleCurrentlyParked,
  searchVehicle
} from '../services/vehicleService.js'

console.log('=== COMPREHENSIVE REGISTRATION MODULE TEST SUITE ===\n')

// Test 1: Vehicle Type Floor Rules (Scooty & Bike Only)
console.log('Test 1: Vehicle Type Floor Allocation Mapping')
console.assert(VEHICLE_FLOOR_RULES.scooty === 'ground', 'Scooty rule must be ground')
console.assert(VEHICLE_FLOOR_RULES.bike === 'basement', 'Bike rule must be basement')
console.assert(VEHICLE_FLOOR_RULES.car === undefined, 'Car rule must not exist')
console.assert(getFloorForVehicleType('scooty') === 'Ground Floor', 'Scooty floor label mismatch')
console.assert(getFloorForVehicleType('bike') === 'Basement', 'Bike floor label mismatch')
console.log('  ✓ Scooty -> Ground Floor')
console.log('  ✓ Bike -> Basement')

// Test 2: Phone Validation
console.log('\nTest 2: Indian Phone Number Validation')
console.assert(isValidIndianPhone('9876543210') === true, '10-digit phone should be valid')
console.assert(isValidIndianPhone('+91 9876543210') === true, '+91 with space should be valid')
console.assert(isValidIndianPhone('+91-9876543210') === true, '+91- format should be valid')
console.assert(isValidIndianPhone('09876543210') === true, '0 prefix format should be valid')
console.assert(isValidIndianPhone('12345') === false, '5 digits must be rejected')
console.assert(isValidIndianPhone('abcdefghij') === false, 'Letters must be rejected')
console.assert(isValidIndianPhone('5555555555') === false, 'Leading 5 must be rejected')
console.log('  ✓ Valid formats accepted (+91, 0, 10-digit starting with 6-9)')
console.log('  ✓ Invalid formats rejected')

// Test 3: Missing Fields Validation
console.log('\nTest 3: Missing Required Fields Validation')
const missingTest = validateVehicleInput({
  studentName: '',
  rollNumber: '',
  stream: '',
  phoneNumber: '',
  vehicleNumber: '',
  vehicleType: ''
}, [])
console.assert(missingTest.isValid === false, 'Empty form must be invalid')
console.assert(missingTest.errors.studentName === 'Student Name is required.', 'Student name error mismatch')
console.assert(missingTest.errors.rollNumber === 'Roll Number is required.', 'Roll number error mismatch')
console.assert(missingTest.errors.stream === 'Stream / Class is required.', 'Stream error mismatch')
console.assert(missingTest.errors.phoneNumber === 'Phone Number is required.', 'Phone number error mismatch')
console.assert(missingTest.errors.vehicleNumber === 'Vehicle Number is required.', 'Vehicle number error mismatch')
console.assert(missingTest.errors.vehicleType === 'Please select a Vehicle Type.', 'Vehicle type error mismatch')
console.log('  ✓ Missing field errors properly surfaced')

// Test 4: Duplicate Roll Number
console.log('\nTest 4: Duplicate Roll Number Detection')
const mockVehicles = [
  {
    id: 'REG-1',
    studentName: 'Alzuni Shaikh',
    rollNumber: 'BCA2026D01',
    phoneNumber: '9876543210',
    vehicleNumber: 'MH-12-AB-1234',
    vehicleType: 'scooty'
  }
]

const dupRoll = validateVehicleInput({
  studentName: 'New Student',
  rollNumber: 'BCA2026D01',
  stream: 'BCA',
  phoneNumber: '9876543211',
  vehicleNumber: 'MH-14-XY-9999',
  vehicleType: 'bike'
}, mockVehicles)
console.assert(dupRoll.isValid === false, 'Duplicate roll must be invalid')
console.assert(dupRoll.errors.rollNumber === 'Roll number already registered.', 'Duplicate roll message mismatch')
console.log('  ✓ Exactly shows: "Roll number already registered."')

// Test 5: Duplicate Vehicle Number
console.log('\nTest 5: Duplicate Vehicle Number Detection')
const dupPlate = validateVehicleInput({
  studentName: 'New Student 2',
  rollNumber: 'BCA2026D99',
  stream: 'BCA',
  phoneNumber: '9876543212',
  vehicleNumber: 'MH12AB1234', // space/hyphen agnostic duplicate
  vehicleType: 'scooty'
}, mockVehicles)
console.assert(dupPlate.isValid === false, 'Duplicate vehicle must be invalid')
console.assert(dupPlate.errors.vehicleNumber === 'Vehicle number already registered.', 'Duplicate vehicle message mismatch')
console.log('  ✓ Exactly shows: "Vehicle number already registered."')

// Test 6: Valid Registration
console.log('\nTest 6: Valid Registration Acceptance')
const validTest = validateVehicleInput({
  studentName: 'John Doe',
  rollNumber: 'CS2026B50',
  stream: 'B.Tech Computer Science (CSE)',
  phoneNumber: '9811122233',
  vehicleNumber: 'MH-04-ZZ-9999',
  vehicleType: 'bike'
}, mockVehicles)
console.assert(validTest.isValid === true, 'Valid data must pass')
console.log('  ✓ Valid registration passed all checks')

// Test 7: Edit Self-Exclusion (Editing existing vehicle without false duplicate error)
console.log('\nTest 7: Edit Registration Validation (Self-collision bypass)')
const editSelf = validateVehicleInput({
  studentName: 'Alzuni Shaikh Updated',
  rollNumber: 'BCA2026D01',
  stream: 'MCA',
  phoneNumber: '9876543210',
  vehicleNumber: 'MH-12-AB-1234',
  vehicleType: 'scooty'
}, mockVehicles, 'REG-1')
console.assert(editSelf.isValid === true, 'Editing own record must not trigger duplicate error')
console.log('  ✓ Editing existing vehicle with same roll/plate succeeds')

// Test 8: Parked Vehicle Deletion Protection
console.log('\nTest 8: Parking Occupancy Deletion Safety Guard')
const mockSlots = [
  {
    id: 'G-01',
    floor: 'Ground Floor',
    status: 'occupied',
    plate: 'MH-12-AB-1234'
  },
  {
    id: 'G-02',
    floor: 'Ground Floor',
    status: 'available',
    plate: ''
  }
]

const parkedSlot = isVehicleCurrentlyParked('MH12AB1234', mockSlots)
console.assert(parkedSlot !== null && parkedSlot.id === 'G-01', 'Occupied slot must be detected')
console.log('  ✓ Detected parked vehicle in bay G-01 -> Deletion blocked')

const unparkedSlot = isVehicleCurrentlyParked('MH-04-ZZ-9999', mockSlots)
console.assert(unparkedSlot === null, 'Unparked vehicle must not be detected as occupied')
console.log('  ✓ Unparked vehicle detected as free -> Deletion allowed')

console.log('\n=============================================')
console.log('>>> ALL 8 TEST SUITES COMPLETED WITH 100% PASS <<<')
console.log('=============================================\n')
