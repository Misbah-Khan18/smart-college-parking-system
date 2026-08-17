# 🚗 Smart College Parking System (SmartPark.Campus)

<p align="center">
  <img src="https://img.shields.io/badge/React-19.2-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React 19" />
  <img src="https://img.shields.io/badge/Vite-8.2-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" alt="JavaScript" />
  <img src="https://img.shields.io/badge/CSS3-Glassmorphism-1572B6?style=for-the-badge&logo=css3&logoColor=white" alt="CSS3" />
  <img src="https://img.shields.io/badge/Status-Active%20%26%20Ready-10B981?style=for-the-badge" alt="Status" />
</p>

An intelligent, real-time **IoT Campus Parking Management & Reservation System** designed for colleges and universities. It streamlines vehicle entry/exit, eliminates campus parking congestion, visualizes live slot status across academic zones, simulates automated ANPR boom barrier gates, and issues verifiable digital parking permits with QR codes.

---

## 🌟 Key Highlights & Features

### 1. 🗺️ Interactive Live Parking Bay Visualizer
- **Multi-Zone Architecture**:
  - **Zone A**: Student 4-Wheeler Parking
  - **Zone B**: Faculty & Academic Staff Reserved Zone
  - **Zone C**: EV Eco-Charging Stations (Fast Recharging Ports)
  - **Zone D**: Two-Wheeler / Motorcycle & Scooter Bay
- **Live Status Indicators**: Visual indicators showing **🟢 Available**, **🔴 Occupied**, and **🟡 Reserved** slots.
- **Search & Filters**: Instant search by slot ID (`A-02`), vehicle plate number, or driver name with category & zone filtering.

### 2. 🎟️ Instant Slot Reservation & Digital Permit Generator
- Book parking slots in advance by specifying vehicle type, driver name, and student/faculty ID.
- Dynamic duration calculator (1 hr, 2 hrs, 4 hrs, full day).
- **Official Digital Campus Parking Pass**: Generates an institution-branded parking permit with a simulated QR code for contactless scanning at gate terminals, complete with a one-click print/PDF save option.

### 3. 🚧 Simulated ANPR Boom Barrier Gate Terminal
- **Automated Inbound Entry Terminal**: Simulates Automatic Number Plate Recognition (ANPR). Auto-allocates an open bay or matches existing reservations, with animated barrier opening and traffic lights.
- **Automated Outbound Checkout**: Automatically calculates parking duration, processes institutional clearance, opens the exit barrier, and frees up the slot in real time.

### 4. 📊 Real-Time Campus Traffic Analytics & Telemetry
- Hourly parking occupancy bar charts showing campus rush hours and peak morning lecture periods.
- Zone-by-zone utilization and EV charging load efficiency metrics.
- Key Performance Indicators (KPIs): Total capacity, live available bays, occupancy percentage, and active permits.

### 5. 📝 Gate Telemetry & Security Audit Logs
- Comprehensive access log capturing vehicle license plates, timestamps, entry/exit gates, user categories, and parking duration.

### 6. 👥 Role-Based Workflow
- **Student Mode**: View open bays, reserve slots, and generate digital permits.
- **Faculty / Staff Mode**: Access priority academic parking bays.
- **Security Admin Mode**: Manual vehicle release, gate override, and full audit logs.

---

## 🖥️ User Interface Preview

```
+---------------------------------------------------------------------------------------+
|  [P] SmartPark.Campus    [Parking Map]  [Gate Terminal]  [Analytics]  [Activity Log]  |
+---------------------------------------------------------------------------------------+
|  [Available: 12/26]     [Occupied: 14]     [EV Ports: 2/4]     [Two-Wheelers: 4/8]    |
+---------------------------------------------------------------------------------------+
|  🔍 Search slot / plate...    [All Zones] [Zone A] [Zone B] [Zone C] [Zone D]   [+Book] |
|                                                                                       |
|  +--------------+  +--------------+  +--------------+  +--------------+               |
|  | Slot A-01    |  | Slot A-02    |  | Slot A-03    |  | Slot A-04    |               |
|  | [OCCUPIED]   |  | [AVAILABLE]  |  | [OCCUPIED]   |  | [RESERVED]   |               |
|  | KA-05-MB-4412|  | Ready to park|  | DL-01-AB-1904|  | MH-12-PQ-9081|               |
|  +--------------+  +--------------+  +--------------+  +--------------+               |
+---------------------------------------------------------------------------------------+
```

---

## 🚀 How to Run the Project

### 📋 Prerequisites
Ensure you have the following installed on your computer:
- [Node.js](https://nodejs.org/) (Version **18.x** or higher recommended)
- `npm` (Comes packaged with Node.js)

---

### ⚙️ Quick Start (Step-by-Step)

You can run the project **directly from the root folder** or inside the `frontend` folder:

#### Option A: Run directly from the root folder
```bash
# 1. Install frontend dependencies (if not done yet)
npm run install-frontend

# 2. Start the dev server
npm run dev
```

#### Option B: Run from the `frontend` folder
```bash
# 1. Navigate to frontend
cd frontend

# 2. Install dependencies
npm install

# 3. Start the dev server
npm run dev
```

#### Step 4: Open in Your Web Browser
Once started, open your web browser and navigate to:
```
http://localhost:5173/
```

---

### 📦 Available Scripts

In the `frontend` directory, you can run:

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts the local development server at `http://localhost:5173` with Hot Module Replacement (HMR). |
| `npm run build` | Builds the production-ready optimized bundle inside the `dist/` directory. |
| `npm run preview` | Previews the production build locally. |
| `npm run lint` | Runs ESLint to check for code quality and syntax standards. |

---

## 🛠️ Common Frontend Errors & How They Were Cleared

### 1. ❌ *Error: `'vite'` is not recognized as an internal or external command*
- **Cause**: The project dependencies (`node_modules`) were not installed after cloning or setting up the repo.
- **Fix**: Run `npm install` inside the `frontend/` folder to install all packages specified in `package.json`.

### 2. ❌ *Error: Blank white screen / CORS policy error when opening `index.html` directly via file explorer (`file:///` protocol)*
- **Cause**: Modern web frameworks like React + Vite utilize standard JavaScript ES Modules (`<script type="module" src="/src/main.jsx">`). Web browsers enforce strict Cross-Origin (CORS) security restrictions that prevent ES module scripts from executing under the `file://` protocol.
- **Fix**: Always run the application using the local development server (`npm run dev`) or a local HTTP server instead of double-clicking `index.html`.

### 3. ❌ *Error: Port `5173` already in use*
- **Cause**: Another background process or instance of Vite is running on port 5173.
- **Fix**: Run `npx vite --port 3000` or let Vite automatically bind to the next available open port.

---

## 📁 Project Directory Structure

```text
smart-college-parking-system/
├── README.md                      # Comprehensive Project Documentation
└── frontend/                      # React + Vite Frontend Application
    ├── package.json               # Project metadata, scripts, and dependencies
    ├── vite.config.js             # Vite build and plugin configuration
    ├── eslint.config.js           # ESLint linting configuration
    ├── index.html                 # HTML5 template with Google Fonts & metadata
    ├── public/
    │   ├── favicon.svg            # Smart parking favicon
    │   └── icons.svg              # SVG asset sprites
    └── src/
        ├── main.jsx               # React DOM root entrypoint
        ├── App.jsx                # Main application state and layout manager
        ├── index.css              # Global styles, glassmorphism design tokens & typography
        ├── App.css                # Component styles, animations, boom barrier & cards
        ├── components/
        │   ├── Icons.jsx          # Custom SVG Icon components
        │   ├── Navbar.jsx         # Header with live clock, tabs, alerts & role switcher
        │   ├── StatsOverview.jsx  # KPI metrics cards and capacity progress indicators
        │   ├── ParkingLotMap.jsx  # Interactive 2D parking bay grid with search & filters
        │   ├── SlotBookingModal.jsx# Slot reservation modal and input validator
        │   ├── GateSimulator.jsx  # Automated boom barrier in/out terminal simulator
        │   ├── LiveVehicleLog.jsx # Real-time gate telemetry and audit log table
        │   ├── AnalyticsView.jsx  # Hourly occupancy charts & zone breakdown
        │   ├── PassModal.jsx      # Digital parking pass with QR code & print support
        │   └── NotificationToast.jsx # Floating real-time alert notifications
        └── data/
            └── initialSlots.js    # Mock parking bay data, telemetry logs, and traffic patterns
```

---

## 🔧 Technology Stack

- **Core Library**: [React 19](https://react.dev/)
- **Build Tool & Dev Server**: [Vite 8](https://vite.dev/)
- **Styling**: Pure Modern CSS3 (Glassmorphism, CSS Grid, Flexbox, Custom CSS Variables)
- **Typography**: Google Fonts ([Outfit](https://fonts.google.com/specimen/Outfit), [Plus Jakarta Sans](https://fonts.google.com/specimen/Plus+Jakarta+Sans), [JetBrains Mono](https://fonts.google.com/specimen/JetBrains+Mono))
- **Icons**: Custom Clean Vector SVGs

---

## 🔮 Future Roadmap & Hardware Integration

- [ ] **Hardware Sensors**: Connect ESP32 / Arduino microcontrollers with HC-SR04 ultrasonic sensors for physical bay occupancy detection.
- [ ] **Live Camera ANPR**: Integrate OpenCV / Python OCR service to read license plates directly from physical camera feeds.
- [ ] **Cloud Database**: Synchronize real-time telemetry across campuses using Firebase Firestore or PostgreSQL.
- [ ] **SMS / WhatsApp Alerts**: Automated push notifications when reserved parking duration is about to expire.

---

<p align="center">
  Built for <b>Smart College Mini Project</b> • Department of Computer Science & Engineering
</p>
