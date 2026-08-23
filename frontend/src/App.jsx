import { useState, useEffect, useMemo } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from './firebase/firebase'
import { getUserProfile, logout } from './firebase/auth'
import { INITIAL_SLOTS, INITIAL_LOGS, INITIAL_REGISTERED_VEHICLES } from './data/initialSlots'

import Navbar from './components/Navbar'
import StatsOverview from './components/StatsOverview'
import ParkingLotMap from './components/ParkingLotMap'
import StudentVehicleRegistration from './components/StudentVehicleRegistration'
import AnalyticsView from './components/AnalyticsView'
import GateSimulator from './components/GateSimulator'
import LiveVehicleLog from './components/LiveVehicleLog'
import SlotBookingModal from './components/SlotBookingModal'
import PassModal from './components/PassModal'
import NotificationToast from './components/NotificationToast'
import Login from './pages/Login'
import './App.css'

export default function App() {
  // ==========================================
  // AUTHENTICATION & USER PROFILE
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
              displayName: currentUser.displayName || 'Campus Member',
              email: currentUser.email,
              role: 'Student',
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
    showToast('Demo Access Granted', `Signed in as ${demoData.displayName} (${demoData.role}).`, 'success')
  }

  // Handle Logout
  const handleLogout = async () => {
    try {
      localStorage.removeItem('demo_user_session')
      setUser(null)
      setUserProfile(null)
      setActiveTab('map')
      await logout()
    } catch (err) {
      console.warn('Logout notice:', err)
      localStorage.removeItem('demo_user_session')
      setUser(null)
      setUserProfile(null)
    }
  }

  // ==========================================
  // APPLICATION STATE
  // ==========================================
  const [slots, setSlots] = useState(INITIAL_SLOTS)
  const [logs, setLogs] = useState(INITIAL_LOGS)
  const [activeTab, setActiveTab] = useState('map') // 'map' | 'registry' | 'gate' | 'analytics' | 'logs'

  // Registered Student Vehicles State
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
      message: 'Main barrier sensors and real-time bay telemetry online.',
      time: '09:00 AM',
      type: 'info'
    },
    {
      title: 'Student Registry Online',
      message: 'Vehicle permit verification and smart barrier recognition enabled.',
      time: '08:45 AM',
      type: 'info'
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
  // STUDENT VEHICLE REGISTRATION HANDLERS
  // ==========================================
  const handleRegisterVehicle = ({
    studentName,
    rollNumber,
    stream,
    phoneNumber,
    vehicleNumber,
    vehicleType,
    preferredFloor
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
      'Vehicle Registered Successfully',
      `Permit ${passId} issued for ${studentName} (${vehicleNumber}).`,
      'success'
    )
  }

  const handleDeleteRegisteredVehicle = (regId) => {
    setRegisteredVehicles((prev) => prev.filter((item) => item.id !== regId))
    showToast('Permit Removed', 'Vehicle registration has been de-registered.', 'info')
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
            category: category || 'Student',
            type: vehicleType || s.type,
            reservedUntil: reservedUntil || 'Full Day',
            entryTime: null
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
      `Bay ${slotId} on ${slotFloor} reserved. Digital Pass is ready to scan.`,
      'success'
    )
  }

  // ==========================================
  // RELEASE / CHECKOUT HANDLER
  // ==========================================
  const handleReleaseSlot = (slotId) => {
    const target = slots.find((s) => s.id === slotId)
    if (!target) return

    setSlots((prev) =>
      prev.map((s) =>
        s.id === slotId
          ? {
              ...s,
              status: 'available',
              plate: '',
              owner: '',
              category: '',
              reservedUntil: null,
              entryTime: null
            }
          : s
      )
    )

    const nowTime = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    })

    const newLog = {
      id: `LOG-${Date.now().toString().slice(-4)}`,
      timestamp: nowTime,
      action: 'EXIT',
      plate: target.plate || 'N/A',
      slot: slotId,
      duration: 'Manual Checkout',
      fee: 'Free',
      gate: 'Admin Console'
    }
    setLogs((prev) => [newLog, ...prev])

    showToast(
      'Bay Freed & Checked Out',
      `Slot ${slotId} on ${target.floor} is now available for other students.`,
      'info'
    )
  }

  // ==========================================
  // GATE SIMULATOR INBOUND ENTRY HANDLER
  // ==========================================
  const handleVehicleEntry = ({
    plate,
    owner,
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
        message: `No available parking bay found on campus for ${type.toUpperCase()}.`
      }
    }

    const isEv = Boolean(type.includes('ev'))

    const nowTime = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    })

    setSlots((prev) =>
      prev.map((s) =>
        s.id === targetSlot.id
          ? {
              ...s,
              status: 'occupied',
              plate,
              owner: owner || s.owner || 'Campus User',
              category: category || s.category || 'Student',
              isEv: isEv || s.isEv,
              entryTime: nowTime,
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
      reservedUntil: 'Active Session',
      floor: targetSlot.floor,
      section: targetSlot.section,
      zone: `${targetSlot.floor} - ${targetSlot.section}`
    }

    showToast(
      'Vehicle Admitted at Barrier',
      `${plate} assigned to Bay ${targetSlot.id} (${targetSlot.floor}). Barrier lifted.`,
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
  // GATE SIMULATOR OUTBOUND EXIT HANDLER
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

    setSlots((prev) =>
      prev.map((s) =>
        s.id === targetSlot.id
          ? {
              ...s,
              status: 'available',
              plate: '',
              owner: '',
              category: '',
              reservedUntil: null,
              entryTime: null
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
      duration: '1h 15m',
      fee: 'Free (Campus Permit)',
      gate: 'Exit Barrier 2 (ANPR)'
    }
    setLogs((prev) => [newLog, ...prev])

    showToast(
      'Vehicle Checked Out',
      `${plate} cleared Bay ${targetSlot.id} (${targetSlot.floor}). Outbound barrier raised.`,
      'info'
    )

    return {
      success: true,
      slotId: targetSlot.id,
      duration: '1h 15m'
    }
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
  // UNAUTHENTICATED: LOGIN VIEW
  // ==========================================
  if (!user) {
    return <Login onDemoLogin={handleDemoLogin} />
  }

  // ==========================================
  // AUTHENTICATED: MAIN APP DASHBOARD
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

      {/* Main Dashboard Container */}
      <main className="main-content">
        {/* KPI Stats Overview */}
        <StatsOverview slots={slots} />

        {/* Dynamic Tab Views */}
        <section className="tab-body">
          {/* TAB 1: PARKING LOT MAP */}
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

          {/* TAB 2: STUDENT & VEHICLE REGISTRY */}
          {activeTab === 'registry' && (
            <StudentVehicleRegistration
              registeredVehicles={registeredVehicles}
              onRegisterVehicle={handleRegisterVehicle}
              onDeleteVehicle={handleDeleteRegisteredVehicle}
              onViewPass={handleViewPassFromRegistry}
              onQuickBook={handleQuickBookFromRegistry}
            />
          )}

          {/* TAB 3: GATE TERMINAL */}
          {activeTab === 'gate' && (
            <GateSimulator
              slots={slots}
              registeredVehicles={registeredVehicles}
              onVehicleEntry={handleVehicleEntry}
              onVehicleExit={handleVehicleExit}
              onShowPass={(passData) => setActivePass(passData)}
              onNavigateToMap={() => setActiveTab('map')}
            />
          )}

          {/* TAB 4: LIVE ANALYTICS */}
          {activeTab === 'analytics' && <AnalyticsView slots={slots} />}

          {/* TAB 5: ACTIVITY LOG */}
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
            Smart College Parking System &bull; Real-Time IoT Telemetry &amp; Student Vehicle Registration
          </span>
          <span className="footer-tag">
            Ground Floor (Girls Scooty) &bull; Basement (Boys Parking) &bull; 160 Total Bays
          </span>
        </div>
      </footer>
    </div>
  )
}
