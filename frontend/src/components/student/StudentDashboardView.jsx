import {
  CheckIcon,
  ShieldIcon,
  PlusCircleIcon
} from '../Icons'

export default function StudentDashboardView({
  user,
  userProfile,
  slots = [],
  activePermit,
  onViewPass,
  onNavigateTab,
  onOpenBooking,
  onCancelPermit
}) {
  const displayName = userProfile?.displayName || user?.displayName || 'Alzuni Shaikh'
  const firstName = displayName.split(' ')[0] || 'Alzuni'

  // Calculations
  const totalSlots = slots.length || 160
  const occupiedSlots = slots.filter((s) => s.status === 'occupied' || s.status === 'OCCUPIED').length
  const availableSlots = slots.filter((s) => s.status === 'available' || s.status === 'AVAILABLE').length
  const reservedSlots = slots.filter((s) => s.status === 'reserved' || s.status === 'RESERVED').length

  const groundSlots = slots.filter((s) => s.floor === 'Ground Floor')
  const groundAvailable = groundSlots.filter((s) => s.status === 'available' || s.status === 'AVAILABLE').length
  const groundOccupied = groundSlots.filter((s) => s.status !== 'available' && s.status !== 'AVAILABLE').length
  const groundPercent = Math.round((groundOccupied / (groundSlots.length || 1)) * 100)

  const basementSlots = slots.filter((s) => s.floor === 'Basement')
  const basementAvailable = basementSlots.filter((s) => s.status === 'available' || s.status === 'AVAILABLE').length
  const basementOccupied = basementSlots.filter((s) => s.status !== 'available' && s.status !== 'AVAILABLE').length
  const basementPercent = Math.round((basementOccupied / (basementSlots.length || 1)) * 100)

  return (
    <div className="student-dashboard-container">
      {/* Hero Banner */}
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

      {/* Active Permit Banner or Buy Permit Options */}
      {activePermit ? (
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
                <h4>Get Parking Permit</h4>
                <span className="text-muted">Daily (₹20), Monthly (₹300), or Semester (₹1200)</span>
              </div>
            </div>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => onOpenBooking && onOpenBooking(null, 'permit')}
            >
              <PlusCircleIcon className="w-4 h-4" />
              <span>Buy Permit</span>
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
    </div>
  )
}
