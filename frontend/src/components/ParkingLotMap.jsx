import React, { useState, useMemo } from 'react'
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
  const zones = ['All Zones', 'Zone A (Student Cars)', 'Zone B (Faculty & Staff)', 'Zone C (EV Charging)', 'Zone D (Two-Wheelers)']

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
        return <BikeIcon className="w-5 h-5" />
      case 'ev':
        return <EvIcon className="w-5 h-5" />
      default:
        return <CarIcon className="w-5 h-5" />
    }
  }

  return (
    <div className="parking-map-container">
      {/* Controls & Filter Bar */}
      <div className="map-toolbar">
        <div className="search-box">
          <SearchIcon className="w-4 h-4 text-muted" />
          <input
            type="text"
            placeholder="Search slot (e.g. A-02), plate, or name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          {searchQuery && (
            <button type="button" className="clear-btn" onClick={() => setSearchQuery('')}>×</button>
          )}
        </div>

        <div className="zone-filter-pills">
          {zones.map((zone) => (
            <button
              key={zone}
              type="button"
              className={`filter-pill ${selectedZone === zone ? 'active' : ''}`}
              onClick={() => setSelectedZone(zone)}
            >
              {zone.replace(/ \(.*\)/, '')}
            </button>
          ))}
        </div>

        <div className="status-filter-group">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="status-dropdown"
          >
            <option value="all">All Statuses</option>
            <option value="available">🟢 Available</option>
            <option value="occupied">🔴 Occupied</option>
            <option value="reserved">🟡 Reserved</option>
          </select>

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

      {/* Map Legend */}
      <div className="map-legend">
        <div className="legend-item">
          <span className="legend-dot status-available"></span>
          <span>Available ({slots.filter(s => s.status === 'available').length})</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot status-occupied"></span>
          <span>Occupied ({slots.filter(s => s.status === 'occupied').length})</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot status-reserved"></span>
          <span>Reserved ({slots.filter(s => s.status === 'reserved').length})</span>
        </div>
        <div className="legend-item">
          <span className="legend-badge-ev">⚡ EV Charging Slot</span>
        </div>
      </div>

      {/* Slots Grid */}
      <div className="slots-grid-view">
        {filteredSlots.length === 0 ? (
          <div className="empty-state">
            <ShieldIcon className="w-12 h-12 text-muted" />
            <p>No parking slots match the selected filter criteria.</p>
            <button type="button" className="btn btn-secondary" onClick={() => { setSelectedZone('All Zones'); setFilterStatus('all'); setSearchQuery(''); }}>
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
                    {slot.type === 'bike' && <span className="bike-tag">🏍️ 2W</span>}
                  </div>
                  <div className="slot-type-icon">{getVehicleIcon(slot.type)}</div>
                </div>

                <div className="slot-body">
                  <div className="slot-status-indicator">
                    <span className={`status-pill ${slot.status}`}>
                      {slot.status.toUpperCase()}
                    </span>
                  </div>

                  {isOccupied && (
                    <div className="slot-info">
                      <span className="plate-num">{slot.plate}</span>
                      <span className="owner-name">{slot.owner || 'Registered User'}</span>
                      {slot.entryTime && (
                        <span className="time-tag">Entry: {slot.entryTime}</span>
                      )}
                    </div>
                  )}

                  {isReserved && (
                    <div className="slot-info">
                      <span className="plate-num">{slot.plate}</span>
                      <span className="owner-name">{slot.owner}</span>
                      {slot.reservedUntil && (
                        <span className="time-tag reserved">Until: {slot.reservedUntil}</span>
                      )}
                    </div>
                  )}

                  {isAvailable && (
                    <div className="slot-info available-info">
                      <span className="ready-text">Slot Ready</span>
                      <span className="zone-hint">{slot.zone.split(' ')[1]}</span>
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
                      Reserve Now
                    </button>
                  ) : (
                    <div className="occupied-actions">
                      {(currentRole === 'Security Admin' || currentRole === 'Faculty') && (
                        <button
                          type="button"
                          className="btn-slot-action btn-release"
                          onClick={() => onReleaseSlot(slot.id)}
                          title="Checkout vehicle & clear slot"
                        >
                          Checkout / Release
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
