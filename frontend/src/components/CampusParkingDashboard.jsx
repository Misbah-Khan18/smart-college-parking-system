import { useState, useMemo, useEffect, useRef } from 'react'
import {
  createInitialBayData,
  createLowerGroundBayData,
  getFormattedTime,
  getDurationString,
  generatePassId
} from '../data/campusMasterPlanData'
import './CampusParkingDashboard.css'

export default function CampusParkingDashboard({ slots, userProfile, onOpenBooking }) {
  // 1. Active Floor State (persists within same session)
  const [activeFloor, setActiveFloor] = useState(() => {
    return sessionStorage.getItem('campus_active_floor') || 'ground'
  })

  // 2. In-memory Master Bay State per floor
  const [groundBays, setGroundBays] = useState(() => createInitialBayData())
  const [lowerGroundBays, setLowerGroundBays] = useState(() => createLowerGroundBayData())

  // Active bays based on chosen floor
  const currentBays = activeFloor === 'ground' ? groundBays : lowerGroundBays

  // 3. Active filters & Search
  const [activeFilter, setActiveFilter] = useState('all') // 'all' | 'available' | 'reserved' | 'booked'
  const [searchQuery, setSearchQuery] = useState('')
  const [isBlueprintMode, setIsBlueprintMode] = useState(false)

  // 4. Selected Bay (Persistent Bottom Detail Bar)
  const [activeBay, setActiveBay] = useState(() => {
    const initialFloor = sessionStorage.getItem('campus_active_floor') || 'lower_ground'
    if (initialFloor === 'lower_ground') {
      const lgBays = createLowerGroundBayData()
      return lgBays.find(b => b.id === 'LG-T01') || null
    }
    return null
  })

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
  const [currentTime, setCurrentTime] = useState(new Date())
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
    return (
      bay.id.toLowerCase().includes(q) ||
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
      setLowerGroundBays(prev => prev.map(b => b.id === bayId ? updater(b) : b))
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
      `Active view: ${newFloor === 'ground' ? 'Ground Floor Master Plan' : 'Lower Ground Floor Master Plan'}`,
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
      onOpenBooking(
        {
          id: bay.id,
          floor: activeFloor === 'ground' ? 'Ground Floor' : 'Lower Ground Floor',
          section: bay.wing || (activeFloor === 'ground' ? 'Ground Master Plan' : 'Subterranean Master Plan')
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
    const isP1 = bay.id === 'P1'
    const updatedProps = {
      status: 'available',
      label: isP1 ? 'OPEN' : 'FREE',
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
  // RENDER HELPER FOR LOWER GROUND BAY CARDS (10x2 WING GRIDS)
  // Clean 3-status system: Available (green), Reserved (amber), Booked (red)
  // =========================================================================
  const renderLgBayCard = (bayId) => {
    const bay = bayMap.get(bayId)
    if (!bay) return null

    const isMatchFilter = checkFilterMatch(bay)
    const isMatchSearch = checkSearchMatch(bay)
    const isSelected = selectedBay?.id === bay.id
    const isHighlighted = searchQuery.trim() && isMatchSearch

    const isBooked = bay.status === 'booked' || bay.status === 'occupied'
    const isReserved = bay.status === 'reserved'
    const statusText = isBooked ? 'BOOKED' : isReserved ? 'RESERVED' : 'AVAILABLE'
    const dotClass = isBooked ? 'dot-red' : isReserved ? 'dot-amber' : 'dot-green'
    const statusWordClass = isBooked ? 'status-booked' : isReserved ? 'status-reserved' : 'status-available'

    const classNames = [
      'cad-lg-bay-card',
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
        {/* Top: ID top-left & Status dot top-right */}
        <div className="cad-lg-bay-top">
          <span className="cad-lg-bay-id">{bay.id}</span>
          <span className={`cad-lg-dot ${dotClass}`} />
        </div>

        {/* Center: Bold Status Word */}
        <div className="cad-lg-bay-center">
          <div className={`cad-lg-status-word ${statusWordClass}`}>
            {statusText}
          </div>
        </div>

        {/* Bottom: Dimensions Subtext */}
        <div className="cad-lg-bay-bottom">
          <span className="cad-lg-subtext">{bay.dimensions || '2.5m × 5.0m'}</span>
        </div>
      </div>
    )
  }

  // =========================================================================
  // RENDER HELPER FOR GROUND FLOOR STANDARD CELLS
  // Clean 3-status system: Available (green), Reserved (amber), Booked (red)
  // =========================================================================
  const renderStandardBay = (bayId) => {
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
          {statusText}
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
          
          {/* Floor Switcher Segmented Control */}
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
                id="floor-tab-lower-ground"
                className={`cad-floor-tab-btn ${activeFloor === 'lower_ground' ? 'active' : ''}`}
                onClick={() => handleFloorChange('lower_ground')}
              >
                Lower Ground Floor
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
              placeholder={activeFloor === 'lower_ground' ? 'Search bay e.g. LG-T01...' : 'Search bay e.g. P1...'}
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
            HEADER STRIP: Updates based on active floor
            ------------------------------------------------------------------ */}
        <div className="cad-header-strip">
          <div className="cad-header-title-group">
            <div className="cad-live-status-dot" />
            <h1 className="cad-header-title">
              {activeFloor === 'lower_ground' ? 'Lower Ground Master Plan' : 'Ground Floor Master Plan'}
            </h1>
            <span className="cad-header-subtitle">
              {activeFloor === 'lower_ground' ? 'CAD ref: DWG-AIT-LG01-REV3' : 'CAD ref: DWG-AIT-FL06'}
            </span>
          </div>

          {/* Right-aligned Legend: 3 Universal Statuses */}
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
            FLOOR MAP CONTENT
            Horizontally scrollable on mobile/tablet to preserve 100% of CAD blueprint
            ------------------------------------------------------------------ */}
        <div className="cad-mobile-scroll-hint" role="status" aria-label="Horizontal scroll indicator">
          <span className="cad-hint-arrow">⇄</span>
          <span>Swipe horizontally to explore full parking blueprint &amp; bays</span>
        </div>

        <div className="cad-map-scroll-wrapper" tabIndex={0} role="region" aria-label="Parking Layout Blueprint Map">
          {activeFloor === 'lower_ground' ? (
            
            /* ================================================================
               LOWER GROUND FLOOR LAYOUT (MATCHES REFERENCE IMAGE EXACTLY)
               ================================================================ */
            <div className="cad-map-canvas cad-lg-canvas">
              
              {/* Warning Strip: Dark bar (not yellow-striped) */}
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

              {/* North Wing Bay Cluster */}
              <div className="cad-lg-wing-section">
                <div className="cad-lg-wing-header">
                  <div className="cad-lg-wing-title">
                    <span className="cad-lg-wing-arrow">▲</span> NORTH WING BAY CLUSTER (LG-T01 TO LG-T20)
                  </div>
                  <div className="cad-lg-wing-meta">
                    20 EQUAL STANDARD SLOTS (2.5m × 5.0m)
                  </div>
                </div>

                {/* North Wing Grid: 10 columns × 2 rows */}
                <div className="cad-lg-grid">
                  {/* Row 1: LG-T01 to LG-T10 */}
                  {['LG-T01', 'LG-T02', 'LG-T03', 'LG-T04', 'LG-T05', 'LG-T06', 'LG-T07', 'LG-T08', 'LG-T09', 'LG-T10'].map(id => renderLgBayCard(id))}
                  {/* Row 2: LG-T11 to LG-T20 */}
                  {['LG-T11', 'LG-T12', 'LG-T13', 'LG-T14', 'LG-T15', 'LG-T16', 'LG-T17', 'LG-T18', 'LG-T19', 'LG-T20'].map(id => renderLgBayCard(id))}
                </div>
              </div>

              {/* Central Artery Divider: Road Styling */}
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

              {/* South Wing Bay Cluster */}
              <div className="cad-lg-wing-section">
                <div className="cad-lg-wing-header">
                  <div className="cad-lg-wing-title">
                    <span className="cad-lg-wing-arrow">▼</span> SOUTH WING BAY CLUSTER (LG-B01 TO LG-B20)
                  </div>
                  <div className="cad-lg-wing-meta">
                    20 EQUAL STANDARD SLOTS (2.5m × 5.0m)
                  </div>
                </div>

                {/* South Wing Grid: 10 columns × 2 rows */}
                <div className="cad-lg-grid">
                  {/* Row 1: LG-B01 to LG-B10 */}
                  {['LG-B01', 'LG-B02', 'LG-B03', 'LG-B04', 'LG-B05', 'LG-B06', 'LG-B07', 'LG-B08', 'LG-B09', 'LG-B10'].map(id => renderLgBayCard(id))}
                  {/* Row 2: LG-B11 to LG-B20 */}
                  {['LG-B11', 'LG-B12', 'LG-B13', 'LG-B14', 'LG-B15', 'LG-B16', 'LG-B17', 'LG-B18', 'LG-B19', 'LG-B20'].map(id => renderLgBayCard(id))}
                </div>
              </div>

            </div>

          ) : (

            /* ================================================================
               GROUND FLOOR LAYOUT (DWG-AIT-FL06)
               Clean, Structured, Well-Margined Campus Parking Layout
               ================================================================ */
            <div className="cad-map-canvas cad-ground-canvas">
              
              {/* Sleek Technical Ingress Banner (No harsh hazard stripes) */}
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

              {/* North Perimeter Bays & Main RFID Gateway */}
              <div className="cad-top-row-container">
                
                {/* West Cluster: P45 - P48 */}
                <div className="cad-cluster-block west-cluster">
                  <div className="cad-cluster-label">WEST WING &bull; P45 – P48</div>
                  <div className="cad-cluster-bays">
                    {['P45', 'P46', 'P47', 'P48'].map(id => renderStandardBay(id))}
                  </div>
                </div>

                {/* Main Gate Entry RFID Portal */}
                <div
                  className="cad-gate-portal-block"
                  onClick={() => setGateModalOpen(true)}
                  role="button"
                  tabIndex={0}
                  title="Click to view Automated RFID Gate Telemetry"
                >
                  <div className="cad-gate-portal-header">
                    <span className="cad-gate-icon">🚧</span>
                    <span className="cad-gate-rfid-chip">RFID ANPR</span>
                  </div>
                  <div className="cad-gate-title">MAIN GATE ACCESS</div>
                  <div className="cad-gate-status">
                    <span className="cad-gate-dot" />
                    <span>AUTOMATED BARRIER</span>
                  </div>
                </div>

                {/* East Cluster: P36 - P44 */}
                <div className="cad-cluster-block east-cluster">
                  <div className="cad-cluster-label">EAST WING &bull; P36 – P44</div>
                  <div className="cad-cluster-bays">
                    {['P36', 'P37', 'P38', 'P39', 'P40', 'P41', 'P42', 'P43', 'P44'].map(id => renderStandardBay(id))}
                  </div>
                </div>

              </div>

              {/* Middle Section: West Perimeter Stack | Circulation Driveway | East 2x2 Grid */}
              <div className="cad-middle-band">
                
                {/* West Stack: P27 - P31 */}
                <div className="cad-mid-left-section">
                  <div className="cad-section-mini-tag">WEST ROW &bull; P27-P31</div>
                  <div className="cad-mid-left-stack">
                    {['P27', 'P28', 'P29', 'P30', 'P31'].map(id => {
                      const bay = bayMap.get(id)
                      if (!bay) return null
                      const isMatchFilter = checkFilterMatch(bay)
                      const isMatchSearch = checkSearchMatch(bay)
                      const isSelected = selectedBay?.id === bay.id
                      const isHighlighted = searchQuery.trim() && isMatchSearch
                      const isBooked = bay.status === 'booked' || bay.status === 'occupied'
                      const isReserved = bay.status === 'reserved'
                      const statusText = isBooked ? 'BOOKED' : isReserved ? 'RESERVED' : 'AVAILABLE'
                      const statusColorClass = isBooked ? 'status-booked' : isReserved ? 'status-reserved' : 'status-available'

                      return (
                        <div
                          key={bay.id}
                          id={`bay-${bay.id}`}
                          className={`cad-stack-bay ${isSelected ? 'bay-selected' : ''} ${(!isMatchFilter || (searchQuery.trim() && !isMatchSearch)) ? 'bay-dimmed' : ''} ${isHighlighted ? 'bay-match-highlight' : ''}`}
                          onClick={() => handleBayClick(bay)}
                          title={`Bay ${bay.id} — ${statusText}`}
                        >
                          <div className="cad-stack-bay-left">
                            <span className="cad-stack-bay-id">{bay.id}</span>
                            <span className={`cad-stack-dot dot-${statusText.toLowerCase()}`} />
                          </div>
                          <span className={`cad-stack-bay-status ${statusColorClass}`}>
                            {statusText}
                          </span>
                        </div>
                      )
                    })}
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

                {/* East Cluster: P32 - P35 (2x2 Grid) */}
                <div className="cad-mid-right-section">
                  <div className="cad-section-mini-tag">EAST POD &bull; P32-P35</div>
                  <div className="cad-mid-right-special-grid">
                    {['P32', 'P33', 'P34', 'P35'].map(id => renderStandardBay(id))}
                  </div>
                </div>

              </div>

              {/* South Perimeter Bays: P1 to P20 (Structured into 2 neat rows of 10 bays) */}
              <div className="cad-south-perimeter-container">
                <div className="cad-south-header">
                  <span className="cad-south-title">▼ SOUTH PERIMETER BAYS (P01 – P20)</span>
                  <span className="cad-south-meta">20 STANDARD CAMPUS SLOTS &bull; LIFT CORE PROXIMITY</span>
                </div>

                <div className="cad-south-rows">
                  <div className="cad-south-row">
                    {['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8', 'P9', 'P10'].map(id => renderStandardBay(id))}
                  </div>
                  <div className="cad-south-row">
                    {['P11', 'P12', 'P13', 'P14', 'P15', 'P16', 'P17', 'P18', 'P19', 'P20'].map(id => renderStandardBay(id))}
                  </div>
                </div>
              </div>

            </div>
          )}
        </div>

        {/* ====================================================================
            3. PERSISTENT BOTTOM DETAIL BAR (VISIBLE ON BOTH FLOORS ONCE SELECTED)
            Matches the reference image bottom bar exactly
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
                {selectedBay.wing || 'Campus Wing'} {selectedBay.row ? `• ${selectedBay.row}` : ''} • Standard Parking Bay ({selectedBay.dimensions || '2.5m × 5.0m'})
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
