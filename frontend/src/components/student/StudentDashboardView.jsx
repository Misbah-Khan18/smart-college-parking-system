import { useMemo } from 'react'

export default function StudentDashboardView({
  user,
  userProfile,
  slots = [],
  onNavigateTab
}) {
  const displayName = userProfile?.displayName || user?.displayName || 'Alzuni Shaikh'
  const firstName = displayName.split(' ')[0] || 'Alzuni'

  // Calculations
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
          <h1 className="soc-hero-title">
            School of Commerce<span className="accent-dot">.</span>Park
          </h1>
          <p className="shb-greeting-sub">
            Welcome, <span className="gradient-text font-bold">{firstName}</span> 👋
          </p>
        </div>
      </section>

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
