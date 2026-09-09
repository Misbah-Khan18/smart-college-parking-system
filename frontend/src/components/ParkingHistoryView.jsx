import { useState, useMemo } from 'react'
import { INITIAL_PARKING_HISTORY } from '../data/initialSlots'
import parkingHeroImg from '../assets/parking-history-hero.jpg'
import './ParkingHistoryView.css'

export default function ParkingHistoryView({
  history = [],
  user = null,
  userProfile = null
}) {
  const recordsData = history && history.length > 0 ? history : INITIAL_PARKING_HISTORY

  const studentName = userProfile?.displayName || user?.displayName
  const rollNumber = userProfile?.campusId || userProfile?.rollNumber
  const vehiclePlate = userProfile?.defaultPlate || userProfile?.vehicleNumber
  const stream = userProfile?.stream

  const [search, setSearch] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [statusFilter, setStatusFilter] = useState('all') // 'all' | 'Completed'
  const [vehicleFilter, setVehicleFilter] = useState('all') // 'all' | 'bike' | 'scooty'
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedRecord, setSelectedRecord] = useState(null)

  const PAGE_SIZE = 6

  // Format date helper: "2026-09-01" -> "Sep 01, 2026"
  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return 'Recent Session'
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric'
    })
  }

  // Filter history records
  const filteredHistory = useMemo(() => {
    return recordsData.filter((item) => {
      // 1. Vehicle filter
      if (vehicleFilter !== 'all') {
        const itemType = (item.vehicleType || '').toLowerCase()
        if (vehicleFilter === 'bike' && !itemType.includes('bike') && !itemType.includes('motorcycle')) {
          return false
        }
        if (vehicleFilter === 'scooty' && !itemType.includes('scooty') && !itemType.includes('scooter')) {
          return false
        }
      }

      // 2. Status filter
      if (statusFilter !== 'all') {
        const itemStatus = (item.status || 'Completed').toLowerCase()
        if (itemStatus !== statusFilter.toLowerCase()) {
          return false
        }
      }

      // 3. Date Range Filter
      if (fromDate) {
        const itemDate = item.date ? new Date(item.date) : null
        const from = new Date(fromDate)
        if (itemDate && itemDate < from) return false
      }
      if (toDate) {
        const itemDate = item.date ? new Date(item.date) : null
        const to = new Date(toDate)
        to.setHours(23, 59, 59, 999)
        if (itemDate && itemDate > to) return false
      }

      // 4. Text Search
      if (search.trim()) {
        const q = search.toLowerCase().trim()
        const match =
          (item.studentName && item.studentName.toLowerCase().includes(q)) ||
          (item.rollNumber && item.rollNumber.toLowerCase().includes(q)) ||
          (item.vehicleNumber && item.vehicleNumber.toLowerCase().includes(q)) ||
          (item.slotId && item.slotId.toLowerCase().includes(q)) ||
          (item.stream && item.stream.toLowerCase().includes(q)) ||
          (item.floor && item.floor.toLowerCase().includes(q)) ||
          (item.id && item.id.toLowerCase().includes(q))
        if (!match) return false
      }

      return true
    })
  }, [recordsData, vehicleFilter, statusFilter, fromDate, toDate, search])

  // Pagination calculations
  const totalRecords = filteredHistory.length
  const totalPages = Math.ceil(totalRecords / PAGE_SIZE) || 1
  const safeCurrentPage = Math.min(currentPage, totalPages)

  const paginatedRecords = useMemo(() => {
    const start = (safeCurrentPage - 1) * PAGE_SIZE
    return filteredHistory.slice(start, start + PAGE_SIZE)
  }, [filteredHistory, safeCurrentPage, PAGE_SIZE])

  const handleResetFilters = () => {
    setSearch('')
    setFromDate('')
    setToDate('')
    setStatusFilter('all')
    setVehicleFilter('all')
    setCurrentPage(1)
  }

  const isFiltered = search || fromDate || toDate || statusFilter !== 'all' || vehicleFilter !== 'all'

  return (
    <div className="parking-history-root">
      {/* 1. HERO SECTION */}
      <div className="ph-hero-card">
        <div className="ph-hero-content">
          <div className="ph-hero-tag">
            <span>📅</span>
            <span>PARKING HISTORY</span>
          </div>
          <h1 className="ph-hero-title">
            Your <span className="ph-title-accent">Parking History</span>
          </h1>
          <p className="ph-hero-desc">
            View all your past parking bookings, visits and activity history in one place. Keep track of your parking records and stay organized.
          </p>

          {studentName && (
            <div className="ph-student-meta-chip">
              <span className="ph-student-avatar-badge">
                {studentName.slice(0, 2).toUpperCase()}
              </span>
              <div className="ph-student-meta-info">
                <span className="ph-student-meta-name">{studentName}</span>
                <span className="ph-student-meta-sub">
                  {rollNumber ? `${rollNumber} • ` : ''}
                  {stream ? `${stream} • ` : ''}
                  {vehiclePlate ? <strong className="font-mono">{vehiclePlate}</strong> : 'Active Permit'}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="ph-hero-graphic-wrap">
          <img
            src={parkingHeroImg}
            alt="Motorcycle &amp; Scooter Parking Station"
            className="ph-hero-img"
          />
          <div className="ph-hero-img-badge">
            <span className="ph-live-pulse-dot" />
            <span>24/7 Campus Parking Archive</span>
          </div>
        </div>
      </div>

      {/* 2. FILTER & SEARCH BAR */}
      <div className="ph-controls-card">
        {/* From Date */}
        <div className="ph-date-input-group" title="Filter from start date">
          <span className="ph-input-icon">📅</span>
          <input
            type="date"
            className="ph-date-input"
            value={fromDate}
            onChange={(e) => {
              setFromDate(e.target.value)
              setCurrentPage(1)
            }}
            placeholder="From Date"
            aria-label="From Date"
          />
        </div>

        {/* To Date */}
        <div className="ph-date-input-group" title="Filter up to end date">
          <span className="ph-input-icon">📅</span>
          <input
            type="date"
            className="ph-date-input"
            value={toDate}
            onChange={(e) => {
              setToDate(e.target.value)
              setCurrentPage(1)
            }}
            placeholder="To Date"
            aria-label="To Date"
          />
        </div>

        {/* All Statuses Dropdown */}
        <div className="ph-select-group">
          <select
            className="ph-select"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value)
              setCurrentPage(1)
            }}
            aria-label="Filter by Status"
          >
            <option value="all">All Statuses</option>
            <option value="Completed">Completed</option>
          </select>
          <span className="ph-select-arrow">▼</span>
        </div>

        {/* All Vehicles Dropdown */}
        <div className="ph-select-group">
          <select
            className="ph-select"
            value={vehicleFilter}
            onChange={(e) => {
              setVehicleFilter(e.target.value)
              setCurrentPage(1)
            }}
            aria-label="Filter by Vehicle Type"
          >
            <option value="all">All Vehicles</option>
            <option value="bike">Motorcycle / Bike</option>
            <option value="scooty">Scooter / Scooty</option>
          </select>
          <span className="ph-select-arrow">▼</span>
        </div>

        {/* Search Input */}
        <div className="ph-search-group">
          <span className="ph-search-icon">🔍</span>
          <input
            type="text"
            className="ph-search-input"
            placeholder="Search by slot, vehicle or keyword..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setCurrentPage(1)
            }}
            aria-label="Search records"
          />
          {search && (
            <button
              type="button"
              className="ph-search-clear"
              onClick={() => {
                setSearch('')
                setCurrentPage(1)
              }}
              title="Clear search"
            >
              ×
            </button>
          )}
        </div>

        {/* Reset Filters button if active */}
        {isFiltered && (
          <button
            type="button"
            className="ph-reset-btn"
            onClick={handleResetFilters}
            title="Reset all filters"
          >
            <span>✕</span>
            <span>Reset</span>
          </button>
        )}
      </div>

      {/* 3. TABLE CONTAINER (5 COLUMNS: DATE & TIME, SLOT NUMBER, VEHICLE DETAILS, DURATION, STATUS) */}
      <div className="ph-table-card">
        <div className="ph-table-scroll-wrapper">
          {paginatedRecords.length === 0 ? (
            <div className="ph-empty-state">
              <span className="ph-empty-icon">📜</span>
              <h3 className="ph-empty-title">No Parking History Found</h3>
              <p className="ph-empty-desc">
                {isFiltered
                  ? 'No records match your active search filters. Try clearing filters to view all sessions.'
                  : 'No completed parking checkouts have been logged yet.'}
              </p>
              {isFiltered && (
                <button
                  type="button"
                  className="ph-reset-btn"
                  onClick={handleResetFilters}
                >
                  Clear All Filters
                </button>
              )}
            </div>
          ) : (
            <table className="ph-table">
              <thead>
                <tr>
                  <th>DATE &amp; TIME</th>
                  <th>SLOT NUMBER</th>
                  <th>VEHICLE DETAILS</th>
                  <th>DURATION</th>
                  <th>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRecords.map((item) => (
                  <tr
                    key={item.id}
                    className="ph-table-row"
                    onClick={() => setSelectedRecord(item)}
                    title={`Click to view session details for ${item.vehicleNumber || item.id}`}
                  >
                    {/* Column 1: Date & Time */}
                    <td>
                      <div className="ph-date-cell">
                        <div className="ph-date-icon-box">📅</div>
                        <div className="ph-date-details">
                          <span className="ph-date-main">
                            {formatDateDisplay(item.date)}
                          </span>
                          <span className="ph-time-sub">
                            {item.entryTime || '08:00 AM'} - {item.exitTime || '10:00 AM'}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Column 2: Slot Number */}
                    <td>
                      <span className="ph-slot-cell">{item.slotId}</span>
                    </td>

                    {/* Column 3: Vehicle Details */}
                    <td>
                      <div className="ph-vehicle-cell">
                        <div className="ph-vehicle-icon-box">
                          {item.vehicleType === 'scooty' ? '🛵' : '🏍️'}
                        </div>
                        <div className="ph-vehicle-details">
                          <span className="ph-plate-text font-mono">
                            {item.vehicleNumber}
                          </span>
                          <span className="ph-model-text">
                            {item.vehicleType === 'scooty' ? 'Scooter' : 'Motorcycle'}
                            {item.studentName ? ` • ${item.studentName}` : ''}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Column 4: Duration */}
                    <td>
                      <span className="ph-duration-cell font-mono">
                        {item.duration || '1 hr'}
                      </span>
                    </td>

                    {/* Column 5: Status */}
                    <td>
                      <span className="ph-status-badge">
                        <span className="ph-status-dot" />
                        <span>{item.status || 'Completed'}</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* 4. PAGINATION FOOTER */}
        {totalRecords > 0 && (
          <div className="ph-pagination-bar">
            <div className="ph-pagination-count font-mono">
              Showing <strong>{Math.min((safeCurrentPage - 1) * PAGE_SIZE + 1, totalRecords)}</strong> to{' '}
              <strong>{Math.min(safeCurrentPage * PAGE_SIZE, totalRecords)}</strong> of{' '}
              <strong>{totalRecords}</strong> records
            </div>

            <div className="ph-pagination-buttons">
              <button
                type="button"
                className="ph-page-btn"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safeCurrentPage === 1}
                aria-label="Previous Page"
              >
                ‹
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                <button
                  key={pageNum}
                  type="button"
                  className={`ph-page-btn ${pageNum === safeCurrentPage ? 'active' : ''}`}
                  onClick={() => setCurrentPage(pageNum)}
                >
                  {pageNum}
                </button>
              ))}

              <button
                type="button"
                className="ph-page-btn"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={safeCurrentPage === totalPages}
                aria-label="Next Page"
              >
                ›
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 5. SESSION DETAILS MODAL (ACCESSED VIA ROW CLICK) */}
      {selectedRecord && (
        <div className="ph-modal-overlay" onClick={() => setSelectedRecord(null)}>
          <div
            className="ph-modal-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="ph-modal-header">
              <div className="ph-modal-header-title">
                <span>📋</span>
                <span>Parking Session Details</span>
              </div>
              <button
                type="button"
                className="ph-modal-close"
                onClick={() => setSelectedRecord(null)}
                aria-label="Close dialog"
              >
                ✕
              </button>
            </div>

            <div className="ph-modal-body">
              <div className="ph-modal-row">
                <span className="ph-modal-label">Session ID</span>
                <span className="ph-modal-val font-mono">{selectedRecord.id}</span>
              </div>
              <div className="ph-modal-row">
                <span className="ph-modal-label">Date</span>
                <span className="ph-modal-val">{formatDateDisplay(selectedRecord.date)}</span>
              </div>
              <div className="ph-modal-row">
                <span className="ph-modal-label">Parking Bay / Slot</span>
                <span className="ph-modal-val font-mono text-cyan font-bold">
                  {selectedRecord.slotId} ({selectedRecord.floor || 'Campus Level'})
                </span>
              </div>
              <div className="ph-modal-row">
                <span className="ph-modal-label">Vehicle Plate</span>
                <span className="ph-modal-val font-mono font-bold">
                  {selectedRecord.vehicleNumber}
                </span>
              </div>
              <div className="ph-modal-row">
                <span className="ph-modal-label">Vehicle Type</span>
                <span className="ph-modal-val">
                  {selectedRecord.vehicleType === 'scooty' ? '🛵 Scooter / Scooty' : '🏍️ Motorcycle / Bike'}
                </span>
              </div>
              {selectedRecord.studentName && (
                <div className="ph-modal-row">
                  <span className="ph-modal-label">Student Member</span>
                  <span className="ph-modal-val">{selectedRecord.studentName}</span>
                </div>
              )}
              {selectedRecord.rollNumber && (
                <div className="ph-modal-row">
                  <span className="ph-modal-label">Roll Number</span>
                  <span className="ph-modal-val font-mono">{selectedRecord.rollNumber}</span>
                </div>
              )}
              {selectedRecord.stream && (
                <div className="ph-modal-row">
                  <span className="ph-modal-label">Department / Stream</span>
                  <span className="ph-modal-val">{selectedRecord.stream}</span>
                </div>
              )}
              <div className="ph-modal-row">
                <span className="ph-modal-label">Entry Timestamp</span>
                <span className="ph-modal-val font-mono">{selectedRecord.entryTime || 'N/A'}</span>
              </div>
              <div className="ph-modal-row">
                <span className="ph-modal-label">Exit Timestamp</span>
                <span className="ph-modal-val font-mono">{selectedRecord.exitTime || 'N/A'}</span>
              </div>
              <div className="ph-modal-row">
                <span className="ph-modal-label">Recorded Duration</span>
                <span className="ph-modal-val font-mono text-emerald font-bold">
                  {selectedRecord.duration}
                </span>
              </div>
              <div className="ph-modal-row">
                <span className="ph-modal-label">Status</span>
                <span className="ph-status-badge">
                  <span className="ph-status-dot" />
                  <span>{selectedRecord.status || 'Completed'}</span>
                </span>
              </div>
            </div>

            <div className="ph-modal-footer">
              <button
                type="button"
                className="ph-modal-btn-close"
                onClick={() => setSelectedRecord(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
