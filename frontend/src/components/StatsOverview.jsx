import React from 'react'
import { CarIcon, BikeIcon, EvIcon, ShieldIcon } from './Icons'

export default function StatsOverview({ slots }) {
  const total = slots.length
  const occupied = slots.filter((s) => s.status === 'occupied').length
  const reserved = slots.filter((s) => s.status === 'reserved').length
  const available = slots.filter((s) => s.status === 'available').length

  const occupancyRate = Math.round(((occupied + reserved) / total) * 100) || 0

  const evAvailable = slots.filter((s) => s.type === 'ev' && s.status === 'available').length
  const evTotal = slots.filter((s) => s.type === 'ev').length

  const bikeAvailable = slots.filter((s) => s.type === 'bike' && s.status === 'available').length
  const bikeTotal = slots.filter((s) => s.type === 'bike').length

  return (
    <section className="stats-grid">
      <div className="stat-card">
        <div className="stat-icon-box bg-cyan-glow">
          <CarIcon className="w-6 h-6 text-cyan" />
        </div>
        <div className="stat-details">
          <span className="stat-label">Available Slots</span>
          <div className="stat-value-group">
            <span className="stat-number text-emerald">{available}</span>
            <span className="stat-total">/ {total} Total</span>
          </div>
          <div className="stat-subtext">
            <span className="badge-available-pill">Ready to park</span>
          </div>
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-icon-box bg-rose-glow">
          <ShieldIcon className="w-6 h-6 text-rose" />
        </div>
        <div className="stat-details">
          <span className="stat-label">Occupied / Reserved</span>
          <div className="stat-value-group">
            <span className="stat-number text-rose">{occupied + reserved}</span>
            <span className="stat-sub-info">({occupied} Occ, {reserved} Res)</span>
          </div>
          <div className="progress-bar-container">
            <div className="progress-bar-fill" style={{ width: `${occupancyRate}%` }}></div>
          </div>
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-icon-box bg-amber-glow">
          <EvIcon className="w-6 h-6 text-amber" />
        </div>
        <div className="stat-details">
          <span className="stat-label">EV Fast Chargers</span>
          <div className="stat-value-group">
            <span className="stat-number text-amber">{evAvailable}</span>
            <span className="stat-total">/ {evTotal} Active</span>
          </div>
          <div className="stat-subtext">
            <span>{evAvailable > 0 ? '⚡ Ports Available' : '⚡ Fully Occupied'}</span>
          </div>
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-icon-box bg-indigo-glow">
          <BikeIcon className="w-6 h-6 text-indigo" />
        </div>
        <div className="stat-details">
          <span className="stat-label">Two-Wheeler Zone</span>
          <div className="stat-value-group">
            <span className="stat-number text-indigo">{bikeAvailable}</span>
            <span className="stat-total">/ {bikeTotal} Free</span>
          </div>
          <div className="stat-subtext">
            <span>Campus Scooter/Bikes</span>
          </div>
        </div>
      </div>
    </section>
  )
}
