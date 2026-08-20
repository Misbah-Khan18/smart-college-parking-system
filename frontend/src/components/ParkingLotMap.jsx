import React, { useMemo } from 'react'
import { CarIcon, BikeIcon, EvIcon, SearchIcon, PlusCircleIcon, ShieldIcon } from './Icons'

export default function ParkingLotMap({
  slots,
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
  const zones = [
    { label: 'All Bays', value: 'All Zones' },
    { label: 'Zone A (Student)', value: 'Zone A (Student Cars)' },
    { label: 'Zone B (Faculty)', value: 'Zone B (Faculty & Staff)' },
    { label: 'Zone C (EV Charging)', value: 'Zone C (EV Charging)' },
    { label: 'Zone D (Two-Wheelers)', value: 'Zone D (Two-Wheelers)' },
  ]

  const filteredSlots = useMemo(() => {
    return slots.filter((slot) => {
      const matchZone = selectedZone === 'All Zones' || slot.zone === selectedZone
      const matchStatus = filterStatus === 'all' || slot.status === filterStatus
      const matchSearch =
        slot.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (slot.plate && slot.plate.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (slot.owner && slot.owner.toLowerCase().includes(searchQuery.toLowerCase()))
      return matchZone && matchStatus && matchSearch
    })
  }, [slots, selectedZone, filterStatus, searchQuery])

  const getVehicleIcon = (type) => {
    switch (type) {
      case 'bike':
        return <BikeIcon className="w-4 h-4" />
      case 'ev':
        return <EvIcon className="w-4 h-4" />
      default:
        return <CarIcon className="w-4 h-4" />
    }
  }

  return (
    <div className="parking-map-container">
      {/* Controls & Filter Bar */}
      <div className="map-toolbar simple-toolbar">
        {/* Search */}
        <div className="search-box">
          <SearchIcon className="w-4 h-4 text-muted" />
          <input
            type="text"
            placeholder="Search slot (e.g. A-01), plate, or name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          {searchQuery && (
            <button type="button" className="clear-btn" onClick={() => setSearchQuery('')}>×</button>
          )}
        </div>

        {/* Zone Filter Buttons */}
        <div className="zone-filter-pills">
          {zones.map((z) => (
            <button
              key={z.value}
              type="button"
              className={`filter-pill ${selectedZone === z.value ? 'active' : ''}`}
              onClick={() => setSelectedZone(z.value)}
            >
              {z.label}
            </button>
          ))}
        </div>

        {/* Status Filter & Book Action */}
        <div className="status-filter-group">
          <div className="status-toggle-btns">
            <button
              type="button"
              className={`status-btn ${filterStatus === 'all' ? 'active' : ''}`}
              onClick={() => setFilterStatus('all')}
            >
              All
            </button>
            <button
              type="button"
              className={`status-btn available ${filterStatus === 'available' ? 'active' : ''}`}
              onClick={() => setFilterStatus('available')}
            >
              Available
            </button>
            <button
              type="button"
              className={`status-btn occupied ${filterStatus === 'occupied' ? 'active' : ''}`}
              onClick={() => setFilterStatus('occupied')}
            >
              Occupied
            </button>
          </div>

          <button
            type="button"
            className="btn btn-primary book-slot-btn"
            onClick={() => onOpenBooking(null)}
          >
            <PlusCircleIcon className="w-4 h-4" />
            <span>Book Slot</span>
          </button>
        </div>
      </div>

      {/* Clean Legend */}
      <div className="map-legend simple-legend">
        <div className="legend-item">
          <span className="legend-dot status-available"></span>
          <span>Available ({slots.filter((s) => s.status === 'available').length})</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot status-occupied"></span>
          <span>Occupied ({slots.filter((s) => s.status === 'occupied').length})</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot status-reserved"></span>
          <span>Reserved ({slots.filter((s) => s.status === 'reserved').length})</span>
        </div>
      </div>

      {/* Clean Slots Grid */}
      <div className="slots-grid-view">
        {filteredSlots.length === 0 ? (
          <div className="empty-state">
            <ShieldIcon className="w-10 h-10 text-muted" />
            <p>No parking slots match the selected filters.</p>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setSelectedZone('All Zones')
                setFilterStatus('all')
                setSearchQuery('')
              }}
            >
              Reset Filters
            </button>
          </div>
        ) : (
          filteredSlots.map((slot) => {
            const isAvailable = slot.status === 'available'
            const isOccupied = slot.status === 'occupied'
            const isReserved = slot.status === 'reserved'

            return (
              <div
                key={slot.id}
                className={`slot-card ${slot.status} ${slot.type === 'ev' ? 'is-ev' : ''}`}
                onClick={() => onSelectSlot(slot)}
              >
                <div className="slot-top-row">
                  <div className="slot-id-badge">
                    <span className="slot-id-text">{slot.id}</span>
                    {slot.type === 'ev' && <span className="ev-tag">⚡ EV</span>}
                  </div>
                  <div className="slot-type-icon">{getVehicleIcon(slot.type)}</div>
                </div>

                <div className="slot-body">
                  <div className="slot-status-indicator">
                    <span className={`status-pill ${slot.status}`}>
                      {slot.status}
                    </span>
                  </div>

                  {isOccupied && (
                    <div className="slot-info">
                      <span className="plate-num">{slot.plate}</span>
                      <span className="owner-name">{slot.owner || 'Occupied'}</span>
                    </div>
                  )}

                  {isReserved && (
                    <div className="slot-info">
                      <span className="plate-num">{slot.plate}</span>
                      <span className="owner-name">{slot.owner}</span>
                      {slot.reservedUntil && (
                        <span className="time-tag">Until {slot.reservedUntil}</span>
                      )}
                    </div>
                  )}

                  {isAvailable && (
                    <div className="slot-info available-info">
                      <span className="ready-text">Ready to park</span>
                    </div>
                  )}
                </div>

                <div className="slot-actions" onClick={(e) => e.stopPropagation()}>
                  {isAvailable ? (
                    <button
                      type="button"
                      className="btn-slot-action btn-book-quick"
                      onClick={() => onOpenBooking(slot)}
                    >
                      Book
                    </button>
                  ) : (
                    <div className="occupied-actions">
                      {(currentRole === 'Security Admin' || currentRole === 'Faculty') && (
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
          })
        )}
      </div>
    </div>
  )
}
