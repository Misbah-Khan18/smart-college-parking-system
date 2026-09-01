# 🚗 Smart College Parking System - Frontend

This is the React 19 + Vite frontend application for the **Smart College Parking System**, architected with real-time IoT sensor telemetry, live per-second duration timers, automatic nearest-slot allocation, and digital parking floor layouts.

---

## 🚀 Quick Start Guide

### 1. Navigate to Frontend Directory
```bash
cd frontend
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

---

## 🛠️ Key Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts local Vite development server with instant Hot Module Replacement (HMR). |
| `npm run build` | Compiles and optimizes production bundle to `dist/`. |
| `npm run preview` | Previews the built production bundle locally. |
| `npm run lint` | Runs ESLint syntax and code quality checks. |

---

## 🌟 7 Core Modules Architecture

### 1. 🔐 Module 1 – Login (Administrator Google Authentication)
- Secure administrator access using authorized **Google Authentication**.
- Direct Google OAuth popup and 1-Click Authorized Security Admin Demo mode for offline testing.
- College staff, professor, and student credential support.

### 2. 📊 Module 2 – Dashboard
Comprehensive real-time command center displaying:
- **Total Parking Slots** (160 Bays: 80 Ground Floor + 80 Basement)
- **Occupied Slots** (Live dynamic counter)
- **Available Slots** (Live dynamic counter)
- **Number of Parked Vehicles** (Active two-wheelers)
- **Today's Parking Entries** (Daily inbound check-in counter)
- **Live Parking Statistics** (Ground Scooties vs Basement Bikes & EV distribution)
- **Real-Time Parking Data** (Live data table with student owner, roll number, stream, plate, vehicle type, bay ID, entry time, and live duration timer)
- **Live Parking Status Updates** (Real-time IoT telemetry heartbeat & event feed)

### 3. 📝 Module 3 – Student Registration
Stores complete records for students and their two-wheelers:
- **Student Name**
- **Roll Number / ID**
- **Stream / Department** (CSE, IT, AI/DS, EXTC, Mechanical, Civil, BCA/MCA, MBA, etc.)
- **Phone Number**
- **Vehicle Number (License Plate)**
- **Vehicle Type** (🛵 `Scooty` for Ground Floor / 🏍️ `Bike` for Basement)
- **⚡ Engine Type** (Normal Petrol vs Electric EV)
- **Administrator Vehicle Owner Identification Tool**: Instant search bar to identify vehicle owners, contact details, and streams by typing a license plate or roll number.

### 4. 🅿️ Module 4 – Live Parking Map
- Digital visual layout representing all 160 parking bays:
  - **Ground Floor (80 Bays)**: Reserved for **Scooties** (G-01 to G-80 across Accounts Dept & Exam IT Dept wings).
  - **Basement (80 Bays)**: Reserved for **Bikes & Motorcycles** (B-01 to B-80 across Rows 1 to 4).
- **Color Coding**:
  - 🟢 **Available** (Emerald Green)
  - 🔴 **Occupied** (Crimson Red)
  - 🟡 **Reserved** (Amber Yellow)
  - ⚡ **EV Model** (Cyan Badge)
- **Real-Time Updates**: Automatically reflects vehicle entries/exits instantly without webpage refresh.
- **Module 7 Integration**: Every occupied slot card dynamically displays its live per-second parking timer.

### 5. 🚗 Module 5 – Vehicle Entry
- Checks available parking slots in real time.
- **Automatically assigns the nearest available slot**:
  - Scooty &rarr; Nearest Ground Floor bay (G-01..G-80)
  - Bike &rarr; Nearest Basement bay (B-01..B-80)
- Records exact entry timestamp and formatted check-in time.
- Updates the live parking map immediately.
- Generates official digital permit pass with QR code.

### 6. 🚙 Module 6 – Vehicle Exit
- Records exit time upon vehicle departure.
- Releases the occupied parking slot back to Available on the Live Map in real time.
- **Saves complete parking history** (Student Name, Roll No, Stream, Plate, Slot, Entry Time, Exit Time, Total Duration) into persistent storage.

### 7. ⏱️ Module 7 – Live Parking Timer
- Displays live parking duration for every parked vehicle updating every second using JavaScript.
- Standard format:
  - `B12 — Parked for 02 Hours 15 Minutes`
  - `G08 — Parked for 45 Minutes`
- Live precision seconds ticker (`02h 15m 32s`).
- Dedicated **Live Parking Timer Monitor** with floor filters and stay duration alerts.

---

## 📁 Frontend Directory Layout

```text
frontend/
├── package.json               # Dependencies & scripts
├── vite.config.js             # Vite configuration
├── eslint.config.js           # ESLint configuration
├── index.html                 # HTML5 template
├── src/
│   ├── main.jsx               # React DOM root entry
│   ├── App.jsx                # Core App controller & module state manager
│   ├── App.css                # Glassmorphic component styles
│   ├── index.css              # Global CSS design tokens & grid
│   ├── components/
│   │   ├── DashboardView.jsx              # Module 2 – Dashboard
│   │   ├── ParkingLotMap.jsx              # Module 4 – Live Parking Map
│   │   ├── StudentVehicleRegistration.jsx # Module 3 – Student Registration
│   │   ├── GateSimulator.jsx              # Module 5 & 6 – Vehicle Entry & Exit
│   │   ├── LiveParkingTimerView.jsx       # Module 7 – Live Parking Timer
│   │   ├── ParkingHistoryView.jsx         # Module 6 – Saved Parking History
│   │   ├── AnalyticsView.jsx              # Capacity telemetry & traffic trends
│   │   ├── LiveVehicleLog.jsx             # Activity access logs
│   │   ├── Navbar.jsx                     # Top navigation header & live clock
│   │   ├── PassModal.jsx                  # Digital QR permit modal
│   │   ├── SlotBookingModal.jsx           # Bay pre-reservation modal
│   │   ├── StatsOverview.jsx              # Top capacity summary strip
│   │   └── Icons.jsx                      # SVG icon library
│   ├── data/
│   │   └── initialSlots.js                # Initial 160 slots & sample registry data
│   ├── firebase/
│   │   ├── firebase.js                    # Firebase app initialization
│   │   └── auth.js                        # Google OAuth & email authentication
│   └── utils/
│       └── timerUtils.js                  # Module 7 JavaScript timer calculation helpers
```
