import { useState, useEffect, useMemo } from 'react'
import {
  ClockIcon,
  SearchIcon,
  BikeIcon,
  ShieldIcon,
  CheckIcon,
  ActivityIcon
} from './Icons'
import {
  formatLiveDurationStandard,
  formatLiveDurationDetailed,
  formatLiveDurationCompact,
  getStayDurationCategory
} from '../utils/timerUtils'

export default function LiveParkingTimerView({
  slots = [],
  onReleaseSlot,
  onNavigateToMap
}) {
  // Live ticking state (1 second re-render)
  const [, setTick] = useState(0)
  const [search, setSearch] = useState('')
  const [floorFilter, setFloorFilter] = useState('all') // 'all' | 'Ground Floor' | 'Basement'
  const [sortBy, setSortBy] = useState('longest') // 'longest' | 'newest' | 'slot'

  useEffect(() => {
    const timer = setInterval(() => {
      setTick((t) => t + 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // All currently parked / occupied vehicles
  const parkedSlots = useMemo(() => {
    return slots.filter((s) => s.status === 'occupied' || (s.status === 'reserved' && s.plate))
  }, [slots])

  // Filter & sort parked vehicles
  const filteredVehicles = useMemo(() => {
    let list = parkedSlots.filter((s) => {
      const matchFloor = floorFilter === 'all' || s.floor === floorFilter
      const q = search.toLowerCase().trim()
      const matchSearch =
        !q ||
        s.id.toLowerCase().includes(q) ||
        (s.plate && s.plate.toLowerCase().includes(q)) ||
        (s.owner && s.owner.toLowerCase().includes(q)) ||
        (s.rollNumber && s.rollNumber.toLowerCase().includes(q)) ||
        (s.stream && s.stream.toLowerCase().includes(q))
      return matchFloor && matchSearch
    })

    if (sortBy === 'longest') {
      list.sort((a, b) => (a.entryTimestamp || 0) - (b.entryTimestamp || 0))
    } else if (sortBy === 'newest') {
      list.sort((a, b) => (b.entryTimestamp || 0) - (a.entryTimestamp || 0))
    } else if (sortBy === 'slot') {
      list.sort((a, b) => a.id.localeCompare(b.id))
    }

    return list
  }, [parkedSlots, floorFilter, search, sortBy])

  // Aggregate stats
  const totalParked = parkedSlots.length
  const groundParked = parkedSlots.filter((s) => s.floor === 'Ground Floor').length
  const basementParked = parkedSlots.filter((s) => s.floor === 'Basement').length

  return (
    <div className="live-timer-module-container">
      {/* Module 7 Header */}
      <div className="timer-header-card glass-card">
        <div className="timer-header-left">
          <div className="timer-live-indicator">
            <span className="live-pulse-dot"></span>
            <span>MODULE 7 &bull; LIVE JAVASCRIPT PARKING DURATION TIMER</span>
          </div>
          <h2>Live Vehicle Parking Duration Monitor</h2>
          <p>
            Real-time duration tracking for every parked student two-wheeler. Durations update automatically every second via client-side JavaScript.
          </p>
        </div>

        <div className="timer-header-stats">
          <div className="t-stat-box">
            <span className="t-stat-label">Active Parked Vehicles</span>
            <strong className="t-stat-val text-cyan">{totalParked}</strong>
          </div>
          <div className="t-stat-box">
            <span className="t-stat-label">Ground Floor (Scooties)</span>
            <strong className="t-stat-val text-emerald">{groundParked}</strong>
          </div>
          <div className="t-stat-box">
            <span className="t-stat-label">Basement (Bikes)</span>
            <strong className="t-stat-val text-indigo">{basementParked}</strong>
          </div>
        </div>
      </div>

      {/* Filter & Controls Toolbar */}
      <div className="timer-toolbar glass-card">
        {/* Search */}
        <div className="search-box">
          <SearchIcon className="w-4 h-4 text-muted" />
          <input
            type="text"
            placeholder="Search bay ID (e.g. B-01, G-03), student name, roll no, or plate..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-input"
          />
          {search && (
            <button
              type="button"
              className="clear-search-btn"
              onClick={() => setSearch('')}
            >
              ×
            </button>
          )}
        </div>

        {/* Floor Filter */}
        <div className="action-filter-pills">
          <button
            type="button"
            className={`pill-btn ${floorFilter === 'all' ? 'active' : ''}`}
            onClick={() => setFloorFilter('all')}
          >
            All Two-Wheelers ({totalParked})
          </button>
          <button
            type="button"
            className={`pill-btn ${floorFilter === 'Ground Floor' ? 'active' : ''}`}
            onClick={() => setFloorFilter('Ground Floor')}
          >
            🛵 Ground Floor Scooties ({groundParked})
          </button>
          <button
            type="button"
            className={`pill-btn ${floorFilter === 'Basement' ? 'active' : ''}`}
            onClick={() => setFloorFilter('Basement')}
          >
            🏍️ Basement Bikes ({basementParked})
          </button>
        </div>

        {/* Sort */}
        <div className="sort-group">
          <label className="sort-label">Sort by:</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="sort-select"
          >
            <option value="longest">⏱️ Longest Parked First</option>
            <option value="newest">⚡ Most Recent Entry</option>
            <option value="slot">🅿️ Slot ID (Ascending)</option>
          </select>
        </div>
      </div>

      {/* Grid of Live Vehicle Timer Cards */}
      {filteredVehicles.length === 0 ? (
        <div className="empty-timer-state glass-card">
          <span className="empty-icon">⏱️</span>
          <h3>No Parked Vehicles Found</h3>
          <p>There are currently no active vehicles parked in the selected category.</p>
        </div>
      ) : (
        <div className="live-timer-cards-grid">
          {filteredVehicles.map((slot) => {
            const isScooty = slot.floor === 'Ground Floor' || slot.type === 'scooty'
            const stayCategory = getStayDurationCategory(slot.entryTimestamp)

            return (
              <div key={slot.id} className="timer-vehicle-card glass-card">
                {/* Top Badge: Slot ID & Floor */}
                <div className="timer-card-top">
                  <div className="slot-badge-lead">
                    <span className="slot-id-lead">{slot.id}</span>
                    <span className={`floor-tag-sm ${isScooty ? 'ground' : 'basement'}`}>
                      {isScooty ? '🛵 Ground (Scooty)' : '🏍️ Basement (Bike)'}
                    </span>
                  </div>

                  <span className={`stay-status-badge ${stayCategory.color}`}>
                    {stayCategory.label}
                  </span>
                </div>

                {/* Primary Requirement Display e.g. B12 — Parked for 02 Hours 15 Minutes */}
                <div className="primary-timer-banner">
                  <div className="timer-headline">
                    <span className="timer-slot-prefix font-mono font-bold text-cyan">{slot.id}</span>
                    <span className="timer-sep">—</span>
                    <span className="timer-duration-text font-bold text-emerald">
                      {formatLiveDurationStandard(slot.entryTimestamp)}
                    </span>
                  </div>

                  <div className="live-seconds-counter">
                    <span className="live-pulse-dot-sm"></span>
                    <span className="font-mono text-muted text-xs">
                      Live Precision: {formatLiveDurationDetailed(slot.entryTimestamp)}
                    </span>
                  </div>
                </div>

                {/* Student & Vehicle Info */}
                <div className="timer-card-body">
                  <div className="info-row-item">
                    <span className="item-label">Student Owner:</span>
                    <strong className="item-val">{slot.owner || 'Registered Student'}</strong>
                  </div>

                  {slot.rollNumber && (
                    <div className="info-row-item">
                      <span className="item-label">Roll Number / ID:</span>
                      <span className="item-val font-mono roll-badge-sm">{slot.rollNumber}</span>
                    </div>
                  )}

                  {slot.stream && (
                    <div className="info-row-item">
                      <span className="item-label">Stream / Class:</span>
                      <span className="item-val text-muted text-xs">{slot.stream}</span>
                    </div>
                  )}

                  <div className="info-row-item">
                    <span className="item-label">Vehicle Plate:</span>
                    <span className="item-val font-mono font-bold text-cyan">{slot.plate}</span>
                  </div>

                  <div className="info-row-item">
                    <span className="item-label">Entry Timestamp:</span>
                    <span className="item-val font-mono text-muted">{slot.entryTime || 'Active'}</span>
                  </div>

                  <div className="info-row-item">
                    <span className="item-label">Section Bay:</span>
                    <span className="item-val text-muted text-xs">{slot.section}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="timer-card-footer">
                  {onNavigateToMap && (
                    <button
                      type="button"
                      className="btn-locate-slot"
                      onClick={onNavigateToMap}
                    >
                      📍 Locate on Map
                    </button>
                  )}

                  {onReleaseSlot && (
                    <button
                      type="button"
                      className="btn-checkout-timer"
                      onClick={() => onReleaseSlot(slot.id)}
                    >
                      Check Out ↲
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
