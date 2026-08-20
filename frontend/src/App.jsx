import { useState, useCallback, useEffect } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from './firebase/firebase'
import { logout, getUserProfile } from './firebase/auth'
import Login from './pages/Login'
import { INITIAL_SLOTS, INITIAL_LOGS } from './data/initialSlots'
import Navbar from './components/Navbar'
import StatsOverview from './components/StatsOverview'
import ParkingLotMap from './components/ParkingLotMap'
import SlotBookingModal from './components/SlotBookingModal'
import GateSimulator from './components/GateSimulator'
import LiveVehicleLog from './components/LiveVehicleLog'
import PassModal from './components/PassModal'
import NotificationToast from './components/NotificationToast'
import './App.css'

function App() {
  const [user, setUser] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)

  const [slots, setSlots] = useState(INITIAL_SLOTS)
  const [logs, setLogs] = useState(INITIAL_LOGS)
  const [activeTab, setActiveTab] = useState('map') // 'map' | 'gate' | 'logs'
  const [selectedZone, setSelectedZone] = useState('All Zones')
  const [filterStatus, setFilterStatus] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [currentRole, setCurrentRole] = useState('Student')

  // Modals state
  const [isBookingOpen, setIsBookingOpen] = useState(false)
  const [bookingSlotTarget, setBookingSlotTarget] = useState(null)
  const [activePass, setActivePass] = useState(null)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser)
      if (currentUser) {
        try {
          const profile = await getUserProfile(currentUser.uid)
          if (profile) {
            setUserProfile(profile)
            if (profile.role) {
              setCurrentRole(profile.role)
            }
          }
        } catch (e) {
          console.warn('Could not sync user profile:', e)
        }
      }
      setAuthLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const showToast = useCallback((title, message, type = 'success') => {
    setToast({ title, message, type })
  }, [])

  const handleLogout = async () => {
    try {
      await logout()
      setUserProfile(null)
      showToast('Logged Out', 'Signed out successfully.', 'info')
    } catch (err) {
      console.error('Logout error:', err)
      showToast('Logout Error', 'Unable to sign out. Please try again.', 'error')
    }
  }

  // Handle Slot Booking Reservation
  const handleConfirmBooking = (bookingData) => {
    const { slotId, vehicleNumber, ownerName, category, vehicleType, reservedUntil } = bookingData

    setSlots((prev) =>
      prev.map((slot) => {
        if (slot.id === slotId) {
          return {
            ...slot,
            status: 'reserved',
            plate: vehicleNumber,
            owner: ownerName,
            category: category,
            type: vehicleType,
            reservedUntil: reservedUntil,
          }
        }
        return slot
      })
    )

    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    const newLog = {
      id: `LOG-${Date.now().toString().slice(-4)}`,
      timestamp: nowTime,
      action: 'RESERVED',
      plate: vehicleNumber,
      slot: slotId,
      category: category,
      vehicleType: vehicleType,
      gate: 'App Portal'
    }
    setLogs((prev) => [newLog, ...prev])

    // Open pass modal
    setActivePass({
      passId: `SMP-${Math.floor(100000 + Math.random() * 900000)}`,
      slotId,
      plate: vehicleNumber,
      owner: ownerName,
      category,
      reservedUntil,
      zone: slots.find(s => s.id === slotId)?.zone
    })

    showToast('Booking Confirmed', `Slot ${slotId} reserved for ${vehicleNumber}.`, 'success')
  }

  // Handle Manual Release / Checkout
  const handleReleaseSlot = (slotId) => {
    const target = slots.find((s) => s.id === slotId)
    if (!target) return

    setSlots((prev) =>
      prev.map((s) =>
        s.id === slotId
          ? { ...s, status: 'available', plate: '', owner: '', category: '', reservedUntil: null, entryTime: null }
          : s
      )
    )

    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    const newLog = {
      id: `LOG-${Date.now().toString().slice(-4)}`,
      timestamp: nowTime,
      action: 'EXIT',
      plate: target.plate || 'N/A',
      slot: slotId,
      duration: 'Released',
      fee: 'Free',
      gate: 'Admin Action'
    }
    setLogs((prev) => [newLog, ...prev])

    showToast('Slot Cleared', `Slot ${slotId} is now available.`, 'info')
  }

  // Handle Gate Entry
  const handleVehicleEntry = ({ plate, owner, type, category }) => {
    let targetSlot = slots.find((s) => s.status === 'reserved' && s.plate.toLowerCase() === plate.toLowerCase())

    if (!targetSlot) {
      targetSlot = slots.find((s) => s.status === 'available' && (type === 'car' ? (s.type === 'car') : s.type === type))
    }

    if (!targetSlot) {
      return { success: false, message: `No available slots found for vehicle type ${type.toUpperCase()}.` }
    }

    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

    setSlots((prev) =>
      prev.map((s) =>
        s.id === targetSlot.id
          ? {
            ...s,
            status: 'occupied',
            plate: plate,
            owner: owner || s.owner || 'Campus Member',
            category: category || s.category || 'Student',
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
      plate: plate,
      slot: targetSlot.id,
      category: category || 'Student',
      vehicleType: type,
      gate: 'Main Gate'
    }
    setLogs((prev) => [newLog, ...prev])

    showToast('Vehicle Admitted', `${plate} assigned to Slot ${targetSlot.id}`, 'success')

    return {
      success: true,
      slotId: targetSlot.id,
      zone: targetSlot.zone
    }
  }

  // Handle Gate Exit
  const handleVehicleExit = (plate) => {
    const targetSlot = slots.find((s) => s.plate.toLowerCase() === plate.toLowerCase() && s.status !== 'available')

    if (!targetSlot) {
      return { success: false, message: `No parked vehicle found with license plate ${plate}.` }
    }

    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

    setSlots((prev) =>
      prev.map((s) =>
        s.id === targetSlot.id
          ? { ...s, status: 'available', plate: '', owner: '', category: '', reservedUntil: null, entryTime: null }
          : s
      )
    )

    const newLog = {
      id: `LOG-${Date.now().toString().slice(-4)}`,
      timestamp: nowTime,
      action: 'EXIT',
      plate: plate,
      slot: targetSlot.id,
      duration: '1h 15m',
      fee: 'Free',
      gate: 'Exit Gate'
    }
    setLogs((prev) => [newLog, ...prev])

    showToast('Vehicle Exited', `${plate} checked out. Slot ${targetSlot.id} is free.`, 'info')

    return {
      success: true,
      slotId: targetSlot.id,
      duration: '1h 15m'
    }
  }

  const availableSlots = slots.filter((s) => s.status === 'available')

  if (authLoading) {
    return (
      <div className="login-page">
        <div className="login-card">
          <div className="login-logo">
            <span className="login-logo-icon">P</span>
          </div>
          <h1>SmartPark.Campus</h1>
          <p className="login-subtitle">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Login />
  }

  return (
    <div className="app-layout">
      {/* Clean Navbar */}
      <Navbar
        user={user}
        userProfile={userProfile}
        onLogout={handleLogout}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentRole={currentRole}
      />

      {/* Main Content Area */}
      <main className="main-content">
        {/* Simple 3-Card KPI Stats */}
        <StatsOverview slots={slots} />

        {/* Tab View */}
        <section className="tab-body">
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
                  setIsBookingOpen(true)
                } else if (slot.plate) {
                  setActivePass({
                    passId: `SMP-${slot.id.replace('-', '')}`,
                    slotId: slot.id,
                    plate: slot.plate,
                    owner: slot.owner,
                    category: slot.category,
                    reservedUntil: slot.reservedUntil || 'Active Session',
                    zone: slot.zone
                  })
                }
              }}
              onOpenBooking={(slot) => {
                setBookingSlotTarget(slot)
                setIsBookingOpen(true)
              }}
              onReleaseSlot={handleReleaseSlot}
              currentRole={currentRole}
            />
          )}

          {activeTab === 'gate' && (
            <GateSimulator
              slots={slots}
              onVehicleEntry={handleVehicleEntry}
              onVehicleExit={handleVehicleExit}
              onShowPass={(passData) => setActivePass(passData)}
            />
          )}

          {activeTab === 'logs' && (
            <LiveVehicleLog logs={logs} />
          )}
        </section>
      </main>

      {/* Booking & Pass Modals */}
      <SlotBookingModal
        isOpen={isBookingOpen}
        onClose={() => {
          setIsBookingOpen(false)
          setBookingSlotTarget(null)
        }}
        initialSlot={bookingSlotTarget}
        availableSlots={availableSlots}
        onConfirmBooking={handleConfirmBooking}
        currentRole={currentRole}
        user={user}
        userProfile={userProfile}
      />

      <PassModal
        pass={activePass}
        onClose={() => setActivePass(null)}
      />

      <NotificationToast
        toast={toast}
        onDismiss={() => setToast(null)}
      />

      {/* Clean Footer */}
      <footer className="app-footer">
        <div className="footer-content">
          <span>Smart College Parking System &bull; Clean &amp; Real-Time</span>
        </div>
      </footer>
    </div>
  )
}

export default App
