import { useState, useMemo } from 'react'
import {
  GateIcon,
  SearchIcon,
  UserIcon,
  CheckIcon,
  AlertCircleIcon,
  ActivityIcon
} from './Icons'

export default function GateSimulator({
  slots = [],
  registeredVehicles = [],
  onVehicleEntry,
  onVehicleExit,
  onShowPass,
  onNavigateToMap,
  onNavigateToHistory
}) {
  // Search & Student Selection State (Module 5)
  const [studentSearchQuery, setStudentSearchQuery] = useState('')
  const [selectedStudent, setSelectedStudent] = useState(null)

  // Manual / Override State
  const [entryPlate, setEntryPlate] = useState('')
  const [entryDriver, setEntryDriver] = useState('')
  const [entryRoll, setEntryRoll] = useState('')
  const [entryStream, setEntryStream] = useState('')
  const [entryPhone, setEntryPhone] = useState('')
  const [entryType, setEntryType] = useState('scooty') // 'scooty' | 'scooty-ev' | 'bike' | 'bike-ev'
  const [entryCategory, setEntryCategory] = useState('Student')

  // Exit State (Module 6)
  const [exitPlate, setExitPlate] = useState('')

  // Gate Animation & Results
  const [gateStatus, setGateStatus] = useState('closed') // 'closed' | 'opening' | 'open' | 'closing'
  const [lastActionMsg, setLastActionMsg] = useState(null)

  // Filter registered vehicles for autocomplete search
  const matchingRegisteredStudents = useMemo(() => {
    if (!studentSearchQuery.trim()) return []
    const q = studentSearchQuery.toLowerCase().trim()
    return registeredVehicles
      .filter((v) =>
        v.studentName.toLowerCase().includes(q) ||
        v.rollNumber.toLowerCase().includes(q) ||
        v.vehicleNumber.toLowerCase().includes(q) ||
        (v.stream && v.stream.toLowerCase().includes(q))
      )
      .slice(0, 6)
  }, [studentSearchQuery, registeredVehicles])

  // When a student is selected from search
  const handleSelectStudent = (student) => {
    setSelectedStudent(student)
    setStudentSearchQuery('')
    setEntryPlate(student.vehicleNumber)
    setEntryDriver(student.studentName)
    setEntryRoll(student.rollNumber)
    setEntryStream(student.stream)
    setEntryPhone(student.phoneNumber)
    const mappedType =
      student.vehicleType === 'bike'
        ? student.isEv ? 'bike-ev' : 'bike'
        : student.isEv ? 'scooty-ev' : 'scooty'
    setEntryType(mappedType)
    setEntryCategory(student.category || 'Student')
  }

  const handleClearSelectedStudent = () => {
    setSelectedStudent(null)
    setEntryPlate('')
    setEntryDriver('')
    setEntryRoll('')
    setEntryStream('')
    setEntryPhone('')
    setEntryType('scooty')
    setEntryCategory('Student')
  }

  // ==========================================
  // MODULE 5: AUTOMATIC NEAREST SLOT ALLOCATION ENGINE
  // ==========================================
  const autoAllocatedTarget = useMemo(() => {
    const isScooty = entryType.startsWith('scooty')
    const targetFloor = isScooty ? 'Ground Floor' : 'Basement'

    // 1. Check if plate has a pre-reservation
    if (entryPlate.trim()) {
      const reservedSlot = slots.find(
        (s) =>
          s.status === 'reserved' &&
          s.plate &&
          s.plate.toLowerCase() === entryPlate.trim().toLowerCase()
      )
      if (reservedSlot) {
        return {
          slot: reservedSlot,
          floor: reservedSlot.floor,
          section: reservedSlot.section,
          isReservedMatch: true,
          reason: `Matching Pre-Reservation on ${reservedSlot.floor}`
        }
      }
    }

    // 2. Find nearest available slot on designated floor
    // (Ground Floor for Scooties, Basement for Bikes)
    const nearestAvailable = slots.find(
      (s) => s.status === 'available' && s.floor === targetFloor
    )

    if (nearestAvailable) {
      return {
        slot: nearestAvailable,
        floor: targetFloor,
        section: nearestAvailable.section,
        isReservedMatch: false,
        reason: isScooty
          ? `Nearest Ground Floor Bay (Reserved for Scooties)`
          : `Nearest Basement Bay (Reserved for Bikes)`
      }
    }

    // 3. Fallback to any available slot if designated floor is full
    const fallbackAvailable = slots.find((s) => s.status === 'available')
    if (fallbackAvailable) {
      return {
        slot: fallbackAvailable,
        floor: fallbackAvailable.floor,
        section: fallbackAvailable.section,
        isFallback: true,
        reason: `Designated floor full — Allocated overflow bay on ${fallbackAvailable.floor}`
      }
    }

    return null
  }, [slots, entryType, entryPlate])

  // ==========================================
  // MODULE 5: EXECUTE VEHICLE ENTRY
  // ==========================================
  const handleSimulateEntry = (e) => {
    e.preventDefault()
    if (!entryPlate.trim()) return

    const plateFormatted = entryPlate.toUpperCase().trim()

    setGateStatus('opening')
    setTimeout(() => {
      setGateStatus('open')

      const isScooty = entryType.startsWith('scooty')
      const preferredFloor = isScooty ? 'Ground Floor' : 'Basement'

      const result = onVehicleEntry({
        plate: plateFormatted,
        owner: entryDriver.trim() || selectedStudent?.studentName || 'Registered Student',
        rollNumber: entryRoll.trim() || selectedStudent?.rollNumber || '',
        stream: entryStream.trim() || selectedStudent?.stream || '',
        phoneNumber: entryPhone.trim() || selectedStudent?.phoneNumber || '',
        type: entryType,
        category: entryCategory || selectedStudent?.category || 'Student',
        preferredFloor
      })

      if (result.success) {
        setLastActionMsg({
          type: 'success',
          title: '🚗 Vehicle Admitted • Nearest Slot Automatically Assigned',
          detail: `Vehicle ${plateFormatted} (${entryDriver.trim() || selectedStudent?.studentName}) assigned to Bay ${result.slotId} (${result.floor} • ${result.section}). Entry timestamp recorded. Map updated immediately.`,
          slotId: result.slotId,
          floor: result.floor,
          section: result.section,
          plate: plateFormatted,
          owner: entryDriver.trim() || selectedStudent?.studentName || 'Student',
          passData: result.passData
        })

        // Reset inputs
        setSelectedStudent(null)
        setEntryPlate('')
        setEntryDriver('')
        setEntryRoll('')
        setEntryStream('')
        setEntryPhone('')
      } else {
        setLastActionMsg({
          type: 'error',
          title: 'Entry Denied • No Available Slots',
          detail: result.message
        })
      }

      setTimeout(() => {
        setGateStatus('closing')
        setTimeout(() => setGateStatus('closed'), 600)
      }, 4500)
    }, 600)
  }

  // ==========================================
  // MODULE 6: EXECUTE VEHICLE EXIT
  // ==========================================
  const handleSimulateExit = (e) => {
    e.preventDefault()
    if (!exitPlate.trim()) return

    const plateFormatted = exitPlate.toUpperCase().trim()

    setGateStatus('opening')
    setTimeout(() => {
      setGateStatus('open')

      const result = onVehicleExit(plateFormatted)

      if (result.success) {
        setLastActionMsg({
          type: 'success',
          title: '🚙 Vehicle Checked Out • Slot Freed & History Saved',
          detail: `Vehicle ${plateFormatted} exited. Bay ${result.slotId} is now Available on the Live Map. Duration (${result.duration || 'Session'}) saved to Parking History.`
        })
        setExitPlate('')
      } else {
        setLastActionMsg({
          type: 'error',
          title: 'Exit Failed',
          detail: result.message
        })
      }

      setTimeout(() => {
        setGateStatus('closing')
        setTimeout(() => setGateStatus('closed'), 600)
      }, 4500)
    }, 600)
  }

  const occupiedSlots = slots.filter((s) => s.status === 'occupied' || s.status === 'reserved')

  return (
    <div className="gate-simulator-container">
      {/* Animated Barrier Visualizer */}
      <div className="gate-barrier-visualizer glass-card">
        <div className="barrier-header">
          <div className="gate-title-tag">
            <GateIcon className="w-5 h-5 text-cyan" />
            <span>Campus Security Boom Barrier &bull; ANPR Station #1</span>
          </div>
          <div className={`gate-status-pill ${gateStatus}`}>
            <span className="gate-led"></span>
            <span>BARRIER {gateStatus.toUpperCase()}</span>
          </div>
        </div>

        <div className="barrier-stage">
          {/* Road markings */}
          <div className="road-surface">
            <div className="road-line"></div>
            <div className="road-line"></div>
            <div className="road-line"></div>
            <div className="road-text-marker">CAMPUS TWO-WHEELER ACCESS STATION</div>
          </div>

          {/* Boom Barrier Structure */}
          <div className="barrier-structure">
            <div className="barrier-pillar">
              <div
                className={`pillar-light ${
                  gateStatus === 'open' || gateStatus === 'opening' ? 'light-green' : 'light-red'
                }`}
              ></div>
            </div>
            <div className={`barrier-arm ${gateStatus}`}>
              <div className="arm-stripe arm-stripe-1"></div>
              <div className="arm-stripe arm-stripe-2"></div>
              <div className="arm-stripe arm-stripe-3"></div>
              <div className="arm-stripe arm-stripe-4"></div>
            </div>
          </div>
        </div>

        {/* Live Action Result Banner */}
        {lastActionMsg && (
          <div className={`gate-action-alert alert-${lastActionMsg.type}`}>
            <div className="alert-content">
              <div className="alert-title-row">
                {lastActionMsg.type === 'success' ? (
                  <CheckIcon className="w-5 h-5 text-emerald" />
                ) : (
                  <AlertCircleIcon className="w-5 h-5 text-rose" />
                )}
                <strong>{lastActionMsg.title}</strong>
              </div>
              <p>{lastActionMsg.detail}</p>

              <div className="alert-action-buttons">
                {lastActionMsg.passData && onShowPass && (
                  <button
                    type="button"
                    className="view-pass-btn"
                    onClick={() => onShowPass(lastActionMsg.passData)}
                  >
                    🎫 View Digital Pass
                  </button>
                )}
                {onNavigateToMap && (
                  <button
                    type="button"
                    className="view-map-jump-btn"
                    onClick={onNavigateToMap}
                  >
                    📍 View on Live Map
                  </button>
                )}
                {onNavigateToHistory && (
                  <button
                    type="button"
                    className="view-map-jump-btn"
                    onClick={onNavigateToHistory}
                  >
                    📜 View Saved History
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Terminals Grid */}
      <div className="gate-terminals-grid">
        {/* =========================================================
            MODULE 5: VEHICLE ENTRY TERMINAL
            ========================================================= */}
        <div className="terminal-card glass-card">
          <div className="terminal-header">
            <span className="terminal-badge entry">MODULE 5 &bull; VEHICLE ENTRY</span>
            <h4>Vehicle Entry &amp; Nearest Slot Assignment</h4>
          </div>

          {/* 1. Student Search & Select Bar */}
          <div className="student-lookup-wrap">
            <label>🔍 Select / Search Registered Student (Module 3)</label>
            <div className="search-box gate-student-search">
              <SearchIcon className="w-4 h-4 text-muted" />
              <input
                type="text"
                placeholder="Type student name, roll ID (e.g. CS21B044), or plate..."
                value={studentSearchQuery}
                onChange={(e) => setStudentSearchQuery(e.target.value)}
                className="search-input"
              />
              {studentSearchQuery && (
                <button
                  type="button"
                  className="clear-search-btn"
                  onClick={() => setStudentSearchQuery('')}
                >
                  ×
                </button>
              )}
            </div>

            {/* Autocomplete Dropdown List */}
            {matchingRegisteredStudents.length > 0 && (
              <div className="student-autocomplete-dropdown glass-card">
                <span className="dropdown-label">Matching Registered Students:</span>
                {matchingRegisteredStudents.map((st) => (
                  <div
                    key={st.id}
                    className="autocomplete-item"
                    onClick={() => handleSelectStudent(st)}
                  >
                    <div className="item-avatar">
                      <UserIcon className="w-4 h-4" />
                    </div>
                    <div className="item-info">
                      <div className="item-name-row">
                        <strong>{st.studentName}</strong>
                        <span className="roll-chip">{st.rollNumber}</span>
                      </div>
                      <span className="item-meta">
                        {st.stream} &bull; <span className="font-mono text-cyan">{st.vehicleNumber}</span> [
                        {st.vehicleType === 'scooty' ? '🛵 Scooty' : '🏍️ Bike'}]
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 2. Selected Student Verified Card */}
          {selectedStudent ? (
            <div className="selected-student-card glass-card">
              <div className="student-card-top">
                <div className="student-avatar-box">
                  <span className="student-initials">
                    {selectedStudent.studentName.slice(0, 2).toUpperCase()}
                  </span>
                </div>
                <div className="student-card-details">
                  <div className="student-card-name-row">
                    <strong>{selectedStudent.studentName}</strong>
                    <span className="roll-badge">{selectedStudent.rollNumber}</span>
                  </div>
                  <span className="student-stream-text">{selectedStudent.stream}</span>
                  <span className="student-phone-text font-mono">{selectedStudent.phoneNumber}</span>
                </div>
                <button
                  type="button"
                  className="btn-clear-selection"
                  onClick={handleClearSelectedStudent}
                  title="Clear selection"
                >
                  ✕
                </button>
              </div>

              <div className="student-vehicle-summary-row">
                <div className="vehicle-plate-box">
                  <span className="box-sub">Vehicle Plate:</span>
                  <span className="plate-badge-mono font-mono">{selectedStudent.vehicleNumber}</span>
                </div>
                <div className="vehicle-type-box">
                  <span className="box-sub">Assigned Zone:</span>
                  <span className="model-chip">
                    {selectedStudent.vehicleType === 'scooty' ? '🛵 Ground Floor (Scooty)' : '🏍️ Basement (Bike)'}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="quick-select-dropdown-box">
              <label>Or Quick Select Registered Student</label>
              <select
                className="form-control"
                onChange={(e) => {
                  const found = registeredVehicles.find((v) => v.id === e.target.value)
                  if (found) handleSelectStudent(found)
                }}
                defaultValue=""
              >
                <option value="">-- Choose Student from Directory ({registeredVehicles.length}) --</option>
                {registeredVehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.studentName} ({v.rollNumber}) &bull; {v.vehicleNumber} [
                    {v.vehicleType === 'scooty' ? 'Scooty' : 'Bike'}]
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* 3. Automatic Nearest Slot Allocation Preview (Module 5) */}
          <div className="allocation-engine-preview-card">
            <div className="engine-title-row">
              <span className="engine-icon">🤖</span>
              <strong>Module 5 Nearest Available Slot Engine:</strong>
            </div>

            {autoAllocatedTarget ? (
              <div className="allocation-target-details">
                <div className="target-slot-badge">
                  <span className="target-label">Nearest Slot Found</span>
                  <strong className="target-slot-id text-emerald">{autoAllocatedTarget.slot.id}</strong>
                </div>
                <div className="target-zone-info">
                  <span className="target-floor-text font-bold text-cyan">{autoAllocatedTarget.floor}</span>
                  <span className="target-section-text">{autoAllocatedTarget.section}</span>
                  <span className="allocation-rule-hint">
                    ✓ {autoAllocatedTarget.reason}
                  </span>
                </div>
              </div>
            ) : (
              <div className="allocation-target-full text-rose">
                ⚠️ No available parking slots found in this section.
              </div>
            )}
          </div>

          {/* 4. Entry Form */}
          <form onSubmit={handleSimulateEntry} className="terminal-form">
            <div className="form-row">
              <div className="form-group flex-1">
                <label>Vehicle Number (License Plate) *</label>
                <input
                  type="text"
                  placeholder="e.g. MH-04-AB-1234"
                  value={entryPlate}
                  onChange={(e) => setEntryPlate(e.target.value)}
                  className="form-control uppercase-input font-mono font-bold"
                  required
                />
              </div>

              <div className="form-group flex-1">
                <label>Student Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Ananya Deshmukh"
                  value={entryDriver}
                  onChange={(e) => setEntryDriver(e.target.value)}
                  className="form-control"
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group flex-1">
                <label>Vehicle Type *</label>
                <select
                  value={entryType}
                  onChange={(e) => setEntryType(e.target.value)}
                  className="form-control"
                >
                  <option value="scooty">🛵 Scooty (Petrol) &rarr; Ground Floor</option>
                  <option value="scooty-ev">⚡ EV Scooty (Electric) &rarr; Ground Floor</option>
                  <option value="bike">🏍️ Bike / Motorcycle &rarr; Basement</option>
                  <option value="bike-ev">⚡ EV Bike (Electric) &rarr; Basement</option>
                </select>
              </div>

              <div className="form-group flex-1">
                <label>Roll Number (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. CS21B044"
                  value={entryRoll}
                  onChange={(e) => setEntryRoll(e.target.value)}
                  className="form-control uppercase-input"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={gateStatus === 'opening' || gateStatus === 'open' || !entryPlate.trim()}
              className="btn btn-primary w-full gate-btn allocate-entry-btn"
            >
              <GateIcon className="w-5 h-5" />
              <span>Admit Vehicle &bull; Record Entry &bull; Update Map</span>
            </button>
          </form>
        </div>

        {/* =========================================================
            MODULE 6: VEHICLE EXIT TERMINAL
            ========================================================= */}
        <div className="terminal-card glass-card">
          <div className="terminal-header">
            <span className="terminal-badge exit">MODULE 6 &bull; VEHICLE EXIT</span>
            <h4>Vehicle Exit &amp; Slot Release</h4>
          </div>

          <form onSubmit={handleSimulateExit} className="terminal-form">
            <div className="form-group">
              <label>Select Parked Vehicle to Exit ({occupiedSlots.length} Active)</label>
              <select
                value={exitPlate}
                onChange={(e) => setExitPlate(e.target.value)}
                className="form-control"
              >
                <option value="">-- Choose Parked Vehicle from Lot --</option>
                {occupiedSlots.map((s) => (
                  <option key={s.id} value={s.plate}>
                    Slot {s.id} ({s.floor}) : {s.plate} [{s.owner || 'Student'}] &bull; Entry: {s.entryTime || 'Active'}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Or Enter Vehicle Plate Manually</label>
              <input
                type="text"
                placeholder="e.g. MH-04-AB-1234"
                value={exitPlate}
                onChange={(e) => setExitPlate(e.target.value)}
                className="form-control uppercase-input font-mono font-bold"
              />
            </div>

            <div className="exit-summary-box">
              <div className="info-row">
                <span>Module 6 Action 1:</span>
                <span className="text-emerald">Records Exit Timestamp</span>
              </div>
              <div className="info-row">
                <span>Module 6 Action 2:</span>
                <span className="text-cyan">Releases Occupied Slot &rarr; Available on Map</span>
              </div>
              <div className="info-row">
                <span>Module 6 Action 3:</span>
                <span className="text-amber">Saves Complete Record to Parking History</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={gateStatus === 'opening' || gateStatus === 'open' || !exitPlate.trim()}
              className="btn btn-secondary w-full gate-btn exit-btn"
            >
              Simulate Exit &bull; Release Slot &bull; Save History
            </button>
          </form>

          {/* Quick Real-Time Capacity Status */}
          <div className="terminal-quick-stats glass-card">
            <div className="quick-stat-item">
              <span className="quick-stat-label">Ground Floor (Scooties)</span>
              <strong className="quick-stat-val text-cyan">
                {slots.filter((s) => s.floor === 'Ground Floor' && s.status === 'available').length} / 80 Open
              </strong>
            </div>
            <div className="quick-stat-item">
              <span className="quick-stat-label">Basement (Bikes)</span>
              <strong className="quick-stat-val text-indigo">
                {slots.filter((s) => s.floor === 'Basement' && s.status === 'available').length} / 80 Open
              </strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
