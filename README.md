# 🚗 Smart College Parking System (SmartPark.Campus)

<p align="center">
  <img src="https://img.shields.io/badge/React-19.2-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React 19" />
  <img src="https://img.shields.io/badge/Vite-8.2-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" alt="JavaScript" />
  <img src="https://img.shields.io/badge/CSS3-Glassmorphism-1572B6?style=for-the-badge&logo=css3&logoColor=white" alt="CSS3" />
  <img src="https://img.shields.io/badge/Status-Active%20%26%20Ready-10B981?style=for-the-badge" alt="Status" />
</p>

A smart web-based College Parking Management System designed to efficiently manage, monitor, and organize campus parking facilities.

SmartPark.Campus provides a centralized interface for managing parking slots across different campus floors, registering students and vehicles, monitoring slot availability, and improving the overall parking experience for students, faculty, and security administrators.

The system is designed as a foundation for future integration with IoT sensors, ANPR cameras, automated barriers, and real-time cloud-based parking management.

🌟 Project Overview

College parking areas often face problems such as:

Difficulty finding available parking spaces
Unorganized vehicle parking
Lack of centralized parking information
Manual vehicle and student record management
Difficulty monitoring occupied and available slots
Congestion during peak college hours
Lack of proper parking records and analytics

SmartPark.Campus addresses these problems through an interactive web application that provides a visual representation of campus parking areas and centralized parking management.

✨ Key Features
1. 🗺️ Interactive Parking Map

The system provides an interactive visualization of the college parking facility.

Multi-Floor Parking

The current system supports multiple parking floors:

🅿️ Basement Parking
🏫 Ground Floor Parking

Each floor contains a large number of parking spaces represented visually through an interactive parking layout.

Current Parking Capacity
Basement: 80 parking slots
Ground Floor: 80 parking slots
Total: 160 parking slots

The architecture can be extended to support additional floors and parking zones in the future.

2. 🟢 Live Parking Slot Status

Each parking slot displays its current status.

Status Indicators

🟢 Available
The slot is currently free and can be used.

🔴 Occupied
A vehicle is currently parked in the slot.

🟡 Reserved
The slot has been reserved for a registered user.

The visual parking map allows administrators and users to quickly understand the current parking situation.

3. 🏢 Floor Selection

Since the college parking facility consists of multiple levels, users can switch between parking floors.

The interface provides an easy way to select:

Basement Parking
Ground Floor Parking

This prevents the interface from becoming overcrowded while still providing complete visibility of the parking facility.

4. 👨‍🎓 Student & Vehicle Registration

The system provides a centralized registration module for maintaining student and vehicle information.

Administrators can register:

Student Name
Roll Number
Stream / Class
Phone Number
Vehicle Number
Vehicle Type
Supported Vehicle Types
🏍️ Two-Wheeler
🚗 Four-Wheeler

This registration information can be used to associate vehicles with students and parking records.

5. 🎟️ Parking Slot Management

The system allows parking slots to be monitored and managed through the dashboard.

Administrators can identify:

Available slots
Occupied slots
Reserved slots
Slot numbers
Vehicle information
Parking floor

This provides a centralized overview of the campus parking facility.

6. 🔍 Search & Filtering

The parking interface supports searching and filtering parking information.

Users can search using available parking information such as:

Slot ID
Vehicle Number
Student / Driver information

Parking data can also be filtered according to parking floor and other available categories.

7. 📊 Parking Dashboard & Analytics

The dashboard provides important parking statistics to help administrators understand parking utilization.

Key Performance Indicators
Total Parking Capacity
Available Slots
Occupied Slots
Reserved Slots
Parking Occupancy Percentage
Registered Vehicles
Registered Students

The analytics section can be used to identify parking usage patterns and support better campus parking management.

8. 📝 Parking Activity & Records

The system is designed to maintain parking-related activity records.

Important information can include:

Vehicle Number
Student / User
Parking Slot
Entry Information
Exit Information
Parking Duration
Parking Status

These records can help administrators monitor parking activity and maintain a history of vehicle usage.

👥 User Roles

The system is designed around role-based parking management.

👨‍🎓 Student

Students can:

View parking availability
Check available parking slots
View parking floor layouts
Register vehicle information
Identify suitable parking spaces
👨‍🏫 Faculty / Staff

Faculty and staff can:

View parking availability
Access designated parking areas
Register vehicle information
Monitor parking availability
🛡️ Security / Administrator

Administrators have access to parking management functionality including:

Student registration
Vehicle registration
Parking slot management
Parking status monitoring
Parking records
Activity monitoring
Parking analytics
🖥️ Current User Interface

The application is organized into a modern dashboard interface.

+--------------------------------------------------------------------------------+
|  🚗 SmartPark.Campus     Dashboard   Parking Map   Registration   Analytics   |
+--------------------------------------------------------------------------------+
|                                                                                |
|  Total Slots      Available       Occupied       Registered Vehicles          |
|     160              82              78                  96                    |
|                                                                                |
+--------------------------------------------------------------------------------+
|                                                                                |
|  Parking Floor                                                                 |
|                                                                                |
|       [ Basement Parking ]     [ Ground Floor Parking ]                       |
|                                                                                |
+--------------------------------------------------------------------------------+
|                                                                                |
|  🔍 Search Slot / Vehicle Number                                               |
|                                                                                |
|  🟢 Available     🔴 Occupied     🟡 Reserved                                  |
|                                                                                |
|  +----------+  +----------+  +----------+  +----------+                       |
|  |  A-01    |  |  A-02    |  |  A-03    |  |  A-04    |                       |
|  | AVAILABLE|  | OCCUPIED |  | AVAILABLE|  | RESERVED |                       |
|  +----------+  +----------+  +----------+  +----------+                       |
|                                                                                |
+--------------------------------------------------------------------------------+
🛠️ Technology Stack
Frontend
React 19
JavaScript (ES6+)
HTML5
CSS3
Development Environment
Vite
Node.js
npm
UI Technologies
CSS Grid
Flexbox
CSS Variables
Responsive Design
Custom SVG Icons
Modern Dashboard UI
📁 Project Structure
smart-college-parking-system/
│
├── README.md
│
└── frontend/
    │
    ├── package.json
    ├── vite.config.js
    ├── eslint.config.js
    ├── index.html
    │
    ├── public/
    │   ├── favicon.svg
    │   └── icons.svg
    │
    └── src/
        │
        ├── main.jsx
        ├── App.jsx
        ├── index.css
        ├── App.css
        │
        ├── components/
        │   ├── Icons.jsx
        │   ├── Navbar.jsx
        │   ├── StatsOverview.jsx
        │   ├── ParkingLotMap.jsx
        │   ├── SlotBookingModal.jsx
        │   ├── GateSimulator.jsx
        │   ├── LiveVehicleLog.jsx
        │   ├── AnalyticsView.jsx
        │   ├── PassModal.jsx
        │   └── NotificationToast.jsx
        │
        └── data/
            └── initialSlots.js

The exact component structure may evolve as new modules such as Student & Vehicle Registration are added.

🚀 How to Run the Project
Prerequisites

Make sure the following are installed:

Node.js 18.x or higher
npm

You can verify the installation using:

node --version
npm --version
⚙️ Installation

Clone the repository:

git clone https://github.com/alzuni-shaikh/smart-college-parking-system.git

Navigate into the project:

cd smart-college-parking-system

Navigate to the frontend:

cd frontend

Install dependencies:

npm install

Start the development server:

npm run dev

The application will normally be available at:

http://localhost:5173/
📦 Available Scripts

Inside the frontend directory:

Command	Description
npm run dev	Starts the Vite development server
npm run build	Creates an optimized production build
npm run preview	Previews the production build
npm run lint	Runs ESLint for code quality checks
🧪 Current System Status
Module	Status
React + Vite Application	✅ Implemented
Parking Dashboard	✅ Implemented
Basement Parking Layout	✅ Implemented
Ground Floor Parking Layout	✅ Implemented
80 Slots per Floor	✅ Implemented
Parking Slot Visualization	✅ Implemented
Available / Occupied Status	✅ Implemented
Floor Selection	✅ Implemented
Parking Search / Filtering	✅ Implemented
Student Registration	🔄 In Development
Vehicle Registration	🔄 In Development
Parking Reservation	🔄 In Development
Digital Parking Permit	🔄 In Development
Parking Analytics	🔄 Improving
Gate Management	🔮 Planned
Real-Time IoT Sensors	🔮 Future
ANPR Camera Integration	🔮 Future
Cloud Database	🔮 Future
🔮 Future Scope

The current web application provides the foundation for a complete smart campus parking ecosystem.

Future versions can include:

📡 IoT-Based Parking Detection

Integration with:

ESP32
Arduino
Ultrasonic Sensors
IR Sensors

Sensors can automatically detect whether a parking slot is occupied.

📷 Automatic Number Plate Recognition

A camera-based ANPR system can automatically detect vehicle registration numbers at campus entry and exit gates.

Potential technologies:

OpenCV
Python
OCR
Computer Vision
🚧 Automated Boom Barrier

The system can be integrated with automated barriers to control vehicle entry and exit.

Possible workflow:

Vehicle Arrives
      ↓
Number Plate Detection
      ↓
Vehicle Verification
      ↓
Parking Availability Check
      ↓
Barrier Opens
      ↓
Parking Slot Assigned
      ↓
Vehicle Parks
☁️ Cloud Database

A future backend can synchronize parking information across multiple campus devices.

Possible technologies:

PostgreSQL
Firebase
Node.js
Express.js

This would allow administrators to access live parking information from different locations.

📱 Notifications

Future versions may provide:

Parking reservation notifications
Parking expiry reminders
Vehicle entry alerts
Vehicle exit notifications
Administrative alerts

Possible communication channels include:

SMS
WhatsApp
Email
Push Notifications
🎯 Project Objectives

The major objectives of SmartPark.Campus are:

To provide an organized digital parking management system for colleges.
To display parking slot availability through an interactive interface.
To manage multiple college parking floors.
To maintain student and vehicle registration records.
To reduce the time required to find available parking spaces.
To improve parking space utilization.
To provide administrators with centralized parking information.
To maintain parking activity and vehicle records.
To provide a foundation for future IoT-based parking automation.
To improve the overall efficiency and security of campus parking management.
💡 Benefits
For Students
Quickly identify available parking spaces
Reduce time spent searching for parking
Register vehicle information
View parking layouts easily
For Faculty & Staff
Better access to designated parking areas
Improved parking organization
Easier vehicle management
For College Administration
Centralized parking management
Better utilization of available space
Student and vehicle records
Parking usage analytics
Improved monitoring and security
For Security Personnel
Easier vehicle verification
Parking activity monitoring
Better control over campus vehicle movement
Future integration with ANPR and automated gates
📌 Project Scope

SmartPark.Campus focuses on developing a web-based smart parking management solution for educational institutions.

The system currently focuses on parking visualization, floor-wise slot management, parking status monitoring, and student/vehicle management.

The architecture is designed so that future hardware and backend technologies can be integrated without redesigning the entire application.

🚀 Future Vision
                    SMART CAMPUS PARKING
                            │
            ┌───────────────┼───────────────┐
            │               │               │
        Web System       IoT Sensors      ANPR
            │               │               │
       React/Vite        ESP32/Arduino    Camera
            │               │               │
            └───────────────┼───────────────┘
                            │
                     Central Database
                            │
                ┌───────────┼───────────┐
                │           │           │
             Students    Security   Administration
                │           │           │
                └───────────┼───────────┘
                            │
                  Smart Campus Parking
👩‍💻 Project Information

Project: Smart College Parking Management System
Application Name: SmartPark.Campus
Platform: Web Application
Frontend: React 19 + Vite
Language: JavaScript
Styling: CSS3
Target Users: Students, Faculty, Staff & College Administration

📄 License

This project is developed for academic/educational purposes as a Smart College Parking Management System project.

⭐ SmartPark.Campus — Making Campus Parking Smarter, Simpler & More Organized.