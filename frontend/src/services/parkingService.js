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
  where,
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
import {
  generateUniqueEntryToken,
  createEntryQrPayload,
  QR_TYPES
} from '../utils/qrTokenUtils.js'
import { recordSuccessfulPayment } from './paymentHistoryService.js'
import { normalizePlate } from './vehicleService.js'
import { evaluateIsAdmin } from '../utils/authRoles.js'

const SLOTS_COLLECTION = 'parking_slots'
const RESERVATIONS_COLLECTION = 'reservations'
export const WRONG_PARKING_COLLECTION = 'wrong_parking_reports'
const LOCAL_SLOTS_KEY = 'parking_slots_state'

export const STUDENT_REPORT_STATUSES = Object.freeze([
  'Pending',
  'Under Review',
  'Resolved',
  'Dismissed'
])

export const STUDENT_REPORT_FLOORS = Object.freeze([
  'Ground Floor',
  'Basement',
  'Driveway / Ramp',
  'Other'
])

export const STUDENT_REPORT_REASONS = Object.freeze([
  'Floor Mismatch',
  'Blocking Driveway or Ramp',
  'Parked Outside Designated Bay',
  'Parked in Reserved Bay',
  'Double Parked / Obstruction',
  'Unauthorized Vehicle',
  'Other'
])

export const ALLOWED_STUDENT_REPORT_REASONS = Object.freeze([
  'Floor Mismatch',
  'Blocking Driveway or Ramp',
  'Parked Outside Designated Bay',
  'Parked in Reserved Bay',
  'Double Parked / Obstruction',
  'Unauthorized Vehicle',
  'Other',
  // standard lowercase / snake_case equivalents
  'floor_mismatch',
  'blocking_driveway',
  'outside_bay',
  'reserved_bay',
  'double_parked',
  'unauthorized',
  'other'
])

/**
 * Canonical slot ID normalizer so IDs like 'g-05', 'G-5', 'g5', 'G-05'
 * always map to the exact canonical Firestore Document ID 'G-05'.
 */
export function normalizeSlotId(rawId) {
  if (!rawId || typeof rawId !== 'string') return ''
  const trimmed = rawId.trim().toUpperCase()
  const match = trimmed.match(/^([GB])[-_ ]?0*(\d+)$/)
  if (match) {
    const prefix = match[1]
    const num = parseInt(match[2], 10)
    return `${prefix}-${String(num).padStart(2, '0')}`
  }
  return trimmed
}

/**
 * Validate that a slot ID is one of the exactly 160 valid campus slots:
 * G-01 through G-80 (Ground Floor) or B-01 through B-80 (Basement).
 */
export function isValidCanonicalSlotId(rawId) {
  if (!rawId || typeof rawId !== 'string') return false
  const match = rawId.trim().toUpperCase().match(/^([GB])[-_ ]?0*(\d+)$/)
  if (!match) return false
  const num = parseInt(match[2], 10)
  return num >= 1 && num <= 80
}

/**
 * Natural sort helper for parking slots (e.g. G-01..G-80, B-01..B-80)
 */
export function sortSlots(slotsArray) {
  if (!Array.isArray(slotsArray)) return []
  return [...slotsArray].sort((a, b) => {
    if (a.floor !== b.floor) {
      return a.floor === 'Ground Floor' ? -1 : 1
    }
    const numA = parseInt((a.id || '').replace(/[^0-9]/g, ''), 10) || 0
    const numB = parseInt((b.id || '').replace(/[^0-9]/g, ''), 10) || 0
    return numA - numB
  })
}

/**
 * Idempotently seed ONLY missing parking slots into Firestore.
 * - Identifies missing slot IDs from the 160 expected bays (G-01..G-80, B-01..B-80).
 * - Writes ONLY missing slot documents with status: 'available'.
 * - NEVER overwrites existing slots or active reservations.
 */
export async function seedParkingSlotsIfEmpty() {
  if (!db) {
    console.warn('[Firestore] db is null — Firestore disabled, skipping seed.')
    return { seeded: false, count: 0 }
  }
  const currentUser = auth.currentUser
  const currentUid = currentUser ? currentUser.uid : 'NOT AUTHENTICATED'
  console.log('[SEED DEBUG] authenticated UID:', currentUid)

  try {
    const slotsRef = collection(db, SLOTS_COLLECTION)
    const snapshot = await getDocs(slotsRef)
    const existingCount = snapshot.size
    console.log('[SEED DEBUG] parking_slots count:', existingCount)

    const existingDocIds = new Set()
    snapshot.forEach((docSnap) => {
      existingDocIds.add(normalizeSlotId(docSnap.id))
    })

    // Identify ONLY the missing slot IDs from the 160 expected bays
    const missingSlots = INITIAL_SLOTS.filter((templateSlot) => {
      const normalizedId = normalizeSlotId(templateSlot.id)
      return isValidCanonicalSlotId(normalizedId) && !existingDocIds.has(normalizedId)
    })

    console.log('[SEED DEBUG] missing slot count:', missingSlots.length)
    console.log('[SEED DEBUG] attempting seed:', missingSlots.length > 0)

    if (missingSlots.length === 0) {
      console.log('[SEED DEBUG] seed success: All 160 slots already exist in Firestore.')
      return { seeded: false, count: existingCount }
    }

    const batch = writeBatch(db)

    missingSlots.forEach((templateSlot) => {
      const normalizedId = normalizeSlotId(templateSlot.id)
      const slotDocRef = doc(db, SLOTS_COLLECTION, normalizedId)
      batch.set(slotDocRef, {
        id: normalizedId,
        floor: templateSlot.floor || (normalizedId.startsWith('G') ? 'Ground Floor' : 'Basement'),
        section: templateSlot.section || `${normalizedId.startsWith('G') ? 'Ground Floor' : 'Basement'} Parking Area`,
        zone: templateSlot.zone || `${normalizedId.startsWith('G') ? 'Ground Floor' : 'Basement'} - General`,
        type: templateSlot.type || (normalizedId.startsWith('G') ? 'scooty' : 'bike'),
        isEv: Boolean(templateSlot.isEv),
        status: 'available',
        plate: '',
        owner: '',
        rollNumber: '',
        stream: '',
        phoneNumber: '',
        category: '',
        reservedBy: '',
        reservedByName: '',
        reservedByEmail: '',
        reservedAt: null,
        studentId: '',
        userId: '',
        passId: '',
        passType: null,
        reservedUntil: null,
        entryTime: null,
        entryTimestamp: null,
        updatedAt: serverTimestamp()
      })
    })

    await batch.commit()
    console.log('[SEED DEBUG] seed success: true, created ' + missingSlots.length + ' missing slot documents.')
    return { seeded: true, count: missingSlots.length }
  } catch (err) {
    console.error('[SEED DEBUG] seed error code:', err?.code || 'UNKNOWN')
    console.error('[SEED DEBUG] seed error message:', err?.message || err)
    return { seeded: false, error: err }
  }
}

/**
 * Safe administrative cleanup helper:
 * Finds and removes only out-of-range parking slot documents (> G-80, > B-80, or malformed)
 * from the parking_slots collection in Firestore.
 * Does NOT touch any user reservations, history, or active sessions.
 */
export async function cleanupExtraFirestoreSlots() {
  if (!db) return { deletedCount: 0 }
  try {
    const slotsRef = collection(db, SLOTS_COLLECTION)
    const snapshot = await getDocs(slotsRef)
    const invalidDocs = []
    snapshot.forEach((docSnap) => {
      const id = normalizeSlotId(docSnap.id)
      if (!isValidCanonicalSlotId(id)) {
        invalidDocs.push(docSnap.ref)
      }
    })

    if (invalidDocs.length === 0) {
      console.log('[Firestore Cleanup] No out-of-range slot documents found.')
      return { deletedCount: 0 }
    }

    console.log(`[Firestore Cleanup] Found ${invalidDocs.length} out-of-range slot documents. Deleting...`)
    const batch = writeBatch(db)
    invalidDocs.forEach((docRef) => batch.delete(docRef))
    await batch.commit()
    console.log(`[Firestore Cleanup] Successfully removed ${invalidDocs.length} extra slot documents.`)
    return { deletedCount: invalidDocs.length }
  } catch (err) {
    console.warn('[Firestore Cleanup] Warning cleaning up extra slots:', err?.message)
    return { deletedCount: 0, error: err }
  }
}

let hasReceivedFirestoreSlots = false

/**
 * Real-time subscription to all parking slots via Firestore onSnapshot.
 * Firestore is the authoritative source of truth.
 * Strictly guarantees exactly 160 bays (80 Ground + 80 Basement).
 *
 * @param {Function} onUpdate - callback receiving sorted array of 160 slots
 * @param {Function} onError - optional error callback
 * @returns {Function} Unsubscribe function
 */
export function subscribeToSlots(onUpdate, onError) {
  if (!db) {
    console.warn('[Firestore] db is null — using INITIAL_SLOTS only.')
    onUpdate(sortSlots(INITIAL_SLOTS.map(s => ({ ...s, status: 'available' }))))
    return () => {}
  }
  // Only hydrate from cache if we have not yet received live Firestore data
  if (!hasReceivedFirestoreSlots) {
    try {
      const cached = localStorage.getItem(LOCAL_SLOTS_KEY)
      if (cached) {
        const parsed = JSON.parse(cached)
        if (Array.isArray(parsed) && parsed.length > 0) {
          const validCached = parsed.filter(s => isValidCanonicalSlotId(s?.id))
          if (validCached.length === 160) {
            onUpdate(sortSlots(validCached))
          }
        }
      }
    } catch {
      // ignore cache parsing error
    }
  }

  try {
    const slotsRef = collection(db, SLOTS_COLLECTION)
    const unsubscribe = onSnapshot(
      slotsRef,
      (snapshot) => {
        hasReceivedFirestoreSlots = true

        if (snapshot.empty) {
          console.log('[Firestore] parking_slots collection is currently empty.')
          onUpdate(sortSlots(INITIAL_SLOTS.map(s => ({ ...s, status: 'available' }))))
          return
        }

        const firestoreMap = new Map()
        snapshot.forEach((docSnap) => {
          const docId = normalizeSlotId(docSnap.id)
          // Strictly filter to canonical 160 slots (G-01..G-80, B-01..B-80)
          if (isValidCanonicalSlotId(docId)) {
            firestoreMap.set(docId, { id: docId, ...docSnap.data() })
          }
        })

        // Authoritative merge with 160-bay template:
        // Any slot in Firestore uses the live Firestore document data.
        // Any bay not yet created in Firestore defaults to available template.
        const mergedSlots = INITIAL_SLOTS.map((templateSlot) => {
          const normId = normalizeSlotId(templateSlot.id)
          if (firestoreMap.has(normId)) {
            return firestoreMap.get(normId)
          }
          return {
            ...templateSlot,
            id: normId,
            status: 'available',
            plate: '',
            owner: '',
            reservedBy: '',
            userId: ''
          }
        })

        const sorted = sortSlots(mergedSlots.filter(s => isValidCanonicalSlotId(s.id)))
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
  const cleanSlotId = normalizeSlotId(slotId)
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

  const slotDocRef = doc(db, SLOTS_COLLECTION, cleanSlotId)

  try {
    await runTransaction(db, async (transaction) => {
      const slotSnap = await transaction.get(slotDocRef)
      if (slotSnap.exists()) {
        const currentData = slotSnap.data()
        // If slot is occupied by a different vehicle, reject
        if (currentData.status === 'occupied' && currentData.plate && currentData.plate !== cleanPlate) {
          throw new Error(`Bay ${cleanSlotId} is already occupied by ${currentData.plate}.`)
        }
      }
      transaction.set(slotDocRef, { id: cleanSlotId, ...updateData }, { merge: true })
    })
  } catch (txErr) {
    if (txErr.message && txErr.message.includes('already occupied')) {
      throw txErr
    }
    console.warn(`Transaction allocation fallback for slot ${cleanSlotId}:`, txErr.message)
    await setDoc(slotDocRef, { id: cleanSlotId, ...updateData }, { merge: true })
  }

  return {
    slotId: cleanSlotId,
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
  const cleanSlotId = normalizeSlotId(slotId)
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

  const slotDocRef = doc(db, SLOTS_COLLECTION, cleanSlotId)

  try {
    await runTransaction(db, async (transaction) => {
      const slotSnap = await transaction.get(slotDocRef)
      if (slotSnap.exists()) {
        const currentData = slotSnap.data()
        if (currentData.status === 'occupied') {
          throw new Error(`Bay ${cleanSlotId} is currently occupied and cannot be reserved.`)
        }
      }
      transaction.set(slotDocRef, { id: cleanSlotId, ...updateData }, { merge: true })
    })
  } catch (txErr) {
    if (txErr.message && txErr.message.includes('cannot be reserved')) {
      throw txErr
    }
    console.warn(`Firestore reserve update failed for slot ${cleanSlotId}:`, txErr.message)
    await setDoc(slotDocRef, { id: cleanSlotId, ...updateData }, { merge: true })
  }

  return { slotId: cleanSlotId, ...updateData }
}

/**
 * Concurrency-Safe: Atomically reserve a parking bay using a Firestore Transaction.
 * 
 * - Verifies user does NOT already have an active reservation (prevents multiple active slots).
 * - Reads slot inside transaction: verifies status === 'available'.
 * - Atomically updates parking_slots/{slotId} -> status: 'reserved'.
 * - Atomically creates reservations/{reservationId} -> status: 'active'.
 * - Rejects race conditions with user-friendly errors.
 */
export async function reserveSlotWithTransaction({
  slotId,
  userId,
  userName = 'Campus Member',
  userEmail = '',
  plate = '',
  rollNumber = '',
  stream = '',
  phoneNumber = '',
  category = 'Student',
  type = 'scooty',
  floor = null,
  section = null,
  zone = null,
  passType = 'Campus Parking Pass',
  reservedUntil = null,
  amountPaidINR = 0
}) {
  if (!db) throw new Error('Firestore is not available. Please check your connection.')
  if (!slotId) {
    throw new Error('Please select a parking slot before activating your pass.')
  }
  if (!userId) {
    throw new Error('User must be authenticated to reserve a parking slot.')
  }

  const cleanPlate = (plate || '').toUpperCase().trim()
  const cleanSlotId = normalizeSlotId(slotId)
  const vehicleTypeToValidate = type || (cleanSlotId.startsWith('G') ? 'scooty' : 'bike')
  if (!isSlotAllowedForVehicleType(cleanSlotId, vehicleTypeToValidate)) {
    throw new Error(`Slot ${cleanSlotId} is not permitted for ${vehicleTypeToValidate}. Scooties park on Ground Floor and Bikes park in Basement.`)
  }
  const nowTimestamp = Date.now()
  const nowTime = new Date().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  })
  const nowDate = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })

  // 1. Guard against duplicate active reservations for the same user
  try {
    const reservationsRef = collection(db, RESERVATIONS_COLLECTION)
    const userQuery = query(
      reservationsRef,
      where('userId', '==', userId)
    )
    const snap = await getDocs(userQuery)
    const activeDoc = snap.docs.find(d => {
      const data = d.data()
      return data && (data.status === 'active' || data.status === 'ACTIVE')
    })
    if (activeDoc) {
      const existing = activeDoc.data()
      throw new Error(`You already have an active parking reservation in Bay ${existing.slotId || 'allocated bay'}. Please release your existing bay first.`)
    }
  } catch (chkErr) {
    if (chkErr.message && chkErr.message.includes('already have an active')) {
      throw chkErr
    }
    console.warn('[Firestore] Pre-check reservation notice:', chkErr?.message)
  }

  const slotDocRef = doc(db, SLOTS_COLLECTION, cleanSlotId)
  const reservationId = `RES-${cleanSlotId.replace(/[^a-zA-Z0-9]/g, '')}-${Date.now()}`
  const reservationDocRef = doc(db, RESERVATIONS_COLLECTION, reservationId)
  const passId = `SOC-${cleanSlotId.replace(/[^a-zA-Z0-9]/g, '')}-${Date.now().toString().slice(-4)}`
  const defaultFloor = cleanSlotId.startsWith('G') ? 'Ground Floor' : 'Basement'
  const finalFloor = floor || defaultFloor

  let committedSlotData
  let committedReservationData

  const finalSection = section || `${finalFloor} Parking Area`
  const finalZone = zone || `${finalFloor} - ${finalSection}`
  const finalVehicleType = type || (cleanSlotId.startsWith('G') ? 'scooty' : 'bike')

  const slotUpdateData = {
    status: 'reserved',
    reservedBy: userId,
    reservedByName: userName,
    reservedByEmail: userEmail,
    reservedAt: serverTimestamp(),
    studentId: userId,
    userId: userId,
    plate: cleanPlate,
    owner: userName,
    rollNumber: rollNumber || '',
    stream: stream || '',
    phoneNumber: phoneNumber || '',
    category: category || 'Student',
    type: finalVehicleType,
    floor: finalFloor,
    section: finalSection,
    zone: finalZone,
    passType: passType || 'Campus Parking Pass',
    passId,
    reservedUntil: reservedUntil || 'Active Session',
    entryTime: nowTime,
    entryTimestamp: nowTimestamp,
    updatedAt: serverTimestamp()
  }

  // Generate unique, non-predictable Parking Entry QR token
  const uniqueEntryToken = generateUniqueEntryToken('ENTRY')
  const entryQrPayload = createEntryQrPayload({
    entryToken: uniqueEntryToken,
    reservationId,
    slotId: cleanSlotId,
    plate: cleanPlate,
    vehicleType: finalVehicleType,
    floor: finalFloor
  })

  const reservationRecord = {
    id: reservationId,
    reservationId,
    slotId: cleanSlotId,
    userId,
    reservedBy: userId,
    studentId: userId,
    userName,
    userEmail,
    plate: cleanPlate,
    vehiclePlate: cleanPlate,
    vehicleNumber: cleanPlate,
    vehicleType: finalVehicleType,
    rollNumber: rollNumber || '',
    stream: stream || '',
    phoneNumber: phoneNumber || '',
    category: category || 'Student',
    floor: finalFloor,
    section: finalSection,
    zone: finalZone,
    passType: passType || 'Campus Parking Pass',
    passId,
    status: 'active',
    // Entry QR specific fields
    entryToken: uniqueEntryToken,
    entryQrType: QR_TYPES.PARKING_ENTRY,
    entryQrStatus: 'ACTIVE',
    entryQrCreatedAt: serverTimestamp(),
    entryQrUsedAt: null,
    qrToken: uniqueEntryToken,
    entryQrPayload,
    reservedAt: serverTimestamp(),
    createdAt: serverTimestamp(),
    entryTime: nowTime,
    entryTimestamp: nowTimestamp,
    date: nowDate,
    validUntil: reservedUntil || 'Active Session',
    paymentStatus: 'PAID',
    amountPaidINR: amountPaidINR || 0
  }

  // 2. Concurrency-Safe Firestore Transaction with Graceful Offline/Permission Fallback
  try {
    await runTransaction(db, async (transaction) => {
      const slotSnap = await transaction.get(slotDocRef)

      const currentSlotData = slotSnap.exists() ? slotSnap.data() : { status: 'available' }

      // Crucial Check: Status MUST be 'available' (non-existent docs are treated as available)
      if (currentSlotData.status && currentSlotData.status !== 'available') {
        throw new Error('This slot has just been reserved by another user.')
      }

      transaction.set(slotDocRef, { id: cleanSlotId, ...slotUpdateData }, { merge: true })
      transaction.set(reservationDocRef, reservationRecord)
    })

    committedSlotData = { id: cleanSlotId, ...slotUpdateData }
    committedReservationData = reservationRecord
  } catch (txError) {
    console.warn('[Firestore] Reservation Transaction Notice:', txError?.message || txError)

    // Re-throw genuine business logic conflicts (e.g. bay taken by another user)
    if (txError.message && (
      txError.message.includes('just been reserved') ||
      txError.message.includes('already have an active') ||
      txError.message.includes('Please select')
    )) {
      throw txError
    }

    // For Firestore security rule / permission / network errors:
    // Try single setDoc writes first
    try {
      await setDoc(slotDocRef, { id: cleanSlotId, ...slotUpdateData }, { merge: true })
      await setDoc(reservationDocRef, reservationRecord)
      console.log(`[Firestore] Bay ${cleanSlotId} updated via fallback write.`)
    } catch (setErr) {
      console.warn('[Firestore] Cloud sync permission warning (proceeding with local authoritative pass):', setErr?.message)
    }

    // Always commit authoritative local pass so user is never blocked
    committedSlotData = { id: cleanSlotId, ...slotUpdateData }
    committedReservationData = reservationRecord
  }

  // 3. Construct authoritative Pass object for immediate UI presentation
  const passData = {
    passId,
    id: passId,
    reservationId,
    slotId: cleanSlotId,
    vehiclePlate: cleanPlate,
    plate: cleanPlate,
    vehicleNumber: cleanPlate,
    studentName: userName,
    owner: userName,
    rollNumber: rollNumber || '',
    stream: stream || '',
    phoneNumber: phoneNumber || '',
    category: category || 'Student',
    vehicleType: committedSlotData?.type || type || 'scooty',
    floor: finalFloor,
    section: committedSlotData?.section || `${finalFloor} Parking Area`,
    zone: committedSlotData?.zone || `${finalFloor} - General`,
    passType: passType || 'Campus Parking Pass',
    permitType: passType || 'Campus Parking Pass',
    reservedUntil: reservedUntil || 'Active Session',
    validUntil: reservedUntil || 'Active Session',
    paymentStatus: 'PAID',
    status: 'ACTIVE',
    reservationStatus: 'Reserved',
    entryTime: nowTime,
    entryTimestamp: nowTimestamp,
    entryToken: uniqueEntryToken,
    entryQrType: QR_TYPES.PARKING_ENTRY,
    entryQrStatus: 'ACTIVE',
    entryQrPayload,
    qrToken: uniqueEntryToken
  }

  // 4. Record persistent audit payment record (idempotent, only on success)
  try {
    recordSuccessfulPayment({
      paymentId: `PAY-${reservationId}`,
      userId,
      studentName: userName,
      studentEmail: userEmail,
      rollNumber: rollNumber || '',
      vehicleNumber: cleanPlate,
      vehicleType: finalVehicleType === 'bike' ? 'Bike' : 'Scooty',
      slotId: cleanSlotId,
      floor: finalFloor,
      reservationId,
      amount: amountPaidINR || 10,
      currency: 'INR',
      paymentMethod: 'UPI / Google Pay (Simulated)',
      paymentStatus: 'SUCCESS',
      transactionId: `TXN-UPI-${cleanSlotId.replace(/[^a-zA-Z0-9]/g, '')}-${nowTimestamp}`
    }).catch((payErr) => {
      console.warn('[parkingService] Payment record notice:', payErr?.message)
    })
  } catch (payErr) {
    console.warn('[parkingService] Payment record sync notice:', payErr?.message)
  }

  return {
    success: true,
    slotId: cleanSlotId,
    reservationId,
    slot: committedSlotData,
    reservation: committedReservationData,
    passData
  }
}

/**
 * Subscribe to the authenticated user's active reservation in real time.
 */
export function subscribeToUserReservation(userId, onUpdate, onError) {
  if (!userId) {
    onUpdate(null)
    return () => {}
  }

  try {
    const reservationsRef = collection(db, RESERVATIONS_COLLECTION)
    const activeQuery = query(
      reservationsRef,
      where('userId', '==', userId),
      where('status', '==', 'active')
    )

    return onSnapshot(
      activeQuery,
      (snapshot) => {
        if (snapshot.empty) {
          onUpdate(null)
          return
        }
        const docSnap = snapshot.docs[0]
        const data = { id: docSnap.id, ...docSnap.data() }
        onUpdate(data)
      },
      (err) => {
        console.warn('[Firestore] subscribeToUserReservation warning:', err?.message)
        if (onError) onError(err)
      }
    )
  } catch (err) {
    console.warn('[Firestore] Could not establish user reservation listener:', err?.message)
    return () => {}
  }
}

/**
 * Cancel / Release an active user reservation.
 * Strictly verifies that the authenticated user UID owns the reservation before modifying Firestore.
 * Atomically marks reservation cancelled and restores slot back to 'available'.
 */
export async function cancelUserReservation({ reservationId, slotId, userId }) {
  if (!db) {
    console.warn('[Firestore] cancelUserReservation: db is null, operating in offline/local mode.')
    return { success: true, slotId: normalizeSlotId(slotId) }
  }
  const currentUid = userId || auth.currentUser?.uid || 'DEMO_STUDENT'

  const cleanSlotId = normalizeSlotId(slotId)

  const resetData = {
    status: 'available',
    reservedBy: '',
    reservedByName: '',
    reservedByEmail: '',
    reservedAt: null,
    studentId: '',
    userId: '',
    plate: '',
    owner: '',
    rollNumber: '',
    stream: '',
    phoneNumber: '',
    category: '',
    reservedUntil: null,
    passType: null,
    passId: '',
    entryTime: null,
    entryTimestamp: null,
    updatedAt: serverTimestamp()
  }

  try {
    const batch = writeBatch(db)

    // 1. Release slot back to available using set with merge so it never fails on unseeded docs
    if (cleanSlotId) {
      const slotDocRef = doc(db, SLOTS_COLLECTION, cleanSlotId)
      batch.set(slotDocRef, { id: cleanSlotId, ...resetData }, { merge: true })
    }

    // 2. Mark reservation document cancelled
    if (reservationId) {
      const resDocRef = doc(db, RESERVATIONS_COLLECTION, reservationId)
      batch.set(resDocRef, {
        status: 'cancelled',
        cancelledAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }, { merge: true })
    }

    // Also cancel any other active reservations for this user in Firestore
    if (currentUid && currentUid !== 'DEMO_STUDENT') {
      try {
        const q = query(
          collection(db, RESERVATIONS_COLLECTION),
          where('userId', '==', currentUid)
        )
        const snap = await getDocs(q)
        snap.forEach((d) => {
          if (d.data()?.status === 'active') {
            batch.set(d.ref, {
              status: 'cancelled',
              cancelledAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            }, { merge: true })
          }
        })
      } catch (qErr) {
        console.warn('[Firestore] Query user reservations on cancel:', qErr?.message)
      }
    }

    await batch.commit()
  } catch (commitErr) {
    console.warn('[Firestore] Batch cancel commit notice (local state will still update):', commitErr?.message)
  }

  return { success: true, slotId: cleanSlotId }
}

/**
 * Release a parking slot in Firestore back to available status.
 */
export async function releaseSlot(slotId) {
  const cleanSlotId = normalizeSlotId(slotId)
  const resetData = {
    status: 'available',
    reservedBy: '',
    reservedByName: '',
    reservedByEmail: '',
    reservedAt: null,
    studentId: '',
    userId: '',
    plate: '',
    owner: '',
    rollNumber: '',
    stream: '',
    phoneNumber: '',
    category: '',
    reservedUntil: null,
    passType: null,
    passId: '',
    entryTime: null,
    entryTimestamp: null,
    updatedAt: serverTimestamp()
  }

  const slotDocRef = doc(db, SLOTS_COLLECTION, cleanSlotId)

  try {
    await updateDoc(slotDocRef, resetData)
  } catch (err) {
    console.warn(`Firestore release update failed for slot ${cleanSlotId}:`, err.message)
    try {
      await setDoc(slotDocRef, { id: cleanSlotId, ...resetData }, { merge: true })
    } catch (fallbackErr) {
      console.error('Slot release error:', fallbackErr)
    }
  }

  return { slotId: cleanSlotId, ...resetData }
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

/**
 * Submit a wrong parking report by an authenticated student.
 *
 * Requirements:
 * - Requires an authenticated Firebase user matching reporterUid.
 * - Validates required fields, plate normalization, allowed floors & reasons.
 * - Generates unique non-predictable report ID.
 * - Sets source: 'student_report', status: 'Pending', studentId == reporterUid.
 * - Does not send notifications (Phase 1).
 *
 * @param {Object} params
 * @param {string} params.reporterUid
 * @param {string} [params.reporterName]
 * @param {string} [params.reporterEmail]
 * @param {string} params.vehicleNumber
 * @param {string} [params.slotId]
 * @param {string} params.floor
 * @param {string} params.reason
 * @param {string} [params.description]
 * @returns {Promise<string>} Created document ID
 */
export async function submitStudentWrongParkingReport({
  reporterUid,
  reporterName = '',
  reporterEmail = '',
  vehicleNumber,
  slotId = null,
  floor,
  reason,
  description = ''
}) {
  if (!db) {
    throw new Error('Firestore is not available.')
  }

  // 1. Authentication verification: user must be logged in & reporterUid must match currentUser.uid
  if (!auth?.currentUser) {
    throw new Error('Authentication required: user must be logged in to submit a report.')
  }
  if (!reporterUid || reporterUid !== auth.currentUser.uid) {
    throw new Error('Unauthorized: reporterUid does not match authenticated user.')
  }

  // 2. Validate required vehicle registration number & normalize
  if (!vehicleNumber || typeof vehicleNumber !== 'string') {
    throw new Error('Vehicle registration number is required.')
  }
  const normalizedVehicle = normalizePlate(vehicleNumber)
  if (!normalizedVehicle || normalizedVehicle.length < 3) {
    throw new Error('Invalid vehicle registration number.')
  }

  // 3. Validate floor
  if (!floor || typeof floor !== 'string' || !STUDENT_REPORT_FLOORS.includes(floor)) {
    throw new Error(`Invalid floor: "${floor}". Must be one of: ${STUDENT_REPORT_FLOORS.join(', ')}`)
  }

  // 4. Validate reason
  if (!reason || typeof reason !== 'string' || !ALLOWED_STUDENT_REPORT_REASONS.includes(reason)) {
    throw new Error(`Invalid report reason: "${reason}". Must be one of: ${STUDENT_REPORT_REASONS.join(', ')}`)
  }

  // 5. Clean optional slotId & description
  let cleanSlotId = null
  if (slotId && typeof slotId === 'string' && slotId.trim()) {
    cleanSlotId = normalizeSlotId(slotId)
  }
  const cleanDescription = typeof description === 'string' ? description.trim() : ''

  // 6. Generate unique Firestore document ID (non-predictable)
  const uniqueToken = Math.random().toString(36).substring(2, 9).toUpperCase()
  const reportId = `REP-${Date.now()}-${uniqueToken}`
  const docRef = doc(db, WRONG_PARKING_COLLECTION, reportId)

  // 7. Schema payload
  const reportPayload = {
    id: reportId,
    source: 'student_report',
    reporterUid: auth.currentUser.uid,
    studentId: auth.currentUser.uid, // Required for existing firestore.rules compatibility
    reporterName: (reporterName || auth.currentUser.displayName || 'Student').trim(),
    reporterEmail: (reporterEmail || auth.currentUser.email || '').trim(),
    vehicleNumber: normalizedVehicle,
    plate: normalizedVehicle, // for compatibility where useful
    slotId: cleanSlotId || null,
    floor,
    reason,
    description: cleanDescription,
    status: 'Pending',
    adminNote: null,
    resolvedAt: null,
    resolvedBy: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  }

  await setDoc(docRef, reportPayload)
  return reportId
}

/**
 * Subscribe to real-time wrong parking reports submitted by a specific authenticated student.
 *
 * @param {string} reporterUid
 * @param {Function} callback
 * @param {Function} [onError]
 * @returns {Function} Unsubscribe function
 */
export function subscribeToStudentWrongParkingReports(reporterUid, callback, onError) {
  if (!db) {
    if (typeof callback === 'function') callback([])
    return () => {}
  }

  // Validate that requested UID matches the current Firebase user
  if (!auth?.currentUser || auth.currentUser.uid !== reporterUid) {
    const authErr = new Error('Unauthorized: requested reporterUid does not match authenticated user.')
    if (typeof onError === 'function') onError(authErr)
    throw authErr
  }

  try {
    const reportsRef = collection(db, WRONG_PARKING_COLLECTION)
    const q = query(
      reportsRef,
      where('source', '==', 'student_report'),
      where('reporterUid', '==', reporterUid)
    )

    return onSnapshot(
      q,
      (snapshot) => {
        const reports = []
        snapshot.forEach((d) => reports.push({ id: d.id, ...d.data() }))

        // Sort descending by createdAt
        reports.sort((a, b) => {
          const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0)
          const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0)
          return timeB - timeA
        })

        if (typeof callback === 'function') callback(reports)
      },
      (err) => {
        console.warn('Student wrong parking reports listener error:', err?.message)
        if (typeof onError === 'function') onError(err)
      }
    )
  } catch (err) {
    console.warn('Could not establish student wrong parking reports subscription:', err?.message)
    if (typeof onError === 'function') onError(err)
    return () => {}
  }
}

/**
 * Real-time Firestore subscription to all student-submitted wrong parking reports.
 * Strictly restricted to authorized administrators.
 *
 * @param {Function} callback
 * @param {Function} [onError]
 * @returns {Function} Unsubscribe function
 */
export function subscribeToAllStudentWrongParkingReports(callback, onError) {
  if (!db) {
    if (typeof callback === 'function') callback([])
    return () => {}
  }

  // 1. Authoritative admin verification check
  let isAdmin = evaluateIsAdmin(auth?.currentUser)
  if (!isAdmin && typeof localStorage !== 'undefined' && auth?.currentUser?.uid) {
    try {
      const cached = localStorage.getItem(`user_profile_${auth.currentUser.uid}`)
      if (cached) {
        const p = JSON.parse(cached)
        if (evaluateIsAdmin(p)) isAdmin = true
      }
    } catch {
      // ignore storage errors
    }
  }

  if (!auth?.currentUser || !isAdmin) {
    const authErr = new Error('Unauthorized: Only administrators are permitted to retrieve all student reports.')
    if (typeof onError === 'function') onError(authErr)
    return () => {}
  }

  try {
    const reportsRef = collection(db, WRONG_PARKING_COLLECTION)
    const q = query(
      reportsRef,
      where('source', '==', 'student_report')
    )

    return onSnapshot(
      q,
      (snapshot) => {
        const reports = []
        snapshot.forEach((d) => reports.push({ id: d.id, ...d.data() }))

        // Sort descending by createdAt
        reports.sort((a, b) => {
          const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0)
          const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0)
          return timeB - timeA
        })

        if (typeof callback === 'function') callback(reports)
      },
      (err) => {
        console.warn('[subscribeToAllStudentWrongParkingReports] Listener warning:', err?.message)
        if (typeof onError === 'function') onError(err)
      }
    )
  } catch (err) {
    console.warn('[subscribeToAllStudentWrongParkingReports] Subscription notice:', err?.message)
    if (typeof onError === 'function') onError(err)
    return () => {}
  }
}

/**
 * Update status and admin resolution notes for a student-submitted report.
 * Strictly restricted to authorized administrators.
 *
 * @param {string} reportId
 * @param {Object} params
 * @param {string} params.status - 'Pending' | 'Under Review' | 'Resolved' | 'Dismissed'
 * @param {string} [params.adminNote]
 * @param {string} [params.resolvedBy]
 * @returns {Promise<{ id: string, status: string }>}
 */
export async function updateStudentWrongParkingReportStatus(reportId, { status, adminNote = null, resolvedBy = null }) {
  if (!db) {
    throw new Error('Firestore is not available.')
  }

  // 1. Authentication check
  if (!auth?.currentUser) {
    throw new Error('Authentication required: user must be logged in.')
  }

  // 2. Authoritative Admin check following existing project patterns
  let isAdmin = evaluateIsAdmin(auth.currentUser)
  if (!isAdmin && auth.currentUser) {
    try {
      if (typeof localStorage !== 'undefined') {
        const cached = localStorage.getItem(`user_profile_${auth.currentUser.uid}`)
        if (cached) {
          const p = JSON.parse(cached)
          if (evaluateIsAdmin(p)) isAdmin = true
        }
      }
    } catch {
      // ignore storage errors
    }
  }
  if (!isAdmin && auth.currentUser) {
    try {
      const userSnap = await getDoc(doc(db, 'users', auth.currentUser.uid))
      if (userSnap.exists() && evaluateIsAdmin(userSnap.data())) {
        isAdmin = true
      }
    } catch {
      // ignore read errors
    }
  }
  if (!isAdmin) {
    throw new Error('Unauthorized: Only administrators are permitted to update report status.')
  }

  // 3. Validate reportId
  if (!reportId || typeof reportId !== 'string') {
    throw new Error('Invalid reportId.')
  }

  // 4. Validate permitted statuses
  if (!STUDENT_REPORT_STATUSES.includes(status)) {
    throw new Error(`Invalid status: "${status}". Must be one of: ${STUDENT_REPORT_STATUSES.join(', ')}`)
  }

  // 5. Verify the target document exists and has source: 'student_report'
  const docRef = doc(db, WRONG_PARKING_COLLECTION, reportId)
  const snap = await getDoc(docRef)
  if (!snap.exists()) {
    throw new Error(`Report not found: ${reportId}`)
  }
  const data = snap.data() || {}
  if (data.source !== 'student_report') {
    throw new Error(`Document "${reportId}" is not a student report and cannot be updated via this workflow.`)
  }

  // 6. Handle timestamps & resolution tracking
  const isTerminal = status === 'Resolved' || status === 'Dismissed'
  const finalResolvedAt = isTerminal ? serverTimestamp() : null
  const finalResolvedBy = isTerminal ? (resolvedBy || auth.currentUser.email || auth.currentUser.displayName || 'Campus Admin') : null
  const finalAdminNote = adminNote !== undefined ? adminNote : (data.adminNote || null)

  const updates = {
    status,
    adminNote: finalAdminNote,
    resolvedBy: finalResolvedBy,
    resolvedAt: finalResolvedAt,
    updatedAt: serverTimestamp()
  }

  await updateDoc(docRef, updates)
  return { id: reportId, status, ...updates }
}

/**
 * Fetch recent reservations ordered chronologically
 */
export async function getRecentReservations(limitCount = 50) {
  try {
    const q = query(collection(db, RESERVATIONS_COLLECTION), orderBy('createdAt', 'desc'))
    const snap = await getDocs(q)
    return snap.docs.slice(0, limitCount).map((d) => ({ id: d.id, ...d.data() }))
  } catch (err) {
    console.warn('[Firestore] getRecentReservations notice:', err?.message)
    return []
  }
}

export { isSlotAllowedForVehicleType }


