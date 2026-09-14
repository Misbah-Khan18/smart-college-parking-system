import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore'
import { auth, db } from '../firebase/firebase.js'
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

const VEHICLES_COLLECTION = 'registered_vehicles'

// Module-level in-memory cache to support synchronous reads for immediate UI rendering
let _cachedVehicles = []

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
 * Idempotently seed registered vehicles in Firestore if collection is empty
 */
export async function seedRegisteredVehiclesIfEmpty() {
  console.log('[Firestore] Checking registered_vehicles seed status...')
  try {
    const vehRef = collection(db, VEHICLES_COLLECTION)
    const snapshot = await getDocs(vehRef)

    if (!snapshot.empty && snapshot.size > 0) {
      console.log(`[Firestore] registered_vehicles already seeded (${snapshot.size} vehicles present).`)
      return { seeded: false, count: snapshot.size }
    }

    console.log(`[Firestore] Seeding ${INITIAL_REGISTERED_VEHICLES.length} initial registered vehicles to Firestore...`)
    const batch = writeBatch(db)

    INITIAL_REGISTERED_VEHICLES.forEach((v) => {
      const docRef = doc(db, VEHICLES_COLLECTION, v.id)
      batch.set(docRef, {
        ...v,
        campusId: v.rollNumber,
        preferredFloor: getFloorForVehicleType(v.vehicleType),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }, { merge: true })
    })

    await batch.commit()
    console.log('[Firestore] Registered vehicles seed completed successfully.')
    return { seeded: true, count: INITIAL_REGISTERED_VEHICLES.length }
  } catch (err) {
    console.warn('[Firestore] Seed registered vehicles notice:', err.message)
    return { seeded: false, error: err }
  }
}

/**
 * Real-time subscription to registered vehicles collection via Firestore onSnapshot
 * Role-aware: Admins receive campus-wide list; students query only their own registered vehicle.
 * @param {Function} onUpdate - callback receiving updated array of vehicles
 * @param {Function} onError - optional error callback
 * @param {Object} filter - optional filter { isAdmin, studentId, rollNumber, vehicleNumber }
 * @returns {Function} Unsubscribe function
 */
export function subscribeToRegisteredVehicles(onUpdate, onError, filter = {}) {
  try {
    const vehRef = collection(db, VEHICLES_COLLECTION)
    let vehQuery = null

    if (filter && filter.isAdmin) {
      vehQuery = query(vehRef)
    } else if (filter) {
      if (filter.studentId) {
        vehQuery = query(vehRef, where('studentId', '==', filter.studentId))
      } else if (filter.rollNumber) {
        vehQuery = query(vehRef, where('rollNumber', '==', filter.rollNumber))
      } else if (filter.vehicleNumber) {
        vehQuery = query(vehRef, where('vehicleNumber', '==', filter.vehicleNumber))
      }
    }

    if (!vehQuery) {
      onUpdate([])
      return () => {}
    }

    const unsubscribe = onSnapshot(
      vehQuery,
      (snapshot) => {
        const vehicles = []
        snapshot.forEach((docSnap) => {
          vehicles.push({ id: docSnap.id, ...docSnap.data() })
        })

        // Sort descending by registration date/id
        vehicles.sort((a, b) => {
          const idA = a.id || ''
          const idB = b.id || ''
          return idB.localeCompare(idA)
        })

        _cachedVehicles = vehicles
        onUpdate(vehicles)
      },
      (error) => {
        console.error('[Firestore] subscribeToRegisteredVehicles error:', error)
        if (onError) onError(error)
      }
    )

    return unsubscribe
  } catch (err) {
    console.error('[Firestore] Could not establish registered_vehicles listener:', err)
    return () => {}
  }
}

/**
 * Synchronous getter returning latest cached registered vehicles
 * @returns {Array} List of registered vehicle objects
 */
export function getRegisteredVehicles() {
  return _cachedVehicles
}

/**
 * Asynchronous fetch of all registered vehicles directly from Firestore
 * @returns {Promise<Array>}
 */
export async function getRegisteredVehiclesAsync() {
  try {
    const vehRef = collection(db, VEHICLES_COLLECTION)
    const snapshot = await getDocs(vehRef)
    const list = []
    snapshot.forEach((d) => list.push({ id: d.id, ...d.data() }))
    _cachedVehicles = list
    return list
  } catch (err) {
    console.error('[Firestore] getRegisteredVehiclesAsync error:', err)
    return _cachedVehicles
  }
}

/**
 * Register a new student and their vehicle in Firestore
 * @param {Object} vehicleData 
 * @returns {Promise<Object>} Newly registered vehicle record
 */
export async function registerVehicle(vehicleData) {
  const currentList = _cachedVehicles.length > 0 ? _cachedVehicles : await getRegisteredVehiclesAsync()
  
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
  const docId = `REG-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`

  const newRecord = {
    id: docId,
    studentId: vehicleData.studentId || (auth.currentUser ? auth.currentUser.uid : ''),
    studentName: vehicleData.studentName.trim(),
    rollNumber: cleanRoll,
    campusId: cleanRoll,
    stream: vehicleData.stream.trim(),
    phoneNumber: vehicleData.phoneNumber.trim(),
    vehicleNumber: cleanPlate,
    vehicleType: vType,
    preferredFloor: getFloorForVehicleType(vType),
    isEv: Boolean(vehicleData.isEv),
    category: vehicleData.category || 'Student',
    status: 'Active',
    passId: `SMP-${cleanRoll}-${Date.now().toString().slice(-4)}`,
    registeredAt: new Date().toISOString().split('T')[0],
    registeredTimestamp: Date.now(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  }

  const docRef = doc(db, VEHICLES_COLLECTION, docId)
  await setDoc(docRef, newRecord)

  return newRecord
}

/**
 * Update an existing vehicle registration in Firestore
 * @param {string} id 
 * @param {Object} updatedData 
 * @returns {Promise<Object>} Updated vehicle record
 */
export async function updateVehicle(id, updatedData) {
  const currentList = _cachedVehicles.length > 0 ? _cachedVehicles : await getRegisteredVehiclesAsync()
  const existingRecord = currentList.find((v) => v.id === id)
  
  if (!existingRecord) {
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

  const payload = {
    studentName: updatedData.studentName.trim(),
    rollNumber: cleanRoll,
    campusId: cleanRoll,
    stream: updatedData.stream.trim(),
    phoneNumber: updatedData.phoneNumber.trim(),
    vehicleNumber: cleanPlate,
    vehicleType: vType,
    preferredFloor: getFloorForVehicleType(vType),
    isEv: updatedData.isEv !== undefined ? Boolean(updatedData.isEv) : Boolean(existingRecord.isEv),
    updatedAt: serverTimestamp()
  }

  const docRef = doc(db, VEHICLES_COLLECTION, id)
  await updateDoc(docRef, payload)

  return { ...existingRecord, ...payload, id }
}

/**
 * Delete a registered vehicle from Firestore
 * Throws an error if the vehicle is currently parked in a parking bay
 * @param {string} id 
 * @param {Array} currentSlots 
 * @returns {Promise<boolean>}
 */
export async function deleteVehicle(id, currentSlots = []) {
  const currentList = _cachedVehicles.length > 0 ? _cachedVehicles : await getRegisteredVehiclesAsync()
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

  const docRef = doc(db, VEHICLES_COLLECTION, id)
  await deleteDoc(docRef)
  return true
}

/**
 * Search registered vehicles by Student Name, Roll Number, or Vehicle License Plate
 * @param {string} query 
 * @param {Array} list 
 * @returns {Array} Matched vehicle records
 */
export function searchVehicle(query, list = _cachedVehicles) {
  if (!query || !query.trim()) {
    return list
  }

  const q = query.toLowerCase().trim()
  const cleanQ = q.replace(/[^a-z0-9]/g, '')

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

