/**
 * Payment History Service
 * Cloud Firestore Collection: `payments`
 * 
 * Manages persistent audit records of student parking payments.
 * Ensures strict idempotency, correct data formatting, and real-time subscription.
 */

import { db } from '../firebase/firebase.js'
import {
  collection,
  doc,
  setDoc,
  getDocs,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp
} from 'firebase/firestore'

export const PAYMENTS_COLLECTION = 'payments'
const LOCAL_STORAGE_KEY = 'socmac_payments_history_cache'

// In-memory cache for fast UI updates, offline fallback, and test environments
let memoryPayments = []
const seenPaymentIds = new Set()

/**
 * Normalizes vehicle type to standard "Scooty" | "Bike"
 */
export function normalizeVehicleType(type) {
  if (!type) return 'Scooty'
  const str = String(type).toLowerCase().trim()
  if (str.includes('bike') || str.includes('motorcycle')) return 'Bike'
  return 'Scooty'
}

/**
 * Normalizes floor to standard "Ground Floor" | "Basement"
 */
export function normalizeFloor(floor, slotId = '') {
  if (floor && (floor.includes('Basement') || floor.includes('Ground'))) {
    return floor
  }
  if (slotId && slotId.toUpperCase().startsWith('B')) return 'Basement'
  return 'Ground Floor'
}

/**
 * Safely parses any Firestore Timestamp, Date object, ISO string, or epoch number
 */
export function parsePaymentDate(paidAt) {
  if (!paidAt) return new Date()
  if (typeof paidAt.toDate === 'function') return paidAt.toDate()
  if (typeof paidAt.toMillis === 'function') return new Date(paidAt.toMillis())
  if (paidAt instanceof Date) return isNaN(paidAt.getTime()) ? new Date() : paidAt
  if (typeof paidAt === 'number') return new Date(paidAt)
  if (typeof paidAt === 'string') {
    const d = new Date(paidAt)
    if (!isNaN(d.getTime())) return d
  }
  return new Date()
}

/**
 * Formats date from payment timestamp: "02 Oct 2026"
 */
export function formatPaymentDate(paidAt) {
  const d = parsePaymentDate(paidAt)
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })
}

/**
 * Formats time from payment timestamp: "01:05 PM"
 */
export function formatPaymentTime(paidAt) {
  const d = parsePaymentDate(paidAt)
  return d.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  })
}

/**
 * Loads cached payments from localStorage (if any)
 */
function loadLocalPaymentsCache() {
  if (typeof window === 'undefined' || !window.localStorage) return []
  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed
    }
  } catch (err) {
    console.warn('[PaymentHistoryService] Local storage read notice:', err?.message)
  }
  return []
}

/**
 * Saves payments to localStorage cache
 */
function saveLocalPaymentsCache(list) {
  if (typeof window === 'undefined' || !window.localStorage) return
  try {
    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list))
  } catch (err) {
    console.warn('[PaymentHistoryService] Local storage write notice:', err?.message)
  }
}

/**
 * Records a successful payment record in Firestore (and local cache).
 * Idempotent: Uses paymentId / reservationId as deterministic document ID.
 * 
 * @param {Object} paymentData
 * @returns {Promise<{success: boolean, payment: Object}>}
 */
export async function recordSuccessfulPayment({
  paymentId = null,
  userId,
  studentName = 'Campus Member',
  studentEmail = '',
  rollNumber = '',
  vehicleNumber = '',
  vehicleType = 'Scooty',
  slotId = '',
  floor = null,
  reservationId = null,
  amount = 10,
  currency = 'INR',
  paymentMethod = 'UPI / Google Pay (Simulated)',
  paymentStatus = 'SUCCESS',
  transactionId = null,
  paidAt = null
}) {
  if (!userId) {
    throw new Error('Authenticated user ID is required to record a payment.')
  }
  if (!slotId) {
    throw new Error('Parking slot ID is required to record a payment.')
  }

  const cleanSlotId = String(slotId).toUpperCase().trim()
  const cleanPlate = String(vehicleNumber || '').toUpperCase().trim()
  const normType = normalizeVehicleType(vehicleType)
  const normFloor = normalizeFloor(floor, cleanSlotId)
  const normAmount = typeof amount === 'number' && !isNaN(amount) && amount >= 0 ? amount : 10
  const normStatus = String(paymentStatus || 'SUCCESS').toUpperCase()

  // Deterministic stable IDs for idempotency
  const finalReservationId = reservationId || `RES-${cleanSlotId.replace(/[^A-Z0-9]/g, '')}-${Date.now()}`
  const finalPaymentId = paymentId || `PAY-${finalReservationId.replace(/[^A-Z0-9-]/g, '')}`
  const finalTransactionId = transactionId || `TXN-UPI-${cleanSlotId.replace(/[^A-Z0-9]/g, '')}-${Date.now().toString().slice(-6)}`

  // Prevent duplicate in-memory processing
  if (seenPaymentIds.has(finalPaymentId)) {
    const existing = memoryPayments.find((p) => p.paymentId === finalPaymentId)
    if (existing) {
      return { success: true, payment: existing, duplicateIgnored: true }
    }
  }

  const nowIso = new Date().toISOString()
  const paymentRecord = {
    paymentId: finalPaymentId,
    id: finalPaymentId,
    userId: String(userId),
    studentName: String(studentName || 'Campus Member').trim(),
    studentEmail: String(studentEmail || '').trim(),
    rollNumber: String(rollNumber || '').trim(),
    vehicleNumber: cleanPlate,
    vehicleType: normType,
    slotId: cleanSlotId,
    floor: normFloor,
    reservationId: finalReservationId,
    amount: normAmount,
    currency: String(currency || 'INR').toUpperCase(),
    paymentMethod: String(paymentMethod || 'UPI / Google Pay (Simulated)'),
    paymentStatus: normStatus,
    transactionId: finalTransactionId,
    paidAt: paidAt || serverTimestamp(),
    paidAtIso: nowIso,
    createdAt: serverTimestamp(),
    createdAtIso: nowIso
  }

  // Update in-memory and local storage cache first
  seenPaymentIds.add(finalPaymentId)
  memoryPayments = [
    { ...paymentRecord, paidAt: paymentRecord.paidAtIso, createdAt: paymentRecord.createdAtIso },
    ...memoryPayments.filter((p) => p.paymentId !== finalPaymentId)
  ]
  saveLocalPaymentsCache(memoryPayments)

  // Write to Cloud Firestore (non-blocking for UI responsiveness & offline resilience)
  const isMockApp = db && (db._databaseId?.projectId === 'mock-app' || db.app?.options?.projectId === 'mock-app')
  if (db && (!isMockApp || typeof window !== 'undefined')) {
    try {
      const docRef = doc(db, PAYMENTS_COLLECTION, finalPaymentId)
      setDoc(docRef, paymentRecord, { merge: true })
        .then(() => {
          // Cloud sync successful
        })
        .catch((fsErr) => {
          console.warn('[PaymentHistoryService] Cloud Firestore write notice (offline fallback active):', fsErr?.message)
        })
    } catch (fsErr) {
      console.warn('[PaymentHistoryService] Cloud Firestore write notice (offline fallback active):', fsErr?.message)
    }
  }

  return { success: true, payment: paymentRecord }
}

/**
 * Subscribes to real-time updates from `payments` collection.
 * Sorts newest first.
 * 
 * @param {Function} onUpdate - callback receiving Array of payments
 * @param {Function} onError - optional error callback
 * @returns {Function} unsubscribe
 */
export function subscribeToPayments(onUpdate, onError) {
  if (typeof onUpdate !== 'function') return () => {}

  // Initialize from cache
  const cached = loadLocalPaymentsCache()
  if (cached.length > 0) {
    cached.forEach((c) => {
      if (c.paymentId) seenPaymentIds.add(c.paymentId)
    })
    memoryPayments = cached
    onUpdate(memoryPayments)
  } else if (memoryPayments.length > 0) {
    onUpdate(memoryPayments)
  }

  if (!db) {
    return () => {}
  }

  try {
    const q = query(
      collection(db, PAYMENTS_COLLECTION),
      orderBy('createdAt', 'desc')
    )

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const firestoreList = snapshot.docs.map((d) => {
          const data = d.data()
          return {
            id: d.id,
            paymentId: data.paymentId || d.id,
            ...data
          }
        })

        if (firestoreList.length > 0) {
          firestoreList.forEach((p) => seenPaymentIds.add(p.paymentId))
          // Merge with any offline memory items
          const merged = [...firestoreList]
          memoryPayments.forEach((mem) => {
            if (!merged.some((m) => m.paymentId === mem.paymentId)) {
              merged.push(mem)
            }
          })
          // Sort newest first
          merged.sort((a, b) => {
            const timeA = parsePaymentDate(a.paidAt || a.paidAtIso || a.createdAt).getTime()
            const timeB = parsePaymentDate(b.paidAt || b.paidAtIso || b.createdAt).getTime()
            return timeB - timeA
          })
          memoryPayments = merged
          saveLocalPaymentsCache(merged)
          onUpdate(merged)
        } else if (cached.length > 0) {
          onUpdate(cached)
        } else {
          onUpdate([])
        }
      },
      (err) => {
        console.warn('[PaymentHistoryService] Firestore snapshot notice:', err?.message)
        if (memoryPayments.length > 0) {
          onUpdate(memoryPayments)
        }
        if (onError) onError(err)
      }
    )

    return unsubscribe
  } catch (err) {
    console.warn('[PaymentHistoryService] Subscription setup error:', err?.message)
    if (memoryPayments.length > 0) {
      onUpdate(memoryPayments)
    }
    return () => {}
  }
}

/**
 * One-time fetch of all payments
 */
export async function fetchPaymentsOnce() {
  if (!db) {
    return [...memoryPayments]
  }

  try {
    const q = query(collection(db, PAYMENTS_COLLECTION), orderBy('createdAt', 'desc'))
    const snap = await getDocs(q)
    if (!snap.empty) {
      const list = snap.docs.map((d) => ({
        id: d.id,
        paymentId: d.data().paymentId || d.id,
        ...d.data()
      }))
      list.sort((a, b) => {
        const timeA = parsePaymentDate(a.paidAt || a.paidAtIso || a.createdAt).getTime()
        const timeB = parsePaymentDate(b.paidAt || b.paidAtIso || b.createdAt).getTime()
        return timeB - timeA
      })
      memoryPayments = list
      saveLocalPaymentsCache(list)
      return list
    }
  } catch (err) {
    console.warn('[PaymentHistoryService] fetchPaymentsOnce notice:', err?.message)
  }

  return [...memoryPayments]
}

/**
 * Calculates summary metrics dynamically from payment records
 * 
 * @param {Array} paymentsList
 * @returns {{totalPayments: number, totalRevenue: number, successfulCount: number, pendingFailedCount: number}}
 */
export function calculatePaymentStats(paymentsList = []) {
  if (!Array.isArray(paymentsList)) {
    return { totalPayments: 0, totalRevenue: 0, successfulCount: 0, pendingFailedCount: 0 }
  }

  let totalRevenue = 0
  let successfulCount = 0
  let pendingFailedCount = 0

  paymentsList.forEach((p) => {
    const status = String(p.paymentStatus || '').toUpperCase()
    const amount = typeof p.amount === 'number' && !isNaN(p.amount) ? p.amount : 10

    if (status === 'SUCCESS' || status === 'PAID') {
      successfulCount++
      totalRevenue += amount
    } else {
      pendingFailedCount++
    }
  })

  return {
    totalPayments: paymentsList.length,
    totalRevenue,
    successfulCount,
    pendingFailedCount
  }
}
