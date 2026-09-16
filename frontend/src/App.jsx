import { useState, useEffect } from 'react'
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

// Admin Views (8 pages)
import AdminDashboardView from './components/admin/AdminDashboardView'
import VehicleEntryView from './components/admin/VehicleEntryView'
import VehicleExitView from './components/admin/VehicleExitView'
import WrongParkingView from './components/admin/WrongParkingView'
import GatePermitScannerView from './components/admin/GatePermitScannerView'

// Payment Return Pages
import PaymentSuccessPage from './pages/PaymentSuccessPage'
import PaymentCancelPage from './pages/PaymentCancelPage'

// Student Views (5 pages)
import StudentDashboardView from './components/student/StudentDashboardView'
import StudentAvailableParkingView from './components/student/StudentAvailableParkingView'
import StudentMyVehicleView from './components/student/StudentMyVehicleView'
import StudentMyStatusView from './components/student/StudentMyStatusView'
import StudentMyHistoryView from './components/student/StudentMyHistoryView'

// Unified Firestore Services
import {
  subscribeToSlots,
  allocateSlot,
  allocateDynamicSlot,
  releaseSlot,
  seedParkingSlotsIfEmpty
} from './services/parkingService'
import {
  subscribeToRegisteredVehicles,
  getRegisteredVehicles,
  normalizePlate,
  seedRegisteredVehiclesIfEmpty
} from './services/vehicleService'
import {
  subscribeToParkingHistory,
  subscribeToActiveSessions,
  createParkingSession,
  endParkingSession,
  seedParkingHistoryIfEmpty
} from './services/parkingSessionService'
import { getFloorForVehicleType } from './data/vehicleRules'
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
  // APPLICATION STATE (SLOTS, HISTORY, REGISTERED VEHICLES, TABS)
  // ==========================================
  const [slots, setSlots] = useState(() => {
    try {
      const saved = localStorage.getItem('parking_slots_state')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) return parsed
      }
    } catch {
      // ignore
    }
    return INITIAL_SLOTS
  })

  const [parkingHistory, setParkingHistory] = useState([])
  const [activeSessions, setActiveSessions] = useState([])

  const [registeredVehicles, setRegisteredVehicles] = useState(() => getRegisteredVehicles())

  const [activeTab, setActiveTab] = useState('home')

  // Modals
  const [isBookingOpen, setIsBookingOpen] = useState(false)
  const [confirmationData, setConfirmationData] = useState(null)
  const [activePass, setActivePass] = useState(null)
  // Payment gate: holds pending booking until user pays ₹10
  const [paymentPendingData, setPaymentPendingData] = useState(null)

  // Open booking modal (slot/type params available for future pre-selection)
  const handleOpenBookingModal = () => {
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

  const isAdminUser =
    userProfile?.role === 'Security Admin' ||
    userProfile?.role === 'Admin'

  // ==========================================
  // REAL-TIME FIRESTORE SUBSCRIPTIONS (PHASE 2 & 5)
  // ==========================================
  useEffect(() => {
    if (!user) return

    let unsubSlots = () => {}
    let unsubVehicles = () => {}
    let unsubHistory = () => {}
    let unsubSessions = () => {}

    // Role-aware subscription filters
    const commonFilter = {
      isAdmin: Boolean(isAdminUser),
      studentId: user?.uid || '',
      rollNumber: userProfile?.campusId || userProfile?.rollNumber || '',
      vehicleNumber: userProfile?.defaultPlate || userProfile?.vehicleNumber || ''
    }

    // 1. Live Parking Slots subscription (160 bays)
    unsubSlots = subscribeToSlots(
      (liveSlots) => {
        if (Array.isArray(liveSlots) && liveSlots.length > 0) {
          setSlots(liveSlots)
        }
      },
      (err) => {
        console.warn('[Firestore] Slots subscription notice:', err?.message)
      }
    )

    // 2. Live Registered Vehicles subscription
    unsubVehicles = subscribeToRegisteredVehicles(
      (liveVehicles) => {
        if (Array.isArray(liveVehicles)) {
          setRegisteredVehicles(liveVehicles)
        }
      },
      (err) => {
        console.warn('[Firestore] Registered vehicles subscription notice:', err?.message)
      },
      commonFilter
    )

    // 3. Live Active Parking Sessions subscription
    unsubSessions = subscribeToActiveSessions(
      (liveSessions) => {
        if (Array.isArray(liveSessions)) {
          setActiveSessions(liveSessions)
        }
      },
      (err) => {
        console.warn('[Firestore] Active sessions subscription notice:', err?.message)
      },
      commonFilter
    )

    // 4. Live Parking History subscription (role-aware query)
    unsubHistory = subscribeToParkingHistory(
      (liveHistory) => {
        if (Array.isArray(liveHistory)) {
          setParkingHistory(liveHistory)
        }
      },
      (err) => {
        console.warn('[Firestore] History subscription notice:', err?.message)
      },
      commonFilter
    )

    // Idempotent Firestore collections seed on login (Admin / Security Admin ONLY)
    if (isAdminUser) {
      seedParkingSlotsIfEmpty().catch(() => {})
      seedRegisteredVehiclesIfEmpty().catch(() => {})
    }

    return () => {
      unsubSlots()
      unsubVehicles()
      unsubHistory()
      unsubSessions()
    }
  }, [user, user?.uid, isAdminUser, userProfile?.campusId, userProfile?.rollNumber, userProfile?.defaultPlate, userProfile?.vehicleNumber, userProfile?.role])

  // ==========================================
  // GATE 1: VEHICLE ENTRY HANDLER (DYNAMIC ALLOCATION)
  // ==========================================
  const handleVehicleEntry = async ({
    plate,
    owner,
    type,
    rollNumber,
    stream,
    phoneNumber,
    preferredFloor,
    qrToken
  }) => {
    const cleanPlate = normalizePlate(plate)
    const cleanPlateComp = cleanPlate.replace(/[^A-Z0-9]/g, '')

    if (!cleanPlate || cleanPlateComp.length < 4) {
      return {
        success: false,
        message: 'Please enter a valid vehicle license plate number.'
      }
    }

    // 1. Validate against live Firestore registered_vehicles
    const registered = registeredVehicles.find((v) => {
      if (!v.vehicleNumber) return false
      return normalizePlate(v.vehicleNumber).replace(/[^A-Z0-9]/g, '') === cleanPlateComp
    })

    if (!registered) {
      return {
        success: false,
        message: `Vehicle ${cleanPlate} is not registered in the campus directory. Please register the student vehicle first.`
      }
    }

    // 2. Prevent double entry (check if vehicle is already parked inside campus)
    const alreadyParked = slots.find((s) => {
      if (s.status !== 'occupied' || !s.plate) return false
      return normalizePlate(s.plate).replace(/[^A-Z0-9]/g, '') === cleanPlateComp
    })

    if (alreadyParked) {
      return {
        success: false,
        message: `Vehicle ${cleanPlate} is already parked in Bay ${alreadyParked.id} (${alreadyParked.floor}). Exit vehicle first.`
      }
    }

    // 3. Determine vehicle type and designated floor from single source of truth (vehicleRules.js)
    const vehicleType = (registered.vehicleType || type || 'scooty').toLowerCase()
    const targetFloor = preferredFloor || getFloorForVehicleType(vehicleType)
    const studentOwner = registered.studentName || owner || 'Student Member'
    const studentRoll = registered.rollNumber || rollNumber || ''
    const studentStream = registered.stream || stream || ''
    const studentPhone = registered.phoneNumber || phoneNumber || ''
    const studentCategory = registered.category || 'Student'

    try {
      const nowTs = Date.now()
      const nowTime = new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      })

      // 4. Atomically allocate slot on designated floor using Firestore transaction
      const allocatedSlot = await allocateDynamicSlot({
        plate: cleanPlate,
        owner: studentOwner,
        rollNumber: studentRoll,
        stream: studentStream,
        phoneNumber: studentPhone,
        category: studentCategory,
        type: vehicleType,
        preferredFloor: targetFloor,
        passType: qrToken ? 'QR Permit Pass' : 'Gate Allocated',
        entryTime: nowTime,
        entryTimestamp: nowTs
      })

      // 5. Create active parking session in Firestore (with rollback protection on error)
      try {
        await createParkingSession({
          slotId: allocatedSlot.slotId,
          floor: allocatedSlot.floor,
          vehicleId: registered.id || '',
          studentId: registered.studentId || registered.id,
          vehicleNumber: cleanPlate,
          studentName: studentOwner,
          rollNumber: studentRoll,
          stream: studentStream,
          phoneNumber: studentPhone,
          vehicleType,
          entryTime: nowTime,
          entryTimestamp: nowTs,
          passType: qrToken ? 'QR Permit Pass' : 'Gate Allocated',
          category: studentCategory
        })
      } catch (sessionErr) {
        console.error('[App] Session creation failed, rolling back slot allocation:', sessionErr)
        await releaseSlot(allocatedSlot.slotId)
        return {
          success: false,
          message: 'Failed to create active parking session. Bay allocation was rolled back.'
        }
      }

      // 6. Generate pass data
      const passData = {
        passId: `SOC-${allocatedSlot.slotId.replace(/[^a-zA-Z0-9]/g, '')}-${Date.now().toString().slice(-4)}`,
        slotId: allocatedSlot.slotId,
        plate: cleanPlate,
        owner: studentOwner,
        rollNumber: studentRoll,
        stream: studentStream,
        category: studentCategory,
        floor: allocatedSlot.floor,
        section: allocatedSlot.section || `${allocatedSlot.floor} Parking Area`,
        zone: `${allocatedSlot.floor} - ${allocatedSlot.section || 'General'}`,
        passType: qrToken ? 'QR Permit Pass' : 'Gate Allocated',
        entryTime: nowTime
      }

      showToast(
        'Vehicle Admitted',
        `${cleanPlate} (${studentOwner}) dynamically allocated to Bay ${allocatedSlot.slotId} (${allocatedSlot.floor}).`,
        'success'
      )

      return {
        success: true,
        slotId: allocatedSlot.slotId,
        floor: allocatedSlot.floor,
        passData
      }
    } catch (err) {
      console.error('[App] Vehicle entry allocation error:', err)
      return {
        success: false,
        message: err.message || 'Could not allocate parking bay on designated floor.'
      }
    }
  }

  // ==========================================
  // BOOKING / PARKING HANDLER (wired to gate simulator — kept for future slot booking UI)
  // ==========================================
  // eslint-disable-next-line no-unused-vars
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

  // Called after payment is confirmed — NOW commit the slot reservation
  const handlePaymentSuccess = async () => {
    if (!paymentPendingData) return
    const { _slotMutation, _confirmation } = paymentPendingData
    const {
      slotId, vehicleNumber, ownerName, rollNumber, stream,
      phoneNumber, category, vehicleType, reservedUntil,
      passType, nowTimestamp, nowTime
    } = _slotMutation

    try {
      // Commit reservation in Firestore
      await allocateSlot({
        slotId,
        plate: vehicleNumber.toUpperCase(),
        owner: ownerName || 'Campus Member',
        rollNumber: rollNumber || '',
        stream: stream || '',
        phoneNumber: phoneNumber || '',
        category: category || 'Student',
        type: vehicleType || 'scooty',
        passType: passType || 'Hourly Slot',
        reservedUntil: reservedUntil || null,
        entryTime: nowTime,
        entryTimestamp: nowTimestamp
      })

      // Create session in Firestore
      await createParkingSession({
        slotId,
        floor: _confirmation.floor,
        vehicleNumber: vehicleNumber.toUpperCase(),
        studentName: ownerName || 'Campus Member',
        rollNumber: rollNumber || '',
        stream: stream || '',
        vehicleType: vehicleType || 'scooty',
        passType: passType || 'Hourly Slot',
        entryTime: nowTime,
        entryTimestamp: nowTimestamp
      })
    } catch (err) {
      console.warn('Payment slot sync notice:', err.message)
    }

    setPaymentPendingData(null)
    setConfirmationData(_confirmation)
    showToast('Payment Confirmed', '₹10 parking fee received. Slot reserved! 🎉', 'success')
  }

  // ==========================================
  // GATE 2: RELEASE / CHECKOUT HANDLER
  // ==========================================
  const handleReleaseSlot = async (slotId, vehicleNumber = null) => {
    const targetSlot = slots.find((s) => s.id === slotId)
    const targetSession = activeSessions.find(
      (sess) => sess.slotId === slotId || (vehicleNumber && sess.vehicleNumber === vehicleNumber)
    )

    const plate = vehicleNumber || targetSlot?.plate || targetSession?.vehicleNumber
    const studentOwner = targetSlot?.owner || targetSession?.studentName
    const rollNumber = targetSlot?.rollNumber || targetSession?.rollNumber
    const stream = targetSlot?.stream || targetSession?.stream
    const vehicleType = targetSlot?.type || targetSession?.vehicleType
    const floor = targetSlot?.floor || targetSession?.floor
    const entryTime = targetSlot?.entryTime || targetSession?.entryTime
    const entryTimestamp = targetSlot?.entryTimestamp || targetSession?.entryTimestamp

    try {
      // Execute atomic batch checkout in Firestore (session completed + slot released + history archived)
      const result = await endParkingSession({
        slotId,
        vehicleNumber: plate,
        studentName: studentOwner,
        rollNumber,
        stream,
        vehicleType,
        floor,
        entryTime,
        entryTimestamp
      })

      showToast(
        'Vehicle Checked Out',
        `Vehicle ${result.vehicleNumber} checked out from Bay ${result.slotId} (${result.duration}). Bay is now available.`,
        'success'
      )

      return result
    } catch (err) {
      console.error('[App] Slot checkout error:', err)
      showToast('Checkout Failed', err.message || 'Could not process vehicle checkout.', 'error')
      throw err
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
  // PAYMENT RETURN PAGES (Stripe Checkout Return)
  // ==========================================
  const currentPath = window.location.pathname
  const isPaymentSuccess = currentPath.includes('payment-success') || window.location.search.includes('session_id')
  const isPaymentCancel = currentPath.includes('payment-cancel')

  if (isPaymentSuccess) {
    return <PaymentSuccessPage />
  }

  if (isPaymentCancel) {
    return <PaymentCancelPage />
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
    userProfile?.role === 'Admin'

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
                <RegistrationPage
                  slots={slots}
                  registeredVehicles={registeredVehicles}
                  showToast={showToast}
                />
              )}

              {/* PAGE 4: VEHICLE ENTRY */}
              {activeTab === 'vehicle-entry' && (
                <VehicleEntryView
                  slots={slots}
                  registeredVehicles={registeredVehicles}
                  onVehicleEntry={handleVehicleEntry}
                  onShowPass={(pass) => setActivePass(pass)}
                />
              )}

              {/* PAGE 5: VEHICLE EXIT */}
              {activeTab === 'vehicle-exit' && (
                <VehicleExitView
                  slots={slots}
                  activeSessions={activeSessions}
                  onReleaseSlot={handleReleaseSlot}
                />
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

              {/* PAGE 8: GATE QR PERMIT SCANNER & VERIFICATION */}
              {activeTab === 'gate-scanner' && (
                <GatePermitScannerView
                  showToast={showToast}
                  registeredVehicles={registeredVehicles}
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
                  onCancelPermit={(permit) => {
                    if (window.confirm(`Cancel ${permit?.permitType || ''} permit for ${permit?.vehiclePlate || 'this vehicle'}? This cannot be undone.`)) {
                      setActivePermit(null)
                      localStorage.removeItem('student_active_permit')
                      showToast('Permit Cancelled', 'Your permit has been removed.', 'info')
                    }
                  }}
                />
              )}

              {/* PAGE 2: AVAILABLE PARKING */}
              {activeTab === 'student-available-parking' && (
                <StudentAvailableParkingView
                  slots={slots}
                  userProfile={userProfile}
                  onOpenBooking={(slot, type) => handleOpenBookingModal(slot, type || 'slot')}
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
        }}
        registeredVehicles={registeredVehicles}
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
