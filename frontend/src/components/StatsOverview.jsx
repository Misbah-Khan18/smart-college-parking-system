import React from 'react'
import { CarIcon, EvIcon, BikeIcon, CheckIcon } from './Icons'

export default function StatsOverview({ slots }) {
  const total = slots.length
  const occupied = slots.filter((s) => s.status === 'occupied').length
  const reserved = slots.filter((s) => s.status === 'reserved').length
  const available = slots.filter((s) => s.status === 'available').length

  const evAvailable = slots.filter((s) => s.type === 'ev' && s.status === 'available').length
  const bikeAvailable = slots.filter((s) => s.type === 'bike' && s.status === 'available').length

  return (
    <section className="stats-grid simple-stats">
      {/* 1. Available Slots */}
      <div className="stat-card stat-available">
        <div className="stat-icon-box bg-cyan-glow">
          <CheckIcon className="w-5 h-5 text-cyan" />
        </div>
        <div className="stat-details">
          <span className="stat-label">Available Slots</span>
          <div className="stat-value-group">
            <span className="stat-number text-emerald">{available}</span>
            <span className="stat-total">/ {total} Total</span>
          </div>
        </div>
      </div>

      {/* 2. Occupied / Reserved */}
      <div className="stat-card stat-occupied">
        <div className="stat-icon-box bg-rose-glow">
          <CarIcon className="w-5 h-5 text-rose" />
        </div>
        <div className="stat-details">
          <span className="stat-label">Occupied / Reserved</span>
          <div className="stat-value-group">
            <span className="stat-number text-rose">{occupied + reserved}</span>
            <span className="stat-sub-info">({occupied} Occ &bull; {reserved} Res)</span>
          </div>
        </div>
      </div>

      {/* 3. EV & Two-Wheelers */}
      <div className="stat-card stat-special">
        <div className="stat-icon-box bg-amber-glow">
          <EvIcon className="w-5 h-5 text-amber" />
        </div>
        <div className="stat-details">
          <span className="stat-label">Special Bays Free</span>
          <div className="stat-value-group">
            <span className="stat-number text-amber">{evAvailable + bikeAvailable}</span>
            <span className="stat-sub-info">({evAvailable} EV &bull; {bikeAvailable} Bike)</span>
          </div>
        </div>
      </div>
    </section>
  )
}
