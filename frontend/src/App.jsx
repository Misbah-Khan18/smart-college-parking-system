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
  reserveSlotWithTransaction,
  subscribeToUserReservation,
  cancelUserReservation,
  seedParkingSlotsIfEmpty,
  normalizeSlotId
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
import { verifyAndCompleteGateExit } from './services/guardExitService'
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
          const savedCustom = localStorage.getItem('custom_student_vehicle_profile')
          let customVehicleData = {}
          if (savedCustom) {
            try {
              const parsedCustom = JSON.parse(savedCustom)
              // Strip role and core identity fields from customData so they cannot overwrite Firestore
              const { role, uid, email, displayName, photoURL, campusId, ...vehicleProps } = parsedCustom || {}
              customVehicleData = vehicleProps
            } catch {
              // ignore parse errors
            }
          }

          if (profile) {
            // If the user has Admin or Security Admin role, Firestore profile is 100% authoritative and role cannot be changed
            if (profile.role === 'Security Admin' || profile.role === 'Admin') {
              setUserProfile(profile)
            } else {
              // For student accounts, allow non-identity vehicle fields while preserving profile.role
              setUserProfile({
                ...profile,
                ...customVehicleData,
                role: profile.role || 'Student',
                uid: profile.uid || currentUser.uid,
                email: profile.email || currentUser.email
              })
            }
          } else {
            setUserProfile({
              uid: currentUser.uid,
              displayName: currentUser.displayName || 'Campus Member',
              email: currentUser.email,
              role: 'Student',
              campusId: 'S2410701',
              vehicleType: 'scooty',
              defaultPlate: 'MH-12-AB-1234',
              stream: 'BCA (Bachelor of Computer Applications)',
              phoneNumber: '+91 98765 43210',
              photoURL: currentUser.photoURL || '',
              ...customVehicleData,
              role: 'Student'
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
      // Ensure role is never accidentally downgraded by vehicle customization edits
      const currentRole = prev?.role || 'Student'
      const merged = { ...(prev || {}), ...updatedFields, role: currentRole }
      try {
        const { role, uid, email, displayName, photoURL, ...vehicleFields } = merged
        localStorage.setItem('custom_student_vehicle_profile', JSON.stringify(vehicleFields))
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
        const { role, uid, email, displayName, photoURL, ...safeCustom } = JSON.parse(savedCustom)
        finalData = { ...demoData, ...safeCustom }
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

  // Handle Logout (Preserves custom_student_vehicle_profile & keeps Firestore reservations intact)
  const handleLogout = async () => {
    try {
      localStorage.removeItem('demo_user_session')
      if (user?.uid) {
        localStorage.removeItem(`user_profile_${user.uid}`)
      }
      setUser(null)
      setUserProfile(null)
      setActiveReservation(null)
      setActivePass(null)
      setActiveTab('home')
      await logout()
    } catch (err) {
      console.warn('Logout notice:', err)
      localStorage.removeItem('demo_user_session')
      setUser(null)
      setUserProfile(null)
      setActiveReservation(null)
      setActivePass(null)
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
  const [isSlotsInitialized, setIsSlotsInitialized] = useState(false)

  // Modals & Selected Slot State
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [activeReservation, setActiveReservation] = useState(null)
  const [isBookingOpen, setIsBookingOpen] = useState(false)
  const [confirmationData, setConfirmationData] = useState(null)
  const [activePass, setActivePass] = useState(null)
  const [paymentPendingData, setPaymentPendingData] = useState(null)

  // Open booking modal with optional slot pre-selection
  const handleOpenBookingModal = (slot = null, type = 'slot') => {
    setSelectedSlot(slot || null)
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
  // REAL-TIME FIRESTORE SUBSCRIPTIONS
  // ==========================================
  useEffect(() => {
    if (!user) return

    let unsubSlots = () => {}
    let unsubVehicles = () => {}
    let unsubHistory = () => {}
    let unsubSessions = () => {}
    let unsubReservation = () => {}

    const currentUid = user?.uid || auth.currentUser?.uid || ''

    // Role-aware subscription filters
    const commonFilter = {
      isAdmin: Boolean(isAdminUser),
      studentId: currentUid,
      rollNumber: userProfile?.campusId || userProfile?.rollNumber || '',
      vehicleNumber: userProfile?.defaultPlate || userProfile?.vehicleNumber || ''
    }

    // 1. Live Parking Slots subscription (160 bays)
    unsubSlots = subscribeToSlots(
      (liveSlots) => {
        if (Array.isArray(liveSlots) && liveSlots.length > 0) {
          setSlots(liveSlots)
          setIsSlotsInitialized(true)
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

    // 5. Live Authenticated User Active Reservation subscription
    if (currentUid) {
      unsubReservation = subscribeToUserReservation(
        currentUid,
        (liveRes) => {
          setActiveReservation(liveRes)
          if (liveRes) {
            // Automatically hydrate activePass so user's pass is ready
            setActivePass({
              id: liveRes.passId || liveRes.id,
              passId: liveRes.passId || liveRes.id,
              reservationId: liveRes.id,
              slotId: liveRes.slotId,
              plate: liveRes.plate || liveRes.vehiclePlate || liveRes.vehicleNumber,
              vehiclePlate: liveRes.plate || liveRes.vehiclePlate || liveRes.vehicleNumber,
              vehicleNumber: liveRes.plate || liveRes.vehiclePlate || liveRes.vehicleNumber,
              studentName: liveRes.userName || liveRes.studentName,
              owner: liveRes.userName || liveRes.studentName,
              floor: liveRes.floor,
              section: liveRes.section,
              zone: liveRes.zone,
              passType: liveRes.passType || 'Parking Pass',
              permitType: liveRes.passType || 'Parking Pass',
              status: 'ACTIVE',
              reservationStatus: 'Reserved',
              entryTime: liveRes.entryTime || 'Active',
              validUntil: liveRes.validUntil || 'Active Session',
              reservedUntil: liveRes.validUntil || 'Active Session',
              qrToken: liveRes.qrToken || `SOC-RES-${liveRes.slotId}-${liveRes.plate}`
            })
          }
        },
        (err) => {
          console.warn('[Firestore] User reservation subscription notice:', err?.message)
        }
      )
    }

    // Idempotent Firestore collections seed on login (seeds all 160 bays as 'available' if empty)
    seedParkingSlotsIfEmpty()
      .then((res) => {
        if (res?.seeded || res?.count >= 160) {
          setIsSlotsInitialized(true)
        }
      })
      .catch((err) => {
        console.warn('[SEED] Slot seed check notice:', err?.message)
      })
    if (isAdminUser) {
      seedRegisteredVehiclesIfEmpty().catch(() => {})
    }

    return () => {
      unsubSlots()
      unsubVehicles()
      unsubHistory()
      unsubSessions()
      unsubReservation()
    }
  }, [user, user?.uid, isAdminUser, userProfile?.campusId, userProfile?.rollNumber, userProfile?.defaultPlate, userProfile?.vehicleNumber, userProfile?.role])

  // ==========================================
  // PARKING PASS ACTIVATION & SLOT RESERVATION (CONCURRENCY-SAFE TRANSACTION)
  // ==========================================
  const handleActivatePass = async ({
    slotId,
    slot,
    floor,
    section,
    zone,
    plate,
    owner,
    userName,
    userEmail,
    rollNumber,
    stream,
    phoneNumber,
    category,
    vehicleType,
    type,
    passType,
    permitType,
    amountPaidINR,
    reservedUntil
  }) => {
    const currentUid = user?.uid || auth.currentUser?.uid
    if (!currentUid) {
      showToast('Authentication Required', 'Please sign in to reserve a parking slot.', 'error')
      throw new Error('Please sign in to reserve a parking slot.')
    }

    if (!isSlotsInitialized) {
      showToast('System Initializing', 'Parking slot data is still loading from Firestore. Please wait a moment.', 'warning')
      throw new Error('Parking slot data is not initialized. Please refresh and try again.')
    }

    const cleanSlotId = normalizeSlotId(slotId)
    if (!cleanSlotId) {
      showToast('No Slot Selected', 'Please select a parking bay first.', 'error')
      throw new Error('Please select a parking slot before activating your pass.')
    }

    try {
      // Execute Firestore Transaction
      const result = await reserveSlotWithTransaction({
        slotId: cleanSlotId,
        userId: currentUid,
        userName: userName || userProfile?.displayName || user?.displayName || 'Campus Member',
        userEmail: userEmail || user?.email || userProfile?.email || '',
        plate: plate || userProfile?.defaultPlate || 'MH-12-AB-1234',
        rollNumber: rollNumber || userProfile?.campusId || userProfile?.rollNumber || '',
        stream: stream || userProfile?.stream || '',
        phoneNumber: phoneNumber || userProfile?.phoneNumber || '',
        category: category || userProfile?.role || 'Student',
        type: vehicleType || type || 'scooty',
        floor: floor || (cleanSlotId.startsWith('G') ? 'Ground Floor' : 'Basement'),
        section,
        zone,
        passType: passType || `${permitType || 'Parking Pass'} (${cleanSlotId})`,
        reservedUntil,
        amountPaidINR: amountPaidINR || 0
      })

      if (result && result.success) {
        setActiveReservation(result.reservation)
        setActivePass(result.passData)
        setSelectedSlot(null)

        const nowDate = new Date().toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        })
        const nowTime = new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        })

        setConfirmationData({
          slotId: result.slotId,
          floor: result.passData.floor,
          passType: result.passData.passType,
          dateStr: nowDate,
          timeStr: nowTime,
          vehicleNumber: result.passData.vehiclePlate,
          passData: result.passData
        })

        showToast(
          'Pass Activated & Slot Reserved! 🎉',
          `Bay ${result.slotId} (${result.passData.floor}) is now reserved for ${result.passData.vehiclePlate}.`,
          'success'
        )

        return result
      }
    } catch (err) {
      console.error('[App] Pass activation error:', err)
      showToast('Reservation Failed', err.message || 'Could not complete reservation.', 'error')
      throw err
    }
  }

  // ==========================================
  // CANCEL / RELEASE USER RESERVATION
  // ==========================================
  const handleCancelReservation = async (slotOrRes) => {
    const slotId = slotOrRes?.slotId || slotOrRes?.id
    const reservationId = slotOrRes?.reservationId || activeReservation?.id || null
    const currentUid = user?.uid || auth.currentUser?.uid

    if (!slotId && !reservationId) return

    if (window.confirm(`Release reservation for Bay ${slotId || 'current bay'}? The bay will become available for other members.`)) {
      try {
        await cancelUserReservation({
          slotId,
          reservationId,
          userId: currentUid
        })
        setActiveReservation(null)
        if (activePass && (activePass.slotId === slotId || activePass.reservationId === reservationId)) {
          setActivePass(null)
        }
        showToast('Reservation Released', `Bay ${slotId} is now available again.`, 'info')
      } catch (err) {
        console.error('[App] Cancel reservation error:', err)
        showToast('Cancel Failed', err.message || 'Could not cancel reservation.', 'error')
      }
    }
  }

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

      // 5. Create active parking session in Firestore
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
  // PAYMENT HANDLER
  // ==========================================
  const handlePaymentSuccess = async () => {
    if (!paymentPendingData) return
    const { _slotMutation, _confirmation } = paymentPendingData
    const {
      slotId, vehicleNumber, ownerName, rollNumber, stream,
      phoneNumber, category, vehicleType, reservedUntil,
      passType, nowTimestamp, nowTime
    } = _slotMutation

    try {
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
    const currentGuardUid = auth.currentUser ? auth.currentUser.uid : (user?.uid || '')
    try {
      const result = await verifyAndCompleteGateExit({
        slotId,
        scannedPlate: vehicleNumber,
        guardUid: currentGuardUid
      })

      if (result.approved) {
        showToast(
          'Vehicle Checked Out',
          `Vehicle ${result.vehicleNumber} checked out from Bay ${result.slotId} (${result.duration}). Bay is now available.`,
          'success'
        )
        return result
      } else {
        showToast('Checkout Denied', result.message || result.reason, 'error')
        throw new Error(result.message || result.reason)
      }
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
              ADMIN SIDE — 8 PAGES
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
                  selectedSlotId={selectedSlot?.id}
                  currentUserId={user?.uid}
                  isAdmin={Boolean(isAdmin)}
                  onSelectSlot={(slot) => {
                    if (slot.status === 'available') {
                      handleOpenBookingModal(slot, 'slot')
                    } else if (slot.status === 'reserved' || slot.status === 'occupied') {
                      const isOwner = Boolean(
                        user?.uid && (
                          slot.reservedBy === user.uid ||
                          slot.userId === user.uid ||
                          slot.studentId === user.uid
                        )
                      )
                      if (isAdmin || isOwner) {
                        setActivePass({
                          passId: slot.passId || `SOC-${slot.id.replace(/[^a-zA-Z0-9]/g, '')}`,
                          slotId: slot.id,
                          plate: slot.plate,
                          owner: slot.owner,
                          category: slot.category,
                          reservedUntil: slot.reservedUntil || 'Active Session',
                          floor: slot.floor,
                          section: slot.section,
                          zone: `${slot.floor} - ${slot.section}`,
                          passType: slot.passType || 'Parking Bay Pass'
                        })
                      }
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
                  user={user}
                  userProfile={userProfile}
                  showToast={showToast}
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
                  slots={slots}
                  user={user}
                  userProfile={userProfile}
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
                  activeReservation={activeReservation}
                  onNavigateTab={setActiveTab}
                  onOpenBooking={(slot, type) => handleOpenBookingModal(slot, type || 'slot')}
                  onViewPass={(pass) => setActivePass(pass)}
                  onCancelReservation={handleCancelReservation}
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
                  activeReservation={activeReservation}
                  onOpenBooking={(slot, type) => handleOpenBookingModal(slot, type || 'slot')}
                  onViewPass={(pass) => setActivePass(pass)}
                  onNavigateTab={setActiveTab}
                  onCancelReservation={handleCancelReservation}
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

      {/* Slot Reservation / Pass Modal */}
      <SlotBookingModal
        isOpen={isBookingOpen}
        onClose={() => {
          setIsBookingOpen(false)
          setSelectedSlot(null)
        }}
        selectedSlot={selectedSlot}
        availableSlots={slots.filter((s) => s.status === 'available')}
        registeredVehicles={registeredVehicles}
        onActivatePass={handleActivatePass}
        onPermitActivated={(permit) => {
          setActivePermit(permit)
          setActivePass(permit)
          showToast('Permit Activated', `${permit.permitType} Permit activated with real QR! 🎉`, 'success')
        }}
        user={user}
        userProfile={userProfile}
        isSlotsInitialized={isSlotsInitialized}
      />

      {/* Payment Modal — shown when applicable */}
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
