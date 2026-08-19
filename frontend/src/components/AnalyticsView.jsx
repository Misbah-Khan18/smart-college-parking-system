import React from 'react'
import { HOURLY_TRAFFIC_DATA } from '../data/initialSlots'
import { BarChartIcon, ShieldIcon, CarIcon, EvIcon, BikeIcon } from './Icons'

export default function AnalyticsView({ slots }) {
  const total = slots.length
  const occupied = slots.filter((s) => s.status === 'occupied').length
  const reserved = slots.filter((s) => s.status === 'reserved').length
  const available = slots.filter((s) => s.status === 'available').length

  const carSlots = slots.filter((s) => s.type === 'car')
  const evSlots = slots.filter((s) => s.type === 'ev')
  const bikeSlots = slots.filter((s) => s.type === 'bike')

  const getZoneOccupancy = (zoneSlots) => {
    if (!zoneSlots.length) return 0
    const taken = zoneSlots.filter((s) => s.status !== 'available').length
    return Math.round((taken / zoneSlots.length) * 100)
  }

  const carOcc = getZoneOccupancy(carSlots)
  const evOcc = getZoneOccupancy(evSlots)
  const bikeOcc = getZoneOccupancy(bikeSlots)

  return (
    <div className="analytics-view-container">
      {/* Top metrics */}
      <div className="analytics-top-grid">
        <div className="analytics-card glass-card">
          <div className="card-header-clean">
            <span className="card-sub">Campus Utilization Rate</span>
            <h3>{Math.round(((occupied + reserved) / total) * 100)}%</h3>
          </div>
          <p className="card-hint">Calculated across all 4 zones ({occupied + reserved} / {total} bays)</p>
          <div className="progress-bar-container mt-2">
            <div className="progress-bar-fill" style={{ width: `${((occupied + reserved) / total) * 100}%` }}></div>
          </div>
        </div>

        <div className="analytics-card glass-card">
          <div className="card-header-clean">
            <span className="card-sub">Peak Congestion Period</span>
            <h3>09:00 AM - 11:30 AM</h3>
          </div>
          <p className="card-hint">Morning lectures commencement rush</p>
          <span className="badge-warning-pill">High Demand Window</span>
        </div>

        <div className="analytics-card glass-card">
          <div className="card-header-clean">
            <span className="card-sub">EV Charging Efficiency</span>
            <h3>{evOcc}% Load</h3>
          </div>
          <p className="card-hint">{evSlots.filter(s => s.status === 'available').length} port(s) ready for fast recharge</p>
          <span className="badge-eco-pill">⚡ Zero Carbon Zone</span>
        </div>
      </div>

      {/* Hourly Traffic Chart Simulation */}
      <div className="chart-section glass-card">
        <div className="chart-header">
          <div className="chart-title-wrap">
            <BarChartIcon className="w-5 h-5 text-cyan" />
            <h3>Campus Parking Occupancy By Hour (Live Telemetry)</h3>
          </div>
          <span className="chart-badge">Today's Pattern</span>
        </div>

        <div className="chart-bar-graph">
          {HOURLY_TRAFFIC_DATA.map((item, idx) => {
            const isPeak = item.occupancy >= 80
            return (
              <div key={idx} className="bar-column">
                <div className="bar-value-tooltip">{item.occupancy}%</div>
                <div className="bar-track">
                  <div
                    className={`bar-fill ${isPeak ? 'bar-peak' : ''}`}
                    style={{ height: `${item.occupancy}%` }}
                  ></div>
                </div>
                <span className="bar-label">{item.hour}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Zone Breakdown Grid */}
      <div className="zones-breakdown-grid">
        <div className="breakdown-card glass-card">
          <div className="b-header">
            <div className="b-icon-wrap bg-cyan-glow">
              <CarIcon className="w-5 h-5 text-cyan" />
            </div>
            <div>
              <h4>Zone A & B (Cars & Faculty)</h4>
              <span className="text-muted">{carSlots.length} Slots Total</span>
            </div>
          </div>
          <div className="b-stat">
            <span className="b-percent">{carOcc}% Occupied</span>
            <span className="text-muted">{carSlots.filter(s => s.status === 'available').length} Available</span>
          </div>
          <div className="progress-bar-container">
            <div className="progress-bar-fill" style={{ width: `${carOcc}%` }}></div>
          </div>
        </div>

        <div className="breakdown-card glass-card">
          <div className="b-header">
            <div className="b-icon-wrap bg-amber-glow">
              <EvIcon className="w-5 h-5 text-amber" />
            </div>
            <div>
              <h4>Zone C (EV Green Fleet)</h4>
              <span className="text-muted">{evSlots.length} Slots Total</span>
            </div>
          </div>
          <div className="b-stat">
            <span className="b-percent text-amber">{evOcc}% Occupied</span>
            <span className="text-muted">{evSlots.filter(s => s.status === 'available').length} Ports Open</span>
          </div>
          <div className="progress-bar-container">
            <div className="progress-bar-fill fill-amber" style={{ width: `${evOcc}%` }}></div>
          </div>
        </div>

        <div className="breakdown-card glass-card">
          <div className="b-header">
            <div className="b-icon-wrap bg-indigo-glow">
              <BikeIcon className="w-5 h-5 text-indigo" />
            </div>
            <div>
              <h4>Zone D (Two-Wheelers)</h4>
              <span className="text-muted">{bikeSlots.length} Slots Total</span>
            </div>
          </div>
          <div className="b-stat">
            <span className="b-percent text-indigo">{bikeOcc}% Occupied</span>
            <span className="text-muted">{bikeSlots.filter(s => s.status === 'available').length} Spaces Free</span>
          </div>
          <div className="progress-bar-container">
            <div className="progress-bar-fill fill-indigo" style={{ width: `${bikeOcc}%` }}></div>
          </div>
        </div>
      </div>
    </div>
  )
}
