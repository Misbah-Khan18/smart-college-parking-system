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
  onOpenBooking
}) {
  // Live ticking state for per-second duration update
  const [, setTick] = useState(0)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 1000)
    return () => clearInterval(timer)
  }, [])

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

  // Filter currently active vehicles
  const activeVehicles = useMemo(() => {
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
  }, [slots, searchTerm])

  return (
    <div className="dashboard-content">
      {/* Welcome Banner */}
      <div className="dashboard-welcome glass-card">
        <div className="welcome-text">
          <h2>Campus Parking Overview</h2>
          <p>Real-time slot availability, live sensor tracking, and vehicle management.</p>
        </div>
        <div className="welcome-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => onOpenBooking && onOpenBooking(null)}
          >
            <PlusCircleIcon className="w-4 h-4" />
            <span>Park / Reserve Slot</span>
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => onNavigateTab && onNavigateTab('map')}
          >
            <span>View Full Layout &rarr;</span>
          </button>
        </div>
      </div>

      {/* 4 Main KPI Cards */}
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

      {/* Floor Capacity Overview Cards */}
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

      {/* Live Active Parked Vehicles List */}
      <div className="live-parked-section glass-card">
        <div className="section-header">
          <div>
            <h3>Active Parked Vehicles</h3>
            <p>Real-time per-second timer and vehicle occupancy status</p>
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
    </div>
  )
}
