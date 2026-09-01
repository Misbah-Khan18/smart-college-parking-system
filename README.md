# 🛵 Smart College Parking Management System (SmartPark.Campus)

<p align="center">
  <img src="https://img.shields.io/badge/React-19.2-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React 19" />
  <img src="https://img.shields.io/badge/Vite-8.2-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" alt="JavaScript" />
  <img src="https://img.shields.io/badge/CSS3-Glassmorphism-1572B6?style=for-the-badge&logo=css3&logoColor=white" alt="CSS3" />
  <img src="https://img.shields.io/badge/Firebase-Auth%20%26%20Firestore-FFCA28?style=for-the-badge&logo=firebase&logoColor=black" alt="Firebase" />
  <img src="https://img.shields.io/badge/Status-Production%20Ready-10B981?style=for-the-badge" alt="Status" />
</p>

An intelligent, real-time **IoT Campus Parking Management & Telemetry System** designed for educational institutions. The system organizes campus two-wheeler traffic across dedicated zones (Ground Floor for Scooties, Basement for Bikes), tracks real-time parking occupancy with dynamic color coding, maintains a student vehicle permit registry with owner identification, simulates boom barrier access, automatically allocates the nearest available slot on entry, releases slots and archives history on exit, and calculates live parking duration per second using JavaScript.

---

## 🌟 7 Core Modules Specification

### 🔐 Module 1 – Login (Administrator Google Authentication)
- Allows authorized administrators to securely access the system using **Google Authentication**.
- Direct Google OAuth popup and 1-Click Authorized Security Admin Demo mode for evaluation.
- Secure role management supporting administrators, faculty members, and students.

### 📊 Module 2 – Dashboard
The central command dashboard displays the overall status of the campus parking system:
- **Total Parking Slots**: 160 Bays (80 Ground Floor + 80 Basement)
- **Occupied Slots**: Real-time counter of actively parked vehicles
- **Available Slots**: Real-time counter of available spaces
- **Number of Parked Vehicles**: Current count of parked two-wheelers
- **Today's Parking Entries**: Total inbound admissions logged today
- **Live Parking Statistics**: Visual breakdown of Ground Floor Scooties, Basement Bikes, EV vehicles, and campus traffic load
- **Real-Time Parking Data**: Live stream table with Student Owner, Roll Number, Stream, Phone, Vehicle Plate, Vehicle Type, Slot ID, Entry Time, and Live Duration Timer
- **Live Parking Status Updates**: Live telemetry pulse, barrier sensor status, and event feed

### 📝 Module 3 – Student Registration
Stores complete information about students and their two-wheelers:
- **Student Name**: Full student/driver name
- **Roll Number**: Formatted institutional ID (e.g. `CS21B044`)
- **Stream / Class**: Department (CSE, IT, AI/DS, EXTC, Mechanical, Civil, BCA/MCA, MBA, etc.)
- **Phone Number**: Mobile contact number
- **Vehicle Number**: Vehicle license plate (e.g. `MH-04-AB-1234`)
- **Vehicle Type**: 🛵 `Scooty` (Ground Floor) / 🏍️ `Bike` (Basement)
- **⚡ Engine Type**: Petrol vs Electric EV
- **Vehicle Owner Identification Tool**: Instant lookup helper allowing administrators to identify vehicle owners immediately by searching license plate, roll number, or name.

### 🅿️ Module 4 – Live Parking Map
Visually represents the digital parking layout:
- **Ground Floor (80 Bays)**: Strictly reserved for **Scooties** (G-01 to G-80 across Accounts Dept & Exam IT Dept wings).
- **Basement (80 Bays)**: Strictly reserved for **Bikes & Motorcycles** (B-01 to B-80 across Rows 1 to 4 Grid).
- **Status Color Coding**:
  - 🟢 **Available** (Emerald Green): Open for parking/booking
  - 🔴 **Occupied** (Crimson Red): Actively occupied
  - 🟡 **Reserved** (Amber Yellow): Pre-booked permit
  - ⚡ **EV Model** (Cyan Badge): Electric model
- **Real-Time Automatic Updates**: Occupied and available slots update instantaneously without requiring a webpage refresh.
- **Module 7 Integration**: Each occupied slot card displays its live per-second duration timer.

### 🚗 Module 5 – Vehicle Entry
When a student parks a vehicle, the administrator enters vehicle information:
- Checks available parking slots in real time.
- **Automatically assigns the nearest available slot**:
  - Scooty &rarr; Nearest Ground Floor bay (G-01..G-80)
  - Bike &rarr; Nearest Basement bay (B-01..B-80)
- Records exact entry timestamp and formatted check-in time.
- Updates the parking map and dashboard immediately.
- Generates a verifiable digital permit pass with QR code.

### 🚙 Module 6 – Vehicle Exit
When the student leaves the parking area, the administrator records the vehicle exit:
- Records exit time.
- Calculates elapsed stay duration.
- Releases the occupied parking slot back to Available on the Live Map.
- **Saves parking history**: Automatically archives completed parking records (Student Name, Roll No, Stream, Plate, Slot, Entry Time, Exit Time, Duration, Date) into persistent storage.

### ⏱️ Module 7 – Live Parking Timer
Every parked vehicle displays its parking duration in real time:
- Standard format:
  - `B12 — Parked for 02 Hours 15 Minutes`
  - `G08 — Parked for 45 Minutes`
- Real-time precision seconds ticking (`02h 15m 32s`).
- Automatically updates every second using client-side JavaScript (`setInterval`).
- Displayed across the **Live Parking Map**, **Dashboard Real-Time Table**, and dedicated **Live Parking Timer Monitor**.

---

## 🛠️ Technology Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend Framework** | React 19 (`react`, `react-dom`) | Declarative, component-based UI architecture |
| **Build & Dev Tooling** | Vite 8 | Ultra-fast Hot Module Replacement (HMR) & bundling |
| **Styling & Design** | Pure Modern CSS3 | Glassmorphism, CSS Grid, Flexbox, custom design tokens |
| **Authentication** | Firebase Auth + Google OAuth | Cloud authentication with local demo fallback |
| **Database & Sync** | Cloud Firestore + `localStorage` | Real-time persistence and offline state caching |
| **Typography** | Google Fonts (*Outfit*, *Plus Jakarta Sans*, *JetBrains Mono*) | Monospace plate badges & clean typography |
| **Code Quality** | ESLint 9 | Strict syntax and React 19 linting |

---

## 🚀 Quick Run Guide

### 1. Clone the Repository
```bash
git clone https://github.com/alzuni-shaikh/smart-college-parking-system.git
cd smart-college-parking-system/frontend
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Start Development Server
```bash
npm run dev
```
Open **[http://localhost:5173/](http://localhost:5173/)** in your web browser.

### 4. Build for Production
```bash
npm run build
```

---

## 📁 Project Directory Layout

```text
smart-college-parking-system/
├── README.md                      # Complete Project Documentation
└── frontend/                      # React + Vite Application
    ├── package.json               # Dependencies & build scripts
    ├── vite.config.js             # Vite configuration
    ├── eslint.config.js           # ESLint configuration
    ├── index.html                 # HTML5 template
    ├── src/
    │   ├── main.jsx               # React DOM entry
    │   ├── App.jsx                # Main application state & tab router
    │   ├── App.css                # Glassmorphic component styles
    │   ├── index.css              # Design system & tokens
    │   ├── components/
    │   │   ├── DashboardView.jsx              # Module 2 – Dashboard
    │   │   ├── ParkingLotMap.jsx              # Module 4 – Live Parking Map
    │   │   ├── StudentVehicleRegistration.jsx # Module 3 – Student Registration
    │   │   ├── GateSimulator.jsx              # Module 5 & 6 – Vehicle Entry & Exit
    │   │   ├── LiveParkingTimerView.jsx       # Module 7 – Live Parking Timer
    │   │   ├── ParkingHistoryView.jsx         # Module 6 – Saved Parking History
    │   │   ├── AnalyticsView.jsx              # Capacity analytics & traffic trend
    │   │   ├── LiveVehicleLog.jsx             # Activity access logs
    │   │   ├── Navbar.jsx                     # Top navigation header & live clock
    │   │   ├── PassModal.jsx                  # Digital QR permit modal
    │   │   ├── SlotBookingModal.jsx           # Bay pre-reservation modal
    │   │   ├── StatsOverview.jsx              # Summary metrics strip
    │   │   └── Icons.jsx                      # SVG icon library
    │   ├── data/
    │   │   └── initialSlots.js                # Initial 160 bays & registry dataset
    │   ├── firebase/
    │   │   ├── firebase.js                    # Firebase configuration
    │   │   └── auth.js                        # Google OAuth & email auth
    │   └── utils/
    │       └── timerUtils.js                  # Module 7 JavaScript duration calculation helpers
```

---

## 📜 License

This project is open-source and available under the [MIT License](LICENSE).