import { XIcon, ShieldIcon } from './Icons'

export default function PassModal({ pass, onClose }) {
  if (!pass) return null

  const displayPassId = pass.passId || `SMP-${(pass.slotId || '00').replace(/[^a-zA-Z0-9]/g, '')}-PERMIT`

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content glass-card pass-card-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-wrap">
            <ShieldIcon className="w-5 h-5 text-emerald" />
            <h3 className="modal-title">Official Campus Parking Pass</h3>
          </div>
          <button type="button" className="close-btn" onClick={onClose} aria-label="Close pass modal">
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="pass-ticket">
          <div className="ticket-top">
            <div className="college-header">
              <h4>SMART CAMPUS PARKING AUTHORITY</h4>
              <span className="ticket-id">PASS #{displayPassId}</span>
            </div>
            <div className="status-ribbon">
              <span className="pulse-indicator"></span> ACTIVE PERMIT
            </div>
          </div>

          <div className="ticket-body">
            <div className="slot-hero-badge">
              <span className="slot-hero-label">ASSIGNED SLOT</span>
              <span className="slot-hero-id">{pass.slotId}</span>
              <span className="slot-hero-zone">{pass.zone || pass.section || 'Campus Parking Area'}</span>
            </div>

            <div className="ticket-details-grid">
              <div className="detail-item">
                <span className="detail-label">Vehicle Plate</span>
                <span className="detail-val plate-styled">{pass.plate || 'REGISTERED'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Owner / Holder</span>
                <span className="detail-val">{pass.owner || 'Campus User'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Category</span>
                <span className="detail-val badge-category">{pass.category || 'Student'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Valid Until</span>
                <span className="detail-val text-emerald font-bold">{pass.reservedUntil || 'Full Day Pass'}</span>
              </div>
            </div>

            {/* QR Code Simulation */}
            <div className="qr-section">
              <div className="qr-box">
                {/* SVG QR Code Pattern */}
                <svg viewBox="0 0 100 100" className="qr-svg" fill="currentColor">
                  {/* Outer corner 1 */}
                  <rect x="5" y="5" width="26" height="26" fill="#000" rx="3" />
                  <rect x="9" y="9" width="18" height="18" fill="#fff" />
                  <rect x="13" y="13" width="10" height="10" fill="#000" />
                  {/* Outer corner 2 */}
                  <rect x="69" y="5" width="26" height="26" fill="#000" rx="3" />
                  <rect x="73" y="9" width="18" height="18" fill="#fff" />
                  <rect x="77" y="13" width="10" height="10" fill="#000" />
                  {/* Outer corner 3 */}
                  <rect x="5" y="69" width="26" height="26" fill="#000" rx="3" />
                  <rect x="9" y="73" width="18" height="18" fill="#fff" />
                  <rect x="13" y="77" width="10" height="10" fill="#000" />
                  {/* Simulated QR data grid */}
                  <rect x="36" y="8" width="6" height="6" fill="#000" />
                  <rect x="46" y="8" width="6" height="6" fill="#000" />
                  <rect x="56" y="8" width="6" height="6" fill="#000" />
                  <rect x="36" y="18" width="6" height="6" fill="#000" />
                  <rect x="46" y="24" width="6" height="6" fill="#000" />
                  <rect x="56" y="18" width="6" height="6" fill="#000" />
                  <rect x="8" y="36" width="6" height="6" fill="#000" />
                  <rect x="18" y="36" width="6" height="6" fill="#000" />
                  <rect x="28" y="36" width="6" height="6" fill="#000" />
                  <rect x="38" y="36" width="6" height="6" fill="#000" />
                  <rect x="48" y="36" width="6" height="6" fill="#000" />
                  <rect x="58" y="36" width="6" height="6" fill="#000" />
                  <rect x="68" y="36" width="6" height="6" fill="#000" />
                  <rect x="78" y="36" width="6" height="6" fill="#000" />
                  <rect x="88" y="36" width="6" height="6" fill="#000" />
                  <rect x="36" y="46" width="6" height="6" fill="#000" />
                  <rect x="52" y="46" width="6" height="6" fill="#000" />
                  <rect x="68" y="46" width="6" height="6" fill="#000" />
                  <rect x="82" y="46" width="6" height="6" fill="#000" />
                  <rect x="36" y="58" width="6" height="6" fill="#000" />
                  <rect x="48" y="58" width="6" height="6" fill="#000" />
                  <rect x="62" y="58" width="6" height="6" fill="#000" />
                  <rect x="76" y="58" width="6" height="6" fill="#000" />
                  <rect x="36" y="70" width="6" height="6" fill="#000" />
                  <rect x="50" y="70" width="6" height="6" fill="#000" />
                  <rect x="64" y="70" width="6" height="6" fill="#000" />
                  <rect x="80" y="70" width="6" height="6" fill="#000" />
                  <rect x="36" y="82" width="6" height="6" fill="#000" />
                  <rect x="48" y="82" width="6" height="6" fill="#000" />
                  <rect x="60" y="82" width="6" height="6" fill="#000" />
                  <rect x="74" y="82" width="6" height="6" fill="#000" />
                  <rect x="86" y="82" width="6" height="6" fill="#000" />
                </svg>
              </div>
              <p className="qr-hint">Scan at Automatic Gate Reader for Contactless Entry</p>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Done
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => window.print()}
          >
            🖨️ Print / Save Pass
          </button>
        </div>
      </div>
    </div>
  )
}
