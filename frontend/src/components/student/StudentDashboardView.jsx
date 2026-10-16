import { useState, useMemo, useEffect } from 'react'
import {
  CheckIcon,
  ShieldIcon,
  PlusCircleIcon,
  LogOutIcon,
  XIcon
} from '../Icons'

export default function StudentDashboardView({
  user,
  userProfile,
  slots = [],
  activeSessions = [],
  activePermit,
  activeReservation,
  onViewPass,
  onNavigateTab,
  onOpenBooking,
  onCancelPermit,
  onCancelReservation,
  onEndParkingSession,
  showToast
}) {
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [isEndingParking, setIsEndingParking] = useState(false)


  const displayName = userProfile?.displayName || user?.displayName || 'Alzuni Shaikh'
  const firstName = displayName.split(' ')[0] || 'Alzuni'
  const vehiclePlate = userProfile?.defaultPlate || userProfile?.vehicleNumber || 'MH-12-AB-1234'

  // Find student's active parking session strictly for the logged-in student
  const userActiveSession = useMemo(() => {
    const currentUid = user?.uid || userProfile?.uid || ''
    const myRoll = (userProfile?.campusId || userProfile?.rollNumber || '').toUpperCase().trim()
    const myPlate = (userProfile?.defaultPlate || userProfile?.vehicleNumber || userProfile?.vehiclePlate || '').replace(/[^A-Z0-9]/g, '').toUpperCase()

    // 1. First look in live activeSessions
    const foundInSessions = (activeSessions || []).find((s) => {
      if (s.status && s.status !== 'active') return false
      const sUid = s.studentId || s.userId || ''
      if (currentUid && sUid && sUid === currentUid) return true
      const sRoll = (s.rollNumber || '').toUpperCase().trim()
      if (myRoll && sRoll && sRoll === myRoll) return true
      const sPlate = (s.vehicleNumber || s.plate || '').replace(/[^A-Z0-9]/g, '').toUpperCase()
      if (myPlate && sPlate && sPlate === myPlate) return true
      return false
    })

    if (foundInSessions) {
      const slotInfo = slots.find((sl) => sl.id === foundInSessions.slotId)
      return {
        ...slotInfo,
        ...foundInSessions,
        slotId: foundInSessions.slotId,
        vehicleNumber: foundInSessions.vehicleNumber || slotInfo?.plate || vehiclePlate,
        floor: foundInSessions.floor || slotInfo?.floor || (foundInSessions.slotId?.startsWith('G') ? 'Ground Floor' : 'Basement'),
        entryTime: foundInSessions.entryTime || slotInfo?.entryTime || 'Active Session',
        entryTimestamp: foundInSessions.entryTimestamp || slotInfo?.entryTimestamp || 0
      }
    }

    // 2. Fallback: If slot is occupied by this user in live slots
    const foundInSlots = (slots || []).find((sl) => {
      if (sl.status !== 'occupied' && sl.status !== 'OCCUPIED') return false
      const slUid = sl.userId || sl.studentId || sl.reservedBy || ''
      if (currentUid && slUid && slUid === currentUid) return true
      const slRoll = (sl.rollNumber || '').toUpperCase().trim()
      if (myRoll && slRoll && slRoll === myRoll) return true
      const slPlate = (sl.plate || '').replace(/[^A-Z0-9]/g, '').toUpperCase()
      if (myPlate && slPlate && slPlate === myPlate) return true
      return false
    })

    if (foundInSlots) {
      return {
        ...foundInSlots,
        slotId: foundInSlots.id,
        vehicleNumber: foundInSlots.plate || vehiclePlate,
        floor: foundInSlots.floor || (foundInSlots.id?.startsWith('G') ? 'Ground Floor' : 'Basement'),
        entryTime: foundInSlots.entryTime || 'Active Session',
        entryTimestamp: foundInSlots.entryTimestamp || 0
      }
    }

    return null
  }, [activeSessions, slots, user, userProfile, vehiclePlate])

  // Find user's active reservation strictly by authenticated Firebase UID
  const userReservedSlot = useMemo(() => {
    // If vehicle is already parked in active session, reservation has transitioned
    if (userActiveSession) return null

    if (activeReservation) {
      const rawSlot = activeReservation.slotId || (activeReservation.id?.startsWith('RES-') ? activeReservation.id.split('-')[1] : activeReservation.id)
      const cleanId = rawSlot ? rawSlot.toUpperCase() : null
      const found = cleanId ? slots.find((s) => s.id?.toUpperCase() === cleanId) : null
      return {
        ...found,
        ...activeReservation,
        id: cleanId || activeReservation.id,
        slotId: cleanId || activeReservation.slotId
      }
    }
    return null
  }, [slots, activeReservation, userActiveSession])

  // Handle Confirmed Exit
  const handleConfirmExit = async () => {
    if (!userActiveSession || isEndingParking) return
    setIsEndingParking(true)
    try {
      if (onEndParkingSession) {
        await onEndParkingSession(userActiveSession)
      }
      setShowConfirmModal(false)
    } catch (err) {
      console.error('[StudentDashboardView] End parking error:', err)
    } finally {
      setIsEndingParking(false)
    }
  }

  // Dynamic Calculations from actual slot data (80 Ground scooty bays + 80 Basement bike bays = 160 total)
  const groundSlots = slots.filter((s) => s.floor === 'Ground Floor' || s.id?.startsWith('G-'))
  const basementSlots = slots.filter((s) => s.floor === 'Basement' || s.id?.startsWith('B-'))

  const groundTotal = groundSlots.length || 80
  const basementTotal = basementSlots.length || 80
  const totalSlots = slots.length || (groundTotal + basementTotal) || 160

  const groundOccupied = groundSlots.filter((s) => s.status === 'occupied' || s.status === 'OCCUPIED' || s.status === 'booked' || s.status === 'BOOKED').length
  const groundReserved = groundSlots.filter((s) => s.status === 'reserved' || s.status === 'RESERVED').length
  const groundAvailable = Math.max(0, groundTotal - groundOccupied - groundReserved)
  const groundPercent = Math.round((groundOccupied / groundTotal) * 100) || 0

  const basementOccupied = basementSlots.filter((s) => s.status === 'occupied' || s.status === 'OCCUPIED' || s.status === 'booked' || s.status === 'BOOKED').length
  const basementReserved = basementSlots.filter((s) => s.status === 'reserved' || s.status === 'RESERVED').length
  const basementAvailable = Math.max(0, basementTotal - basementOccupied - basementReserved)
  const basementPercent = Math.round((basementOccupied / basementTotal) * 100) || 0

  const occupiedSlots = groundOccupied + basementOccupied
  const reservedSlots = groundReserved + basementReserved
  const availableSlots = groundAvailable + basementAvailable

  return (
    <div className="student-dashboard-container">
      {/* Hero Banner */}
      <section className="student-hero-banner glass-card student-hero-clean">
        <div className="shb-content">
          <h1 className="soc-hero-title soc-brand-animated">
            <span className="soc-brand-text">SOCMAC</span>
            <span className="accent-dot">.</span>
            <span className="soc-brand-park">Smart Park</span>
          </h1>
          <p className="shb-greeting-sub">
            Welcome, <span className="gradient-text font-bold">{firstName}</span> 👋 &bull; Smart Two-Wheeler Campus Parking
          </p>
        </div>
      </section>

      {/* Active Parking Session Banner (When logged-in student's vehicle is parked) */}
      {userActiveSession ? (
        <div
          className="active-parking-card glass-card"
          style={{
            padding: '18px 22px',
            marginBottom: '16px',
            background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.88))',
            border: '1px solid rgba(16, 185, 129, 0.35)',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4), 0 0 16px rgba(16, 185, 129, 0.08)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '14px', borderBottom: '1px solid rgba(255, 255, 255, 0.07)', paddingBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="live-dot-pulse" style={{ background: '#10b981' }}></span>
              <strong style={{ fontSize: '13px', letterSpacing: '0.8px', color: '#f8fafc', textTransform: 'uppercase' }}>
                ACTIVE PARKING
              </strong>
            </div>
            <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '999px', background: 'rgba(16, 185, 129, 0.18)', color: '#34d399', fontWeight: 700, border: '1px solid rgba(16, 185, 129, 0.3)' }}>
              🟢 CURRENTLY PARKED
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '12px',
              fontSize: '13.5px',
              marginBottom: '16px'
            }}
          >
            <div>
              <span style={{ color: '#94a3b8', fontSize: '12px', display: 'block' }}>🚗 Vehicle:</span>
              <strong className="font-mono" style={{ color: '#f8fafc', fontSize: '14.5px' }}>{userActiveSession.vehicleNumber}</strong>
            </div>
            <div>
              <span style={{ color: '#94a3b8', fontSize: '12px', display: 'block' }}>📍 Parking Slot:</span>
              <strong className="font-mono text-cyan" style={{ fontSize: '15px' }}>{userActiveSession.slotId}</strong>
            </div>
            <div>
              <span style={{ color: '#94a3b8', fontSize: '12px', display: 'block' }}>🏢 Floor:</span>
              <strong style={{ color: '#e2e8f0' }}>{userActiveSession.floor}</strong>
            </div>
            <div>
              <span style={{ color: '#94a3b8', fontSize: '12px', display: 'block' }}>🕐 Entry Time:</span>
              <strong className="font-mono" style={{ color: '#e2e8f0' }}>{userActiveSession.entryTime}</strong>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-start', paddingTop: '4px' }}>
            <button
              type="button"
              id="btn-end-parking"
              className="btn btn-sm"
              style={{
                background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.18), rgba(185, 28, 28, 0.28))',
                border: '1px solid rgba(239, 68, 68, 0.45)',
                color: '#fecaca',
                padding: '9px 18px',
                fontWeight: 600,
                boxShadow: '0 2px 10px rgba(239, 68, 68, 0.15)'
              }}
              onClick={() => setShowConfirmModal(true)}
              disabled={isEndingParking}
            >
              <LogOutIcon className="w-4 h-4 mr-1.5 inline" />
              End Parking &amp; Release Slot
            </button>
          </div>
        </div>
      ) : userReservedSlot ? (
        <div className="glass-card" style={{
          padding: '18px 22px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '14px',
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.85))',
          border: '1px solid rgba(245, 158, 11, 0.4)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              background: 'rgba(245, 158, 11, 0.15)',
              border: '1px solid rgba(245, 158, 11, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '22px'
            }}>
              🅿️
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <strong style={{ fontSize: '17px', color: '#f8fafc' }}>
                  Bay {userReservedSlot.slotId || (userReservedSlot.id?.startsWith('RES-') ? userReservedSlot.id.split('-')[1] : userReservedSlot.id)} &bull; Reserved
                </strong>
                <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '999px', background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24', fontWeight: 700 }}>
                  🟡 ACTIVE RESERVATION
                </span>
              </div>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#cbd5e1' }}>
                Zone: <strong style={{ color: '#38bdf8' }}>{userReservedSlot.floor || 'Campus'} &bull; {userReservedSlot.section || 'Parking Area'}</strong> &bull; Plate: <span className="font-mono text-cyan">{userReservedSlot.plate || userReservedSlot.vehiclePlate || vehiclePlate}</span>
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => onViewPass && onViewPass({
                id: userReservedSlot.passId || `SOC-${userReservedSlot.slotId || userReservedSlot.id}`,
                slotId: userReservedSlot.slotId || userReservedSlot.id,
                plate: userReservedSlot.plate || userReservedSlot.vehiclePlate || vehiclePlate,
                owner: displayName,
                userName: displayName,
                floor: userReservedSlot.floor,
                section: userReservedSlot.section,
                zone: userReservedSlot.zone || `${userReservedSlot.floor} - ${userReservedSlot.section || 'General'}`,
                passType: userReservedSlot.passType || 'Parking Pass',
                permitType: userReservedSlot.passType || 'Parking Pass',
                status: 'ACTIVE',
                reservationStatus: 'Reserved',
                entryTime: userReservedSlot.entryTime || 'Active',
                validUntil: userReservedSlot.reservedUntil || 'Active Session',
                reservedUntil: userReservedSlot.reservedUntil || 'Active Session'
              })}
            >
              📱 Show Ingress Pass &amp; QR
            </button>
            <button
              type="button"
              className="btn btn-sm"
              style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)', color: '#fca5a5' }}
              onClick={() => {
                const targetSlot = userReservedSlot.slotId || (userReservedSlot.id?.startsWith('RES-') ? userReservedSlot.id.split('-')[1] : userReservedSlot.id)
                const targetResId = userReservedSlot.reservationId || (userReservedSlot.id?.startsWith('RES-') ? userReservedSlot.id : null)
                onCancelReservation && onCancelReservation({
                  ...userReservedSlot,
                  slotId: targetSlot,
                  id: targetSlot,
                  reservationId: targetResId
                })
              }}
              title="Release/Cancel reservation"
            >
              🗑️ Release Bay
            </button>
          </div>
        </div>
      ) : activePermit ? (
        <div className="glass-card" style={{ padding: '16px 20px', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px', background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9), rgba(30, 41, 59, 0.75))', border: '1px solid rgba(56, 189, 248, 0.25)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
              🎫
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <strong style={{ fontSize: '16px', color: '#f8fafc' }}>
                  {activePermit.permitType || 'Monthly'} Campus Permit
                </strong>
                <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '999px', background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', fontWeight: 700 }}>
                  ACTIVE &bull; PAID
                </span>
              </div>
              <p style={{ margin: '3px 0 0', fontSize: '12.5px', color: '#94a3b8' }}>
                Vehicle: <strong style={{ color: '#38bdf8', fontFamily: 'monospace' }}>{activePermit.vehiclePlate}</strong> &bull; Valid until: {new Date(activePermit.validUntil).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => onViewPass && onViewPass(activePermit)}
            >
              📱 Show Ingress QR Code
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => onOpenBooking && onOpenBooking(null, 'permit')}
            >
              🔄 Change / Renew
            </button>
            <button
              type="button"
              className="btn btn-sm"
              style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)', color: '#fca5a5' }}
              onClick={() => onCancelPermit && onCancelPermit(activePermit)}
              title="Cancel this permit"
            >
              🗑️ Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="quick-options-grid mb-4">
          <div className="quick-option-card glass-card">
            <div className="q-option-left">
              <div className="q-icon-box cyan">
                <span className="q-emoji">🎫</span>
              </div>
              <div className="q-info">
                <h4>Reserve Parking Slot</h4>
                <span className="text-muted">Select an available bay &amp; activate your pass</span>
              </div>
            </div>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => onNavigateTab && onNavigateTab('student-available-parking')}
            >
              <PlusCircleIcon className="w-4 h-4" />
              <span>Select Slot</span>
            </button>
          </div>

          <div className="quick-option-card glass-card">
            <div className="q-option-left">
              <div className="q-icon-box indigo">
                <span className="q-emoji">📍</span>
              </div>
              <div className="q-info">
                <h4>Dynamic Bay Telemetry</h4>
                <span className="text-muted">Nearest compatible bay assigned upon Gate Ingress</span>
              </div>
            </div>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => onNavigateTab && onNavigateTab('student-my-status')}
            >
              <ShieldIcon className="w-4 h-4" />
              <span>My Status</span>
            </button>
          </div>
        </div>
      )}


      {/* Telemetry Grid */}
      <div className="slots-telemetry-section">
        <div className="slots-telemetry-grid">
          <div className="telemetry-card available">
            <div className="tc-icon-wrap available">
              <CheckIcon className="w-5 h-5 text-emerald" />
            </div>
            <div className="tc-content">
              <span className="tc-label">Availed / Available</span>
              <div className="tc-val-row">
                <strong className="tc-value available">{availableSlots}</strong>
                <span className="tc-sub">Open Bays</span>
              </div>
            </div>
          </div>

          <div className="telemetry-card occupied">
            <div className="tc-icon-wrap occupied">
              <span>🛵</span>
            </div>
            <div className="tc-content">
              <span className="tc-label">Occupied Slots</span>
              <div className="tc-val-row">
                <strong className="tc-value occupied">{occupiedSlots}</strong>
                <span className="tc-sub">Parked</span>
              </div>
            </div>
          </div>

          <div className="telemetry-card reserved">
            <div className="tc-icon-wrap reserved">
              <span>🟡</span>
            </div>
            <div className="tc-content">
              <span className="tc-label">Reserved Slots</span>
              <div className="tc-val-row">
                <strong className="tc-value reserved">{reservedSlots}</strong>
                <span className="tc-sub">Pre-booked</span>
              </div>
            </div>
          </div>

          <div className="telemetry-card total">
            <div className="tc-icon-wrap total">
              <span>🅿️</span>
            </div>
            <div className="tc-content">
              <span className="tc-label">Total Bays</span>
              <div className="tc-val-row">
                <strong className="tc-value total">{totalSlots}</strong>
                <span className="tc-sub">160 Bays (G+B)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2 Floor Capacity Cards */}
      <div className="floor-capacity-grid two-cols">
        <div className="floor-card glass-card">
          <div className="floor-card-top">
            <div className="floor-header-title">
              <span className="floor-icon">🛵</span>
              <div>
                <h3>Ground Floor &bull; Scooties</h3>
                <span className="text-muted text-xs">80 Total Bays (G-01 to G-80)</span>
              </div>
            </div>
            <div className="floor-count-pill cyan">
              <span className="count-large">{groundAvailable}</span>
              <span className="count-sub">Open Bays</span>
            </div>
          </div>

          <div className="progress-bar-wrap">
            <div className="progress-bar-header">
              <span>Capacity Occupied</span>
              <strong>{groundPercent}%</strong>
            </div>
            <div className="progress-track">
              <div
                className="progress-fill cyan"
                style={{ width: `${Math.min(groundPercent, 100)}%` }}
              ></div>
            </div>
          </div>

          <button
            type="button"
            className="btn btn-secondary btn-sm w-full mt-3"
            onClick={() => onNavigateTab && onNavigateTab('student-available-parking')}
          >
            <span>Browse Ground Floor Layout</span>
            <span>&rarr;</span>
          </button>
        </div>

        <div className="floor-card glass-card">
          <div className="floor-card-top">
            <div className="floor-header-title">
              <span className="floor-icon">🏍️</span>
              <div>
                <h3>Basement &bull; Bikes</h3>
                <span className="text-muted text-xs">80 Total Bays (B-01 to B-80)</span>
              </div>
            </div>
            <div className="floor-count-pill purple">
              <span className="count-large">{basementAvailable}</span>
              <span className="count-sub">Open Bays</span>
            </div>
          </div>

          <div className="progress-bar-wrap">
            <div className="progress-bar-header">
              <span>Capacity Occupied</span>
              <strong>{basementPercent}%</strong>
            </div>
            <div className="progress-track">
              <div
                className="progress-fill purple"
                style={{ width: `${Math.min(basementPercent, 100)}%` }}
              ></div>
            </div>
          </div>

          <button
            type="button"
            className="btn btn-secondary btn-sm w-full mt-3"
            onClick={() => onNavigateTab && onNavigateTab('student-available-parking')}
          >
            <span>Browse Basement Layout</span>
            <span>&rarr;</span>
          </button>
        </div>
      </div>

      {/* Confirmation Dialog for Ending Parking */}
      {showConfirmModal && (
        <div
          className="modal-backdrop confirmation-backdrop"
          onClick={() => !isEndingParking && setShowConfirmModal(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="confirmation-modal-card glass-card"
            style={{ maxWidth: '440px', textAlign: 'center' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Close Button */}
            <button
              type="button"
              className="confirm-close-btn"
              onClick={() => !isEndingParking && setShowConfirmModal(false)}
              disabled={isEndingParking}
              aria-label="Cancel"
            >
              <XIcon className="w-4 h-4" />
            </button>

            {/* Warning / Exit Icon */}
            <div className="confirm-icon-wrapper" style={{ background: 'rgba(239, 68, 68, 0.12)', borderColor: 'rgba(239, 68, 68, 0.35)', margin: '0 auto 16px' }}>
              <LogOutIcon className="w-7 h-7 text-rose" />
            </div>

            {/* Title */}
            <h3 className="confirm-title" style={{ color: '#f8fafc', letterSpacing: '0.5px', marginBottom: '8px' }}>
              End Parking?
            </h3>

            {/* Message */}
            <p style={{ margin: '0 0 18px', fontSize: '13.5px', color: '#cbd5e1', lineHeight: '1.5' }}>
              Your parking session will be completed and this parking slot will become available for other students.
            </p>

            {/* Slot & Vehicle Details Summary */}
            {userActiveSession && (
              <div
                style={{
                  background: 'rgba(15, 23, 42, 0.65)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '10px',
                  padding: '12px 16px',
                  marginBottom: '20px',
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '10px',
                  fontSize: '12.5px',
                  textAlign: 'left'
                }}
              >
                <div>
                  <span style={{ color: '#94a3b8', display: 'block', fontSize: '11px', textTransform: 'uppercase' }}>Parking Slot</span>
                  <strong style={{ color: '#38bdf8', fontFamily: 'monospace', fontSize: '14px' }}>{userActiveSession.slotId}</strong>
                </div>
                <div>
                  <span style={{ color: '#94a3b8', display: 'block', fontSize: '11px', textTransform: 'uppercase' }}>Vehicle</span>
                  <strong style={{ color: '#f1f5f9', fontFamily: 'monospace', fontSize: '13px' }}>{userActiveSession.vehicleNumber}</strong>
                </div>
                <div>
                  <span style={{ color: '#94a3b8', display: 'block', fontSize: '11px', textTransform: 'uppercase' }}>Floor</span>
                  <span style={{ color: '#cbd5e1' }}>{userActiveSession.floor}</span>
                </div>
                <div>
                  <span style={{ color: '#94a3b8', display: 'block', fontSize: '11px', textTransform: 'uppercase' }}>Entry Time</span>
                  <span style={{ color: '#cbd5e1', fontFamily: 'monospace' }}>{userActiveSession.entryTime}</span>
                </div>
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', width: '100%' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ flex: 1, padding: '9px 16px' }}
                onClick={() => setShowConfirmModal(false)}
                disabled={isEndingParking}
              >
                Cancel
              </button>
              <button
                type="button"
                id="btn-confirm-exit"
                className="btn btn-sm"
                style={{
                  flex: 1,
                  padding: '9px 16px',
                  background: 'linear-gradient(135deg, #e11d48, #be123c)',
                  color: '#ffffff',
                  border: '1px solid rgba(244, 63, 94, 0.4)',
                  boxShadow: '0 4px 14px rgba(225, 29, 72, 0.35)',
                  fontWeight: 600
                }}
                onClick={handleConfirmExit}
                disabled={isEndingParking}
              >
                {isEndingParking ? 'Releasing Bay...' : 'Confirm Exit'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
