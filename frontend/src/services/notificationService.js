import {
  collection,
  doc,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  writeBatch,
  onSnapshot,
  query,
  where,
  serverTimestamp
} from 'firebase/firestore'
import { auth, db } from '../firebase/firebase.js'

const NOTIFICATIONS_COLLECTION = 'notifications'

/**
 * Valid notification types
 */
export const NOTIFICATION_TYPES = {
  INFO: 'info',
  SUCCESS: 'success',
  WARNING: 'warning',
  VIOLATION: 'violation'
}

/**
 * Normalizes notification object ensuring all fields conform to schema
 */
function normalizeNotificationDoc(id, data = {}) {
  return {
    id,
    userId: data.userId || 'ALL',
    title: data.title || 'Notification',
    message: data.message || '',
    type: data.type || NOTIFICATION_TYPES.INFO,
    read: Boolean(data.read),
    createdAt: data.createdAt || null,
    relatedSlotId: data.relatedSlotId || null,
    relatedVehiclePlate: data.relatedVehiclePlate || null,
    ...data
  }
}

/**
 * Helper to resolve timestamp to epoch milliseconds
 * Safely handles unresolved serverTimestamp() by defaulting to Date.now()
 */
function getTimestampMillis(createdAt) {
  if (!createdAt) return Date.now()
  if (typeof createdAt.toMillis === 'function') return createdAt.toMillis()
  if (createdAt.seconds) return createdAt.seconds * 1000 + (createdAt.nanoseconds || 0) / 1000000
  if (createdAt instanceof Date) return createdAt.getTime()
  if (typeof createdAt === 'number') return createdAt
  if (typeof createdAt === 'string') {
    const parsed = new Date(createdAt).getTime()
    return isNaN(parsed) ? Date.now() : parsed
  }
  return Date.now()
}

/**
 * 1. Create a persistent notification in Firestore
 *
 * @param {Object} params
 * @param {string} params.userId - User UID or "ALL"
 * @param {string} params.title - Short notification title
 * @param {string} params.message - Human-readable message
 * @param {string} [params.type='info'] - 'info' | 'success' | 'warning' | 'violation'
 * @param {string} [params.relatedSlotId=null] - Optional slot ID
 * @param {string} [params.relatedVehiclePlate=null] - Optional vehicle plate
 * @returns {Promise<Object>} Created notification metadata
 */
export async function createNotification({
  userId,
  title,
  message,
  type = NOTIFICATION_TYPES.INFO,
  relatedSlotId = null,
  relatedVehiclePlate = null
}) {
  if (!db) {
    console.warn('[notificationService] Firestore db is unavailable, skipping notification creation.')
    return null
  }

  const cleanUserId = userId || auth.currentUser?.uid || 'ALL'
  const cleanTitle = (title || 'Notification').trim()
  const cleanMessage = (message || '').trim()
  const cleanType = Object.values(NOTIFICATION_TYPES).includes(type) ? type : NOTIFICATION_TYPES.INFO

  const payload = {
    userId: cleanUserId,
    title: cleanTitle,
    message: cleanMessage,
    type: cleanType,
    read: false,
    createdAt: serverTimestamp(),
    relatedSlotId: relatedSlotId ? String(relatedSlotId).trim().toUpperCase() : null,
    relatedVehiclePlate: relatedVehiclePlate ? String(relatedVehiclePlate).trim().toUpperCase() : null
  }

  const colRef = collection(db, NOTIFICATIONS_COLLECTION)
  const docRef = await addDoc(colRef, payload)

  return {
    id: docRef.id,
    ...payload,
    createdAt: new Date()
  }
}

/**
 * 2. Real-time subscription to user notifications and broadcast messages
 *
 * Listens to:
 *   - notifications specifically addressed to userId
 *   - broadcast notifications where userId == 'ALL'
 * Merges and sorts newest first by createdAt.
 *
 * @param {string} userId - Authenticated user UID
 * @param {Function} onUpdate - Callback receiving array of notifications
 * @param {Function} onError - Optional error callback
 * @returns {Function} Unsubscribe function
 */
export function subscribeToUserNotifications(userId, onUpdate, onError) {
  if (!db || !userId) {
    if (typeof onUpdate === 'function') onUpdate([])
    return () => {}
  }

  const colRef = collection(db, NOTIFICATIONS_COLLECTION)
  let userDocsMap = new Map()
  let broadcastDocsMap = new Map()

  const emitMergedNotifications = () => {
    const combinedMap = new Map([...userDocsMap, ...broadcastDocsMap])
    const list = Array.from(combinedMap.values())

    // Sort newest first
    list.sort((a, b) => {
      const timeA = getTimestampMillis(a.createdAt)
      const timeB = getTimestampMillis(b.createdAt)
      return timeB - timeA
    })

    if (typeof onUpdate === 'function') {
      onUpdate(list)
    }
  }

  // 1. Specific User Listener
  const userQuery = query(colRef, where('userId', '==', userId))
  const unsubUser = onSnapshot(
    userQuery,
    (snapshot) => {
      userDocsMap = new Map()
      snapshot.forEach((docSnap) => {
        userDocsMap.set(docSnap.id, normalizeNotificationDoc(docSnap.id, docSnap.data()))
      })
      emitMergedNotifications()
    },
    (err) => {
      console.warn('[notificationService] User notifications listener error:', err?.message)
      if (typeof onError === 'function') onError(err)
    }
  )

  // 2. Broadcast Listener (userId == 'ALL')
  const broadcastQuery = query(colRef, where('userId', '==', 'ALL'))
  const unsubBroadcast = onSnapshot(
    broadcastQuery,
    (snapshot) => {
      broadcastDocsMap = new Map()
      snapshot.forEach((docSnap) => {
        broadcastDocsMap.set(docSnap.id, normalizeNotificationDoc(docSnap.id, docSnap.data()))
      })
      emitMergedNotifications()
    },
    (err) => {
      console.warn('[notificationService] Broadcast notifications listener error:', err?.message)
      if (typeof onError === 'function') onError(err)
    }
  )

  // Combined cleanup
  return () => {
    try {
      unsubUser()
    } catch {
      // safe cleanup
    }
    try {
      unsubBroadcast()
    } catch {
      // safe cleanup
    }
  }
}

/**
 * 3. Mark a single notification as read
 *
 * @param {string} notificationId
 */
export async function markNotificationAsRead(notificationId) {
  if (!db || !notificationId) return
  const docRef = doc(db, NOTIFICATIONS_COLLECTION, notificationId)
  await updateDoc(docRef, {
    read: true,
    updatedAt: serverTimestamp()
  })
}

/**
 * 4. Mark all unread notifications for a specific user as read
 * Note: Only updates notifications owned by userId, never other users' broadcasts.
 *
 * @param {string} userId
 */
export async function markAllNotificationsAsRead(userId) {
  if (!db || !userId) return
  const colRef = collection(db, NOTIFICATIONS_COLLECTION)
  const q = query(colRef, where('userId', '==', userId), where('read', '==', false))
  const snapshot = await getDocs(q)

  if (snapshot.empty) return

  const batch = writeBatch(db)
  snapshot.forEach((docSnap) => {
    batch.update(docSnap.ref, {
      read: true,
      updatedAt: serverTimestamp()
    })
  })

  await batch.commit()
}

/**
 * 5. Delete a single notification
 *
 * @param {string} notificationId
 */
export async function deleteNotification(notificationId) {
  if (!db || !notificationId) return
  const docRef = doc(db, NOTIFICATIONS_COLLECTION, notificationId)
  await deleteDoc(docRef)
}

/**
 * 6. Delete all read notifications for a specific user
 * Note: Only deletes read notifications owned by userId.
 *
 * @param {string} userId
 */
export async function deleteAllReadNotifications(userId) {
  if (!db || !userId) return
  const colRef = collection(db, NOTIFICATIONS_COLLECTION)
  const q = query(colRef, where('userId', '==', userId), where('read', '==', true))
  const snapshot = await getDocs(q)

  if (snapshot.empty) return

  const batch = writeBatch(db)
  snapshot.forEach((docSnap) => {
    batch.delete(docSnap.ref)
  })

  await batch.commit()
}
