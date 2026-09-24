// =====================================================================
// CAMPUS PARKING SYSTEM - MASTER PLAN DATA
// Real dynamic timestamps, accurate operational telemetry, and CAD layout
// Ground Floor (G-01 to G-80 Scooters: 80 Bays) & Basement (B-01 to B-80 Bikes: 80 Bays)
// Total Campus Capacity = 160 Monitored Two-Wheeler Bays
// =====================================================================

export const getFormattedTime = (date) => {
  if (!date) return ''
  const d = typeof date === 'number' || typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return ''
  return d.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })
}

export const getDurationString = (startDate, endDate) => {
  if (!startDate || !endDate) return ''
  const diffMs = new Date(endDate).getTime() - new Date(startDate).getTime()
  if (diffMs <= 0) return '0 mins'
  const diffMins = Math.round(diffMs / (1000 * 60))
  const hrs = Math.floor(diffMins / 60)
  const mins = diffMins % 60
  if (hrs > 0 && mins > 0) return `${hrs}h ${mins}m`
  if (hrs > 0) return `${hrs} hr${hrs > 1 ? 's' : ''}`
  return `${mins} mins`
}

export const generatePassId = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  const num = Math.floor(1000 + Math.random() * 9000)
  return `PASS-${code}-${num}`
}

/**
 * Universal Slot ID Normalizer
 * Converts legacy CAD IDs (P1..P48, LG-T01..LG-B20) to canonical bay labels (G-01..G-80, B-01..B-80)
 */
export const getDisplaySlotId = (id) => {
  if (!id) return ''
  const upper = String(id).toUpperCase().trim()
  if (/^P\d+$/.test(upper)) {
    const num = parseInt(upper.replace('P', ''), 10)
    return `G-${String(num).padStart(2, '0')}`
  }
  if (/^LG-T\d+$/.test(upper)) {
    const num = parseInt(upper.replace('LG-T', ''), 10)
    return `B-${String(num).padStart(2, '0')}`
  }
  if (/^LG-B\d+$/.test(upper)) {
    const num = parseInt(upper.replace('LG-B', ''), 10)
    return `B-${String(num + 20).padStart(2, '0')}`
  }
  return upper
}

// =====================================================================
// UNIVERSAL SLOT NORMALIZER
// Enforces strictly 3 statuses: Available (green), Reserved (amber), Booked (red)
// =====================================================================
export const normalizeSlotBay = (rawBay) => {
  let status
  if (
    rawBay.status === 'booked' ||
    rawBay.status === 'occupied' ||
    (rawBay.status === 'ev' && rawBay.statusChangesAt)
  ) {
    status = 'booked'
  } else if (rawBay.status === 'reserved') {
    status = 'reserved'
  } else {
    status = 'available'
  }

  const dotColor = status === 'available' ? 'green' : status === 'reserved' ? 'amber' : 'red'
  const label = status.toUpperCase()
  const displayId = getDisplaySlotId(rawBay.id)

  return {
    id: displayId,
    legacyId: rawBay.id,
    slotNumber: rawBay.slotNumber,
    floor: rawBay.floor || (displayId.startsWith('G') ? 'Ground Floor' : 'Basement'),
    type: rawBay.type || (displayId.startsWith('G') ? 'scooty' : 'bike'),
    section: rawBay.section || 'standard',
    wing: rawBay.wing || (displayId.startsWith('G') ? 'Ground Floor — Scooters' : 'Basement — Bikes'),
    row: rawBay.row || 'R1',
    status,
    label,
    dotColor,
    dimensions: rawBay.dimensions || '2.5m × 5.0m',
    distanceToLift: rawBay.distanceToLift || '12m (Core Lift)',
    tariff: 'Free w/ Student Tag',
    statusChangesAt: status === 'available' ? null : rawBay.statusChangesAt,
    assignedTo: status === 'available' ? null : (rawBay.assignedTo || 'Slot Commuter'),
    plate: status === 'available' ? null : rawBay.plate,
    occupant: status === 'available' ? 'None (Slot Clear)' : (rawBay.occupant || (status === 'booked' ? 'Booked' : 'Reserved'))
  }
}

// ---------------------------------------------------------------------
// 1. GROUND FLOOR MASTER DATA (80 TOTAL BAYS: G-01 TO G-80)
// Designated for Scooties
// ---------------------------------------------------------------------
export const createInitialBayData = () => {
  const now = Date.now()
  const getOccupiedExpiry = (mins) => new Date(now + mins * 60 * 1000)
  const getReservedExpiry = (mins) => new Date(now + mins * 60 * 1000)

  const bays = []

  // Pre-populate realistic seed data for sample spots
  const sampleData = {
    'G-02': { status: 'occupied', assignedTo: 'Kavya Nair (CS-Year 3)', plate: 'MH-12-KN-8910', mins: 68 },
    'G-05': { status: 'occupied', assignedTo: 'Rohan Deshmukh (Mech-Final)', plate: 'MH-14-RD-4040', mins: 110 },
    'G-07': { status: 'occupied', assignedTo: 'Tanmay Joshi (Civil-Y2)', plate: 'MH-12-TJ-9090', mins: 40 },
    'G-09': { status: 'occupied', assignedTo: 'Aarav Patil (IT-Year 3)', plate: 'MH-14-AP-3321', mins: 85 },
    'G-12': { status: 'occupied', assignedTo: 'Pooja Iyer (MBA-Sem 2)', plate: 'MH-12-PI-7711', mins: 60 },
    'G-15': { status: 'occupied', assignedTo: 'Vikram Shinde (E&TC)', plate: 'MH-14-VS-5520', mins: 140 },
    'G-17': { status: 'occupied', assignedTo: 'Neha Sharma (Biotech)', plate: 'MH-12-NS-2190', mins: 35 },
    'G-20': { status: 'occupied', assignedTo: 'Tanya Sengupta (Design)', plate: 'MH-12-TS-6604', mins: 95 },
    'G-28': { status: 'occupied', assignedTo: 'Anand Kulkarni (Staff)', plate: 'MH-12-AK-9921', mins: 120 },
    'G-30': { status: 'occupied', assignedTo: 'Devika Pillai (Research)', plate: 'MH-14-DP-1882', mins: 50 },
    'G-32': { status: 'booked', assignedTo: 'Campus Fleet (MH-12-EV-6020)', plate: 'MH-12-EV-6020', mins: 38 },
    'G-34': { status: 'reserved', assignedTo: 'Reserved Permit (MH-12-SI-1008)', plate: 'MH-12-SI-1008', mins: 195 },
    'G-37': { status: 'occupied', assignedTo: 'Kiran Mane (Staff)', plate: 'MH-12-KM-4419', mins: 72 },
    'G-39': { status: 'occupied', assignedTo: 'Zaid Shaikh (CS-Year 4)', plate: 'MH-14-ZS-7788', mins: 130 },
    'G-41': { status: 'occupied', assignedTo: 'Deepak Patel (Admin)', plate: 'MH-12-DP-9021', mins: 45 },
    'G-43': { status: 'reserved', assignedTo: 'Dean - Dr. K. R. Raman', plate: 'MH-12-DEAN-01', mins: 260 },
    'G-46': { status: 'occupied', assignedTo: 'Dr. Meera Sen (Chemistry)', plate: 'MH-12-MS-1144', mins: 80 },
    'G-48': { status: 'reserved', assignedTo: 'Campus Facilities Director', plate: 'MH-12-ST-0048', mins: 180 },
    'G-52': { status: 'occupied', assignedTo: 'Soham Kulkarni (ECE)', plate: 'MH-12-SK-9900', mins: 70 },
    'G-65': { status: 'occupied', assignedTo: 'Priya Verma (BCA)', plate: 'MH-14-PV-1122', mins: 90 },
    'G-72': { status: 'occupied', assignedTo: 'Amit Rathi (CS-Y1)', plate: 'MH-12-AR-7890', mins: 45 },
    'G-85': { status: 'occupied', assignedTo: 'Nikhil Patil (Mech-Y2)', plate: 'MH-12-NP-5511', mins: 65 },
    'G-92': { status: 'occupied', assignedTo: 'Sneha Jadhav (IT-Y3)', plate: 'MH-14-SJ-8820', mins: 110 },
    'G-104': { status: 'reserved', assignedTo: 'Campus Security Quick-Response', plate: 'MH-12-SEC-02', mins: 180 },
    'G-118': { status: 'occupied', assignedTo: 'Aaryan Deshpande (CS)', plate: 'MH-12-AD-4019', mins: 50 },
    'G-132': { status: 'occupied', assignedTo: 'Pooja Hegde (MBA-Y1)', plate: 'MH-14-PH-7712', mins: 90 }
  }

  for (let i = 1; i <= 140; i++) {
    const id = `G-${String(i).padStart(2, '0')}`
    const seed = sampleData[id]
    const status = seed ? seed.status : 'available'
    const isReserved = status === 'reserved'
    const isOccupied = status === 'occupied' || status === 'booked'
    const statusChangesAt = isOccupied ? getOccupiedExpiry(seed.mins) : isReserved ? getReservedExpiry(seed.mins) : null

    let section = 'Main Gate West Wing — Bike Grid'
    let dimensions = '1.5m × 2.6m'
    if (i > 16 && i <= 32) {
      section = 'Main Gate East Wing — Bike Grid'
    } else if (i > 32 && i <= 44) {
      section = 'Ingress West Flank — Bike Bay'
    } else if (i > 44 && i <= 57) {
      section = 'Ingress East Flank — Bike Bay'
    } else if (i > 57 && i <= 80) {
      section = i <= 68 ? 'Accounts Dept Wing — Perimeter Bay' : 'Exam IT Dept Wing — Perimeter Bay'
      dimensions = '2.5m × 5.0m'
    } else if (i > 80 && i <= 112) {
      section = 'Central Ingress Concourse — Student Bay'
      dimensions = '1.8m × 3.0m'
    } else if (i > 112) {
      section = 'South Perimeter Extension — Student Bay'
      dimensions = '1.5m × 2.6m'
    }

    bays.push({
      id,
      slotNumber: i,
      floor: 'Ground Floor',
      type: 'scooty',
      section,
      wing: 'Ground Floor — Scooties',
      row: `R${Math.ceil(i / 20)}`,
      status,
      label: status.toUpperCase(),
      dotColor: status === 'available' ? 'green' : status === 'reserved' ? 'amber' : 'red',
      statusChangesAt,
      assignedTo: seed?.assignedTo || null,
      plate: seed?.plate || null,
      occupant: seed ? `${seed.assignedTo} · ${seed.plate}` : 'None (Slot Clear)',
      dimensions,
      distanceToLift: `${6 + (i % 20) * 2}m (Campus Core)`,
      tariff: 'Free w/ Student Tag'
    })
  }

  return bays.map(normalizeSlotBay)
}

// ---------------------------------------------------------------------
// 2. BASEMENT MASTER DATA (80 TOTAL BAYS: B-01 TO B-80)
// Designated for Motorcycles / Bikes
// ---------------------------------------------------------------------
export const createBasementBayData = () => {
  const now = Date.now()
  const getOccupiedExpiry = (mins) => new Date(now + mins * 60 * 1000)
  const getReservedExpiry = (mins) => new Date(now + mins * 60 * 1000)

  const bays = []

  const sampleData = {
    'B-02': { status: 'occupied', assignedTo: 'Aman Varma (Mech-Y3)', plate: 'MH-12-AV-9912', mins: 45 },
    'B-05': { status: 'reserved', assignedTo: 'Prof. Ananya Sen (HOD)', plate: 'MH-12-AS-0005', mins: 180 },
    'B-07': { status: 'occupied', assignedTo: 'Rahul Mehta (CS-Y4)', plate: 'MH-14-RM-4421', mins: 75 },
    'B-11': { status: 'occupied', assignedTo: 'Siddhi Patil (BCA-Y3)', plate: 'MH-12-SP-3310', mins: 90 },
    'B-14': { status: 'occupied', assignedTo: 'Praveen Nair (Civil-Y2)', plate: 'MH-12-PN-7788', mins: 110 },
    'B-15': { status: 'reserved', assignedTo: 'Dr. Vivek Joshi (Dean)', plate: 'MH-12-VJ-1010', mins: 210 },
    'B-17': { status: 'occupied', assignedTo: 'Farhan Khan (Electronics)', plate: 'MH-14-FK-2022', mins: 60 },
    'B-20': { status: 'occupied', assignedTo: 'Tanvi Rane (Design-Y3)', plate: 'MH-12-TR-8819', mins: 135 },
    'B-23': { status: 'occupied', assignedTo: 'Sameer Kulkarni (MBA)', plate: 'MH-12-SK-5501', mins: 55 },
    'B-26': { status: 'reserved', assignedTo: 'Prof. Ramesh Rao (Civil HOD)', plate: 'MH-12-RR-0026', mins: 240 },
    'B-28': { status: 'occupied', assignedTo: 'Kritika Roy (Bio-Y2)', plate: 'MH-14-KR-1100', mins: 80 },
    'B-30': { status: 'occupied', assignedTo: 'Omkar Shinde (Chem-Y3)', plate: 'MH-12-OS-6622', mins: 105 },
    'B-32': { status: 'occupied', assignedTo: 'Divya Chopra (MCA-Y1)', plate: 'MH-12-DC-3450', mins: 65 },
    'B-35': { status: 'reserved', assignedTo: 'Dr. Sunita Deshmukh (Registrar)', plate: 'MH-12-SD-0035', mins: 190 },
    'B-37': { status: 'occupied', assignedTo: 'Manish Tyagi (Staff)', plate: 'MH-14-MT-7744', mins: 95 },
    'B-39': { status: 'occupied', assignedTo: 'Harsh Vardhan (CS-Y3)', plate: 'MH-12-HV-9090', mins: 120 },
    'B-45': { status: 'occupied', assignedTo: 'Gaurav Patil (Mech-Y2)', plate: 'MH-12-GP-4545', mins: 80 },
    'B-50': { status: 'occupied', assignedTo: 'Akshay More (Civil)', plate: 'MH-14-AM-5050', mins: 60 },
    'B-62': { status: 'occupied', assignedTo: 'Kartik Iyer (MBA)', plate: 'MH-12-KI-6262', mins: 115 },
    'B-75': { status: 'occupied', assignedTo: 'Nikhil Rathi (IT)', plate: 'MH-14-NR-7575', mins: 50 }
  }

  for (let i = 1; i <= 80; i++) {
    const id = `B-${String(i).padStart(2, '0')}`
    const seed = sampleData[id]
    const status = seed ? seed.status : 'available'
    const isReserved = status === 'reserved'
    const isOccupied = status === 'occupied' || status === 'booked'
    const statusChangesAt = isOccupied ? getOccupiedExpiry(seed.mins) : isReserved ? getReservedExpiry(seed.mins) : null

    let section = 'Basement Row 1'
    if (i > 20 && i <= 40) section = 'Basement Row 2'
    else if (i > 40 && i <= 60) section = 'Basement Row 3'
    else if (i > 60) section = 'Basement Row 4'

    bays.push({
      id,
      slotNumber: i,
      floor: 'Basement',
      type: 'bike',
      section,
      wing: 'Basement — Bikes',
      row: `R${Math.ceil(i / 20)}`,
      status,
      label: status.toUpperCase(),
      dotColor: status === 'available' ? 'green' : status === 'reserved' ? 'amber' : 'red',
      statusChangesAt,
      assignedTo: seed?.assignedTo || null,
      plate: seed?.plate || null,
      occupant: seed ? `${seed.assignedTo} · ${seed.plate}` : 'None (Slot Clear)',
      dimensions: '2.5m × 5.0m',
      distanceToLift: `${10 + (i % 20) * 2}m (Central Core)`,
      tariff: 'Free w/ Student Tag'
    })
  }

  return bays.map(normalizeSlotBay)
}

// Backwards compatibility alias
export const createLowerGroundBayData = createBasementBayData
