// Generate initial 160 slots (80 Ground scooties + 80 Basement bikes)
function generateDefaultSlots() {
  const slots = [];

  // Ground floor: G-01 to G-80 (Scooties)
  for (let i = 1; i <= 80; i++) {
    const id = `G-${String(i).padStart(2, '0')}`;
    let section = 'Accounts Department - Front Side';
    if (i > 20 && i <= 40) section = 'Accounts Department - Opposite Side';
    else if (i > 40 && i <= 60) section = 'Exam IT Department - Front Side';
    else if (i > 60 && i <= 80) section = 'Exam IT Department - Opposite Side';

    slots.push({
      id,
      floor: 'Ground Floor',
      section,
      zone: 'Ground Floor - Scooty Parking',
      type: 'scooty',
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
    let section = 'Basement Row 1';
    if (i > 20 && i <= 40) section = 'Basement Row 2';
    else if (i > 40 && i <= 60) section = 'Basement Row 3';
    else if (i > 60 && i <= 80) section = 'Basement Row 4';

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
