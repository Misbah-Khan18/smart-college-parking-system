import { useState, useEffect, useMemo } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from './firebase/firebase'
import { getUserProfile, logout } from './firebase/auth'
import {
  INITIAL_SLOTS,
  INITIAL_LOGS,
  INITIAL_REGISTERED_VEHICLES,
  INITIAL_PARKING_HISTORY
} from './data/initialSlots'
import { formatLiveDurationStandard } from './utils/timerUtils'

import Navbar from './components/Navbar'
import DashboardView from './components/DashboardView'
import ParkingLotMap from './components/ParkingLotMap'
import StudentVehicleRegistration from './components/StudentVehicleRegistration'
import GateSimulator from './components/GateSimulator'
import LiveParkingTimerView from './components/LiveParkingTimerView'
import ParkingHistoryView from './components/ParkingHistoryView'
import AnalyticsView from './components/AnalyticsView'
import LiveVehicleLog from './components/LiveVehicleLog'
import SlotBookingModal from './components/SlotBookingModal'
import PassModal from './components/PassModal'
import NotificationToast from './components/NotificationToast'
import Login from './pages/Login'
import './App.css'

export default function App() {
  // ==========================================
  // AUTHENTICATION & USER PROFILE (MODULE 1)
  // ==========================================
  const [user, setUser] = useState(() => {
    const savedDemo = localStorage.getItem('demo_user_session')
    if (savedDemo) {
      try {
        return JSON.parse(savedDemo)
      } catch {
        localStorage.removeItem('demo_user_session')
      }
    }
    return null
  })

  const [userProfile, setUserProfile] = useState(() => {
    const savedDemo = localStorage.getItem('demo_user_session')
    if (savedDemo) {
      try {
        return JSON.parse(savedDemo)
      } catch {
        // ignore
      }
    }
    return null
  })

  const [authLoading, setAuthLoading] = useState(() => {
    return !localStorage.getItem('demo_user_session')
  })

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser)
        try {
          const profile = await getUserProfile(currentUser.uid)
          if (profile) {
            setUserProfile(profile)
          } else {
            setUserProfile({
              displayName: currentUser.displayName || 'Authorized Admin',
              email: currentUser.email,
              role: 'Security Admin',
              photoURL: currentUser.photoURL || ''
            })
          }
        } catch (err) {
          console.warn('Profile fetch warning:', err)
        }
      } else {
        const activeDemo = localStorage.getItem('demo_user_session')
        if (!activeDemo) {
          setUser(null)
          setUserProfile(null)
        }
      }
      setAuthLoading(false)
    })

    return () => unsubscribe()
  }, [])

  // Handle Quick Demo Login
  const handleDemoLogin = (demoData) => {
    localStorage.setItem('demo_user_session', JSON.stringify(demoData))
    setUser(demoData)
    setUserProfile(demoData)
    showToast('Administrator Access Granted', `Signed in as ${demoData.displayName} (${demoData.role}).`, 'success')
  }

  // Handle Logout
  const handleLogout = async () => {
    try {
      localStorage.removeItem('demo_user_session')
      setUser(null)
      setUserProfile(null)
      setActiveTab('dashboard')
      await logout()
    } catch (err) {
      console.warn('Logout notice:', err)
      localStorage.removeItem('demo_user_session')
      setUser(null)
      setUserProfile(null)
    }
  }

  // ==========================================
  // APPLICATION STATE (MODULES 2 TO 7)
  // ==========================================
  const [slots, setSlots] = useState(INITIAL_SLOTS)
  const [logs, setLogs] = useState(INITIAL_LOGS)
  const [activeTab, setActiveTab] = useState('dashboard') // 'dashboard' | 'map' | 'registry' | 'gate' | 'timer' | 'history' | 'analytics' | 'logs'

  // Registered Student Vehicles State (Module 3)
  const [registeredVehicles, setRegisteredVehicles] = useState(() => {
    const saved = localStorage.getItem('registered_vehicles_list')
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch {
        // ignore
      }
    }
    return INITIAL_REGISTERED_VEHICLES
  })

  useEffect(() => {
    try {
      localStorage.setItem('registered_vehicles_list', JSON.stringify(registeredVehicles))
    } catch {
      // ignore
    }
  }, [registeredVehicles])

  // Saved Parking History State (Module 6)
  const [parkingHistory, setParkingHistory] = useState(() => {
    const saved = localStorage.getItem('parking_history_list')
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch {
        // ignore
      }
    }
    return INITIAL_PARKING_HISTORY
  })

  useEffect(() => {
    try {
      localStorage.setItem('parking_history_list', JSON.stringify(parkingHistory))
    } catch {
      // ignore
    }
  }, [parkingHistory])

  // Map Filter States
  const [selectedZone, setSelectedZone] = useState('All Sections')
  const [filterStatus, setFilterStatus] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Modals & Notifications State
  const [isBookingOpen, setIsBookingOpen] = useState(false)
  const [bookingSlotTarget, setBookingSlotTarget] = useState(null)
  const [bookingPrefilledData, setBookingPrefilledData] = useState(null)
  const [activePass, setActivePass] = useState(null)
  const [toast, setToast] = useState(null)
  const [notifications, setNotifications] = useState([
    {
      title: 'ANPR System Active',
      message: 'Campus boom barrier sensors & real-time telemetry online.',
      time: '09:00 AM',
      type: 'info'
    },
    {
      title: 'Live Parking Timer Online',
      message: 'Module 7 real-time per-second parking duration active.',
      time: '08:45 AM',
      type: 'success'
    }
  ])
  const [unreadCount, setUnreadCount] = useState(2)

  const currentRole = userProfile?.role || 'Security Admin'

  const showToast = (title, message, type = 'info') => {
    setToast({ title, message, type })
  }

  const availableSlots = useMemo(() => {
    return slots.filter((s) => s.status === 'available')
  }, [slots])

  // ==========================================
  // MODULE 3: STUDENT VEHICLE REGISTRATION HANDLERS
  // ==========================================
  const handleRegisterVehicle = ({
    studentName,
    rollNumber,
    stream,
    phoneNumber,
    vehicleNumber,
    vehicleType,
    preferredFloor,
    isEv
  }) => {
    const newId = `REG-2026-${String(registeredVehicles.length + 1).padStart(3, '0')}`
    const passId = `SMP-${rollNumber}-${String(registeredVehicles.length + 1).padStart(2, '0')}`
    const nowTime = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    })

    const newRecord = {
      id: newId,
      studentName,
      rollNumber,
      stream,
      phoneNumber,
      vehicleNumber,
      vehicleType,
      isEv: Boolean(isEv),
      category: 'Student',
      preferredFloor: preferredFloor || (vehicleType === 'scooty' ? 'Ground Floor' : 'Basement'),
      registeredAt: new Date().toISOString().split('T')[0],
      status: 'Active',
      passId
    }

    setRegisteredVehicles((prev) => [newRecord, ...prev])

    // Log the registration
    const newLog = {
      id: `LOG-${Date.now().toString().slice(-4)}`,
      timestamp: nowTime,
      action: 'ENTRY',
      plate: vehicleNumber,
      slot: preferredFloor === 'Ground Floor' ? 'G-AUTH' : 'B-AUTH',
      category: 'Student Reg',
      owner: studentName,
      rollNumber,
      vehicleType: vehicleType,
      gate: 'Admin Registry'
    }
    setLogs((prev) => [newLog, ...prev])

    // Push notification
    const newNotif = {
      title: `Vehicle Registered: ${vehicleNumber}`,
      message: `${studentName} (${rollNumber}, ${stream}) issued ${vehicleType.toUpperCase()} permit.`,
      time: nowTime,
      type: 'success'
    }
    setNotifications((prev) => [newNotif, ...prev])
    setUnreadCount((c) => c + 1)

    showToast(
      'Student Registered Successfully',
      `Permit ${passId} issued for ${studentName} (${vehicleNumber}).`,
      'success'
    )
  }

  const handleDeleteRegisteredVehicle = (regId) => {
    setRegisteredVehicles((prev) => prev.filter((item) => item.id !== regId))
    showToast('Permit Removed', 'Vehicle registration has been deleted.', 'info')
  }

  const handleQuickBookFromRegistry = (studentData) => {
    setBookingSlotTarget(null)
    setBookingPrefilledData(studentData)
    setIsBookingOpen(true)
  }

  const handleViewPassFromRegistry = (passData) => {
    setActivePass(passData)
  }

  // ==========================================
  // BOOKING HANDLER
  // ==========================================
  const handleConfirmBooking = ({
    slotId,
    vehicleNumber,
    ownerName,
    rollNumber,
    stream,
    phoneNumber,
    category,
    vehicleType,
    reservedUntil
  }) => {
    const nowTime = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    })

    const targetSlot = slots.find((s) => s.id === slotId)
    const slotFloor = targetSlot?.floor || 'Campus'
    const slotSection = targetSlot?.section || 'General'

    setSlots((prevSlots) =>
      prevSlots.map((s) => {
        if (s.id === slotId) {
          return {
            ...s,
            status: 'reserved',
            plate: vehicleNumber,
            owner: ownerName,
            rollNumber: rollNumber || s.rollNumber || '',
            stream: stream || s.stream || '',
            phoneNumber: phoneNumber || s.phoneNumber || '',
            category: category || 'Student',
            type: vehicleType || s.type,
            reservedUntil: reservedUntil || 'Full Day',
            entryTime: null,
            entryTimestamp: null
          }
        }
        return s
      })
    )

    // Add Log Entry
    const newLog = {
      id: `LOG-${Date.now().toString().slice(-4)}`,
      timestamp: nowTime,
      action: 'ENTRY',
      plate: vehicleNumber,
      slot: slotId,
      owner: ownerName,
      rollNumber: rollNumber || '',
      category: category || 'Student',
      vehicleType: vehicleType || 'Scooty',
      gate: 'App Pre-Reservation'
    }
    setLogs((prev) => [newLog, ...prev])

    // Add Notification
    const newNotif = {
      title: `Bay ${slotId} Reserved`,
      message: `Pass generated for ${vehicleNumber} (${ownerName}). Valid until ${reservedUntil}.`,
      time: nowTime,
      type: 'success'
    }
    setNotifications((prev) => [newNotif, ...prev])
    setUnreadCount((c) => c + 1)

    // Open Pass Modal
    const generatedPass = {
      passId: `SMP-${slotId.replace(/[^a-zA-Z0-9]/g, '')}-${Date.now().toString().slice(-4)}`,
      slotId,
      plate: vehicleNumber,
      owner: ownerName,
      category: category || 'Student',
      reservedUntil: reservedUntil || 'Full Day Pass',
      floor: slotFloor,
      section: slotSection,
      zone: `${slotFloor} - ${slotSection}`
    }
    setActivePass(generatedPass)

    showToast(
      'Slot Reserved Successfully',
      `Bay ${slotId} on ${slotFloor} reserved. Digital Pass is ready.`,
      'success'
    )
  }

  // ==========================================
  // MODULE 5: VEHICLE ENTRY HANDLER
  // ==========================================
  const handleVehicleEntry = ({
    plate,
    owner,
    rollNumber = '',
    stream = '',
    phoneNumber = '',
    type,
    category,
    preferredFloor
  }) => {
    let targetSlot = slots.find(
      (s) =>
        s.status === 'reserved' &&
        s.plate &&
        s.plate.toLowerCase() === plate.toLowerCase()
    )

    if (!targetSlot) {
      if (preferredFloor) {
        targetSlot = slots.find(
          (s) => s.status === 'available' && s.floor === preferredFloor
        )
      } else if (type === 'scooty' || type === 'scooty-ev') {
        targetSlot =
          slots.find((s) => s.status === 'available' && s.floor === 'Ground Floor') ||
          slots.find((s) => s.status === 'available')
      } else {
        targetSlot =
          slots.find((s) => s.status === 'available' && s.floor === 'Basement') ||
          slots.find((s) => s.status === 'available')
      }
    }

    if (!targetSlot) {
      return {
        success: false,
        message: `No available parking slots found for ${type.toUpperCase()}.`
      }
    }

    const isEv = Boolean(type.includes('ev'))
    const nowTimestamp = Date.now()
    const nowTime = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    })

    // Update slots in real-time
    setSlots((prev) =>
      prev.map((s) =>
        s.id === targetSlot.id
          ? {
              ...s,
              status: 'occupied',
              plate,
              owner: owner || s.owner || 'Student',
              rollNumber: rollNumber || s.rollNumber || '',
              stream: stream || s.stream || '',
              phoneNumber: phoneNumber || s.phoneNumber || '',
              category: category || s.category || 'Student',
              isEv: isEv || s.isEv,
              entryTime: nowTime,
              entryTimestamp: nowTimestamp,
              reservedUntil: null
            }
          : s
      )
    )

    const newLog = {
      id: `LOG-${Date.now().toString().slice(-4)}`,
      timestamp: nowTime,
      action: 'ENTRY',
      plate,
      slot: targetSlot.id,
      owner: owner || 'Student',
      rollNumber: rollNumber || '',
      category: category || 'Student',
      vehicleType: type,
      gate: 'Main Gate 1 (ANPR Scanner)'
    }
    setLogs((prev) => [newLog, ...prev])

    const passData = {
      passId: `SMP-${targetSlot.id.replace(/[^a-zA-Z0-9]/g, '')}-${Date.now().toString().slice(-4)}`,
      slotId: targetSlot.id,
      plate,
      owner: owner || 'Campus Member',
      category: category || 'Student',
      reservedUntil: 'Active Parking Session',
      floor: targetSlot.floor,
      section: targetSlot.section,
      zone: `${targetSlot.floor} - ${targetSlot.section}`
    }

    showToast(
      'Vehicle Entry Recorded',
      `${plate} assigned to Bay ${targetSlot.id} (${targetSlot.floor}). Map updated immediately.`,
      'success'
    )

    return {
      success: true,
      slotId: targetSlot.id,
      floor: targetSlot.floor,
      section: targetSlot.section,
      passData
    }
  }

  // ==========================================
  // MODULE 6: VEHICLE EXIT & SAVE HISTORY HANDLER
  // ==========================================
  const handleVehicleExit = (plate) => {
    const targetSlot = slots.find(
      (s) =>
        s.plate &&
        s.plate.toLowerCase() === plate.toLowerCase() &&
        s.status !== 'available'
    )

    if (!targetSlot) {
      return {
        success: false,
        message: `No active vehicle found with license plate ${plate}.`
      }
    }

    const nowTime = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    })

    const calculatedDuration = formatLiveDurationStandard(targetSlot.entryTimestamp)

    // Save completed parking history record (Module 6)
    const newHistoryRecord = {
      id: `HIST-${Date.now().toString().slice(-6)}`,
      studentName: targetSlot.owner || 'Student',
      rollNumber: targetSlot.rollNumber || '',
      stream: targetSlot.stream || 'Registered Stream',
      vehicleNumber: targetSlot.plate,
      vehicleType: targetSlot.type || 'scooty',
      slotId: targetSlot.id,
      floor: targetSlot.floor,
      entryTime: targetSlot.entryTime || '09:00 AM',
      exitTime: nowTime,
      duration: calculatedDuration.replace('Parked for ', ''),
      date: new Date().toISOString().split('T')[0],
      status: 'Completed',
      fee: '₹0 (Campus Permit)'
    }

    setParkingHistory((prev) => [newHistoryRecord, ...prev])

    // Release the slot on the map
    setSlots((prev) =>
      prev.map((s) =>
        s.id === targetSlot.id
          ? {
              ...s,
              status: 'available',
              plate: '',
              owner: '',
              rollNumber: '',
              stream: '',
              phoneNumber: '',
              category: '',
              reservedUntil: null,
              entryTime: null,
              entryTimestamp: null
            }
          : s
      )
    )

    const newLog = {
      id: `LOG-${Date.now().toString().slice(-4)}`,
      timestamp: nowTime,
      action: 'EXIT',
      plate,
      slot: targetSlot.id,
      owner: targetSlot.owner || '',
      duration: calculatedDuration.replace('Parked for ', ''),
      fee: 'Free (Campus Permit)',
      gate: 'Exit Barrier 2 (ANPR)'
    }
    setLogs((prev) => [newLog, ...prev])

    showToast(
      'Vehicle Checked Out',
      `${plate} cleared Bay ${targetSlot.id}. Slot released and saved to Parking History.`,
      'info'
    )

    return {
      success: true,
      slotId: targetSlot.id,
      duration: calculatedDuration.replace('Parked for ', '')
    }
  }

  // Direct checkout by Slot ID (Used on Map / Timer / Dashboard)
  const handleReleaseSlot = (slotId) => {
    const target = slots.find((s) => s.id === slotId)
    if (!target || !target.plate) {
      setSlots((prev) =>
        prev.map((s) =>
          s.id === slotId
            ? {
                ...s,
                status: 'available',
                plate: '',
                owner: '',
                rollNumber: '',
                stream: '',
                phoneNumber: '',
                category: '',
                reservedUntil: null,
                entryTime: null,
                entryTimestamp: null
              }
            : s
        )
      )
      return
    }

    handleVehicleExit(target.plate)
  }

  // Refresh Telemetry Trigger
  const triggerTelemetryRefresh = () => {
    showToast(
      'Telemetry Synchronized',
      'Ultrasonic bay sensors & ANPR cameras live update completed.',
      'info'
    )
  }

  // ==========================================
  // AUTH LOADING STATE
  // ==========================================
  if (authLoading) {
    return (
      <div className="login-page">
        <div className="login-card loading-state-card">
          <div className="login-logo">
            <span className="login-logo-icon">P</span>
          </div>
          <h1>SmartPark<span className="accent-dot">.</span>Campus</h1>
          <p className="login-subtitle">Initializing campus telemetry connection...</p>
        </div>
      </div>
    )
  }

  // ==========================================
  // UNAUTHENTICATED: MODULE 1 LOGIN VIEW
  // ==========================================
  if (!user) {
    return <Login onDemoLogin={handleDemoLogin} />
  }

  // ==========================================
  // AUTHENTICATED: MAIN APPLICATION INTERFACE
  // ==========================================
  return (
    <div className="app-layout">
      {/* Top Navbar */}
      <Navbar
        user={user}
        userProfile={userProfile}
        onLogout={handleLogout}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentRole={currentRole}
        notifications={notifications}
        unreadCount={unreadCount}
        onRefresh={triggerTelemetryRefresh}
        onClearNotifications={() => {
          setNotifications([])
          setUnreadCount(0)
        }}
      />

      {/* Main Content Area */}
      <main className="main-content">
        <section className="tab-body">
          {/* MODULE 2: DASHBOARD */}
          {activeTab === 'dashboard' && (
            <DashboardView
              slots={slots}
              logs={logs}
              onNavigateTab={setActiveTab}
              onReleaseSlot={handleReleaseSlot}
            />
          )}

          {/* MODULE 4 & 7: LIVE PARKING MAP */}
          {activeTab === 'map' && (
            <ParkingLotMap
              slots={slots}
              selectedZone={selectedZone}
              setSelectedZone={setSelectedZone}
              filterStatus={filterStatus}
              setFilterStatus={setFilterStatus}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              onSelectSlot={(slot) => {
                if (slot.status === 'available') {
                  setBookingSlotTarget(slot)
                  setBookingPrefilledData(null)
                  setIsBookingOpen(true)
                } else if (slot.plate) {
                  setActivePass({
                    passId: `SMP-${slot.id.replace(/[^a-zA-Z0-9]/g, '')}`,
                    slotId: slot.id,
                    plate: slot.plate,
                    owner: slot.owner,
                    category: slot.category,
                    reservedUntil: slot.reservedUntil || 'Active Session',
                    floor: slot.floor,
                    section: slot.section,
                    zone: `${slot.floor} - ${slot.section}`
                  })
                }
              }}
              onOpenBooking={(slot) => {
                setBookingSlotTarget(slot)
                setBookingPrefilledData(null)
                setIsBookingOpen(true)
              }}
              onReleaseSlot={handleReleaseSlot}
              currentRole={currentRole}
            />
          )}

          {/* MODULE 3: STUDENT & VEHICLE REGISTRATION */}
          {activeTab === 'registry' && (
            <StudentVehicleRegistration
              registeredVehicles={registeredVehicles}
              onRegisterVehicle={handleRegisterVehicle}
              onDeleteVehicle={handleDeleteRegisteredVehicle}
              onViewPass={handleViewPassFromRegistry}
              onQuickBook={handleQuickBookFromRegistry}
            />
          )}

          {/* MODULE 5 & 6: VEHICLE ENTRY & VEHICLE EXIT */}
          {activeTab === 'gate' && (
            <GateSimulator
              slots={slots}
              registeredVehicles={registeredVehicles}
              onVehicleEntry={handleVehicleEntry}
              onVehicleExit={handleVehicleExit}
              onShowPass={(passData) => setActivePass(passData)}
              onNavigateToMap={() => setActiveTab('map')}
              onNavigateToHistory={() => setActiveTab('history')}
            />
          )}

          {/* MODULE 7: LIVE PARKING TIMER */}
          {activeTab === 'timer' && (
            <LiveParkingTimerView
              slots={slots}
              onReleaseSlot={handleReleaseSlot}
              onNavigateToMap={() => setActiveTab('map')}
            />
          )}

          {/* SAVED PARKING HISTORY */}
          {activeTab === 'history' && (
            <ParkingHistoryView history={parkingHistory} />
          )}

          {/* ANALYTICS & TELEMETRY */}
          {activeTab === 'analytics' && <AnalyticsView slots={slots} />}

          {/* ACTIVITY LOGS */}
          {activeTab === 'logs' && <LiveVehicleLog logs={logs} />}
        </section>
      </main>

      {/* Modals & Toasts */}
      <SlotBookingModal
        isOpen={isBookingOpen}
        onClose={() => {
          setIsBookingOpen(false)
          setBookingSlotTarget(null)
          setBookingPrefilledData(null)
        }}
        initialSlot={bookingSlotTarget}
        availableSlots={availableSlots}
        registeredVehicles={registeredVehicles}
        prefilledData={bookingPrefilledData}
        onConfirmBooking={handleConfirmBooking}
        currentRole={currentRole}
        user={user}
        userProfile={userProfile}
      />

      <PassModal pass={activePass} onClose={() => setActivePass(null)} />

      <NotificationToast toast={toast} onDismiss={() => setToast(null)} />

      {/* Campus Footer */}
      <footer className="app-footer">
        <div className="footer-content">
          <span>
            Smart College Parking System &bull; Modules 1–7 Integrated Telemetry Architecture
          </span>
          <span className="footer-tag">
            Ground Floor (Scooties) &bull; Basement (Bikes) &bull; 160 Total Bays
          </span>
        </div>
      </footer>
    </div>
  )
}
