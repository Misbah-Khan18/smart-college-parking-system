# 🚗 Smart College Parking System - Frontend

React 19 + Vite frontend application for the **Smart College Parking System**, architected with real-time slot telemetry, Google Sign-In authentication, user vehicle registration, live per-second duration timers, and interactive parking floor layouts.

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

## 🌟 Application Structure & Features

### 1. 🔐 Authentication & Registration (`Login.jsx`)
- **Google Sign-In**: Instant 1-click Google OAuth authentication.
- **User Registration**: Register student/faculty accounts with Name, Email, Password, Vehicle Type (Scooty / Bike), and License Plate Number.
- **Email/Password Sign-In**: Secure credentials with show/hide password and recovery link.
- **1-Click Demo Preview**: "Student Demo" and "Admin Demo" buttons for instant testing.

### 2. 🚪 Sign Out & Header Navigation (`Navbar.jsx`)
- **Prominent Sign Out**: Instant 1-click **Sign Out** button in the top navbar.
- **Session Reset**: Resets session tokens and navigates back to the Login view.
- **Live Campus Clock**: Real-time per-second institutional clock.
- **Quick Park Button**: Quick access to park or reserve a bay.

### 3. 📊 Dashboard (`DashboardView.jsx`)
- **4 Key KPI Cards**: Total Slots (160), Available Slots, Occupied Slots, and Active Vehicles.
- **Capacity Progress Meters**: Ground Floor (Scooties) vs Basement (Bikes) with 1-click layout navigation.
- **Active Vehicles Table**: Real-time table displaying vehicle plate, owner, bay ID, and live duration timer with 1-click checkout.

### 4. 🅿️ Parking Layout (`ParkingLotMap.jsx`)
- **Floor Switcher**: Toggle between **Ground Floor (Scooties)** and **Basement (Bikes)**.
- **Color-Coded Bays**: 🟢 Available, 🔴 Occupied, and 🟡 Reserved.
- **Filters & Search**: Filter by status or search by bay ID/plate.
- **Click-to-Park & Pass Generation**: Interactive booking modal generating digital permits with simulated QR code.

### 5. ⏱️ Live Parking Telemetry (`LiveParkingTimerView.jsx`)
- **Per-Second Live Duration**: Precision ticking duration timers for every active vehicle.
- **Instant Checkout**: One-click **Check Out & Release Bay** button to clear slots and refresh availability.

---

## 📁 Frontend Directory Layout

```text
frontend/
├── package.json               # Dependencies & scripts
├── vite.config.js             # Vite configuration
├── eslint.config.js           # ESLint configuration
├── index.html                 # HTML5 template with Google Fonts
├── src/
│   ├── main.jsx               # React DOM root entry
│   ├── App.jsx                # Application state & view router
│   ├── App.css                # Modern, responsive CSS stylesheet
│   ├── index.css              # Global tokens & typography
│   ├── pages/
│   │   ├── Login.jsx          # Google Sign-In & User Registration
│   │   └── Login.css          # Auth styling
│   ├── components/
│   │   ├── Navbar.jsx         # Top navbar with Sign Out button & clock
│   │   ├── DashboardView.jsx  # KPI metrics & capacity overview
│   │   ├── ParkingLotMap.jsx  # Ground & Basement visual map
│   │   ├── LiveParkingTimerView.jsx # Live per-second timers
│   │   ├── SlotBookingModal.jsx     # Bay reservation modal
│   │   ├── PassModal.jsx            # Digital QR permit pass modal
│   │   ├── NotificationToast.jsx    # Real-time toast notifications
│   │   └── Icons.jsx                # SVG icon library
│   ├── firebase/
│   │   ├── firebase.js        # Firebase initialization
│   │   └── auth.js            # Auth handlers (Google + Email)
│   ├── data/
│   │   └── initialSlots.js    # 160 slot initial data (Scooty & Bike)
│   └── utils/
│       └── timerUtils.js      # Duration formatting utilities
```
