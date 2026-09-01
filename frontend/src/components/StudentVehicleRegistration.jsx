import { useState } from 'react'
import {
  SearchIcon,
  PlusCircleIcon,
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
  'Other Department'
]

export default function StudentVehicleRegistration({
  registeredVehicles = [],
  onRegisterVehicle,
  onDeleteVehicle,
  onViewPass,
  onQuickBook
}) {
  const [studentName, setStudentName] = useState('')
  const [rollNumber, setRollNumber] = useState('')
  const [stream, setStream] = useState('B.Tech Computer Science (CSE)')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [vehicleNumber, setVehicleNumber] = useState('')
  const [vehicleType, setVehicleType] = useState('scooty') // 'scooty' | 'bike'

  const [formError, setFormError] = useState('')
  const [formSuccess, setFormSuccess] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  const handleFormSubmit = (e) => {
    e.preventDefault()
    setFormError('')
    setFormSuccess('')

    if (!studentName.trim() || !rollNumber.trim() || !phoneNumber.trim() || !vehicleNumber.trim()) {
      setFormError('Please fill in all required fields.')
      return
    }

    const preferredFloor = vehicleType === 'scooty' ? 'Ground Floor' : 'Basement'

    if (onRegisterVehicle) {
      onRegisterVehicle({
        studentName: studentName.trim(),
        rollNumber: rollNumber.trim().toUpperCase(),
        stream,
        phoneNumber: phoneNumber.trim(),
        vehicleNumber: vehicleNumber.trim().toUpperCase(),
        vehicleType,
        isEv: false,
        preferredFloor
      })
    }

    setFormSuccess(`Registered ${studentName.trim()} (${vehicleNumber.trim().toUpperCase()})`)
    setStudentName('')
    setRollNumber('')
    setPhoneNumber('')
    setVehicleNumber('')
    setVehicleType('scooty')

    setTimeout(() => setFormSuccess(''), 3000)
  }

  const filteredList = registeredVehicles.filter((item) => {
    const q = searchQuery.toLowerCase().trim()
    return (
      !q ||
      item.studentName.toLowerCase().includes(q) ||
      item.rollNumber.toLowerCase().includes(q) ||
      item.vehicleNumber.toLowerCase().includes(q) ||
      (item.stream && item.stream.toLowerCase().includes(q))
    )
  })

  return (
    <div className="registration-module-container">
      <div className="registration-main-grid">
        {/* Registration Form */}
        <div className="registration-form-panel glass-card">
          <div className="panel-header">
            <h3>Student &amp; Vehicle Registration</h3>
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
            <div className="form-group">
              <label>Student Name *</label>
              <div className="input-with-icon">
                <UserIcon className="input-icon" />
                <input
                  type="text"
                  placeholder="e.g. Ananya Deshmukh"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  className="form-control"
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Roll Number *</label>
                <div className="input-with-icon">
                  <IdCardIcon className="input-icon" />
                  <input
                    type="text"
                    placeholder="e.g. CS21B044"
                    value={rollNumber}
                    onChange={(e) => setRollNumber(e.target.value)}
                    className="form-control uppercase-input"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Phone Number *</label>
                <input
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="form-control"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Stream / Department *</label>
              <select
                value={stream}
                onChange={(e) => setStream(e.target.value)}
                className="form-control"
              >
                {STREAMS_LIST.map((str, idx) => (
                  <option key={idx} value={str}>{str}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Vehicle Number (License Plate) *</label>
              <input
                type="text"
                placeholder="e.g. MH-04-AB-1234"
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value)}
                className="form-control uppercase-input font-mono font-bold"
                required
              />
            </div>

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
                  <span className="choice-tag ground-tag">Ground Floor</span>
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
                  <span className="choice-title">Bike</span>
                  <span className="choice-tag basement-tag">Basement</span>
                </label>
              </div>
            </div>

            <button type="submit" className="btn btn-primary w-full register-submit-btn">
              <PlusCircleIcon className="w-5 h-5" />
              <span>Register Student &amp; Vehicle</span>
            </button>
          </form>
        </div>

        {/* Registered Directory */}
        <div className="registration-directory-panel glass-card">
          <div className="directory-header">
            <div>
              <h3>Registered Students ({registeredVehicles.length})</h3>
              <p>Search students to identify vehicle owners</p>
            </div>

            <div className="search-box directory-search">
              <SearchIcon className="w-4 h-4 text-muted" />
              <input
                type="text"
                placeholder="Search name, roll no, or plate..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
            </div>
          </div>

          <div className="directory-table-wrap">
            {filteredList.length === 0 ? (
              <div className="empty-directory glass-card">
                <p>No registered students found.</p>
              </div>
            ) : (
              <table className="directory-table">
                <thead>
                  <tr>
                    <th>Student Name</th>
                    <th>Roll No</th>
                    <th>Stream</th>
                    <th>Phone</th>
                    <th>Vehicle Plate &amp; Type</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredList.map((item) => (
                    <tr key={item.id} className="directory-row">
                      <td><strong>{item.studentName}</strong></td>
                      <td><span className="roll-pill">{item.rollNumber}</span></td>
                      <td><span className="stream-badge">{item.stream}</span></td>
                      <td className="font-mono text-muted">{item.phoneNumber || 'N/A'}</td>
                      <td>
                        <span className="plate-badge-mono font-mono">{item.vehicleNumber}</span>{' '}
                        <span className="text-xs text-muted">
                          {item.vehicleType === 'scooty' ? '🛵 Scooty' : '🏍️ Bike'}
                        </span>
                      </td>
                      <td>
                        <div className="actions-cell">
                          {onViewPass && (
                            <button
                              type="button"
                              className="btn-action-sm pass-action-btn"
                              onClick={() =>
                                onViewPass({
                                  passId: item.passId || `SMP-${item.rollNumber}`,
                                  slotId: item.vehicleType === 'scooty' ? 'G-AUTH' : 'B-AUTH',
                                  plate: item.vehicleNumber,
                                  owner: `${item.studentName} (${item.rollNumber})`,
                                  category: 'Student',
                                  reservedUntil: 'Annual Campus Permit',
                                  floor: item.preferredFloor || (item.vehicleType === 'scooty' ? 'Ground Floor' : 'Basement'),
                                  section: item.stream,
                                  zone: `${item.preferredFloor || (item.vehicleType === 'scooty' ? 'Ground Floor' : 'Basement')} - ${item.stream}`
                                })
                              }
                            >
                              🎫 Pass
                            </button>
                          )}

                          {onDeleteVehicle && (
                            <button
                              type="button"
                              className="btn-action-sm delete-action-btn"
                              onClick={() => {
                                if (window.confirm(`Delete registration for ${item.studentName}?`)) {
                                  onDeleteVehicle(item.id)
                                }
                              }}
                            >
                              🗑️
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
