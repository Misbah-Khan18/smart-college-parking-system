// ==========================================
// PARKING SLOT DATA
// ==========================================

const createSlot = ({
  id,
  floor,
  section,
  zone,
  type = 'bike',
  status = 'available',
  plate = '',
  owner = '',
  category = '',
  reservedUntil = null,
  entryTime = null
}) => ({
  id,
  zone,
  floor,
  section,
  type,
  status,
  plate,
  owner,
  category,
  reservedUntil,
  entryTime
})


// ==========================================
// GROUND FLOOR - 80 SLOTS
// ==========================================

const groundFloorSlots = [

  // ==========================================
  // G-01 TO G-20
  // ACCOUNTS DEPARTMENT - FRONT SIDE
  // ==========================================

  createSlot({
    id: 'G-01',
    floor: 'Ground Floor',
    section: 'Accounts Department - Front Side',
    zone: 'Ground Floor - Girls Scooty Parking',
    status: 'occupied',
    plate: 'MH-04-AB-1234',
    owner: 'Demo Student 1',
    category: 'Student',
    entryTime: '08:45 AM'
  }),

  createSlot({
    id: 'G-02',
    floor: 'Ground Floor',
    section: 'Accounts Department - Front Side',
    zone: 'Ground Floor - Girls Scooty Parking'
  }),

  createSlot({
    id: 'G-03',
    floor: 'Ground Floor',
    section: 'Accounts Department - Front Side',
    zone: 'Ground Floor - Girls Scooty Parking',
    status: 'occupied',
    plate: 'MH-04-CD-5678',
    owner: 'Demo Student 2',
    category: 'Student',
    entryTime: '09:10 AM'
  }),

  ...Array.from({ length: 17 }, (_, i) =>
    createSlot({
      id: `G-${String(i + 4).padStart(2, '0')}`,
      floor: 'Ground Floor',
      section: 'Accounts Department - Front Side',
      zone: 'Ground Floor - Girls Scooty Parking'
    })
  ),


  // ==========================================
  // G-21 TO G-40
  // ACCOUNTS DEPARTMENT - OPPOSITE SIDE
  // ==========================================

  ...Array.from({ length: 20 }, (_, i) =>
    createSlot({
      id: `G-${String(i + 21).padStart(2, '0')}`,
      floor: 'Ground Floor',
      section: 'Accounts Department - Opposite Side',
      zone: 'Ground Floor - Girls Scooty Parking'
    })
  ),


  // ==========================================
  // G-41 TO G-60
  // EXAM IT DEPARTMENT - FRONT SIDE
  // ==========================================

  createSlot({
    id: 'G-41',
    floor: 'Ground Floor',
    section: 'Exam IT Department - Front Side',
    zone: 'Ground Floor - Girls Scooty Parking',
    status: 'occupied',
    plate: 'MH-04-GH-3456',
    owner: 'Demo Student 4',
    category: 'Student',
    entryTime: '09:35 AM'
  }),

  createSlot({
    id: 'G-42',
    floor: 'Ground Floor',
    section: 'Exam IT Department - Front Side',
    zone: 'Ground Floor - Girls Scooty Parking'
  }),

  createSlot({
    id: 'G-43',
    floor: 'Ground Floor',
    section: 'Exam IT Department - Front Side',
    zone: 'Ground Floor - Girls Scooty Parking',
    status: 'occupied',
    plate: 'MH-04-EF-9012',
    owner: 'Demo Student 3',
    category: 'Student',
    entryTime: '09:25 AM'
  }),

  ...Array.from({ length: 17 }, (_, i) =>
    createSlot({
      id: `G-${String(i + 44).padStart(2, '0')}`,
      floor: 'Ground Floor',
      section: 'Exam IT Department - Front Side',
      zone: 'Ground Floor - Girls Scooty Parking'
    })
  ),


  // ==========================================
  // G-61 TO G-80
  // EXAM IT DEPARTMENT - OPPOSITE SIDE
  // ==========================================

  ...Array.from({ length: 20 }, (_, i) =>
    createSlot({
      id: `G-${String(i + 61).padStart(2, '0')}`,
      floor: 'Ground Floor',
      section: 'Exam IT Department - Opposite Side',
      zone: 'Ground Floor - Girls Scooty Parking'
    })
  )
]


// ==========================================
// BASEMENT - 80 SLOTS
// ==========================================

const basementSlots = [

  // ==========================================
  // B-01 TO B-20
  // BASEMENT ROW 1
  // ==========================================

  createSlot({
    id: 'B-01',
    floor: 'Basement',
    section: 'Basement Row 1',
    zone: 'Basement - Boys Parking',
    status: 'occupied',
    plate: 'MH-04-JK-7890',
    owner: 'Demo Student 5',
    category: 'Student',
    entryTime: '08:30 AM'
  }),

  createSlot({
    id: 'B-02',
    floor: 'Basement',
    section: 'Basement Row 1',
    zone: 'Basement - Boys Parking'
  }),

  createSlot({
    id: 'B-03',
    floor: 'Basement',
    section: 'Basement Row 1',
    zone: 'Basement - Boys Parking',
    status: 'occupied',
    plate: 'MH-04-LM-1122',
    owner: 'Demo Student 6',
    category: 'Student',
    entryTime: '09:00 AM'
  }),

  ...Array.from({ length: 17 }, (_, i) =>
    createSlot({
      id: `B-${String(i + 4).padStart(2, '0')}`,
      floor: 'Basement',
      section: 'Basement Row 1',
      zone: 'Basement - Boys Parking'
    })
  ),


  // ==========================================
  // B-21 TO B-40
  // BASEMENT ROW 2
  // ==========================================

  ...Array.from({ length: 20 }, (_, i) =>
    createSlot({
      id: `B-${String(i + 21).padStart(2, '0')}`,
      floor: 'Basement',
      section: 'Basement Row 2',
      zone: 'Basement - Boys Parking'
    })
  ),


  // ==========================================
  // B-41 TO B-60
  // BASEMENT ROW 3
  // ==========================================

  createSlot({
    id: 'B-41',
    floor: 'Basement',
    section: 'Basement Row 3',
    zone: 'Basement - Boys Parking',
    status: 'occupied',
    plate: 'MH-04-NP-3344',
    owner: 'Demo Student 7',
    category: 'Student',
    entryTime: '09:15 AM'
  }),

  ...Array.from({ length: 19 }, (_, i) =>
    createSlot({
      id: `B-${String(i + 42).padStart(2, '0')}`,
      floor: 'Basement',
      section: 'Basement Row 3',
      zone: 'Basement - Boys Parking'
    })
  ),


  // ==========================================
  // B-61 TO B-80
  // BASEMENT ROW 4
  // ==========================================

  createSlot({
    id: 'B-61',
    floor: 'Basement',
    section: 'Basement Row 4',
    zone: 'Basement - Boys Parking',
    status: 'occupied',
    plate: 'MH-04-QR-5566',
    owner: 'Demo Student 8',
    category: 'Student',
    entryTime: '09:40 AM'
  }),

  ...Array.from({ length: 19 }, (_, i) =>
    createSlot({
      id: `B-${String(i + 62).padStart(2, '0')}`,
      floor: 'Basement',
      section: 'Basement Row 4',
      zone: 'Basement - Boys Parking'
    })
  )
]


// ==========================================
// EXPORT ALL 160 PARKING SLOTS
// ==========================================

export const INITIAL_SLOTS = [
  ...groundFloorSlots,
  ...basementSlots
]


// ==========================================
// PARKING ACTIVITY LOGS
// Required by other dashboard components
// ==========================================

export const INITIAL_LOGS = [
  {
    id: 'LOG-101',
    timestamp: '09:40 AM',
    action: 'ENTRY',
    plate: 'MH-04-QR-5566',
    slot: 'B-61',
    category: 'Student',
    vehicleType: 'Two-Wheeler',
    gate: 'Main Gate'
  },
  {
    id: 'LOG-102',
    timestamp: '09:35 AM',
    action: 'ENTRY',
    plate: 'MH-04-GH-3456',
    slot: 'G-41',
    category: 'Student',
    vehicleType: 'Scooty',
    gate: 'Main Gate'
  },
  {
    id: 'LOG-103',
    timestamp: '09:25 AM',
    action: 'ENTRY',
    plate: 'MH-04-EF-9012',
    slot: 'G-43',
    category: 'Student',
    vehicleType: 'Scooty',
    gate: 'Main Gate'
  },
  {
    id: 'LOG-104',
    timestamp: '09:15 AM',
    action: 'ENTRY',
    plate: 'MH-04-NP-3344',
    slot: 'B-41',
    category: 'Student',
    vehicleType: 'Two-Wheeler',
    gate: 'Main Gate'
  },
  {
    id: 'LOG-105',
    timestamp: '09:10 AM',
    action: 'ENTRY',
    plate: 'MH-04-CD-5678',
    slot: 'G-03',
    category: 'Student',
    vehicleType: 'Scooty',
    gate: 'Main Gate'
  },
  {
    id: 'LOG-106',
    timestamp: '09:00 AM',
    action: 'ENTRY',
    plate: 'MH-04-LM-1122',
    slot: 'B-03',
    category: 'Student',
    vehicleType: 'Two-Wheeler',
    gate: 'Main Gate'
  },
  {
    id: 'LOG-107',
    timestamp: '08:45 AM',
    action: 'ENTRY',
    plate: 'MH-04-AB-1234',
    slot: 'G-01',
    category: 'Student',
    vehicleType: 'Scooty',
    gate: 'Main Gate'
  },
  {
    id: 'LOG-108',
    timestamp: '08:30 AM',
    action: 'ENTRY',
    plate: 'MH-04-JK-7890',
    slot: 'B-01',
    category: 'Student',
    vehicleType: 'Two-Wheeler',
    gate: 'Main Gate'
  }
]


// ==========================================
// ANALYTICS DATA
// Required by AnalyticsView.jsx
// ==========================================

export const HOURLY_TRAFFIC_DATA = [
  { hour: '07 AM', occupancy: 12, label: 'Early Arrival' },
  { hour: '08 AM', occupancy: 48, label: 'Students Arriving' },
  { hour: '09 AM', occupancy: 88, label: 'Morning Peak' },
  { hour: '10 AM', occupancy: 92, label: 'High Occupancy' },
  { hour: '11 AM', occupancy: 85, label: 'Regular Classes' },
  { hour: '12 PM', occupancy: 70, label: 'Lunch Movement' },
  { hour: '01 PM', occupancy: 75, label: 'Afternoon Classes' },
  { hour: '02 PM', occupancy: 65, label: 'Regular Activity' },
  { hour: '03 PM', occupancy: 42, label: 'Departures' },
  { hour: '04 PM', occupancy: 28, label: 'Evening' }
]

