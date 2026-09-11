import { useState, useEffect, useMemo } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from './firebase/firebase'
import { getUserProfile, logout } from './firebase/auth'
import {
  INITIAL_SLOTS,
  INITIAL_PARKING_HISTORY
} from './data/initialSlots'

import Navbar from './components/Navbar'
import ParkingLotMap from './components/ParkingLotMap'
import SlotBookingModal from './components/SlotBookingModal'
import PassModal from './components/PassModal'
import ConfirmationModal from './components/ConfirmationModal'
import SubtleAppBackground from './components/SubtleAppBackground'
import NotificationToast from './components/NotificationToast'
import IntroSplashScreen from './components/IntroSplashScreen'
import Login from './pages/Login'
import RegistrationPage from './pages/RegistrationPage'
import ParkingHistoryView from './components/ParkingHistoryView'
import PaymentModal from './components/PaymentModal'

// Admin Views (7 pages)
import AdminDashboardView from './components/admin/AdminDashboardView'
import VehicleEntryView from './components/admin/VehicleEntryView'
import VehicleExitView from './components/admin/VehicleExitView'
import WrongParkingView from './components/admin/WrongParkingView'

// Student Views (5 pages)
import StudentDashboardView from './components/student/StudentDashboardView'
import CampusParkingDashboard from './components/CampusParkingDashboard'
import StudentMyVehicleView from './components/student/StudentMyVehicleView'
import StudentMyStatusView from './components/student/StudentMyStatusView'
import StudentMyHistoryView from './components/student/StudentMyHistoryView'

import { getRegisteredVehicles } from './services/vehicleService'
import {
  getParkingState,
  getStudentPermits,
  getPermitById,
  verifyAndEnterGate,
  exitGate
} from './services/parkingApiService'
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
    const savedCustom = localStorage.getItem('custom_student_vehicle_profile')
    let base = null
    if (savedDemo) {
      try {
        base = JSON.parse(savedDemo)
      } catch {
        // ignore
      }
    }
    if (savedCustom) {
      try {
        const custom = JSON.parse(savedCustom)
        return base ? { ...base, ...custom } : custom
      } catch {
        // ignore
      }
    }
    return base
  })

  const [authLoading, setAuthLoading] = useState(() => {
    return !localStorage.getItem('demo_user_session') && !localStorage.getItem('custom_student_vehicle_profile')
  })

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser)
        try {
          const profile = await getUserProfile(currentUser.uid)
          const savedCustom = localStorage.getItem('custom_student_vehicle_profile')
          let customData = {}
          if (savedCustom) {
            try {
              customData = JSON.parse(savedCustom)
            } catch {
              // ignore parse errors
            }
          }

          if (profile) {
            setUserProfile({ ...profile, ...customData })
          } else {
            setUserProfile({
              displayName: currentUser.displayName || 'Alzuni Shaikh',
              email: currentUser.email,
              role: 'Student',
              campusId: 'S2410701',
              vehicleType: 'scooty',
              defaultPlate: 'MH-12-AB-1234',
              stream: 'BCA (Bachelor of Computer Applications)',
              phoneNumber: '+91 98765 43210',
              photoURL: currentUser.photoURL || '',
              ...customData
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

  // Modals & Notifications Toast
  const [toast, setToast] = useState(null)
  const showToast = (title, message, type = 'info') => {
    setToast({ title, message, type })
  }

  // Handle Profile Edits (Saved permanently across refreshes and logout)
  const handleUpdateProfile = (updatedFields) => {
    setUserProfile((prev) => {
      const merged = { ...(prev || {}), ...updatedFields }
      try {
        localStorage.setItem('custom_student_vehicle_profile', JSON.stringify(merged))
        const savedDemo = localStorage.getItem('demo_user_session')
        if (savedDemo) {
          const parsed = JSON.parse(savedDemo)
          localStorage.setItem('demo_user_session', JSON.stringify({ ...parsed, ...updatedFields }))
        }
      } catch (e) {
        console.warn('Local storage write warning:', e)
      }
      return merged
    })
    showToast('Saved', 'Your vehicle & profile details were saved permanently! 🚗', 'success')
  }

  // Handle Quick Demo Login with personalized greeting
  const handleDemoLogin = (demoData) => {
    const savedCustom = localStorage.getItem('custom_student_vehicle_profile')
    let finalData = demoData
    if (savedCustom && demoData.role !== 'Security Admin') {
      try {
        finalData = { ...demoData, ...JSON.parse(savedCustom) }
      } catch {
        // ignore parse errors
      }
    }
    localStorage.setItem('demo_user_session', JSON.stringify(finalData))
    setUser(finalData)
    setUserProfile(finalData)
    const firstName = finalData.displayName?.split(' ')[0] || 'Student'
    showToast('Signed In', `Welcome, ${firstName} 👋`, 'success')
  }

  // Handle Logout (Preserves custom_student_vehicle_profile!)
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
  // APPLICATION STATE (SLOTS, HISTORY, TABS)
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

  const [parkingHistory, setParkingHistory] = useState(() => {
    const saved = localStorage.getItem('parking_history_state')
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
      localStorage.setItem('parking_history_state', JSON.stringify(parkingHistory))
    } catch {
      // ignore
    }
  }, [parkingHistory])

  const [activeTab, setActiveTab] = useState('home')

  // Modals
  const [isBookingOpen, setIsBookingOpen] = useState(false)
  const [bookingSlotTarget, setBookingSlotTarget] = useState(null)
  const [bookingType, setBookingType] = useState('slot')
  const [confirmationData, setConfirmationData] = useState(null)
  const [activePass, setActivePass] = useState(null)
  // Payment gate: holds pending booking until user pays ₹10
  const [paymentPendingData, setPaymentPendingData] = useState(null)

  const availableSlots = useMemo(() => {
    return slots.filter((s) => s.status === 'available')
  }, [slots])

  // Open booking modal with specific mode (slot vs monthly)
  const handleOpenBookingModal = (slot = null, type = 'slot') => {
    setBookingSlotTarget(slot)
    setBookingType(type)
    setIsBookingOpen(true)
  }

  // Active Permit (Daily, Monthly, Semester)
  const [activePermit, setActivePermit] = useState(() => {
    try {
      const saved = localStorage.getItem('student_active_permit')
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })

  useEffect(() => {
    if (activePermit) {
      try {
        localStorage.setItem('student_active_permit', JSON.stringify(activePermit))
      } catch {
        // ignore
      }
    }
  }, [activePermit])

  // Sync state from Express backend (port 5000)
  useEffect(() => {
    getParkingState()
      .then((data) => {
        if (data && data.slots && data.slots.length > 0) {
          setSlots(data.slots.map((s) => ({
            ...s,
            status: s.status ? s.status.toLowerCase() : 'available'
          })))
        }
        if (data && data.history && data.history.length > 0) {
          setParkingHistory(data.history)
        }
      })
      .catch((err) => {
        console.warn('Backend sync warning (offline/fallback):', err.message)
      })
  }, [])

  // Sync student active permits from backend
  useEffect(() => {
    const studentId = userProfile?.campusId || user?.uid
    const plate = userProfile?.defaultPlate || userProfile?.vehicleNumber
    if (studentId || plate) {
      getStudentPermits(studentId, plate)
        .then((res) => {
          if (res && res.permits && res.permits.length > 0) {
            const active = res.permits.find((p) => p.status === 'ACTIVE' && p.paymentStatus === 'PAID')
            if (active) {
              setActivePermit(active)
            }
          }
        })
        .catch(() => {})
    }
  }, [userProfile, user])

  // Listen for Stripe redirect success query params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('payment_success') === 'true') {
      const permitId = params.get('permit_id')
      if (permitId) {
        getPermitById(permitId)
          .then((res) => {
            if (res && res.permit) {
              setActivePermit(res.permit)
              setActivePass(res.permit)
              showToast('Permit Activated', `${res.permit.permitType} Permit verified & active! 🎉`, 'success')
            }
          })
          .catch((err) => console.warn('Permit redirect check:', err.message))
      }
      window.history.replaceState({}, document.title, window.location.pathname)
    }
  }, [])

  // ==========================================
  // GATE 1: VEHICLE ENTRY HANDLER (DYNAMIC ALLOCATION)
  // ==========================================
  const handleVehicleEntry = async ({
    plate,
    owner,
    type,
    preferredFloor,
    qrToken
  }) => {
    try {
      const res = await verifyAndEnterGate({
        qrToken,
        plate,
        studentName: owner,
        vehicleType: type,
        preferredFloor
      })

      // Update local slots state immediately
      setSlots((prev) =>
        prev.map((s) => (s.id === res.slotId ? { ...s, ...res.slot, status: 'occupied' } : s))
      )

      showToast(
        'Vehicle Admitted',
        `${res.slot.plate} dynamically allocated to Bay ${res.slotId} (${res.floor}).`,
        'success'
      )

      return {
        success: true,
        slotId: res.slotId,
        floor: res.floor,
        passData: res.permit
      }
    } catch (err) {
      return {
        success: false,
        message: err.message
      }
    }
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

    // Open payment modal FIRST (₹10 flat fee) — slot is only reserved after payment
    setPaymentPendingData({
      slotId,
      vehicleNumber: vehicleNumber.toUpperCase(),
      ownerName: ownerName || 'Campus Member',
      passType,
      // Full slot mutation payload — applied after payment confirmed
      _slotMutation: {
        slotId,
        vehicleNumber,
        ownerName,
        rollNumber,
        stream,
        phoneNumber,
        category,
        vehicleType,
        reservedUntil,
        passType,
        nowTimestamp,
        nowTime
      },
      _confirmation: {
        slotId,
        floor: slotFloor,
        passType,
        dateStr: nowDate,
        timeStr: nowTime,
        vehicleNumber: vehicleNumber.toUpperCase(),
        passData: generatedPass
      }
    })
  }

  // Called after payment is confirmed (dummy) — NOW commit the slot reservation
  const handlePaymentSuccess = () => {
    if (!paymentPendingData) return
    const { _slotMutation, _confirmation } = paymentPendingData
    const {
      slotId, vehicleNumber, ownerName, rollNumber, stream,
      phoneNumber, category, vehicleType, reservedUntil,
      passType, nowTimestamp, nowTime
    } = _slotMutation

    // Now actually mark the slot as occupied (after payment)
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

    setPaymentPendingData(null)
    setConfirmationData(_confirmation)
    showToast('Payment Confirmed', '₹10 parking fee received. Slot reserved! 🎉', 'success')
  }

  // ==========================================
  // GATE 2: RELEASE / CHECKOUT HANDLER
  // ==========================================
  const handleReleaseSlot = async (slotId) => {
    try {
      const res = await exitGate({ slotId })
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

      if (res.historyEntry) {
        setParkingHistory((prev) => [res.historyEntry, ...prev])
      }

      showToast(
        'Bay Checked Out',
        `Bay ${slotId} is now available for parking. (Released)`,
        'info'
      )
    } catch (err) {
      console.warn('Exit gate sync notice:', err.message)
      // Fallback local release
      setSlots((prev) =>
        prev.map((s) =>
          s.id === slotId
            ? {
                ...s,
                status: 'available',
                plate: '',
                owner: '',
                entryTime: null,
                entryTimestamp: null
              }
            : s
        )
      )
    }
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
          <p className="brand-sub" style={{ marginTop: '8px' }}>
            Connecting to campus telemetry...
          </p>
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
  const isAdmin =
    userProfile?.role === 'Security Admin' ||
    userProfile?.role === 'Admin' ||
    user?.email?.includes('admin') ||
    user?.role === 'Security Admin' ||
    user?.role === 'Admin'

  const isHomeActive =
    activeTab === 'home' ||
    activeTab === 'dashboard' ||
    (isAdmin && activeTab === 'admin-dashboard') ||
    (!isAdmin && activeTab === 'student-dashboard')

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
          {/* =========================================================
              ADMIN SIDE — 7 PAGES
              ========================================================= */}
          {isAdmin && (
            <>
              {/* PAGE 1: ADMIN DASHBOARD */}
              {isHomeActive && (
                <AdminDashboardView
                  user={user}
                  userProfile={userProfile}
                  slots={slots}
                  onNavigateTab={setActiveTab}
                  onReleaseSlot={handleReleaseSlot}
                  onOpenBooking={(slot, type) => handleOpenBookingModal(slot, type || 'slot')}
                />
              )}

              {/* PAGE 2: PARKING MAP */}
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

              {/* PAGE 3: STUDENT & VEHICLE REGISTRATION */}
              {activeTab === 'register' && (
                <RegistrationPage slots={slots} showToast={showToast} />
              )}

              {/* PAGE 4: VEHICLE ENTRY */}
              {activeTab === 'vehicle-entry' && (
                <VehicleEntryView
                  slots={slots}
                  registeredVehicles={getRegisteredVehicles()}
                  onVehicleEntry={handleVehicleEntry}
                  onShowPass={(pass) => setActivePass(pass)}
                />
              )}

              {/* PAGE 5: VEHICLE EXIT */}
              {activeTab === 'vehicle-exit' && (
                <VehicleExitView slots={slots} onReleaseSlot={handleReleaseSlot} />
              )}

              {/* PAGE 6: REPORTS & PARKING HISTORY */}
              {activeTab === 'reports-history' && (
                <ParkingHistoryView history={parkingHistory} />
              )}

              {/* PAGE 7: WRONG PARKING MANAGEMENT */}
              {activeTab === 'wrong-parking' && (
                <WrongParkingView
                  slots={slots}
                  onReleaseSlot={handleReleaseSlot}
                  showToast={showToast}
                />
              )}
            </>
          )}

          {/* =========================================================
              STUDENT SIDE — 5 PAGES
              ========================================================= */}
          {!isAdmin && (
            <>
              {/* PAGE 1: STUDENT DASHBOARD */}
              {isHomeActive && (
                <StudentDashboardView
                  user={user}
                  userProfile={userProfile}
                  slots={slots}
                  activePermit={activePermit}
                  onNavigateTab={setActiveTab}
                  onOpenBooking={(slot, type) => handleOpenBookingModal(slot, type || 'permit')}
                  onViewPass={(pass) => setActivePass(pass)}
                />
              )}

              {/* PAGE 2: AVAILABLE PARKING */}
              {activeTab === 'student-available-parking' && (
                <CampusParkingDashboard
                  slots={slots}
                  userProfile={userProfile}
                  onOpenBooking={(slot, type) => handleOpenBookingModal(slot, type || 'permit')}
                />
              )}

              {/* PAGE 3: MY VEHICLE */}
              {activeTab === 'student-my-vehicle' && (
                <StudentMyVehicleView
                  user={user}
                  userProfile={userProfile}
                  onUpdateProfile={handleUpdateProfile}
                  onViewPass={(pass) => setActivePass(pass)}
                />
              )}

              {/* PAGE 4: MY PARKING STATUS */}
              {activeTab === 'student-my-status' && (
                <StudentMyStatusView
                  user={user}
                  userProfile={userProfile}
                  slots={slots}
                  activePermit={activePermit}
                  onOpenBooking={(slot, type) => handleOpenBookingModal(slot, type || 'permit')}
                  onViewPass={(pass) => setActivePass(pass)}
                  onNavigateTab={setActiveTab}
                />
              )}

              {/* PAGE 5: MY PARKING HISTORY / PROFILE */}
              {activeTab === 'student-my-history' && (
                <StudentMyHistoryView
                  user={user}
                  userProfile={userProfile}
                  history={parkingHistory}
                />
              )}
            </>
          )}
        </div>
      </main>

      {/* Permit Purchase Modal */}
      <SlotBookingModal
        isOpen={isBookingOpen}
        onClose={() => {
          setIsBookingOpen(false)
          setBookingSlotTarget(null)
        }}
        registeredVehicles={getRegisteredVehicles()}
        onPermitActivated={(permit) => {
          setActivePermit(permit)
          setActivePass(permit)
          showToast('Permit Activated', `${permit.permitType} Permit activated with real QR! 🎉`, 'success')
        }}
        user={user}
        userProfile={userProfile}
      />

      {/* Payment Modal — shown between booking form and confirmation */}
      <PaymentModal
        bookingData={paymentPendingData}
        onPaymentSuccess={handlePaymentSuccess}
        onClose={() => setPaymentPendingData(null)}
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
