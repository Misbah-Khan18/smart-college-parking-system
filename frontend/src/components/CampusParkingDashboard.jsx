import { useState, useMemo, useEffect, useRef } from 'react'
import {
  createInitialBayData,
  createBasementBayData,
  getFormattedTime,
  generatePassId,
  getDisplaySlotId
} from '../data/campusMasterPlanData'
import './CampusParkingDashboard.css'

export default function CampusParkingDashboard({ slots = [], userProfile, onOpenBooking }) {
  // 1. Active Floor State (persists within same session) - 'ground' | 'basement'
  const [activeFloor, setActiveFloor] = useState(() => {
    const saved = sessionStorage.getItem('campus_active_floor')
    return saved === 'basement' ? 'basement' : 'ground'
  })

  // 2. Master Bay State per floor (80 Ground + 80 Basement = 160 bays)
  const [groundBays, setGroundBays] = useState(() => createInitialBayData())
  const [basementBays, setBasementBays] = useState(() => createBasementBayData())

  // Fast map of live Firestore slots if available
  const liveSlotMap = useMemo(() => {
    const map = new Map()
    if (Array.isArray(slots) && slots.length > 0) {
      slots.forEach((s) => {
        if (!s || !s.id) return
        map.set(s.id, s)
        const normalized = getDisplaySlotId(s.id)
        if (normalized && normalized !== s.id) {
          map.set(normalized, s)
        }
      })
    }
    return map
  }, [slots])

  // Active bays based on chosen floor, merged with live Firestore slot data if present
  const currentBays = useMemo(() => {
    const baseBays = activeFloor === 'ground' ? groundBays : basementBays
    if (liveSlotMap.size === 0) return baseBays

    return baseBays.map((bay) => {
      const live = liveSlotMap.get(bay.id)
      if (!live) return bay

      const liveStatus = live.status === 'occupied' ? 'booked' : (live.status || bay.status)
      const dotColor = liveStatus === 'available' ? 'green' : liveStatus === 'reserved' ? 'amber' : 'red'

      return {
        ...bay,
        status: liveStatus,
        label: liveStatus.toUpperCase(),
        dotColor,
        plate: live.plate || bay.plate,
        assignedTo: live.owner || bay.assignedTo,
        occupant: live.owner || (live.plate ? `Occupied (${live.plate})` : bay.occupant),
        reservedUntil: live.reservedUntil,
        statusChangesAt: live.reservedUntil || bay.statusChangesAt
      }
    })
  }, [activeFloor, groundBays, basementBays, liveSlotMap])

  // 3. Active filters & Search
  const [activeFilter, setActiveFilter] = useState('all') // 'all' | 'available' | 'reserved' | 'booked'
  const [searchQuery, setSearchQuery] = useState('')
  const [isBlueprintMode, setIsBlueprintMode] = useState(false)

  // 4. Selected Bay (Persistent Bottom Detail Bar)
  const [activeBay, setActiveBay] = useState(null)

  // Synchronized selected bay object
  const selectedBay = useMemo(() => {
    if (!activeBay) return null
    return currentBays.find(b => b.id === activeBay.id) || activeBay
  }, [currentBays, activeBay])

  // Gate Info Modal State (for Ground Floor RFID Gate)
  const [gateModalOpen, setGateModalOpen] = useState(false)

  // 5. Toast Notifications
  const [toast, setToast] = useState(null)
  const toastTimeoutRef = useRef(null)

  const showToast = (title, desc, icon = 'ℹ️') => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current)
    setToast({ title, desc, icon })
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null)
    }, 4000)
  }

  // Real-time Current Clock for dynamic calculations
  const [, setCurrentTime] = useState(new Date())
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Calculate live counts for filters strictly from the active floor
  const totalCount = currentBays.length
  const availableCount = currentBays.filter(b => b.status === 'available').length
  const reservedCount = currentBays.filter(b => b.status === 'reserved').length
  const bookedCount = currentBays.filter(b => b.status === 'booked' || b.status === 'occupied').length

  // Quick lookup dictionary for active bays
  const bayMap = useMemo(() => {
    const map = new Map()
    currentBays.forEach(b => map.set(b.id, b))
    return map
  }, [currentBays])

  // Helper to check if a bay matches current filter
  const checkFilterMatch = (bay) => {
    if (activeFilter === 'all') return true
    if (activeFilter === 'available') return bay.status === 'available'
    if (activeFilter === 'reserved') return bay.status === 'reserved'
    if (activeFilter === 'booked') return bay.status === 'booked' || bay.status === 'occupied'
    return true
  }

  // Helper to check if a bay matches search query
  const checkSearchMatch = (bay) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase().trim()
    const id = (bay.id || '').toLowerCase()
    const legacyId = (bay.legacyId || '').toLowerCase()
    return (
      id.includes(q) ||
      legacyId.includes(q) ||
      (bay.status && bay.status.toLowerCase().includes(q)) ||
      (bay.label && bay.label.toLowerCase().includes(q)) ||
      (bay.assignedTo && bay.assignedTo.toLowerCase().includes(q)) ||
      (bay.plate && bay.plate.toLowerCase().includes(q)) ||
      (bay.wing && bay.wing.toLowerCase().includes(q))
    )
  }

  // Update bay state helper
  const updateBay = (bayId, updater) => {
    if (activeFloor === 'ground') {
      setGroundBays(prev => prev.map(b => b.id === bayId ? updater(b) : b))
    } else {
      setBasementBays(prev => prev.map(b => b.id === bayId ? updater(b) : b))
    }
  }

  // Handle Floor Switch
  const handleFloorChange = (newFloor) => {
    if (newFloor === activeFloor) return
    setActiveFloor(newFloor)
    sessionStorage.setItem('campus_active_floor', newFloor)
    setActiveBay(null)
    setGateModalOpen(false)
    showToast(
      'Floor Switched',
      `Active view: ${newFloor === 'ground' ? 'Ground Floor Master Plan' : 'Basement Master Plan'}`,
      '🏢'
    )
  }

  // Handle Bay Click (Selects bay and updates bottom detail bar)
  const handleBayClick = (bay) => {
    setActiveBay(bay)
  }

  // Reserve Slot Action from Bottom Detail Bar
  const handleReserveFromBottomBar = (bay) => {
    if (!bay) return

    // If parent booking handler exists, launch booking + payment flow
    if (onOpenBooking) {
      const live = liveSlotMap.get(bay.id)
      onOpenBooking(
        live || {
          id: bay.id,
          floor: activeFloor === 'ground' ? 'Ground Floor' : 'Basement',
          section: bay.wing || (activeFloor === 'ground' ? 'Ground Floor — Scooters' : 'Basement — Bikes'),
          type: activeFloor === 'ground' ? 'scooty' : 'bike'
        },
        'slot'
      )
      return
    }

    const now = new Date()
    const expiryTimestamp = new Date(now.getTime() + 2 * 60 * 60 * 1000) // 2 hours
    const passCode = generatePassId()
    const studentOccupant = `Student Commuter (${passCode.slice(0, 8)})`

    const updatedProps = {
      status: 'reserved',
      label: 'RESERVED',
      dotColor: 'amber',
      statusChangesAt: expiryTimestamp,
      occupant: studentOccupant,
      assignedTo: studentOccupant,
      plate: 'MH-12-PASS-TEMP'
    }

    updateBay(bay.id, (b) => ({ ...b, ...updatedProps }))
    setActiveBay(prev => ({ ...prev, ...updatedProps }))

    showToast(
      'Slot Reserved',
      `Bay ${bay.id} successfully reserved until ${getFormattedTime(expiryTimestamp)}`,
      '✅'
    )
  }

  // Cancel / Release Slot Action from Bottom Detail Bar
  const handleCancelReservationFromBottomBar = (bay) => {
    if (!bay) return
    const updatedProps = {
      status: 'available',
      label: 'FREE',
      dotColor: 'green',
      statusChangesAt: null,
      occupant: 'None (Slot Clear)',
      assignedTo: null,
      plate: null
    }

    updateBay(bay.id, (b) => ({ ...b, ...updatedProps }))
    setActiveBay(prev => ({ ...prev, ...updatedProps }))

    showToast(
      'Reservation Cancelled',
      `Bay ${bay.id} has been freed and marked Available`,
      '🟢'
    )
  }

  // Share Bay Action
  const handleShareBay = (bay) => {
    if (!bay) return
    const shareText = `Campus Parking Slot: ${bay.id} · ${bay.wing || 'Wing'} · ${bay.status.toUpperCase()}`
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(window.location.href).catch(() => {})
    }
    showToast('Bay Link Copied', `${shareText} link ready to share!`, '📋')
  }

  // Keyboard escape listener to close any modals
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setGateModalOpen(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // =========================================================================
  // RENDER HELPER FOR BAY CARDS
  // Clean 3-status system: Available (green), Reserved (amber), Booked (red)
  // =========================================================================
  const renderBayCard = (bayId) => {
    const bay = bayMap.get(bayId)
    if (!bay) return null

    const isMatchFilter = checkFilterMatch(bay)
    const isMatchSearch = checkSearchMatch(bay)
    const isSelected = selectedBay?.id === bay.id
    const isHighlighted = searchQuery.trim() && isMatchSearch

    const isBooked = bay.status === 'booked' || bay.status === 'occupied'
    const isReserved = bay.status === 'reserved'
    const statusText = isBooked ? 'BOOKED' : isReserved ? 'RESERVED' : 'AVAILABLE'
    const dotColor = isBooked ? 'red' : isReserved ? 'amber' : 'green'

    const classNames = [
      'cad-standard-bay',
      `bay-status-${statusText.toLowerCase()}`,
      isSelected ? 'bay-selected' : '',
      (!isMatchFilter || (searchQuery.trim() && !isMatchSearch)) ? 'bay-dimmed' : '',
      isHighlighted ? 'bay-match-highlight' : ''
    ].filter(Boolean).join(' ')

    return (
      <div
        key={bay.id}
        id={`bay-${bay.id}`}
        className={classNames}
        onClick={() => handleBayClick(bay)}
        title={`Bay ${bay.id} — ${statusText}`}
      >
        <div className="cad-bay-header">
          <span className="cad-bay-id-text">{bay.id}</span>
          <span className={`cad-bay-dot ${dotColor}`} />
        </div>

        <div className={`cad-bay-label-text text-${statusText.toLowerCase()}`}>
          ● {statusText}
        </div>
      </div>
    )
  }

  return (
    <div className={`cad-dashboard-wrapper ${isBlueprintMode ? 'blueprint-mode' : ''}`}>
      
      {/* ====================================================================
          1. TOP TOOLBAR: FLOOR TOGGLE, FILTERS, SEARCH & BLUEPRINT
          ==================================================================== */}
      <div className="cad-top-toolbar">
        {/* Left: Floor Switcher + Filter Pills */}
        <div className="cad-toolbar-left">
          
          {/* Floor Switcher: Exactly "Ground Floor" & "Basement" */}
          <div className="cad-floor-switcher-container">
            <span className="cad-switcher-label">Floor:</span>
            <div className="cad-floor-segmented-tabs">
              <button
                type="button"
                id="floor-tab-ground"
                className={`cad-floor-tab-btn ${activeFloor === 'ground' ? 'active' : ''}`}
                onClick={() => handleFloorChange('ground')}
              >
                Ground Floor
              </button>
              <button
                type="button"
                id="floor-tab-basement"
                className={`cad-floor-tab-btn ${activeFloor === 'basement' ? 'active' : ''}`}
                onClick={() => handleFloorChange('basement')}
              >
                Basement
              </button>
            </div>
          </div>

          <div className="cad-toolbar-divider" />

          {/* Filter Pills */}
          <span className="cad-filter-label">Filter:</span>
          <div className="cad-filter-pills">
            
            {/* All Slots Pill */}
            <button
              type="button"
              id="filter-all"
              className={`cad-pill-btn ${activeFilter === 'all' ? 'active' : ''}`}
              onClick={() => setActiveFilter('all')}
            >
              All Slots <span className="cad-pill-count">({totalCount})</span>
            </button>

            {/* Available Pill */}
            <button
              type="button"
              id="filter-available"
              className={`cad-pill-btn pill-available ${activeFilter === 'available' ? 'active' : ''}`}
              onClick={() => setActiveFilter('available')}
            >
              Available <span className="cad-pill-count">({availableCount})</span>
            </button>

            {/* Reserved Pill */}
            <button
              type="button"
              id="filter-reserved"
              className={`cad-pill-btn pill-reserved ${activeFilter === 'reserved' ? 'active' : ''}`}
              onClick={() => setActiveFilter('reserved')}
            >
              Reserved <span className="cad-pill-count">({reservedCount})</span>
            </button>

            {/* Booked Pill */}
            <button
              type="button"
              id="filter-booked"
              className={`cad-pill-btn pill-booked ${activeFilter === 'booked' ? 'active' : ''}`}
              onClick={() => setActiveFilter('booked')}
            >
              Booked <span className="cad-pill-count">({bookedCount})</span>
            </button>

          </div>
        </div>

        {/* Right: Search & Blueprint Toggle */}
        <div className="cad-toolbar-right">
          <div className="cad-search-box">
            <svg className="cad-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              id="bay-search-input"
              className="cad-search-input"
              placeholder={activeFloor === 'basement' ? 'Search bay / plate e.g. B-05...' : 'Search bay / plate e.g. G-05...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className="cad-search-clear"
                onClick={() => setSearchQuery('')}
                title="Clear search"
              >
                &times;
              </button>
            )}
          </div>

          <button
            type="button"
            id="toggle-blueprint-btn"
            className={`cad-blueprint-toggle ${isBlueprintMode ? 'active' : ''}`}
            onClick={() => setIsBlueprintMode(!isBlueprintMode)}
            title="Toggle CAD Technical Blueprint Mode"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <line x1="3" y1="9" x2="21" y2="9" />
              <line x1="3" y1="15" x2="21" y2="15" />
              <line x1="9" y1="3" x2="9" y2="21" />
              <line x1="15" y1="3" x2="15" y2="21" />
            </svg>
            Blueprint
          </button>
        </div>
      </div>

      {/* ====================================================================
          2. MAIN MAP CARD (HEADER STRIP + FLOOR CANVAS + PERSISTENT BOTTOM BAR)
          ==================================================================== */}
      <div className="cad-main-card">
        
        {/* ------------------------------------------------------------------
            HEADER STRIP
            ------------------------------------------------------------------ */}
        <div className="cad-header-strip">
          <div className="cad-header-title-group">
            <div className="cad-live-status-dot" />
            <h1 className="cad-header-title">
              {activeFloor === 'basement' ? 'Basement Parking Layout' : 'Ground Floor Parking Layout'}
            </h1>
            <span className="cad-header-subtitle">
              {activeFloor === 'basement' ? 'SOCMAC Smart Park • Basement — Bikes (80 Bays)' : 'SOCMAC Smart Park • Ground Floor — Scooters (80 Bays)'}
            </span>
          </div>

          {/* Right-aligned Legend */}
          <div className="cad-legend">
            <div className="cad-legend-item">
              <span className="cad-legend-square green" />
              <span>Available</span>
            </div>
            <div className="cad-legend-item">
              <span className="cad-legend-square amber" />
              <span>Reserved</span>
            </div>
            <div className="cad-legend-item">
              <span className="cad-legend-square red" />
              <span>Booked</span>
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------------------
            FLOOR MAP CANVAS
            ------------------------------------------------------------------ */}
        <div className="cad-map-scroll-wrapper" tabIndex={0} role="region" aria-label="Parking Layout Blueprint Map">
          {activeFloor === 'basement' ? (
            
            /* ================================================================
               BASEMENT FLOOR LAYOUT (80 BAYS: B-01 TO B-80)
               ================================================================ */
            <div className="cad-map-canvas cad-lg-canvas">
              
              {/* Warning Strip */}
              <div className="cad-lg-warning-bar">
                <div className="cad-lg-warning-left">
                  <span className="cad-lg-warning-dot">●</span>
                  <span className="cad-lg-warning-title">
                    ↓ SUBTERRANEAN INGRESS &amp; CANOPY CLEARANCE [SPEED LIMIT: 10 KM/H]
                  </span>
                </div>
                <div className="cad-lg-warning-right">
                  <span className="cad-lg-clearance-text">
                    Max Clearance: <strong className="cad-lg-clearance-val">3.40m</strong>
                  </span>
                  <span className="cad-lg-radar-text">
                    Induction Radar: <strong className="cad-lg-radar-val">Online</strong>
                  </span>
                </div>
              </div>

              {/* North Wing Bay Cluster: B-01 to B-40 */}
              <div className="cad-lg-wing-section">
                <div className="cad-lg-wing-header">
                  <div className="cad-lg-wing-title">
                    <span className="cad-lg-wing-arrow">▲</span> NORTH WING (B-01 TO B-40) — BIKES
                  </div>
                  <div className="cad-lg-wing-meta">
                    40 STANDARD BIKE BAYS (2.5m × 5.0m)
                  </div>
                </div>

                <div className="cad-south-rows">
                  {/* Row 1: B-01 to B-10 */}
                  <div className="cad-south-row">
                    {['B-01', 'B-02', 'B-03', 'B-04', 'B-05', 'B-06', 'B-07', 'B-08', 'B-09', 'B-10'].map(id => renderBayCard(id))}
                  </div>
                  {/* Row 2: B-11 to B-20 */}
                  <div className="cad-south-row">
                    {['B-11', 'B-12', 'B-13', 'B-14', 'B-15', 'B-16', 'B-17', 'B-18', 'B-19', 'B-20'].map(id => renderBayCard(id))}
                  </div>
                  {/* Row 3: B-21 to B-30 */}
                  <div className="cad-south-row">
                    {['B-21', 'B-22', 'B-23', 'B-24', 'B-25', 'B-26', 'B-27', 'B-28', 'B-29', 'B-30'].map(id => renderBayCard(id))}
                  </div>
                  {/* Row 4: B-31 to B-40 */}
                  <div className="cad-south-row">
                    {['B-31', 'B-32', 'B-33', 'B-34', 'B-35', 'B-36', 'B-37', 'B-38', 'B-39', 'B-40'].map(id => renderBayCard(id))}
                  </div>
                </div>
              </div>

              {/* Central Subterranean Artery */}
              <div className="cad-lg-central-artery">
                <div className="cad-artery-tab tab-in">IN</div>
                
                <div className="cad-artery-road-segment segment-left">
                  <div className="cad-road-dashed-line" />
                  <span className="cad-road-text">◄ WESTBOUND LANE (10 KM/H)</span>
                </div>

                <div className="cad-artery-road-center">
                  <span className="cad-artery-center-dot" />
                  <span className="cad-artery-center-label">Central Artery &bull; Two-Way Flow</span>
                </div>

                <div className="cad-artery-road-segment segment-right">
                  <div className="cad-road-dashed-line" />
                  <span className="cad-road-text">EASTBOUND LANE (10 KM/H) ►</span>
                </div>

                <div className="cad-artery-tab tab-out">OUT</div>
              </div>

              {/* South Wing Bay Cluster: B-41 to B-80 */}
              <div className="cad-lg-wing-section">
                <div className="cad-lg-wing-header">
                  <div className="cad-lg-wing-title">
                    <span className="cad-lg-wing-arrow">▼</span> SOUTH WING (B-41 TO B-80) — BIKES
                  </div>
                  <div className="cad-lg-wing-meta">
                    40 STANDARD BIKE BAYS (2.5m × 5.0m)
                  </div>
                </div>

                <div className="cad-south-rows">
                  {/* Row 1: B-41 to B-50 */}
                  <div className="cad-south-row">
                    {['B-41', 'B-42', 'B-43', 'B-44', 'B-45', 'B-46', 'B-47', 'B-48', 'B-49', 'B-50'].map(id => renderBayCard(id))}
                  </div>
                  {/* Row 2: B-51 to B-60 */}
                  <div className="cad-south-row">
                    {['B-51', 'B-52', 'B-53', 'B-54', 'B-55', 'B-56', 'B-57', 'B-58', 'B-59', 'B-60'].map(id => renderBayCard(id))}
                  </div>
                  {/* Row 3: B-61 to B-70 */}
                  <div className="cad-south-row">
                    {['B-61', 'B-62', 'B-63', 'B-64', 'B-65', 'B-66', 'B-67', 'B-68', 'B-69', 'B-70'].map(id => renderBayCard(id))}
                  </div>
                  {/* Row 4: B-71 to B-80 */}
                  <div className="cad-south-row">
                    {['B-71', 'B-72', 'B-73', 'B-74', 'B-75', 'B-76', 'B-77', 'B-78', 'B-79', 'B-80'].map(id => renderBayCard(id))}
                  </div>
                </div>
              </div>

            </div>

          ) : (

            /* ================================================================
               GROUND FLOOR LAYOUT (80 BAYS: G-01 TO G-80)
               ================================================================ */
            <div className="cad-map-canvas cad-ground-canvas">
              
              {/* Technical Ingress Banner */}
              <div className="cad-ingress-banner">
                <div className="cad-ingress-left">
                  <span className="cad-ingress-pulse" />
                  <span className="cad-ingress-title">
                    ↓ MAIN CAMPUS VEHICULAR INGRESS &amp; OVERHEAD CANOPY
                  </span>
                </div>
                <div className="cad-ingress-right">
                  <span className="cad-ingress-pill speed">
                    SPEED LIMIT: <strong>10 KM/H</strong>
                  </span>
                  <span className="cad-ingress-pill clearance">
                    CLEARANCE: <strong>3.5M</strong>
                  </span>
                  <span className="cad-ingress-pill rfid">
                    RFID GATE: <strong>ONLINE</strong>
                  </span>
                </div>
              </div>

              {/* North Top Row: West Cluster | Compact Main Gate | East Cluster */}
              <div className="cad-top-row-container">
                
                {/* West Wing Cluster: G-45 - G-48 */}
                <div className="cad-cluster-block west-cluster">
                  <div className="cad-cluster-label">WEST WING &bull; G-45 – G-48</div>
                  <div className="cad-cluster-bays">
                    {['G-45', 'G-46', 'G-47', 'G-48'].map(id => renderBayCard(id))}
                  </div>
                </div>

                {/* Main Gate Entry RFID Portal: Compact, Centered & Aligned */}
                <div
                  className="cad-gate-portal-block"
                  onClick={() => setGateModalOpen(true)}
                  role="button"
                  tabIndex={0}
                  title="Click to view Automated RFID Gate Telemetry"
                >
                  <div className="cad-gate-portal-header">
                    <span className="cad-gate-icon">🚧</span>
                    <span className="cad-gate-title">MAIN GATE</span>
                  </div>
                  <div className="cad-gate-sub">ENTRY / EXIT</div>
                  <div className="cad-gate-status">
                    <span className="cad-gate-dot" />
                    <span>RFID &bull; ONLINE</span>
                  </div>
                </div>

                {/* East Wing Cluster: G-36 - G-44 */}
                <div className="cad-cluster-block east-cluster">
                  <div className="cad-cluster-label">EAST WING &bull; G-36 – G-44</div>
                  <div className="cad-cluster-bays">
                    {['G-36', 'G-37', 'G-38', 'G-39', 'G-40', 'G-41', 'G-42', 'G-43', 'G-44'].map(id => renderBayCard(id))}
                  </div>
                </div>

              </div>

              {/* Middle Section: West Row | Circulation Driveway | East Pod */}
              <div className="cad-middle-band">
                
                {/* West Row: G-27 - G-31 */}
                <div className="cad-mid-left-section">
                  <div className="cad-section-mini-tag">WEST ROW &bull; G-27 – G-31</div>
                  <div className="cad-mid-left-stack">
                    {['G-27', 'G-28', 'G-29', 'G-30', 'G-31'].map(id => renderBayCard(id))}
                  </div>
                </div>

                {/* Center Circulation Courtyard & Traffic Lane */}
                <div className="cad-center-driveway">
                  <div className="cad-driveway-lane lane-top">
                    <span className="cad-lane-direction">INGRESS FLOW →</span>
                    <div className="cad-driveway-dashed" />
                    <span className="cad-lane-meta">MAX 10 KM/H</span>
                  </div>

                  <div className="cad-driveway-core">
                    <div className="cad-radar-status-badge">
                      <span className="cad-radar-pulse-dot" />
                      <span>INDUCTIVE SENSOR RADAR ACTIVE &bull; LANES CLEAR</span>
                    </div>
                  </div>

                  <div className="cad-driveway-lane lane-bottom">
                    <span className="cad-lane-direction">← EGRESS &amp; INTERNAL BYPASS</span>
                    <div className="cad-driveway-dashed" />
                    <span className="cad-lane-meta">ONE-WAY FLOW</span>
                  </div>
                </div>

                {/* East Pod: G-32 - G-35 (2x2 Grid) */}
                <div className="cad-mid-right-section">
                  <div className="cad-section-mini-tag">EAST POD &bull; G-32 – G-35</div>
                  <div className="cad-mid-right-special-grid">
                    {['G-32', 'G-33', 'G-34', 'G-35'].map(id => renderBayCard(id))}
                  </div>
                </div>

              </div>

              {/* Perimeter Bays: G-01 to G-26, G-49 to G-80 */}
              <div className="cad-south-perimeter-container">
                <div className="cad-south-header">
                  <span className="cad-south-title">▼ ACCOUNTS &amp; EXAM IT DEPT BAYS (G-01 – G-26 &bull; G-49 – G-80)</span>
                  <span className="cad-south-meta">STANDARD SCOOTER BAYS &bull; SURVEILLANCE &bull; LIFT CORE PROXIMITY</span>
                </div>

                <div className="cad-south-rows">
                  {/* Row 1: G-01 to G-10 */}
                  <div className="cad-south-row">
                    {['G-01', 'G-02', 'G-03', 'G-04', 'G-05', 'G-06', 'G-07', 'G-08', 'G-09', 'G-10'].map(id => renderBayCard(id))}
                  </div>
                  {/* Row 2: G-11 to G-20 */}
                  <div className="cad-south-row">
                    {['G-11', 'G-12', 'G-13', 'G-14', 'G-15', 'G-16', 'G-17', 'G-18', 'G-19', 'G-20'].map(id => renderBayCard(id))}
                  </div>
                  {/* Row 3: G-21 to G-26, G-49 to G-52 */}
                  <div className="cad-south-row">
                    {['G-21', 'G-22', 'G-23', 'G-24', 'G-25', 'G-26', 'G-49', 'G-50', 'G-51', 'G-52'].map(id => renderBayCard(id))}
                  </div>
                  {/* Row 4: G-53 to G-62 */}
                  <div className="cad-south-row">
                    {['G-53', 'G-54', 'G-55', 'G-56', 'G-57', 'G-58', 'G-59', 'G-60', 'G-61', 'G-62'].map(id => renderBayCard(id))}
                  </div>
                  {/* Row 5: G-63 to G-72 */}
                  <div className="cad-south-row">
                    {['G-63', 'G-64', 'G-65', 'G-66', 'G-67', 'G-68', 'G-69', 'G-70', 'G-71', 'G-72'].map(id => renderBayCard(id))}
                  </div>
                  {/* Row 6: G-73 to G-80 */}
                  <div className="cad-south-row">
                    {['G-73', 'G-74', 'G-75', 'G-76', 'G-77', 'G-78', 'G-79', 'G-80'].map(id => renderBayCard(id))}
                  </div>
                </div>
              </div>

            </div>
          )}
        </div>

        {/* ====================================================================
            3. PERSISTENT BOTTOM DETAIL BAR (VISIBLE ON BOTH FLOORS ONCE SELECTED)
            ==================================================================== */}
        {selectedBay ? (
          <div className="cad-bottom-detail-bar" id="bay-detail-bar">
            
            {/* Left: BAY ID Badge Box */}
            <div className="cad-bottom-bay-box">
              <span className="cad-bottom-bay-tag">BAY</span>
              <span className="cad-bottom-bay-id">{selectedBay.id}</span>
            </div>

            {/* Center-Left: Title + Status Badge + Location Subtitle */}
            <div className="cad-bottom-info-block">
              <div className="cad-bottom-title-row">
                <h3 className="cad-bottom-title">Parking Bay {selectedBay.id}</h3>
                <span className={`cad-bottom-status-badge badge-${selectedBay.status === 'available' ? 'available' : (selectedBay.status === 'booked' || selectedBay.status === 'occupied') ? 'booked' : 'reserved'}`}>
                  {selectedBay.status === 'available' ? 'AVAILABLE' : (selectedBay.status === 'booked' || selectedBay.status === 'occupied') ? 'BOOKED' : 'RESERVED'}
                </span>
              </div>
              <div className="cad-bottom-subtitle">
                {selectedBay.wing || (activeFloor === 'ground' ? 'Ground Floor — Scooters' : 'Basement — Bikes')} {selectedBay.row ? `• ${selectedBay.row}` : ''} • Standard Parking Bay ({selectedBay.dimensions || '2.5m × 5.0m'})
              </div>
            </div>

            {/* Center 3 Meta Columns */}
            <div className="cad-bottom-meta-columns">
              <div className="cad-bottom-meta-col">
                <span className="cad-bottom-meta-label">DISTANCE TO LIFT</span>
                <span className="cad-bottom-meta-value">{selectedBay.distanceToLift || '12m (Core Lift)'}</span>
              </div>

              <div className="cad-bottom-meta-col">
                <span className="cad-bottom-meta-label">TARIFF / RATE</span>
                <span className="cad-bottom-meta-value val-tariff-green">{selectedBay.tariff || 'Free w/ Student Tag'}</span>
              </div>

              <div className="cad-bottom-meta-col">
                <span className="cad-bottom-meta-label">CURRENT STATUS</span>
                <span className="cad-bottom-meta-value">
                  {selectedBay.status === 'available' ? 'Available (Slot Clear)' : (selectedBay.status === 'booked' || selectedBay.status === 'occupied') ? 'Booked' : 'Reserved'}
                </span>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="cad-bottom-actions">
              {selectedBay.status === 'available' ? (
                <button
                  type="button"
                  id="btn-reserve-slot"
                  className="cad-bottom-btn-reserve"
                  onClick={() => handleReserveFromBottomBar(selectedBay)}
                >
                  ✓ Reserve Slot {selectedBay.id}
                </button>
              ) : (selectedBay.status === 'booked' || selectedBay.status === 'occupied') ? (
                <button
                  type="button"
                  id="btn-occupied-status"
                  className="cad-bottom-btn-occupied"
                  disabled
                >
                  Booked till {selectedBay.statusChangesAt ? getFormattedTime(selectedBay.statusChangesAt) : '04:30 PM'}
                </button>
              ) : (
                <button
                  type="button"
                  id="btn-cancel-reservation"
                  className="cad-bottom-btn-reserved"
                  onClick={() => handleCancelReservationFromBottomBar(selectedBay)}
                >
                  Ends at {selectedBay.statusChangesAt ? getFormattedTime(selectedBay.statusChangesAt) : '05:00 PM'} — Cancel
                </button>
              )}

              <button
                type="button"
                id="btn-share-bay"
                className="cad-bottom-btn-share"
                onClick={() => handleShareBay(selectedBay)}
              >
                <span className="cad-share-symbol">⇦</span> Share
              </button>
            </div>

          </div>
        ) : (
          <div className="cad-bottom-detail-bar empty-placeholder">
            <div className="cad-bottom-empty-text">
              ✦ Click any bay on the master plan grid to inspect live telemetry, lift proximity, and slot allocation controls.
            </div>
          </div>
        )}

      </div>

      {/* ====================================================================
          MODAL: MAIN GATE AUTOMATED RFID TELEMETRY (Ground floor only)
          ==================================================================== */}
      {gateModalOpen && (
        <div className="cad-modal-backdrop" onClick={() => setGateModalOpen(false)}>
          <div className="cad-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="cad-modal-header">
              <div className="cad-modal-header-left">
                <span className="cad-modal-badge badge-reserved">GATE TELEMETRY</span>
                <h3 className="cad-modal-title">Main Entry Barrier RFID Status</h3>
              </div>
              <button type="button" className="cad-modal-close-btn" onClick={() => setGateModalOpen(false)}>&times;</button>
            </div>

            <div className="cad-modal-body">
              <div className="cad-modal-info-grid">
                <div className="cad-info-item">
                  <span className="cad-info-label">Gate Controller</span>
                  <span className="cad-info-value highlight-amber">GATE-01 (Automated ANPR)</span>
                </div>
                <div className="cad-info-item">
                  <span className="cad-info-label">Barrier State</span>
                  <span className="cad-info-value highlight-green">ARM ARMED &bull; READY</span>
                </div>
                <div className="cad-info-item">
                  <span className="cad-info-label">Loop Sensor</span>
                  <span className="cad-info-value">Inductive Radar Active</span>
                </div>
                <div className="cad-info-item">
                  <span className="cad-info-label">Speed Enforcement</span>
                  <span className="cad-info-value">Max 10 KM/H</span>
                </div>
              </div>

              <div className="cad-modal-actions">
                <button type="button" className="cad-btn-primary" onClick={() => setGateModalOpen(false)}>
                  Acknowledge
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification Container */}
      {toast && (
        <div className="cad-toast-container">
          <div className="cad-toast-card">
            <span className="cad-toast-icon">{toast.icon}</span>
            <div className="cad-toast-text">
              <span className="cad-toast-title">{toast.title}</span>
              <span className="cad-toast-desc">{toast.desc}</span>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
