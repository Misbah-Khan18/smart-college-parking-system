import { useState, useCallback, useEffect } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from './firebase/firebase'
import { logout } from './firebase/auth'
import Login from './pages/Login'
import { INITIAL_SLOTS, INITIAL_LOGS } from './data/initialSlots'
import Navbar from './components/Navbar'
import StatsOverview from './components/StatsOverview'
import ParkingLotMap from './components/ParkingLotMap'
import SlotBookingModal from './components/SlotBookingModal'
import GateSimulator from './components/GateSimulator'
import LiveVehicleLog from './components/LiveVehicleLog'
import AnalyticsView from './components/AnalyticsView'
import PassModal from './components/PassModal'
import NotificationToast from './components/NotificationToast'
import './App.css'

function App() {
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
      setAuthLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const [slots, setSlots] = useState(INITIAL_SLOTS)
  const [logs, setLogs] = useState(INITIAL_LOGS)
  const [activeTab, setActiveTab] = useState('map') // 'map' | 'gate' | 'analytics' | 'logs'
  const [selectedZone, setSelectedZone] = useState('All Zones')
  const [filterStatus, setFilterStatus] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [currentRole, setCurrentRole] = useState('Student')

  // Modals state
  const [isBookingOpen, setIsBookingOpen] = useState(false)
  const [bookingSlotTarget, setBookingSlotTarget] = useState(null)
  const [activePass, setActivePass] = useState(null)
  const [toast, setToast] = useState(null)

  // Notification logs
  const [notifications, setNotifications] = useState([
    { id: 1, type: 'info', title: 'System Online', message: 'Smart IoT Campus sensors connected and transmitting telemetry.', time: '09:00 AM' },
    { id: 2, type: 'warning', title: 'High Zone B Demand', message: 'Faculty parking bay B is at 80% capacity.', time: '09:15 AM' },
  ])
  const [unreadCount, setUnreadCount] = useState(2)

  const showToast = useCallback((title, message, type = 'success') => {
    setToast({ title, message, type })
  }, [])

  const handleLogout = async () => {
    try {
      await logout()
      showToast('Logged Out', 'You have been signed out successfully.', 'info')
    } catch (err) {
      console.error('Logout error:', err)
      showToast('Logout Error', 'Unable to sign out. Please try again.', 'error')
    }
  }

  const triggerTelemetryRefresh = () => {
    showToast('Telemetry Synchronized', 'All ultrasonic & RFID campus parking nodes re-calibrated successfully.', 'info')
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
      gate: 'Online App Portal'
    }
    setLogs((prev) => [newLog, ...prev])

    // Push notification
    const newNotif = {
      id: Date.now(),
      type: 'success',
      title: `Slot ${slotId} Reserved`,
      message: `Pass generated for ${vehicleNumber} (${ownerName}). Valid until ${reservedUntil}.`,
      time: nowTime
    }
    setNotifications((prev) => [newNotif, ...prev])
    setUnreadCount((c) => c + 1)

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

    showToast('Slot Reserved Successfully', `Assigned Slot: ${slotId}. Digital Pass is ready to scan.`, 'success')
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
      duration: 'Manual Release',
      fee: 'Free',
      gate: 'Admin Console'
    }
    setLogs((prev) => [newLog, ...prev])

    showToast('Slot Freed', `Slot ${slotId} is now available for other vehicles.`, 'info')
  }

  // Handle Automated Gate Inbound Entry
  const handleVehicleEntry = ({ plate, owner, type, category }) => {
    // Check if vehicle has an existing reservation
    let targetSlot = slots.find((s) => s.status === 'reserved' && s.plate.toLowerCase() === plate.toLowerCase())

    // If no reservation, find next available matching slot
    if (!targetSlot) {
      targetSlot = slots.find((s) => s.status === 'available' && (type === 'car' ? (s.type === 'car') : s.type === type))
    }

    if (!targetSlot) {
      return { success: false, message: `No available parking bay found for ${type.toUpperCase()} type.` }
    }

    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

    setSlots((prev) =>
      prev.map((s) =>
        s.id === targetSlot.id
          ? {
            ...s,
            status: 'occupied',
            plate: plate,
            owner: owner || s.owner || 'Campus User',
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
      gate: 'Main Gate 1 (ANPR)'
    }
    setLogs((prev) => [newLog, ...prev])

    showToast('Vehicle Admitted', `${plate} assigned to Slot ${targetSlot.id} (${targetSlot.zone})`, 'success')

    return {
      success: true,
      slotId: targetSlot.id,
      zone: targetSlot.zone
    }
  }

  // Handle Automated Gate Outbound Exit
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
      duration: '1h 25m',
      fee: 'Free (Campus Permit)',
      gate: 'Exit Barrier (ANPR)'
    }
    setLogs((prev) => [newLog, ...prev])

    showToast('Vehicle Checked Out', `${plate} cleared Slot ${targetSlot.id}. Barrier opened.`, 'info')

    return {
      success: true,
      slotId: targetSlot.id,
      duration: '1h 25m'
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

          <p className="login-subtitle">
            Loading secure access...
          </p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Login />
  }

  return (
    <div className="app-layout">

      {/* Top Navigation */}
      <Navbar
        user={user}
        onLogout={handleLogout}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentRole={currentRole}
        setCurrentRole={setCurrentRole}
        notifications={notifications}
        unreadCount={unreadCount}
        onRefresh={triggerTelemetryRefresh}
      />

      {/* Main Container */}
      <main className="main-content">
        {/* Real-time KPI Stats Banner */}
        <StatsOverview slots={slots} />

        {/* Tab Content */}
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

          {activeTab === 'analytics' && (
            <AnalyticsView slots={slots} />
          )}

          {activeTab === 'logs' && (
            <LiveVehicleLog logs={logs} />
          )}
        </section>
      </main>

      {/* Modals & Floating Alerts */}
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
      />


      <PassModal
        pass={activePass}
        onClose={() => setActivePass(null)}
      />

      <NotificationToast
        toast={toast}
        onDismiss={() => setToast(null)}
      />

      {/* Footer */}
      <footer className="app-footer">
        <div className="footer-content">
          <span>Smart College Parking System &bull; IoT Telemetry & ANPR Gate Automation</span>
          <span className="footer-tag">Department of Computer Science &amp; Engineering &bull; Mini Project</span>
        </div>
      </footer>
    </div>
  )
}

export default App
