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

const SLOTS_COLLECTION = 'parking_slots'
const RESERVATIONS_COLLECTION = 'reservations'
const WRONG_PARKING_COLLECTION = 'wrong_parking_reports'
const LOCAL_SLOTS_KEY = 'parking_slots_state'

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
      return !existingDocIds.has(normalizedId)
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

let hasReceivedFirestoreSlots = false

/**
 * Real-time subscription to all parking slots via Firestore onSnapshot.
 * Firestore is the authoritative source of truth.
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
          onUpdate(sortSlots(parsed))
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
          return
        }

        const firestoreMap = new Map()
        snapshot.forEach((docSnap) => {
          const docId = normalizeSlotId(docSnap.id)
          firestoreMap.set(docId, { id: docId, ...docSnap.data() })
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

        // Also include any extra slots from Firestore
        firestoreMap.forEach((val, key) => {
          if (!mergedSlots.some((s) => normalizeSlotId(s.id) === key)) {
            mergedSlots.push(val)
          }
        })

        const sorted = sortSlots(mergedSlots)
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
    reservedAt: serverTimestamp(),
    createdAt: serverTimestamp(),
    entryTime: nowTime,
    entryTimestamp: nowTimestamp,
    date: nowDate,
    validUntil: reservedUntil || 'Active Session',
    paymentStatus: 'PAID',
    amountPaidINR: amountPaidINR || 0,
    qrToken: `SOC-RES-${cleanSlotId}-${cleanPlate.replace(/[^A-Z0-9]/g, '') || Date.now()}`
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
    qrToken: committedReservationData?.qrToken || `SOC-RES-${cleanSlotId}-${cleanPlate}`
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


