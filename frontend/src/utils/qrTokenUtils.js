/**
 * QR Code Token Utilities & Purpose Separation Architecture
 * 
 * Separates:
 * 1. PAYMENT QR (Used strictly for ₹10 UPI / Google Pay transactions)
 * 2. PARKING ENTRY QR (Used strictly at Security Gate for vehicle entry)
 */

export const QR_TYPES = {
  PAYMENT: 'PAYMENT',
  PARKING_ENTRY: 'PARKING_ENTRY',
  UNKNOWN: 'UNKNOWN'
}

/**
 * Generates a cryptographically random, collision-free entry token.
 * Every parking reservation gets a unique token.
 * @param {string} [prefix='ENTRY']
 * @returns {string} e.g. "ENTRY-1740001234-a3f9c1b4"
 */
export function generateUniqueEntryToken(prefix = 'ENTRY') {
  const timestamp = Date.now()
  let randomPart = ''
  
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const bytes = new Uint8Array(4)
    crypto.getRandomValues(bytes)
    randomPart = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')
  } else {
    randomPart = Math.random().toString(36).substring(2, 10)
  }

  return `${prefix}-${timestamp}-${randomPart}`
}

/**
 * Creates structured JSON string for Parking Entry QR code.
 * @param {Object} params
 * @param {string} params.entryToken
 * @param {string} params.reservationId
 * @param {string} params.slotId
 * @param {string} params.plate
 * @param {string} params.vehicleType
 * @param {string} params.floor
 * @returns {string} JSON string
 */
export function createEntryQrPayload({
  entryToken,
  reservationId = '',
  slotId = '',
  plate = '',
  vehicleType = 'scooty',
  floor = 'Ground Floor'
}) {
  const payload = {
    type: QR_TYPES.PARKING_ENTRY,
    entryToken: entryToken || generateUniqueEntryToken(),
    reservationId,
    slotId,
    plate,
    vehicleType,
    floor,
    createdAt: Date.now()
  }
  return JSON.stringify(payload)
}

/**
 * Creates UPI Payment URI for Google Pay / PhonePe / UPI apps.
 * @param {Object} params
 * @param {number} [params.amount=10]
 * @param {string} [params.slotId='']
 * @param {string} [params.plate='']
 * @param {string} [params.vpa='parking.soc@upi']
 * @param {string} [params.merchantName='SOCMAC Smart Park']
 * @returns {string} UPI URI string
 */
export function createUpiPaymentUri({
  amount = 10,
  slotId = '',
  plate = '',
  vpa = 'parking.soc@upi',
  merchantName = 'SOCMAC Smart Park'
}) {
  const fee = typeof amount === 'number' ? amount.toFixed(2) : '10.00'
  const note = `SOCMAC-${slotId || 'PARK'}-${(plate || '').replace(/[^A-Z0-9]/gi, '')}`
  return `upi://pay?pa=${encodeURIComponent(vpa)}&pn=${encodeURIComponent(merchantName)}&am=${encodeURIComponent(fee)}&cu=INR&tn=${encodeURIComponent(note)}`
}

/**
 * Detects the purpose/type of a scanned QR string.
 * @param {string} rawString
 * @returns {string} 'PAYMENT' | 'PARKING_ENTRY' | 'UNKNOWN'
 */
export function detectQrType(rawString) {
  if (!rawString || typeof rawString !== 'string') {
    return QR_TYPES.UNKNOWN
  }

  const trimmed = rawString.trim()

  // 1. Check for UPI / Payment URI or Payment token
  if (
    trimmed.startsWith('upi://') ||
    trimmed.startsWith('upi:') ||
    trimmed.includes('pa=') ||
    trimmed.includes('&am=') ||
    trimmed.startsWith('PAYMENT-') ||
    trimmed.startsWith('PAY-') ||
    trimmed.includes('payment_intent') ||
    trimmed.includes('stripe.com') ||
    trimmed.includes('gpay://') ||
    trimmed.includes('phonepe://')
  ) {
    return QR_TYPES.PAYMENT
  }

  // 2. Check for JSON payload
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed)
      if (parsed.type === QR_TYPES.PAYMENT || parsed.purpose === 'PAYMENT' || parsed.action === 'PAY') {
        return QR_TYPES.PAYMENT
      }
      if (parsed.type === QR_TYPES.PARKING_ENTRY || parsed.entryToken || parsed.purpose === 'ENTRY') {
        return QR_TYPES.PARKING_ENTRY
      }
    } catch {
      // Not JSON, continue checking
    }
  }

  // 3. Check for Entry QR token formats
  if (
    trimmed.startsWith('ENTRY-') ||
    trimmed.startsWith('SOC-RES-') ||
    trimmed.startsWith('SOC-') ||
    trimmed.startsWith('RES-') ||
    trimmed.startsWith('PASS-') ||
    trimmed.startsWith('SMP-')
  ) {
    return QR_TYPES.PARKING_ENTRY
  }

  return QR_TYPES.UNKNOWN
}

/**
 * Parses an entry QR payload (either structured JSON or token string).
 * @param {string} rawString
 * @returns {{ entryToken: string, reservationId?: string, slotId?: string, plate?: string, raw: string }}
 */
export function parseEntryQr(rawString) {
  if (!rawString || typeof rawString !== 'string') {
    return { entryToken: '', raw: '' }
  }

  const trimmed = rawString.trim()

  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed)
      return {
        entryToken: parsed.entryToken || parsed.token || parsed.reservationId || parsed.passId || '',
        reservationId: parsed.reservationId || '',
        slotId: parsed.slotId || '',
        plate: parsed.plate || '',
        vehicleType: parsed.vehicleType || '',
        floor: parsed.floor || '',
        raw: trimmed
      }
    } catch {
      // ignore
    }
  }

  return {
    entryToken: trimmed,
    raw: trimmed
  }
}
