import { useState } from 'react'
import { SearchIcon, ActivityIcon } from './Icons'

export default function LiveVehicleLog({ logs = [] }) {
  const [filterAction, setFilterAction] = useState('ALL')
  const [search, setSearch] = useState('')

  const filteredLogs = logs.filter((log) => {
    const matchAction = filterAction === 'ALL' || log.action === filterAction
    const query = search.toLowerCase().trim()
    const matchSearch =
      !query ||
      (log.plate && log.plate.toLowerCase().includes(query)) ||
      (log.slot && log.slot.toLowerCase().includes(query)) ||
      (log.category && log.category.toLowerCase().includes(query)) ||
      (log.gate && log.gate.toLowerCase().includes(query))
    return matchAction && matchSearch
  })

  return (
    <div className="activity-logs-container glass-card">
      <div className="logs-header">
        <div className="logs-title-wrap">
          <ActivityIcon className="w-5 h-5 text-cyan" />
          <h3>Real-Time Gate Telemetry &amp; Access Logs</h3>
        </div>

        <div className="logs-controls">
          <div className="search-box">
            <SearchIcon className="w-4 h-4 text-muted" />
            <input
              type="text"
              placeholder="Search by plate, slot, or role..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="search-input"
            />
            {search && (
              <button
                type="button"
                className="clear-search-btn"
                onClick={() => setSearch('')}
                aria-label="Clear search"
              >
                ×
              </button>
            )}
          </div>

          <div className="action-filter-pills">
            <button
              type="button"
              className={`pill-btn ${filterAction === 'ALL' ? 'active' : ''}`}
              onClick={() => setFilterAction('ALL')}
            >
              All Events ({logs.length})
            </button>
            <button
              type="button"
              className={`pill-btn ${filterAction === 'ENTRY' ? 'active' : ''}`}
              onClick={() => setFilterAction('ENTRY')}
            >
              🟢 Inbound Entries ({logs.filter((l) => l.action === 'ENTRY').length})
            </button>
            <button
              type="button"
              className={`pill-btn ${filterAction === 'EXIT' ? 'active' : ''}`}
              onClick={() => setFilterAction('EXIT')}
            >
              🔴 Outbound Exits ({logs.filter((l) => l.action === 'EXIT').length})
            </button>
          </div>
        </div>
      </div>

      <div className="logs-table-wrapper">
        <table className="logs-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Action</th>
              <th>Vehicle Plate</th>
              <th>Assigned Bay</th>
              <th>User Category</th>
              <th>Gate Station</th>
              <th>Duration / Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.length === 0 ? (
              <tr>
                <td colSpan="7" className="empty-table-cell">
                  No activity log entries match your criteria.
                </td>
              </tr>
            ) : (
              filteredLogs.map((item) => (
                <tr key={item.id} className="log-row">
                  <td className="time-cell">{item.timestamp}</td>
                  <td>
                    <span className={`log-badge ${item.action.toLowerCase()}`}>
                      {item.action === 'ENTRY' ? '↳ INBOUND' : '↲ OUTBOUND'}
                    </span>
                  </td>
                  <td className="plate-cell font-mono">{item.plate}</td>
                  <td className="slot-cell">
                    <span className="slot-pill-sm">{item.slot || 'N/A'}</span>
                  </td>
                  <td>
                    <span className="cat-badge">{item.category || item.vehicleType || 'Student'}</span>
                  </td>
                  <td className="gate-cell">{item.gate || 'Main Gate 1 (ANPR)'}</td>
                  <td className="details-cell">
                    {item.action === 'EXIT' ? (
                      <span className="text-muted">Stay: {item.duration || '45m'} (Campus Free)</span>
                    ) : (
                      <span className="text-emerald">Checked In &bull; Parked</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
