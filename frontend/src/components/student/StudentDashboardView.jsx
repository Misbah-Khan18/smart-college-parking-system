import { useMemo } from 'react'
import {
  CheckIcon,
  ShieldIcon,
  PlusCircleIcon
} from '../Icons'

export default function StudentDashboardView({
  user,
  userProfile,
  slots = [],
  onNavigateTab,
  onOpenBooking
}) {
  const displayName = userProfile?.displayName || user?.displayName || 'Alzuni Shaikh'
  const firstName = displayName.split(' ')[0] || 'Alzuni'

  // Calculations
  const totalSlots = slots.length || 160
  const occupiedSlots = slots.filter((s) => s.status === 'occupied').length
  const availableSlots = slots.filter((s) => s.status === 'available').length
  const reservedSlots = slots.filter((s) => s.status === 'reserved').length

  const groundSlots = slots.filter((s) => s.floor === 'Ground Floor')
  const groundAvailable = groundSlots.filter((s) => s.status === 'available').length
  const groundOccupied = groundSlots.filter((s) => s.status !== 'available').length
  const groundPercent = Math.round((groundOccupied / (groundSlots.length || 1)) * 100)

  const basementSlots = slots.filter((s) => s.floor === 'Basement')
  const basementAvailable = basementSlots.filter((s) => s.status === 'available').length
  const basementOccupied = basementSlots.filter((s) => s.status !== 'available').length
  const basementPercent = Math.round((basementOccupied / (basementSlots.length || 1)) * 100)

  return (
    <div className="student-dashboard-container">
      {/* =========================================================
          HERO BANNER: BIG BOLD School of Commerce.Park + Welcome, Alzuni 👋
          ========================================================= */}
      <section className="student-hero-banner glass-card student-hero-clean">
        <div className="shb-content">
          <h1 className="soc-hero-title soc-brand-animated">
            <span className="soc-brand-text">School of Commerce</span>
            <span className="accent-dot">.</span>
            <span className="soc-brand-park">Park</span>
          </h1>
          <p className="shb-greeting-sub">
            Welcome, <span className="gradient-text font-bold">{firstName}</span> 👋 &bull; Smart Two-Wheeler Campus Parking
          </p>
        </div>
      </section>

      {/* =========================================================
          2 OPTIONS: BOOK SLOT | BOOK MONTHLY PASS
          ========================================================= */}
      <div className="quick-options-grid mb-4">
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
          OCCUPIED, AVAILED (AVAILABLE), AND RESERVED SLOTS TELEMETRY
          (SHOWN DIRECTLY BELOW BOOK SLOT & BOOK MONTHLY PASS)
          ========================================================= */}
      <div className="slots-telemetry-section">
        <div className="slots-telemetry-grid">
          {/* Availed / Available Slots */}
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

          {/* Occupied Slots */}
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

          {/* Reserved Slots */}
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

          {/* Total Monitored */}
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

      {/* =========================================================
          2 MAIN FLOOR CAPACITY CARDS (GROUND VS BASEMENT)
          ========================================================= */}
      <div className="floor-capacity-grid two-cols">
        {/* Ground Floor (Scooties) */}
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
            <span>Browse Ground Floor Slots</span>
            <span>&rarr;</span>
          </button>
        </div>

        {/* Basement (Bikes) */}
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
            <span>Browse Basement Slots</span>
            <span>&rarr;</span>
          </button>
        </div>
      </div>
    </div>
  )
}
