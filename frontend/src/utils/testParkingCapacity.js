import { INITIAL_SLOTS } from '../data/initialSlots.js'
import {
  createInitialBayData,
  createBasementBayData
} from '../data/campusMasterPlanData.js'
import {
  normalizeSlotId,
  isValidCanonicalSlotId,
  sortSlots,
  isSlotAllowedForVehicleType
} from '../services/parkingService.js'

console.log('====================================================')
console.log('🅿️  PARKING CAPACITY & SLOT COUNT VERIFICATION SUITE')
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
// Test Group 1: INITIAL_SLOTS Validation (160 bays)
// ----------------------------------------------------
console.log('Test Group 1: INITIAL_SLOTS Template Verification')
assert(INITIAL_SLOTS.length === 160, `INITIAL_SLOTS length is exactly 160 (actual: ${INITIAL_SLOTS.length})`)

const groundSlots = INITIAL_SLOTS.filter(s => s.floor === 'Ground Floor')
assert(groundSlots.length === 80, `Ground Floor slots count is exactly 80 (actual: ${groundSlots.length})`)

const basementSlots = INITIAL_SLOTS.filter(s => s.floor === 'Basement')
assert(basementSlots.length === 80, `Basement slots count is exactly 80 (actual: ${basementSlots.length})`)

// Check Ground IDs: G-01 to G-80
const groundIds = groundSlots.map(s => s.id)
const expectedGroundIds = Array.from({ length: 80 }, (_, i) => `G-${String(i + 1).padStart(2, '0')}`)
const allGroundMatch = expectedGroundIds.every(id => groundIds.includes(id))
assert(allGroundMatch, 'Ground contains all IDs from G-01 through G-80')
assert(!groundIds.some(id => parseInt(id.replace('G-', ''), 10) > 80), 'No Ground IDs G-81 or higher exist')

// Check Basement IDs: B-01 to B-80
const basementIds = basementSlots.map(s => s.id)
const expectedBasementIds = Array.from({ length: 80 }, (_, i) => `B-${String(i + 1).padStart(2, '0')}`)
const allBasementMatch = expectedBasementIds.every(id => basementIds.includes(id))
assert(allBasementMatch, 'Basement contains all IDs from B-01 through B-80')
assert(!basementIds.some(id => parseInt(id.replace('B-', ''), 10) > 80), 'No Basement IDs B-81 or higher exist')

// Check duplicate IDs across all slots
const allIds = INITIAL_SLOTS.map(s => s.id)
const uniqueIds = new Set(allIds)
assert(uniqueIds.size === 160, `All 160 slot IDs are unique without duplicates (unique: ${uniqueIds.size})`)

// Check vehicle types per floor
const allGroundScooty = groundSlots.every(s => s.type === 'scooty')
assert(allGroundScooty, 'All 80 Ground slots are designated for scooties')

const allBasementBike = basementSlots.every(s => s.type === 'bike')
assert(allBasementBike, 'All 80 Basement slots are designated for bikes')


// ----------------------------------------------------
// Test Group 2: campusMasterPlanData Bay Generators
// ----------------------------------------------------
console.log('\nTest Group 2: Master Plan CAD Bay Generators')
const masterGround = createInitialBayData()
assert(masterGround.length === 80, `createInitialBayData returns exactly 80 bays (actual: ${masterGround.length})`)
assert(masterGround[0].id === 'G-01', `First Ground bay is G-01 (actual: ${masterGround[0].id})`)
assert(masterGround[79].id === 'G-80', `Last Ground bay is G-80 (actual: ${masterGround[79].id})`)
assert(!masterGround.some(b => parseInt(b.id.replace('G-', ''), 10) > 80), 'No G-81+ bays in createInitialBayData')

const masterBasement = createBasementBayData()
assert(masterBasement.length === 80, `createBasementBayData returns exactly 80 bays (actual: ${masterBasement.length})`)
assert(masterBasement[0].id === 'B-01', `First Basement bay is B-01 (actual: ${masterBasement[0].id})`)
assert(masterBasement[79].id === 'B-80', `Last Basement bay is B-80 (actual: ${masterBasement[79].id})`)
assert(!masterBasement.some(b => parseInt(b.id.replace('B-', ''), 10) > 80), 'No B-81+ bays in createBasementBayData')


// ----------------------------------------------------
// Test Group 3: isValidCanonicalSlotId & Normalization
// ----------------------------------------------------
console.log('\nTest Group 3: Canonical Slot Validation Rules')
assert(isValidCanonicalSlotId('G-01') === true, 'G-01 is valid')
assert(isValidCanonicalSlotId('G-80') === true, 'G-80 is valid')
assert(isValidCanonicalSlotId('B-01') === true, 'B-01 is valid')
assert(isValidCanonicalSlotId('B-80') === true, 'B-80 is valid')
assert(isValidCanonicalSlotId('g-05') === true, 'g-05 is valid')
assert(isValidCanonicalSlotId('B-81') === false, 'B-81 is rejected (> 80)')
assert(isValidCanonicalSlotId('G-81') === false, 'G-81 is rejected (> 80)')
assert(isValidCanonicalSlotId('G-140') === false, 'G-140 is rejected (> 80)')
assert(isValidCanonicalSlotId('B-140') === false, 'B-140 is rejected (> 80)')
assert(isValidCanonicalSlotId('P-01') === false, 'P-01 is rejected (invalid prefix)')
assert(isValidCanonicalSlotId('') === false, 'Empty string is rejected')
assert(isValidCanonicalSlotId(null) === false, 'Null is rejected')


// ----------------------------------------------------
// Test Group 4: Dynamic Dashboard Counting Math
// ----------------------------------------------------
console.log('\nTest Group 4: Dynamic Statistics Math')

// Initial Clean State Simulation
const cleanSlots = INITIAL_SLOTS.map(s => ({ ...s, status: 'available' }))
function computeStats(currentSlots) {
  const totalSlots = 160
  const occupiedSlots = currentSlots.filter(s => s.status === 'occupied' || s.status === 'OCCUPIED' || s.status === 'booked' || s.status === 'BOOKED').length
  const reservedSlots = currentSlots.filter(s => s.status === 'reserved' || s.status === 'RESERVED').length
  const availableSlots = Math.max(0, totalSlots - occupiedSlots - reservedSlots)

  const gSlots = currentSlots.filter(s => s.floor === 'Ground Floor' || s.id?.startsWith('G-'))
  const gOccupied = gSlots.filter(s => s.status === 'occupied' || s.status === 'OCCUPIED' || s.status === 'booked' || s.status === 'BOOKED').length
  const gReserved = gSlots.filter(s => s.status === 'reserved' || s.status === 'RESERVED').length
  const gAvailable = Math.max(0, 80 - gOccupied - gReserved)
  const gPercent = Math.round((gOccupied / 80) * 100)

  const bSlots = currentSlots.filter(s => s.floor === 'Basement' || s.id?.startsWith('B-'))
  const bOccupied = bSlots.filter(s => s.status === 'occupied' || s.status === 'OCCUPIED' || s.status === 'booked' || s.status === 'BOOKED').length
  const bReserved = bSlots.filter(s => s.status === 'reserved' || s.status === 'RESERVED').length
  const bAvailable = Math.max(0, 80 - bOccupied - bReserved)
  const bPercent = Math.round((bOccupied / 80) * 100)

  return {
    totalSlots,
    availableSlots,
    occupiedSlots,
    reservedSlots,
    groundTotal: 80,
    groundAvailable: gAvailable,
    groundOccupied: gOccupied,
    groundPercent: gPercent,
    basementTotal: 80,
    basementAvailable: bAvailable,
    basementOccupied: bOccupied,
    basementPercent: bPercent
  }
}

// Initial State Test
const initialStats = computeStats(cleanSlots)
assert(initialStats.totalSlots === 160, 'Initial Total Bays is 160')
assert(initialStats.availableSlots === 160, 'Initial Available is 160')
assert(initialStats.occupiedSlots === 0, 'Initial Occupied is 0')
assert(initialStats.reservedSlots === 0, 'Initial Reserved is 0')
assert(initialStats.groundTotal === 80, 'Initial Ground Total is 80')
assert(initialStats.groundAvailable === 80, 'Initial Ground Open is 80')
assert(initialStats.groundPercent === 0, 'Initial Ground Occupied percentage is 0%')
assert(initialStats.basementTotal === 80, 'Initial Basement Total is 80')
assert(initialStats.basementAvailable === 80, 'Initial Basement Open is 80')
assert(initialStats.basementPercent === 0, 'Initial Basement Occupied percentage is 0%')
assert(initialStats.availableSlots + initialStats.occupiedSlots + initialStats.reservedSlots === 160, 'Available + Occupied + Reserved = 160')

// State after reserving G-01
const afterReserveSlots = cleanSlots.map(s => s.id === 'G-01' ? { ...s, status: 'reserved' } : s)
const reserveStats = computeStats(afterReserveSlots)
assert(reserveStats.availableSlots === 159, 'Available is 159 after reserving 1 slot')
assert(reserveStats.reservedSlots === 1, 'Reserved is 1 after reserving 1 slot')
assert(reserveStats.occupiedSlots === 0, 'Occupied is 0 after reserving 1 slot')
assert(reserveStats.groundAvailable === 79, 'Ground Available is 79 after reserving 1 scooty slot')
assert(reserveStats.availableSlots + reserveStats.occupiedSlots + reserveStats.reservedSlots === 160, 'Available + Occupied + Reserved = 160 maintained after reservation')

// State after occupying B-01
const afterOccupySlots = cleanSlots.map(s => s.id === 'B-01' ? { ...s, status: 'occupied' } : s)
const occupyStats = computeStats(afterOccupySlots)
assert(occupyStats.availableSlots === 159, 'Available is 159 after occupying 1 slot')
assert(occupyStats.occupiedSlots === 1, 'Occupied is 1 after occupying 1 slot')
assert(occupyStats.reservedSlots === 0, 'Reserved is 0 after occupying 1 slot')
assert(occupyStats.basementAvailable === 79, 'Basement Available is 79 after occupying 1 bike slot')
assert(occupyStats.basementOccupied === 1, 'Basement Occupied is 1')
assert(occupyStats.basementPercent === Math.round((1 / 80) * 100), 'Basement percent calculated with / 80')
assert(occupyStats.availableSlots + occupyStats.occupiedSlots + occupyStats.reservedSlots === 160, 'Available + Occupied + Reserved = 160 maintained after occupancy')

// ----------------------------------------------------
// Test Group 5: Vehicle Type Floor Compatibility (Booking Rules)
// ----------------------------------------------------
console.log('\nTest Group 5: Vehicle Type & Floor Rules (Booking Enforcement)')

// Scooty rules (Ground Floor only: G-01..G-80)
assert(isSlotAllowedForVehicleType('G-01', 'scooty') === true, 'Scooty CAN book G-01 (Ground)')
assert(isSlotAllowedForVehicleType('G-80', 'scooty') === true, 'Scooty CAN book G-80 (Ground)')
assert(isSlotAllowedForVehicleType('B-01', 'scooty') === false, 'Scooty CANNOT book B-01 (Basement)')
assert(isSlotAllowedForVehicleType('B-80', 'scooty') === false, 'Scooty CANNOT book B-80 (Basement)')

// Bike rules (Basement only: B-01..B-80)
assert(isSlotAllowedForVehicleType('B-01', 'bike') === true, 'Bike CAN book B-01 (Basement)')
assert(isSlotAllowedForVehicleType('B-80', 'bike') === true, 'Bike CAN book B-80 (Basement)')
assert(isSlotAllowedForVehicleType('G-01', 'bike') === false, 'Bike CANNOT book G-01 (Ground)')
assert(isSlotAllowedForVehicleType('G-80', 'bike') === false, 'Bike CANNOT book G-80 (Ground)')

// Boundary slot verification
assert(INITIAL_SLOTS[0].id === 'G-01', 'First Ground slot is G-01')
assert(INITIAL_SLOTS[79].id === 'G-80', 'Last Ground slot is G-80')
assert(INITIAL_SLOTS[80].id === 'B-01', 'First Basement slot is B-01')
assert(INITIAL_SLOTS[159].id === 'B-80', 'Last Basement slot is B-80')

// ----------------------------------------------------
// Summary
// ----------------------------------------------------
console.log('\n====================================================')
console.log(`TEST SUMMARY: ${passCount} Passed, ${failCount} Failed`)
console.log('====================================================')

if (failCount > 0) {
  process.exit(1)
} else {
  console.log('🎉 ALL PARKING CAPACITY & COUNTING UNIT TESTS PASSED!')
}
