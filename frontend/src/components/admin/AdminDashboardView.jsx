import {
  CheckIcon,
  BikeIcon,
  AlertCircleIcon,
  ShieldIcon
} from '../Icons'

export default function AdminDashboardView({
  user,
  userProfile,
  slots = [],
  onNavigateTab
}) {
  const displayName = userProfile?.displayName || user?.displayName || 'Campus Admin'
  const firstName =
    displayName === 'Campus Admin' || displayName.toLowerCase() === 'admin'
      ? 'Admin'
      : (displayName.split(' ')[0] || 'Admin')

  const groundSlots = slots.filter((s) => s.floor === 'Ground Floor' || s.id?.startsWith('G-'))
  const basementSlots = slots.filter((s) => s.floor === 'Basement' || s.id?.startsWith('B-'))

  const groundTotal = groundSlots.length || 80
  const basementTotal = basementSlots.length || 80
  const totalSlots = slots.length || (groundTotal + basementTotal) || 160

  const groundOccupied = groundSlots.filter((s) => s.status === 'occupied' || s.status === 'OCCUPIED' || s.status === 'booked' || s.status === 'BOOKED').length
  const groundReserved = groundSlots.filter((s) => s.status === 'reserved' || s.status === 'RESERVED').length
  const groundAvailable = Math.max(0, groundTotal - groundOccupied - groundReserved)

  const basementOccupied = basementSlots.filter((s) => s.status === 'occupied' || s.status === 'OCCUPIED' || s.status === 'booked' || s.status === 'BOOKED').length
  const basementReserved = basementSlots.filter((s) => s.status === 'reserved' || s.status === 'RESERVED').length
  const basementAvailable = Math.max(0, basementTotal - basementOccupied - basementReserved)

  const occupiedSlots = groundOccupied + basementOccupied
  const reservedSlots = groundReserved + basementReserved
  const availableSlots = groundAvailable + basementAvailable

  return (
    <div className="admin-dashboard-container">
      {/* =========================================================
          HERO BANNER WITH WARM GREETING: Welcome, Admin 👋
          ========================================================= */}
      <section className="student-hero-banner glass-card">
        <div className="shb-content">
          <div className="shb-badge">
            <ShieldIcon className="w-3.5 h-3.5 text-cyan" />
            <span>SECURITY ADMIN TELEMETRY</span>
          </div>
          <h1 className="shb-greeting">
            Welcome, <span className="gradient-text">{firstName}</span> 👋
          </h1>
          <p className="shb-subtitle">
            SOCMAC Smart Park Command Center. Manage 160 two-wheeler bays, vehicle entry/exit gates, registration, reports, and compliance.
          </p>
        </div>

        {/* Quick Admin Summary */}
        <div className="student-quick-id-card glass-card">
          <div className="sq-top">
            <div className="sq-avatar admin-badge-avatar flex items-center justify-center">
              <ShieldIcon className="w-6 h-6 text-cyan" />
            </div>
            <div>
              <strong className="sq-name">{displayName}</strong>
              <span className="sq-roll font-mono text-cyan">Security Admin Console</span>
            </div>
          </div>
          <div className="sq-vehicle-row">
            <span className="status-pill available">🟢 Systems Online</span>
            <span className="text-xs text-muted">Gates 1 &amp; 2 Active</span>
          </div>
        </div>
      </section>

      {/* 4 Core KPIs */}
      <div className="kpi-grid mb-4">
        <div className="kpi-card glass-card">
          <div className="kpi-icon-box cyan">
            <span>🅿️</span>
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
            <AlertCircleIcon className="w-6 h-6 text-rose" />
          </div>
          <div className="kpi-data">
            <span className="kpi-label">Occupied Slots</span>
            <strong className="kpi-value text-rose">{occupiedSlots}</strong>
            <span className="kpi-sub">{reservedSlots > 0 ? `${reservedSlots} reserved &bull; ` : ''}Active parked vehicles</span>
          </div>
        </div>

        <div className="kpi-card glass-card">
          <div className="kpi-icon-box indigo">
            <BikeIcon className="w-6 h-6 text-indigo" />
          </div>
          <div className="kpi-data">
            <span className="kpi-label">Floor Breakdown</span>
            <strong className="kpi-value text-indigo">{groundAvailable}G / {basementAvailable}B</strong>
            <span className="kpi-sub">Open Scooties / Bikes</span>
          </div>
        </div>
      </div>

      {/* 6 Quick Admin Feature Tiles */}
      <div className="admin-features-grid mb-4">
        <div
          className="admin-feature-tile glass-card"
          onClick={() => onNavigateTab && onNavigateTab('map')}
        >
          <span className="aft-icon">🅿️</span>
          <div className="aft-text">
            <h4>Parking Map</h4>
            <p>160-slot visual layout &amp; bay control</p>
          </div>
        </div>

        <div
          className="admin-feature-tile glass-card"
          onClick={() => onNavigateTab && onNavigateTab('register')}
        >
          <span className="aft-icon">📋</span>
          <div className="aft-text">
            <h4>Registered Vehicles</h4>
            <p>Directory of campus vehicles &amp; allocated zones</p>
          </div>
        </div>

        <div
          className="admin-feature-tile glass-card"
          onClick={() => onNavigateTab && onNavigateTab('vehicle-entry')}
        >
          <span className="aft-icon">🚗</span>
          <div className="aft-text">
            <h4>Vehicle Entry</h4>
            <p>Gate 1 ingress &amp; nearest bay allocation</p>
          </div>
        </div>

        <div
          className="admin-feature-tile glass-card"
          onClick={() => onNavigateTab && onNavigateTab('admin-payments')}
        >
          <span className="aft-icon">💳</span>
          <div className="aft-text">
            <h4>Payments</h4>
            <p>Parking payment history &amp; transaction records</p>
          </div>
        </div>

        <div
          className="admin-feature-tile glass-card"
          onClick={() => onNavigateTab && onNavigateTab('reports-history')}
        >
          <span className="aft-icon">📜</span>
          <div className="aft-text">
            <h4>Reports &amp; Parking History</h4>
            <p>Historical archive &amp; export analytics</p>
          </div>
        </div>

        <div
          className="admin-feature-tile glass-card"
          onClick={() => onNavigateTab && onNavigateTab('wrong-parking')}
        >
          <span className="aft-icon">⚠️</span>
          <div className="aft-text">
            <h4>Wrong Parking Management</h4>
            <p>Floor mismatch &amp; rule violations</p>
          </div>
        </div>

        <div
          className="admin-feature-tile glass-card"
          onClick={() => onNavigateTab && onNavigateTab('gate-scanner')}
        >
          <span className="aft-icon">🛡️</span>
          <div className="aft-text">
            <h4>Gate QR Permit Scanner</h4>
            <p>Gate ingress token &amp; barrier verification</p>
          </div>
        </div>
      </div>
    </div>
  )
}
