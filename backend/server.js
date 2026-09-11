import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import Stripe from 'stripe'
import crypto from 'crypto'
import QRCode from 'qrcode'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.join(__dirname, '.env') })

const app = express()
const PORT = process.env.PORT || 5000
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173'
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || ''
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || ''

// Initialize Stripe if valid key exists
const isRealStripeConfigured = STRIPE_SECRET_KEY && !STRIPE_SECRET_KEY.includes('placeholder')
const stripe = isRealStripeConfigured ? new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' }) : null

// In-Memory Database / Local Storage persistence for Registrations, Payments & Permits
const DATA_FILE = path.join(__dirname, 'data_store.json')

function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'))
    }
  } catch (err) {
    console.warn('Could not read local data_store:', err)
  }
  return {
    registrations: {},
    permits: {},
    checkoutSessions: {}
  }
}

function saveData(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8')
  } catch (err) {
    console.error('Failed to write data_store:', err)
  }
}

let db = loadData()

// PERMIT PRICING PLANS (INR - Indian Rupees in subunit Paise for Stripe)
const PERMIT_PLANS = {
  daily: {
    id: 'daily',
    name: 'Daily Parking Pass',
    durationDays: 1,
    amountINR: 50,
    amountPaise: 5000,
    description: '1-Day single admission pass for campus two-wheeler bays'
  },
  monthly: {
    id: 'monthly',
    name: '30-Day Monthly Permit',
    durationDays: 30,
    amountINR: 500,
    amountPaise: 50000,
    description: '30-Day unlimited contactless boom barrier ingress permit'
  },
  semester: {
    id: 'semester',
    name: 'Semester Term Pass',
    durationDays: 180,
    amountINR: 1200,
    amountPaise: 120000,
    description: 'Full semester term pass with priority floor bay allocation'
  }
}

// 1. Stripe Webhook Raw Body Handling (MUST be configured BEFORE express.json())
app.post(
  '/api/webhooks/stripe',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const sig = req.headers['stripe-signature']
    let event

    if (stripe && STRIPE_WEBHOOK_SECRET && !STRIPE_WEBHOOK_SECRET.includes('placeholder')) {
      try {
        event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_WEBHOOK_SECRET)
      } catch (err) {
        console.error('⚠️  Webhook signature verification failed:', err.message)
        return res.status(400).send(`Webhook Error: ${err.message}`)
      }
    } else {
      // In development/test mode without live webhook signature
      try {
        event = JSON.parse(req.body.toString())
      } catch (err) {
        return res.status(400).send('Invalid webhook JSON payload')
      }
    }

    console.log(`[Stripe Webhook] Received Event Type: ${event.type}`)

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object
      await handleCheckoutCompleted(session)
    }

    res.json({ received: true })
  }
)

// Standard JSON & CORS middleware for all other endpoints
app.use(cors({ origin: '*' }))
app.use(express.json())

/**
 * Core business logic for provisioning permit when checkout is paid
 */
async function handleCheckoutCompleted(session) {
  const { registrationId, planId, studentName, rollNumber, vehicleNumber, vehicleType, floor } =
    session.metadata || {}

  console.log(`[Stripe] Processing completed checkout for Registration #${registrationId} (${vehicleNumber})`)

  // Check duplicate processing
  if (db.registrations[registrationId]?.paymentStatus === 'PAID') {
    console.log(`[Stripe] Registration #${registrationId} already paid. Skipping duplicate.`)
    return db.registrations[registrationId]
  }

  const plan = PERMIT_PLANS[planId] || PERMIT_PLANS.monthly
  const durationDays = plan.durationDays
  const now = new Date()
  const expiryDate = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000)

  // Generate cryptographic secure permit verification token
  const secureToken = crypto.randomBytes(24).toString('hex')
  const passId = `SOC-${(floor === 'Ground Floor' ? 'G' : 'B')}-${Date.now().toString().slice(-4)}`

  // Tamper-resistant verification URL encoded in the QR code (Never raw card data!)
  const verifyUrl = `${CLIENT_URL}/verify-permit?token=${secureToken}&passId=${passId}`

  // Generate QR Code SVG / DataURL on backend
  let qrCodeDataUrl = ''
  try {
    qrCodeDataUrl = await QRCode.toDataURL(verifyUrl, {
      errorCorrectionLevel: 'H',
      margin: 2,
      width: 280,
      color: {
        dark: '#030814',
        light: '#ffffff'
      }
    })
  } catch (err) {
    console.error('Failed to generate QR Code:', err)
  }

  const permitData = {
    passId,
    secureToken,
    verifyUrl,
    qrCodeDataUrl,
    registrationId,
    studentName: studentName || 'Campus Student',
    rollNumber: rollNumber || 'S2410701',
    vehicleNumber: vehicleNumber || 'MH-12-AB-1234',
    vehicleType: vehicleType || 'scooty',
    allocatedFloor: floor || 'Ground Floor',
    planName: plan.name,
    amountPaidINR: plan.amountINR,
    currency: 'INR',
    stripeSessionId: session.id,
    stripePaymentIntent: session.payment_intent || 'pi_simulated_' + Date.now(),
    issuedAt: now.toISOString(),
    expiresAt: expiryDate.toISOString(),
    status: 'ACTIVE',
    paymentStatus: 'PAID'
  }

  // Update Database
  db.permits[secureToken] = permitData
  db.permits[passId] = permitData // index by passId as well

  db.registrations[registrationId] = {
    ...(db.registrations[registrationId] || {}),
    id: registrationId,
    studentName,
    rollNumber,
    vehicleNumber,
    vehicleType,
    allocatedFloor: floor,
    paymentStatus: 'PAID',
    registrationStatus: 'ACTIVE',
    permitPassId: passId,
    secureToken,
    stripeSessionId: session.id,
    updatedAt: now.toISOString()
  }

  db.checkoutSessions[session.id] = {
    status: 'completed',
    registrationId,
    passId,
    secureToken
  }

  saveData(db)
  return permitData
}

// =========================================================================
// API ENDPOINTS
// =========================================================================

/**
 * Health check
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    system: 'School of Commerce Smart Parking Payment & Verification Gateway',
    timestamp: new Date().toISOString(),
    stripeActive: Boolean(isRealStripeConfigured)
  })
})

/**
 * 1. POST /api/payments/create-checkout-session
 * Creates Stripe Checkout session for student parking permit
 */
app.post('/api/payments/create-checkout-session', async (req, res) => {
  try {
    const {
      studentName,
      rollNumber,
      stream,
      phoneNumber,
      vehicleNumber,
      vehicleType,
      planId = 'monthly'
    } = req.body

    if (!studentName || !rollNumber || !vehicleNumber) {
      return res.status(400).json({ error: 'Missing required registration details.' })
    }

    const cleanPlate = vehicleNumber.toUpperCase().trim()
    const cleanRoll = rollNumber.toUpperCase().trim()
    const plan = PERMIT_PLANS[planId] || PERMIT_PLANS.monthly
    const allocatedFloor = vehicleType === 'scooty' ? 'Ground Floor' : 'Basement'

    // Duplicate active payment protection
    const existingRegistration = Object.values(db.registrations).find(
      (r) =>
        r.paymentStatus === 'PAID' &&
        r.registrationStatus === 'ACTIVE' &&
        (r.vehicleNumber === cleanPlate || r.rollNumber === cleanRoll)
    )

    if (existingRegistration) {
      return res.status(409).json({
        error: `Vehicle ${cleanPlate} / Roll ${cleanRoll} already holds an active paid permit (${existingRegistration.permitPassId}).`,
        existingPassId: existingRegistration.permitPassId,
        alreadyActive: true
      })
    }

    const registrationId = `REG-2026-${Date.now().toString().slice(-6)}`

    // Store pending registration
    db.registrations[registrationId] = {
      id: registrationId,
      studentName,
      rollNumber: cleanRoll,
      stream: stream || 'BCA',
      phoneNumber: phoneNumber || '',
      vehicleNumber: cleanPlate,
      vehicleType: vehicleType || 'scooty',
      allocatedFloor,
      planId: plan.id,
      amountINR: plan.amountINR,
      paymentStatus: 'PENDING_PAYMENT',
      registrationStatus: 'PENDING',
      createdAt: new Date().toISOString()
    }
    saveData(db)

    const metadata = {
      registrationId,
      planId: plan.id,
      studentName,
      rollNumber: cleanRoll,
      vehicleNumber: cleanPlate,
      vehicleType: vehicleType || 'scooty',
      floor: allocatedFloor
    }

    // If live Stripe is configured, create real Stripe Checkout Session
    if (stripe) {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'inr',
              product_data: {
                name: `School of Commerce - ${plan.name}`,
                description: `${plan.description} for Vehicle ${cleanPlate} (${allocatedFloor})`,
                metadata: {
                  vehicleNumber: cleanPlate,
                  rollNumber: cleanRoll
                }
              },
              unit_amount: plan.amountPaise
            },
            quantity: 1
          }
        ],
        mode: 'payment',
        success_url: `${CLIENT_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}&reg_id=${registrationId}`,
        cancel_url: `${CLIENT_URL}/payment-cancel?reg_id=${registrationId}&plate=${cleanPlate}`,
        customer_email: req.body.email || undefined,
        metadata
      })

      db.checkoutSessions[session.id] = {
        sessionId: session.id,
        registrationId,
        status: 'open'
      }
      saveData(db)

      return res.json({
        success: true,
        sessionId: session.id,
        checkoutUrl: session.url,
        registrationId,
        plan
      })
    } else {
      // Test/Demo Sandbox Mode when no live Stripe secret key is present
      const simulatedSessionId = `cs_test_simulated_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`
      const simulatedCheckoutUrl = `${CLIENT_URL}/payment-success?session_id=${simulatedSessionId}&reg_id=${registrationId}&mode=sandbox`

      db.checkoutSessions[simulatedSessionId] = {
        sessionId: simulatedSessionId,
        registrationId,
        status: 'open',
        metadata
      }
      saveData(db)

      return res.json({
        success: true,
        sessionId: simulatedSessionId,
        checkoutUrl: simulatedCheckoutUrl,
        registrationId,
        plan,
        isSandbox: true,
        message: 'Sandbox mode active. Redirecting to instant test settlement.'
      })
    }
  } catch (error) {
    console.error('Create Checkout Session Error:', error)
    res.status(500).json({ error: error.message || 'Failed to create checkout session.' })
  }
})

/**
 * 2. GET /api/payments/session/:sessionId
 * Retrieves or verifies the status of a checkout session
 */
app.get('/api/payments/session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params

    if (sessionId.startsWith('cs_test_simulated_')) {
      const sessionRecord = db.checkoutSessions[sessionId]
      if (sessionRecord && sessionRecord.metadata) {
        const permit = await handleCheckoutCompleted({
          id: sessionId,
          payment_intent: 'pi_test_settled_' + Date.now(),
          metadata: sessionRecord.metadata
        })
        return res.json({
          status: 'PAID',
          permit,
          registration: db.registrations[sessionRecord.metadata.registrationId]
        })
      }
    }

    if (stripe) {
      const session = await stripe.checkout.sessions.retrieve(sessionId)
      if (session.payment_status === 'paid') {
        const permit = await handleCheckoutCompleted(session)
        return res.json({
          status: 'PAID',
          permit,
          registration: db.registrations[session.metadata?.registrationId]
        })
      }
      return res.json({
        status: session.payment_status.toUpperCase(),
        session
      })
    }

    // Check in-memory permits
    const permit = Object.values(db.permits).find((p) => p.stripeSessionId === sessionId)
    if (permit) {
      return res.json({
        status: 'PAID',
        permit,
        registration: db.registrations[permit.registrationId]
      })
    }

    res.status(404).json({ error: 'Session not found or payment incomplete.' })
  } catch (err) {
    console.error('Retrieve Session Error:', err)
    res.status(500).json({ error: err.message || 'Failed to retrieve session.' })
  }
})

/**
 * 3. POST /api/permits/verify
 * QR Scanner and Gate Terminal verification endpoint
 * Checks payment status, active dates, vehicle match, and zone rules
 */
app.post('/api/permits/verify', (req, res) => {
  try {
    const { token, passId, scannedVehiclePlate, gateFloor } = req.body

    const queryKey = token || passId
    if (!queryKey) {
      return res.status(400).json({
        access: 'DENIED',
        reason: 'No permit token or pass ID provided in verification request.'
      })
    }

    const permit = db.permits[queryKey] || Object.values(db.permits).find(p => p.secureToken === queryKey || p.passId === queryKey)

    if (!permit) {
      return res.status(200).json({
        access: 'DENIED',
        code: 'PERMIT_NOT_FOUND',
        reason: 'Invalid or counterfeit QR permit token. No registered permit on file.',
        verifiedAt: new Date().toISOString()
      })
    }

    // 1. Check Payment Status
    if (permit.paymentStatus !== 'PAID') {
      return res.status(200).json({
        access: 'DENIED',
        code: 'PAYMENT_UNPAID',
        reason: 'Permit payment is incomplete or unpaid.',
        permitDetails: {
          passId: permit.passId,
          studentName: permit.studentName,
          vehicleNumber: permit.vehicleNumber
        },
        verifiedAt: new Date().toISOString()
      })
    }

    // 2. Check Expiry
    const now = new Date()
    const expiry = new Date(permit.expiresAt)
    if (now > expiry) {
      return res.status(200).json({
        access: 'DENIED',
        code: 'PERMIT_EXPIRED',
        reason: `Permit expired on ${expiry.toLocaleDateString()}. Please renew subscription.`,
        permitDetails: permit,
        verifiedAt: new Date().toISOString()
      })
    }

    // 3. Optional Vehicle Plate Match (if scanned via ANPR)
    if (scannedVehiclePlate) {
      const cleanScanned = scannedVehiclePlate.replace(/[^A-Z0-9]/g, '').toUpperCase()
      const cleanPermitPlate = permit.vehicleNumber.replace(/[^A-Z0-9]/g, '').toUpperCase()
      if (cleanScanned !== cleanPermitPlate) {
        return res.status(200).json({
          access: 'DENIED',
          code: 'PLATE_MISMATCH',
          reason: `License plate mismatch: Permit is issued for ${permit.vehicleNumber}, but gate ANPR read ${scannedVehiclePlate}.`,
          permitDetails: permit,
          verifiedAt: new Date().toISOString()
        })
      }
    }

    // 4. Optional Gate Floor Regulation Match
    if (gateFloor && permit.allocatedFloor && gateFloor !== permit.allocatedFloor) {
      return res.status(200).json({
        access: 'DENIED',
        code: 'FLOOR_MISMATCH',
        reason: `Floor mismatch: Permit is restricted to ${permit.allocatedFloor}, but scanned at ${gateFloor}.`,
        permitDetails: permit,
        verifiedAt: new Date().toISOString()
      })
    }

    // ACCESS GRANTED
    res.json({
      access: 'GRANTED',
      code: 'VERIFIED_OK',
      message: 'Permit is valid and verified. Boom barrier opened.',
      permitDetails: {
        passId: permit.passId,
        studentName: permit.studentName,
        rollNumber: permit.rollNumber,
        vehicleNumber: permit.vehicleNumber,
        vehicleType: permit.vehicleType,
        allocatedFloor: permit.allocatedFloor,
        planName: permit.planName,
        amountPaid: `₹${permit.amountPaidINR}`,
        validUntil: new Date(permit.expiresAt).toLocaleDateString([], {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        }),
        issuedAt: permit.issuedAt
      },
      verifiedAt: new Date().toISOString()
    })
  } catch (err) {
    console.error('Permit Verification Error:', err)
    res.status(500).json({ access: 'DENIED', reason: 'Internal server error during verification.' })
  }
})

/**
 * 4. GET /api/permits
 * List all verified permits for admin dashboard
 */
app.get('/api/permits', (req, res) => {
  const uniquePermits = Object.values(db.permits).reduce((acc, p) => {
    if (!acc.some(item => item.passId === p.passId)) {
      acc.push(p)
    }
    return acc
  }, [])
  res.json({ permits: uniquePermits, total: uniquePermits.length })
})

app.listen(PORT, () => {
  console.log(`\n======================================================`)
  console.log(`🚀 Smart College Parking API running on port ${PORT}`)
  console.log(`💳 Stripe Mode: ${isRealStripeConfigured ? 'LIVE TEST KEYS LOADED' : 'SANDBOX / DEV MODE'}`)
  console.log(`🌐 CORS Allowed Origin: ${CLIENT_URL}`)
  console.log(`======================================================\n`)
})
