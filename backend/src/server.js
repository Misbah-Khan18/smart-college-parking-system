import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env from backend/.env and root .env
dotenv.config({ path: path.join(__dirname, '..', '.env') });
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

import webhookRoutes from './routes/webhookRoutes.js';
import permitRoutes from './routes/permitRoutes.js';
import gateRoutes from './routes/gateRoutes.js';
import parkingRoutes from './routes/parkingRoutes.js';

const app = express();
const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// CORS configuration (allow any origin for dev / LAN testing)
app.use(cors({
  origin: true,
  credentials: true
}));

// Webhook route MUST precede express.json() because it needs the raw body for signature verification
app.use('/api/webhooks', webhookRoutes);

// JSON body parser for all other routes
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api/permits', permitRoutes);
app.use('/api/gate', gateRoutes);
app.use('/api/parking', parkingRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Smart College Parking Backend',
    timestamp: new Date().toISOString()
  });
});

if (!process.env.VERCEL) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`====================================================`);
    console.log(`  Smart College Parking Backend listening on :${PORT}`);
    console.log(`  Client URL: ${CLIENT_URL}`);
    console.log(`  Stripe Key: ${process.env.STRIPE_SECRET_KEY ? 'Configured' : 'Missing'}`);
    console.log(`====================================================`);
  });
}

export default app;
