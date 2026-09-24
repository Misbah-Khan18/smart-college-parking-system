import { useState, useEffect } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from './firebase/firebase'
import { getUserProfile, logout } from './firebase/auth'

import {
  INITIAL_SLOTS
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

// Admin Views
import AdminDashboardView from './components/admin/AdminDashboardView'
import VehicleEntryView from './components/admin/VehicleEntryView'
import VehicleExitView from './components/admin/VehicleExitView'
import WrongParkingView from './components/admin/WrongParkingView'
import GatePermitScannerView from './components/admin/GatePermitScannerView'

// Payment Return Pages
import PaymentSuccessPage from './pages/PaymentSuccessPage'
import PaymentCancelPage from './pages/PaymentCancelPage'

// Student Views
import StudentDashboardView from './components/student/StudentDashboardView'
import StudentAvailableParkingView from './components/student/StudentAvailableParkingView'
import CampusParkingDashboard from './components/CampusParkingDashboard'
import StudentMyVehicleView from './components/student/StudentMyVehicleView'
import StudentMyStatusView from './components/student/StudentMyStatusView'
import StudentMyHistoryView from './components/student/StudentMyHistoryView'

// Firestore Services
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
  createParkingSession
} from './services/parkingSessionService'

import { verifyAndCompleteGateExit } from './services/guardExitService'
import { getFloorForVehicleType } from './data/vehicleRules'

import './App.css'


export default function App() {
  // ==========================================
  // ONE-TIME INTRO SPLASH
  // ==========================================

  const [showIntro, setShowIntro] = useState(() => {
    try {
      return !sessionStorage.getItem('soc_intro_played')
    } catch {
      return false
    }
  })


  // ==========================================
  // AUTHENTICATION
  // ==========================================

  const [user, setUser] = useState(() => {
    try {
      const savedDemo = localStorage.getItem('demo_user_session')

      if (savedDemo) {
        return JSON.parse(savedDemo)
      }
    } catch {
      localStorage.removeItem('demo_user_session')
    }

    return null
  })


  const [userProfile, setUserProfile] = useState(() => {
    try {
      const savedDemo = localStorage.getItem('demo_user_session')

      if (savedDemo) {
        return JSON.parse(savedDemo)
      }
    } catch {
      // Ignore invalid cached profile
    }

    return null
  })


  const [authLoading, setAuthLoading] = useState(() => {
    try {
      return !localStorage.getItem('demo_user_session')
    } catch {
      return true
    }
  })


  // ==========================================
  // FIREBASE AUTH STATE LISTENER
  // ==========================================

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        try {
          localStorage.removeItem('demo_user_session')
        } catch {
          // ignore
        }

        setUser(currentUser)

        try {
          // Firestore profile is authoritative.
          const profile = await getUserProfile(currentUser.uid, currentUser)

          const isKnownAdmin =
            currentUser.email === 'shaikhalzuni123@gmail.com' ||
            currentUser.uid === 'R2eyVR9vzOUb6rwv9gNCPWcuoGr1'

          const resolvedRole = isKnownAdmin
            ? 'Security Admin'
            : (profile?.role || 'Student')

          const finalProfile = {
            ...(profile || {}),
            uid: currentUser.uid,
            email: currentUser.email || profile?.email || '',
            displayName:
              profile?.displayName ||
              currentUser.displayName ||
              (resolvedRole === 'Security Admin' ? 'Campus Admin' : 'Campus Member'),
            photoURL:
              profile?.photoURL ||
              currentUser.photoURL ||
              '',
            role: resolvedRole,
            campusId: profile?.campusId || (resolvedRole === 'Security Admin' ? 'ADM-01' : ''),
            rollNumber: profile?.rollNumber || profile?.campusId || '',
            vehicleType: profile?.vehicleType || (resolvedRole === 'Security Admin' ? 'bike' : 'scooty'),
            preferredFloor: profile?.preferredFloor || (resolvedRole === 'Security Admin' ? 'Basement' : 'Ground Floor'),
            defaultPlate: profile?.defaultPlate || profile?.vehicleNumber || profile?.vehiclePlate || '',
            vehiclePlate: profile?.vehiclePlate || profile?.defaultPlate || '',
            vehicleNumber: profile?.vehicleNumber || profile?.defaultPlate || '',
            stream: profile?.stream || (resolvedRole === 'Security Admin' ? 'Campus Administration' : 'Registered Student'),
            phoneNumber: profile?.phoneNumber || ''
          }

          console.log('[Auth/Role] Authenticated UID:', currentUser.uid)
          console.log('[Auth/Role] Authenticated Email:', currentUser.email)
          console.log('[Auth/Role] Firestore document path: users/' + currentUser.uid)
          console.log('[Auth/Role] Firestore role returned:', profile?.role || '(none)')
          console.log('[Auth/Role] Final role used by App/routing:', finalProfile.role)

          setUserProfile(finalProfile)
        } catch (err) {
          console.warn('[Auth] Profile fetch warning:', err)

          const isKnownAdmin =
            currentUser.email === 'shaikhalzuni123@gmail.com' ||
            currentUser.uid === 'R2eyVR9vzOUb6rwv9gNCPWcuoGr1'

          const fallbackRole = isKnownAdmin ? 'Security Admin' : 'Student'

          setUserProfile({
            uid: currentUser.uid,
            email: currentUser.email || '',
            displayName: currentUser.displayName || (fallbackRole === 'Security Admin' ? 'Campus Admin' : 'Campus Member'),
            photoURL: currentUser.photoURL || '',
            role: fallbackRole
          })
        }
      } else {
        // Firebase user logged out.
        const activeDemo = localStorage.getItem('demo_user_session')

        if (activeDemo) {
          try {
            const parsedDemo = JSON.parse(activeDemo)

            setUser(parsedDemo)
            setUserProfile(parsedDemo)
          } catch {
            localStorage.removeItem('demo_user_session')
            setUser(null)
            setUserProfile(null)
          }
        } else {
          setUser(null)
          setUserProfile(null)
        }
      }

      setAuthLoading(false)
    })

    return () => unsubscribe()
  }, [])



  // ==========================================
  // TOAST
  // ==========================================

  const [toast, setToast] = useState(null)

  const showToast = (title, message, type = 'info') => {
    setToast({
      title,
      message,
      type
    })
  }


  // ==========================================
  // APPLICATION STATE
  // ==========================================

  const [slots, setSlots] = useState(() => {
    try {
      const saved = localStorage.getItem('parking_slots_state')

      if (saved) {
        const parsed = JSON.parse(saved)

        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed
        }
      }
    } catch {
      // Ignore invalid cached slots
    }

    return INITIAL_SLOTS
  })


  const [parkingHistory, setParkingHistory] = useState([])

  const [activeSessions, setActiveSessions] = useState([])

  const [registeredVehicles, setRegisteredVehicles] = useState(() => {
    try {
      return getRegisteredVehicles()
    } catch {
      return []
    }
  })


  const [activeTab, setActiveTab] = useState('home')
  const [studentParkingViewMode, setStudentParkingViewMode] = useState('campus') // 'campus' | 'grid'

  const [isSlotsInitialized, setIsSlotsInitialized] = useState(false)


  // ==========================================
  // MODALS / RESERVATIONS
  // ==========================================

  const [selectedSlot, setSelectedSlot] = useState(null)

  const [activeReservation, setActiveReservation] = useState(null)

  const [isBookingOpen, setIsBookingOpen] = useState(false)

  const [confirmationData, setConfirmationData] = useState(null)

  const [activePass, setActivePass] = useState(null)

  const [paymentPendingData, setPaymentPendingData] = useState(null)


  // ==========================================
  // ACTIVE PERMIT
  // ==========================================

  const [activePermit, setActivePermit] = useState(() => {
    try {
      const saved = localStorage.getItem('student_active_permit')

      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })


  useEffect(() => {
    if (!activePermit) return

    try {
      localStorage.setItem(
        'student_active_permit',
        JSON.stringify(activePermit)
      )
    } catch {
      // Ignore storage errors
    }
  }, [activePermit])


  // ==========================================
  // ROLE
  // ==========================================

  const isAdminUser =
    userProfile?.role === 'Security Admin' ||
    userProfile?.role === 'Admin'


  // ==========================================
  // BOOKING MODAL
  // ==========================================

  const handleOpenBookingModal = (slot = null) => {
    setSelectedSlot(slot || null)
    setIsBookingOpen(true)
  }


  // ==========================================
  // REAL-TIME FIRESTORE SUBSCRIPTIONS
  // ==========================================

  useEffect(() => {
    if (!user) return

    let unsubSlots = () => { }
    let unsubVehicles = () => { }
    let unsubHistory = () => { }
    let unsubSessions = () => { }
    let unsubReservation = () => { }

    const currentUid =
      user?.uid ||
      auth.currentUser?.uid ||
      ''

    const commonFilter = {
      isAdmin: Boolean(isAdminUser),
      studentId: currentUid,
      rollNumber:
        userProfile?.campusId ||
        userProfile?.rollNumber ||
        '',
      vehicleNumber:
        userProfile?.defaultPlate ||
        userProfile?.vehicleNumber ||
        ''
    }


    // 1. Parking Slots
    unsubSlots = subscribeToSlots(
      (liveSlots) => {
        if (Array.isArray(liveSlots) && liveSlots.length > 0) {
          setSlots(liveSlots)
          setIsSlotsInitialized(true)
        }
      },
      (err) => {
        console.warn(
          '[Firestore] Slots subscription:',
          err?.message
        )
      }
    )


    // 2. Registered Vehicles
    unsubVehicles = subscribeToRegisteredVehicles(
      (liveVehicles) => {
        if (Array.isArray(liveVehicles)) {
          setRegisteredVehicles(liveVehicles)
        }
      },
      (err) => {
        console.warn(
          '[Firestore] Registered vehicles:',
          err?.message
        )
      },
      commonFilter
    )


    // 3. Active Sessions
    unsubSessions = subscribeToActiveSessions(
      (liveSessions) => {
        if (Array.isArray(liveSessions)) {
          setActiveSessions(liveSessions)
        }
      },
      (err) => {
        console.warn(
          '[Firestore] Active sessions:',
          err?.message
        )
      },
      commonFilter
    )


    // 4. Parking History
    unsubHistory = subscribeToParkingHistory(
      (liveHistory) => {
        if (Array.isArray(liveHistory)) {
          setParkingHistory(liveHistory)
        }
      },
      (err) => {
        console.warn(
          '[Firestore] Parking history:',
          err?.message
        )
      },
      commonFilter
    )


    // 5. Active Reservation
    if (currentUid) {
      unsubReservation = subscribeToUserReservation(
        currentUid,
        (liveRes) => {
          setActiveReservation(liveRes)

          if (liveRes) {
            const plate =
              liveRes.plate ||
              liveRes.vehiclePlate ||
              liveRes.vehicleNumber ||
              ''

            const studentName =
              liveRes.userName ||
              liveRes.studentName ||
              userProfile?.displayName ||
              user?.displayName ||
              'Campus Member'

            setActivePass({
              id: liveRes.passId || liveRes.id,
              passId: liveRes.passId || liveRes.id,
              reservationId: liveRes.id,

              slotId: liveRes.slotId,

              plate,
              vehiclePlate: plate,
              vehicleNumber: plate,

              studentName,
              owner: studentName,

              floor: liveRes.floor,
              section: liveRes.section,
              zone: liveRes.zone,

              passType:
                liveRes.passType ||
                'Parking Pass',

              permitType:
                liveRes.passType ||
                'Parking Pass',

              status: 'ACTIVE',
              reservationStatus: 'Reserved',

              entryTime:
                liveRes.entryTime ||
                'Active',

              validUntil:
                liveRes.validUntil ||
                'Active Session',

              reservedUntil:
                liveRes.validUntil ||
                'Active Session',

              qrToken:
                liveRes.qrToken ||
                `SOC-RES-${liveRes.slotId}-${plate}`
            })
          }
        },
        (err) => {
          console.warn(
            '[Firestore] Reservation subscription:',
            err?.message
          )
        }
      )
    }


    // Seed slots
    seedParkingSlotsIfEmpty()
      .then((res) => {
        if (res?.seeded || res?.count >= 160) {
          setIsSlotsInitialized(true)
        }
      })
      .catch((err) => {
        console.warn(
          '[SEED] Slot seed:',
          err?.message
        )
      })


    // Seed registered vehicles for admins
    if (isAdminUser) {
      seedRegisteredVehiclesIfEmpty().catch(() => { })
    }


    // Cleanup subscriptions
    return () => {
      unsubSlots()
      unsubVehicles()
      unsubHistory()
      unsubSessions()
      unsubReservation()
    }
  }, [
    user,
    isAdminUser,
    userProfile?.displayName,
    userProfile?.campusId,
    userProfile?.rollNumber,
    userProfile?.defaultPlate,
    userProfile?.vehicleNumber,
    userProfile?.role
  ])


  // ==========================================
  // PROFILE UPDATE
  // ==========================================

  const handleUpdateProfile = (updatedFields) => {
    const activeUid =
      user?.uid ||
      userProfile?.uid ||
      'demo'

    setUserProfile((previousProfile) => {
      const currentRole =
        previousProfile?.role ||
        'Student'

      const mergedProfile = {
        ...(previousProfile || {}),
        ...updatedFields,

        // Never allow vehicle profile editing
        // to overwrite the authenticated role.
        role: currentRole
      }


      try {
        localStorage.setItem(
          `custom_student_vehicle_profile_${activeUid}`,
          JSON.stringify(updatedFields)
        )
      } catch (err) {
        console.warn(
          '[Profile] Local storage warning:',
          err
        )
      }

      return mergedProfile
    })


    showToast(
      'Saved',
      'Your vehicle & profile details were saved successfully! 🚗',
      'success'
    )
  }


  // ==========================================
  // DEMO LOGIN
  // ==========================================

  const handleDemoLogin = (demoData) => {
    const demoUid =
      demoData?.uid ||
      'demo'

    let finalData = {
      ...demoData
    }


    try {
      const savedCustom = localStorage.getItem(
        `custom_student_vehicle_profile_${demoUid}`
      )

      if (
        savedCustom &&
        demoData?.role !== 'Security Admin' &&
        demoData?.role !== 'Admin'
      ) {
        const parsedCustom = JSON.parse(savedCustom)

        const safeCustom = { ...(parsedCustom || {}) }
        delete safeCustom.role
        delete safeCustom.uid
        delete safeCustom.email
        delete safeCustom.displayName
        delete safeCustom.photoURL

        finalData = {
          ...demoData,
          ...safeCustom
        }
      }
    } catch {
      // Ignore invalid custom profile
    }


    localStorage.setItem(
      'demo_user_session',
      JSON.stringify(finalData)
    )

    setUser(finalData)
    setUserProfile(finalData)
    setAuthLoading(false)


    const firstName =
      finalData.displayName?.split(' ')[0] ||
      'Student'


    showToast(
      'Signed In',
      `Welcome, ${firstName} 👋`,
      'success'
    )
  }


  // ==========================================
  // LOGOUT
  // ==========================================

  const handleLogout = async () => {
    try {
      localStorage.removeItem('demo_user_session')

      if (user?.uid) {
        localStorage.removeItem(
          `user_profile_${user.uid}`
        )
      }


      setUser(null)
      setUserProfile(null)

      setActiveReservation(null)
      setActivePass(null)

      setActiveTab('home')


      await logout()
    } catch (err) {
      console.warn(
        '[Auth] Logout notice:',
        err
      )

      localStorage.removeItem(
        'demo_user_session'
      )

      setUser(null)
      setUserProfile(null)

      setActiveReservation(null)
      setActivePass(null)
    }
  }


  // ==========================================
  // PARKING PASS / SLOT RESERVATION
  // ==========================================

  const handleActivatePass = async ({
    slotId,
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
    const currentUid =
      user?.uid ||
      auth.currentUser?.uid


    if (!currentUid) {
      showToast(
        'Authentication Required',
        'Please sign in to reserve a parking slot.',
        'error'
      )

      throw new Error(
        'Please sign in to reserve a parking slot.'
      )
    }


    if (!isSlotsInitialized) {
      showToast(
        'System Initializing',
        'Parking slot data is still loading from Firestore. Please wait a moment.',
        'warning'
      )

      throw new Error(
        'Parking slot data is not initialized. Please refresh and try again.'
      )
    }


    const cleanSlotId =
      normalizeSlotId(slotId)


    if (!cleanSlotId) {
      showToast(
        'No Slot Selected',
        'Please select a parking bay first.',
        'error'
      )

      throw new Error(
        'Please select a parking slot before activating your pass.'
      )
    }


    try {
      const result =
        await reserveSlotWithTransaction({
          slotId: cleanSlotId,

          userId: currentUid,

          userName:
            userName ||
            owner ||
            userProfile?.displayName ||
            user?.displayName ||
            'Campus Member',

          userEmail:
            userEmail ||
            user?.email ||
            userProfile?.email ||
            '',

          plate:
            plate ||
            userProfile?.defaultPlate ||
            'MH-12-AB-1234',

          rollNumber:
            rollNumber ||
            userProfile?.campusId ||
            userProfile?.rollNumber ||
            '',

          stream:
            stream ||
            userProfile?.stream ||
            '',

          phoneNumber:
            phoneNumber ||
            userProfile?.phoneNumber ||
            '',

          category:
            category ||
            userProfile?.role ||
            'Student',

          type:
            vehicleType ||
            type ||
            'scooty',

          floor:
            floor ||
            (
              cleanSlotId.startsWith('G')
                ? 'Ground Floor'
                : 'Basement'
            ),

          section,
          zone,

          passType:
            passType ||
            `${permitType || 'Parking Pass'} (${cleanSlotId})`,

          reservedUntil,

          amountPaidINR:
            amountPaidINR || 0
        })


      if (result?.success) {
        setActiveReservation(
          result.reservation
        )

        setActivePass(
          result.passData
        )

        setSelectedSlot(null)

        setSlots((prev) =>
          prev.map((s) =>
            normalizeSlotId(s.id) === cleanSlotId
              ? {
                  ...s,
                  status: 'reserved',
                  plate: result.passData.vehiclePlate,
                  owner: result.passData.owner,
                  type: result.passData.vehicleType
                }
              : s
          )
        )


        const nowDate =
          new Date().toLocaleDateString(
            'en-GB',
            {
              day: '2-digit',
              month: 'short',
              year: 'numeric'
            }
          )


        const nowTime =
          new Date().toLocaleTimeString(
            [],
            {
              hour: '2-digit',
              minute: '2-digit',
              hour12: true
            }
          )


        setConfirmationData({
          slotId: result.slotId,

          floor:
            result.passData.floor,

          passType:
            result.passData.passType,

          dateStr: nowDate,
          timeStr: nowTime,

          vehicleNumber:
            result.passData.vehiclePlate,

          passData:
            result.passData
        })


        showToast(
          'Pass Activated & Slot Reserved! 🎉',
          `Bay ${result.slotId} (${result.passData.floor}) is now reserved for ${result.passData.vehiclePlate}.`,
          'success'
        )


        return result
      }

      throw new Error(
        'Unable to reserve the selected parking bay.'
      )
    } catch (err) {
      console.error(
        '[App] Pass activation error:',
        err
      )

      showToast(
        'Reservation Failed',
        err.message ||
        'Could not complete reservation.',
        'error'
      )

      throw err
    }
  }


  // ==========================================
  // CANCEL RESERVATION
  // ==========================================

  const handleCancelReservation = async (
    slotOrRes
  ) => {
    const slotId =
      slotOrRes?.slotId ||
      slotOrRes?.id

    const reservationId =
      slotOrRes?.reservationId ||
      activeReservation?.id ||
      null

    const currentUid =
      user?.uid ||
      auth.currentUser?.uid


    if (!slotId && !reservationId) {
      return
    }


    if (
      window.confirm(
        `Release reservation for Bay ${slotId || 'current bay'}? The bay will become available for other members.`
      )
    ) {
      try {
        await cancelUserReservation({
          slotId,
          reservationId,
          userId: currentUid
        })


        setActiveReservation(null)


        if (
          activePass &&
          (
            activePass.slotId === slotId ||
            activePass.reservationId === reservationId
          )
        ) {
          setActivePass(null)
        }


        showToast(
          'Reservation Released',
          `Bay ${slotId || ''} is now available again.`,
          'info'
        )
      } catch (err) {
        console.error(
          '[App] Cancel reservation:',
          err
        )

        showToast(
          'Cancel Failed',
          err.message ||
          'Could not cancel reservation.',
          'error'
        )
      }
    }
  }


  // ==========================================
  // VEHICLE ENTRY
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
    const cleanPlate =
      normalizePlate(plate)

    const cleanPlateComp =
      cleanPlate.replace(
        /[^A-Z0-9]/g,
        ''
      )


    if (
      !cleanPlate ||
      cleanPlateComp.length < 4
    ) {
      return {
        success: false,
        message:
          'Please enter a valid vehicle license plate number.'
      }
    }


    // Find registered vehicle
    const registered =
      registeredVehicles.find((vehicle) => {
        if (!vehicle.vehicleNumber) {
          return false
        }

        return (
          normalizePlate(
            vehicle.vehicleNumber
          ).replace(
            /[^A-Z0-9]/g,
            ''
          ) === cleanPlateComp
        )
      })


    if (!registered) {
      return {
        success: false,
        message:
          `Vehicle ${cleanPlate} is not registered in the campus directory. Please register the student vehicle first.`
      }
    }


    // Prevent double entry
    const alreadyParked =
      slots.find((slot) => {
        if (
          slot.status !== 'occupied' ||
          !slot.plate
        ) {
          return false
        }

        return (
          normalizePlate(
            slot.plate
          ).replace(
            /[^A-Z0-9]/g,
            ''
          ) === cleanPlateComp
        )
      })


    if (alreadyParked) {
      return {
        success: false,
        message:
          `Vehicle ${cleanPlate} is already parked in Bay ${alreadyParked.id} (${alreadyParked.floor}). Exit vehicle first.`
      }
    }


    const vehicleType =
      (
        registered.vehicleType ||
        type ||
        'scooty'
      ).toLowerCase()


    const targetFloor =
      preferredFloor ||
      getFloorForVehicleType(
        vehicleType
      )


    const studentOwner =
      registered.studentName ||
      owner ||
      'Student Member'


    const studentRoll =
      registered.rollNumber ||
      rollNumber ||
      ''


    const studentStream =
      registered.stream ||
      stream ||
      ''


    const studentPhone =
      registered.phoneNumber ||
      phoneNumber ||
      ''


    const studentCategory =
      registered.category ||
      'Student'


    try {
      const nowTs = Date.now()


      const nowTime =
        new Date().toLocaleTimeString(
          [],
          {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
          }
        )


      // Allocate bay
      const allocatedSlot =
        await allocateDynamicSlot({
          plate: cleanPlate,

          owner: studentOwner,

          rollNumber: studentRoll,

          stream: studentStream,

          phoneNumber: studentPhone,

          category: studentCategory,

          type: vehicleType,

          preferredFloor: targetFloor,

          passType:
            qrToken
              ? 'QR Permit Pass'
              : 'Gate Allocated',

          entryTime: nowTime,

          entryTimestamp: nowTs
        })


      // Create active parking session
      try {
        await createParkingSession({
          slotId:
            allocatedSlot.slotId,

          floor:
            allocatedSlot.floor,

          vehicleId:
            registered.id || '',

          studentId:
            registered.studentId ||
            registered.id,

          vehicleNumber:
            cleanPlate,

          studentName:
            studentOwner,

          rollNumber:
            studentRoll,

          stream:
            studentStream,

          phoneNumber:
            studentPhone,

          vehicleType,

          entryTime:
            nowTime,

          entryTimestamp:
            nowTs,

          passType:
            qrToken
              ? 'QR Permit Pass'
              : 'Gate Allocated',

          category:
            studentCategory
        })
      } catch (sessionErr) {
        console.error(
          '[App] Session creation failed:',
          sessionErr
        )

        await releaseSlot(
          allocatedSlot.slotId
        )

        return {
          success: false,
          message:
            'Failed to create active parking session. Bay allocation was rolled back.'
        }
      }


      const passData = {
        passId:
          `SOC-${allocatedSlot.slotId.replace(
            /[^a-zA-Z0-9]/g,
            ''
          )}-${Date.now().toString().slice(-4)}`,

        slotId:
          allocatedSlot.slotId,

        plate:
          cleanPlate,

        owner:
          studentOwner,

        rollNumber:
          studentRoll,

        stream:
          studentStream,

        category:
          studentCategory,

        floor:
          allocatedSlot.floor,

        section:
          allocatedSlot.section ||
          `${allocatedSlot.floor} Parking Area`,

        zone:
          `${allocatedSlot.floor} - ${allocatedSlot.section ||
          'General'
          }`,

        passType:
          qrToken
            ? 'QR Permit Pass'
            : 'Gate Allocated',

        entryTime:
          nowTime
      }


      showToast(
        'Vehicle Admitted',
        `${cleanPlate} (${studentOwner}) dynamically allocated to Bay ${allocatedSlot.slotId} (${allocatedSlot.floor}).`,
        'success'
      )


      return {
        success: true,
        slotId:
          allocatedSlot.slotId,
        floor:
          allocatedSlot.floor,
        passData
      }
    } catch (err) {
      console.error(
        '[App] Vehicle entry:',
        err
      )

      return {
        success: false,
        message:
          err.message ||
          'Could not allocate parking bay on designated floor.'
      }
    }
  }


  // ==========================================
  // PAYMENT SUCCESS
  // ==========================================

  const handlePaymentSuccess =
    async () => {
      if (!paymentPendingData) {
        return
      }


      const {
        _slotMutation,
        _confirmation
      } = paymentPendingData


      const {
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
      } = _slotMutation


      try {
        await allocateSlot({
          slotId,

          plate:
            vehicleNumber.toUpperCase(),

          owner:
            ownerName ||
            'Campus Member',

          rollNumber:
            rollNumber || '',

          stream:
            stream || '',

          phoneNumber:
            phoneNumber || '',

          category:
            category || 'Student',

          type:
            vehicleType || 'scooty',

          passType:
            passType || 'Hourly Slot',

          reservedUntil:
            reservedUntil || null,

          entryTime:
            nowTime,

          entryTimestamp:
            nowTimestamp
        })


        await createParkingSession({
          slotId,

          floor:
            _confirmation.floor,

          vehicleNumber:
            vehicleNumber.toUpperCase(),

          studentName:
            ownerName ||
            'Campus Member',

          rollNumber:
            rollNumber || '',

          stream:
            stream || '',

          vehicleType:
            vehicleType || 'scooty',

          passType:
            passType || 'Hourly Slot',

          entryTime:
            nowTime,

          entryTimestamp:
            nowTimestamp
        })
      } catch (err) {
        console.warn(
          '[Payment] Slot sync:',
          err.message
        )
      }


      setPaymentPendingData(null)

      setConfirmationData(
        _confirmation
      )


      showToast(
        'Payment Confirmed',
        '₹10 parking fee received. Slot reserved! 🎉',
        'success'
      )
    }


  // ==========================================
  // VEHICLE EXIT / CHECKOUT
  // ==========================================

  const handleReleaseSlot = async (
    slotId,
    vehicleNumber = null
  ) => {
    const currentGuardUid =
      auth.currentUser?.uid ||
      user?.uid ||
      ''


    try {
      const result =
        await verifyAndCompleteGateExit({
          slotId,

          scannedPlate:
            vehicleNumber,

          guardUid:
            currentGuardUid
        })


      if (result?.approved) {
        showToast(
          'Vehicle Checked Out',
          `Vehicle ${result.vehicleNumber} checked out from Bay ${result.slotId} (${result.duration}). Bay is now available.`,
          'success'
        )

        return result
      }


      showToast(
        'Checkout Denied',
        result?.message ||
        result?.reason ||
        'Vehicle checkout was denied.',
        'error'
      )

      throw new Error(
        result?.message ||
        result?.reason ||
        'Vehicle checkout was denied.'
      )
    } catch (err) {
      console.error(
        '[App] Slot checkout:',
        err
      )

      showToast(
        'Checkout Failed',
        err.message ||
        'Could not process vehicle checkout.',
        'error'
      )

      throw err
    }
  }


  // ==========================================
  // AUTH LOADING SCREEN
  // ==========================================

  if (authLoading) {
    return (
      <div
        className="login-container"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <div
          className="brand-badge"
          style={{
            width: '64px',
            height: '64px',
            marginBottom: '20px'
          }}
        >
          <span
            className="brand-logo-text"
            style={{
              fontSize: '32px'
            }}
          >
            P
          </span>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            color: '#94a3b8',
            fontSize: '15px'
          }}
        >
          <div
            style={{
              width: '22px',
              height: '22px',
              border:
                '2px solid rgba(56, 189, 248, 0.2)',
              borderTopColor:
                '#38bdf8',
              borderRadius: '50%',
              animation:
                'spin 0.8s linear infinite'
            }}
          />

          <span>
            Verifying session...
          </span>
        </div>

        <style>
          {`
            @keyframes spin {
              to {
                transform: rotate(360deg);
              }
            }
          `}
        </style>
      </div>
    )
  }


  // ==========================================
  // PAYMENT RETURN PAGES
  // ==========================================

  const currentPath =
    window.location.pathname

  const isPaymentSuccess =
    currentPath.includes(
      'payment-success'
    ) ||
    window.location.search.includes(
      'session_id'
    )


  const isPaymentCancel =
    currentPath.includes(
      'payment-cancel'
    )


  if (isPaymentSuccess) {
    return <PaymentSuccessPage />
  }


  if (isPaymentCancel) {
    return <PaymentCancelPage />
  }


  // ==========================================
  // LOGIN
  // ==========================================

  if (!user) {
    return (
      <Login
        onDemoLogin={
          handleDemoLogin
        }
      />
    )
  }


  // ==========================================
  // ONE-TIME INTRO
  // ==========================================

  if (showIntro) {
    return (
      <IntroSplashScreen
        onComplete={() => {
          try {
            sessionStorage.setItem(
              'soc_intro_played',
              'true'
            )
          } catch {
            // Ignore session storage errors
          }

          setShowIntro(false)
        }}
      />
    )
  }


  // ==========================================
  // MAIN APPLICATION
  // ==========================================

  const isAdmin =
    userProfile?.role ===
    'Security Admin' ||
    userProfile?.role ===
    'Admin'


  const isHomeActive =
    activeTab === 'home' ||
    activeTab === 'dashboard' ||
    (
      isAdmin &&
      activeTab ===
      'admin-dashboard'
    ) ||
    (
      !isAdmin &&
      activeTab ===
      'student-dashboard'
    )


  return (
    <div className="app-root">

      <SubtleAppBackground />


      {/* NAVBAR */}

      <Navbar
        user={user}
        userProfile={userProfile}
        onLogout={handleLogout}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />


      {/* MAIN CONTENT */}

      <main className="main-viewport">

        <div
          key={activeTab}
          className="page-view-container page-enter-animation"
        >

          {/* ======================================
              ADMIN SIDE
          ====================================== */}

          {isAdmin && (
            <>

              {/* ADMIN DASHBOARD */}

              {isHomeActive && (
                <AdminDashboardView
                  user={user}
                  userProfile={
                    userProfile
                  }
                  slots={slots}
                  onNavigateTab={
                    setActiveTab
                  }
                  onReleaseSlot={
                    handleReleaseSlot
                  }
                />
              )}


              {/* PARKING MAP */}

              {activeTab === 'map' && (
                <ParkingLotMap
                  slots={slots}
                  selectedSlotId={
                    selectedSlot?.id
                  }
                  currentUserId={
                    user?.uid
                  }
                  isAdmin={
                    Boolean(isAdmin)
                  }

                  onSelectSlot={(
                    slot
                  ) => {
                    if (
                      slot.status ===
                      'available'
                    ) {
                      return
                    }


                    if (
                      slot.status ===
                      'reserved' ||
                      slot.status ===
                      'occupied'
                    ) {
                      const isOwner =
                        Boolean(
                          user?.uid &&
                          (
                            slot.reservedBy ===
                            user.uid ||
                            slot.userId ===
                            user.uid ||
                            slot.studentId ===
                            user.uid
                          )
                        )


                      if (
                        isAdmin ||
                        isOwner
                      ) {
                        const plate =
                          slot.plate ||
                          ''


                        setActivePass({
                          passId:
                            slot.passId ||
                            `SOC-${slot.id.replace(
                              /[^a-zA-Z0-9]/g,
                              ''
                            )}`,

                          slotId:
                            slot.id,

                          plate,

                          owner:
                            slot.owner,

                          category:
                            slot.category,

                          reservedUntil:
                            slot.reservedUntil ||
                            'Active Session',

                          floor:
                            slot.floor,

                          section:
                            slot.section,

                          zone:
                            `${slot.floor} - ${slot.section}`,

                          passType:
                            slot.passType ||
                            'Parking Bay Pass'
                        })
                      }
                    }
                  }}

                  onReleaseSlot={
                    handleReleaseSlot
                  }
                />
              )}


              {/* REGISTRATION */}

              {activeTab ===
                'register' && (
                  <RegistrationPage
                    slots={slots}
                    registeredVehicles={
                      registeredVehicles
                    }
                    showToast={
                      showToast
                    }
                  />
                )}


              {/* VEHICLE ENTRY */}

              {activeTab ===
                'vehicle-entry' && (
                  <VehicleEntryView
                    slots={slots}
                    registeredVehicles={
                      registeredVehicles
                    }
                    onVehicleEntry={
                      handleVehicleEntry
                    }
                    onShowPass={(
                      pass
                    ) =>
                      setActivePass(
                        pass
                      )
                    }
                  />
                )}


              {/* REPORTS / HISTORY */}

              {activeTab ===
                'reports-history' && (
                  <ParkingHistoryView
                    history={
                      parkingHistory
                    }
                  />
                )}


              {/* WRONG PARKING */}

              {activeTab ===
                'wrong-parking' && (
                  <WrongParkingView
                    slots={slots}
                    onReleaseSlot={
                      handleReleaseSlot
                    }
                    showToast={
                      showToast
                    }
                  />
                )}


              {/* QR GATE SCANNER */}

              {activeTab ===
                'gate-scanner' && (
                  <GatePermitScannerView
                    showToast={
                      showToast
                    }
                    registeredVehicles={
                      registeredVehicles
                    }
                    slots={slots}
                    user={user}
                    userProfile={
                      userProfile
                    }
                  />
                )}

            </>
          )}


          {/* ======================================
              STUDENT SIDE
          ====================================== */}

          {!isAdmin && (
            <>

              {/* STUDENT DASHBOARD */}

              {isHomeActive && (
                <StudentDashboardView
                  user={user}
                  userProfile={
                    userProfile
                  }
                  slots={slots}
                  activePermit={
                    activePermit
                  }
                  activeReservation={
                    activeReservation
                  }
                  onNavigateTab={
                    setActiveTab
                  }
                  onOpenBooking={(
                    slot
                  ) =>
                    handleOpenBookingModal(
                      slot
                    )
                  }
                  onViewPass={(
                    pass
                  ) =>
                    setActivePass(
                      pass
                    )
                  }
                  onCancelReservation={
                    handleCancelReservation
                  }
                  onCancelPermit={(
                    permit
                  ) => {
                    if (
                      window.confirm(
                        `Cancel ${permit?.permitType || ''} permit for ${permit?.vehiclePlate || 'this vehicle'}? This cannot be undone.`
                      )
                    ) {
                      setActivePermit(
                        null
                      )

                      localStorage.removeItem(
                        'student_active_permit'
                      )

                      showToast(
                        'Permit Cancelled',
                        'Your permit has been removed.',
                        'info'
                      )
                    }
                  }}
                />
              )}


              {/* AVAILABLE PARKING */}

              {activeTab === 'student-available-parking' && (
                <div>
                  {/* View Mode Toggle: Campus Master Layout vs Quick Grid */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '14px',
                      padding: '8px 14px',
                      background: 'rgba(15, 23, 42, 0.65)',
                      border: '1px solid rgba(51, 65, 85, 0.6)',
                      borderRadius: '12px'
                    }}
                  >
                    <span style={{ fontSize: '13px', color: '#94a3b8' }}>
                      Parking View: <strong style={{ color: '#f1f5f9' }}>{studentParkingViewMode === 'campus' ? 'Campus Master Blueprint' : 'Quick Bay Grid'}</strong>
                    </span>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        type="button"
                        className={`btn btn-xs ${studentParkingViewMode === 'campus' ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setStudentParkingViewMode('campus')}
                      >
                        🗺️ Campus Blueprint
                      </button>
                      <button
                        type="button"
                        className={`btn btn-xs ${studentParkingViewMode === 'grid' ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setStudentParkingViewMode('grid')}
                      >
                        ⚡ Quick Bay Grid
                      </button>
                    </div>
                  </div>

                  {studentParkingViewMode === 'campus' ? (
                    <CampusParkingDashboard
                      slots={slots}
                      userProfile={userProfile}
                      onOpenBooking={(slot, type) =>
                        handleOpenBookingModal(slot, type || 'slot')
                      }
                    />
                  ) : (
                    <StudentAvailableParkingView
                      slots={slots}
                      userProfile={userProfile}
                      onOpenBooking={(slot, type) =>
                        handleOpenBookingModal(slot, type || 'slot')
                      }
                    />
                  )}
                </div>
              )}


              {/* MY VEHICLE */}

              {activeTab ===
                'student-my-vehicle' && (
                  <StudentMyVehicleView
                    user={user}
                    userProfile={
                      userProfile
                    }
                    onUpdateProfile={
                      handleUpdateProfile
                    }
                    onViewPass={(
                      pass
                    ) =>
                      setActivePass(
                        pass
                      )
                    }
                  />
                )}


              {/* MY PARKING STATUS */}

              {activeTab ===
                'student-my-status' && (
                  <StudentMyStatusView
                    user={user}
                    userProfile={
                      userProfile
                    }
                    slots={slots}
                    activePermit={
                      activePermit
                    }
                    activeReservation={
                      activeReservation
                    }
                    onOpenBooking={(
                      slot
                    ) =>
                      handleOpenBookingModal(
                        slot
                      )
                    }
                    onViewPass={(
                      pass
                    ) =>
                      setActivePass(
                        pass
                      )
                    }
                    onNavigateTab={
                      setActiveTab
                    }
                    onCancelReservation={
                      handleCancelReservation
                    }
                  />
                )}


              {/* MY HISTORY */}

              {activeTab ===
                'student-my-history' && (
                  <StudentMyHistoryView
                    user={user}
                    userProfile={
                      userProfile
                    }
                    history={
                      parkingHistory
                    }
                  />
                )}

            </>
          )}

        </div>
      </main>


      {/* ======================================
          BOOKING MODAL
      ====================================== */}

      <SlotBookingModal
        isOpen={
          isBookingOpen
        }

        onClose={() => {
          setIsBookingOpen(false)
          setSelectedSlot(null)
        }}

        selectedSlot={
          selectedSlot
        }

        availableSlots={
          slots.filter(
            (slot) =>
              slot.status ===
              'available'
          )
        }

        registeredVehicles={
          registeredVehicles
        }

        onActivatePass={
          handleActivatePass
        }

        onPermitActivated={(
          permit
        ) => {
          setActivePermit(
            permit
          )

          setActivePass(
            permit
          )

          showToast(
            'Permit Activated',
            `${permit.permitType} Permit activated with real QR! 🎉`,
            'success'
          )
        }}

        user={user}

        userProfile={
          userProfile
        }

        isSlotsInitialized={
          isSlotsInitialized
        }
      />


      {/* PAYMENT */}

      <PaymentModal
        bookingData={
          paymentPendingData
        }

        onPaymentSuccess={
          handlePaymentSuccess
        }

        onClose={() =>
          setPaymentPendingData(
            null
          )
        }
      />


      {/* CONFIRMATION */}

      <ConfirmationModal
        confirmation={
          confirmationData
        }

        onViewReservation={() => {
          const pass =
            confirmationData?.passData

          setConfirmationData(
            null
          )

          if (pass) {
            setActivePass(
              pass
            )
          }
        }}

        onClose={() =>
          setConfirmationData(
            null
          )
        }
      />


      {/* PARKING PASS */}
      {activePass && (
        <PassModal
          pass={activePass}
          onClose={() =>
            setActivePass(null)
          }
        />
      )}


      {/* TOAST */}

      <NotificationToast
        toast={toast}
        onDismiss={() =>
          setToast(null)
        }
      />


      {/* FOOTER */}

      <footer className="site-footer">
        <div className="footer-inner">

          <span>
            SOCMAC Smart Park
            &bull; Ground Floor (Scooties)
            &amp; Basement (Bikes)
          </span>

          <span className="footer-status-pill">
            160 Total Bays Monitored
          </span>

        </div>
      </footer>

    </div>
  )
}