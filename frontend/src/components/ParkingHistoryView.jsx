import { useState, useMemo } from 'react'
import {
  ActivityIcon,
  SearchIcon,
  ShieldIcon,
  CheckIcon
} from './Icons'

export default function ParkingHistoryView({ history = [] }) {
  const [search, setSearch] = useState('')
  const [floorFilter, setFloorFilter] = useState('all') // 'all' | 'Ground Floor' | 'Basement'

  const filteredHistory = useMemo(() => {
    return history.filter((item) => {
      const matchFloor = floorFilter === 'all' || item.floor === floorFilter
      const q = search.toLowerCase().trim()
      const matchSearch =
        !q ||
        (item.studentName && item.studentName.toLowerCase().includes(q)) ||
        (item.rollNumber && item.rollNumber.toLowerCase().includes(q)) ||
        (item.vehicleNumber && item.vehicleNumber.toLowerCase().includes(q)) ||
        (item.slotId && item.slotId.toLowerCase().includes(q)) ||
        (item.stream && item.stream.toLowerCase().includes(q))
      return matchFloor && matchSearch
    })
  }, [history, floorFilter, search])

  return (
    <div className="parking-history-container glass-card">
      <div className="history-header">
        <div className="history-title-wrap">
          <ActivityIcon className="w-5 h-5 text-emerald" />
          <div>
            <h3>Saved Parking History &amp; Checkout Archive</h3>
            <p>Persistent logs of completed parking sessions, exit timestamps, and recorded durations</p>
          </div>
        </div>

        <div className="history-controls">
          <div className="search-box">
            <SearchIcon className="w-4 h-4 text-muted" />
            <input
              type="text"
              placeholder="Search student, roll number, vehicle plate, or bay..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="search-input"
            />
            {search && (
              <button
                type="button"
                className="clear-search-btn"
                onClick={() => setSearch('')}
              >
                ×
              </button>
            )}
          </div>

          <div className="action-filter-pills">
            <button
              type="button"
              className={`pill-btn ${floorFilter === 'all' ? 'active' : ''}`}
              onClick={() => setFloorFilter('all')}
            >
              All Records ({history.length})
            </button>
            <button
              type="button"
              className={`pill-btn ${floorFilter === 'Ground Floor' ? 'active' : ''}`}
              onClick={() => setFloorFilter('Ground Floor')}
            >
              🛵 Ground Floor
            </button>
            <button
              type="button"
              className={`pill-btn ${floorFilter === 'Basement' ? 'active' : ''}`}
              onClick={() => setFloorFilter('Basement')}
            >
              🏍️ Basement
            </button>
          </div>
        </div>
      </div>

      <div className="history-table-wrapper">
        {filteredHistory.length === 0 ? (
          <div className="empty-table-state">
            <span className="empty-icon">📜</span>
            <p>No completed parking history records found matching your filters.</p>
          </div>
        ) : (
          <table className="history-table">
            <thead>
              <tr>
                <th>Record ID</th>
                <th>Student &amp; Roll Number</th>
                <th>Stream / Class</th>
                <th>Vehicle Plate &amp; Type</th>
                <th>Assigned Slot</th>
                <th>Entry Time</th>
                <th>Exit Time</th>
                <th>Total Parked Duration</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredHistory.map((item) => (
                <tr key={item.id} className="history-row">
                  <td className="font-mono text-muted text-xs">{item.id}</td>
                  <td>
                    <div className="student-cell">
                      <strong className="student-name-text">{item.studentName || 'Campus User'}</strong>
                      {item.rollNumber && <span className="roll-pill">{item.rollNumber}</span>}
                    </div>
                  </td>
                  <td>
                    <span className="stream-badge" title={item.stream}>
                      {item.stream || 'General'}
                    </span>
                  </td>
                  <td>
                    <div className="plate-cell-wrap">
                      <span className="plate-badge-mono font-mono">{item.vehicleNumber}</span>
                      <span className="text-muted text-xs">
                        {item.vehicleType === 'scooty' ? '🛵 Scooty' : '🏍️ Bike'}
                      </span>
                    </div>
                  </td>
                  <td>
                    <span className="slot-pill-sm font-bold text-cyan">{item.slotId}</span>
                  </td>
                  <td className="font-mono text-muted">{item.entryTime}</td>
                  <td className="font-mono text-muted">{item.exitTime}</td>
                  <td>
                    <span className="duration-tag font-mono font-bold text-emerald">
                      {item.duration}
                    </span>
                  </td>
                  <td>
                    <span className="status-completed-badge">
                      <CheckIcon className="w-3 h-3 text-emerald" /> Completed
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
