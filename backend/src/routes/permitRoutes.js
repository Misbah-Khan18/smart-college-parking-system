import express from 'express';
import Stripe from 'stripe';
import { store } from '../store/parkingStore.js';

const router = express.Router();

const stripeSecretKey = process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder_key';
const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
const stripe = new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' });

const PERMIT_PRICES = {
  Daily: { amount: 20, days: 1, label: 'Single Day Parking Permit' },
  Monthly: { amount: 300, days: 30, label: '30-Day Monthly Campus Permit' },
  Semester: { amount: 1200, days: 180, label: 'Semester Full Term Pass (180 Days)' }
};

/**
 * POST /api/permits/checkout-session
 * Initialize permit purchase and Stripe checkout session
 */
router.post('/checkout-session', async (req, res) => {
  try {
    const {
      studentId = 'student-guest',
      studentName = 'Student Member',
      rollNumber = '',
      stream = '',
      phoneNumber = '',
      vehiclePlate,
      vehicleType = 'scooty',
      permitType = 'Monthly'
    } = req.body;

    if (!vehiclePlate) {
      return res.status(400).json({ error: 'vehiclePlate is required' });
    }

    const tier = PERMIT_PRICES[permitType] || PERMIT_PRICES.Monthly;
    const cleanPlate = vehiclePlate.toUpperCase().trim();
    const permitId = `SOC-PRM-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

    const now = Date.now();
    const validUntilDate = new Date(now + tier.days * 24 * 60 * 60 * 1000);

    const permit = {
      id: permitId,
      studentId,
      studentName,
      rollNumber,
      stream,
      phoneNumber,
      vehiclePlate: cleanPlate,
      vehicleType: vehicleType.toLowerCase(),
      permitType,
      amount: tier.amount,
      status: 'PENDING_PAYMENT',
      paymentStatus: 'UNPAID',
      validFrom: new Date(now).toISOString(),
      validUntil: validUntilDate.toISOString(),
      qrToken: null,
      qrCodeDataUrl: null,
      stripeSessionId: null,
      createdAt: now
    };

    let checkoutUrl = null;
    let sessionId = null;
    const isRealStripe = stripeSecretKey && !stripeSecretKey.includes('placeholder');

    if (isRealStripe) {
      try {
        const session = await stripe.checkout.sessions.create({
          payment_method_types: ['card'],
          line_items: [
            {
              price_data: {
                currency: 'inr',
                product_data: {
                  name: `SOC Parking - ${tier.label}`,
                  description: `Campus permit for ${cleanPlate} (${vehicleType}). Valid for ${tier.days} days.`
                },
                unit_amount: tier.amount * 100 // Stripe expects smallest currency unit (paise)
              },
              quantity: 1
            }
          ],
          mode: 'payment',
          client_reference_id: permitId,
          metadata: {
            permitId,
            vehiclePlate: cleanPlate,
            permitType
          },
          success_url: `${clientUrl}?payment_success=true&permit_id=${permitId}&session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${clientUrl}?payment_cancelled=true`
        });

        sessionId = session.id;
        checkoutUrl = session.url;
        permit.stripeSessionId = sessionId;
      } catch (stripeErr) {
        console.warn(`[Stripe Checkout] Live session creation failed (${stripeErr.message}). Falling back to test session.`);
        sessionId = `cs_test_${permitId}`;
        permit.stripeSessionId = sessionId;
      }
    } else {
      sessionId = `cs_test_${permitId}`;
      permit.stripeSessionId = sessionId;
    }

    store.createPermit(permit);

    res.json({
      success: true,
      permitId,
      sessionId,
      checkoutUrl,
      permit,
      isRealStripe
    });
  } catch (err) {
    console.error('[Create Checkout Session Error]:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/permits/student/:studentId
 * List all permits and active sessions for a student/vehicle
 */
router.get('/student/:studentId', (req, res) => {
  const { studentId } = req.params;
  const { plate } = req.query;

  const permits = store.getPermitsByStudent(studentId, plate);
  const activeSession = store.findActiveSessionByVehicle(plate);

  res.json({
    permits,
    activeSession: activeSession || null
  });
});

/**
 * GET /api/permits/:id
 * Retrieve a specific permit
 */
router.get('/:id', (req, res) => {
  const permit = store.getPermit(req.params.id);
  if (!permit) {
    return res.status(404).json({ error: 'Permit not found' });
  }
  const activeSession = store.findActiveSessionByVehicle(permit.vehiclePlate);
  res.json({ permit, activeSession: activeSession || null });
});

export default router;
