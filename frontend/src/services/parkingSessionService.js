import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore'
import { auth, db } from '../firebase/firebase.js'
import { normalizePlate } from './vehicleService.js'
import { calculateAuthoritativeDuration } from '../utils/timerUtils.js'

const SESSIONS_COLLECTION = 'parking_sessions'
const HISTORY_COLLECTION = 'parking_history'
const SLOTS_COLLECTION = 'parking_slots'

/**
 * Idempotently seed initial parking history into Firestore if collection is empty
 */
export async function seedParkingHistoryIfEmpty() {
  // Production Firestore relies solely on real completed checkout records
  return { seeded: false, count: 0 }
}

/**
 * Create a new active parking session in Firestore
 */
export async function createParkingSession({
  vehicleId = '',
  studentId = '',
  vehicleNumber,
  studentName = '',
  rollNumber = '',
  stream = '',
  phoneNumber = '',
  vehicleType = 'scooty',
  slotId,
  floor,
  category = 'Student',
  passId = '',
  passType = 'Gate Allocated',
  entryTime = null,
  entryTimestamp = null
}) {
  const cleanPlate = normalizePlate(vehicleNumber)
  const sessionId = `SESS-${slotId.replace(/[^a-zA-Z0-9]/g, '')}-${Date.now()}`
  const nowTs = entryTimestamp || Date.now()
  const nowTime = entryTime || new Date().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  })
  const currentUid = auth.currentUser ? auth.currentUser.uid : ''

  const sessionData = {
    id: sessionId,
    vehicleId,
    studentId: studentId || currentUid,
    vehicleNumber: cleanPlate,
    studentName: studentName || 'Campus Member',
    rollNumber: rollNumber || '',
    stream: stream || '',
    phoneNumber: phoneNumber || '',
    vehicleType: (vehicleType || 'scooty').toLowerCase(),
    slotId,
    floor: floor || (slotId.startsWith('G') ? 'Ground Floor' : 'Basement'),
    category: category || 'Student',
    passId: passId || `SOC-${slotId.replace(/[^a-zA-Z0-9]/g, '')}-${Date.now().toString().slice(-4)}`,
    passType: passType || 'Gate Allocated',
    entryTime: nowTime,
    entryTimestamp: nowTs,
    exitTime: null,
    exitTimestamp: null,
    duration: null,
    status: 'active',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  }

  const sessionDocRef = doc(db, SESSIONS_COLLECTION, sessionId)
  await setDoc(sessionDocRef, sessionData)

  return sessionData
}

/**
 * End an active parking session, calculate authoritative duration, mark completed,
 * release the slot back to available, and create a permanent history record in Firestore.
 * 
 * Atomicity: Uses a Firestore writeBatch so all 3 state transitions succeed together
 * or fail together with zero inconsistent state.
 */
export async function endParkingSession({
  slotId = '',
  vehicleNumber = '',
  studentName = '',
  rollNumber = '',
  stream = '',
  vehicleType = '',
  floor = '',
  entryTime = null,
  entryTimestamp = null
}) {
  const cleanPlate = normalizePlate(vehicleNumber)
  const cleanSlotId = (slotId || '').toUpperCase().trim()

  const exitTimestamp = Date.now()
  const exitTime = new Date().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  })
  const exitDate = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })

  // 1. Locate matching active session in Firestore
  let activeSessionDoc = null
  const sessionsRef = collection(db, SESSIONS_COLLECTION)

  if (cleanSlotId) {
    const qSlot = query(
      sessionsRef,
      where('slotId', '==', cleanSlotId),
      where('status', '==', 'active')
    )
    const snapSlot = await getDocs(qSlot)
    if (!snapSlot.empty) {
      activeSessionDoc = snapSlot.docs[0]
    }
  }

  if (!activeSessionDoc && cleanPlate) {
    const cleanComp = cleanPlate.replace(/[^A-Z0-9]/g, '')
    const qPlate = query(
      sessionsRef,
      where('status', '==', 'active')
    )
    const snapPlate = await getDocs(qPlate)
    activeSessionDoc = snapPlate.docs.find((d) => {
      const vNum = (d.data().vehicleNumber || '').replace(/[^A-Z0-9]/g, '').toUpperCase()
      return vNum === cleanComp
    }) || null
  }

  // 2. Fetch slot document to verify status and merge bay details
  const targetSlotId = activeSessionDoc?.data()?.slotId || cleanSlotId
  let slotDocSnap = null
  let slotData = {}

  if (targetSlotId) {
    const slotDocRef = doc(db, SLOTS_COLLECTION, targetSlotId)
    slotDocSnap = await getDoc(slotDocRef)
    if (slotDocSnap.exists()) {
      slotData = slotDocSnap.data()
    }
  }

  const sessionData = activeSessionDoc?.data() || {}

  // 3. Validation: Verify vehicle is actually currently parked
  const isOccupiedInSlot = slotData.status === 'occupied' || slotData.status === 'reserved'
  if (!activeSessionDoc && !isOccupiedInSlot) {
    throw new Error('Vehicle is not currently parked.')
  }

  // 4. Calculate authoritative duration from entryTimestamp to exitTimestamp
  const startTs = Number(sessionData.entryTimestamp) || Number(slotData.entryTimestamp) || Number(entryTimestamp) || (exitTimestamp - 60000)
  const { durationStr } = calculateAuthoritativeDuration(startTs, exitTimestamp)

  // Merge canonical properties
  const finalSlotId = targetSlotId || sessionData.slotId || cleanSlotId || 'G-01'
  const finalPlate = cleanPlate || sessionData.vehicleNumber || slotData.plate || 'UNKNOWN'
  const finalOwner = studentName || sessionData.studentName || slotData.owner || 'Student Member'
  const finalRoll = rollNumber || sessionData.rollNumber || slotData.rollNumber || 'N/A'
  const finalStream = stream || sessionData.stream || slotData.stream || 'Campus Member'
  const finalType = vehicleType || sessionData.vehicleType || slotData.type || (finalSlotId.startsWith('G') ? 'scooty' : 'bike')
  const finalFloor = floor || sessionData.floor || slotData.floor || (finalSlotId.startsWith('G') ? 'Ground Floor' : 'Basement')
  const finalEntryTime = entryTime || sessionData.entryTime || slotData.entryTime || 'Earlier Today'

  // Generate unique history record ID
  const historyId = `HIST-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`
  const historyRecord = {
    id: historyId,
    studentId: sessionData.studentId || (auth.currentUser ? auth.currentUser.uid : ''),
    studentName: finalOwner,
    rollNumber: finalRoll,
    stream: finalStream,
    vehicleNumber: finalPlate,
    vehicleType: finalType,
    slotId: finalSlotId,
    floor: finalFloor,
    entryTime: finalEntryTime,
    entryTimestamp: startTs,
    exitTime,
    exitTimestamp,
    duration: durationStr,
    date: exitDate,
    status: 'Completed',
    fee: '₹0 (Campus Permit)',
    createdAt: serverTimestamp()
  }

  // 5. Atomic Firestore Batch: Commit Session Update + Slot Release + History Insert
  const batch = writeBatch(db)

  // A. Complete active session document (or create completed record if session was untracked)
  if (activeSessionDoc) {
    batch.update(activeSessionDoc.ref, {
      status: 'completed',
      exitTime,
      exitTimestamp,
      duration: durationStr,
      updatedAt: serverTimestamp()
    })
  } else {
    const newSessRef = doc(db, SESSIONS_COLLECTION, `SESS-${finalSlotId.replace(/[^a-zA-Z0-9]/g, '')}-${Date.now()}`)
    batch.set(newSessRef, {
      id: newSessRef.id,
      studentId: sessionData.studentId || (auth.currentUser ? auth.currentUser.uid : ''),
      vehicleNumber: finalPlate,
      studentName: finalOwner,
      rollNumber: finalRoll,
      stream: finalStream,
      vehicleType: finalType,
      slotId: finalSlotId,
      floor: finalFloor,
      entryTime: finalEntryTime,
      entryTimestamp: startTs,
      exitTime,
      exitTimestamp,
      duration: durationStr,
      status: 'completed',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    })
  }

  // B. Release the slot back to available in parking_slots (preserving static metadata)
  if (finalSlotId) {
    const slotDocRef = doc(db, SLOTS_COLLECTION, finalSlotId)
    batch.update(slotDocRef, {
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
    })
  }

  // C. Insert permanent record into parking_history collection
  const historyDocRef = doc(db, HISTORY_COLLECTION, historyId)
  batch.set(historyDocRef, historyRecord)

  // Commit all three operations atomically
  await batch.commit()

  return {
    success: true,
    slotId: finalSlotId,
    vehicleNumber: finalPlate,
    studentName: finalOwner,
    rollNumber: finalRoll,
    floor: finalFloor,
    entryTime: finalEntryTime,
    exitTime,
    duration: durationStr,
    historyRecord
  }
}

/**
 * Subscribe to active parking sessions in real time via Firestore onSnapshot
 * Role-aware: Admins query campus-wide; students query only their own active sessions.
 */
export function subscribeToActiveSessions(onUpdate, onError, filter = {}) {
  try {
    const sessionsRef = collection(db, SESSIONS_COLLECTION)
    let activeQuery = null

    if (filter && filter.isAdmin) {
      activeQuery = query(sessionsRef, where('status', '==', 'active'))
    } else if (filter) {
      if (filter.studentId) {
        activeQuery = query(sessionsRef, where('studentId', '==', filter.studentId), where('status', '==', 'active'))
      } else if (filter.rollNumber) {
        activeQuery = query(sessionsRef, where('rollNumber', '==', filter.rollNumber), where('status', '==', 'active'))
      } else if (filter.vehicleNumber) {
        activeQuery = query(sessionsRef, where('vehicleNumber', '==', filter.vehicleNumber), where('status', '==', 'active'))
      }
    }

    if (!activeQuery) {
      onUpdate([])
      return () => {}
    }

    return onSnapshot(
      activeQuery,
      (snapshot) => {
        const list = []
        snapshot.forEach((d) => list.push({ id: d.id, ...d.data() }))
        onUpdate(list)
      },
      (err) => {
        console.error('[Firestore] subscribeToActiveSessions error:', err)
        if (onError) onError(err)
      }
    )
  } catch (err) {
    console.error('[Firestore] Could not establish active sessions listener:', err)
    return () => {}
  }
}

/**
 * Subscribe to real-time completed parking history from Firestore
 * Role-aware: Admins query full history; students query only their own records.
 */
export function subscribeToParkingHistory(onUpdate, onError, filter = {}) {
  try {
    const historyRef = collection(db, HISTORY_COLLECTION)
    let historyQuery = null

    if (filter && filter.isAdmin) {
      historyQuery = query(historyRef)
    } else if (filter) {
      if (filter.studentId) {
        historyQuery = query(historyRef, where('studentId', '==', filter.studentId))
      } else if (filter.rollNumber) {
        historyQuery = query(historyRef, where('rollNumber', '==', filter.rollNumber))
      } else if (filter.vehicleNumber) {
        historyQuery = query(historyRef, where('vehicleNumber', '==', filter.vehicleNumber))
      }
    }

    if (!historyQuery) {
      onUpdate([])
      return () => {}
    }

    return onSnapshot(
      historyQuery,
      (snapshot) => {
        const list = []
        snapshot.forEach((d) => list.push({ id: d.id, ...d.data() }))

        // Sort by exitTimestamp or entryTimestamp descending
        list.sort((a, b) => {
          const tsA = a.exitTimestamp || a.entryTimestamp || 0
          const tsB = b.exitTimestamp || b.entryTimestamp || 0
          if (tsA !== tsB) return tsB - tsA
          const idA = a.id || ''
          const idB = b.id || ''
          return idB.localeCompare(idA)
        })

        onUpdate(list)
      },
      (err) => {
        console.error('[Firestore] parking_history onSnapshot error:', err)
        if (onError) onError(err)
      }
    )
  } catch (err) {
    console.error('[Firestore] Could not establish real-time listener for parking history:', err)
    return () => {}
  }
}
