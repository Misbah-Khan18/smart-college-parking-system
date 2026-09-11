/**
 * Frontend Parking API Service
 * Interacts with the Express Backend (Port 5000)
 */

const API_BASE = '/api';

/**
 * Create a Stripe Checkout Session for a Daily, Monthly, or Semester permit
 * @param {Object} data
 */
export async function createPermitCheckoutSession(data) {
  const response = await fetch(`${API_BASE}/permits/checkout-session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || err.message || 'Failed to create permit checkout session');
  }
  return response.json();
}

/**
 * Simulate verified Stripe webhook execution for testing/dev environments
 * @param {string} permitId
 */
export async function simulateStripeWebhookPayment(permitId) {
  const response = await fetch(`${API_BASE}/webhooks/stripe-test-simulate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ permitId })
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || err.message || 'Webhook simulation failed');
  }
  return response.json();
}

/**
 * Get all permits and active parked session for a student / vehicle
 * @param {string} studentId
 * @param {string} plate
 */
export async function getStudentPermits(studentId, plate) {
  const params = new URLSearchParams();
  if (plate) params.append('plate', plate);
  const url = `${API_BASE}/permits/student/${encodeURIComponent(studentId || 'guest')}?${params.toString()}`;
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch student permits');
  }
  return response.json();
}

/**
 * Get a specific permit by ID
 * @param {string} permitId
 */
export async function getPermitById(permitId) {
  const response = await fetch(`${API_BASE}/permits/${encodeURIComponent(permitId)}`);
  if (!response.ok) {
    throw new Error('Permit not found');
  }
  return response.json();
}

/**
 * Gate Ingress: verify permit + payment + validity + vehicle, dynamic bay allocation
 * @param {Object} credentials { qrToken, plate, studentName, vehicleType, preferredFloor }
 */
export async function verifyAndEnterGate(credentials) {
  const response = await fetch(`${API_BASE}/gate/verify-and-enter`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials)
  });
  const data = await response.json();
  if (!response.ok) {
    const err = new Error(data.message || 'Entry Denied');
    err.status = data.status || 'ACCESS_DENIED';
    err.code = data.code;
    err.currentSession = data.currentSession;
    throw err;
  }
  return data;
}

/**
 * Gate Egress: check out vehicle, close session, free bay immediately, record history
 * @param {Object} target { plate, slotId }
 */
export async function exitGate(target) {
  const response = await fetch(`${API_BASE}/gate/exit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(target)
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Exit Failed');
  }
  return data;
}

/**
 * Fetch full real-time parking system state from backend
 */
export async function getParkingState() {
  const response = await fetch(`${API_BASE}/parking/state`);
  if (!response.ok) {
    throw new Error('Failed to fetch parking state');
  }
  return response.json();
}

/**
 * Fetch parking slots from backend
 */
export async function getParkingSlots() {
  const response = await fetch(`${API_BASE}/parking/slots`);
  if (!response.ok) {
    throw new Error('Failed to fetch parking slots');
  }
  return response.json();
}

/**
 * Fetch parking history from backend
 */
export async function getParkingHistory() {
  const response = await fetch(`${API_BASE}/parking/history`);
  if (!response.ok) {
    throw new Error('Failed to fetch parking history');
  }
  return response.json();
}
