import { useState, useEffect, useMemo } from 'react'
import {
  SearchIcon,
  PlusCircleIcon
} from './Icons'
import { formatLiveDurationCompact, formatLiveDurationStandard } from '../utils/timerUtils'

export default function LiveParkingTimerView({
  slots = [],
  onReleaseSlot,
  onOpenBooking
}) {
  // 1-second live ticking state
  const [, setTick] = useState(0)
  const [floorFilter, setFloorFilter] = useState('all') // 'all' | 'Ground Floor' | 'Basement'
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 1000)
    return () => clearInterval(timer)
  }, [])

  // Filter all active vehicles (occupied or reserved with vehicle)
  const activeVehicles = useMemo(() => {
    return slots
      .filter((s) => s.status === 'occupied' || s.status === 'reserved')
      .filter((s) => floorFilter === 'all' || s.floor === floorFilter)
      .filter((s) => {
        if (!searchTerm.trim()) return true
        const q = searchTerm.toLowerCase().trim()
        return (
          s.id.toLowerCase().includes(q) ||
          (s.plate && s.plate.toLowerCase().includes(q)) ||
          (s.owner && s.owner.toLowerCase().includes(q)) ||
          (s.rollNumber && s.rollNumber.toLowerCase().includes(q))
        )
      })
  }, [slots, floorFilter, searchTerm])

  const groundActive = slots.filter((s) => s.floor === 'Ground Floor' && s.status !== 'available').length
  const basementActive = slots.filter((s) => s.floor === 'Basement' && s.status !== 'available').length

  return (
    <div className="live-parking-view">
      {/* Top Header Card */}
      <div className="live-header glass-card">
        <div>
          <h2>Real-Time Live Parking</h2>
          <p>Live per-second duration timers and instant checkout management</p>
        </div>
        <div className="live-stats-chips">
          <div className="stat-chip">
            <span className="chip-label">Total Active:</span>
            <strong className="chip-val text-cyan">{activeVehicles.length}</strong>
          </div>
          <div className="stat-chip">
            <span className="chip-label">🛵 Ground:</span>
            <strong className="chip-val text-emerald">{groundActive}</strong>
          </div>
          <div className="stat-chip">
            <span className="chip-label">🏍️ Basement:</span>
            <strong className="chip-val text-indigo">{basementActive}</strong>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="map-toolbar glass-card">
        <div className="search-bar-wrap">
          <SearchIcon className="search-icon" />
          <input
            type="text"
            placeholder="Search vehicle plate, owner, or slot..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-bar-input"
          />
          {searchTerm && (
            <button
              type="button"
              className="clear-search-btn"
              onClick={() => setSearchTerm('')}
            >
              &times;
            </button>
          )}
        </div>

        <div className="status-filter-group">
          <button
            type="button"
            className={`filter-pill ${floorFilter === 'all' ? 'active' : ''}`}
            onClick={() => setFloorFilter('all')}
          >
            All Floors ({slots.filter(s => s.status !== 'available').length})
          </button>
          <button
            type="button"
            className={`filter-pill ${floorFilter === 'Ground Floor' ? 'active' : ''}`}
            onClick={() => setFloorFilter('Ground Floor')}
          >
            🛵 Ground ({groundActive})
          </button>
          <button
            type="button"
            className={`filter-pill ${floorFilter === 'Basement' ? 'active' : ''}`}
            onClick={() => setFloorFilter('Basement')}
          >
            🏍️ Basement ({basementActive})
          </button>
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={() => onOpenBooking && onOpenBooking(null)}
        >
          <PlusCircleIcon className="w-4 h-4" />
          <span>Park Vehicle</span>
        </button>
      </div>

      {/* Active Vehicles Display */}
      {activeVehicles.length === 0 ? (
        <div className="empty-state glass-card">
          <span className="empty-icon">🚗</span>
          <h3>No Active Parked Vehicles</h3>
          <p>There are no vehicles matching the filter or currently parked in this section.</p>
        </div>
      ) : (
        <div className="active-vehicle-grid">
          {activeVehicles.map((vehicle) => {
            const isScooty = vehicle.floor === 'Ground Floor' || vehicle.type === 'scooty'
            return (
              <div key={vehicle.id} className="vehicle-live-card glass-card">
                <div className="vehicle-card-top">
                  <div className="bay-badge font-mono">
                    <span>{vehicle.id}</span>
                  </div>
                  <span className="vehicle-type-pill">
                    {isScooty ? '🛵 Ground Floor' : '🏍️ Basement'}
                  </span>
                </div>

                <div className="vehicle-card-body">
                  <div className="vehicle-plate-row">
                    <span className="plate-box font-mono">{vehicle.plate || 'REGISTERED'}</span>
                    <span className={`status-badge-mini ${vehicle.status}`}>
                      {vehicle.status === 'occupied' ? 'Parked' : 'Reserved'}
                    </span>
                  </div>

                  <div className="vehicle-meta-grid">
                    <div className="meta-item">
                      <span className="meta-label">Owner</span>
                      <strong className="meta-val">{vehicle.owner || 'Student Member'}</strong>
                    </div>
                    <div className="meta-item">
                      <span className="meta-label">Entry Time</span>
                      <strong className="meta-val font-mono">{vehicle.entryTime || 'Active'}</strong>
                    </div>
                  </div>

                  {/* Real-time Ticking Timer */}
                  <div className="live-timer-container">
                    <div className="timer-header">
                      <span className="live-indicator-dot"></span>
                      <span>PARKED DURATION</span>
                    </div>
                    <div className="timer-display-value font-mono">
                      {formatLiveDurationStandard(vehicle.entryTimestamp)}
                    </div>
                  </div>
                </div>

                <div className="vehicle-card-footer">
                  <button
                    type="button"
                    className="btn-checkout-full"
                    onClick={() => onReleaseSlot && onReleaseSlot(vehicle.id)}
                  >
                    <span>Check Out &amp; Release Bay</span>
                    <span>↲</span>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
