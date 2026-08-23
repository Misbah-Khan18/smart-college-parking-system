import { useMemo, useState } from 'react'
import {
  CarIcon,
  BikeIcon,
  EvIcon,
  SearchIcon,
  PlusCircleIcon,
  ShieldIcon
} from './Icons'

export default function ParkingLotMap({
  slots = [],
  selectedZone,
  setSelectedZone,
  filterStatus,
  setFilterStatus,
  searchQuery,
  setSearchQuery,
  onSelectSlot,
  onOpenBooking,
  onReleaseSlot,
  currentRole
}) {
  // ==========================================
  // FLOOR SELECTION
  // ==========================================
  const [selectedFloor, setSelectedFloor] = useState('Ground Floor')

  // ==========================================
  // GROUND FLOOR SECTIONS
  // ==========================================
  const groundFloorSections = [
    {
      id: 'accounts-front',
      title: 'Accounts Dept',
      subtitle: 'Front Side (G-01 to G-20)',
      section: 'Accounts Department - Front Side'
    },
    {
      id: 'accounts-opposite',
      title: 'Accounts Dept',
      subtitle: 'Opposite Side (G-21 to G-40)',
      section: 'Accounts Department - Opposite Side'
    },
    {
      id: 'exam-front',
      title: 'Exam / IT Dept',
      subtitle: 'Front Side (G-41 to G-60)',
      section: 'Exam IT Department - Front Side'
    },
    {
      id: 'exam-opposite',
      title: 'Exam / IT Dept',
      subtitle: 'Opposite Side (G-61 to G-80)',
      section: 'Exam IT Department - Opposite Side'
    }
  ]

  // ==========================================
  // BASEMENT SECTIONS
  // ==========================================
  const basementSections = [
    {
      id: 'basement-row-1',
      title: 'Basement',
      subtitle: 'Row 1 (B-01 to B-20)',
      section: 'Basement Row 1'
    },
    {
      id: 'basement-row-2',
      title: 'Basement',
      subtitle: 'Row 2 (B-21 to B-40)',
      section: 'Basement Row 2'
    },
    {
      id: 'basement-row-3',
      title: 'Basement',
      subtitle: 'Row 3 (B-41 to B-60)',
      section: 'Basement Row 3'
    },
    {
      id: 'basement-row-4',
      title: 'Basement',
      subtitle: 'Row 4 (B-61 to B-80)',
      section: 'Basement Row 4'
    }
  ]

  const currentSections =
    selectedFloor === 'Ground Floor'
      ? groundFloorSections
      : basementSections

  // ==========================================
  // FILTER SLOTS
  // ==========================================
  const filteredSlots = useMemo(() => {
    const query = searchQuery.toLowerCase().trim()

    return slots.filter((slot) => {
      const matchFloor = slot.floor === selectedFloor

      const matchSection =
        selectedZone === 'All Sections' ||
        slot.section === selectedZone

      const matchStatus =
        filterStatus === 'all' ||
        slot.status === filterStatus

      const matchSearch =
        !query ||
        slot.id.toLowerCase().includes(query) ||
        (slot.plate && slot.plate.toLowerCase().includes(query)) ||
        (slot.owner && slot.owner.toLowerCase().includes(query)) ||
        (slot.section && slot.section.toLowerCase().includes(query))

      return matchFloor && matchSection && matchStatus && matchSearch
    })
  }, [slots, selectedFloor, selectedZone, filterStatus, searchQuery])

  // ==========================================
  // VEHICLE ICON HELPER
  // ==========================================
  const getVehicleIcon = (type) => {
    switch (type) {
      case 'bike':
      case 'scooty':
        return <BikeIcon className="w-4 h-4" />
      case 'ev':
        return <EvIcon className="w-4 h-4 text-amber" />
      default:
        return <CarIcon className="w-4 h-4" />
    }
  }

  // ==========================================
  // FLOOR COUNTS
  // ==========================================
  const floorSlots = slots.filter((slot) => slot.floor === selectedFloor)
  const availableCount = floorSlots.filter((slot) => slot.status === 'available').length
  const occupiedCount = floorSlots.filter((slot) => slot.status === 'occupied').length
  const reservedCount = floorSlots.filter((slot) => slot.status === 'reserved').length

  // ==========================================
  // RENDER SINGLE SLOT CARD
  // ==========================================
  const renderSlot = (slot) => {
    const isAvailable = slot.status === 'available'
    const isOccupied = slot.status === 'occupied'
    const isReserved = slot.status === 'reserved'

    return (
      <div
        key={slot.id}
        className={`slot-card ${slot.status} ${slot.type === 'ev' ? 'is-ev' : ''}`}
        onClick={() => onSelectSlot && onSelectSlot(slot)}
      >
        {/* Slot Top Row */}
        <div className="slot-top-row">
          <div className="slot-id-badge">
            <span className="slot-id-text">{slot.id}</span>
            {slot.type === 'ev' && <span className="ev-tag">⚡ EV</span>}
          </div>

          <div className="slot-type-icon">{getVehicleIcon(slot.type)}</div>
        </div>

        {/* Slot Body */}
        <div className="slot-body">
          <div className="slot-status-indicator">
            <span className={`status-pill ${slot.status}`}>{slot.status}</span>
          </div>

          {/* OCCUPIED */}
          {isOccupied && (
            <div className="slot-info">
              <span className="plate-num font-mono">{slot.plate || 'Parked Vehicle'}</span>
              <span className="owner-name" title={slot.owner}>{slot.owner || 'Occupied'}</span>
              {slot.entryTime && (
                <span className="time-tag">Entry {slot.entryTime}</span>
              )}
            </div>
          )}

          {/* RESERVED */}
          {isReserved && (
            <div className="slot-info">
              <span className="plate-num font-mono">{slot.plate || 'Reserved'}</span>
              <span className="owner-name" title={slot.owner}>{slot.owner || 'Reserved'}</span>
              {slot.reservedUntil && (
                <span className="time-tag">Until {slot.reservedUntil}</span>
              )}
            </div>
          )}

          {/* AVAILABLE */}
          {isAvailable && (
            <div className="slot-info available-info">
              <span className="ready-text">Ready to park</span>
              <span className="section-hint-text">{slot.section ? slot.section.split('-')[0] : ''}</span>
            </div>
          )}
        </div>

        {/* Slot Actions */}
        <div className="slot-actions" onClick={(e) => e.stopPropagation()}>
          {isAvailable ? (
            <button
              type="button"
              className="btn-slot-action btn-book-quick"
              onClick={() => onOpenBooking && onOpenBooking(slot)}
            >
              Reserve
            </button>
          ) : (
            <div className="occupied-actions">
              {(currentRole === 'Security Admin' || currentRole === 'Faculty') && onReleaseSlot && (
                <button
                  type="button"
                  className="btn-slot-action btn-release"
                  onClick={() => onReleaseSlot(slot.id)}
                  title="Checkout vehicle"
                >
                  Checkout
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  const resetFilters = () => {
    setSelectedZone('All Sections')
    setFilterStatus('all')
    setSearchQuery('')
  }

  return (
    <div className="parking-map-container">
      {/* Floor Selector */}
      <div className="parking-floor-selector">
        <button
          type="button"
          className={`floor-selector-btn ${selectedFloor === 'Ground Floor' ? 'active' : ''}`}
          onClick={() => {
            setSelectedFloor('Ground Floor')
            setSelectedZone('All Sections')
            setFilterStatus('all')
          }}
        >
          <span className="floor-icon">🅿️</span>
          <span>
            <strong>Ground Floor</strong>
            <small>Girls Scooty &bull; 80 Slots</small>
          </span>
        </button>

        <button
          type="button"
          className={`floor-selector-btn ${selectedFloor === 'Basement' ? 'active' : ''}`}
          onClick={() => {
            setSelectedFloor('Basement')
            setSelectedZone('All Sections')
            setFilterStatus('all')
          }}
        >
          <span className="floor-icon">🅿️</span>
          <span>
            <strong>Basement</strong>
            <small>Boys Two-Wheeler &bull; 80 Slots</small>
          </span>
        </button>
      </div>

      {/* Floor Info Banner */}
      <div className="parking-floor-header glass-card">
        <div>
          <span className="floor-label">ACTIVE CAMPUS PARKING ZONE</span>
          <h2>{selectedFloor}</h2>
          <p>
            {selectedFloor === 'Ground Floor'
              ? "Girls' Scooty Parking • Accounts Dept & Exam IT Dept Wings"
              : "Boys' Two-Wheeler Parking • Rows 1 through 4 Grid"}
          </p>
        </div>

        <div className="floor-capacity">
          <strong>{availableCount}</strong>
          <span>Bays Available of {floorSlots.length || 80}</span>
        </div>
      </div>

      {/* Toolbar & Filters */}
      <div className="map-toolbar simple-toolbar glass-card">
        {/* Search */}
        <div className="search-box">
          <SearchIcon className="w-4 h-4 text-muted" />
          <input
            type="text"
            placeholder="Search bay ID (e.g. G-05), plate, or student..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          {searchQuery && (
            <button
              type="button"
              className="clear-btn"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search query"
            >
              ×
            </button>
          )}
        </div>

        {/* Section Filters */}
        <div className="zone-filter-pills">
          <button
            type="button"
            className={`filter-pill ${selectedZone === 'All Sections' ? 'active' : ''}`}
            onClick={() => setSelectedZone('All Sections')}
          >
            All Sections
          </button>

          {currentSections.map((section) => (
            <button
              key={section.id}
              type="button"
              className={`filter-pill ${selectedZone === section.section ? 'active' : ''}`}
              onClick={() => setSelectedZone(section.section)}
            >
              {section.title} – {section.subtitle.split('(')[0]}
            </button>
          ))}
        </div>

        {/* Status Filters + Quick Book */}
        <div className="status-filter-group">
          <div className="status-toggle-btns">
            <button
              type="button"
              className={`status-btn ${filterStatus === 'all' ? 'active' : ''}`}
              onClick={() => setFilterStatus('all')}
            >
              All ({floorSlots.length})
            </button>

            <button
              type="button"
              className={`status-btn available ${filterStatus === 'available' ? 'active' : ''}`}
              onClick={() => setFilterStatus('available')}
            >
              Open ({availableCount})
            </button>

            <button
              type="button"
              className={`status-btn occupied ${filterStatus === 'occupied' ? 'active' : ''}`}
              onClick={() => setFilterStatus('occupied')}
            >
              Occ ({occupiedCount})
            </button>

            <button
              type="button"
              className={`status-btn reserved ${filterStatus === 'reserved' ? 'active' : ''}`}
              onClick={() => setFilterStatus('reserved')}
            >
              Res ({reservedCount})
            </button>
          </div>

          <button
            type="button"
            className="btn btn-primary book-slot-btn"
            onClick={() => onOpenBooking && onOpenBooking(null)}
          >
            <PlusCircleIcon className="w-4 h-4" />
            <span>Reserve Bay</span>
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="map-legend simple-legend">
        <div className="legend-item">
          <span className="legend-dot status-available" />
          <span>Available ({availableCount})</span>
        </div>

        <div className="legend-item">
          <span className="legend-dot status-occupied" />
          <span>Occupied ({occupiedCount})</span>
        </div>

        <div className="legend-item">
          <span className="legend-dot status-reserved" />
          <span>Reserved ({reservedCount})</span>
        </div>

        <div className="legend-item">
          <span className="legend-dot status-ev" />
          <span>⚡ EV Charger Ready</span>
        </div>
      </div>

      {/* Parking 80-Slot Grid */}
      {filteredSlots.length > 0 ? (
        <div className="parking-layout">
          {filteredSlots.map(renderSlot)}
        </div>
      ) : (
        <div className="empty-state glass-card">
          <ShieldIcon className="w-10 h-10 text-muted" />
          <p>No parking slots match the selected filters on {selectedFloor}.</p>
          <button
            type="button"
            className="btn btn-secondary mt-2"
            onClick={resetFilters}
          >
            Reset Filters
          </button>
        </div>
      )}
    </div>
  )
}