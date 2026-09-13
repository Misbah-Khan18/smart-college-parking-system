import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  writeBatch,
  runTransaction,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  deleteDoc
} from 'firebase/firestore'
import { auth, db } from '../firebase/firebase.js'
import { INITIAL_SLOTS } from '../data/initialSlots.js'
import {
  getFloorForVehicleType,
  getSlotPrefixForVehicleType,
  isSlotAllowedForVehicleType
} from '../data/vehicleRules.js'

const SLOTS_COLLECTION = 'parking_slots'
const WRONG_PARKING_COLLECTION = 'wrong_parking_reports'
const LOCAL_SLOTS_KEY = 'parking_slots_state'

/**
 * Natural sort helper for parking slots (e.g. G-01..G-80, B-01..B-80)
 */
export function sortSlots(slotsArray) {
  if (!Array.isArray(slotsArray)) return []
  return [...slotsArray].sort((a, b) => {
    if (a.floor !== b.floor) {
      return a.floor === 'Ground Floor' ? -1 : 1
    }
    const numA = parseInt(a.id.replace(/[^0-9]/g, ''), 10) || 0
    const numB = parseInt(b.id.replace(/[^0-9]/g, ''), 10) || 0
    return numA - numB
  })
}

/**
 * Idempotently seed 160 parking slots in Firestore if collection is empty.
 * Uses slot ID as Firestore Document ID (e.g., 'G-01', 'B-01').
 */
export async function seedParkingSlotsIfEmpty() {
  const currentUser = auth.currentUser
  console.log('[SEED] Checking parking slots seed status...')

  try {
    const slotsRef = collection(db, SLOTS_COLLECTION)
    const snapshot = await getDocs(slotsRef)
    console.log(`[SEED] Existing slot count: ${snapshot.size}`)

    // If slots are already populated in Firestore, do not overwrite
    if (!snapshot.empty && snapshot.size >= 160) {
      console.log(`[SEED] Parking slots already fully seeded (${snapshot.size} slots present).`)
      return { seeded: false, count: snapshot.size }
    }

    console.log(`[SEED] Creating slots: Writing 160 parking slots (G-01..G-80, B-01..B-80)...`)
    const batch = writeBatch(db)

    INITIAL_SLOTS.forEach((slot) => {
      const slotDocRef = doc(db, SLOTS_COLLECTION, slot.id)
      batch.set(slotDocRef, {
        ...slot,
        updatedAt: serverTimestamp()
      }, { merge: true })
    })

    await batch.commit()
    console.log('[SEED] Seed completed successfully (160 slots written to Firestore)')
    return { seeded: true, count: INITIAL_SLOTS.length }
  } catch (err) {
    console.warn('[SEED] Seed notice (may require Admin role):', err.message)
    return { seeded: false, error: err }
  }
}

/**
 * Real-time subscription to all parking slots via Firestore onSnapshot.
 *
 * @param {Function} onUpdate - callback receiving sorted array of 160 slots
 * @param {Function} onError - optional error callback
 * @returns {Function} Unsubscribe function
 */
export function subscribeToSlots(onUpdate, onError) {
  // First hydrate immediately from localStorage cache for instant zero-flicker UI
  try {
    const cached = localStorage.getItem(LOCAL_SLOTS_KEY)
    if (cached) {
      const parsed = JSON.parse(cached)
      if (Array.isArray(parsed) && parsed.length > 0) {
        onUpdate(sortSlots(parsed))
      }
    }
  } catch {
    // ignore cache parsing error
  }

  try {
    const slotsRef = collection(db, SLOTS_COLLECTION)
    const unsubscribe = onSnapshot(
      slotsRef,
      (snapshot) => {
        if (snapshot.empty) {
          console.log('[Firestore] parking_slots snapshot is currently empty.')
          return
        }

        const slots = []
        snapshot.forEach((docSnap) => {
          slots.push({ id: docSnap.id, ...docSnap.data() })
        })

        const sorted = sortSlots(slots)
        try {
          localStorage.setItem(LOCAL_SLOTS_KEY, JSON.stringify(sorted))
        } catch {
          // ignore storage quota error
        }

        onUpdate(sorted)
      },
      (error) => {
        console.error('[Firestore] parking_slots onSnapshot error:', error)
        if (onError) onError(error)
      }
    )

    return unsubscribe
  } catch (err) {
    console.error('[Firestore] Could not establish real-time Firestore listener for slots:', err)
    return () => {}
  }
}

/**
 * Atomically find and allocate the closest available slot for a vehicle on its designated floor.
 * Concurrency-Safe: Uses Firestore runTransaction to guarantee no two users/admins get the same slot.
 *
 * @param {Object} params
 * @returns {Promise<Object>} The allocated slot details
 */
export async function allocateDynamicSlot({
  plate,
  owner,
  rollNumber = '',
  stream = '',
  phoneNumber = '',
  category = 'Student',
  type = 'scooty',
  preferredFloor = null,
  passType = 'Gate Ingress',
  entryTime = null,
  entryTimestamp = null
}) {
  const cleanPlate = (plate || '').toUpperCase().trim()
  const vehicleType = (type || 'scooty').toLowerCase()
  const targetFloor = preferredFloor || getFloorForVehicleType(vehicleType)
  const slotPrefix = getSlotPrefixForVehicleType(vehicleType)
  const nowTimestamp = entryTimestamp || Date.now()
  const nowTime = entryTime || new Date().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  })

  // 1. Generate candidate slot IDs in order (G-01..G-80 for Scooty, B-01..B-80 for Bike)
  const candidateIds = Array.from({ length: 80 }, (_, i) => `${slotPrefix}${String(i + 1).padStart(2, '0')}`)

  // 2. Fetch current slot collection state to identify available candidate slots
  const slotsRef = collection(db, SLOTS_COLLECTION)
  const snapshot = await getDocs(slotsRef)
  const slotsMap = new Map()
  snapshot.forEach((docSnap) => slotsMap.set(docSnap.id, docSnap.data()))

  // Filter available candidate slot IDs on target floor
  const availableCandidates = candidateIds.filter((id) => {
    const data = slotsMap.get(id)
    return !data || data.status === 'available'
  })

  if (availableCandidates.length === 0) {
    const fullMsg = vehicleType === 'scooty'
      ? 'Ground Floor is currently full (all 80 scooty bays occupied).'
      : 'Basement is currently full (all 80 motorcycle bays occupied).'
    const err = new Error(fullMsg)
    err.isFull = true
    err.floor = targetFloor
    throw err
  }

  // 3. Atomically claim the first available candidate using Firestore transaction
  let allocatedResult = null
  let lastError = null

  for (const candidateId of availableCandidates) {
    const slotDocRef = doc(db, SLOTS_COLLECTION, candidateId)
    const candidateData = slotsMap.get(candidateId) || {}

    try {
      await runTransaction(db, async (transaction) => {
        const slotSnap = await transaction.get(slotDocRef)
        if (slotSnap.exists()) {
          const currentData = slotSnap.data()
          if (currentData.status === 'occupied' || currentData.status === 'reserved') {
            throw new Error(`Slot ${candidateId} was taken.`)
          }
        }

        const updateData = {
          id: candidateId,
          status: 'occupied',
          plate: cleanPlate,
          owner: owner || 'Campus Member',
          rollNumber: rollNumber || '',
          stream: stream || '',
          phoneNumber: phoneNumber || '',
          category: category || 'Student',
          type: vehicleType,
          floor: targetFloor,
          section: candidateData.section || `${targetFloor} Parking Area`,
          zone: `${targetFloor} - ${candidateData.section || 'General'}`,
          passType: passType || 'Gate Ingress',
          entryTime: nowTime,
          entryTimestamp: nowTimestamp,
          updatedAt: serverTimestamp()
        }

        transaction.set(slotDocRef, updateData, { merge: true })
        allocatedResult = { slotId: candidateId, ...updateData }
      })

      // Transaction succeeded
      break
    } catch (txErr) {
      lastError = txErr
      console.warn(`[Firestore] Slot ${candidateId} conflict during transaction, trying next available bay...`)
    }
  }

  if (!allocatedResult) {
    const fullMsg = vehicleType === 'scooty'
      ? 'Ground Floor is currently full (all 80 scooty bays occupied).'
      : 'Basement is currently full (all 80 motorcycle bays occupied).'
    throw new Error(lastError?.message || fullMsg)
  }

  return allocatedResult
}

/**
 * Allocate a specific parking slot to a vehicle atomically in Firestore using runTransaction.
 */
export async function allocateSlot({
  slotId,
  plate,
  owner,
  rollNumber = '',
  stream = '',
  phoneNumber = '',
  category = 'Student',
  type = 'scooty',
  passType = 'Hourly Slot',
  reservedUntil = null,
  entryTime = null,
  entryTimestamp = null
}) {
  const cleanPlate = (plate || '').toUpperCase().trim()
  const nowTimestamp = entryTimestamp || Date.now()
  const nowTime = entryTime || new Date().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  })

  const updateData = {
    status: 'occupied',
    plate: cleanPlate,
    owner: owner || 'Campus Member',
    rollNumber: rollNumber || '',
    stream: stream || '',
    phoneNumber: phoneNumber || '',
    category: category || 'Student',
    type: type || 'scooty',
    passType: passType || 'Hourly Slot',
    reservedUntil: reservedUntil || null,
    entryTime: nowTime,
    entryTimestamp: nowTimestamp,
    updatedAt: serverTimestamp()
  }

  const slotDocRef = doc(db, SLOTS_COLLECTION, slotId)

  try {
    await runTransaction(db, async (transaction) => {
      const slotSnap = await transaction.get(slotDocRef)
      if (slotSnap.exists()) {
        const currentData = slotSnap.data()
        // If slot is occupied by a different vehicle, reject
        if (currentData.status === 'occupied' && currentData.plate && currentData.plate !== cleanPlate) {
          throw new Error(`Bay ${slotId} is already occupied by ${currentData.plate}.`)
        }
      }
      transaction.set(slotDocRef, { id: slotId, ...updateData }, { merge: true })
    })
  } catch (txErr) {
    if (txErr.message && txErr.message.includes('already occupied')) {
      throw txErr
    }
    console.warn(`Transaction allocation fallback for slot ${slotId}:`, txErr.message)
    await setDoc(slotDocRef, { id: slotId, ...updateData }, { merge: true })
  }

  return {
    slotId,
    ...updateData
  }
}

/**
 * Reserve a parking slot in Firestore.
 */
export async function reserveSlot({
  slotId,
  plate,
  owner,
  rollNumber = '',
  stream = '',
  phoneNumber = '',
  category = 'Student',
  type = 'scooty',
  passType = 'Hourly Slot',
  reservedUntil = null
}) {
  const cleanPlate = (plate || '').toUpperCase().trim()
  const nowTimestamp = Date.now()
  const nowTime = new Date().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  })

  const updateData = {
    status: 'reserved',
    plate: cleanPlate,
    owner: owner || 'Campus Member',
    rollNumber: rollNumber || '',
    stream: stream || '',
    phoneNumber: phoneNumber || '',
    category: category || 'Student',
    type: type || 'scooty',
    passType: passType || 'Hourly Slot',
    reservedUntil: reservedUntil || null,
    entryTime: nowTime,
    entryTimestamp: nowTimestamp,
    updatedAt: serverTimestamp()
  }

  const slotDocRef = doc(db, SLOTS_COLLECTION, slotId)

  try {
    await runTransaction(db, async (transaction) => {
      const slotSnap = await transaction.get(slotDocRef)
      if (slotSnap.exists()) {
        const currentData = slotSnap.data()
        if (currentData.status === 'occupied') {
          throw new Error(`Bay ${slotId} is currently occupied and cannot be reserved.`)
        }
      }
      transaction.set(slotDocRef, { id: slotId, ...updateData }, { merge: true })
    })
  } catch (txErr) {
    if (txErr.message && txErr.message.includes('cannot be reserved')) {
      throw txErr
    }
    console.warn(`Firestore reserve update failed for slot ${slotId}:`, txErr.message)
    await setDoc(slotDocRef, { id: slotId, ...updateData }, { merge: true })
  }

  return { slotId, ...updateData }
}

/**
 * Release a parking slot in Firestore back to available status.
 */
export async function releaseSlot(slotId) {
  const resetData = {
    status: 'available',
    plate: '',
    owner: '',
    rollNumber: '',
    stream: '',
    phoneNumber: '',
    category: '',
    reservedUntil: null,
    passType: null,
    entryTime: null,
    entryTimestamp: null,
    updatedAt: serverTimestamp()
  }

  const slotDocRef = doc(db, SLOTS_COLLECTION, slotId)

  try {
    await updateDoc(slotDocRef, resetData)
  } catch (err) {
    console.warn(`Firestore release update failed for slot ${slotId}:`, err.message)
    try {
      await setDoc(slotDocRef, { id: slotId, ...resetData }, { merge: true })
    } catch (fallbackErr) {
      console.error('Slot release error:', fallbackErr)
    }
  }

  return { slotId, ...resetData }
}

/**
 * Subscribe to wrong parking violation reports from Firestore
 */
export function subscribeToWrongParkingReports(onUpdate, onError) {
  try {
    const reportsRef = collection(db, WRONG_PARKING_COLLECTION)
    return onSnapshot(
      reportsRef,
      (snapshot) => {
        const reports = []
        snapshot.forEach((d) => reports.push({ id: d.id, ...d.data() }))
        onUpdate(reports)
      },
      (err) => {
        console.warn('Wrong parking reports listener warning:', err.message)
        if (onError) onError(err)
      }
    )
  } catch (err) {
    console.warn('Could not establish wrong parking reports listener:', err.message)
    return () => {}
  }
}

/**
 * Save/issue a wrong parking notice in Firestore
 */
export async function saveWrongParkingNotice(noticeData) {
  try {
    const noticeId = noticeData.id || `VIOL-${noticeData.slotId}-${Date.now()}`
    const docRef = doc(db, WRONG_PARKING_COLLECTION, noticeId)
    await setDoc(docRef, {
      ...noticeData,
      status: 'Notice Issued',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }, { merge: true })
  } catch (err) {
    console.warn('Failed to save wrong parking notice to Firestore:', err.message)
  }
}

/**
 * Resolve/remove a wrong parking report
 */
export async function resolveWrongParkingNotice(noticeId) {
  try {
    const docRef = doc(db, WRONG_PARKING_COLLECTION, noticeId)
    await deleteDoc(docRef)
  } catch (err) {
    console.warn('Failed to delete resolved wrong parking notice:', err.message)
  }
}

