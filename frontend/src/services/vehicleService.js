import { INITIAL_REGISTERED_VEHICLES } from '../data/initialSlots.js'
import {
  VEHICLE_FLOOR_RULES,
  VEHICLE_FLOOR_LABELS,
  VEHICLE_TYPES,
  VEHICLE_TYPE_OPTIONS,
  COMMON_STREAMS,
  getFloorForVehicleType
} from '../data/vehicleRules.js'

// Re-export rules so consumers can import from either vehicleService or vehicleRules
export {
  VEHICLE_FLOOR_RULES,
  VEHICLE_FLOOR_LABELS,
  VEHICLE_TYPES,
  VEHICLE_TYPE_OPTIONS,
  COMMON_STREAMS,
  getFloorForVehicleType
}

const STORAGE_KEY = 'registered_vehicles_list'

/**
 * Normalize and clean vehicle license plate number
 * @param {string} plate 
 * @returns {string} Uppercase, single-spaced plate
 */
export function normalizePlate(plate) {
  if (!plate) return ''
  return plate
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Validates an Indian mobile phone number
 * Allows formats: 9876543210, +91 9876543210, +91-9876543210, 09876543210
 * @param {string} phone 
 * @returns {boolean}
 */
export function isValidIndianPhone(phone) {
  if (!phone) return false
  const cleaned = phone.replace(/[\s\-\(\)]/g, '')
  // Match 10 digits starting with 6, 7, 8, 9, or with +91 or 0 prefix
  const regex = /^(?:(?:\+|0{0,2})91(\s*[\-]\s*)?|[0]?)?[6789]\d{9}$/
  return regex.test(cleaned)
}

/**
 * Validate vehicle registration / edit form input
 * @param {Object} data 
 * @param {Array} existingVehicles 
 * @param {string|null} editingId 
 * @returns {{ isValid: boolean, errors: Object }}
 */
export function validateVehicleInput(data, existingVehicles = [], editingId = null) {
  const errors = {}

  // 1. Student Name validation
  if (!data.studentName || !data.studentName.trim()) {
    errors.studentName = 'Student Name is required.'
  } else if (data.studentName.trim().length < 2) {
    errors.studentName = 'Student Name must be at least 2 characters.'
  }

  // 2. Roll Number validation & Uniqueness
  if (!data.rollNumber || !data.rollNumber.trim()) {
    errors.rollNumber = 'Roll Number is required.'
  } else {
    const cleanRoll = data.rollNumber.trim().toUpperCase()
    const duplicateRoll = existingVehicles.find(
      (v) => v.id !== editingId && v.rollNumber && v.rollNumber.toUpperCase() === cleanRoll
    )
    if (duplicateRoll) {
      errors.rollNumber = 'Roll number already registered.'
    }
  }

  // 3. Stream / Class validation
  if (!data.stream || !data.stream.trim()) {
    errors.stream = 'Stream / Class is required.'
  }

  // 4. Phone Number validation
  if (!data.phoneNumber || !data.phoneNumber.trim()) {
    errors.phoneNumber = 'Phone Number is required.'
  } else if (!isValidIndianPhone(data.phoneNumber)) {
    errors.phoneNumber = 'Enter a valid 10-digit Indian phone number (e.g. 9876543210 or +91 9876543210).'
  }

  // 5. Vehicle Number validation & Uniqueness
  if (!data.vehicleNumber || !data.vehicleNumber.trim()) {
    errors.vehicleNumber = 'Vehicle Number is required.'
  } else {
    const cleanPlate = normalizePlate(data.vehicleNumber)
    const cleanPlateComp = cleanPlate.replace(/[^A-Z0-9]/g, '')
    if (cleanPlateComp.length < 4) {
      errors.vehicleNumber = 'Vehicle Number is too short.'
    } else {
      const duplicatePlate = existingVehicles.find((v) => {
        if (v.id === editingId || !v.vehicleNumber) return false
        const existingComp = normalizePlate(v.vehicleNumber).replace(/[^A-Z0-9]/g, '')
        return existingComp === cleanPlateComp
      })
      if (duplicatePlate) {
        errors.vehicleNumber = 'Vehicle number already registered.'
      }
    }
  }

  // 6. Vehicle Type validation
  if (!data.vehicleType) {
    errors.vehicleType = 'Please select a Vehicle Type.'
  } else if (!VEHICLE_FLOOR_RULES[data.vehicleType.toLowerCase()]) {
    errors.vehicleType = 'Invalid vehicle type selected. Choose Scooty or Bike.'
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  }
}

/**
 * Retrieve all registered vehicles from storage, seeded initially from INITIAL_REGISTERED_VEHICLES
 * @returns {Array} List of registered vehicle objects
 */
export function getRegisteredVehicles() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed
      }
    }
  } catch (err) {
    console.error('Error loading registered vehicles from storage:', err)
  }

  // Seed with default data if empty
  const seeded = INITIAL_REGISTERED_VEHICLES.map((v) => ({
    ...v,
    registeredAt: v.registeredAt || new Date().toISOString().split('T')[0],
    preferredFloor: getFloorForVehicleType(v.vehicleType)
  }))

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded))
  } catch (err) {
    console.error('Error seeding initial registered vehicles:', err)
  }

  return seeded
}

/**
 * Save full list of registered vehicles to localStorage
 * @param {Array} vehicles 
 */
function saveVehicles(vehicles) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(vehicles))
  } catch (err) {
    console.error('Error saving registered vehicles:', err)
  }
}

/**
 * Register a new student and their vehicle
 * @param {Object} vehicleData 
 * @returns {Object} Newly registered vehicle record
 */
export function registerVehicle(vehicleData) {
  const currentList = getRegisteredVehicles()
  
  const validation = validateVehicleInput(vehicleData, currentList)
  if (!validation.isValid) {
    const firstError = Object.values(validation.errors)[0]
    const err = new Error(firstError)
    err.validationErrors = validation.errors
    throw err
  }

  const cleanPlate = normalizePlate(vehicleData.vehicleNumber)
  const cleanRoll = vehicleData.rollNumber.trim().toUpperCase()
  const vType = vehicleData.vehicleType.toLowerCase()

  const newRecord = {
    id: `REG-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
    studentName: vehicleData.studentName.trim(),
    rollNumber: cleanRoll,
    stream: vehicleData.stream.trim(),
    phoneNumber: vehicleData.phoneNumber.trim(),
    vehicleNumber: cleanPlate,
    vehicleType: vType,
    preferredFloor: getFloorForVehicleType(vType),
    isEv: Boolean(vehicleData.isEv),
    category: 'Student',
    status: 'Active',
    registeredAt: new Date().toISOString().split('T')[0],
    registeredTimestamp: Date.now()
  }

  const updatedList = [newRecord, ...currentList]
  saveVehicles(updatedList)
  return newRecord
}

/**
 * Update an existing vehicle registration
 * @param {string} id 
 * @param {Object} updatedData 
 * @returns {Object} Updated vehicle record
 */
export function updateVehicle(id, updatedData) {
  const currentList = getRegisteredVehicles()
  const existingIndex = currentList.findIndex((v) => v.id === id)
  
  if (existingIndex === -1) {
    throw new Error('Registration record not found.')
  }

  const validation = validateVehicleInput(updatedData, currentList, id)
  if (!validation.isValid) {
    const firstError = Object.values(validation.errors)[0]
    const err = new Error(firstError)
    err.validationErrors = validation.errors
    throw err
  }

  const cleanPlate = normalizePlate(updatedData.vehicleNumber)
  const cleanRoll = updatedData.rollNumber.trim().toUpperCase()
  const vType = updatedData.vehicleType.toLowerCase()

  const updatedRecord = {
    ...currentList[existingIndex],
    studentName: updatedData.studentName.trim(),
    rollNumber: cleanRoll,
    stream: updatedData.stream.trim(),
    phoneNumber: updatedData.phoneNumber.trim(),
    vehicleNumber: cleanPlate,
    vehicleType: vType,
    preferredFloor: getFloorForVehicleType(vType),
    isEv: updatedData.isEv !== undefined ? Boolean(updatedData.isEv) : currentList[existingIndex].isEv,
    updatedAt: new Date().toISOString().split('T')[0]
  }

  const updatedList = [...currentList]
  updatedList[existingIndex] = updatedRecord
  saveVehicles(updatedList)
  return updatedRecord
}

/**
 * Check if a vehicle is currently occupying an active parking slot
 * @param {string} vehicleNumber 
 * @param {Array} currentSlots 
 * @returns {Object|null} The occupied slot object or null if not parked
 */
export function isVehicleCurrentlyParked(vehicleNumber, currentSlots = []) {
  if (!vehicleNumber || !Array.isArray(currentSlots)) return null
  const cleanTarget = normalizePlate(vehicleNumber).replace(/[^A-Z0-9]/g, '')
  
  return currentSlots.find((s) => {
    if (!s || s.status !== 'occupied' || !s.plate) return false
    const cleanSlotPlate = normalizePlate(s.plate).replace(/[^A-Z0-9]/g, '')
    return cleanSlotPlate === cleanTarget
  }) || null
}

/**
 * Delete a registered vehicle
 * Throws an error if the vehicle is currently parked in a parking bay
 * @param {string} id 
 * @param {Array} currentSlots 
 * @returns {Array} Updated list of registered vehicles
 */
export function deleteVehicle(id, currentSlots = []) {
  const currentList = getRegisteredVehicles()
  const record = currentList.find((v) => v.id === id)

  if (!record) {
    throw new Error('Registration record not found.')
  }

  // Verify whether vehicle is currently occupying a parking slot
  const parkedSlot = isVehicleCurrentlyParked(record.vehicleNumber, currentSlots)
  if (parkedSlot) {
    const error = new Error('This vehicle is currently parked and cannot be removed from registration.')
    error.isParked = true
    error.slotId = parkedSlot.id
    error.floor = parkedSlot.floor
    throw error
  }

  const updatedList = currentList.filter((v) => v.id !== id)
  saveVehicles(updatedList)
  return updatedList
}

/**
 * Search registered vehicles by Student Name, Roll Number, or Vehicle License Plate
 * Suitable for future ANPR / Vehicle Entry module
 * @param {string} query 
 * @returns {Array} Matched vehicle records
 */
export function searchVehicle(query) {
  if (!query || !query.trim()) {
    return getRegisteredVehicles()
  }

  const q = query.toLowerCase().trim()
  const cleanQ = q.replace(/[^a-z0-9]/g, '')
  const list = getRegisteredVehicles()

  return list.filter((v) => {
    const sName = (v.studentName || '').toLowerCase()
    const rNum = (v.rollNumber || '').toLowerCase()
    const vPlate = (v.vehicleNumber || '').toLowerCase()
    const cleanPlate = vPlate.replace(/[^a-z0-9]/g, '')
    const stream = (v.stream || '').toLowerCase()
    const phone = (v.phoneNumber || '').replace(/[^0-9]/g, '')

    return (
      sName.includes(q) ||
      rNum.includes(q) ||
      vPlate.includes(q) ||
      (cleanQ && cleanPlate.includes(cleanQ)) ||
      stream.includes(q) ||
      phone.includes(q)
    )
  })
}
