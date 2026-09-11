import { useState, useEffect } from 'react'
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
  onUpdateProfile,
  onViewPass
}) {
  // Helper to load persistent storage
  const getStoredProfile = () => {
    try {
      const saved = localStorage.getItem('custom_student_vehicle_profile')
      if (saved) return JSON.parse(saved)
    } catch (e) {
      console.warn('Could not parse stored profile', e)
    }
    return null
  }

  const stored = getStoredProfile()

  // Base profile state
  const [profile, setProfile] = useState(() => {
    return {
      displayName: stored?.displayName || userProfile?.displayName || user?.displayName || 'Alzuni Shaikh',
      rollNumber: stored?.campusId || stored?.rollNumber || userProfile?.campusId || userProfile?.rollNumber || 'S2410701',
      vehiclePlate: stored?.defaultPlate || stored?.vehiclePlate || stored?.vehicleNumber || userProfile?.defaultPlate || userProfile?.vehicleNumber || 'MH-12-AB-1234',
      vehicleType: stored?.vehicleType || userProfile?.vehicleType || 'scooty',
      stream: stored?.stream || userProfile?.stream || 'BCA (Bachelor of Computer Applications)',
      phone: stored?.phoneNumber || stored?.phone || userProfile?.phoneNumber || '+91 98765 43210'
    }
  })

  // Sync if userProfile changes from outside and no local override
  useEffect(() => {
    const latestSaved = getStoredProfile()
    if (latestSaved) {
      setProfile((prev) => ({ ...prev, ...latestSaved }))
    } else if (userProfile) {
      setProfile((prev) => ({
        ...prev,
        displayName: userProfile.displayName || prev.displayName,
        rollNumber: userProfile.campusId || userProfile.rollNumber || prev.rollNumber,
        vehiclePlate: userProfile.defaultPlate || userProfile.vehicleNumber || prev.vehiclePlate,
        vehicleType: userProfile.vehicleType || prev.vehicleType,
        stream: userProfile.stream || prev.stream,
        phone: userProfile.phoneNumber || prev.phone
      }))
    }
  }, [userProfile])

  // Edit Mode state
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({ ...profile })
  const [saveAlert, setSaveAlert] = useState(false)

  // Start Editing
  const handleStartEdit = () => {
    setFormData({ ...profile })
    setIsEditing(true)
  }

  // Cancel Editing
  const handleCancelEdit = () => {
    setFormData({ ...profile })
    setIsEditing(false)
  }

  // Save Edits (Persistent in localStorage & App state)
  const handleSaveEdit = (e) => {
    if (e) e.preventDefault()

    const cleanPlate = (formData.vehiclePlate || 'MH-12-AB-1234').trim().toUpperCase()
    const cleanName = (formData.displayName || 'Student').trim()
    const cleanRoll = (formData.rollNumber || 'S2410701').trim()
    const cleanStream = (formData.stream || 'BCA').trim()
    const cleanPhone = (formData.phone || '+91 98765 43210').trim()
    const cleanType = formData.vehicleType || 'scooty'

    const updated = {
      displayName: cleanName,
      campusId: cleanRoll,
      rollNumber: cleanRoll,
      defaultPlate: cleanPlate,
      vehiclePlate: cleanPlate,
      vehicleNumber: cleanPlate,
      vehicleType: cleanType,
      stream: cleanStream,
      phoneNumber: cleanPhone,
      phone: cleanPhone
    }

    // 1. Permanent Local Storage persistence (survives refresh and logout)
    try {
      localStorage.setItem('custom_student_vehicle_profile', JSON.stringify(updated))
      const savedDemo = localStorage.getItem('demo_user_session')
      if (savedDemo) {
        const parsed = JSON.parse(savedDemo)
        localStorage.setItem('demo_user_session', JSON.stringify({ ...parsed, ...updated }))
      }
    } catch (err) {
      console.warn('Storage error:', err)
    }

    // 2. Local component state update
    setProfile({
      displayName: cleanName,
      rollNumber: cleanRoll,
      vehiclePlate: cleanPlate,
      vehicleType: cleanType,
      stream: cleanStream,
      phone: cleanPhone
    })

    // 3. Update global userProfile in App
    if (onUpdateProfile) {
      onUpdateProfile(updated)
    }

    setIsEditing(false)
    setSaveAlert(true)
    setTimeout(() => setSaveAlert(false), 4500)
  }

  // Calculated floor based on vehicle type
  const assignedFloor = getFloorForVehicleType(profile.vehicleType)

  const passData = {
    passId: `SOC-${profile.rollNumber}-PASS`,
    slotId: profile.vehicleType === 'scooty' ? 'G-AUTH' : 'B-AUTH',
    plate: profile.vehiclePlate,
    owner: profile.displayName,
    category: 'Student',
    reservedUntil: 'Annual Campus Permit (2026-2027)',
    floor: assignedFloor,
    section: profile.stream,
    zone: `${assignedFloor} - ${profile.stream}`,
    passType: 'Annual Student Permit'
  }

  return (
    <div className="student-page-container">
      {/* Header */}
      <div className="page-section-header glass-card">
        <div className="psh-badge">
          <span>🛵 AUTHORIZED VEHICLE PROFILE</span>
        </div>
        <div className="psh-title-row">
          <h1 className="psh-title">
            My <span className="gradient-text">Registered Vehicle</span>
          </h1>
          {!isEditing && (
            <button
              type="button"
              className="btn btn-primary btn-sm mve-header-edit-btn"
              onClick={handleStartEdit}
            >
              ✏️ Edit My Info
            </button>
          )}
        </div>
        <p className="psh-subtitle">
          Your campus-authorized two-wheeler registration details, assigned parking floor regulations, and digital QR permit pass.
        </p>
      </div>

      {/* Success Notification Alert */}
      {saveAlert && (
        <div className="mve-success-banner glass-card">
          <span className="mve-success-icon">✅</span>
          <div className="mve-success-text">
            <strong>Changes Saved Permanently!</strong>
            <span>Your updated vehicle information and personal specs are securely saved across refresh and logout.</span>
          </div>
        </div>
      )}

      <div className="my-vehicle-layout-grid">
        {/* Left Card: Vehicle Specs (View or Edit Mode) */}
        <div className="vehicle-details-card glass-card">
          <div className="card-header-clean">
            <div className="card-title-group">
              <h3>{isEditing ? 'Edit Vehicle & Profile Specs' : 'Registered Vehicle Specs'}</h3>
              {!isEditing && (
                <span className="status-pill available">🟢 Authorized Active</span>
              )}
            </div>
            <button
              type="button"
              className={`btn btn-sm ${isEditing ? 'btn-ghost text-muted' : 'btn-outline mve-edit-trigger-btn'}`}
              onClick={isEditing ? handleCancelEdit : handleStartEdit}
            >
              {isEditing ? '✕ Cancel' : '✏️ Edit'}
            </button>
          </div>

          {isEditing ? (
            /* =======================================================
               EDIT MODE FORM
               ======================================================= */
            <form className="mve-edit-form" onSubmit={handleSaveEdit}>
              {/* Owner Name */}
              <div className="mve-field-group">
                <label className="mve-label">Full Name / Owner Name</label>
                <input
                  type="text"
                  className="mve-input"
                  placeholder="e.g. Rahul Sharma"
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  required
                />
              </div>

              {/* Roll Number / Campus ID */}
              <div className="mve-field-group">
                <label className="mve-label">Roll Number / Campus ID</label>
                <input
                  type="text"
                  className="mve-input font-mono"
                  placeholder="e.g. S2410701"
                  value={formData.rollNumber}
                  onChange={(e) => setFormData({ ...formData, rollNumber: e.target.value })}
                  required
                />
              </div>

              {/* Vehicle Number Plate */}
              <div className="mve-field-group">
                <label className="mve-label">Vehicle Registration Number (Plate)</label>
                <input
                  type="text"
                  className="mve-input font-mono uppercase font-bold"
                  placeholder="e.g. MH-12-AB-1234"
                  value={formData.vehiclePlate}
                  onChange={(e) => setFormData({ ...formData, vehiclePlate: e.target.value.toUpperCase() })}
                  required
                />
              </div>

              {/* Vehicle Type Selector */}
              <div className="mve-field-group">
                <label className="mve-label">Two-Wheeler Type &amp; Designated Floor</label>
                <div className="mve-type-selector">
                  <button
                    type="button"
                    className={`mve-type-btn ${formData.vehicleType === 'scooty' ? 'active' : ''}`}
                    onClick={() => setFormData({ ...formData, vehicleType: 'scooty' })}
                  >
                    <span className="mve-type-icon">🛵</span>
                    <div className="mve-type-info">
                      <span className="mve-type-name">Scooty</span>
                      <span className="mve-type-sub">Ground Floor</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    className={`mve-type-btn ${formData.vehicleType === 'bike' ? 'active' : ''}`}
                    onClick={() => setFormData({ ...formData, vehicleType: 'bike' })}
                  >
                    <span className="mve-type-icon">🏍️</span>
                    <div className="mve-type-info">
                      <span className="mve-type-name">Motorcycle / Bike</span>
                      <span className="mve-type-sub">Basement Floor</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Stream / Class */}
              <div className="mve-field-group">
                <label className="mve-label">Stream / Class / Department</label>
                <input
                  type="text"
                  className="mve-input"
                  placeholder="e.g. BCA (Bachelor of Computer Applications)"
                  value={formData.stream}
                  onChange={(e) => setFormData({ ...formData, stream: e.target.value })}
                  required
                />
                <div className="mve-quick-chips">
                  {['BCA', 'B.Com', 'BBA', 'MCA', 'MBA'].map((st) => (
                    <button
                      key={st}
                      type="button"
                      className="mve-chip"
                      onClick={() => setFormData({ ...formData, stream: `${st} (${st === 'BCA' ? 'Bachelor of Computer Applications' : st === 'B.Com' ? 'Commerce' : st})` })}
                    >
                      +{st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Contact Phone */}
              <div className="mve-field-group">
                <label className="mve-label">Contact Phone Number</label>
                <input
                  type="text"
                  className="mve-input font-mono"
                  placeholder="e.g. +91 98765 43210"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  required
                />
              </div>

              {/* Save & Cancel Actions */}
              <div className="mve-action-row">
                <button
                  type="submit"
                  className="btn btn-primary mve-save-btn"
                >
                  <span>💾 Save Changes</span>
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={handleCancelEdit}
                >
                  Cancel
                </button>
              </div>

              <div className="mve-persistence-hint">
                <span>🔒 Persisted permanently — saved across browser refresh &amp; logout</span>
              </div>
            </form>
          ) : (
            /* =======================================================
               VIEW MODE (READ ONLY DISPLAY)
               ======================================================= */
            <>
              <div className="vd-plate-display">
                <span className="plate-badge-mono font-mono font-bold large-plate">{profile.vehiclePlate}</span>
                <div className="vd-type-badge">
                  <span>{profile.vehicleType === 'scooty' ? '🛵 Scooty' : '🏍️ Bike'}</span>
                </div>
              </div>

              <div className="vd-info-list">
                <div className="vd-info-row">
                  <span className="vd-label">Owner Name</span>
                  <strong className="vd-val">{profile.displayName}</strong>
                </div>
                <div className="vd-info-row">
                  <span className="vd-label">Roll Number</span>
                  <span className="vd-val font-mono text-cyan">{profile.rollNumber}</span>
                </div>
                <div className="vd-info-row">
                  <span className="vd-label">Stream / Class</span>
                  <span className="vd-val">{profile.stream}</span>
                </div>
                <div className="vd-info-row">
                  <span className="vd-label">Designated Floor</span>
                  <span className={`floor-tag ${assignedFloor.includes('Ground') ? 'floor-ground' : 'floor-basement'}`}>
                    {assignedFloor}
                  </span>
                </div>
                <div className="vd-info-row">
                  <span className="vd-label">Contact Phone</span>
                  <span className="vd-val font-mono">{profile.phone}</span>
                </div>
              </div>

              <div className="mve-view-footer">
                <button
                  type="button"
                  className="btn btn-outline btn-sm w-full mve-btn-edit-block"
                  onClick={handleStartEdit}
                >
                  ✏️ Edit Profile &amp; Vehicle Specs
                </button>
              </div>
            </>
          )}
        </div>

        {/* Right Card: Digital Campus QR Permit Pass */}
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
                <strong className="tb-val">{profile.displayName}</strong>
              </div>
              <div className="tb-row">
                <span className="tb-label">PLATE</span>
                <span className="tb-val font-mono text-amber">{profile.vehiclePlate}</span>
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
