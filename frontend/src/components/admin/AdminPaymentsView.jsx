import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  ShieldIcon,
  CheckIcon,
  AlertCircleIcon,
  SearchIcon,
  RefreshCwIcon,
  ClockIcon,
  XIcon
} from '../Icons'
import {
  subscribeToPayments,
  calculatePaymentStats,
  formatPaymentDate,
  formatPaymentTime,
  parsePaymentDate
} from '../../services/paymentHistoryService'
import PaymentDetailsModal from './PaymentDetailsModal'
import './AdminPaymentsView.css'

export default function AdminPaymentsView({ user, userProfile, showToast }) {
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL') // 'ALL' | 'SUCCESS' | 'PENDING' | 'FAILED'
  const [methodFilter, setMethodFilter] = useState('ALL')
  const [dateFilter, setDateFilter] = useState('ALL') // 'ALL' | 'TODAY' | 'WEEK' | 'MONTH'
  const [sortBy, setSortBy] = useState('newest') // 'newest' | 'oldest' | 'amount-desc' | 'amount-asc'
  const [selectedPayment, setSelectedPayment] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const PAGE_SIZE = 10

  // Real-time subscription to `payments` collection
  useEffect(() => {
    setLoading(true)
    const unsubscribe = subscribeToPayments(
      (list) => {
        setPayments(list || [])
        setLoading(false)
      },
      (err) => {
        console.warn('[AdminPaymentsView] Payments listener notice:', err?.message)
        setLoading(false)
      }
    )

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe()
      }
    }
  }, [])

  // Dynamic Summary Metrics (Total Payments, Total Revenue, Successful, Pending/Failed)
  const stats = useMemo(() => {
    return calculatePaymentStats(payments)
  }, [payments])

  // Unique payment methods for dynamic filter dropdown
  const availableMethods = useMemo(() => {
    const set = new Set()
    payments.forEach((p) => {
      if (p.paymentMethod) set.add(p.paymentMethod)
    })
    return Array.from(set)
  }, [payments])

  // Filter & Search Logic
  const filteredPayments = useMemo(() => {
    const now = new Date()
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
    const sevenDaysAgo = todayMidnight - 7 * 24 * 60 * 60 * 1000
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime()

    return payments.filter((item) => {
      // 1. Status Filter
      if (statusFilter !== 'ALL') {
        const itemStatus = String(item.paymentStatus || '').toUpperCase()
        if (statusFilter === 'SUCCESS' && itemStatus !== 'SUCCESS' && itemStatus !== 'PAID') {
          return false
        }
        if (statusFilter === 'PENDING' && itemStatus !== 'PENDING') {
          return false
        }
        if (statusFilter === 'FAILED' && itemStatus !== 'FAILED') {
          return false
        }
      }

      // 2. Method Filter
      if (methodFilter !== 'ALL') {
        if (item.paymentMethod !== methodFilter) {
          return false
        }
      }

      // 3. Date Filter (Today, This Week, This Month)
      if (dateFilter !== 'ALL') {
        const pDate = parsePaymentDate(item.paidAt || item.paidAtIso || item.createdAt)
        const pTime = pDate.getTime()

        if (dateFilter === 'TODAY') {
          if (pTime < todayMidnight) return false
        } else if (dateFilter === 'WEEK') {
          if (pTime < sevenDaysAgo) return false
        } else if (dateFilter === 'MONTH') {
          if (pTime < startOfMonth) return false
        }
      }

      // 4. Search Filter (Student Name, Roll Number, Vehicle Number, Transaction ID, Reservation ID, Slot ID)
      if (search.trim()) {
        const q = search.toLowerCase().trim()
        const matches =
          (item.studentName && item.studentName.toLowerCase().includes(q)) ||
          (item.studentEmail && item.studentEmail.toLowerCase().includes(q)) ||
          (item.rollNumber && item.rollNumber.toLowerCase().includes(q)) ||
          (item.vehicleNumber && item.vehicleNumber.toLowerCase().includes(q)) ||
          (item.transactionId && item.transactionId.toLowerCase().includes(q)) ||
          (item.reservationId && item.reservationId.toLowerCase().includes(q)) ||
          (item.paymentId && item.paymentId.toLowerCase().includes(q)) ||
          (item.slotId && item.slotId.toLowerCase().includes(q))
        if (!matches) return false
      }

      return true
    })
  }, [payments, statusFilter, methodFilter, dateFilter, search])

  // Sorting Logic (Default: newest payment first)
  const sortedPayments = useMemo(() => {
    const list = [...filteredPayments]
    list.sort((a, b) => {
      const timeA = parsePaymentDate(a.paidAt || a.paidAtIso || a.createdAt).getTime()
      const timeB = parsePaymentDate(b.paidAt || b.paidAtIso || b.createdAt).getTime()
      const amountA = typeof a.amount === 'number' ? a.amount : 10
      const amountB = typeof b.amount === 'number' ? b.amount : 10

      if (sortBy === 'newest') return timeB - timeA
      if (sortBy === 'oldest') return timeA - timeB
      if (sortBy === 'amount-desc') return amountB - amountA
      if (sortBy === 'amount-asc') return amountA - amountB
      return timeB - timeA
    })
    return list
  }, [filteredPayments, sortBy])

  // Pagination
  const totalRecords = sortedPayments.length
  const totalPages = Math.max(1, Math.ceil(totalRecords / PAGE_SIZE))
  const paginatedPayments = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE
    return sortedPayments.slice(start, start + PAGE_SIZE)
  }, [sortedPayments, currentPage])

  const hasActiveFilters = search.trim() !== '' || statusFilter !== 'ALL' || methodFilter !== 'ALL' || dateFilter !== 'ALL' || sortBy !== 'newest'

  const handleClearFilters = useCallback(() => {
    setSearch('')
    setStatusFilter('ALL')
    setMethodFilter('ALL')
    setDateFilter('ALL')
    setSortBy('newest')
    setCurrentPage(1)
  }, [])

  return (
    <div className="admin-payments-container">
      {/* 1. HERO BANNER */}
      <section className="ap-hero-card glass-card">
        <div className="ap-hero-content">
          <div className="ap-hero-badge">
            <ShieldIcon className="w-3.5 h-3.5 text-cyan" />
            <span>FINANCIAL AUDIT &amp; TELEMETRY</span>
          </div>
          <h1 className="ap-hero-title">
            <span className="ap-hero-title-accent">Payments</span> Management
          </h1>
          <p className="ap-hero-subtitle">
            Parking payment history &amp; transaction records
          </p>
        </div>

        <div className="ap-hero-telemetry">
          <div className="ap-ledger-pill">
            <div className="ap-pulse-dot" />
            <span>REAL-TIME LEDGER ACTIVE</span>
          </div>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
            Authoritative ₹10 Parking Permits
          </span>
        </div>
      </section>

      {/* 2. SUMMARY KPI CARDS */}
      <div className="ap-kpi-grid">
        {/* TOTAL PAYMENTS */}
        <div className="ap-kpi-card glass-card">
          <div className="ap-kpi-icon blue">
            <span>💳</span>
          </div>
          <div className="ap-kpi-data">
            <span className="ap-kpi-label">Total Payments</span>
            <strong className="ap-kpi-value">{stats.totalPayments}</strong>
            <span className="ap-kpi-sub">All logged transactions</span>
          </div>
        </div>

        {/* TOTAL REVENUE */}
        <div className="ap-kpi-card glass-card">
          <div className="ap-kpi-icon emerald">
            <span style={{ fontWeight: 800 }}>₹</span>
          </div>
          <div className="ap-kpi-data">
            <span className="ap-kpi-label">Total Revenue</span>
            <strong className="ap-kpi-value" style={{ color: '#34d399' }}>
              ₹{stats.totalRevenue}
            </strong>
            <span className="ap-kpi-sub">From successful payments</span>
          </div>
        </div>

        {/* SUCCESSFUL */}
        <div className="ap-kpi-card glass-card">
          <div className="ap-kpi-icon emerald">
            <CheckIcon className="w-6 h-6 text-emerald" />
          </div>
          <div className="ap-kpi-data">
            <span className="ap-kpi-label">Successful</span>
            <strong className="ap-kpi-value" style={{ color: '#34d399' }}>
              {stats.successfulCount}
            </strong>
            <span className="ap-kpi-sub">Verified &amp; confirmed</span>
          </div>
        </div>

        {/* PENDING / FAILED */}
        <div className="ap-kpi-card glass-card">
          <div className="ap-kpi-icon amber">
            <AlertCircleIcon className="w-6 h-6 text-amber" />
          </div>
          <div className="ap-kpi-data">
            <span className="ap-kpi-label">Pending / Failed</span>
            <strong className="ap-kpi-value" style={{ color: stats.pendingFailedCount > 0 ? '#fbbf24' : '#94a3b8' }}>
              {stats.pendingFailedCount}
            </strong>
            <span className="ap-kpi-sub">Incomplete checkouts</span>
          </div>
        </div>
      </div>

      {/* 3. CONTROLS TOOLBAR (SEARCH + FILTERS + SORTING) */}
      <div className="ap-controls-card glass-card">
        <div className="ap-controls-top">
          {/* Live Search Input */}
          <div className="ap-search-box">
            <SearchIcon className="w-4 h-4 ap-search-icon" />
            <input
              type="text"
              id="admin-payments-search-input"
              className="ap-search-input font-mono"
              placeholder="Search student, roll, plate, txn ID, reservation ID..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setCurrentPage(1)
              }}
            />
            {search && (
              <button
                type="button"
                className="ap-search-clear"
                onClick={() => {
                  setSearch('')
                  setCurrentPage(1)
                }}
                aria-label="Clear search"
              >
                <XIcon className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filter Dropdowns */}
          <div className="ap-filter-groups">
            {/* Status Filter */}
            <div className="ap-select-wrap">
              <span className="ap-select-label">Status:</span>
              <select
                id="admin-payments-status-filter"
                className="ap-select"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value)
                  setCurrentPage(1)
                }}
              >
                <option value="ALL">All Statuses</option>
                <option value="SUCCESS">Successful</option>
                <option value="PENDING">Pending</option>
                <option value="FAILED">Failed</option>
              </select>
            </div>

            {/* Payment Method Filter */}
            <div className="ap-select-wrap">
              <span className="ap-select-label">Method:</span>
              <select
                id="admin-payments-method-filter"
                className="ap-select"
                value={methodFilter}
                onChange={(e) => {
                  setMethodFilter(e.target.value)
                  setCurrentPage(1)
                }}
              >
                <option value="ALL">All Methods</option>
                {availableMethods.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
                {!availableMethods.includes('UPI / Google Pay (Simulated)') && (
                  <option value="UPI / Google Pay (Simulated)">UPI / Google Pay (Simulated)</option>
                )}
              </select>
            </div>

            {/* Date Range Filter */}
            <div className="ap-select-wrap">
              <span className="ap-select-label">Date:</span>
              <select
                id="admin-payments-date-filter"
                className="ap-select"
                value={dateFilter}
                onChange={(e) => {
                  setDateFilter(e.target.value)
                  setCurrentPage(1)
                }}
              >
                <option value="ALL">All Time</option>
                <option value="TODAY">Today</option>
                <option value="WEEK">This Week</option>
                <option value="MONTH">This Month</option>
              </select>
            </div>

            {/* Sorting */}
            <div className="ap-select-wrap">
              <span className="ap-select-label">Sort:</span>
              <select
                id="admin-payments-sort-select"
                className="ap-select"
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value)
                  setCurrentPage(1)
                }}
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="amount-desc">Amount (High to Low)</option>
                <option value="amount-asc">Amount (Low to High)</option>
              </select>
            </div>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <button
                type="button"
                className="ap-clear-filters-btn"
                onClick={handleClearFilters}
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 4. RESPONSIVE PAYMENTS TABLE */}
      <div className="ap-table-card glass-card">
        <div className="ap-table-header-strip">
          <span className="ap-table-count">
            Showing <strong>{sortedPayments.length}</strong> of <strong>{payments.length}</strong> payment records
          </span>
          {loading && (
            <span style={{ fontSize: '0.8rem', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <RefreshCwIcon className="w-3.5 h-3.5 animate-spin" /> Syncing payments...
            </span>
          )}
        </div>

        <div className="ap-table-wrap">
          <table className="ap-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Roll Number</th>
                <th>Vehicle Number</th>
                <th>Vehicle Type</th>
                <th>Parking Slot</th>
                <th>Floor</th>
                <th>Amount</th>
                <th>Payment Method</th>
                <th>Transaction ID</th>
                <th>Date</th>
                <th>Time</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {paginatedPayments.length > 0 ? (
                paginatedPayments.map((item) => {
                  const isSuccess = (item.paymentStatus || 'SUCCESS').toUpperCase() === 'SUCCESS' || (item.paymentStatus || '').toUpperCase() === 'PAID'
                  const isPending = (item.paymentStatus || '').toUpperCase() === 'PENDING'
                  const isFailed = (item.paymentStatus || '').toUpperCase() === 'FAILED'
                  const dateStr = formatPaymentDate(item.paidAt || item.paidAtIso || item.createdAt)
                  const timeStr = formatPaymentTime(item.paidAt || item.paidAtIso || item.createdAt)

                  return (
                    <tr
                      key={item.paymentId || item.id}
                      onClick={() => setSelectedPayment(item)}
                      title="Click to view detailed audit record"
                    >
                      {/* 1. Student */}
                      <td>
                        <div className="ap-student-cell">
                          <span className="ap-student-name">{item.studentName || 'Campus Member'}</span>
                          {item.studentEmail && (
                            <span className="ap-student-email">{item.studentEmail}</span>
                          )}
                        </div>
                      </td>

                      {/* 2. Roll Number */}
                      <td>
                        <span className="font-mono text-cyan" style={{ fontSize: '0.84rem' }}>
                          {item.rollNumber || '—'}
                        </span>
                      </td>

                      {/* 3. Vehicle Number */}
                      <td>
                        <span className="ap-plate-badge">
                          {item.vehicleNumber || '—'}
                        </span>
                      </td>

                      {/* 4. Vehicle Type */}
                      <td>
                        <span className="ap-type-pill">
                          {item.vehicleType === 'Bike' ? '🏍️ Bike' : '🛵 Scooty'}
                        </span>
                      </td>

                      {/* 5. Parking Slot */}
                      <td>
                        <span className="ap-slot-pill">
                          Bay {item.slotId || '—'}
                        </span>
                      </td>

                      {/* 6. Floor */}
                      <td>
                        <span style={{ color: '#cbd5e1', fontSize: '0.84rem' }}>
                          {item.floor || 'Ground Floor'}
                        </span>
                      </td>

                      {/* 7. Amount */}
                      <td>
                        <span className="ap-amount-tag">
                          ₹{item.amount || 10}
                        </span>
                      </td>

                      {/* 8. Payment Method */}
                      <td>
                        <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
                          {item.paymentMethod || 'UPI / Google Pay (Simulated)'}
                        </span>
                      </td>

                      {/* 9. Transaction ID */}
                      <td>
                        <span className="font-mono" style={{ fontSize: '0.78rem', color: '#a78bfa' }}>
                          {item.transactionId ? `${item.transactionId.slice(0, 14)}...` : '—'}
                        </span>
                      </td>

                      {/* 10. Date */}
                      <td>
                        <span style={{ fontSize: '0.82rem', color: '#e2e8f0', whiteSpace: 'nowrap' }}>
                          {dateStr}
                        </span>
                      </td>

                      {/* 11. Time */}
                      <td>
                        <span style={{ fontSize: '0.82rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                          {timeStr}
                        </span>
                      </td>

                      {/* 12. Status */}
                      <td>
                        {isSuccess && (
                          <span className="ap-status-badge success">
                            <CheckIcon className="w-3.5 h-3.5" /> SUCCESS
                          </span>
                        )}
                        {isPending && (
                          <span className="ap-status-badge pending">
                            <ClockIcon className="w-3.5 h-3.5" /> PENDING
                          </span>
                        )}
                        {isFailed && (
                          <span className="ap-status-badge failed">
                            <AlertCircleIcon className="w-3.5 h-3.5" /> FAILED
                          </span>
                        )}
                      </td>

                      {/* 13. Action */}
                      <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          className="ap-view-btn"
                          onClick={() => setSelectedPayment(item)}
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan="13">
                    <div className="ap-empty-state">
                      <span className="ap-empty-icon">💳</span>
                      <h4 className="ap-empty-title">
                        {hasActiveFilters ? 'No Matching Payment Records' : 'No Payments Recorded Yet'}
                      </h4>
                      <p className="ap-empty-desc">
                        {hasActiveFilters
                          ? 'Try adjusting your search query, status filter, or date range to find payment records.'
                          : 'Student ₹10 parking permit payments will appear here in real time as bookings are completed.'}
                      </p>
                      {hasActiveFilters && (
                        <button
                          type="button"
                          className="btn btn-primary"
                          style={{ marginTop: '10px' }}
                          onClick={handleClearFilters}
                        >
                          Reset Filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div style={{ padding: '14px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
              Page {currentPage} of {totalPages}
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: '5px 12px', fontSize: '0.8rem' }}
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: '5px 12px', fontSize: '0.8rem' }}
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 5. COMPACT PAYMENT DETAILS AUDIT MODAL */}
      {selectedPayment && (
        <PaymentDetailsModal
          payment={selectedPayment}
          onClose={() => setSelectedPayment(null)}
        />
      )}
    </div>
  )
}
