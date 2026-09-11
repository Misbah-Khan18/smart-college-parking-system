import express from 'express';
import { store } from '../store/parkingStore.js';

const router = express.Router();

function formatDuration(ms) {
  if (!ms || ms <= 0) return '1 min';
  const totalMins = Math.floor(ms / (1000 * 60));
  const hrs = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  if (hrs === 0) return `${Math.max(1, mins)} min`;
  return `${hrs} hr ${mins} min`;
}

/**
 * POST /api/gate/verify-and-enter
 * Ingress verification & dynamic bay assignment
 */
router.post('/verify-and-enter', (req, res) => {
  try {
    const {
      qrToken,
      plate,
      studentName = 'Student Member',
      vehicleType = 'scooty',
      preferredFloor
    } = req.body;

    let permit = null;

    // 1. Resolve Permit
    if (qrToken) {
      permit = store.getPermitByToken(qrToken);
      if (!permit) {
        return res.status(403).json({
          success: false,
          status: 'ACCESS_DENIED',
          code: 'INVALID_TOKEN',
          message: 'Access Denied: Invalid or unrecognized QR permit token.'
        });
      }
    } else if (plate) {
      const cleanPlate = plate.toUpperCase().trim();
      const permits = store.getPermitsByStudent(null, cleanPlate);
      // Pick active paid permit if available
      permit = permits.find(p => p.status === 'ACTIVE' && p.paymentStatus === 'PAID');
      
      if (!permit) {
        return res.status(403).json({
          success: false,
          status: 'ACCESS_DENIED',
          code: 'NO_ACTIVE_PERMIT',
          message: `Access Denied: No active paid permit found for vehicle ${cleanPlate}. Please purchase a permit.`
        });
      }
    } else {
      return res.status(400).json({
        success: false,
        status: 'ACCESS_DENIED',
        code: 'MISSING_CREDENTIALS',
        message: 'Provide either a valid QR token or a registered license plate.'
      });
    }

    // 2. Validate Payment & Status
    if (permit.status !== 'ACTIVE' || permit.paymentStatus !== 'PAID') {
      return res.status(403).json({
        success: false,
        status: 'ACCESS_DENIED',
        code: 'UNPAID_PERMIT',
        message: 'Access Denied: Permit is not marked as PAID. Complete Stripe checkout first.'
      });
    }

    // 3. Validate Date Expiry
    const now = Date.now();
    const expiryTimestamp = new Date(permit.validUntil).getTime();
    if (now > expiryTimestamp) {
      store.updatePermit(permit.id, { status: 'EXPIRED' });
      return res.status(403).json({
        success: false,
        status: 'EXPIRED',
        code: 'PERMIT_EXPIRED',
        message: `Access Denied: Permit expired on ${new Date(permit.validUntil).toLocaleDateString()}. Please renew.`
      });
    }

    // 4. Validate Vehicle isn't already inside campus
    const existingSession = store.findActiveSessionByVehicle(permit.vehiclePlate);
    if (existingSession) {
      return res.status(409).json({
        success: false,
        status: 'ACCESS_DENIED',
        code: 'ALREADY_PARKED',
        message: `Access Denied: Vehicle ${permit.vehiclePlate} is already parked in Bay ${existingSession.slotId} (${existingSession.floor}).`,
        currentSession: existingSession
      });
    }

    // 5. Dynamic Bay Allocation
    const vType = permit.vehicleType || vehicleType || 'scooty';
    const allocatedSlot = store.findAvailableSlot(vType, preferredFloor);

    if (!allocatedSlot) {
      return res.status(422).json({
        success: false,
        status: 'PARKING_FULL',
        code: 'PARKING_FULL',
        message: `PARKING FULL: All ${vType === 'scooty' ? 'Ground Floor Scooty' : 'Basement Bike'} bays are currently occupied. Please wait for an exit release.`
      });
    }

    const nowTimeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });

    // 6. Create Active Session & Occupy Slot
    const sessionId = `SESS-${Date.now().toString(36).toUpperCase()}-${allocatedSlot.id}`;
    const session = store.createActiveSession({
      id: sessionId,
      permitId: permit.id,
      vehiclePlate: permit.vehiclePlate,
      studentName: permit.studentName || studentName,
      vehicleType: vType,
      slotId: allocatedSlot.id,
      floor: allocatedSlot.floor,
      section: allocatedSlot.section,
      entryTime: nowTimeStr,
      entryTimestamp: now,
      status: 'ACTIVE'
    });

    // Mark slot occupied
    store.updateSlot(allocatedSlot.id, {
      status: 'OCCUPIED',
      plate: permit.vehiclePlate,
      owner: permit.studentName || studentName,
      type: vType,
      entryTime: nowTimeStr,
      entryTimestamp: now
    });

    // Update permit with active session reference
    store.updatePermit(permit.id, {
      currentAssignedSlotId: allocatedSlot.id,
      activeSessionId: sessionId
    });

    console.log(`[Gate Ingress] Vehicle ${permit.vehiclePlate} dynamically allocated Bay ${allocatedSlot.id} (${allocatedSlot.floor}).`);

    res.json({
      success: true,
      status: 'ACCESS_GRANTED',
      message: `Access Granted! Boom barrier opening. Proceed to assigned Bay ${allocatedSlot.id}.`,
      slotId: allocatedSlot.id,
      floor: allocatedSlot.floor,
      section: allocatedSlot.section,
      slot: allocatedSlot,
      session,
      permit
    });
  } catch (err) {
    console.error('[Gate Entry Error]:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/gate/exit
 * Egress checkout & immediate bay release
 */
router.post('/exit', (req, res) => {
  try {
    const { plate, slotId } = req.body;

    let session = null;
    if (plate) {
      session = store.findActiveSessionByVehicle(plate);
    } else if (slotId) {
      session = store.findActiveSessionBySlot(slotId);
    }

    // If no session found in store, check if slot has a plate recorded
    let slot = null;
    if (session) {
      slot = store.getSlot(session.slotId);
    } else if (slotId) {
      slot = store.getSlot(slotId);
    } else if (plate) {
      slot = store.getSlots().find(s => s.plate && s.plate.replace(/[^A-Z0-9]/gi, '').toUpperCase() === plate.replace(/[^A-Z0-9]/gi, '').toUpperCase());
    }

    if (!session && (!slot || slot.status !== 'OCCUPIED')) {
      return res.status(404).json({
        success: false,
        message: 'No active parking session found for this vehicle or bay.'
      });
    }

    const now = Date.now();
    const entryTimestamp = session ? session.entryTimestamp : (slot?.entryTimestamp || now - 1800000);
    const durationMs = now - entryTimestamp;
    const durationStr = formatDuration(durationMs);
    const exitTimeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    const targetSlotId = session ? session.slotId : slot.id;
    const targetPlate = session ? session.vehiclePlate : slot.plate;
    const targetOwner = session ? session.studentName : (slot.owner || 'Student');

    // Create history entry
    const historyEntry = {
      id: `HIST-${Date.now().toString(36).toUpperCase()}`,
      studentName: targetOwner,
      vehicleNumber: targetPlate,
      vehicleType: session?.vehicleType || slot?.type || 'scooty',
      slotId: targetSlotId,
      floor: slot?.floor || 'Ground Floor',
      entryTime: session?.entryTime || slot?.entryTime || 'Earlier',
      exitTime: exitTimeStr,
      duration: durationStr,
      date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    };

    store.addHistory(historyEntry);

    // Free the slot back to AVAILABLE
    store.updateSlot(targetSlotId, {
      status: 'AVAILABLE',
      plate: '',
      owner: '',
      rollNumber: '',
      stream: '',
      phoneNumber: '',
      entryTime: null,
      entryTimestamp: null
    });

    // Close active session
    if (session) {
      store.closeSession(session.id);
      if (session.permitId) {
        store.updatePermit(session.permitId, {
          currentAssignedSlotId: null,
          activeSessionId: null
        });
      }
    }

    console.log(`[Gate Egress] Vehicle ${targetPlate} exited. Bay ${targetSlotId} released.`);

    res.json({
      success: true,
      message: `Vehicle ${targetPlate} successfully checked out. Bay ${targetSlotId} released immediately.`,
      slotId: targetSlotId,
      duration: durationStr,
      historyEntry
    });
  } catch (err) {
    console.error('[Gate Exit Error]:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
