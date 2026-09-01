import { useState, useEffect, useMemo } from 'react'
import {
  BikeIcon,
  CheckIcon,
  ShieldIcon,
  ActivityIcon,
  SearchIcon,
  BarChartIcon,
  RefreshCwIcon
} from './Icons'
import {
  formatLiveDurationStandard,
  formatLiveDurationCompact,
  getStayDurationCategory
} from '../utils/timerUtils'

export default function DashboardView({
  slots = [],
  logs = [],
  onNavigateTab,
  onReleaseSlot
}) {
  // Live ticking state for per-second timer update
  const [, setTick] = useState(0)
  const [dataSearch, setDataSearch] = useState('')
  const [floorFilter, setFloorFilter] = useState('all') // 'all' | 'Ground Floor' | 'Basement'

  useEffect(() => {
    const timer = setInterval(() => {
      setTick((t) => t + 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Core Module 2 Metrics
  const totalSlots = slots.length || 160
  const occupiedSlots = slots.filter((s) => s.status === 'occupied').length
  const reservedSlots = slots.filter((s) => s.status === 'reserved').length
  const availableSlots = slots.filter((s) => s.status === 'available').length
  const parkedVehiclesCount = occupiedSlots

  // Today's parking entries count from logs
  const todayEntriesCount = useMemo(() => {
    return logs.filter((l) => l.action === 'ENTRY').length
  }, [logs])

  // Ground Floor (Scooties) Stats
  const groundSlots = slots.filter((s) => s.floor === 'Ground Floor')
  const groundAvailable = groundSlots.filter((s) => s.status === 'available').length
  const groundOccupied = groundSlots.filter((s) => s.status === 'occupied' || s.status === 'reserved').length

  // Basement (Bikes) Stats
  const basementSlots = slots.filter((s) => s.floor === 'Basement')
  const basementAvailable = basementSlots.filter((s) => s.status === 'available').length
  const basementOccupied = basementSlots.filter((s) => s.status === 'occupied' || s.status === 'reserved').length

  // EV count
  const evParkedCount = slots.filter((s) => (s.status === 'occupied' || s.status === 'reserved') && s.isEv).length

  // Overall Occupancy Rate
  const occupancyRate = Math.round(((occupiedSlots + reservedSlots) / totalSlots) * 100) || 0

  // Filtered Parked Vehicles List for Real-Time Parking Data Table
  const parkedVehicles = useMemo(() => {
    return slots
      .filter((s) => s.status === 'occupied' || s.status === 'reserved')
      .filter((s) => floorFilter === 'all' || s.floor === floorFilter)
      .filter((s) => {
        if (!dataSearch.trim()) return true
        const q = dataSearch.toLowerCase().trim()
        return (
          s.id.toLowerCase().includes(q) ||
          (s.plate && s.plate.toLowerCase().includes(q)) ||
          (s.owner && s.owner.toLowerCase().includes(q)) ||
          (s.rollNumber && s.rollNumber.toLowerCase().includes(q)) ||
          (s.stream && s.stream.toLowerCase().includes(q))
        )
      })
  }, [slots, floorFilter, dataSearch])

  return (
    <div className="dashboard-module-container">
      {/* Module 2 Header Banner */}
      <div className="dashboard-header-banner glass-card">
        <div className="banner-left">
          <div className="system-live-badge">
            <span className="live-pulse-dot"></span>
            <span>SYSTEM LIVE &bull; REAL-TIME IoT PARKING TELEMETRY</span>
          </div>
          <h2>Smart College Parking Dashboard</h2>
          <p>
            Real-time multi-floor campus parking surveillance, instant bay capacity tracking, and student vehicle telemetry.
          </p>
        </div>

        <div className="banner-quick-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => onNavigateTab && onNavigateTab('map')}
          >
            🅿️ View Live Parking Map
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => onNavigateTab && onNavigateTab('entry')}
          >
            🚗 Vehicle Entry (Auto Nearest)
          </button>
        </div>
      </div>

      {/* 5 Primary Metric KPI Cards */}
      <div className="dashboard-kpi-grid">
        {/* 1. Total Parking Slots */}
        <div className="kpi-card glass-card">
          <div className="kpi-icon-box bg-cyan-glow">
            <span className="kpi-emoji">🅿️</span>
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Total Parking Slots</span>
            <strong className="kpi-value text-cyan">{totalSlots}</strong>
            <span className="kpi-sub">80 Ground + 80 Basement</span>
          </div>
        </div>

        {/* 2. Available Slots */}
        <div className="kpi-card glass-card">
          <div className="kpi-icon-box bg-emerald-glow">
            <CheckIcon className="w-6 h-6 text-emerald" />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Available Slots</span>
            <strong className="kpi-value text-emerald">{availableSlots}</strong>
            <span className="kpi-sub">{100 - occupancyRate}% Available Capacity</span>
          </div>
        </div>

        {/* 3. Occupied Slots */}
        <div className="kpi-card glass-card">
          <div className="kpi-icon-box bg-rose-glow">
            <ShieldIcon className="w-6 h-6 text-rose" />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Occupied Slots</span>
            <strong className="kpi-value text-rose">{occupiedSlots}</strong>
            <span className="kpi-sub">{reservedSlots > 0 ? `+ ${reservedSlots} Reserved` : 'Actively Occupied'}</span>
          </div>
        </div>

        {/* 4. Number of Parked Vehicles */}
        <div className="kpi-card glass-card">
          <div className="kpi-icon-box bg-indigo-glow">
            <BikeIcon className="w-6 h-6 text-indigo" />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Number of Parked Vehicles</span>
            <strong className="kpi-value text-indigo">{parkedVehiclesCount}</strong>
            <span className="kpi-sub">Active Two-Wheelers</span>
          </div>
        </div>

        {/* 5. Today's Parking Entries */}
        <div className="kpi-card glass-card">
          <div className="kpi-icon-box bg-amber-glow">
            <ActivityIcon className="w-6 h-6 text-amber" />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Today's Parking Entries</span>
            <strong className="kpi-value text-amber">{todayEntriesCount}</strong>
            <span className="kpi-sub">Total Inbound Check-Ins</span>
          </div>
        </div>
      </div>

      {/* Live Parking Statistics (Module 2) */}
      <div className="dashboard-stats-section">
        <div className="section-title-row">
          <div className="title-left">
            <BarChartIcon className="w-5 h-5 text-cyan" />
            <h3>Live Parking Statistics</h3>
          </div>
          <span className="status-indicator-tag">
            <span className="pulse-dot-cyan"></span> Real-Time Sensor Telemetry
          </span>
        </div>

        <div className="stats-breakdown-grid">
          {/* Ground Floor Scooty Stats */}
          <div className="breakdown-stat-card glass-card">
            <div className="b-stat-top">
              <div className="b-title-wrap">
                <span className="floor-badge-icon">🛵</span>
                <div>
                  <h4>Ground Floor (Scooties)</h4>
                  <span className="text-muted">Accounts Dept &amp; Exam IT Dept Wings</span>
                </div>
              </div>
              <span className="b-highlight text-cyan">{groundAvailable} Open</span>
            </div>

            <div className="b-metrics-row">
              <div>
                <span className="text-muted text-xs">Total Capacity</span>
                <p className="font-bold">{groundSlots.length || 80} Bays</p>
              </div>
              <div>
                <span className="text-muted text-xs">Occupied / Reserved</span>
                <p className="font-bold text-rose">{groundOccupied} Bays</p>
              </div>
              <div>
                <span className="text-muted text-xs">Occupancy Rate</span>
                <p className="font-bold">{Math.round((groundOccupied / 80) * 100)}%</p>
              </div>
            </div>

            <div className="progress-bar-container mt-2">
              <div
                className="progress-bar-fill"
                style={{
                  width: `${(groundOccupied / 80) * 100}%`,
                  background: 'linear-gradient(90deg, #06b6d4, #3b82f6)'
                }}
              ></div>
            </div>
          </div>

          {/* Basement Bike Stats */}
          <div className="breakdown-stat-card glass-card">
            <div className="b-stat-top">
              <div className="b-title-wrap">
                <span className="floor-badge-icon">🏍️</span>
                <div>
                  <h4>Basement (Bikes)</h4>
                  <span className="text-muted">Rows 1 to 4 Two-Wheeler Grid</span>
                </div>
              </div>
              <span className="b-highlight text-indigo">{basementAvailable} Open</span>
            </div>

            <div className="b-metrics-row">
              <div>
                <span className="text-muted text-xs">Total Capacity</span>
                <p className="font-bold">{basementSlots.length || 80} Bays</p>
              </div>
              <div>
                <span className="text-muted text-xs">Occupied / Reserved</span>
                <p className="font-bold text-rose">{basementOccupied} Bays</p>
              </div>
              <div>
                <span className="text-muted text-xs">Occupancy Rate</span>
                <p className="font-bold">{Math.round((basementOccupied / 80) * 100)}%</p>
              </div>
            </div>

            <div className="progress-bar-container mt-2">
              <div
                className="progress-bar-fill"
                style={{
                  width: `${(basementOccupied / 80) * 100}%`,
                  background: 'linear-gradient(90deg, #6366f1, #ec4899)'
                }}
              ></div>
            </div>
          </div>

          {/* Environmental EV & Overall Rate */}
          <div className="breakdown-stat-card glass-card">
            <div className="b-stat-top">
              <div className="b-title-wrap">
                <span className="floor-badge-icon">⚡</span>
                <div>
                  <h4>Campus Occupancy &amp; EVs</h4>
                  <span className="text-muted">Eco-Friendly &amp; Campus Traffic Load</span>
                </div>
              </div>
              <span className="b-highlight text-emerald">{occupancyRate}% Load</span>
            </div>

            <div className="b-metrics-row">
              <div>
                <span className="text-muted text-xs">Parked EV Vehicles</span>
                <p className="font-bold text-amber">{evParkedCount} Active</p>
              </div>
              <div>
                <span className="text-muted text-xs">Total Available</span>
                <p className="font-bold text-emerald">{availableSlots} Bays</p>
              </div>
              <div>
                <span className="text-muted text-xs">Traffic Level</span>
                <p className="font-bold text-cyan">{occupancyRate > 75 ? 'Heavy' : 'Normal'}</p>
              </div>
            </div>

            <div className="progress-bar-container mt-2">
              <div
                className="progress-bar-fill"
                style={{
                  width: `${occupancyRate}%`,
                  background:
                    occupancyRate >= 80
                      ? 'linear-gradient(90deg, #f59e0b, #f43f5e)'
                      : 'linear-gradient(90deg, #10b981, #06b6d4)'
                }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Real-Time Parking Data & Live Parking Timer (Module 2 & 7) */}
      <div className="dashboard-realtime-data-section glass-card">
        <div className="realtime-data-header">
          <div className="data-title-group">
            <ActivityIcon className="w-5 h-5 text-cyan" />
            <div>
              <h3>Real-Time Parking Data</h3>
              <p>Live active parked vehicles with owners, roll IDs, streams, and live second-by-second duration timers</p>
            </div>
          </div>

          <div className="data-controls">
            {/* Search */}
            <div className="search-box">
              <SearchIcon className="w-4 h-4 text-muted" />
              <input
                type="text"
                placeholder="Search owner, roll no, plate, or slot..."
                value={dataSearch}
                onChange={(e) => setDataSearch(e.target.value)}
                className="search-input"
              />
              {dataSearch && (
                <button
                  type="button"
                  className="clear-search-btn"
                  onClick={() => setDataSearch('')}
                >
                  ×
                </button>
              )}
            </div>

            {/* Floor Filter Pills */}
            <div className="action-filter-pills">
              <button
                type="button"
                className={`pill-btn ${floorFilter === 'all' ? 'active' : ''}`}
                onClick={() => setFloorFilter('all')}
              >
                All Floors ({occupiedSlots + reservedSlots})
              </button>
              <button
                type="button"
                className={`pill-btn ${floorFilter === 'Ground Floor' ? 'active' : ''}`}
                onClick={() => setFloorFilter('Ground Floor')}
              >
                🛵 Ground Floor ({groundOccupied})
              </button>
              <button
                type="button"
                className={`pill-btn ${floorFilter === 'Basement' ? 'active' : ''}`}
                onClick={() => setFloorFilter('Basement')}
              >
                🏍️ Basement ({basementOccupied})
              </button>
            </div>
          </div>
        </div>

        {/* Live Parking Data Table */}
        <div className="realtime-table-wrapper">
          {parkedVehicles.length === 0 ? (
            <div className="empty-table-state">
              <span className="empty-icon">🅿️</span>
              <p>No active parked vehicles matching your search.</p>
            </div>
          ) : (
            <table className="realtime-data-table">
              <thead>
                <tr>
                  <th>Slot ID</th>
                  <th>Floor &amp; Section</th>
                  <th>Student Name &amp; Roll ID</th>
                  <th>Stream / Class</th>
                  <th>Vehicle Plate &amp; Type</th>
                  <th>Entry Time</th>
                  <th>Live Parking Timer (Module 7)</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {parkedVehicles.map((slot) => {
                  const categoryInfo = getStayDurationCategory(slot.entryTimestamp)
                  const isScooty = slot.floor === 'Ground Floor' || slot.type === 'scooty'

                  return (
                    <tr key={slot.id} className="realtime-row">
                      {/* Slot ID */}
                      <td>
                        <div className="slot-pill-lead">
                          <strong>{slot.id}</strong>
                          {slot.isEv && <span className="ev-micro-badge">⚡ EV</span>}
                        </div>
                      </td>

                      {/* Floor & Section */}
                      <td>
                        <div className="floor-cell-info">
                          <span className={`floor-tag-chip ${isScooty ? 'ground' : 'basement'}`}>
                            {isScooty ? '🛵 Ground (Scooty)' : '🏍️ Basement (Bike)'}
                          </span>
                          <span className="section-subtext text-muted">{slot.section}</span>
                        </div>
                      </td>

                      {/* Student Name & Roll */}
                      <td>
                        <div className="student-cell-info">
                          <strong className="student-name">{slot.owner || 'Campus User'}</strong>
                          {slot.rollNumber && (
                            <span className="roll-micro-pill">{slot.rollNumber}</span>
                          )}
                          {slot.phoneNumber && (
                            <span className="phone-micro font-mono text-muted">{slot.phoneNumber}</span>
                          )}
                        </div>
                      </td>

                      {/* Stream */}
                      <td>
                        <span className="stream-badge-sm">{slot.stream || 'Registered Student'}</span>
                      </td>

                      {/* Vehicle Number & Type */}
                      <td>
                        <div className="vehicle-plate-cell">
                          <span className="plate-badge-mono font-mono">{slot.plate}</span>
                          <span className="type-desc text-xs text-muted">
                            {isScooty ? 'Scooty' : 'Bike / Motorcycle'}
                          </span>
                        </div>
                      </td>

                      {/* Entry Time */}
                      <td>
                        <span className="entry-time-pill font-mono">{slot.entryTime || '09:00 AM'}</span>
                      </td>

                      {/* Live Parking Timer (Module 7 Requirement) */}
                      <td>
                        <div className="live-timer-cell">
                          <div className="timer-badge-live">
                            <span className="timer-live-dot"></span>
                            <strong className="timer-text font-mono">
                              {formatLiveDurationCompact(slot.entryTimestamp)}
                            </strong>
                          </div>
                          <span className="timer-full-desc text-muted">
                            {formatLiveDurationStandard(slot.entryTimestamp)}
                          </span>
                        </div>
                      </td>

                      {/* Action */}
                      <td>
                        {onReleaseSlot && (
                          <button
                            type="button"
                            className="btn-checkout-mini"
                            onClick={() => onReleaseSlot(slot.id)}
                            title="Checkout Vehicle & Free Bay"
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
          )}
        </div>
      </div>

      {/* Live Parking Status Updates Feed */}
      <div className="dashboard-status-updates-section glass-card">
        <div className="updates-header">
          <div className="title-with-pulse">
            <span className="live-pulse-dot"></span>
            <h4>Live Parking Status Updates &amp; Event Stream</h4>
          </div>
          <span className="text-muted text-xs">Auto-refreshing IoT telemetry feed</span>
        </div>

        <div className="updates-stream-grid">
          {logs.slice(0, 4).map((log) => (
            <div key={log.id} className="update-event-card">
              <div className="event-top">
                <span className={`event-badge ${log.action.toLowerCase()}`}>
                  {log.action === 'ENTRY' ? '🟢 INBOUND ENTRY' : '🔴 OUTBOUND EXIT'}
                </span>
                <span className="event-time font-mono text-muted">{log.timestamp}</span>
              </div>
              <div className="event-details">
                <strong>{log.plate}</strong> assigned to Bay <span className="text-cyan font-bold">{log.slot}</span>
                {log.owner && <span className="text-muted"> ({log.owner})</span>}
              </div>
              <span className="event-gate text-xs text-dim">{log.gate || 'Main Gate Barrier'}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
