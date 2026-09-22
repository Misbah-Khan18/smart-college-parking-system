// =========================================================
// CENTRALIZED VEHICLE & FLOOR ALLOCATION RULES (SCOOTY & BIKE ONLY)
// =========================================================

export const VEHICLE_FLOOR_RULES = {
  scooty: 'ground',
  bike: 'basement'
}

export const VEHICLE_FLOOR_LABELS = {
  scooty: 'Ground Floor',
  bike: 'Basement'
}

export const VEHICLE_TYPES = ['scooty', 'bike']

export const VEHICLE_TYPE_OPTIONS = [
  {
    id: 'scooty',
    value: 'scooty',
    label: 'Scooty',
    emoji: '🛵',
    floor: 'Ground Floor',
    floorCode: 'ground',
    description: 'Ground Floor Scooty Bays (G-01 to G-80)'
  },
  {
    id: 'bike',
    value: 'bike',
    label: 'Bike',
    emoji: '🏍️',
    floor: 'Basement',
    floorCode: 'basement',
    description: 'Basement Bike Bays (B-01 to B-80)'
  }
]

export const COMMON_STREAMS = [
  'BCA (Bachelor of Computer Applications)',
  'B.Com (Bachelor of Commerce)',
  'BBA (Bachelor of Business Administration)',
  'MCA (Master of Computer Applications)',
  'MBA (Master of Business Administration)',
  'B.Tech Computer Science (CSE)',
  'B.Tech Information Technology (IT)',
  'B.Tech AI & Data Science (AI/DS)',
  'B.Tech Electronics & Telecomm (EXTC)',
  'B.Tech Mechanical Engineering',
  'Staff / Faculty'
]

/**
 * Helper to get human-readable floor for a vehicle type
 * @param {string} vehicleType 
 * @returns {string} Floor label
 */
export function getFloorForVehicleType(vehicleType) {
  const normalized = (vehicleType || '').toLowerCase().trim()
  return VEHICLE_FLOOR_LABELS[normalized] || (normalized === 'bike' ? 'Basement' : 'Ground Floor')
}

/**
 * Returns the slot ID prefix for a given vehicle type.
 * Scooties → 'G-' (Ground Floor), Bikes → 'B-' (Basement)
 * @param {string} vehicleType
 * @returns {string}
 */
export function getSlotPrefixForVehicleType(vehicleType) {
  const normalized = (vehicleType || '').toLowerCase().trim()
  return normalized === 'bike' ? 'B-' : 'G-'
}

/**
 * Returns true if the given slotId is valid for the given vehicleType.
 * Scooties must use Ground Floor slots (G-xx), Bikes must use Basement slots (B-xx).
 * @param {string} slotId
 * @param {string} vehicleType
 * @returns {boolean}
 */
export function isSlotAllowedForVehicleType(slotId, vehicleType) {
  const normalized = (vehicleType || '').toLowerCase().trim()
  const id = (slotId || '').toUpperCase().trim()
  if (normalized === 'bike') return id.startsWith('B-') || id.startsWith('B')
  return id.startsWith('G-') || id.startsWith('G')
}
