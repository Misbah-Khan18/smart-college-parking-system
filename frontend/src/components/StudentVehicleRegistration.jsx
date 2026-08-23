import { useState } from 'react'
import {
  BikeIcon,
  SearchIcon,
  PlusCircleIcon,
  ShieldIcon,
  UserPlusIcon,
  UserIcon,
  IdCardIcon,
  CheckIcon
} from './Icons'

const STREAMS_LIST = [
  'B.Tech Computer Science (CSE)',
  'B.Tech Information Technology (IT)',
  'B.Tech AI & Data Science (AI/DS)',
  'B.Tech Electronics & Telecomm (EXTC)',
  'B.Tech Mechanical Engineering',
  'B.Tech Civil Engineering',
  'BCA / MCA Computer Applications',
  'MBA / Management Studies',
  'Other Campus Department'
]

export default function StudentVehicleRegistration({
  registeredVehicles = [],
  onRegisterVehicle,
  onDeleteVehicle,
  onViewPass,
  onQuickBook
}) {
  // Form State
  const [studentName, setStudentName] = useState('')
  const [rollNumber, setRollNumber] = useState('')
  const [stream, setStream] = useState('B.Tech Computer Science (CSE)')
  const [customStream, setCustomStream] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [vehicleNumber, setVehicleNumber] = useState('')
  
  // Primary vehicle choice: 'scooty' | 'bike'
  const [vehicleType, setVehicleType] = useState('scooty')
  // Subtype: is it Electric (EV) or Normal Petrol?
  const [isEv, setIsEv] = useState(false)

  const [formError, setFormError] = useState('')
  const [formSuccess, setFormSuccess] = useState('')

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState('all') // 'all' | 'scooty' | 'bike' | 'ev'

  // Sample data presets for quick testing
  const samplePresets = [
    {
      name: 'Tanvi Joshi',
      roll: 'CS23B077',
      stream: 'B.Tech Computer Science (CSE)',
      phone: '+91 98205 11223',
      plate: 'MH-04-TJ-1010',
      type: 'scooty',
      isEv: false
    },
    {
      name: 'Riya Sen',
      roll: 'AI24B029',
      stream: 'B.Tech AI & Data Science (AI/DS)',
      phone: '+91 97699 88776',
      plate: 'MH-04-RS-2024',
      type: 'scooty',
      isEv: true
    },
    {
      name: 'Devendra Kulkarni',
      roll: 'ME23B041',
      stream: 'B.Tech Mechanical Engineering',
      phone: '+91 98190 99881',
      plate: 'MH-04-DK-4040',
      type: 'bike',
      isEv: false
    },
    {
      name: 'Siddharth Patil',
      roll: 'AI24B012',
      stream: 'B.Tech AI & Data Science (AI/DS)',
      phone: '+91 99200 44556',
      plate: 'MH-04-QR-5566',
      type: 'bike',
      isEv: true
    }
  ]

  const handlePrefillSample = () => {
    const random = samplePresets[Math.floor(Math.random() * samplePresets.length)]
    setStudentName(random.name)
    setRollNumber(random.roll)
    setStream(random.stream)
    setPhoneNumber(random.phone)
    setVehicleNumber(random.plate)
    setVehicleType(random.type)
    setIsEv(random.isEv)
    setFormError('')
    setFormSuccess('Sample student details populated!')
    setTimeout(() => setFormSuccess(''), 3000)
  }

  const handleFormSubmit = (e) => {
    e.preventDefault()
    setFormError('')
    setFormSuccess('')

    if (!studentName.trim()) {
      setFormError('Please enter the student full name.')
      return
    }

    if (!rollNumber.trim()) {
      setFormError('Please enter the student roll number / ID.')
      return
    }

    if (!phoneNumber.trim()) {
      setFormError('Please enter a valid contact phone number.')
      return
    }

    if (!vehicleNumber.trim()) {
      setFormError('Please enter the vehicle license plate number.')
      return
    }

    const finalStream =
      stream === 'Other Campus Department' && customStream.trim()
        ? customStream.trim()
        : stream

    const preferredFloor =
      vehicleType === 'scooty' ? 'Ground Floor' : 'Basement'

    const newVehicleData = {
      studentName: studentName.trim(),
      rollNumber: rollNumber.trim().toUpperCase(),
      stream: finalStream,
      phoneNumber: phoneNumber.trim(),
      vehicleNumber: vehicleNumber.trim().toUpperCase(),
      vehicleType,
      isEv,
      preferredFloor
    }

    if (onRegisterVehicle) {
      onRegisterVehicle(newVehicleData)
    }

    const modelDesc = isEv ? `Electric EV ${vehicleType}` : `Normal ${vehicleType}`
    setFormSuccess(`🎉 Successfully registered ${studentName.trim()} (${vehicleNumber.trim().toUpperCase()} - ${modelDesc})!`)

    // Reset Form
    setStudentName('')
    setRollNumber('')
    setPhoneNumber('')
    setVehicleNumber('')
    setCustomStream('')
    setVehicleType('scooty')
    setIsEv(false)

    setTimeout(() => {
      setFormSuccess('')
    }, 4500)
  }

  // Filtered List
  const filteredList = registeredVehicles.filter((item) => {
    let matchType = true
    if (filterType === 'scooty') {
      matchType = item.vehicleType === 'scooty'
    } else if (filterType === 'bike') {
      matchType = item.vehicleType === 'bike'
    } else if (filterType === 'ev') {
      matchType = Boolean(item.isEv || item.type === 'ev' || item.vehicleType === 'ev')
    }

    const q = searchQuery.toLowerCase().trim()
    const matchSearch =
      !q ||
      item.studentName.toLowerCase().includes(q) ||
      item.rollNumber.toLowerCase().includes(q) ||
      (item.stream && item.stream.toLowerCase().includes(q)) ||
      (item.vehicleNumber && item.vehicleNumber.toLowerCase().includes(q)) ||
      (item.phoneNumber && item.phoneNumber.toLowerCase().includes(q))

    return matchType && matchSearch
  })

  // Metric counts
  const totalCount = registeredVehicles.length
  const scootyCount = registeredVehicles.filter((v) => v.vehicleType === 'scooty').length
  const bikeCount = registeredVehicles.filter((v) => v.vehicleType === 'bike').length
  const evCount = registeredVehicles.filter((v) => v.isEv || v.vehicleType === 'ev').length

  return (
    <div className="registration-module-container">
      {/* Top Header & Metrics */}
      <div className="registration-stats-grid">
        <div className="stat-card glass-card">
          <div className="stat-icon-box bg-cyan-glow">
            <UserPlusIcon className="w-5 h-5 text-cyan" />
          </div>
          <div className="stat-details">
            <span className="stat-label">Total Two-Wheelers</span>
            <strong className="stat-number text-cyan">{totalCount}</strong>
            <span className="stat-sub-info">Active Campus Authorizations</span>
          </div>
        </div>

        <div className="stat-card glass-card">
          <div className="stat-icon-box bg-emerald-glow">
            <span className="emoji-icon">🛵</span>
          </div>
          <div className="stat-details">
            <span className="stat-label">Girls' Scooties</span>
            <strong className="stat-number text-emerald">{scootyCount}</strong>
            <span className="stat-sub-info">Ground Floor (80 Bays)</span>
          </div>
        </div>

        <div className="stat-card glass-card">
          <div className="stat-icon-box bg-indigo-glow">
            <span className="emoji-icon">🏍️</span>
          </div>
          <div className="stat-details">
            <span className="stat-label">Boys' Bikes</span>
            <strong className="stat-number text-indigo">{bikeCount}</strong>
            <span className="stat-sub-info">Basement (80 Bays)</span>
          </div>
        </div>

        <div className="stat-card glass-card">
          <div className="stat-icon-box bg-amber-glow">
            <span className="emoji-icon">⚡</span>
          </div>
          <div className="stat-details">
            <span className="stat-label">Electric (EV) Models</span>
            <strong className="stat-number text-amber">{evCount}</strong>
            <span className="stat-sub-info">Eco-Friendly Two-Wheelers</span>
          </div>
        </div>
      </div>

      {/* Main 2-Column Section: Form on Left, Directory on Right */}
      <div className="registration-main-grid">
        {/* LEFT: Add New Vehicle Form */}
        <div className="registration-form-panel glass-card">
          <div className="panel-header">
            <div className="panel-title-wrap">
              <div className="icon-circle bg-cyan-glow">
                <PlusCircleIcon className="w-5 h-5 text-cyan" />
              </div>
              <div>
                <h3>Add New Vehicle</h3>
                <p>Register student two-wheeler &amp; issue parking permit</p>
              </div>
            </div>

            <button
              type="button"
              className="btn-sample-prefill"
              onClick={handlePrefillSample}
              title="Auto-fill sample student data for testing"
            >
              ✨ Sample Data
            </button>
          </div>

          {formError && (
            <div className="auth-alert error">
              <span>{formError}</span>
            </div>
          )}

          {formSuccess && (
            <div className="auth-alert success">
              <CheckIcon className="w-4 h-4" />
              <span>{formSuccess}</span>
            </div>
          )}

          <form onSubmit={handleFormSubmit} className="student-reg-form">
            {/* Student Name */}
            <div className="form-group">
              <label htmlFor="reg-student-name">Student Name *</label>
              <div className="input-with-icon">
                <UserIcon className="input-icon" />
                <input
                  id="reg-student-name"
                  type="text"
                  placeholder="e.g. Priya Sharma"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  className="form-control"
                  required
                />
              </div>
            </div>

            {/* Roll Number & Phone */}
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="reg-roll-no">Roll Number / Student ID *</label>
                <div className="input-with-icon">
                  <IdCardIcon className="input-icon" />
                  <input
                    id="reg-roll-no"
                    type="text"
                    placeholder="e.g. CS22B031"
                    value={rollNumber}
                    onChange={(e) => setRollNumber(e.target.value)}
                    className="form-control uppercase-input"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="reg-phone">Phone Number *</label>
                <input
                  id="reg-phone"
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="form-control"
                  required
                />
              </div>
            </div>

            {/* Stream / Class */}
            <div className="form-group">
              <label htmlFor="reg-stream">Stream / Class *</label>
              <select
                id="reg-stream"
                value={stream}
                onChange={(e) => setStream(e.target.value)}
                className="form-control"
              >
                {STREAMS_LIST.map((str, idx) => (
                  <option key={idx} value={str}>
                    {str}
                  </option>
                ))}
              </select>
            </div>

            {stream === 'Other Campus Department' && (
              <div className="form-group">
                <label htmlFor="reg-custom-stream">Specify Department / Class</label>
                <input
                  id="reg-custom-stream"
                  type="text"
                  placeholder="e.g. M.Tech Robotics"
                  value={customStream}
                  onChange={(e) => setCustomStream(e.target.value)}
                  className="form-control"
                />
              </div>
            )}

            {/* Vehicle Number */}
            <div className="form-group">
              <label htmlFor="reg-vehicle-plate">Vehicle Number (License Plate) *</label>
              <input
                id="reg-vehicle-plate"
                type="text"
                placeholder="e.g. MH-04-AB-1234"
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value)}
                className="form-control uppercase-input font-mono font-bold"
                required
              />
            </div>

            {/* Vehicle Type Selection (Scooty vs Bike) */}
            <div className="form-group">
              <label>Vehicle Type *</label>
              <div className="vehicle-type-selector-grid two-cols">
                <label className={`type-choice-card ${vehicleType === 'scooty' ? 'active' : ''}`}>
                  <input
                    type="radio"
                    name="vehicleType"
                    value="scooty"
                    checked={vehicleType === 'scooty'}
                    onChange={() => setVehicleType('scooty')}
                  />
                  <span className="choice-emoji">🛵</span>
                  <span className="choice-title">Scooty</span>
                  <span className="choice-tag ground-tag">Ground Floor (Girls' Wing)</span>
                </label>

                <label className={`type-choice-card ${vehicleType === 'bike' ? 'active' : ''}`}>
                  <input
                    type="radio"
                    name="vehicleType"
                    value="bike"
                    checked={vehicleType === 'bike'}
                    onChange={() => setVehicleType('bike')}
                  />
                  <span className="choice-emoji">🏍️</span>
                  <span className="choice-title">Bike / Motorcycle</span>
                  <span className="choice-tag basement-tag">Basement (Boys' Wing)</span>
                </label>
              </div>
            </div>

            {/* EV vs Normal Petrol Sub-Toggle */}
            <div className="form-group ev-toggle-group">
              <label className="ev-toggle-label">
                <span>Power Engine Type for {vehicleType === 'scooty' ? 'Scooty' : 'Bike'}:</span>
              </label>
              <div className="fuel-toggle-box">
                <button
                  type="button"
                  className={`fuel-toggle-btn ${!isEv ? 'active' : ''}`}
                  onClick={() => setIsEv(false)}
                >
                  ⛽ Normal Petrol {vehicleType === 'scooty' ? 'Scooty' : 'Bike'}
                </button>
                <button
                  type="button"
                  className={`fuel-toggle-btn ev-btn ${isEv ? 'active' : ''}`}
                  onClick={() => setIsEv(true)}
                >
                  ⚡ Electric EV {vehicleType === 'scooty' ? 'Scooty' : 'Bike'}
                </button>
              </div>
            </div>

            {/* Floor Recommendation Box */}
            <div className="floor-recommendation-box">
              <div className="rec-icon">🅿️</div>
              <div className="rec-text">
                <strong>Assigned Parking Zone:</strong>{' '}
                {vehicleType === 'scooty'
                  ? `Ground Floor Girls' Scooty Parking (Accounts & Exam IT Wings) ${isEv ? '• EV Model' : ''}`
                  : `Basement Boys' Two-Wheeler Parking (Rows 1 to 4 Grid) ${isEv ? '• EV Model' : ''}`}
              </div>
            </div>

            <button type="submit" className="btn btn-primary w-full register-submit-btn">
              <PlusCircleIcon className="w-5 h-5" />
              <span>Register Vehicle &amp; Authorize Permit</span>
            </button>
          </form>
        </div>

        {/* RIGHT: Registered Vehicles Directory */}
        <div className="registration-directory-panel glass-card">
          <div className="directory-header">
            <div className="directory-title-wrap">
              <ShieldIcon className="w-5 h-5 text-emerald" />
              <div>
                <h3>Registered Student Two-Wheelers</h3>
                <p>Search, issue parking passes and manage active permits</p>
              </div>
            </div>

            {/* Search Box */}
            <div className="search-box directory-search">
              <SearchIcon className="w-4 h-4 text-muted" />
              <input
                type="text"
                placeholder="Search name, roll no, stream, or plate..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
              {searchQuery && (
                <button
                  type="button"
                  className="clear-search-btn"
                  onClick={() => setSearchQuery('')}
                >
                  ×
                </button>
              )}
            </div>
          </div>

          {/* Type Filter Pills */}
          <div className="directory-filter-bar">
            <button
              type="button"
              className={`pill-btn ${filterType === 'all' ? 'active' : ''}`}
              onClick={() => setFilterType('all')}
            >
              All ({registeredVehicles.length})
            </button>
            <button
              type="button"
              className={`pill-btn ${filterType === 'scooty' ? 'active' : ''}`}
              onClick={() => setFilterType('scooty')}
            >
              🛵 Scooties ({scootyCount})
            </button>
            <button
              type="button"
              className={`pill-btn ${filterType === 'bike' ? 'active' : ''}`}
              onClick={() => setFilterType('bike')}
            >
              🏍️ Bikes ({bikeCount})
            </button>
            <button
              type="button"
              className={`pill-btn ${filterType === 'ev' ? 'active' : ''}`}
              onClick={() => setFilterType('ev')}
            >
              ⚡ EV Models ({evCount})
            </button>
          </div>

          {/* Table List */}
          <div className="directory-table-wrap">
            {filteredList.length === 0 ? (
              <div className="empty-directory glass-card">
                <UserIcon className="w-10 h-10 text-muted" />
                <p>No registered vehicles found matching your criteria.</p>
              </div>
            ) : (
              <table className="directory-table">
                <thead>
                  <tr>
                    <th>Student &amp; Roll ID</th>
                    <th>Stream / Class</th>
                    <th>Contact</th>
                    <th>Vehicle Plate &amp; Type</th>
                    <th>Designated Floor</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredList.map((item) => {
                    const itemIsEv = Boolean(item.isEv || item.vehicleType === 'ev')
                    const baseType = item.vehicleType === 'bike' ? 'bike' : 'scooty'

                    return (
                      <tr key={item.id} className="directory-row">
                        {/* Student info */}
                        <td>
                          <div className="student-cell">
                            <strong className="student-name-text">{item.studentName}</strong>
                            <span className="roll-pill">{item.rollNumber}</span>
                          </div>
                        </td>

                        {/* Stream */}
                        <td>
                          <span className="stream-badge" title={item.stream}>
                            {item.stream}
                          </span>
                        </td>

                        {/* Phone */}
                        <td>
                          <span className="phone-text font-mono">{item.phoneNumber || 'N/A'}</span>
                        </td>

                        {/* Plate & Type */}
                        <td>
                          <div className="plate-type-cell">
                            <span className="plate-badge-mono font-mono">{item.vehicleNumber}</span>
                            <span className="vehicle-type-tag">
                              {baseType === 'scooty' ? '🛵 Scooty' : '🏍️ Bike'}
                              {itemIsEv ? (
                                <span className="ev-badge-chip">⚡ EV</span>
                              ) : (
                                <span className="petrol-badge-chip">Petrol</span>
                              )}
                            </span>
                          </div>
                        </td>

                        {/* Designated floor */}
                        <td>
                          <span
                            className={`floor-tag-pill ${
                              item.preferredFloor === 'Ground Floor' || baseType === 'scooty'
                                ? 'ground'
                                : 'basement'
                            }`}
                          >
                            {item.preferredFloor === 'Ground Floor' || baseType === 'scooty'
                              ? '🅿️ Ground (Girls)'
                              : '🅿️ Basement (Boys)'}
                          </span>
                        </td>

                        {/* Actions */}
                        <td>
                          <div className="actions-cell">
                            {onViewPass && (
                              <button
                                type="button"
                                className="btn-action-sm pass-action-btn"
                                onClick={() =>
                                  onViewPass({
                                    passId: item.passId || `SMP-${item.rollNumber}`,
                                    slotId:
                                      item.preferredFloor === 'Ground Floor' || baseType === 'scooty'
                                        ? 'G-AUTO'
                                        : 'B-AUTO',
                                    plate: item.vehicleNumber,
                                    owner: `${item.studentName} (${item.rollNumber})`,
                                    category: 'Student',
                                    reservedUntil: 'Annual Campus Permit',
                                    floor:
                                      item.preferredFloor ||
                                      (baseType === 'scooty' ? 'Ground Floor' : 'Basement'),
                                    section: item.stream,
                                    zone: `${
                                      item.preferredFloor ||
                                      (baseType === 'scooty' ? 'Ground Floor' : 'Basement')
                                    } - ${item.stream}`
                                  })
                                }
                                title="View Official QR Pass"
                              >
                                🎫 Pass
                              </button>
                            )}

                            {onQuickBook && (
                              <button
                                type="button"
                                className="btn-action-sm book-action-btn"
                                onClick={() =>
                                  onQuickBook({
                                    ownerName: item.studentName,
                                    vehicleNumber: item.vehicleNumber,
                                    category: 'Student',
                                    vehicleType: baseType,
                                    isEv: itemIsEv,
                                    preferredFloor:
                                      item.preferredFloor ||
                                      (baseType === 'scooty' ? 'Ground Floor' : 'Basement')
                                  })
                                }
                                title="Quick Reserve Bay for Student"
                              >
                                🅿️ Book
                              </button>
                            )}

                            {onDeleteVehicle && (
                              <button
                                type="button"
                                className="btn-action-sm delete-action-btn"
                                onClick={() => {
                                  if (
                                    window.confirm(
                                      `Remove vehicle registration for ${item.studentName} (${item.vehicleNumber})?`
                                    )
                                  ) {
                                    onDeleteVehicle(item.id)
                                  }
                                }}
                                title="De-register vehicle"
                              >
                                🗑️
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
