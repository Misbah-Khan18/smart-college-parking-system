import express from 'express';
import { store } from '../store/parkingStore.js';

const router = express.Router();

router.get('/state', (req, res) => {
  const slots = store.getSlots();
  const activeSessions = store.getActiveSessions();
  const history = store.getHistory();

  const total = slots.length;
  const occupied = slots.filter(s => s.status === 'OCCUPIED').length;
  const available = total - occupied;

  const groundTotal = slots.filter(s => s.floor === 'Ground Floor').length;
  const groundOccupied = slots.filter(s => s.floor === 'Ground Floor' && s.status === 'OCCUPIED').length;
  const groundAvailable = groundTotal - groundOccupied;

  const basementTotal = slots.filter(s => s.floor === 'Basement').length;
  const basementOccupied = slots.filter(s => s.floor === 'Basement' && s.status === 'OCCUPIED').length;
  const basementAvailable = basementTotal - basementOccupied;

  res.json({
    slots,
    activeSessions,
    history,
    stats: {
      total,
      occupied,
      available,
      ground: { total: groundTotal, occupied: groundOccupied, available: groundAvailable },
      basement: { total: basementTotal, occupied: basementOccupied, available: basementAvailable }
    }
  });
});

router.get('/slots', (req, res) => {
  res.json(store.getSlots());
});

router.get('/history', (req, res) => {
  res.json(store.getHistory());
});

export default router;
