import { useState, useEffect, useMemo } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from './firebase/firebase'
import { getUserProfile, logout } from './firebase/auth'
import {
  INITIAL_SLOTS,
  INITIAL_REGISTERED_VEHICLES
} from './data/initialSlots'

import Navbar from './components/Navbar'
import DashboardView from './components/DashboardView'
import ParkingLotMap from './components/ParkingLotMap'
import LiveParkingTimerView from './components/LiveParkingTimerView'
import SlotBookingModal from './components/SlotBookingModal'
import PassModal from './components/PassModal'
import ConfirmationModal from './components/ConfirmationModal'
import SubtleAppBackground from './components/SubtleAppBackground'
import NotificationToast from './components/NotificationToast'
import IntroSplashScreen from './components/IntroSplashScreen'
import Login from './pages/Login'
import './App.css'

export default function App() {
  // Session splash intro state (runs once per browser session)
  const [showIntro, setShowIntro] = useState(() => {
    try {
      return !sessionStorage.getItem('soc_intro_played')
    } catch {
      return false
    }
  })
  // ==========================================
  // AUTHENTICATION & USER SESSION
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
    showToast('Signed In Successfully', `Welcome to School of Commerce Smart Parking, ${demoData.displayName}!`, 'success')
  }

  // Handle Logout
  const handleLogout = async () => {
    try {
      localStorage.removeItem('demo_user_session')
      setUser(null)
      setUserProfile(null)
      setActiveTab('home')
      await logout()
    } catch (err) {
      console.warn('Logout notice:', err)
      localStorage.removeItem('demo_user_session')
      setUser(null)
      setUserProfile(null)
    }
  }

  // ==========================================
  // APPLICATION STATE (SLOTS & NAVIGATION)
  // ==========================================
  const [slots, setSlots] = useState(() => {
    const saved = localStorage.getItem('parking_slots_state')
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch {
        // ignore
      }
    }
    return INITIAL_SLOTS
  })

  useEffect(() => {
    try {
      localStorage.setItem('parking_slots_state', JSON.stringify(slots))
    } catch {
      // ignore
    }
  }, [slots])

  const [activeTab, setActiveTab] = useState('home') // 'home' | 'map' | 'timer'

  // Modals & Notifications
  const [isBookingOpen, setIsBookingOpen] = useState(false)
  const [bookingSlotTarget, setBookingSlotTarget] = useState(null)
  const [bookingType, setBookingType] = useState('slot') // 'slot' | 'monthly'
  const [confirmationData, setConfirmationData] = useState(null)
  const [activePass, setActivePass] = useState(null)
  const [toast, setToast] = useState(null)

  const showToast = (title, message, type = 'info') => {
    setToast({ title, message, type })
  }

  const availableSlots = useMemo(() => {
    return slots.filter((s) => s.status === 'available')
  }, [slots])

  // Open booking modal with specific mode (slot vs monthly)
  const handleOpenBookingModal = (slot = null, type = 'slot') => {
    setBookingSlotTarget(slot)
    setBookingType(type)
    setIsBookingOpen(true)
  }

  // ==========================================
  // BOOKING / PARKING HANDLER
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
    reservedUntil,
    passType = 'Hourly Slot',
    reservedLabel = ''
  }) => {
    const nowTimestamp = Date.now()
    const nowTime = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
    const nowDate = new Date().toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })

    const targetSlot = slots.find((s) => s.id === slotId)
    const slotFloor = targetSlot?.floor || (vehicleType === 'scooty' ? 'Ground Floor' : 'Basement')
    const slotSection = targetSlot?.section || 'School of Commerce Parking Area'

    setSlots((prevSlots) =>
      prevSlots.map((s) => {
        if (s.id === slotId) {
          return {
            ...s,
            status: 'occupied',
            plate: vehicleNumber.toUpperCase(),
            owner: ownerName || 'Campus Member',
            rollNumber: rollNumber || s.rollNumber || '',
            stream: stream || s.stream || '',
            phoneNumber: phoneNumber || s.phoneNumber || '',
            category: category || 'Student',
            type: vehicleType || s.type,
            reservedUntil: reservedUntil || null,
            passType,
            entryTime: nowTime,
            entryTimestamp: nowTimestamp
          }
        }
        return s
      })
    )

    // Generate Pass Details
    const generatedPass = {
      passId: `SOC-${slotId.replace(/[^a-zA-Z0-9]/g, '')}-${Date.now().toString().slice(-4)}`,
      slotId,
      plate: vehicleNumber.toUpperCase(),
      owner: ownerName || 'Campus Member',
      category: category || 'Student',
      reservedUntil: reservedUntil || 'Active Session',
      floor: slotFloor,
      section: slotSection,
      zone: `${slotFloor} - ${slotSection}`,
      passType,
      reservedLabel
    }

    // Trigger Modern Confirmation Card / Modal
    setConfirmationData({
      slotId,
      floor: slotFloor,
      passType,
      dateStr: nowDate,
      timeStr: nowTime,
      vehicleNumber: vehicleNumber.toUpperCase(),
      passData: generatedPass
    })
  }

  // ==========================================
  // RELEASE / CHECKOUT HANDLER
  // ==========================================
  const handleReleaseSlot = (slotId) => {
    const target = slots.find((s) => s.id === slotId)
    const plate = target?.plate || 'Vehicle'

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
              passType: null,
              entryTime: null,
              entryTimestamp: null
            }
          : s
      )
    )

    showToast(
      'Bay Checked Out',
      `Bay ${slotId} is now available for parking. (${plate} cleared)`,
      'info'
    )
  }

  // ==========================================
  // LOADING STATE
  // ==========================================
  if (authLoading) {
    return (
      <div className="login-container">
        <div className="login-card" style={{ textAlign: 'center' }}>
          <div className="brand-badge">
            <span className="brand-logo-text">P</span>
          </div>
          <h2 className="brand-name">School of Commerce Smart Parking</h2>
          <p className="brand-sub" style={{ marginTop: '8px' }}>Connecting to campus telemetry...</p>
        </div>
      </div>
    )
  }

  // ==========================================
  // 1. FIRST PAGE: AUTHENTICATION / LOGIN VIEW
  // ==========================================
  if (!user) {
    return <Login onDemoLogin={handleDemoLogin} />
  }

  // ==========================================
  // 1.5 ONE-TIME INTRO ANIMATION (2.5 SECONDS)
  // ==========================================
  if (showIntro) {
    return <IntroSplashScreen onComplete={() => setShowIntro(false)} />
  }

  // ==========================================
  // 2. MAIN APP INTERFACE (AFTER LOGIN)
  // ==========================================
  const isHomeActive = activeTab === 'home' || activeTab === 'dashboard'

  const isAdmin =
    userProfile?.role === 'Security Admin' ||
    userProfile?.role === 'Admin' ||
    user?.email?.includes('admin') ||
    user?.role === 'Security Admin'

  return (
    <div className="app-root">
      {/* Subtle Animated App Background */}
      <SubtleAppBackground />

      {/* Top Navbar */}
      <Navbar
        user={user}
        userProfile={userProfile}
        onLogout={handleLogout}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenQuickPark={(type) => handleOpenBookingModal(null, type || 'slot')}
      />

      {/* Main Content Area with 150-250ms Smooth Page Transitions */}
      <main className="main-viewport">
        <div key={activeTab} className="page-view-container page-enter-animation">
          {/* OPTION 1: HOME PAGE (DASHBOARD) */}
          {isHomeActive && (
            <DashboardView
              slots={slots}
              onNavigateTab={setActiveTab}
              onReleaseSlot={handleReleaseSlot}
              onOpenBooking={(slot, type) => handleOpenBookingModal(slot, type || 'slot')}
              isAdmin={isAdmin}
            />
          )}

          {/* OPTION 2: PARKING LAYOUT */}
          {activeTab === 'map' && (
            <ParkingLotMap
              slots={slots}
              onSelectSlot={(slot) => {
                if (slot.status === 'available') {
                  handleOpenBookingModal(slot, 'slot')
                } else if (slot.plate) {
                  setActivePass({
                    passId: `SOC-${slot.id.replace(/[^a-zA-Z0-9]/g, '')}`,
                    slotId: slot.id,
                    plate: slot.plate,
                    owner: slot.owner,
                    category: slot.category,
                    reservedUntil: slot.reservedUntil || 'Active Session',
                    floor: slot.floor,
                    section: slot.section,
                    zone: `${slot.floor} - ${slot.section}`,
                    passType: slot.passType || 'Hourly Slot'
                  })
                }
              }}
              onOpenBooking={(slot) => handleOpenBookingModal(slot, 'slot')}
              onReleaseSlot={handleReleaseSlot}
            />
          )}

          {/* OPTION 3: LIVE PARKING */}
          {activeTab === 'timer' && (
            <LiveParkingTimerView
              slots={slots}
              onReleaseSlot={handleReleaseSlot}
              onOpenBooking={(slot) => handleOpenBookingModal(slot, 'slot')}
            />
          )}
        </div>
      </main>

      {/* Slot / Pass Booking Modal */}
      <SlotBookingModal
        isOpen={isBookingOpen}
        onClose={() => {
          setIsBookingOpen(false)
          setBookingSlotTarget(null)
        }}
        initialSlot={bookingSlotTarget}
        availableSlots={availableSlots}
        registeredVehicles={INITIAL_REGISTERED_VEHICLES}
        initialBookingType={bookingType}
        onConfirmBooking={handleConfirmBooking}
        user={user}
        userProfile={userProfile}
      />

      {/* Modern Confirmation Modal Card */}
      <ConfirmationModal
        confirmation={confirmationData}
        onViewReservation={() => {
          const pass = confirmationData?.passData
          setConfirmationData(null)
          if (pass) {
            setActivePass(pass)
          }
        }}
        onClose={() => setConfirmationData(null)}
      />

      {/* Pass / QR Permit Modal */}
      <PassModal pass={activePass} onClose={() => setActivePass(null)} />

      {/* System Toast Alerts */}
      <NotificationToast toast={toast} onDismiss={() => setToast(null)} />

      {/* Clean Footer */}
      <footer className="site-footer">
        <div className="footer-inner">
          <span>School of Commerce Smart Parking &bull; Ground Floor (Scooties) &amp; Basement (Bikes)</span>
          <span className="footer-status-pill">160 Total Bays Monitored</span>
        </div>
      </footer>
    </div>
  )
}

