import express from 'express';
import Stripe from 'stripe';
import QRCode from 'qrcode';
import { store } from '../store/parkingStore.js';

const router = express.Router();

const stripeSecretKey = process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder_key';
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_placeholder_secret';
const stripe = new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' });

/**
 * Helper to activate a permit and generate its secure QR token & real QR image
 */
export async function activatePermitAndGenerateQR(permitId) {
  const permit = store.getPermit(permitId);
  if (!permit) {
    throw new Error(`Permit ${permitId} not found`);
  }

  // Generate secure token (NO payment data, only verification token)
  const tokenPayload = `SOC:PERMIT:${permit.id}:${permit.vehiclePlate}:${Date.now()}`;
  const qrToken = `SOC-PRM-${Buffer.from(tokenPayload).toString('base64url').slice(0, 32)}`;

  // Generate real QR code image data URL
  const qrCodeDataUrl = await QRCode.toDataURL(qrToken, {
    width: 280,
    margin: 2,
    color: {
      dark: '#0f172a',
      light: '#ffffff'
    }
  });

  const updated = store.updatePermit(permitId, {
    status: 'ACTIVE',
    paymentStatus: 'PAID',
    paidAt: Date.now(),
    qrToken,
    qrCodeDataUrl
  });

  console.log(`[Webhook] Permit ${permitId} activated successfully. Real QR code generated.`);
  return updated;
}

/**
 * Real Stripe Webhook Handler
 * Expects raw body for signature verification
 */
router.post('/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    if (stripeWebhookSecret && stripeWebhookSecret !== 'whsec_placeholder_secret') {
      event = stripe.webhooks.constructEvent(req.body, sig, stripeWebhookSecret);
    } else {
      // In dev mode when secret is placeholder, parse json body directly
      event = JSON.parse(req.body.toString());
    }
  } catch (err) {
    console.error(`[Webhook] Signature verification failed:`, err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const permitId = session.client_reference_id || session.metadata?.permitId;

    if (permitId) {
      try {
        await activatePermitAndGenerateQR(permitId);
      } catch (err) {
        console.error(`[Webhook] Error activating permit ${permitId}:`, err.message);
      }
    }
  }

  res.json({ received: true });
});

/**
 * Developer Simulation Endpoint for instant local testing without Stripe CLI
 */
router.post('/stripe-test-simulate', express.json(), async (req, res) => {
  try {
    const { permitId } = req.body;
    if (!permitId) {
      return res.status(400).json({ error: 'permitId is required' });
    }

    const updated = await activatePermitAndGenerateQR(permitId);
    res.json({
      success: true,
      message: 'Permit payment verified & activated with real QR code.',
      permit: updated
    });
  } catch (err) {
    console.error(`[Webhook Sim] Error:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
