import {
  ShieldIcon,
  CheckIcon,
  UserIcon,
  IdCardIcon
} from '../Icons'
import { getFloorForVehicleType } from '../../services/vehicleService'

export default function StudentMyVehicleView({
  user,
  userProfile,
  onViewPass
}) {
  const displayName = userProfile?.displayName || user?.displayName || 'Alzuni Shaikh'
  const rollNumber = userProfile?.campusId || userProfile?.rollNumber || 'S2410701'
  const vehiclePlate = userProfile?.defaultPlate || userProfile?.vehicleNumber || 'MH-12-AB-1234'
  const vehicleType = userProfile?.vehicleType || 'scooty'
  const stream = userProfile?.stream || 'BCA (Bachelor of Computer Applications)'
  const phone = userProfile?.phoneNumber || '+91 98765 43210'
  const assignedFloor = getFloorForVehicleType(vehicleType)

  const passData = {
    passId: `SOC-${rollNumber}-PASS`,
    slotId: vehicleType === 'scooty' ? 'G-AUTH' : 'B-AUTH',
    plate: vehiclePlate,
    owner: displayName,
    category: 'Student',
    reservedUntil: 'Annual Campus Permit (2026-2027)',
    floor: assignedFloor,
    section: stream,
    zone: `${assignedFloor} - ${stream}`,
    passType: 'Annual Student Permit'
  }

  return (
    <div className="student-page-container">
      {/* Header */}
      <div className="page-section-header glass-card">
        <div className="psh-badge">
          <span>🛵 AUTHORIZED VEHICLE PROFILE</span>
        </div>
        <h1 className="psh-title">
          My <span className="gradient-text">Registered Vehicle</span>
        </h1>
        <p className="psh-subtitle">
          Your campus-authorized two-wheeler registration details, assigned parking floor regulations, and digital QR permit pass.
        </p>
      </div>

      <div className="my-vehicle-layout-grid">
        {/* Left: Vehicle Spec Card */}
        <div className="vehicle-details-card glass-card">
          <div className="card-header-clean">
            <h3>Registered Vehicle Specs</h3>
            <span className="status-pill available">🟢 Authorized Active</span>
          </div>

          <div className="vd-plate-display">
            <span className="plate-badge-mono font-mono font-bold large-plate">{vehiclePlate}</span>
            <div className="vd-type-badge">
              <span>{vehicleType === 'scooty' ? '🛵 Scooty' : '🏍️ Bike'}</span>
            </div>
          </div>

          <div className="vd-info-list">
            <div className="vd-info-row">
              <span className="vd-label">Owner Name</span>
              <strong className="vd-val">{displayName}</strong>
            </div>
            <div className="vd-info-row">
              <span className="vd-label">Roll Number</span>
              <span className="vd-val font-mono text-cyan">{rollNumber}</span>
            </div>
            <div className="vd-info-row">
              <span className="vd-label">Stream / Class</span>
              <span className="vd-val">{stream}</span>
            </div>
            <div className="vd-info-row">
              <span className="vd-label">Designated Floor</span>
              <span className={`floor-tag ${assignedFloor.includes('Ground') ? 'floor-ground' : 'floor-basement'}`}>
                {assignedFloor}
              </span>
            </div>
            <div className="vd-info-row">
              <span className="vd-label">Contact Phone</span>
              <span className="vd-val font-mono">{phone}</span>
            </div>
          </div>
        </div>

        {/* Right: Digital Campus QR Permit Pass */}
        <div className="permit-pass-card glass-card">
          <div className="card-header-clean">
            <h3>Digital Campus QR Pass</h3>
            <span className="text-muted text-xs">For Gate ANPR &amp; Security Scanners</span>
          </div>

          <div className="pass-mini-ticket">
            <div className="ticket-top">
              <span className="ticket-brand">SCHOOL OF COMMERCE</span>
              <span className="ticket-id font-mono">{passData.passId}</span>
            </div>

            <div className="ticket-body">
              <div className="tb-row">
                <span className="tb-label">HOLDER</span>
                <strong className="tb-val">{displayName}</strong>
              </div>
              <div className="tb-row">
                <span className="tb-label">PLATE</span>
                <span className="tb-val font-mono text-amber">{vehiclePlate}</span>
              </div>
              <div className="tb-row">
                <span className="tb-label">FLOOR</span>
                <span className="tb-val text-cyan">{assignedFloor}</span>
              </div>
            </div>

            <div className="ticket-qr-center">
              <div className="qr-box">
                {/* SVG QR Visual */}
                <svg className="qr-svg" viewBox="0 0 100 100" fill="#0f172a">
                  <rect width="100" height="100" fill="#ffffff" />
                  <rect x="10" y="10" width="25" height="25" fill="#0f172a" />
                  <rect x="15" y="15" width="15" height="15" fill="#ffffff" />
                  <rect x="18" y="18" width="9" height="9" fill="#0f172a" />
                  <rect x="65" y="10" width="25" height="25" fill="#0f172a" />
                  <rect x="70" y="15" width="15" height="15" fill="#ffffff" />
                  <rect x="73" y="18" width="9" height="9" fill="#0f172a" />
                  <rect x="10" y="65" width="25" height="25" fill="#0f172a" />
                  <rect x="15" y="70" width="15" height="15" fill="#ffffff" />
                  <rect x="18" y="73" width="9" height="9" fill="#0f172a" />
                  <rect x="45" y="15" width="10" height="10" fill="#0f172a" />
                  <rect x="45" y="45" width="10" height="10" fill="#0f172a" />
                  <rect x="65" y="65" width="10" height="10" fill="#0f172a" />
                  <rect x="75" y="75" width="15" height="15" fill="#0f172a" />
                </svg>
              </div>
              <span className="text-xs text-muted font-mono mt-1">SCAN AT CAMPUS GATE</span>
            </div>

            <button
              type="button"
              className="btn btn-primary btn-sm w-full mt-3"
              onClick={() => onViewPass && onViewPass(passData)}
            >
              <span>🎫 Open Fullscreen Permit Pass</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
