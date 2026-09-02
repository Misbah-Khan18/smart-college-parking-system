import { useState } from 'react'
import { HOURLY_TRAFFIC_DATA } from '../data/initialSlots'
import { BarChartIcon, BikeIcon, ShieldIcon, ActivityIcon } from './Icons'

export default function AnalyticsView({ slots = [] }) {
  const [selectedFloorTab, setSelectedFloorTab] = useState('all') // 'all' | 'ground' | 'basement'

  const total = slots.length || 160
  const occupied = slots.filter((s) => s.status === 'occupied').length
  const reserved = slots.filter((s) => s.status === 'reserved').length
  const available = slots.filter((s) => s.status === 'available').length

  const occupancyRate = Math.round(((occupied + reserved) / total) * 100) || 0

  const groundSections = [
    {
      id: 'g-acc-front',
      name: 'Accounts Dept • Front Side',
      subtitle: 'G-01 to G-20',
      floor: 'Ground Floor',
      sectionName: 'Accounts Department - Front Side',
      color: '#06b6d4',
      slots: slots.filter((s) => s.section === 'Accounts Department - Front Side')
    },
    {
      id: 'g-acc-opp',
      name: 'Accounts Dept • Opposite Side',
      subtitle: 'G-21 to G-40',
      floor: 'Ground Floor',
      sectionName: 'Accounts Department - Opposite Side',
      color: '#3b82f6',
      slots: slots.filter((s) => s.section === 'Accounts Department - Opposite Side')
    },
    {
      id: 'g-exam-front',
      name: 'Exam / IT Dept • Front Side',
      subtitle: 'G-41 to G-60',
      floor: 'Ground Floor',
      sectionName: 'Exam IT Department - Front Side',
      color: '#6366f1',
      slots: slots.filter((s) => s.section === 'Exam IT Department - Front Side')
    },
    {
      id: 'g-exam-opp',
      name: 'Exam / IT Dept • Opposite Side',
      subtitle: 'G-61 to G-80',
      floor: 'Ground Floor',
      sectionName: 'Exam IT Department - Opposite Side',
      color: '#10b981',
      slots: slots.filter((s) => s.section === 'Exam IT Department - Opposite Side')
    }
  ]

  const basementSections = [
    {
      id: 'b-row-1',
      name: 'Basement Row 1 • Entry Side',
      subtitle: 'B-01 to B-20',
      floor: 'Basement',
      sectionName: 'Basement Row 1',
      color: '#f59e0b',
      slots: slots.filter((s) => s.section === 'Basement Row 1')
    },
    {
      id: 'b-row-2',
      name: 'Basement Row 2 • Center Lane',
      subtitle: 'B-21 to B-40',
      floor: 'Basement',
      sectionName: 'Basement Row 2',
      color: '#06b6d4',
      slots: slots.filter((s) => s.section === 'Basement Row 2')
    },
    {
      id: 'b-row-3',
      name: 'Basement Row 3 • Rear Lane',
      subtitle: 'B-41 to B-60',
      floor: 'Basement',
      sectionName: 'Basement Row 3',
      color: '#ec4899',
      slots: slots.filter((s) => s.section === 'Basement Row 3')
    },
    {
      id: 'b-row-4',
      name: 'Basement Row 4 • Ramp Exit',
      subtitle: 'B-61 to B-80',
      floor: 'Basement',
      sectionName: 'Basement Row 4',
      color: '#8b5cf6',
      slots: slots.filter((s) => s.section === 'Basement Row 4')
    }
  ]

  const allSections = [...groundSections, ...basementSections]

  const displayedSections =
    selectedFloorTab === 'ground'
      ? groundSections
      : selectedFloorTab === 'basement'
      ? basementSections
      : allSections

  return (
    <div className="analytics-view-container">
      {/* Top 3 Live Metrics */}
      <div className="analytics-top-grid">
        {/* Real-time Empty Slots */}
        <div className="analytics-card glass-card">
          <div className="card-header-clean">
            <span className="card-sub">Real-Time Available Slots</span>
            <h3 className="text-emerald font-bold">{available} Bays Open</h3>
          </div>
          <p className="card-hint">
            {occupied + reserved} occupied/reserved out of {total} total campus bays
          </p>
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
            <span className="card-sub">Campus Occupancy Load</span>
            <h3 className="text-cyan font-bold">{occupancyRate}% Utilization</h3>
          </div>
          <p className="card-hint">
            {occupancyRate >= 80
              ? '⚠️ High campus traffic - near capacity'
              : '🟢 Optimal parking availability & smooth flow'}
          </p>
          <div className="progress-bar-container mt-2">
            <div
              className="progress-bar-fill"
              style={{
                width: `${occupancyRate}%`,
                background:
                  occupancyRate >= 80
                    ? 'linear-gradient(90deg, #f59e0b, #f43f5e)'
                    : 'linear-gradient(90deg, #3b82f6, #06b6d4)'
              }}
            ></div>
          </div>
        </div>

        {/* Peak Window Prediction */}
        <div className="analytics-card glass-card">
          <div className="card-header-clean">
            <span className="card-sub">Peak Inbound Window</span>
            <h3>08:30 AM – 10:45 AM</h3>
          </div>
          <p className="card-hint">Morning lectures, practicals &amp; faculty arrival wave</p>
          <div className="mt-2">
            <span className="badge-warning-pill">Expect Heavy Two-Wheeler Inflow</span>
          </div>
        </div>
      </div>

      {/* Real-time Section Breakdown with Floor Filter */}
      <div className="zones-breakdown-section">
        <div className="breakdown-header-row">
          <div className="title-with-icon">
            <ActivityIcon className="w-5 h-5 text-cyan" />
            <h3 className="section-title">Section-by-Section Capacity &amp; Telemetry</h3>
          </div>

          <div className="floor-filter-pills">
            <button
              type="button"
              className={`pill-filter-btn ${selectedFloorTab === 'all' ? 'active' : ''}`}
              onClick={() => setSelectedFloorTab('all')}
            >
              All Sections (8)
            </button>
            <button
              type="button"
              className={`pill-filter-btn ${selectedFloorTab === 'ground' ? 'active' : ''}`}
              onClick={() => setSelectedFloorTab('ground')}
            >
              Ground Floor &bull; Girls Scooty
            </button>
            <button
              type="button"
              className={`pill-filter-btn ${selectedFloorTab === 'basement' ? 'active' : ''}`}
              onClick={() => setSelectedFloorTab('basement')}
            >
              Basement &bull; Boys Parking
            </button>
          </div>
        </div>

        <div className="zones-breakdown-grid">
          {displayedSections.map((sec) => {
            const secTotal = sec.slots.length || 20
            const secEmpty = sec.slots.filter((s) => s.status === 'available')
            const secEmptyCount = secEmpty.length
            const secOccCount = secTotal - secEmptyCount
            const secOccRate = Math.round((secOccCount / secTotal) * 100) || 0

            return (
              <div key={sec.id} className="breakdown-card glass-card">
                <div className="b-header">
                  <div className="b-icon-wrap" style={{ background: `${sec.color}22`, border: `1px solid ${sec.color}44` }}>
                    {sec.floor === 'Ground Floor' ? (
                      <BikeIcon className="w-5 h-5" style={{ color: sec.color }} />
                    ) : (
                      <ShieldIcon className="w-5 h-5" style={{ color: sec.color }} />
                    )}
                  </div>
                  <div>
                    <h4>{sec.name}</h4>
                    <span className="text-muted">{sec.floor} &bull; {sec.subtitle}</span>
                  </div>
                </div>

                <div className="b-stat">
                  <span className="b-percent text-emerald font-bold">
                    {secEmptyCount} Free / {secTotal} Total
                  </span>
                  <span className="text-muted">{secOccRate}% Occupied</span>
                </div>

                <div className="progress-bar-container">
                  <div
                    className="progress-bar-fill"
                    style={{
                      width: `${secOccRate}%`,
                      background: sec.color
                    }}
                  ></div>
                </div>

                {/* Available Slot Chips */}
                <div className="empty-chips-row">
                  <span className="chips-label">Open Bays:</span>
                  {secEmptyCount === 0 ? (
                    <span className="no-slots-badge">Section Full</span>
                  ) : (
                    <div className="chips-scroll">
                      {secEmpty.slice(0, 8).map((s) => (
                        <span key={s.id} className="empty-slot-chip">
                          {s.id}
                        </span>
                      ))}
                      {secEmptyCount > 8 && (
                        <span className="empty-slot-chip-more">+{secEmptyCount - 8} more</span>
                      )}
                    </div>
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
          <span className="chart-badge">Live Sensor Telemetry</span>
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
