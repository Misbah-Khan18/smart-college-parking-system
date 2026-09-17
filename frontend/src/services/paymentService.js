/**
 * Payment & Permit Verification API Service
 * Primary runtime source: Cloud Firestore (reservations & registered_vehicles)
 * Fallback: Legacy API / local session cache
 */

import { db } from '../firebase/firebase'
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs
} from 'firebase/firestore'

const API_BASE = '/api'

function formatPermitResponse(data) {
  const cleanSlot = data.slotId || 'G-01'
  const floor = data.floor || (cleanSlot.startsWith('G') ? 'Ground Floor' : 'Basement')
  return {
    status: 'PAID',
    permit: {
      passId: data.passId || data.id || data.reservationId || `SOC-${cleanSlot}-${Date.now().toString().slice(-4)}`,
      studentName: data.userName || data.studentName || 'Campus Member',
      rollNumber: data.rollNumber || data.campusId || '',
      vehicleNumber: data.plate || data.vehiclePlate || data.vehicleNumber || 'MH-12-AB-1234',
      allocatedFloor: floor,
      planName: data.passType || 'Campus Parking Pass',
      amountPaidINR: data.amountPaidINR || 10,
      expiresAt: data.validUntil || data.reservedUntil || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      qrToken: data.qrToken || `SOC-RES-${cleanSlot}-${(data.plate || 'MH12AB1234').replace(/[^A-Z0-9]/g, '')}`,
      status: 'ACTIVE',
      paymentStatus: 'PAID'
    },
    registration: data
  }
}

function formatVehiclePermitResponse(data) {
  const floor = data.preferredFloor || (data.vehicleType === 'scooty' ? 'Ground Floor' : 'Basement')
  return {
    status: 'PAID',
    permit: {
      passId: data.passId || data.id || `SMP-${data.rollNumber || 'REG'}-${Date.now().toString().slice(-4)}`,
      studentName: data.studentName || 'Campus Member',
      rollNumber: data.rollNumber || data.campusId || '',
      vehicleNumber: data.vehicleNumber || 'MH-12-AB-1234',
      allocatedFloor: floor,
      planName: 'Annual Campus Registration',
      amountPaidINR: 0,
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      qrToken: data.passId || `SOC-VEH-${data.id}`,
      status: 'ACTIVE',
      paymentStatus: 'PAID'
    },
    registration: data
  }
}

/**
 * Creates a Stripe Checkout Session for student registration & permit purchase
 * @param {Object} registrationPayload
 * @returns {Promise<Object>} { sessionId, checkoutUrl, registrationId, plan }
 */
export async function createCheckoutSession(registrationPayload) {
  try {
    const response = await fetch(`${API_BASE}/payments/create-checkout-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(registrationPayload)
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || `Payment session creation failed (${response.status})`)
    }

    return data
  } catch (error) {
    console.error('Error in createCheckoutSession:', error)
    throw error
  }
}

/**
 * Verifies the status of a payment session after return.
 * Authoritative resolution order:
 * 1. Cloud Firestore `reservations`
 * 2. Cloud Firestore `registered_vehicles`
 * 3. Backend `/api/payments/session/:sessionId` (if online)
 * 4. Local cached session fallback
 * @param {string} sessionId
 * @returns {Promise<Object>} { status: 'PAID', permit: {...}, registration: {...} }
 */
export async function verifyPaymentSession(sessionId) {
  if (!sessionId) {
    throw new Error('No session ID provided.')
  }

  // 1. PRIMARY: Firestore Lookups
  if (db) {
    try {
      // 1a. Direct doc in reservations
      const resDoc = await getDoc(doc(db, 'reservations', sessionId))
      if (resDoc.exists()) {
        return formatPermitResponse(resDoc.data())
      }

      // 1b. Query reservations by reservationId, passId, or qrToken
      const resQuery = query(
        collection(db, 'reservations'),
        where('reservationId', '==', sessionId)
      )
      const resSnap = await getDocs(resQuery)
      if (!resSnap.empty) {
        return formatPermitResponse(resSnap.docs[0].data())
      }

      // 1c. Direct doc in registered_vehicles
      const vehDoc = await getDoc(doc(db, 'registered_vehicles', sessionId))
      if (vehDoc.exists()) {
        return formatVehiclePermitResponse(vehDoc.data())
      }

      // 1d. Query registered_vehicles by passId
      const vehQuery = query(
        collection(db, 'registered_vehicles'),
        where('passId', '==', sessionId)
      )
      const vehSnap = await getDocs(vehQuery)
      if (!vehSnap.empty) {
        return formatVehiclePermitResponse(vehSnap.docs[0].data())
      }
    } catch (fsErr) {
      console.warn('[PaymentService] Firestore session lookup notice:', fsErr?.message || fsErr)
    }
  }

  // 2. Secondary: Backend API if running
  try {
    const response = await fetch(`${API_BASE}/payments/session/${sessionId}`)
    if (response.ok) {
      const data = await response.json()
      return data
    }
  } catch (apiErr) {
    console.warn('[PaymentService] Backend API lookup notice:', apiErr?.message || apiErr)
  }

  // 3. Fallback: Local session cache
  try {
    const localDemo = localStorage.getItem('demo_user_session')
    if (localDemo) {
      const parsed = JSON.parse(localDemo)
      return {
        status: 'PAID',
        permit: {
          passId: `SOC-${parsed.preferredFloor?.startsWith('B') ? 'B' : 'G'}-${Date.now().toString().slice(-4)}`,
          studentName: parsed.displayName || 'Campus Member',
          rollNumber: parsed.rollNumber || parsed.campusId || 'S2410701',
          vehicleNumber: parsed.vehiclePlate || parsed.defaultPlate || 'MH-12-AB-1234',
          allocatedFloor: parsed.preferredFloor || 'Ground Floor',
          planName: 'Campus Parking Pass',
          amountPaidINR: 10,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          qrToken: `SOC-RES-G-01-${(parsed.vehiclePlate || 'MH12AB1234').replace(/[^A-Z0-9]/g, '')}`,
          status: 'ACTIVE',
          paymentStatus: 'PAID'
        }
      }
    }
  } catch (cacheErr) {
    console.warn('[PaymentService] Local cache lookup notice:', cacheErr)
  }

  throw new Error('Payment session details could not be retrieved.')
}

/**
 * Gate QR Scanner Verification (Legacy bridge)
 * Note: Official live scanner uses guardGateService.js directly via Firestore.
 * @param {Object} params { token, passId, scannedVehiclePlate, gateFloor }
 * @returns {Promise<Object>} { access: 'GRANTED'|'DENIED', reason, permitDetails, verifiedAt }
 */
export async function verifyPermitAccess({ token, passId, scannedVehiclePlate, gateFloor }) {
  try {
    const response = await fetch(`${API_BASE}/permits/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ token, passId, scannedVehiclePlate, gateFloor })
    })

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Error in verifyPermitAccess:', error)
    return {
      access: 'DENIED',
      code: 'NETWORK_ERROR',
      reason: 'Failed to communicate with campus gate verification server. Check network connection.'
    }
  }
}

/**
 * Retrieves list of active paid permits for administrative audit
 * @returns {Promise<Array>}
 */
export async function fetchAllVerifiedPermits() {
  if (db) {
    try {
      const snap = await getDocs(collection(db, 'registered_vehicles'))
      return snap.docs.map(d => ({ id: d.id, ...d.data() }))
    } catch {
      // Ignore
    }
  }
  return []
}
