import { XIcon, ShieldIcon, CheckIcon, AlertCircleIcon, ClockIcon } from '../Icons'
import { formatPaymentDate, formatPaymentTime } from '../../services/paymentHistoryService'

export default function PaymentDetailsModal({ payment, onClose }) {
  if (!payment) return null

  const isSuccess = (payment.paymentStatus || 'SUCCESS').toUpperCase() === 'SUCCESS' || (payment.paymentStatus || '').toUpperCase() === 'PAID'
  const isPending = (payment.paymentStatus || '').toUpperCase() === 'PENDING'
  const isFailed = (payment.paymentStatus || '').toUpperCase() === 'FAILED'

  const dateStr = formatPaymentDate(payment.paidAt || payment.paidAtIso || payment.createdAt)
  const timeStr = formatPaymentTime(payment.paidAt || payment.paidAtIso || payment.createdAt)

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="glass-card payment-details-modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '540px',
          width: '92%',
          padding: '28px',
          borderRadius: '18px',
          position: 'relative',
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.96) 0%, rgba(9, 13, 22, 0.98) 100%)',
          border: '1px solid rgba(56, 189, 248, 0.25)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 30px rgba(56, 189, 248, 0.1)'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: 'rgba(56, 189, 248, 0.12)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px'
              }}
            >
              💳
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#ffffff' }}>Payment Audit Record</h3>
              <span className="font-mono" style={{ fontSize: '0.8rem', color: '#38bdf8' }}>
                {payment.paymentId || payment.id || 'N/A'}
              </span>
            </div>
          </div>
          <button
            type="button"
            className="close-btn"
            onClick={onClose}
            aria-label="Close details"
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              padding: '6px',
              color: '#94a3b8',
              cursor: 'pointer'
            }}
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Amount & Status Banner */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            background: 'rgba(30, 41, 59, 0.5)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '12px',
            marginBottom: '20px'
          }}
        >
          <div>
            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8', display: 'block', marginBottom: '2px' }}>
              Amount Paid
            </span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
              <span style={{ fontSize: '1.75rem', fontWeight: 800, color: '#10b981' }}>₹{payment.amount || 10}</span>
              <span className="font-mono" style={{ fontSize: '0.85rem', color: '#64748b' }}>{payment.currency || 'INR'}</span>
            </div>
          </div>
          <div>
            {isSuccess && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  borderRadius: '9999px',
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.35)',
                  color: '#34d399',
                  fontSize: '0.85rem',
                  fontWeight: 700
                }}
              >
                <CheckIcon className="w-4 h-4" /> SUCCESS
              </span>
            )}
            {isPending && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  borderRadius: '9999px',
                  background: 'rgba(245, 158, 11, 0.15)',
                  border: '1px solid rgba(245, 158, 11, 0.35)',
                  color: '#fbbf24',
                  fontSize: '0.85rem',
                  fontWeight: 700
                }}
              >
                <ClockIcon className="w-4 h-4" /> PENDING
              </span>
            )}
            {isFailed && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  borderRadius: '9999px',
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.35)',
                  color: '#f87171',
                  fontSize: '0.85rem',
                  fontWeight: 700
                }}
              >
                <AlertCircleIcon className="w-4 h-4" /> FAILED
              </span>
            )}
          </div>
        </div>

        {/* Audit Details Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '14px',
            marginBottom: '24px'
          }}
        >
          {/* Student Name */}
          <div className="audit-field">
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '3px' }}>Student Name</span>
            <strong style={{ color: '#f8fafc', fontSize: '0.95rem' }}>{payment.studentName || 'Campus Member'}</strong>
          </div>

          {/* Roll Number */}
          <div className="audit-field">
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '3px' }}>Roll / Campus ID</span>
            <strong className="font-mono" style={{ color: '#38bdf8', fontSize: '0.95rem' }}>{payment.rollNumber || '—'}</strong>
          </div>

          {/* Student Email */}
          <div className="audit-field" style={{ gridColumn: 'span 2' }}>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '3px' }}>Student Email</span>
            <span style={{ color: '#e2e8f0', fontSize: '0.9rem' }}>{payment.studentEmail || '—'}</span>
          </div>

          {/* Vehicle Number */}
          <div className="audit-field">
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '3px' }}>Vehicle Number</span>
            <span
              className="font-mono"
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                padding: '3px 8px',
                borderRadius: '6px',
                fontSize: '0.88rem',
                fontWeight: 700,
                color: '#f8fafc',
                border: '1px solid rgba(255, 255, 255, 0.12)'
              }}
            >
              {payment.vehicleNumber || '—'}
            </span>
          </div>

          {/* Vehicle Type */}
          <div className="audit-field">
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '3px' }}>Vehicle Type</span>
            <span style={{ color: '#f8fafc', fontSize: '0.92rem' }}>
              {payment.vehicleType === 'Bike' ? '🏍️ Bike' : '🛵 Scooty'}
            </span>
          </div>

          {/* Parking Slot */}
          <div className="audit-field">
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '3px' }}>Parking Slot</span>
            <span
              className="font-mono"
              style={{
                background: 'rgba(56, 189, 248, 0.12)',
                color: '#38bdf8',
                padding: '3px 8px',
                borderRadius: '6px',
                fontSize: '0.9rem',
                fontWeight: 700,
                border: '1px solid rgba(56, 189, 248, 0.25)'
              }}
            >
              Bay {payment.slotId || '—'}
            </span>
          </div>

          {/* Floor */}
          <div className="audit-field">
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '3px' }}>Floor</span>
            <span style={{ color: '#f8fafc', fontSize: '0.92rem' }}>{payment.floor || 'Ground Floor'}</span>
          </div>

          {/* Reservation ID */}
          <div className="audit-field" style={{ gridColumn: 'span 2' }}>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '3px' }}>Reservation Reference</span>
            <span className="font-mono" style={{ color: '#cbd5e1', fontSize: '0.85rem' }}>{payment.reservationId || '—'}</span>
          </div>

          {/* Transaction ID */}
          <div className="audit-field" style={{ gridColumn: 'span 2' }}>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '3px' }}>Transaction Reference</span>
            <span className="font-mono" style={{ color: '#a78bfa', fontSize: '0.85rem' }}>{payment.transactionId || '—'}</span>
          </div>

          {/* Payment Method */}
          <div className="audit-field" style={{ gridColumn: 'span 2' }}>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '3px' }}>Payment Method</span>
            <span style={{ color: '#f8fafc', fontSize: '0.9rem', fontWeight: 600 }}>{payment.paymentMethod || 'UPI / Google Pay (Simulated)'}</span>
          </div>

          {/* Date */}
          <div className="audit-field">
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '3px' }}>Payment Date</span>
            <span style={{ color: '#f8fafc', fontSize: '0.9rem' }}>{dateStr}</span>
          </div>

          {/* Time */}
          <div className="audit-field">
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '3px' }}>Payment Time</span>
            <span style={{ color: '#f8fafc', fontSize: '0.9rem' }}>{timeStr}</span>
          </div>
        </div>

        {/* Read-Only Notice */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 14px',
            background: 'rgba(14, 116, 144, 0.1)',
            border: '1px solid rgba(56, 189, 248, 0.2)',
            borderRadius: '8px',
            marginBottom: '18px'
          }}
        >
          <ShieldIcon className="w-4 h-4 text-cyan" />
          <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
            Immutable audit record stored in Cloud Firestore. Read-only view for administrative audit.
          </span>
        </div>

        {/* Close CTA */}
        <button
          type="button"
          className="btn btn-primary"
          style={{ width: '100%', padding: '10px' }}
          onClick={onClose}
        >
          Close Record
        </button>
      </div>
    </div>
  )
}
