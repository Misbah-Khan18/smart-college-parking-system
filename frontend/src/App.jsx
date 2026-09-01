import { useState, useEffect, useMemo } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from './firebase/firebase'
import { getUserProfile, logout } from './firebase/auth'
import {
  INITIAL_SLOTS,
  INITIAL_LOGS,
  INITIAL_REGISTERED_VEHICLES
} from './data/initialSlots'

import Navbar from './components/Navbar'
import DashboardView from './components/DashboardView'
import ParkingLotMap from './components/ParkingLotMap'
import LiveParkingTimerView from './components/LiveParkingTimerView'
import SlotBookingModal from './components/SlotBookingModal'
import PassModal from './components/PassModal'
import NotificationToast from './components/NotificationToast'
import Login from './pages/Login'
import './App.css'

export default function App() {
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
    showToast('Signed In Successfully', `Welcome, ${demoData.displayName}!`, 'success')
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

  const [activeTab, setActiveTab] = useState('dashboard') // 'dashboard' | 'map' | 'timer'

  // Modals & Notifications
  const [isBookingOpen, setIsBookingOpen] = useState(false)
  const [bookingSlotTarget, setBookingSlotTarget] = useState(null)
  const [activePass, setActivePass] = useState(null)
  const [toast, setToast] = useState(null)

  const showToast = (title, message, type = 'info') => {
    setToast({ title, message, type })
  }

  const availableSlots = useMemo(() => {
    return slots.filter((s) => s.status === 'available')
  }, [slots])

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
    reservedUntil
  }) => {
    const nowTimestamp = Date.now()
    const nowTime = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    })

    const targetSlot = slots.find((s) => s.id === slotId)
    const slotFloor = targetSlot?.floor || (vehicleType === 'scooty' ? 'Ground Floor' : 'Basement')
    const slotSection = targetSlot?.section || 'General Parking'

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
            entryTime: nowTime,
            entryTimestamp: nowTimestamp
          }
        }
        return s
      })
    )

    // Open Pass Modal
    const generatedPass = {
      passId: `SMP-${slotId.replace(/[^a-zA-Z0-9]/g, '')}-${Date.now().toString().slice(-4)}`,
      slotId,
      plate: vehicleNumber.toUpperCase(),
      owner: ownerName || 'Campus Member',
      category: category || 'Student',
      reservedUntil: reservedUntil || 'Active Session',
      floor: slotFloor,
      section: slotSection,
      zone: `${slotFloor} - ${slotSection}`
    }
    setActivePass(generatedPass)

    showToast(
      'Vehicle Parked Successfully',
      `Bay ${slotId} on ${slotFloor} assigned to ${vehicleNumber.toUpperCase()}.`,
      'success'
    )
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
          <h2 className="brand-name">SmartPark.College</h2>
          <p className="brand-sub" style={{ marginTop: '8px' }}>Loading system telemetry...</p>
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
  // 2. MAIN APP INTERFACE (AFTER LOGIN)
  // ==========================================
  return (
    <div className="app-root">
      {/* Top Navbar */}
      <Navbar
        user={user}
        userProfile={userProfile}
        onLogout={handleLogout}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenQuickPark={() => {
          setBookingSlotTarget(null)
          setIsBookingOpen(true)
        }}
      />

      {/* Main Content Area */}
      <main className="main-viewport">
        {/* OPTION 1: DASHBOARD */}
        {activeTab === 'dashboard' && (
          <DashboardView
            slots={slots}
            onNavigateTab={setActiveTab}
            onReleaseSlot={handleReleaseSlot}
            onOpenBooking={(slot) => {
              setBookingSlotTarget(slot)
              setIsBookingOpen(true)
            }}
          />
        )}

        {/* OPTION 2: PARKING LAYOUT */}
        {activeTab === 'map' && (
          <ParkingLotMap
            slots={slots}
            onSelectSlot={(slot) => {
              if (slot.status === 'available') {
                setBookingSlotTarget(slot)
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
              setIsBookingOpen(true)
            }}
            onReleaseSlot={handleReleaseSlot}
          />
        )}

        {/* OPTION 3: LIVE PARKING */}
        {activeTab === 'timer' && (
          <LiveParkingTimerView
            slots={slots}
            onReleaseSlot={handleReleaseSlot}
            onOpenBooking={(slot) => {
              setBookingSlotTarget(slot)
              setIsBookingOpen(true)
            }}
          />
        )}
      </main>

      {/* Modals & Notifications */}
      <SlotBookingModal
        isOpen={isBookingOpen}
        onClose={() => {
          setIsBookingOpen(false)
          setBookingSlotTarget(null)
        }}
        initialSlot={bookingSlotTarget}
        availableSlots={availableSlots}
        registeredVehicles={INITIAL_REGISTERED_VEHICLES}
        onConfirmBooking={handleConfirmBooking}
        user={user}
        userProfile={userProfile}
      />

      <PassModal pass={activePass} onClose={() => setActivePass(null)} />

      <NotificationToast toast={toast} onDismiss={() => setToast(null)} />

      {/* Clean Footer */}
      <footer className="site-footer">
        <div className="footer-inner">
          <span>SmartPark College &bull; Ground Floor (Scooties) &amp; Basement (Bikes)</span>
          <span className="footer-status-pill">160 Total Bays Monitored</span>
        </div>
      </footer>
    </div>
  )
}
