import { useMemo } from 'react'
import {
  CheckIcon,
  ShieldIcon,
  BikeIcon,
  AlertCircleIcon,
  ActivityIcon,
  SearchIcon,
  PlusCircleIcon
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
  const displayName = userProfile?.displayName || user?.displayName || 'Campus Admin'
  const firstName = displayName.split(' ')[0] || 'Admin'

  const totalSlots = slots.length || 160
  const occupiedSlots = slots.filter((s) => s.status === 'occupied').length
  const availableSlots = slots.filter((s) => s.status === 'available').length
  const groundSlots = slots.filter((s) => s.floor === 'Ground Floor')
  const groundAvailable = groundSlots.filter((s) => s.status === 'available').length
  const basementSlots = slots.filter((s) => s.floor === 'Basement')
  const basementAvailable = basementSlots.filter((s) => s.status === 'available').length

  const activeVehicles = useMemo(() => {
    return slots.filter((s) => s.status === 'occupied' && s.plate)
  }, [slots])

  return (
    <div className="admin-dashboard-container">
      {/* =========================================================
          HERO BANNER WITH WARM GREETING: Welcome, Admin 👋
          ========================================================= */}
      <section className="student-hero-banner glass-card">
        <div className="shb-content">
          <div className="shb-badge">
            <span className="shb-badge-dot"></span>
            <span>SECURITY ADMIN TELEMETRY</span>
          </div>
          <h1 className="shb-greeting">
            Welcome, <span className="gradient-text">{firstName}</span> 👋
          </h1>
          <p className="shb-subtitle">
            School of Commerce Smart Parking Command Center. Manage 160 two-wheeler bays, vehicle entry/exit gates, registration, reports, and compliance.
          </p>
        </div>

        {/* Quick Admin Summary */}
        <div className="student-quick-id-card glass-card">
          <div className="sq-top">
            <div className="sq-avatar admin-badge-avatar">🛡️</div>
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
      </div>

      {/* Active Parked Table Snapshot */}
      <div className="live-parked-section glass-card">
        <div className="card-header-clean">
          <h3>Active Parked Vehicles ({activeVehicles.length})</h3>
          <button
            type="button"
            className="btn btn-secondary btn-xs"
            onClick={() => onNavigateTab && onNavigateTab('vehicle-exit')}
          >
            Manage Vehicle Exits &rarr;
          </button>
        </div>

        <div className="table-responsive-wrapper mt-2">
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
              {activeVehicles.slice(0, 6).map((slot) => (
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
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
