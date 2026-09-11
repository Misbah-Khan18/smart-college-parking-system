/**
 * Payment & Permit Verification API Service
 * Handles communication with the backend for Stripe Checkout and Gate QR Permit Verification.
 */

const API_BASE = '/api'

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
 * Verifies the status of a Stripe checkout session after return
 * @param {string} sessionId
 * @returns {Promise<Object>} { status: 'PAID', permit: {...}, registration: {...} }
 */
export async function verifyPaymentSession(sessionId) {
  try {
    const response = await fetch(`${API_BASE}/payments/session/${sessionId}`)
    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Failed to verify payment session.')
    }

    return data
  } catch (error) {
    console.error('Error in verifyPaymentSession:', error)
    throw error
  }
}

/**
 * Gate QR Scanner Verification
 * Validates permit token against backend rules (PAID status, validity dates, vehicle match, floor)
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
  try {
    const response = await fetch(`${API_BASE}/permits`)
    const data = await response.json()
    return data.permits || []
  } catch (error) {
    console.warn('Could not fetch permits from server:', error)
    return []
  }
}
