export const INITIAL_SLOTS = [
  // Zone A - Student 4-Wheeler Zone
  { id: 'A-01', zone: 'Zone A (Student Cars)', type: 'car', status: 'occupied', plate: 'KA-05-MB-4412', owner: 'Rohan Sharma', category: 'Student', reservedUntil: null, entryTime: '08:45 AM' },
  { id: 'A-02', zone: 'Zone A (Student Cars)', type: 'car', status: 'available', plate: '', owner: '', category: '', reservedUntil: null, entryTime: null },
  { id: 'A-03', zone: 'Zone A (Student Cars)', type: 'car', status: 'occupied', plate: 'DL-01-AB-1904', owner: 'Aarav Patel', category: 'Student', reservedUntil: null, entryTime: '09:10 AM' },
  { id: 'A-04', zone: 'Zone A (Student Cars)', type: 'car', status: 'reserved', plate: 'MH-12-PQ-9081', owner: 'Sneha Roy', category: 'Student', reservedUntil: '12:30 PM', entryTime: null },
  { id: 'A-05', zone: 'Zone A (Student Cars)', type: 'car', status: 'available', plate: '', owner: '', category: '', reservedUntil: null, entryTime: null },
  { id: 'A-06', zone: 'Zone A (Student Cars)', type: 'car', status: 'available', plate: '', owner: '', category: '', reservedUntil: null, entryTime: null },
  { id: 'A-07', zone: 'Zone A (Student Cars)', type: 'car', status: 'occupied', plate: 'UP-16-CT-3321', owner: 'Vikas Gupta', category: 'Student', reservedUntil: null, entryTime: '09:30 AM' },
  { id: 'A-08', zone: 'Zone A (Student Cars)', type: 'car', status: 'available', plate: '', owner: '', category: '', reservedUntil: null, entryTime: null },

  // Zone B - Faculty & Staff Zone
  { id: 'B-01', zone: 'Zone B (Faculty & Staff)', type: 'car', status: 'occupied', plate: 'KA-03-FF-5590', owner: 'Dr. S. K. Mehta', category: 'Faculty', reservedUntil: null, entryTime: '08:15 AM' },
  { id: 'B-02', zone: 'Zone B (Faculty & Staff)', type: 'car', status: 'occupied', plate: 'KA-04-EX-7788', owner: 'Prof. Ananya Sen', category: 'Faculty', reservedUntil: null, entryTime: '08:50 AM' },
  { id: 'B-03', zone: 'Zone B (Faculty & Staff)', type: 'car', status: 'reserved', plate: 'MH-02-CD-2345', owner: 'Dean Office Visitor', category: 'Staff', reservedUntil: '02:00 PM', entryTime: null },
  { id: 'B-04', zone: 'Zone B (Faculty & Staff)', type: 'car', status: 'available', plate: '', owner: '', category: '', reservedUntil: null, entryTime: null },
  { id: 'B-05', zone: 'Zone B (Faculty & Staff)', type: 'car', status: 'available', plate: '', owner: '', category: '', reservedUntil: null, entryTime: null },
  { id: 'B-06', zone: 'Zone B (Faculty & Staff)', type: 'car', status: 'occupied', plate: 'HR-26-EE-9912', owner: 'Dr. Ramesh Nair', category: 'Faculty', reservedUntil: null, entryTime: '09:05 AM' },

  // Zone C - EV Eco-Charging Zone
  { id: 'C-01', zone: 'Zone C (EV Charging)', type: 'ev', status: 'occupied', plate: 'KA-51-EV-1001', owner: 'Tanmay Joshi', category: 'Student', reservedUntil: null, entryTime: '09:00 AM' },
  { id: 'C-02', zone: 'Zone C (EV Charging)', type: 'ev', status: 'available', plate: '', owner: '', category: '', reservedUntil: null, entryTime: null },
  { id: 'C-03', zone: 'Zone C (EV Charging)', type: 'ev', status: 'reserved', plate: 'DL-04-EV-8822', owner: 'Dr. Priya Das', category: 'Faculty', reservedUntil: '01:15 PM', entryTime: null },
  { id: 'C-04', zone: 'Zone C (EV Charging)', type: 'ev', status: 'available', plate: '', owner: '', category: '', reservedUntil: null, entryTime: null },

  // Zone D - Two-Wheeler / Bike Zone
  { id: 'D-01', zone: 'Zone D (Two-Wheelers)', type: 'bike', status: 'occupied', plate: 'KA-01-HK-7721', owner: 'Karan Verma', category: 'Student', reservedUntil: null, entryTime: '08:30 AM' },
  { id: 'D-02', zone: 'Zone D (Two-Wheelers)', type: 'bike', status: 'occupied', plate: 'KA-02-JL-4411', owner: 'Divya Rao', category: 'Student', reservedUntil: null, entryTime: '08:40 AM' },
  { id: 'D-03', zone: 'Zone D (Two-Wheelers)', type: 'bike', status: 'available', plate: '', owner: '', category: '', reservedUntil: null, entryTime: null },
  { id: 'D-04', zone: 'Zone D (Two-Wheelers)', type: 'bike', status: 'available', plate: '', owner: '', category: '', reservedUntil: null, entryTime: null },
  { id: 'D-05', zone: 'Zone D (Two-Wheelers)', type: 'bike', status: 'occupied', plate: 'MH-14-AA-1122', owner: 'Rahul Nair', category: 'Student', reservedUntil: null, entryTime: '09:15 AM' },
  { id: 'D-06', zone: 'Zone D (Two-Wheelers)', type: 'bike', status: 'available', plate: '', owner: '', category: '', reservedUntil: null, entryTime: null },
  { id: 'D-07', zone: 'Zone D (Two-Wheelers)', type: 'bike', status: 'reserved', plate: 'KA-05-ZX-9900', owner: 'Meera Menon', category: 'Staff', reservedUntil: '03:00 PM', entryTime: null },
  { id: 'D-08', zone: 'Zone D (Two-Wheelers)', type: 'bike', status: 'available', plate: '', owner: '', category: '', reservedUntil: null, entryTime: null },
];

export const INITIAL_LOGS = [
  { id: 'LOG-101', timestamp: '09:30 AM', action: 'ENTRY', plate: 'UP-16-CT-3321', slot: 'A-07', category: 'Student', vehicleType: 'Car', gate: 'Main Gate 1' },
  { id: 'LOG-102', timestamp: '09:15 AM', action: 'ENTRY', plate: 'MH-14-AA-1122', slot: 'D-05', category: 'Student', vehicleType: 'Two-Wheeler', gate: 'Gate 2 (East)' },
  { id: 'LOG-103', timestamp: '09:10 AM', action: 'ENTRY', plate: 'DL-01-AB-1904', slot: 'A-03', category: 'Student', vehicleType: 'Car', gate: 'Main Gate 1' },
  { id: 'LOG-104', timestamp: '09:05 AM', action: 'ENTRY', plate: 'HR-26-EE-9912', slot: 'B-06', category: 'Faculty', vehicleType: 'Car', gate: 'Faculty Gate' },
  { id: 'LOG-105', timestamp: '09:00 AM', action: 'ENTRY', plate: 'KA-51-EV-1001', slot: 'C-01', category: 'Student', vehicleType: 'EV', gate: 'Main Gate 1' },
  { id: 'LOG-106', timestamp: '08:55 AM', action: 'EXIT', plate: 'KA-03-MM-1212', slot: 'A-02', duration: '1h 10m', fee: 'Free (Campus Pass)', gate: 'Exit Gate 1' },
  { id: 'LOG-107', timestamp: '08:50 AM', action: 'ENTRY', plate: 'KA-04-EX-7788', slot: 'B-02', category: 'Faculty', vehicleType: 'Car', gate: 'Faculty Gate' },
  { id: 'LOG-108', timestamp: '08:45 AM', action: 'ENTRY', plate: 'KA-05-MB-4412', slot: 'A-01', category: 'Student', vehicleType: 'Car', gate: 'Main Gate 1' },
];

export const HOURLY_TRAFFIC_DATA = [
  { hour: '07 AM', occupancy: 12, label: 'Early Arrival' },
  { hour: '08 AM', occupancy: 48, label: 'Faculty & Early Batches' },
  { hour: '09 AM', occupancy: 88, label: 'Morning Peak (Classes start)' },
  { hour: '10 AM', occupancy: 92, label: 'Full Capacity' },
  { hour: '11 AM', occupancy: 85, label: 'Standard Period' },
  { hour: '12 PM', occupancy: 70, label: 'Lunch Movement' },
  { hour: '01 PM', occupancy: 75, label: 'Afternoon Labs' },
  { hour: '02 PM', occupancy: 65, label: 'Post-Lunch Shifts' },
  { hour: '03 PM', occupancy: 42, label: 'Departures' },
  { hour: '04 PM', occupancy: 28, label: 'Evening Study' },
];
