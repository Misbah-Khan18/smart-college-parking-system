// ==========================================
// PARKING SLOT DATA (SCOOTY & BIKE ONLY)
// ==========================================

const createSlot = ({
  id,
  floor,
  section,
  zone,
  type = 'scooty',
  isEv = false,
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
  isEv,
  status,
  plate,
  owner,
  category,
  reservedUntil,
  entryTime
})


// ==========================================
// GROUND FLOOR - 80 SLOTS (GIRLS' SCOOTY PARKING)
// ==========================================

const groundFloorSlots = [

  // ==========================================
  // G-01 TO G-20: ACCOUNTS DEPARTMENT - FRONT SIDE
  // ==========================================

  createSlot({
    id: 'G-01',
    floor: 'Ground Floor',
    section: 'Accounts Department - Front Side',
    zone: 'Ground Floor - Girls Scooty Parking',
    type: 'scooty',
    isEv: false,
    status: 'occupied',
    plate: 'MH-04-AB-1234',
    owner: 'Ananya Deshmukh',
    category: 'Student',
    entryTime: '08:45 AM'
  }),

  createSlot({
    id: 'G-02',
    floor: 'Ground Floor',
    section: 'Accounts Department - Front Side',
    zone: 'Ground Floor - Girls Scooty Parking',
    type: 'scooty',
    isEv: false
  }),

  createSlot({
    id: 'G-03',
    floor: 'Ground Floor',
    section: 'Accounts Department - Front Side',
    zone: 'Ground Floor - Girls Scooty Parking',
    type: 'scooty',
    isEv: true,
    status: 'occupied',
    plate: 'MH-04-CD-5678',
    owner: 'Pooja Iyer',
    category: 'Student',
    entryTime: '09:10 AM'
  }),

  ...Array.from({ length: 17 }, (_, i) =>
    createSlot({
      id: `G-${String(i + 4).padStart(2, '0')}`,
      floor: 'Ground Floor',
      section: 'Accounts Department - Front Side',
      zone: 'Ground Floor - Girls Scooty Parking',
      type: 'scooty',
      isEv: i % 5 === 0 // some EV scooties
    })
  ),


  // ==========================================
  // G-21 TO G-40: ACCOUNTS DEPARTMENT - OPPOSITE SIDE
  // ==========================================

  ...Array.from({ length: 20 }, (_, i) =>
    createSlot({
      id: `G-${String(i + 21).padStart(2, '0')}`,
      floor: 'Ground Floor',
      section: 'Accounts Department - Opposite Side',
      zone: 'Ground Floor - Girls Scooty Parking',
      type: 'scooty',
      isEv: i % 4 === 0
    })
  ),


  // ==========================================
  // G-41 TO G-60: EXAM IT DEPARTMENT - FRONT SIDE
  // ==========================================

  createSlot({
    id: 'G-41',
    floor: 'Ground Floor',
    section: 'Exam IT Department - Front Side',
    zone: 'Ground Floor - Girls Scooty Parking',
    type: 'scooty',
    isEv: false,
    status: 'occupied',
    plate: 'MH-04-GH-3456',
    owner: 'Sneha Patil',
    category: 'Student',
    entryTime: '09:35 AM'
  }),

  createSlot({
    id: 'G-42',
    floor: 'Ground Floor',
    section: 'Exam IT Department - Front Side',
    zone: 'Ground Floor - Girls Scooty Parking',
    type: 'scooty',
    isEv: false
  }),

  createSlot({
    id: 'G-43',
    floor: 'Ground Floor',
    section: 'Exam IT Department - Front Side',
    zone: 'Ground Floor - Girls Scooty Parking',
    type: 'scooty',
    isEv: true,
    status: 'occupied',
    plate: 'MH-04-EF-9012',
    owner: 'Riya Sen',
    category: 'Student',
    entryTime: '09:25 AM'
  }),

  ...Array.from({ length: 17 }, (_, i) =>
    createSlot({
      id: `G-${String(i + 44).padStart(2, '0')}`,
      floor: 'Ground Floor',
      section: 'Exam IT Department - Front Side',
      zone: 'Ground Floor - Girls Scooty Parking',
      type: 'scooty',
      isEv: i % 6 === 0
    })
  ),


  // ==========================================
  // G-61 TO G-80: EXAM IT DEPARTMENT - OPPOSITE SIDE
  // ==========================================

  ...Array.from({ length: 20 }, (_, i) =>
    createSlot({
      id: `G-${String(i + 61).padStart(2, '0')}`,
      floor: 'Ground Floor',
      section: 'Exam IT Department - Opposite Side',
      zone: 'Ground Floor - Girls Scooty Parking',
      type: 'scooty',
      isEv: i % 5 === 0
    })
  )
]


// ==========================================
// BASEMENT - 80 SLOTS (BOYS' BIKE PARKING)
// ==========================================

const basementSlots = [

  // ==========================================
  // B-01 TO B-20: BASEMENT ROW 1
  // ==========================================

  createSlot({
    id: 'B-01',
    floor: 'Basement',
    section: 'Basement Row 1',
    zone: 'Basement - Boys Parking',
    type: 'bike',
    isEv: false,
    status: 'occupied',
    plate: 'MH-04-JK-7890',
    owner: 'Sameer Khan',
    category: 'Student',
    entryTime: '08:30 AM'
  }),

  createSlot({
    id: 'B-02',
    floor: 'Basement',
    section: 'Basement Row 1',
    zone: 'Basement - Boys Parking',
    type: 'bike',
    isEv: false
  }),

  createSlot({
    id: 'B-03',
    floor: 'Basement',
    section: 'Basement Row 1',
    zone: 'Basement - Boys Parking',
    type: 'bike',
    isEv: false,
    status: 'occupied',
    plate: 'MH-04-LM-1122',
    owner: 'Aryan Sharma',
    category: 'Student',
    entryTime: '09:00 AM'
  }),

  ...Array.from({ length: 17 }, (_, i) =>
    createSlot({
      id: `B-${String(i + 4).padStart(2, '0')}`,
      floor: 'Basement',
      section: 'Basement Row 1',
      zone: 'Basement - Boys Parking',
      type: 'bike',
      isEv: i % 5 === 0
    })
  ),


  // ==========================================
  // B-21 TO B-40: BASEMENT ROW 2
  // ==========================================

  ...Array.from({ length: 20 }, (_, i) =>
    createSlot({
      id: `B-${String(i + 21).padStart(2, '0')}`,
      floor: 'Basement',
      section: 'Basement Row 2',
      zone: 'Basement - Boys Parking',
      type: 'bike',
      isEv: i % 4 === 0
    })
  ),


  // ==========================================
  // B-41 TO B-60: BASEMENT ROW 3
  // ==========================================

  createSlot({
    id: 'B-41',
    floor: 'Basement',
    section: 'Basement Row 3',
    zone: 'Basement - Boys Parking',
    type: 'bike',
    isEv: false,
    status: 'occupied',
    plate: 'MH-04-NP-3344',
    owner: 'Devendra Kulkarni',
    category: 'Student',
    entryTime: '09:15 AM'
  }),

  ...Array.from({ length: 19 }, (_, i) =>
    createSlot({
      id: `B-${String(i + 42).padStart(2, '0')}`,
      floor: 'Basement',
      section: 'Basement Row 3',
      zone: 'Basement - Boys Parking',
      type: 'bike',
      isEv: i % 5 === 0
    })
  ),


  // ==========================================
  // B-61 TO B-80: BASEMENT ROW 4
  // ==========================================

  createSlot({
    id: 'B-61',
    floor: 'Basement',
    section: 'Basement Row 4',
    zone: 'Basement - Boys Parking',
    type: 'bike',
    isEv: true,
    status: 'occupied',
    plate: 'MH-04-QR-5566',
    owner: 'Siddharth Patil',
    category: 'Student',
    entryTime: '09:40 AM'
  }),

  ...Array.from({ length: 19 }, (_, i) =>
    createSlot({
      id: `B-${String(i + 62).padStart(2, '0')}`,
      floor: 'Basement',
      section: 'Basement Row 4',
      zone: 'Basement - Boys Parking',
      type: 'bike',
      isEv: i % 6 === 0
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
// PARKING ACTIVITY LOGS (TWO-WHEELERS ONLY)
// ==========================================

export const INITIAL_LOGS = [
  {
    id: 'LOG-101',
    timestamp: '09:40 AM',
    action: 'ENTRY',
    plate: 'MH-04-QR-5566',
    slot: 'B-61',
    category: 'Student',
    vehicleType: 'Bike (EV)',
    gate: 'Main Gate (ANPR)'
  },
  {
    id: 'LOG-102',
    timestamp: '09:35 AM',
    action: 'ENTRY',
    plate: 'MH-04-GH-3456',
    slot: 'G-41',
    category: 'Student',
    vehicleType: 'Scooty',
    gate: 'Main Gate (ANPR)'
  },
  {
    id: 'LOG-103',
    timestamp: '09:25 AM',
    action: 'ENTRY',
    plate: 'MH-04-EF-9012',
    slot: 'G-43',
    category: 'Student',
    vehicleType: 'Scooty (EV)',
    gate: 'Main Gate (ANPR)'
  },
  {
    id: 'LOG-104',
    timestamp: '09:15 AM',
    action: 'ENTRY',
    plate: 'MH-04-NP-3344',
    slot: 'B-41',
    category: 'Student',
    vehicleType: 'Bike',
    gate: 'Main Gate (ANPR)'
  },
  {
    id: 'LOG-105',
    timestamp: '09:10 AM',
    action: 'ENTRY',
    plate: 'MH-04-CD-5678',
    slot: 'G-03',
    category: 'Student',
    vehicleType: 'Scooty (EV)',
    gate: 'Main Gate (ANPR)'
  },
  {
    id: 'LOG-106',
    timestamp: '09:00 AM',
    action: 'ENTRY',
    plate: 'MH-04-LM-1122',
    slot: 'B-03',
    category: 'Student',
    vehicleType: 'Bike',
    gate: 'Main Gate (ANPR)'
  },
  {
    id: 'LOG-107',
    timestamp: '08:45 AM',
    action: 'ENTRY',
    plate: 'MH-04-AB-1234',
    slot: 'G-01',
    category: 'Student',
    vehicleType: 'Scooty',
    gate: 'Main Gate (ANPR)'
  },
  {
    id: 'LOG-108',
    timestamp: '08:30 AM',
    action: 'ENTRY',
    plate: 'MH-04-JK-7890',
    slot: 'B-01',
    category: 'Student',
    vehicleType: 'Bike',
    gate: 'Main Gate (ANPR)'
  }
]


// ==========================================
// HOURLY OCCUPANCY TREND
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


// ==========================================
// REGISTERED STUDENTS & TWO-WHEELERS
// ==========================================

export const INITIAL_REGISTERED_VEHICLES = [
  {
    id: 'REG-2026-001',
    studentName: 'Ananya Deshmukh',
    rollNumber: 'CS21B044',
    stream: 'B.Tech Computer Science (CSE)',
    phoneNumber: '+91 98201 23456',
    vehicleNumber: 'MH-04-AB-1234',
    vehicleType: 'scooty',
    isEv: false,
    category: 'Student',
    preferredFloor: 'Ground Floor',
    registeredAt: '2026-08-10',
    status: 'Active',
    passId: 'SMP-CS21B044-01'
  },
  {
    id: 'REG-2026-002',
    studentName: 'Riya Sen',
    rollNumber: 'IT22B019',
    stream: 'B.Tech Information Technology (IT)',
    phoneNumber: '+91 98334 56789',
    vehicleNumber: 'MH-04-CD-5678',
    vehicleType: 'scooty',
    isEv: true,
    category: 'Student',
    preferredFloor: 'Ground Floor',
    registeredAt: '2026-08-12',
    status: 'Active',
    passId: 'SMP-IT22B019-02'
  },
  {
    id: 'REG-2026-003',
    studentName: 'Sameer Khan',
    rollNumber: 'ME22B055',
    stream: 'B.Tech Mechanical Engineering',
    phoneNumber: '+91 98111 22334',
    vehicleNumber: 'MH-04-JK-7890',
    vehicleType: 'bike',
    isEv: false,
    category: 'Student',
    preferredFloor: 'Basement',
    registeredAt: '2026-08-14',
    status: 'Active',
    passId: 'SMP-ME22B055-03'
  },
  {
    id: 'REG-2026-004',
    studentName: 'Aryan Sharma',
    rollNumber: 'CS23B102',
    stream: 'B.Tech Computer Science (CSE)',
    phoneNumber: '+91 98450 99887',
    vehicleNumber: 'MH-04-LM-1122',
    vehicleType: 'bike',
    isEv: false,
    category: 'Student',
    preferredFloor: 'Basement',
    registeredAt: '2026-08-15',
    status: 'Active',
    passId: 'SMP-CS23B102-04'
  },
  {
    id: 'REG-2026-005',
    studentName: 'Pooja Iyer',
    rollNumber: 'EXTC21B08',
    stream: 'B.Tech Electronics & Telecomm (EXTC)',
    phoneNumber: '+91 97690 12345',
    vehicleNumber: 'MH-04-GH-3456',
    vehicleType: 'scooty',
    isEv: false,
    category: 'Student',
    preferredFloor: 'Ground Floor',
    registeredAt: '2026-08-16',
    status: 'Active',
    passId: 'SMP-EXTC21B08-05'
  },
  {
    id: 'REG-2026-006',
    studentName: 'Siddharth Patil',
    rollNumber: 'AI24B012',
    stream: 'B.Tech AI & Data Science (AI/DS)',
    phoneNumber: '+91 99200 44556',
    vehicleNumber: 'MH-04-QR-5566',
    vehicleType: 'bike',
    isEv: true,
    category: 'Student',
    preferredFloor: 'Basement',
    registeredAt: '2026-08-18',
    status: 'Active',
    passId: 'SMP-AI24B012-06'
  }
]
