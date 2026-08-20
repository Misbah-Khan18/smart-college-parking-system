import React from 'react'
import { HOURLY_TRAFFIC_DATA } from '../data/initialSlots'
import { BarChartIcon, CheckIcon, CarIcon, EvIcon, BikeIcon, ShieldIcon } from './Icons'

export default function AnalyticsView({ slots }) {
  const total = slots.length
  const occupied = slots.filter((s) => s.status === 'occupied').length
  const reserved = slots.filter((s) => s.status === 'reserved').length
  const available = slots.filter((s) => s.status === 'available').length

  const occupancyRate = Math.round(((occupied + reserved) / total) * 100) || 0

  const zones = [
    {
      name: 'Zone A - Student Cars',
      icon: <CarIcon className="w-5 h-5 text-cyan" />,
      glowClass: 'bg-cyan-glow',
      barColor: '#06b6d4',
      slots: slots.filter((s) => s.zone.includes('Zone A')),
    },
    {
      name: 'Zone B - Faculty & Staff',
      icon: <ShieldIcon className="w-5 h-5 text-indigo" />,
      glowClass: 'bg-indigo-glow',
      barColor: '#6366f1',
      slots: slots.filter((s) => s.zone.includes('Zone B')),
    },
    {
      name: 'Zone C - EV Fast Charging',
      icon: <EvIcon className="w-5 h-5 text-amber" />,
      glowClass: 'bg-amber-glow',
      barColor: '#f59e0b',
      slots: slots.filter((s) => s.zone.includes('Zone C')),
    },
    {
      name: 'Zone D - Two-Wheelers & Bikes',
      icon: <BikeIcon className="w-5 h-5 text-emerald" />,
      glowClass: 'bg-cyan-glow',
      barColor: '#10b981',
      slots: slots.filter((s) => s.zone.includes('Zone D')),
    },
  ]

  return (
    <div className="analytics-view-container">
      {/* Top 3 Live Metrics */}
      <div className="analytics-top-grid">
        {/* Real-time Empty Slots */}
        <div className="analytics-card glass-card">
          <div className="card-header-clean">
            <span className="card-sub">Real-Time Empty Slots</span>
            <h3 className="text-emerald font-bold">{available} Bays Open</h3>
          </div>
          <p className="card-hint">{total - available} occupied or reserved out of {total} total campus slots</p>
          <div className="progress-bar-container mt-2">
            <div
              className="progress-bar-fill"
              style={{
                width: `${(available / total) * 100}%`,
                background: 'linear-gradient(90deg, #10b981, #06b6d4)'
              }}
            ></div>
          </div>
        </div>

        {/* Overall Campus Utilization */}
        <div className="analytics-card glass-card">
          <div className="card-header-clean">
            <span className="card-sub">Campus Occupancy Rate</span>
            <h3 className="text-cyan font-bold">{occupancyRate}% Load</h3>
          </div>
          <p className="card-hint">
            {occupancyRate >= 80 ? '⚠️ High campus traffic' : '🟢 Smooth parking flow'}
          </p>
          <div className="progress-bar-container mt-2">
            <div
              className="progress-bar-fill"
              style={{ width: `${occupancyRate}%` }}
            ></div>
          </div>
        </div>

        {/* Peak Window Prediction */}
        <div className="analytics-card glass-card">
          <div className="card-header-clean">
            <span className="card-sub">Peak Rush Window</span>
            <h3>09:00 AM - 11:30 AM</h3>
          </div>
          <p className="card-hint">Morning lectures & lab commencement period</p>
          <div className="mt-2">
            <span className="badge-warning-pill">Expect High Demand</span>
          </div>
        </div>
      </div>

      {/* Real-time Empty Slots by Zone Breakdown */}
      <div className="zones-breakdown-section">
        <h3 className="section-title">Real-Time Available Slots by Zone</h3>
        <div className="zones-breakdown-grid">
          {zones.map((z, idx) => {
            const zTotal = z.slots.length
            const zEmptySlots = z.slots.filter((s) => s.status === 'available')
            const zEmptyCount = zEmptySlots.length
            const zOccRate = zTotal ? Math.round(((zTotal - zEmptyCount) / zTotal) * 100) : 0

            return (
              <div key={idx} className="breakdown-card glass-card">
                <div className="b-header">
                  <div className={`b-icon-wrap ${z.glowClass}`}>
                    {z.icon}
                  </div>
                  <div>
                    <h4>{z.name}</h4>
                    <span className="text-muted">{zTotal} Total Bays</span>
                  </div>
                </div>

                <div className="b-stat">
                  <span className="b-percent text-emerald font-bold">
                    {zEmptyCount} Empty Bays
                  </span>
                  <span className="text-muted">{zOccRate}% Occupied</span>
                </div>

                <div className="progress-bar-container">
                  <div
                    className="progress-bar-fill"
                    style={{
                      width: `${zOccRate}%`,
                      background: z.barColor
                    }}
                  ></div>
                </div>

                {/* Available Slot Chips */}
                <div className="empty-chips-row">
                  <span className="chips-label">Available Slots:</span>
                  {zEmptySlots.length === 0 ? (
                    <span className="no-slots-badge">Full</span>
                  ) : (
                    zEmptySlots.map((s) => (
                      <span key={s.id} className="empty-slot-chip">
                        {s.id}
                      </span>
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Hourly Traffic Chart */}
      <div className="chart-section glass-card">
        <div className="chart-header">
          <div className="chart-title-wrap">
            <BarChartIcon className="w-5 h-5 text-cyan" />
            <h3>Today's Hourly Parking Occupancy Trend</h3>
          </div>
          <span className="chart-badge">Live Telemetry</span>
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
    </div>
  )
}
