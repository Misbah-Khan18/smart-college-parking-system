import { useState, useMemo } from 'react'
import {
  CheckIcon,
  SearchIcon,
  PlusCircleIcon
} from '../Icons'

export default function StudentAvailableParkingView({
  slots = [],
  userProfile,
  onOpenBooking
}) {
  const [selectedFloor, setSelectedFloor] = useState('all') // 'all' | 'Ground Floor' | 'Basement'
  const [search, setSearch] = useState('')

  const availableSlots = useMemo(() => {
    return slots.filter((s) => s.status === 'available')
  }, [slots])

  const filteredSlots = useMemo(() => {
    return availableSlots.filter((s) => {
      const matchFloor = selectedFloor === 'all' || s.floor === selectedFloor
      const q = search.toLowerCase().trim()
      const matchSearch =
        !q ||
        s.id.toLowerCase().includes(q) ||
        (s.section && s.section.toLowerCase().includes(q)) ||
        (s.zone && s.zone.toLowerCase().includes(q))
      return matchFloor && matchSearch
    })
  }, [availableSlots, selectedFloor, search])

  const groundAvailable = availableSlots.filter((s) => s.floor === 'Ground Floor').length
  const basementAvailable = availableSlots.filter((s) => s.floor === 'Basement').length

  return (
    <div className="student-page-container">
      {/* Header */}
      <div className="page-section-header glass-card">
        <div className="psh-badge">
          <span>🅿️ REAL-TIME BAY TELEMETRY</span>
        </div>
        <h1 className="psh-title">
          Available <span className="gradient-text">Parking Bays</span>
        </h1>
        <p className="psh-subtitle">
          Live campus parking availability. Ground Floor designated for Scooties (80 bays), Basement designated for Bikes (80 bays).
        </p>
      </div>

      {/* Controls & Filter Pills */}
      <div className="table-controls-bar glass-card mb-4">
        <div className="filter-tabs-row">
          <button
            type="button"
            className={`pill-btn ${selectedFloor === 'all' ? 'active' : ''}`}
            onClick={() => setSelectedFloor('all')}
          >
            All Open Bays ({availableSlots.length})
          </button>
          <button
            type="button"
            className={`pill-btn ${selectedFloor === 'Ground Floor' ? 'active' : ''}`}
            onClick={() => setSelectedFloor('Ground Floor')}
          >
            🛵 Ground Floor &bull; Scooties ({groundAvailable})
          </button>
          <button
            type="button"
            className={`pill-btn ${selectedFloor === 'Basement' ? 'active' : ''}`}
            onClick={() => setSelectedFloor('Basement')}
          >
            🏍️ Basement &bull; Bikes ({basementAvailable})
          </button>
        </div>

        <div className="search-box">
          <SearchIcon className="w-4 h-4 text-muted" />
          <input
            type="text"
            placeholder="Search bay ID (e.g. G-02, B-05)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      {/* Available Slots Grid */}
      <div className="available-slots-grid">
        {filteredSlots.length === 0 ? (
          <div className="empty-state glass-card p-5 text-center col-span-full">
            <span className="empty-icon">🅿️</span>
            <h4>No available slots match your filter</h4>
            <p className="text-muted">Try selecting a different floor or clear your search.</p>
          </div>
        ) : (
          filteredSlots.map((slot) => {
            const isScooty = slot.floor === 'Ground Floor'
            return (
              <div key={slot.id} className="available-slot-card glass-card">
                <div className="asc-top">
                  <span className="slot-id-pill font-mono">{slot.id}</span>
                  <span className={`floor-tag ${isScooty ? 'floor-ground' : 'floor-basement'}`}>
                    {isScooty ? '🛵 Ground' : '🏍️ Basement'}
                  </span>
                </div>

                <div className="asc-section text-xs text-muted">
                  {slot.section || 'Campus Two-Wheeler Area'}
                </div>

                <div className="asc-status-row">
                  <span className="status-pill available">🟢 Open</span>
                  {slot.isEv && <span className="ev-badge">⚡ EV Ready</span>}
                </div>

                <button
                  type="button"
                  className="btn btn-primary btn-sm w-full mt-2"
                  onClick={() => onOpenBooking && onOpenBooking(slot, 'slot')}
                >
                  <PlusCircleIcon className="w-3.5 h-3.5" />
                  <span>Reserve Bay</span>
                </button>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
