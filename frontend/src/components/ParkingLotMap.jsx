import { useMemo, useState } from 'react'
import {
  SearchIcon,
  PlusCircleIcon
} from './Icons'

export default function ParkingLotMap({
  slots = [],
  onSelectSlot,
  onOpenBooking,
  onReleaseSlot,
  selectedSlotId: controlledSelectedId
}) {
  const [selectedFloor, setSelectedFloor] = useState('Ground Floor')
  const [statusFilter, setStatusFilter] = useState('all') // 'all' | 'available' | 'occupied' | 'reserved'
  const [search, setSearch] = useState('')
  const [localSelectedId, setLocalSelectedId] = useState(null)

  const selectedSlotId = controlledSelectedId !== undefined ? controlledSelectedId : localSelectedId

  // Filter slots for current floor and search criteria
  const floorSlots = useMemo(() => {
    return slots.filter((slot) => slot.floor === selectedFloor)
  }, [slots, selectedFloor])

  const availableCount = floorSlots.filter((s) => s.status === 'available').length
  const occupiedCount = floorSlots.filter((s) => s.status === 'occupied').length
  const reservedCount = floorSlots.filter((s) => s.status === 'reserved').length

  const filteredSlots = useMemo(() => {
    const q = search.toLowerCase().trim()
    return floorSlots.filter((slot) => {
      const matchesStatus = statusFilter === 'all' || slot.status === statusFilter
      const matchesSearch =
        !q ||
        slot.id.toLowerCase().includes(q) ||
        (slot.plate && slot.plate.toLowerCase().includes(q)) ||
        (slot.owner && slot.owner.toLowerCase().includes(q))
      return matchesStatus && matchesSearch
    })
  }, [floorSlots, statusFilter, search])

  // Count totals for badges
  const groundAvailable = slots.filter((s) => s.floor === 'Ground Floor' && s.status === 'available').length
  const basementAvailable = slots.filter((s) => s.floor === 'Basement' && s.status === 'available').length

  const handleSlotClick = (slot) => {
    setLocalSelectedId(slot.id)
    if (onSelectSlot) {
      onSelectSlot(slot)
    }
  }

  return (
    <div className="parking-map-view">
      {/* Floor Selection Switcher */}
      <div className="floor-switch-container">
        <button
          type="button"
          className={`floor-switch-btn ${selectedFloor === 'Ground Floor' ? 'active' : ''}`}
          onClick={() => setSelectedFloor('Ground Floor')}
        >
          <span className="switch-icon">🛵</span>
          <div className="switch-text">
            <strong>Ground Floor</strong>
            <small>Reserved for Scooties &bull; {groundAvailable} Available</small>
          </div>
        </button>

        <button
          type="button"
          className={`floor-switch-btn ${selectedFloor === 'Basement' ? 'active' : ''}`}
          onClick={() => setSelectedFloor('Basement')}
        >
          <span className="switch-icon">🏍️</span>
          <div className="switch-text">
            <strong>Basement Floor</strong>
            <small>Reserved for Bikes &bull; {basementAvailable} Available</small>
          </div>
        </button>
      </div>

      {/* Map Filter & Action Toolbar */}
      <div className="map-toolbar glass-card">
        {/* Search Bar */}
        <div className="search-bar-wrap">
          <SearchIcon className="search-icon" />
          <input
            type="text"
            placeholder="Search bay ID (e.g. G-05), plate, or student..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-bar-input"
          />
          {search && (
            <button
              type="button"
              className="clear-search-btn"
              onClick={() => setSearch('')}
            >
              &times;
            </button>
          )}
        </div>

        {/* Status Filters */}
        <div className="status-filter-group">
          <button
            type="button"
            className={`filter-pill ${statusFilter === 'all' ? 'active' : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            All ({floorSlots.length})
          </button>
          <button
            type="button"
            className={`filter-pill available ${statusFilter === 'available' ? 'active' : ''}`}
            onClick={() => setStatusFilter('available')}
          >
            🔵 Available ({availableCount})
          </button>
          <button
            type="button"
            className={`filter-pill occupied ${statusFilter === 'occupied' ? 'active' : ''}`}
            onClick={() => setStatusFilter('occupied')}
          >
            🔴 Occupied ({occupiedCount})
          </button>
          <button
            type="button"
            className={`filter-pill reserved ${statusFilter === 'reserved' ? 'active' : ''}`}
            onClick={() => setStatusFilter('reserved')}
          >
            🟡 Reserved ({reservedCount})
          </button>
        </div>

        {/* Action Button */}
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => onOpenBooking && onOpenBooking(null)}
        >
          <PlusCircleIcon className="w-4 h-4" />
          <span>Park / Reserve</span>
        </button>
      </div>

      {/* Grid Legend */}
      <div className="layout-legend">
        <div className="legend-item">
          <span className="legend-dot available"></span>
          <span>Available (Soft Cyan Glow)</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot occupied"></span>
          <span>Occupied (Parked Vehicle)</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot reserved"></span>
          <span>Reserved (Pre-booked Pass)</span>
        </div>
      </div>

      {/* Interactive Parking Slot Grid */}
      {filteredSlots.length === 0 ? (
        <div className="empty-map-state glass-card">
          <p>No parking slots match the selected filters or search.</p>
        </div>
      ) : (
        <div className="parking-grid">
          {filteredSlots.map((slot) => {
            const isAvailable = slot.status === 'available'
            const isOccupied = slot.status === 'occupied'
            const isReserved = slot.status === 'reserved'
            const isSelected = selectedSlotId === slot.id
            const isScooty = slot.type === 'scooty' || slot.floor === 'Ground Floor'

            return (
              <div
                key={slot.id}
                className={`slot-box ${slot.status} ${isSelected ? 'selected' : ''}`}
                onClick={() => handleSlotClick(slot)}
              >
                <div className="slot-box-header">
                  <span className="slot-id font-mono">{slot.id}</span>
                  <span className="slot-type-icon">{isScooty ? '🛵' : '🏍️'}</span>
                </div>

                <div className="slot-box-body">
                  {isAvailable && (
                    <div className="slot-status-text text-cyan">
                      <span className="status-label">
                        <span className="available-cyan-dot"></span>
                        Available
                      </span>
                      <small className="slot-action-hint">+ Click to Park</small>
                    </div>
                  )}

                  {isOccupied && (
                    <div className="slot-occupied-info">
                      <strong className="slot-plate font-mono">{slot.plate}</strong>
                      <span className="slot-owner">{slot.owner || 'Student'}</span>
                    </div>
                  )}

                  {isReserved && (
                    <div className="slot-reserved-info">
                      <strong className="slot-plate font-mono">{slot.plate || 'RESERVED'}</strong>
                      <span className="slot-owner text-amber">{slot.owner || 'Pass Holder'}</span>
                    </div>
                  )}
                </div>

                {/* Card footer action for occupied/reserved slots */}
                {!isAvailable && onReleaseSlot && (
                  <div
                    className="slot-box-footer"
                    onClick={(e) => {
                      e.stopPropagation()
                      onReleaseSlot(slot.id)
                    }}
                  >
                    <button type="button" className="slot-release-btn">
                      Checkout ↲
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}