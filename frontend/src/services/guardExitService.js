import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  runTransaction,
  serverTimestamp
} from 'firebase/firestore'
import { auth, db } from '../firebase/firebase.js'
import { normalizePlate } from './vehicleService.js'
import { normalizeSlotId } from './parkingService.js'
import { calculateAuthoritativeDuration } from '../utils/timerUtils.js'
import { verifyGuardAuthorization } from './guardGateService.js'

const USERS_COLLECTION = 'users'
const SLOTS_COLLECTION = 'parking_slots'
const RESERVATIONS_COLLECTION = 'reservations'
const SESSIONS_COLLECTION = 'parking_sessions'
const HISTORY_COLLECTION = 'parking_history'
const WRONG_PARKING_COLLECTION = 'wrong_parking_reports'

/**
 * Standard Reason Codes for Guard Egress / Exit Operations
 */
export const EXIT_REASON_CODES = {
  EXIT_APPROVED: 'EXIT_APPROVED',
  UNAUTHORIZED_GUARD: 'UNAUTHORIZED_GUARD',
  SESSION_NOT_FOUND: 'SESSION_NOT_FOUND',
  SESSION_ALREADY_COMPLETED: 'SESSION_ALREADY_COMPLETED',
  PLATE_MISMATCH: 'PLATE_MISMATCH',
  SLOT_NOT_FOUND: 'SLOT_NOT_FOUND',
  SLOT_NOT_OCCUPIED: 'SLOT_NOT_OCCUPIED',
  INVALID_EXIT_STATE: 'INVALID_EXIT_STATE',
  TRANSACTION_FAILED: 'TRANSACTION_FAILED'
}

/**
 * Find an active parking session by QR token, passId, reservationId, sessionId, plate, or slotId.
 *
 * @param {Object} params
 * @param {string} [params.qrToken]
 * @param {string} [params.scannedPlate]
 * @param {string} [params.slotId]
 * @param {string} [params.sessionId]
 * @returns {Promise<{ sessionDoc: any|null, status?: string }>}
 */
export async function lookupActiveParkingSession({
  qrToken = '',
  scannedPlate = '',
  slotId = '',
  sessionId = ''
}) {
  const sessionsRef = collection(db, SESSIONS_COLLECTION)
  const cleanSlotId = normalizeSlotId(slotId)
  const cleanPlate = normalizePlate(scannedPlate)
  const cleanComp = cleanPlate.replace(/[^A-Z0-9]/g, '')
  let tokenSearch = (qrToken || '').trim()

  if (tokenSearch.includes('?') || tokenSearch.startsWith('http://') || tokenSearch.startsWith('https://')) {
    try {
      const urlObj = new URL(tokenSearch.startsWith('http') ? tokenSearch : `http://dummy.com/${tokenSearch}`)
      tokenSearch = urlObj.searchParams.get('token') ||
        urlObj.searchParams.get('passId') ||
        urlObj.searchParams.get('reservationId') ||
        tokenSearch
    } catch {
      // ignore url error
    }
  }

  // 1. Direct session ID lookup
  if (sessionId || (tokenSearch && tokenSearch.startsWith('SESS-'))) {
    const targetSessId = sessionId || tokenSearch
    try {
      const sessDocRef = doc(db, SESSIONS_COLLECTION, targetSessId)
      const sessSnap = await getDoc(sessDocRef)
      if (sessSnap.exists()) {
        const sData = sessSnap.data()
        return {
          sessionDoc: sessSnap,
          status: sData.status
        }
      }
    } catch {
      // ignore
    }
  }

  // 2. Fetch all active sessions
  const qActive = query(sessionsRef, where('status', '==', 'active'))
  const snapActive = await getDocs(qActive)

  if (!snapActive.empty) {
    // Match by slotId
    if (cleanSlotId) {
      const match = snapActive.docs.find((d) => normalizeSlotId(d.data().slotId) === cleanSlotId)
      if (match) return { sessionDoc: match, status: 'active' }
    }

    // Match by plate
    if (cleanComp) {
      const match = snapActive.docs.find((d) => {
        const p = (d.data().vehicleNumber || d.data().plate || '').replace(/[^A-Z0-9]/g, '').toUpperCase()
        return p === cleanComp
      })
      if (match) return { sessionDoc: match, status: 'active' }
    }

    // Match by QR / passId / reservationId token
    if (tokenSearch) {
      const match = snapActive.docs.find((d) => {
        const dData = d.data()
        return (
          dData.id === tokenSearch ||
          dData.reservationId === tokenSearch ||
          dData.passId === tokenSearch ||
          (dData.vehicleNumber && normalizePlate(dData.vehicleNumber).replace(/[^A-Z0-9]/g, '') === tokenSearch.replace(/[^A-Z0-9]/g, ''))
        )
      })
      if (match) return { sessionDoc: match, status: 'active' }
    }
  }

  // 3. Fallback: If no active session found, check if a completed session exists to provide clear error reason
  const qAll = query(sessionsRef)
  const snapAll = await getDocs(qAll)
  const completedMatch = snapAll.docs.find((d) => {
    const dData = d.data()
    if (dData.status !== 'completed') return false
    if (cleanSlotId && normalizeSlotId(dData.slotId) === cleanSlotId) return true
    if (cleanComp && (dData.vehicleNumber || '').replace(/[^A-Z0-9]/g, '').toUpperCase() === cleanComp) return true
    if (tokenSearch && (dData.id === tokenSearch || dData.reservationId === tokenSearch || dData.passId === tokenSearch)) return true
    return false
  })

  if (completedMatch) {
    return { sessionDoc: completedMatch, status: 'completed' }
  }

  return { sessionDoc: null }
}

/**
 * Authoritative Firestore Guard Egress / Exit Service.
 *
 * Verifies that the guard is authorized, locates the active parking session,
 * re-checks slot occupancy and vehicle match inside an atomic transaction,
 * and atomically transitions:
 * 1. parking_slots: 'occupied' -> 'available'
 * 2. parking_sessions: 'active' -> 'completed' (with duration & runtime timestamp)
 * 3. reservations: 'in_use' -> 'completed' (if reservation linked)
 * 4. parking_history: creates completed history log
 *
 * @param {Object} params
 * @param {string} [params.qrToken] - QR token, passId, or reservationId
 * @param {string} [params.scannedPlate] - Scanned or entered license plate
 * @param {string} [params.slotId] - Specific slot ID (e.g. 'G-01')
 * @param {string} [params.sessionId] - Active session ID
 * @param {string} [params.guardUid] - Authenticated Firebase UID of guard
 * @returns {Promise<{ approved: boolean, reason: string, message?: string, slotId?: string, vehicleNumber?: string, studentName?: string, rollNumber?: string, floor?: string, section?: string, zone?: string, vehicleType?: string, entryTime?: string, exitTime?: string, duration?: string, sessionId?: string, reservationId?: string, historyRecord?: any }>}
 */
export async function verifyAndCompleteGateExit({
  qrToken = '',
  scannedPlate = '',
  slotId = '',
  sessionId = '',
  guardUid = ''
}) {
  // =========================================================
  // STEP 1 — AUTHORIZATION CHECK
  // =========================================================
  const authCheck = await verifyGuardAuthorization(guardUid)
  if (!authCheck.authorized) {
    return {
      approved: false,
      reason: authCheck.errorReason || EXIT_REASON_CODES.UNAUTHORIZED_GUARD,
      message: authCheck.message || 'Unauthorized Guard: Only Admin and Security Admin roles can authorize gate exit.'
    }
  }

  const activeGuardUid = guardUid || auth.currentUser?.uid || ''

  // =========================================================
  // STEP 2 — LOCATE ACTIVE PARKING SESSION & ASSOCIATED SLOT
  // =========================================================
  const cleanSlotId = normalizeSlotId(slotId)
  const cleanScannedPlate = normalizePlate(scannedPlate)
  const rawToken = (qrToken || '').trim()

  if (!cleanSlotId && !cleanScannedPlate && !rawToken && !sessionId) {
    return {
      approved: false,
      reason: EXIT_REASON_CODES.INVALID_EXIT_STATE,
      message: 'Please provide a parking slot, license plate, or pass token to process exit.'
    }
  }

  const lookupResult = await lookupActiveParkingSession({
    qrToken: rawToken,
    scannedPlate: cleanScannedPlate,
    slotId: cleanSlotId,
    sessionId
  })

  // If found as already completed
  if (lookupResult.status === 'completed') {
    return {
      approved: false,
      reason: EXIT_REASON_CODES.SESSION_ALREADY_COMPLETED,
      message: 'This parking session has already been completed and checked out.'
    }
  }

  let activeSessionDoc = lookupResult.sessionDoc

  // If no session document found in parking_sessions, check if slot document in parking_slots is occupied
  let fallbackSlotData = null
  let targetSlotId = activeSessionDoc ? normalizeSlotId(activeSessionDoc.data().slotId) : cleanSlotId

  if (targetSlotId) {
    try {
      const slotSnap = await getDoc(doc(db, SLOTS_COLLECTION, targetSlotId))
      if (slotSnap.exists()) {
        fallbackSlotData = slotSnap.data()
      }
    } catch (err) {
      console.warn('[guardExitService] Slot lookup error:', err)
    }
  }

  if (!activeSessionDoc && (!fallbackSlotData || fallbackSlotData.status !== 'occupied')) {
    return {
      approved: false,
      reason: EXIT_REASON_CODES.SESSION_NOT_FOUND,
      message: `No active parking session found for ${cleanSlotId || cleanScannedPlate || rawToken || 'this vehicle'}. Vehicle is not currently parked.`
    }
  }

  const sessionInitialData = activeSessionDoc ? activeSessionDoc.data() : {}
  const targetPlate = normalizePlate(
    sessionInitialData.vehicleNumber || fallbackSlotData?.plate || cleanScannedPlate
  )

  // Validate Plate Match if plate camera/input was supplied
  if (cleanScannedPlate) {
    const cleanScannedComp = cleanScannedPlate.replace(/[^A-Z0-9]/g, '')
    const cleanSessionComp = targetPlate.replace(/[^A-Z0-9]/g, '')
    if (cleanScannedComp && cleanSessionComp && cleanScannedComp !== cleanSessionComp) {
      return {
        approved: false,
        reason: EXIT_REASON_CODES.PLATE_MISMATCH,
        message: `License plate mismatch: Active session is for ${targetPlate}, but exit sensor scanned ${cleanScannedPlate}.`
      }
    }
  }

  // =========================================================
  // STEP 3 — ATOMIC FIRESTORE EXIT TRANSACTION
  // =========================================================
  const finalSlotId = targetSlotId || normalizeSlotId(sessionInitialData.slotId)
  if (!finalSlotId) {
    return {
      approved: false,
      reason: EXIT_REASON_CODES.SLOT_NOT_FOUND,
      message: 'Could not determine parking slot ID for this session.'
    }
  }

  const slotDocRef = doc(db, SLOTS_COLLECTION, finalSlotId)
  const sessionDocRef = activeSessionDoc
    ? activeSessionDoc.ref
    : doc(db, SESSIONS_COLLECTION, `SESS-${finalSlotId.replace(/[^a-zA-Z0-9]/g, '')}-${Date.now()}`)

  const targetReservationId = sessionInitialData.reservationId || fallbackSlotData?.reservationId || fallbackSlotData?.passId || ''
  let resDocRef = null
  if (targetReservationId && targetReservationId.startsWith('RES-')) {
    resDocRef = doc(db, RESERVATIONS_COLLECTION, targetReservationId)
  }

  const exitTimestamp = Date.now()
  const exitTimeStr = new Date().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  })
  const exitDateStr = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })
  const historyId = `HIST-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`
  const historyDocRef = doc(db, HISTORY_COLLECTION, historyId)

  let transactionSummary = null

  try {
    await runTransaction(db, async (transaction) => {
      // 1. Re-read Slot
      const transSlotSnap = await transaction.get(slotDocRef)
      if (!transSlotSnap.exists()) {
        throw new Error(EXIT_REASON_CODES.SLOT_NOT_FOUND)
      }
      const currentSlotData = transSlotSnap.data()
      if (currentSlotData.status !== 'occupied') {
        throw new Error(EXIT_REASON_CODES.SLOT_NOT_OCCUPIED)
      }

      // 2. Re-read Session (if existed)
      let currentSessionData = {}
      if (activeSessionDoc) {
        const transSessSnap = await transaction.get(sessionDocRef)
        if (!transSessSnap.exists()) {
          throw new Error(EXIT_REASON_CODES.SESSION_NOT_FOUND)
        }
        currentSessionData = transSessSnap.data()
        if (currentSessionData.status !== 'active') {
          throw new Error(EXIT_REASON_CODES.SESSION_ALREADY_COMPLETED)
        }
      }

      // 3. Re-read Reservation (if linked)
      let currentResData = null
      if (resDocRef) {
        try {
          const transResSnap = await transaction.get(resDocRef)
          if (transResSnap.exists()) {
            currentResData = transResSnap.data()
          }
        } catch {
          // non-blocking
        }
      }

      // 4. Authoritative Duration Calculation
      const startTimestamp = Number(currentSessionData.entryTimestamp) ||
        Number(currentSlotData.entryTimestamp) ||
        (exitTimestamp - 60000)
      const { durationStr } = calculateAuthoritativeDuration(startTimestamp, exitTimestamp)

      const finalPlateStr = normalizePlate(
        currentSessionData.vehicleNumber || currentSlotData.plate || targetPlate
      )
      const finalOwnerStr = currentSessionData.studentName || currentSlotData.owner || 'Student Member'
      const finalRollStr = currentSessionData.rollNumber || currentSlotData.rollNumber || ''
      const finalStreamStr = currentSessionData.stream || currentSlotData.stream || ''
      const finalTypeStr = currentSessionData.vehicleType || currentSlotData.type || (finalSlotId.startsWith('G') ? 'scooty' : 'bike')
      const finalFloorStr = currentSessionData.floor || currentSlotData.floor || (finalSlotId.startsWith('G') ? 'Ground Floor' : 'Basement')
      const finalSectionStr = currentSessionData.section || currentSlotData.section || `${finalFloorStr} Parking Area`
      const finalZoneStr = currentSessionData.zone || currentSlotData.zone || `${finalFloorStr} - General`
      const finalEntryTimeStr = currentSessionData.entryTime || currentSlotData.entryTime || 'Earlier Today'

      // 5. Update parking_slots: 'occupied' -> 'available'
      transaction.update(slotDocRef, {
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
        gateEnteredAt: null,
        gateExitedAt: serverTimestamp(),
        exitGuardUid: activeGuardUid,
        updatedAt: serverTimestamp()
      })

      // 6. Complete Session
      if (activeSessionDoc) {
        transaction.update(sessionDocRef, {
          status: 'completed',
          exitTime: exitTimeStr,
          exitTimestamp: exitTimestamp,
          duration: durationStr,
          gateExitedAt: serverTimestamp(),
          exitGuardUid: activeGuardUid,
          updatedAt: serverTimestamp()
        })
      } else {
        transaction.set(sessionDocRef, {
          id: sessionDocRef.id,
          reservationId: targetReservationId,
          studentId: currentSlotData.userId || currentSlotData.studentId || '',
          vehicleNumber: finalPlateStr,
          studentName: finalOwnerStr,
          rollNumber: finalRollStr,
          stream: finalStreamStr,
          vehicleType: finalTypeStr,
          slotId: finalSlotId,
          floor: finalFloorStr,
          entryTime: finalEntryTimeStr,
          entryTimestamp: startTimestamp,
          exitTime: exitTimeStr,
          exitTimestamp: exitTimestamp,
          duration: durationStr,
          status: 'completed',
          guardUid: activeGuardUid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        })
      }

      // 7. Complete Reservation (if linked)
      if (resDocRef && currentResData) {
        transaction.update(resDocRef, {
          status: 'completed',
          exitTime: exitTimeStr,
          exitTimestamp: exitTimestamp,
          duration: durationStr,
          gateExitedAt: serverTimestamp(),
          exitGuardUid: activeGuardUid,
          updatedAt: serverTimestamp()
        })
      }

      // 8. Create parking_history document
      const historyRecord = {
        id: historyId,
        historyId: historyId,
        sessionId: sessionDocRef.id,
        reservationId: targetReservationId || (currentResData ? currentResData.id : ''),
        studentId: currentSessionData.studentId || currentSlotData.userId || currentSlotData.studentId || '',
        studentName: finalOwnerStr,
        rollNumber: finalRollStr,
        stream: finalStreamStr,
        phoneNumber: currentSessionData.phoneNumber || currentSlotData.phoneNumber || '',
        vehicleId: currentSessionData.vehicleId || '',
        vehicleNumber: finalPlateStr,
        vehicleType: finalTypeStr,
        slotId: finalSlotId,
        floor: finalFloorStr,
        section: finalSectionStr,
        zone: finalZoneStr,
        category: currentSessionData.category || currentSlotData.category || 'Student',
        passId: currentSessionData.passId || currentSlotData.passId || '',
        passType: currentSessionData.passType || currentSlotData.passType || 'Campus Parking Pass',
        entryTime: finalEntryTimeStr,
        entryTimestamp: startTimestamp,
        exitTime: exitTimeStr,
        exitTimestamp: exitTimestamp,
        duration: durationStr,
        date: exitDateStr,
        status: 'Completed',
        fee: '₹0 (Campus Permit)',
        guardUid: activeGuardUid,
        createdAt: serverTimestamp()
      }
      transaction.set(historyDocRef, historyRecord)

      transactionSummary = {
        slotId: finalSlotId,
        vehicleNumber: finalPlateStr,
        studentName: finalOwnerStr,
        rollNumber: finalRollStr,
        floor: finalFloorStr,
        section: finalSectionStr,
        zone: finalZoneStr,
        vehicleType: finalTypeStr,
        entryTime: finalEntryTimeStr,
        exitTime: exitTimeStr,
        duration: durationStr,
        sessionId: sessionDocRef.id,
        reservationId: targetReservationId,
        historyRecord
      }
    })
  } catch (txErr) {
    console.error('[guardExitService] Gate Exit Transaction Error:', txErr)
    const errCode = txErr.message

    if (Object.values(EXIT_REASON_CODES).includes(errCode)) {
      let msg = 'Gate exit transaction failed validation.'
      if (errCode === EXIT_REASON_CODES.SESSION_ALREADY_COMPLETED) {
        msg = 'Parking session has already been completed.'
      } else if (errCode === EXIT_REASON_CODES.SLOT_NOT_OCCUPIED) {
        msg = `Bay ${finalSlotId} is not in occupied status.`
      } else if (errCode === EXIT_REASON_CODES.SESSION_NOT_FOUND) {
        msg = 'Active parking session not found in Firestore.'
      } else if (errCode === EXIT_REASON_CODES.SLOT_NOT_FOUND) {
        msg = 'Parking slot document not found in Firestore.'
      }

      return {
        approved: false,
        reason: errCode,
        message: msg
      }
    }

    return {
      approved: false,
      reason: EXIT_REASON_CODES.TRANSACTION_FAILED,
      message: txErr.message || 'Atomic gate egress transaction failed.'
    }
  }

  // =========================================================
  // STEP 4 — RETURN STRUCTURED SUCCESS RESULT
  // =========================================================
  return {
    approved: true,
    reason: EXIT_REASON_CODES.EXIT_APPROVED,
    message: `Vehicle ${transactionSummary.vehicleNumber} checked out from Bay ${finalSlotId} (${transactionSummary.floor}). Duration: ${transactionSummary.duration}. Bay is now AVAILABLE. Boom barrier opening.`,
    ...transactionSummary
  }
}
