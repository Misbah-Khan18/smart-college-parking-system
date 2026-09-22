import { useState, useEffect, useMemo } from 'react'
import {
  CheckIcon,
  BikeIcon,
  AlertCircleIcon,
  ActivityIcon,
  SearchIcon,
  PlusCircleIcon,
  XIcon,
  ShieldIcon
} from '../Icons'
import { formatLiveDurationCompact } from '../../utils/timerUtils'

export default function AdminDashboardView({
  user,
  userProfile,
  slots = [],
  onNavigateTab,
  onReleaseSlot,
  onOpenBooking
}) {
  const [searchTerm, setSearchTerm] = useState('')

  const displayName = userProfile?.displayName || user?.displayName || 'Campus Admin'
  const firstName =
    displayName === 'Campus Admin' || displayName.toLowerCase() === 'admin'
      ? 'Admin'
      : (displayName.split(' ')[0] || 'Admin')

  const totalSlots = slots.length || 160
  const occupiedSlots = slots.filter((s) => s.status === 'occupied').length
  const availableSlots = slots.filter((s) => s.status === 'available').length
  const groundSlots = slots.filter((s) => s.floor === 'Ground Floor')
  const groundAvailable = groundSlots.filter((s) => s.status === 'available').length
  const basementSlots = slots.filter((s) => s.floor === 'Basement')
  const basementAvailable = basementSlots.filter((s) => s.status === 'available').length

  const activeVehicles = useMemo(() => {
    const list = slots.filter((s) => s.status === 'occupied' && s.plate)
    if (!searchTerm.trim()) return list
    const q = searchTerm.toLowerCase().trim()
    return list.filter(
      (s) =>
        s.plate?.toLowerCase().includes(q) ||
        s.owner?.toLowerCase().includes(q) ||
        s.id?.toLowerCase().includes(q)
    )
  }, [slots, searchTerm])

  // Live ticking state (updates every 1 second when active vehicles are occupying bays)
  const [, setTick] = useState(0)

  useEffect(() => {
    if (activeVehicles.length === 0) return
    const interval = setInterval(() => {
      setTick((prev) => prev + 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [activeVehicles.length])

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
            <span className="kpi-sub">Active parked vehicles</span>
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

      {/* 7 Quick Admin Feature Tiles */}
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
            <h4>Student &amp; Vehicle Registration</h4>
            <p>Register students, vehicles, and rules</p>
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
          onClick={() => onNavigateTab && onNavigateTab('vehicle-exit')}
        >
          <span className="aft-icon">🛑</span>
          <div className="aft-text">
            <h4>Vehicle Exit</h4>
            <p>Gate 2 checkout &amp; bay release</p>
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

      {/* Active Parked Table Snapshot */}
      <div className="live-parked-section glass-card">
        <div className="card-header-clean flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <ActivityIcon className="w-5 h-5 text-cyan" />
            <h3 className="m-0">Active Parked Vehicles ({activeVehicles.length})</h3>
          </div>
          <div className="flex items-center gap-2">
            <div className="table-search-box" style={{ minWidth: '180px', maxWidth: '240px' }}>
              <SearchIcon className="w-4 h-4 search-icon-svg" />
              <input
                type="text"
                placeholder="Search bay, plate, driver..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="table-search-input"
              />
              {searchTerm && (
                <button
                  type="button"
                  className="clear-search-btn"
                  onClick={() => setSearchTerm('')}
                  title="Clear search"
                  style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '0 2px' }}
                >
                  <XIcon className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            {onOpenBooking && (
              <button
                type="button"
                className="btn btn-primary btn-xs flex items-center gap-1"
                onClick={() => onOpenBooking()}
              >
                <PlusCircleIcon className="w-3.5 h-3.5" />
                <span>Assign Bay</span>
              </button>
            )}
            <button
              type="button"
              className="btn btn-secondary btn-xs"
              onClick={() => onNavigateTab && onNavigateTab('vehicle-exit')}
            >
              Manage Exits &rarr;
            </button>
          </div>
        </div>

        <div className="table-responsive-wrapper mt-2">
          {activeVehicles.length === 0 ? (
            <div className="empty-state p-5 text-center">
              <span className="empty-icon">🟢</span>
              <h4>No vehicles currently occupying bays</h4>
              <p className="text-muted">
                Parking activity will appear here when a vehicle enters the campus.
              </p>
            </div>
          ) : (
            <table className="reg-data-table">
              <thead>
                <tr>
                  <th>Bay ID</th>
                  <th>Floor</th>
                  <th>Student / Driver</th>
                  <th>Vehicle Plate</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {activeVehicles.slice(0, 6).map((slot) => {
                  const isGround = (slot.floor && slot.floor.toLowerCase().includes('ground')) || (slot.id && slot.id.startsWith('G-'))
                  const floorClass = isGround ? 'floor-ground' : 'floor-basement'
                  const floorLabel = slot.floor || (isGround ? 'Ground Floor' : 'Basement')

                  return (
                    <tr key={slot.id} className="reg-table-row">
                      <td>
                        <strong className="slot-id-pill font-mono">{slot.id}</strong>
                      </td>
                      <td>
                        <span className={`floor-tag ${floorClass}`}>{floorLabel}</span>
                      </td>
                      <td>
                        <strong>{slot.owner || 'Student Member'}</strong>
                      </td>
                      <td>
                        <span className="plate-badge-mono font-mono font-bold">{slot.plate}</span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                          <span className="status-pill occupied">🔴 Parked</span>
                          <span className="text-xs text-cyan font-mono" style={{ fontSize: '0.725rem', color: '#38bdf8' }} title="Live parking duration">
                            ⏱️ {formatLiveDurationCompact(slot.entryTimestamp)}
                          </span>
                        </div>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-rose btn-xs"
                          onClick={() => onReleaseSlot && onReleaseSlot(slot.id)}
                        >
                          Checkout ↲
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
          <table className="reg-data-table">
            <thead>
              <tr>
                <th>Bay ID</th>
                <th>Floor</th>
                <th>Student / Driver</th>
                <th>Vehicle Plate</th>
                <th>Duration</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {activeVehicles.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '36px 16px', color: '#94a3b8' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '24px' }}>🅿️</span>
                      <strong style={{ color: '#e2e8f0', fontSize: '14px' }}>No Active Parked Vehicles</strong>
                      <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                        {searchTerm ? 'No parked vehicles match your search query.' : 'All campus bays are currently available or awaiting vehicle ingress.'}
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                activeVehicles.slice(0, 6).map((slot) => (
                <tr key={slot.id} className="reg-table-row">
                  <td>
                    <strong className="slot-id-pill font-mono">{slot.id}</strong>
                  </td>
                  <td>
                    <span className="floor-tag floor-ground">{slot.floor}</span>
                  </td>
                  <td>
                    <strong>{slot.owner || 'Student Member'}</strong>
                  </td>
                  <td>
                    <span className="plate-badge-mono font-mono font-bold">{slot.plate}</span>
                  </td>
                  <td>
                    <span className="duration-tag font-mono text-xs text-muted">
                      ⏱️ {formatLiveDurationCompact(slot.entryTimestamp)}
                    </span>
                  </td>
                  <td>
                    <span className="status-pill occupied">🔴 Parked</span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-rose btn-xs"
                      onClick={() => onReleaseSlot && onReleaseSlot(slot.id)}
                    >
                      Checkout ↲
                    </button>
                  </td>
                </tr>
              )))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
