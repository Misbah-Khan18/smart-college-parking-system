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
import {
  getFloorForVehicleType,
  isSlotAllowedForVehicleType
} from '../data/vehicleRules.js'

const USERS_COLLECTION = 'users'
const SLOTS_COLLECTION = 'parking_slots'
const RESERVATIONS_COLLECTION = 'reservations'
const SESSIONS_COLLECTION = 'parking_sessions'

/**
 * Standard Reason Codes for Guard Ingress Gate Operations
 */
export const GATE_REASON_CODES = {
  ENTRY_APPROVED: 'ENTRY_APPROVED',
  UNAUTHORIZED_GUARD: 'UNAUTHORIZED_GUARD',
  INVALID_QR: 'INVALID_QR',
  RESERVATION_NOT_FOUND: 'RESERVATION_NOT_FOUND',
  RESERVATION_CANCELLED: 'RESERVATION_CANCELLED',
  RESERVATION_EXPIRED: 'RESERVATION_EXPIRED',
  PAYMENT_NOT_VERIFIED: 'PAYMENT_NOT_VERIFIED',
  SLOT_NOT_FOUND: 'SLOT_NOT_FOUND',
  SLOT_NOT_RESERVED: 'SLOT_NOT_RESERVED',
  VEHICLE_MISMATCH: 'VEHICLE_MISMATCH',
  WRONG_FLOOR: 'WRONG_FLOOR',
  ALREADY_INSIDE: 'ALREADY_INSIDE',
  ENTRY_ALREADY_PROCESSED: 'ENTRY_ALREADY_PROCESSED',
  TRANSACTION_FAILED: 'TRANSACTION_FAILED'
}

/**
 * Helper to verify that the active user is an authorized Guard / Security Admin
 * by reading their authoritative role directly from users/{uid} in Firestore.
 *
 * @param {string} guardUid - Firebase Authentication UID
 * @returns {Promise<{ authorized: boolean, role?: string, errorReason?: string, message?: string }>}
 */
export async function verifyGuardAuthorization(guardUid) {
  const currentUser = auth.currentUser
  if (!currentUser) {
    return {
      authorized: false,
      errorReason: GATE_REASON_CODES.UNAUTHORIZED_GUARD,
      message: 'No active Firebase user session found. Please sign in.'
    }
  }

  const activeUid = guardUid || currentUser.uid
  if (currentUser.uid !== activeUid) {
    return {
      authorized: false,
      errorReason: GATE_REASON_CODES.UNAUTHORIZED_GUARD,
      message: 'Guard identity does not match the active Firebase authenticated user.'
    }
  }

  try {
    const userDocRef = doc(db, USERS_COLLECTION, activeUid)
    const userSnap = await getDoc(userDocRef)

    if (!userSnap.exists()) {
      return {
        authorized: false,
        errorReason: GATE_REASON_CODES.UNAUTHORIZED_GUARD,
        message: 'Guard profile document does not exist in Firestore users collection.'
      }
    }

    const userData = userSnap.data() || {}
    const role = userData.role

    if (role !== 'Security Admin' && role !== 'Admin') {
      return {
        authorized: false,
        role,
        errorReason: GATE_REASON_CODES.UNAUTHORIZED_GUARD,
        message: 'Access Denied: Only Security Admin and Admin roles have gate admission permissions.'
      }
    }

    return {
      authorized: true,
      role,
      user: userData
    }
  } catch (err) {
    console.error('[guardGateService] Guard authorization check error:', err)
    return {
      authorized: false,
      errorReason: GATE_REASON_CODES.UNAUTHORIZED_GUARD,
      message: `Failed to verify guard permissions in Firestore: ${err.message}`
    }
  }
}

/**
 * Locate active student reservation by QR token, passId, reservationId, or document ID
 *
 * @param {string} qrToken - Scanned QR token or pass code
 * @returns {Promise<Object|null>} Reservation document data or null
 */
export async function lookupReservationByToken(qrToken) {
  let tokenSearch = (qrToken || '').trim()
  if (!tokenSearch) return null

  // If token is a URL, extract parameter
  if (tokenSearch.includes('?') || tokenSearch.startsWith('http://') || tokenSearch.startsWith('https://')) {
    try {
      const urlObj = new URL(tokenSearch.startsWith('http') ? tokenSearch : `http://dummy.com/${tokenSearch}`)
      tokenSearch = urlObj.searchParams.get('token') ||
        urlObj.searchParams.get('passId') ||
        urlObj.searchParams.get('reservationId') ||
        tokenSearch
    } catch {
      // Use raw string on URL parse error
    }
  }

  const reservationsRef = collection(db, RESERVATIONS_COLLECTION)

  // 1. Query by qrToken
  const qByQr = query(reservationsRef, where('qrToken', '==', tokenSearch))
  const snapByQr = await getDocs(qByQr)
  if (!snapByQr.empty) {
    const d = snapByQr.docs[0]
    return { id: d.id, ...d.data() }
  }

  // 2. Query by passId
  const qByPass = query(reservationsRef, where('passId', '==', tokenSearch))
  const snapByPass = await getDocs(qByPass)
  if (!snapByPass.empty) {
    const d = snapByPass.docs[0]
    return { id: d.id, ...d.data() }
  }

  // 3. Query by reservationId field
  const qByResId = query(reservationsRef, where('reservationId', '==', tokenSearch))
  const snapByResId = await getDocs(qByResId)
  if (!snapByResId.empty) {
    const d = snapByResId.docs[0]
    return { id: d.id, ...d.data() }
  }

  // 4. Direct Document ID lookup
  try {
    const directDocRef = doc(db, RESERVATIONS_COLLECTION, tokenSearch)
    const directSnap = await getDoc(directDocRef)
    if (directSnap.exists()) {
      return { id: directSnap.id, ...directSnap.data() }
    }
  } catch {
    // Ignore invalid doc id syntax
  }

  // 5. Fallback: Parse SOC-RES-{slotId}-{plate} syntax
  if (tokenSearch.startsWith('SOC-RES-')) {
    const parts = tokenSearch.replace('SOC-RES-', '').split('-')
    if (parts.length >= 1) {
      const candidateSlot = normalizeSlotId(parts[0])
      if (candidateSlot) {
        const qBySlot = query(
          reservationsRef,
          where('slotId', '==', candidateSlot),
          where('status', 'in', ['active', 'reserved', 'in_use'])
        )
        const snapBySlot = await getDocs(qBySlot)
        if (!snapBySlot.empty) {
          const d = snapBySlot.docs[0]
          return { id: d.id, ...d.data() }
        }
      }
    }
  }

  return null
}

/**
 * Authoritative Firestore Guard Ingress Verification Service.
 *
 * Verifies the student parking reservation, checks vehicle/floor/anti-passback constraints,
 * and atomically executes a Firestore transaction to:
 * 1. Mark reservation as 'in_use'
 * 2. Mark parking_slots as 'occupied'
 * 3. Create active document in parking_sessions
 *
 * @param {Object} params
 * @param {string} params.qrToken - Scanned QR code or permit token
 * @param {string} [params.scannedPlate] - License plate read by ANPR camera / manual entry
 * @param {string} [params.gateFloor] - Sensor gate floor ('Ground Floor' | 'Basement')
 * @param {string} [params.guardUid] - Authenticated UID of the security guard
 * @returns {Promise<{ approved: boolean, reason: string, message?: string, slotId?: string, reservationId?: string, studentName?: string, vehicleNumber?: string, vehicleType?: string, floor?: string, section?: string, zone?: string, enteredAt?: string, sessionId?: string }>}
 */
export async function verifyAndAdmitGatePass({
  qrToken,
  scannedPlate = '',
  gateFloor = '',
  guardUid = ''
}) {
  // =========================================================
  // STEP 1 — AUTHORIZATION
  // =========================================================
  const authCheck = await verifyGuardAuthorization(guardUid)
  if (!authCheck.authorized) {
    return {
      approved: false,
      reason: authCheck.errorReason || GATE_REASON_CODES.UNAUTHORIZED_GUARD,
      message: authCheck.message || 'Unauthorized Guard.'
    }
  }

  const activeGuardUid = guardUid || auth.currentUser?.uid || ''

  // =========================================================
  // STEP 2 — FIND THE RESERVATION
  // =========================================================
  if (!qrToken || !qrToken.trim()) {
    return {
      approved: false,
      reason: GATE_REASON_CODES.INVALID_QR,
      message: 'No QR permit token or reservation code provided in verification request.'
    }
  }

  const reservation = await lookupReservationByToken(qrToken)
  if (!reservation) {
    return {
      approved: false,
      reason: GATE_REASON_CODES.RESERVATION_NOT_FOUND,
      message: `No active reservation found matching pass token "${qrToken.trim()}".`
    }
  }

  // =========================================================
  // STEP 3 — VALIDATE RESERVATION STATE & EXPIRY
  // =========================================================
  if (reservation.status === 'cancelled') {
    return {
      approved: false,
      reason: GATE_REASON_CODES.RESERVATION_CANCELLED,
      message: `Reservation #${reservation.id} was cancelled by the student and is invalid.`
    }
  }

  if (reservation.status === 'completed') {
    return {
      approved: false,
      reason: GATE_REASON_CODES.ENTRY_ALREADY_PROCESSED,
      message: `Reservation #${reservation.id} has already completed its campus parking session.`
    }
  }

  if (reservation.status === 'in_use') {
    return {
      approved: false,
      reason: GATE_REASON_CODES.ALREADY_INSIDE,
      message: `Pass for Bay ${reservation.slotId} is already marked IN USE inside campus.`
    }
  }

  // Expiration validation (if timestamp or date string is present)
  if (reservation.validUntil && reservation.validUntil !== 'Active Session') {
    const expiryTimestamp = new Date(reservation.validUntil).getTime()
    if (!isNaN(expiryTimestamp) && Date.now() > expiryTimestamp) {
      return {
        approved: false,
        reason: GATE_REASON_CODES.RESERVATION_EXPIRED,
        message: `Reservation validity expired on ${new Date(reservation.validUntil).toLocaleDateString()}. Please renew pass.`
      }
    }
  }

  // Payment status check (if explicitly unpaid/failed in schema)
  if (reservation.paymentStatus && ['UNPAID', 'PENDING', 'FAILED'].includes(String(reservation.paymentStatus).toUpperCase())) {
    return {
      approved: false,
      reason: GATE_REASON_CODES.PAYMENT_NOT_VERIFIED,
      message: 'Permit payment is unverified or incomplete. Complete payment before gate ingress.'
    }
  }

  // =========================================================
  // STEP 4 — VEHICLE VERIFICATION (IF SCANNED PLATE PROVIDED)
  // =========================================================
  const reservationPlate = normalizePlate(
    reservation.plate || reservation.vehiclePlate || reservation.vehicleNumber || ''
  )

  if (scannedPlate && scannedPlate.trim()) {
    const cleanScannedPlate = normalizePlate(scannedPlate)
    const cleanResComp = reservationPlate.replace(/[^A-Z0-9]/g, '')
    const cleanScannedComp = cleanScannedPlate.replace(/[^A-Z0-9]/g, '')

    if (cleanResComp && cleanScannedComp && cleanResComp !== cleanScannedComp) {
      return {
        approved: false,
        reason: GATE_REASON_CODES.VEHICLE_MISMATCH,
        message: `License plate mismatch: Reservation is issued for ${reservationPlate}, but ANPR camera read ${cleanScannedPlate}.`
      }
    }
  }

  // =========================================================
  // STEP 5 — FLOOR / ZONE VALIDATION
  // =========================================================
  const slotId = normalizeSlotId(reservation.slotId)
  if (!slotId) {
    return {
      approved: false,
      reason: GATE_REASON_CODES.SLOT_NOT_FOUND,
      message: 'Reservation does not have a valid assigned parking slot ID.'
    }
  }

  const vehicleType = (
    reservation.vehicleType ||
    reservation.type ||
    (slotId.startsWith('G') ? 'scooty' : 'bike')
  ).toLowerCase()

  if (!isSlotAllowedForVehicleType(slotId, vehicleType)) {
    return {
      approved: false,
      reason: GATE_REASON_CODES.WRONG_FLOOR,
      message: `Floor/zone mismatch: Bay ${slotId} is reserved for ${slotId.startsWith('G') ? 'Scooties' : 'Bikes'}, but vehicle is a ${vehicleType}.`
    }
  }

  if (gateFloor && gateFloor.trim()) {
    const expectedFloor = getFloorForVehicleType(vehicleType)
    const cleanGateFloor = gateFloor.trim().toLowerCase()
    const cleanExpected = expectedFloor.trim().toLowerCase()

    if (
      cleanGateFloor !== cleanExpected &&
      !cleanGateFloor.includes(cleanExpected) &&
      !cleanExpected.includes(cleanGateFloor)
    ) {
      return {
        approved: false,
        reason: GATE_REASON_CODES.WRONG_FLOOR,
        message: `Gate mismatch: Vehicle is designated for ${expectedFloor} (${slotId}), but scanned at ${gateFloor}.`
      }
    }
  }

  // =========================================================
  // STEP 6 — ANTI-PASSBACK (ACTIVE SESSION LOOKUP)
  // =========================================================
  try {
    const sessionsRef = collection(db, SESSIONS_COLLECTION)
    const cleanPlateComp = reservationPlate.replace(/[^A-Z0-9]/g, '')

    const qActiveSessions = query(sessionsRef, where('status', '==', 'active'))
    const snapActive = await getDocs(qActiveSessions)

    const existingActiveSession = snapActive.docs.find((d) => {
      const sData = d.data()
      const sPlateComp = (sData.vehicleNumber || sData.plate || '').replace(/[^A-Z0-9]/g, '').toUpperCase()
      const sSlot = normalizeSlotId(sData.slotId)
      const sResId = sData.reservationId || ''

      if (sResId && sResId === reservation.id) return true
      if (cleanPlateComp && sPlateComp && sPlateComp === cleanPlateComp) return true
      if (sSlot && sSlot === slotId) return true
      return false
    })

    if (existingActiveSession) {
      const actData = existingActiveSession.data()
      return {
        approved: false,
        reason: GATE_REASON_CODES.ALREADY_INSIDE,
        message: `Anti-Passback: Vehicle ${reservationPlate} is already parked in Bay ${actData.slotId || slotId}.`
      }
    }
  } catch (sessErr) {
    console.warn('[guardGateService] Anti-passback session check warning:', sessErr)
  }

  // =========================================================
  // STEP 7 — ATOMIC FIRESTORE ENTRY TRANSACTION
  // =========================================================
  const slotDocRef = doc(db, SLOTS_COLLECTION, slotId)
  const resDocRef = doc(db, RESERVATIONS_COLLECTION, reservation.id)
  const sessionId = `SESS-${slotId.replace(/[^a-zA-Z0-9]/g, '')}-${Date.now()}`
  const sessionDocRef = doc(db, SESSIONS_COLLECTION, sessionId)

  const nowTimeStr = new Date().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  })
  const nowTimestamp = Date.now()

  let transactionSummary = null

  try {
    await runTransaction(db, async (transaction) => {
      // 1. Re-read reservation inside transaction
      const transResSnap = await transaction.get(resDocRef)
      if (!transResSnap.exists()) {
        throw new Error(GATE_REASON_CODES.RESERVATION_NOT_FOUND)
      }
      const currentResData = transResSnap.data()

      if (currentResData.status === 'in_use' || currentResData.status === 'completed') {
        throw new Error(GATE_REASON_CODES.ENTRY_ALREADY_PROCESSED)
      }
      if (currentResData.status === 'cancelled') {
        throw new Error(GATE_REASON_CODES.RESERVATION_CANCELLED)
      }

      // 2. Re-read parking slot inside transaction
      const transSlotSnap = await transaction.get(slotDocRef)
      if (!transSlotSnap.exists()) {
        throw new Error(GATE_REASON_CODES.SLOT_NOT_FOUND)
      }
      const currentSlotData = transSlotSnap.data()

      if (currentSlotData.status === 'occupied') {
        throw new Error(GATE_REASON_CODES.ENTRY_ALREADY_PROCESSED)
      }
      if (currentSlotData.status !== 'reserved') {
        throw new Error(GATE_REASON_CODES.SLOT_NOT_RESERVED)
      }

      // 3. Ownership / Identity re-verification inside transaction
      const slotPlateComp = (currentSlotData.plate || '').replace(/[^A-Z0-9]/g, '').toUpperCase()
      const resPlateComp = (currentResData.plate || currentResData.vehiclePlate || '').replace(/[^A-Z0-9]/g, '').toUpperCase()
      if (slotPlateComp && resPlateComp && slotPlateComp !== resPlateComp) {
        throw new Error(GATE_REASON_CODES.VEHICLE_MISMATCH)
      }

      // 4. Update parking slot: 'reserved' -> 'occupied'
      transaction.update(slotDocRef, {
        status: 'occupied',
        entryTime: nowTimeStr,
        entryTimestamp: nowTimestamp,
        gateEnteredAt: serverTimestamp(),
        guardUid: activeGuardUid,
        updatedAt: serverTimestamp()
      })

      // 5. Update reservation: 'active' -> 'in_use'
      transaction.update(resDocRef, {
        status: 'in_use',
        gateEnteredAt: serverTimestamp(),
        guardUid: activeGuardUid,
        updatedAt: serverTimestamp()
      })

      // 6. Create active parking_sessions document
      const sessionRecord = {
        id: sessionId,
        reservationId: reservation.id,
        studentId: currentResData.userId || currentResData.studentId || '',
        vehicleId: currentResData.vehicleId || '',
        vehicleNumber: reservationPlate,
        studentName: currentResData.userName || currentResData.studentName || 'Campus Member',
        rollNumber: currentResData.rollNumber || '',
        stream: currentResData.stream || '',
        phoneNumber: currentResData.phoneNumber || '',
        vehicleType,
        slotId,
        floor: currentResData.floor || currentSlotData.floor || (slotId.startsWith('G') ? 'Ground Floor' : 'Basement'),
        section: currentResData.section || currentSlotData.section || `${currentSlotData.floor || 'Campus'} Parking Area`,
        zone: currentResData.zone || currentSlotData.zone || `${currentSlotData.floor || 'Campus'} - General`,
        category: currentResData.category || 'Student',
        passId: currentResData.passId || '',
        passType: currentResData.passType || 'Campus Parking Pass',
        entryTime: nowTimeStr,
        entryTimestamp: nowTimestamp,
        exitTime: null,
        exitTimestamp: null,
        duration: null,
        status: 'active',
        guardUid: activeGuardUid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }
      transaction.set(sessionDocRef, sessionRecord)

      transactionSummary = {
        slotId,
        reservationId: reservation.id,
        studentName: sessionRecord.studentName,
        vehicleNumber: reservationPlate,
        vehicleType,
        floor: sessionRecord.floor,
        section: sessionRecord.section,
        zone: sessionRecord.zone,
        enteredAt: nowTimeStr,
        sessionId
      }
    })
  } catch (txErr) {
    console.error('[guardGateService] Gate Ingress Transaction Error:', txErr)
    const errCode = txErr.message

    if (Object.values(GATE_REASON_CODES).includes(errCode)) {
      let msg = 'Gate ingress transaction failed validation.'
      if (errCode === GATE_REASON_CODES.ENTRY_ALREADY_PROCESSED) {
        msg = 'Pass has already been admitted or bay is already occupied.'
      } else if (errCode === GATE_REASON_CODES.SLOT_NOT_RESERVED) {
        msg = `Bay ${slotId} is no longer in reserved status.`
      } else if (errCode === GATE_REASON_CODES.RESERVATION_CANCELLED) {
        msg = 'Reservation was cancelled and cannot be admitted.'
      } else if (errCode === GATE_REASON_CODES.RESERVATION_NOT_FOUND) {
        msg = 'Reservation record not found.'
      } else if (errCode === GATE_REASON_CODES.SLOT_NOT_FOUND) {
        msg = 'Parking slot document not found in Firestore.'
      } else if (errCode === GATE_REASON_CODES.VEHICLE_MISMATCH) {
        msg = 'Slot reservation vehicle plate does not match pass.'
      }

      return {
        approved: false,
        reason: errCode,
        message: msg
      }
    }

    return {
      approved: false,
      reason: GATE_REASON_CODES.TRANSACTION_FAILED,
      message: txErr.message || 'Atomic gate ingress transaction failed.'
    }
  }

  // =========================================================
  // STEP 8 — RETURN STRUCTURED SUCCESS RESULT
  // =========================================================
  return {
    approved: true,
    reason: GATE_REASON_CODES.ENTRY_APPROVED,
    message: `Access Granted! Bay ${slotId} (${transactionSummary.floor}) is now OCCUPIED. Boom barrier opened.`,
    ...transactionSummary
  }
}
