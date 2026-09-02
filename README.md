# 🛵 Smart College Parking Management System (SmartPark.College)

<p align="center">
  <img src="https://img.shields.io/badge/React-19.2-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React 19" />
  <img src="https://img.shields.io/badge/Vite-8.2-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" alt="JavaScript" />
  <img src="https://img.shields.io/badge/CSS3-Modern%20Dark%20Theme-1572B6?style=for-the-badge&logo=css3&logoColor=white" alt="CSS3" />
  <img src="https://img.shields.io/badge/Firebase-Auth%20%26%20Firestore-FFCA28?style=for-the-badge&logo=firebase&logoColor=black" alt="Firebase" />
  <img src="https://img.shields.io/badge/Status-Production%20Ready-10B981?style=for-the-badge" alt="Status" />
</p>

An intelligent, real-time **IoT Campus Parking Management System** designed for colleges and universities. The system streamlines campus two-wheeler traffic across dedicated zones (**Ground Floor for Scooties** and **Basement for Bikes**), monitors real-time parking occupancy with dynamic color coding, maintains user vehicle registration, calculates per-second parking duration timers, supports Google Sign-In and user registration, and provides instant 1-click sign out and bay checkout.

---

## 🌟 Core Architecture & Key Features

### 🔐 1. Authentication & User Registration (`Login.jsx`)
- **Google Sign-In**: 1-Click fast sign-in using official Google OAuth.
- **User Registration**: Register new students and staff with Name, College Email, Password, Vehicle Type (🛵 Scooty / 🏍️ Bike), and License Plate Number.
- **Email/Password Login**: Secure credential authentication with password visibility toggle and recovery link flow.
- **1-Click Demo Access**: Instant **Student Demo** and **Admin Demo** buttons to explore all features immediately without requiring external credentials.

### 🚪 2. Session Management & Sign Out (`Navbar.jsx`)
- **Prominent Sign Out Option**: Dedicated, easy-to-access **Sign Out** button in the top navigation bar.
- **Instant Session Clear**: Clears Firebase & local cache tokens and transitions cleanly back to the authentication screen.
- **Live Clock & Status**: Displays real-time campus clock and user profile badge.

### 📊 3. Central Command Dashboard (`DashboardView.jsx`)
- **4 Real-Time KPI Cards**:
  - 🅿️ **Total Parking Bays**: 160 Total Bays (80 Ground Floor + 80 Basement)
  - 🟢 **Available Slots**: Live available space counter
  - 🔴 **Occupied Slots**: Live occupied space counter
  - 🏍️ **Active Parked Vehicles**: Active two-wheeler count
- **Floor Capacity Progress Gauges**: Real-time percentage meters for Ground Floor (Scooties) and Basement (Bikes) with 1-click navigation to their layouts.
- **Active Vehicles Stream Table**: Live table displaying Bay ID, Floor, Student/Owner, License Plate, Status, and live per-second duration timers with 1-click checkout.

### 🅿️ 4. Interactive Parking Layout (`ParkingLotMap.jsx`)
- **Dedicated Floor Switcher**:
  - **Ground Floor (80 Bays)**: G-01 to G-80 strictly reserved for **Scooties** (Accounts Dept & Exam IT Dept wings).
  - **Basement (80 Bays)**: B-01 to B-80 strictly reserved for **Bikes & Motorcycles**.
- **Dynamic Status Color-Coding**:
  - 🟢 **Available**: Ready to park (Click to park/reserve).
  - 🔴 **Occupied**: Actively parked (Displays plate and owner).
  - 🟡 **Reserved**: Pre-booked campus pass.
- **Filters & Search**: Instant filter by status (*All*, *Available*, *Occupied*, *Reserved*) or search by Bay ID (e.g. `G-05`) or license plate.
- **Digital Permit Pass Modal**: Generates official campus digital parking permits with QR code simulation.

### ⏱️ 5. Real-Time Live Parking Telemetry (`LiveParkingTimerView.jsx`)
- **Per-Second Live Duration Ticker**: Real-time counter calculating exact parking duration (`01h 24m 15s`) updating every second using JavaScript.
- **Floor Filters & Search**: Filter active vehicles by Ground Floor or Basement.
- **Instant Bay Release**: 1-Click **Check Out & Release Bay** button to clear slots, update the map, and refresh available capacity immediately.

---

## 🛠️ Technology Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend Framework** | React 19 (`react`, `react-dom`) | Declarative, fast component-based UI architecture |
| **Build & Dev Tooling** | Vite 8 | Ultra-fast build tool and Hot Module Replacement (HMR) |
| **Styling & Design** | Modern CSS3 | Lightweight, responsive dark theme with sleek glassmorphism |
| **Authentication** | Firebase Auth + Google OAuth | Google Sign-In, Email/Password, and local demo session handler |
| **Database & Caching** | Cloud Firestore + `localStorage` | Real-time state synchronization and offline fallback |
| **Typography** | Google Fonts (*Outfit*, *Plus Jakarta Sans*, *JetBrains Mono*) | Monospace license plate formatting & clean typography |

---

## 🚀 Quick Start Guide

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

## 📁 Project Directory Structure

```text
smart-college-parking-system/
├── README.md                      # Project Documentation
└── frontend/                      # React + Vite Frontend
    ├── package.json               # Dependencies and scripts
    ├── vite.config.js             # Vite configuration
    ├── eslint.config.js           # ESLint configuration
    ├── index.html                 # HTML5 template with Google Fonts
    ├── src/
    │   ├── main.jsx               # React DOM entry point
    │   ├── App.jsx                # Main application state & view router
    │   ├── App.css                # Clean, responsive CSS stylesheet
    │   ├── index.css              # Base design tokens and typography
    │   ├── pages/
    │   │   ├── Login.jsx          # Google Sign-In & User Registration page
    │   │   └── Login.css          # Auth page styling
    │   ├── components/
    │   │   ├── Navbar.jsx         # Navigation bar with Sign Out & Clock
    │   │   ├── DashboardView.jsx  # KPI metrics & floor capacity overview
    │   │   ├── ParkingLotMap.jsx  # Visual Ground (Scooties) & Basement (Bikes) layout
    │   │   ├── LiveParkingTimerView.jsx # Live per-second timer monitor
    │   │   ├── SlotBookingModal.jsx     # Bay reservation & quick park modal
    │   │   ├── PassModal.jsx            # Official digital pass with QR code
    │   │   ├── NotificationToast.jsx    # Real-time alert notifications
    │   │   └── Icons.jsx                # SVG icon library
    │   ├── firebase/
    │   │   ├── firebase.js        # Firebase app configuration
    │   │   └── auth.js            # Google OAuth & Email auth handlers
    │   ├── data/
    │   │   └── initialSlots.js    # 160 bay layout (80 Ground + 80 Basement)
    │   └── utils/
    │       └── timerUtils.js      # Real-time parking duration helpers
```

---

## 📄 License & Attribution
Developed for Smart Campus IoT Initiatives. Open source for educational and institutional research.