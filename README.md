# 🛵 Smart College Parking Management System (SmartPark.Campus)

<p align="center">
  <img src="https://img.shields.io/badge/React-19.2-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React 19" />
  <img src="https://img.shields.io/badge/Vite-8.2-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" alt="JavaScript" />
  <img src="https://img.shields.io/badge/CSS3-Glassmorphism-1572B6?style=for-the-badge&logo=css3&logoColor=white" alt="CSS3" />
  <img src="https://img.shields.io/badge/Firebase-Auth%20%26%20Firestore-FFCA28?style=for-the-badge&logo=firebase&logoColor=black" alt="Firebase" />
  <img src="https://img.shields.io/badge/Status-Production%20Ready-10B981?style=for-the-badge" alt="Status" />
</p>

An intelligent, real-time **IoT Campus Parking Management & Reservation System** designed for educational institutions. It streamlines campus two-wheeler traffic, eliminates parking congestion, visualizes live bay occupancy across academic zones, maintains a centralized student vehicle registry, simulates automated ANPR boom barrier gates, and issues verifiable digital parking permits with QR codes.

---

## 🌟 Project Overview

Campus parking facilities frequently face operational challenges:
- Difficulty locating open parking bays during morning lecture rush hours.
- Disorganized vehicle placement causing corridor and gate bottlenecks.
- Manual paper logs for vehicle registrations and permit checks.
- Lack of real-time visibility into floor-wise capacity and utilization rates.
- Absence of centralized security records for vehicle movements.

**SmartPark.Campus** solves these challenges through an interactive, responsive web application combining live IoT sensor simulation, automated bay allocations, multi-floor visualization, and instant digital pass generation.

---

## ✨ Key Features & Modules

### 1. 🗺️ Multi-Floor Interactive Parking Map
Visualizes the campus parking facility with real-time slot telemetry:
- **Ground Floor (80 Bays)**: Dedicated **Girls' Scooty Parking** across Accounts Dept (Front/Opposite) and Exam IT Dept (Front/Opposite) wings.
- **Basement (80 Bays)**: Dedicated **Boys' Two-Wheeler / Bike Parking** across Rows 1 through 4.
- **Total Campus Capacity**: **160 Active Bays**.
- **Live Status Indicators**:
  - 🟢 **Available**: Bay is open and ready for parking or online reservation.
  - 🔴 **Occupied**: Vehicle is currently parked with license plate, owner, and entry timestamp.
  - 🟡 **Reserved**: Bay is pre-booked with an active reservation permit.
  - ⚡ **Electric EV Badge**: Highlights electric scooty/bike models.
- **Quick Filters & Search**: Instant filter by floor, academic section, occupancy status, or search by bay ID (e.g. `G-05`, `B-41`), license plate, or student name.

---

### 2. 📝 Student & Vehicle Registration Module
A centralized institutional registry for managing student authorizations and vehicle permits:
- **Registration Form Fields**:
  - **Student Name**: Full student/driver name.
  - **Roll Number / Student ID**: Formatted institutional ID (e.g. `CS22B044`).
  - **Stream / Class**: Selectable engineering/campus branches (CSE, IT, AI/DS, Mechanical, Civil, MBA, etc.) or custom department.
  - **Contact Phone Number**: Mobile contact (e.g. `+91 98765 43210`).
  - **Two-Wheeler Type**: 🛵 **Scooty** (Ground Floor) or 🏍️ **Bike / Motorcycle** (Basement).
  - **Power Engine Sub-Toggle**: ⛽ **Normal Petrol** vs ⚡ **Electric EV**.
  - **Vehicle License Plate**: License plate format (e.g. `MH-04-AB-1234`).
- **✨ Sample Data Button**: 1-click test button to populate realistic sample student profiles instantly.
- **Searchable Directory Table**: Search by student name, roll ID, stream, or plate with filter pills (`All`, `🛵 Scooties`, `🏍️ Bikes`, `⚡ EV Models`).
- **Integrated Actions**:
  - 🎫 **View Pass**: Generates an official digital QR parking pass for the student.
  - 🅿️ **Book**: Pre-fills the reservation modal with the student's credentials for instant bay booking.
  - 🗑️ **De-register**: Removes vehicle from active registry with confirmation.

---

### 3. 🚧 Simulated ANPR Boom Barrier Gate Terminal
Simulates automated gate entry and exit workflows:
- **Inbound Terminal (ANPR Scanner)**:
  - Scans incoming license plates and matches pre-reservations or auto-assigns open bays according to floor rules (Scooty &rarr; Ground Floor, Bike &rarr; Basement).
  - **Quick Select Registered Student**: 1-click dropdown to test any registered student vehicle immediately.
  - Animated boom barrier with dynamic status lights (`Closed`, `Opening`, `Open`, `Closing`).
  - Automatic digital pass preview upon barrier clearance.
- **Outbound Terminal (Checkout)**:
  - Validates exit, calculates session duration, frees the parking bay in real time, and logs checkout telemetry.

---

### 4. 📊 Real-Time Analytics & Telemetry Dashboard
- **Live Capacity Metrics**: Available bays count, occupancy load percentage, and active campus utilization progress bars.
- **Section-by-Section Breakdown**: Live open bay chips and utilization meters for all 8 campus sections.
- **Hourly Occupancy Bar Chart**: Visualizes traffic trends from 07:00 AM to 05:00 PM to forecast morning peak arrival waves.

---

### 5. 📜 Gate Telemetry & Security Audit Logs
- Comprehensive chronological access records capturing:
  - Timestamp (e.g. `09:40 AM`)
  - Action (`ENTRY` / `EXIT`)
  - License Plate Number
  - Assigned Parking Slot
  - User Role / Category
  - Two-Wheeler Type (`Scooty`, `Bike`, `EV`)
  - Terminal / Gate ID

---

### 6. 🔐 Authentication & Role Management
- **Google OAuth Sign-In**: 1-click Google sign-in available on both Sign In and Register screens.
- **Campus Email Authentication**: Full registration and login with email verification and password reset.
- **⚡ 1-Click Quick Demo Access**: Instant evaluation modes for:
  - 🛡️ **Security Admin**: Full administrative control and audit logs.
  - 🎓 **Student**: Bay booking, vehicle registration, and digital QR passes.
  - 👨‍🏫 **Professor / Faculty**: Priority academic bays.
- **Reliable Sign Out**: Prominent sign out button in the navigation header that clears sessions and returns cleanly to the landing page.

---

## 🖥️ User Interface Preview

```text
+---------------------------------------------------------------------------------------------------------+
| [P] SmartPark.Campus    [🅿️ Parking Map] [📝 Vehicle Registry] [🚧 Gate Terminal] [📊 Live Analytics] [Sign Out] |
+---------------------------------------------------------------------------------------------------------+
|  [Available: 82/160]   [Ground Floor: 44/80 Open]   [Basement: 38/80 Open]   [Campus Load: 48% Occupied] |
+---------------------------------------------------------------------------------------------------------+
|  🔍 Search bay ID / plate...   [Ground Floor (Girls Scooty)] [Basement (Boys Bikes)]   [+ Reserve Bay]  |
|                                                                                                         |
|  +--------------------+  +--------------------+  +--------------------+  +--------------------+         |
|  | Bay G-01  [OCCUPIED|  | Bay G-02 [AVAILABLE|  | Bay G-03   [⚡ EV] |  | Bay G-04 [RESERVED]|         |
|  | MH-04-AB-1234      |  | Ready to park      |  | MH-04-CD-5678 (Occ)|  | Reserved for Exam  |         |
|  | Ananya Deshmukh    |  | Open Scooty Bay    |  | Pooja Iyer         |  | Sneha Patil        |         |
|  +--------------------+  +--------------------+  +--------------------+  +--------------------+         |
+---------------------------------------------------------------------------------------------------------+
```

---

## 🛠️ Technology Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend Framework** | React 19 (`react`, `react-dom`) | Declarative, component-based UI architecture |
| **Build & Dev Tooling** | Vite 8 | Ultra-fast Hot Module Replacement (HMR) & bundling |
| **Styling & Design** | Pure Modern CSS3 | Glassmorphism, CSS Grid, Flexbox, custom design tokens |
| **Authentication** | Firebase Auth + Google OAuth | Cloud authentication with local demo fallback |
| **Database & Sync** | Cloud Firestore + `localStorage` | Real-time persistence and offline state caching |
| **Typography** | Google Fonts (*Outfit*, *Plus Jakarta Sans*, *JetBrains Mono*) | Premium readability & monospace plate badges |
| **Code Quality** | ESLint 9 | Strict syntax and React 19 linting |

---

## 📁 Project Directory Structure

```text
smart-college-parking-system/
├── README.md                      # Comprehensive Project Documentation
└── frontend/                      # React + Vite Frontend Application
    ├── package.json               # Project metadata, scripts, and dependencies
    ├── vite.config.js             # Vite build and plugin configuration
    ├── eslint.config.js           # ESLint configuration
    ├── index.html                 # HTML5 entry template with Google Fonts
    ├── src/
    │   ├── main.jsx               # React DOM root entrypoint
    │   ├── App.jsx                # Application orchestration, routing & state
    │   ├── index.css              # Global tokens, reset & base typography
    │   ├── App.css                # Component styles, glassmorphism & layout
    │   ├── components/
    │   │   ├── Icons.jsx          # Custom SVG Icon library
    │   │   ├── Navbar.jsx         # Header with live clock, tabs & sign out
    │   │   ├── StatsOverview.jsx  # KPI metrics & floor capacity cards
    │   │   ├── ParkingLotMap.jsx  # 160-slot multi-floor visualizer & filters
    │   │   ├── StudentVehicleRegistration.jsx # Student & vehicle registration module
    │   │   ├── GateSimulator.jsx  # Animated ANPR boom barrier terminal
    │   │   ├── AnalyticsView.jsx  # Section telemetry & hourly occupancy chart
    │   │   ├── LiveVehicleLog.jsx # Telemetry audit records table
    │   │   ├── SlotBookingModal.jsx # Reservation modal with student auto-fill
    │   │   ├── PassModal.jsx      # Digital QR parking permit modal
    │   │   └── NotificationToast.jsx # Floating auto-dismiss alert toasts
    │   ├── pages/
    │   │   ├── Login.jsx          # Login, Registration & Google OAuth page
    │   │   └── Login.css          # Authentication screen styling
    │   ├── firebase/
    │   │   ├── firebase.js        # Firebase app initialization
    │   │   └── auth.js            # Authentication & Firestore helper methods
    │   └── data/
    │       └── initialSlots.js    # Initial 160 slots, logs & traffic trends
```

---

## 🚀 Getting Started (Step-by-Step)

### 📋 Prerequisites
Ensure the following are installed:
- [Node.js](https://nodejs.org/) (Version **18.x** or higher)
- `npm` (Bundled with Node.js)

Verify installations:
```bash
node --version
npm --version
```

---

### ⚙️ Installation & Launch

1. **Clone the repository**:
   ```bash
   git clone https://github.com/alzuni-shaikh/smart-college-parking-system.git
   cd smart-college-parking-system
   ```

2. **Navigate to the frontend directory**:
   ```bash
   cd frontend
   ```

3. **Install dependencies**:
   ```bash
   npm install
   ```

4. **Start the local development server**:
   ```bash
   npm run dev
   ```

5. **Open in browser**:
   Navigate to [http://localhost:5173/](http://localhost:5173/) to access the dashboard.

---

### 📦 Available Scripts

Inside the `frontend` folder:

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts the Vite development server with Hot Module Replacement at `http://localhost:5173`. |
| `npm run build` | Compiles an optimized production bundle inside `frontend/dist/`. |
| `npm run preview` | Previews the production build locally. |
| `npm run lint` | Runs ESLint to verify code quality and compliance (0 errors). |

---

## 🔮 Future Roadmap & Hardware Architecture

The platform provides a modular foundation for future hardware integrations:

```text
                  SMART CAMPUS PARKING ECOSYSTEM
                               │
            ┌──────────────────┼──────────────────┐
            │                  │                  │
       Web Platform       IoT Sensors        ANPR Camera
     (React 19 / Vite)   (ESP32 / Ultrasonic) (OpenCV / Python)
            │                  │                  │
            └──────────────────┼──────────────────┘
                               │
                       Cloud / Database
                    (Firebase / Firestore)
                               │
                 ┌─────────────┼─────────────┐
                 │             │             │
              Students     Security     Administration
```

- [ ] **Physical IoT Sensors**: Connect ESP32 / Arduino microcontrollers with ultrasonic/IR sensors for real-time bay occupancy detection.
- [ ] **Live ANPR Cameras**: Integrate OpenCV / Python OCR service for automated license plate scanning at physical campus gates.
- [ ] **Automated Hardware Barriers**: Connect servo-controlled boom barriers triggered directly by permit verification.
- [ ] **WhatsApp & SMS Notifications**: Automatic alerts for reservation expiration and unauthorized parking.

---

## 📄 License & Attribution

Developed for academic and institutional evaluation as a **Smart College Parking Management System**.

<p align="center">
  ⭐ <b>SmartPark.Campus</b> — Making Campus Parking Smarter, Simpler & Organized.
</p>