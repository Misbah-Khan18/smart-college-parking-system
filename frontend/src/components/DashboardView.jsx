import { useState, useEffect, useMemo } from 'react'
import {
  CheckIcon,
  ShieldIcon,
  BikeIcon,
  SearchIcon,
  PlusCircleIcon
} from './Icons'
import { formatLiveDurationCompact } from '../utils/timerUtils'

export default function DashboardView({
  slots = [],
  onNavigateTab,
  onReleaseSlot,
  onOpenBooking,
  isAdmin = false
}) {
  // Live ticking state for per-second duration update (used when admin panel is visible)
  const [, setTick] = useState(0)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    if (!isAdmin) return
    const timer = setInterval(() => setTick((t) => t + 1), 1000)
    return () => clearInterval(timer)
  }, [isAdmin])

  // Calculations
  const totalSlots = slots.length || 160
  const occupiedSlots = slots.filter((s) => s.status === 'occupied').length
  const reservedSlots = slots.filter((s) => s.status === 'reserved').length
  const availableSlots = slots.filter((s) => s.status === 'available').length

  const groundSlots = slots.filter((s) => s.floor === 'Ground Floor')
  const groundAvailable = groundSlots.filter((s) => s.status === 'available').length
  const groundOccupied = groundSlots.filter((s) => s.status !== 'available').length
  const groundPercent = Math.round((groundOccupied / (groundSlots.length || 1)) * 100)

  const basementSlots = slots.filter((s) => s.floor === 'Basement')
  const basementAvailable = basementSlots.filter((s) => s.status === 'available').length
  const basementOccupied = basementSlots.filter((s) => s.status !== 'available').length
  const basementPercent = Math.round((basementOccupied / (basementSlots.length || 1)) * 100)

  // Filter currently active vehicles (Admin only)
  const activeVehicles = useMemo(() => {
    if (!isAdmin) return []
    return slots
      .filter((s) => s.status === 'occupied' || s.status === 'reserved')
      .filter((s) => {
        if (!searchTerm.trim()) return true
        const q = searchTerm.toLowerCase().trim()
        return (
          s.id.toLowerCase().includes(q) ||
          (s.plate && s.plate.toLowerCase().includes(q)) ||
          (s.owner && s.owner.toLowerCase().includes(q)) ||
          (s.floor && s.floor.toLowerCase().includes(q))
        )
      })
  }, [slots, searchTerm, isAdmin])

  return (
    <div className="dashboard-content">
      {/* =========================================================
          HERO BANNER: SCHOOL OF COMMERCE SMART PARKING (ONE-TIME ANIMATION)
          ========================================================= */}
      <section className="college-hero-section glass-card">
        <div className="hero-content">
          <h1 className="college-hero-title">
            <strong>School of Commerce</strong> <span className="gradient-text">Smart Parking</span>
          </h1>
        </div>

        {/* 1-Time Animated Bike & Scooty Vehicle Display */}
        <div className="hero-animation-track">
          <div className="road-strip">
            <div className="road-line-static"></div>
          </div>

          {/* 1-Time Animated Scooty */}
          <div className="vehicle-animated-wrapper scooty-rider-once">
            <div className="vehicle-bubble">
              <span className="vehicle-emoji">🛵</span>
              <div className="vehicle-bubble-label">
                <strong>Ground Floor</strong>
                <small>Scooties</small>
              </div>
            </div>
          </div>

          {/* 1-Time Animated Bike */}
          <div className="vehicle-animated-wrapper bike-rider-once">
            <div className="vehicle-bubble">
              <span className="vehicle-emoji">🏍️</span>
              <div className="vehicle-bubble-label">
                <strong>Basement</strong>
                <small>Bikes</small>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          COMPACT, MOBILE-FRIENDLY 2 OPTIONS: BOOK SLOT | BOOK MONTHLY PASS
          ========================================================= */}
      <div className="quick-options-grid">
        {/* Option 1: Book Slot */}
        <div className="quick-option-card glass-card">
          <div className="q-option-left">
            <div className="q-icon-box cyan">
              <span className="q-emoji">🅿️</span>
            </div>
            <div className="q-info">
              <h4>Book Parking Slot</h4>
              <span className="text-muted">Instant bay reservation &bull; {availableSlots} bays open</span>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => onOpenBooking && onOpenBooking(null, 'slot')}
          >
            <PlusCircleIcon className="w-4 h-4" />
            <span>Book Slot</span>
          </button>
        </div>

        {/* Option 2: Book Monthly Pass */}
        <div className="quick-option-card glass-card">
          <div className="q-option-left">
            <div className="q-icon-box indigo">
              <span className="q-emoji">🎫</span>
            </div>
            <div className="q-info">
              <h4>Book Monthly Pass</h4>
              <span className="text-muted">30-Day recurring permit for students &amp; staff</span>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-indigo btn-sm"
            onClick={() => onOpenBooking && onOpenBooking(null, 'monthly')}
          >
            <ShieldIcon className="w-4 h-4" />
            <span>Monthly Pass</span>
          </button>
        </div>
      </div>

      {/* =========================================================
          4 MAIN KPI CARDS (DASHBOARD METRICS)
          ========================================================= */}
      <div className="kpi-grid">
        <div className="kpi-card glass-card">
          <div className="kpi-icon-box cyan">
            <span className="kpi-emoji">🅿️</span>
          </div>
          <div className="kpi-data">
            <span className="kpi-label">Total Parking Bays</span>
            <strong className="kpi-value text-cyan">{totalSlots}</strong>
            <span className="kpi-sub">80 Ground + 80 Basement</span>
          </div>
        </div>

        <div className="kpi-card glass-card">
          <div className="kpi-icon-box emerald">
            <CheckIcon className="w-6 h-6 text-emerald" />
          </div>
          <div className="kpi-data">
            <span className="kpi-label">Available Slots</span>
            <strong className="kpi-value text-emerald">{availableSlots}</strong>
            <span className="kpi-sub">Ready for parking</span>
          </div>
        </div>

        <div className="kpi-card glass-card">
          <div className="kpi-icon-box rose">
            <ShieldIcon className="w-6 h-6 text-rose" />
          </div>
          <div className="kpi-data">
            <span className="kpi-label">Occupied Slots</span>
            <strong className="kpi-value text-rose">{occupiedSlots}</strong>
            <span className="kpi-sub">Currently parked</span>
          </div>
        </div>

        <div className="kpi-card glass-card">
          <div className="kpi-icon-box indigo">
            <BikeIcon className="w-6 h-6 text-indigo" />
          </div>
          <div className="kpi-data">
            <span className="kpi-label">Active Vehicles</span>
            <strong className="kpi-value text-indigo">{occupiedSlots + reservedSlots}</strong>
            <span className="kpi-sub">Parked &amp; reserved</span>
          </div>
        </div>
      </div>

      {/* =========================================================
          FLOOR CAPACITY OVERVIEW CARDS (GROUND VS BASEMENT)
          ========================================================= */}
      <div className="floor-capacity-grid">
        {/* Ground Floor Card */}
        <div className="floor-card glass-card">
          <div className="floor-card-header">
            <div className="floor-title-wrap">
              <span className="floor-avatar">🛵</span>
              <div>
                <h3>Ground Floor</h3>
                <span className="floor-subtitle">Reserved for Scooties</span>
              </div>
            </div>
            <span className="floor-badge cyan">{groundAvailable} Open</span>
          </div>

          <div className="progress-section">
            <div className="progress-labels">
              <span>Occupancy</span>
              <strong>{groundPercent}% ({groundOccupied} / 80)</strong>
            </div>
            <div className="progress-bar-bg">
              <div
                className="progress-bar-fill cyan-fill"
                style={{ width: `${groundPercent}%` }}
              ></div>
            </div>
          </div>

          <button
            type="button"
            className="floor-action-btn"
            onClick={() => onNavigateTab && onNavigateTab('map')}
          >
            <span>Open Ground Floor Layout</span>
            <span>&rarr;</span>
          </button>
        </div>

        {/* Basement Card */}
        <div className="floor-card glass-card">
          <div className="floor-card-header">
            <div className="floor-title-wrap">
              <span className="floor-avatar">🏍️</span>
              <div>
                <h3>Basement</h3>
                <span className="floor-subtitle">Reserved for Bikes</span>
              </div>
            </div>
            <span className="floor-badge indigo">{basementAvailable} Open</span>
          </div>

          <div className="progress-section">
            <div className="progress-labels">
              <span>Occupancy</span>
              <strong>{basementPercent}% ({basementOccupied} / 80)</strong>
            </div>
            <div className="progress-bar-bg">
              <div
                className="progress-bar-fill indigo-fill"
                style={{ width: `${basementPercent}%` }}
              ></div>
            </div>
          </div>

          <button
            type="button"
            className="floor-action-btn"
            onClick={() => onNavigateTab && onNavigateTab('map')}
          >
            <span>Open Basement Layout</span>
            <span>&rarr;</span>
          </button>
        </div>
      </div>

      {/* =========================================================
          ADMIN PANEL: ACTIVE PARKED VEHICLES & CHECKOUT (ADMIN ONLY)
          ========================================================= */}
      {isAdmin && (
        <div className="live-parked-section glass-card admin-panel-section">
          <div className="section-header">
            <div className="admin-header-title">
              <div className="admin-badge-tag">
                <ShieldIcon className="w-4 h-4 text-indigo" />
                <span>ADMINISTRATOR TELEMETRY CONTROL</span>
              </div>
              <h3>Active Parked Vehicles Management</h3>
              <p>Real-time per-second duration timers &amp; instant vehicle checkout</p>
            </div>
            <div className="search-wrapper">
              <SearchIcon className="search-icon" />
              <input
                type="text"
                placeholder="Search plate, student, or bay..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="table-search-input"
              />
            </div>
          </div>

          {activeVehicles.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">🅿️</span>
              <p>No active parked vehicles matching your search.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="clean-table">
                <thead>
                  <tr>
                    <th>Bay ID</th>
                    <th>Floor</th>
                    <th>Student / Owner</th>
                    <th>License Plate</th>
                    <th>Status</th>
                    <th>Live Duration</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {activeVehicles.map((slot) => {
                    const isScooty = slot.floor === 'Ground Floor' || slot.type === 'scooty'
                    return (
                      <tr key={slot.id}>
                        <td>
                          <strong className="slot-id-pill font-mono">{slot.id}</strong>
                        </td>
                        <td>
                          <span className="floor-tag">
                            {isScooty ? '🛵 Ground' : '🏍️ Basement'}
                          </span>
                        </td>
                        <td>
                          <strong>{slot.owner || 'Student Member'}</strong>
                        </td>
                        <td>
                          <span className="plate-badge font-mono">{slot.plate || 'NO-PLATE'}</span>
                        </td>
                        <td>
                          <span className={`status-pill ${slot.status}`}>
                            {slot.status === 'occupied' ? '🔴 Parked' : '🟡 Reserved'}
                          </span>
                        </td>
                        <td>
                          <div className="live-timer-chip font-mono">
                            <span className="live-dot"></span>
                            <span>{formatLiveDurationCompact(slot.entryTimestamp)}</span>
                          </div>
                        </td>
                        <td>
                          {onReleaseSlot && (
                            <button
                              type="button"
                              className="btn-checkout"
                              onClick={() => onReleaseSlot(slot.id)}
                            >
                              Checkout ↲
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
