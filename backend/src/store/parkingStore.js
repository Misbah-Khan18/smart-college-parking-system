// Generate initial 160 slots
function generateDefaultSlots() {
  const slots = [];

  // Ground floor: G-01 to G-140 (Scooties & Bikes)
  for (let i = 1; i <= 140; i++) {
    const id = `G-${String(i).padStart(2, '0')}`;
    let section = 'Front Section';
    if (i <= 16) section = 'Main Gate West Wing — Bike Grid';
    else if (i <= 32) section = 'Main Gate East Wing — Bike Grid';
    else if (i <= 44) section = 'Ingress West Flank — Bike Bay';
    else if (i <= 57) section = 'Ingress East Flank — Bike Bay';
    else if (i <= 80) section = 'Accounts & Exam IT Dept Wings';
    else if (i <= 110) section = 'South Concourse Under Ingress — Bike Row 1';
    else section = 'South Concourse Under Ingress — Bike Row 2';

    slots.push({
      id,
      floor: 'Ground Floor',
      section,
      zone: 'Ground Floor - Two-Wheeler Parking',
      type: i > 57 && i <= 80 ? 'scooty' : 'bike',
      isEv: i % 10 === 0,
      status: 'AVAILABLE',
      plate: '',
      owner: '',
      rollNumber: '',
      stream: '',
      phoneNumber: '',
      category: 'Student',
      entryTime: null,
      entryTimestamp: null
    });
  }

  // Basement: B-01 to B-80 (Bikes)
  for (let i = 1; i <= 80; i++) {
    const id = `B-${String(i).padStart(2, '0')}`;
    let section = 'Basement Central';
    if (i <= 20) section = 'Basement Level 1 - Ramp Ingress';
    else if (i <= 40) section = 'Basement Central Column Bay';
    else if (i <= 60) section = 'Basement Auditorium Underpass';
    else section = 'Basement South Exit Corridor';

    slots.push({
      id,
      floor: 'Basement',
      section,
      zone: 'Basement - Bike Parking',
      type: 'bike',
      isEv: i % 10 === 0,
      status: 'AVAILABLE',
      plate: '',
      owner: '',
      rollNumber: '',
      stream: '',
      phoneNumber: '',
      category: 'Student',
      entryTime: null,
      entryTimestamp: null
    });
  }

  return slots;
}

class ParkingStore {
  constructor() {
    this.slots = generateDefaultSlots();
    this.permits = [];
    this.activeSessions = [];
    this.history = [];
    // Disk persistence removed: Firestore is authoritative runtime state in production
  }

  loadFromDisk() {
    // In-memory fallback only for local dev / non-persisted test endpoints
  }

  saveToDisk() {
    // In-memory fallback only for local dev / non-persisted test endpoints
  }

  // Slots
  getSlots() {
    return this.slots;
  }

  getSlot(id) {
    return this.slots.find(s => s.id === id);
  }

  findAvailableSlot(vehicleType, preferredFloor) {
    const vType = (vehicleType || 'scooty').toLowerCase();
    const primaryFloor = preferredFloor || (vType === 'scooty' ? 'Ground Floor' : 'Basement');
    
    // Look for preferred floor first
    let slot = this.slots.find(s => s.status === 'AVAILABLE' && s.floor === primaryFloor && s.type === vType);
    if (!slot) {
      // Look for any available slot matching vehicle type
      slot = this.slots.find(s => s.status === 'AVAILABLE' && s.type === vType);
    }
    if (!slot) {
      // Fallback to any available slot regardless of type if desperate
      slot = this.slots.find(s => s.status === 'AVAILABLE');
    }
    return slot;
  }

  updateSlot(id, patch) {
    const idx = this.slots.findIndex(s => s.id === id);
    if (idx !== -1) {
      this.slots[idx] = { ...this.slots[idx], ...patch };
      this.saveToDisk();
      return this.slots[idx];
    }
    return null;
  }

  // Permits
  createPermit(permit) {
    this.permits.push(permit);
    this.saveToDisk();
    return permit;
  }

  getPermit(id) {
    return this.permits.find(p => p.id === id);
  }

  getPermitByToken(token) {
    if (!token) return null;
    const cleanToken = token.trim();
    return this.permits.find(p => p.qrToken === cleanToken || p.id === cleanToken);
  }

  getPermitBySessionId(sessionId) {
    return this.permits.find(p => p.stripeSessionId === sessionId);
  }

  getPermitsByStudent(studentId, plate) {
    const cleanPlate = (plate || '').replace(/[^A-Z0-9]/gi, '').toUpperCase();
    return this.permits.filter(p => {
      if (studentId && p.studentId === studentId) return true;
      if (cleanPlate && p.vehiclePlate.replace(/[^A-Z0-9]/gi, '').toUpperCase() === cleanPlate) return true;
      return false;
    });
  }

  updatePermit(id, patch) {
    const idx = this.permits.findIndex(p => p.id === id);
    if (idx !== -1) {
      this.permits[idx] = { ...this.permits[idx], ...patch };
      this.saveToDisk();
      return this.permits[idx];
    }
    return null;
  }

  // Active Sessions
  getActiveSessions() {
    return this.activeSessions;
  }

  findActiveSessionByVehicle(plate) {
    if (!plate) return null;
    const cleanTarget = plate.replace(/[^A-Z0-9]/gi, '').toUpperCase();
    return this.activeSessions.find(s => 
      s.status === 'ACTIVE' && 
      s.vehiclePlate.replace(/[^A-Z0-9]/gi, '').toUpperCase() === cleanTarget
    );
  }

  findActiveSessionBySlot(slotId) {
    return this.activeSessions.find(s => s.status === 'ACTIVE' && s.slotId === slotId);
  }

  createActiveSession(session) {
    this.activeSessions.push(session);
    this.saveToDisk();
    return session;
  }

  closeSession(sessionId) {
    const idx = this.activeSessions.findIndex(s => s.id === sessionId);
    if (idx !== -1) {
      this.activeSessions[idx].status = 'COMPLETED';
      this.activeSessions[idx].exitTimestamp = Date.now();
      this.activeSessions[idx].exitTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
      const completed = this.activeSessions[idx];
      this.activeSessions.splice(idx, 1);
      this.saveToDisk();
      return completed;
    }
    return null;
  }

  // History
  addHistory(entry) {
    this.history.unshift(entry);
    this.saveToDisk();
    return entry;
  }

  getHistory() {
    return this.history;
  }
}

export const store = new ParkingStore();
