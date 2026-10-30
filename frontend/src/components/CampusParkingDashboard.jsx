import { useState, useMemo, useEffect, useRef } from 'react'
import {
  createInitialBayData,
  createBasementBayData,
  getDisplaySlotId
} from '../data/campusMasterPlanData'
import './CampusParkingDashboard.css'
import ParkingMapViewport from './map/ParkingMapViewport'

export default function CampusParkingDashboard({
  slots = [],
  userProfile,
  onOpenBooking,
  activeReservation = null,
  onCancelReservation = null,
  onSelectSlot = null
}) {
  // 1. Active Floor State (persists within same session) - 'ground' | 'basement'
  const [activeFloor, setActiveFloor] = useState(() => {
    const saved = sessionStorage.getItem('campus_active_floor')
    if (saved === 'basement' || saved === 'ground') return saved
    if (userProfile?.vehicleType === 'bike') return 'basement'
    return 'ground'
  })

  // 2. Master Bay State per floor (80 Ground + 80 Basement = 160 bays)
  const [groundBays] = useState(() => createInitialBayData())
  const [basementBays] = useState(() => createBasementBayData())

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

  // 4. Selected Bay (highlight on click)
  const [activeBay, setActiveBay] = useState(null)

  // Synchronized selected bay object
  const selectedBay = useMemo(() => {
    if (!activeBay) return null
    return currentBays.find(b => b.id === activeBay.id) || activeBay
  }, [currentBays, activeBay])

  // Gate Info Modal State (for RFID Gate Telemetry)
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

  // Handle Bay Click (Only available slots are selectable for booking)
  const handleBayClick = (bay) => {
    if (!bay) return

    if (bay.status !== 'available') {
      showToast(
        `Bay ${bay.id} is ${bay.status === 'reserved' ? 'Reserved' : 'Booked'}`,
        'Only Available slots can be selected for booking.',
        'ℹ️'
      )
      return
    }

    // Toggle selection if clicking the same available slot
    if (activeBay?.id === bay.id) {
      setActiveBay(null)
    } else {
      setActiveBay(bay)
      if (onSelectSlot) {
        onSelectSlot(bay)
      }
    }
  }

  // Handle Proceed to Book from compact action bar
  const handleProceedToBook = () => {
    if (!selectedBay || selectedBay.status !== 'available') return

    // Prevent double booking if student already has an active reservation
    if (activeReservation) {
      const activeBayId =
        activeReservation.slotId ||
        (activeReservation.id?.startsWith('RES-') ? activeReservation.id.split('-')[1] : activeReservation.id) ||
        'an allocated bay'
      showToast(
        'Active Reservation Already Exists',
        `You currently have Bay ${activeBayId} reserved. Please release it before booking a new bay.`,
        '⚠️'
      )
      return
    }

    if (onOpenBooking) {
      const live = liveSlotMap.get(selectedBay.id)
      const slotObj = live || {
        id: selectedBay.id,
        floor: activeFloor === 'ground' ? 'Ground Floor' : 'Basement',
        section: selectedBay.wing || (activeFloor === 'ground' ? 'Ground Floor — Scooters' : 'Basement — Bikes'),
        type: activeFloor === 'ground' ? 'scooty' : 'bike',
        status: 'available'
      }
      onOpenBooking(slotObj, 'slot')
    }
  }

  // Keyboard escape listener to close any modals or clear selection
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setGateModalOpen(false)
        setActiveBay(null)
      }
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
    const isSelected = selectedBay?.id === bay.id && selectedBay?.status === 'available'
    const isHighlighted = searchQuery.trim() && isMatchSearch

    const isBooked = bay.status === 'booked' || bay.status === 'occupied'
    const isReserved = bay.status === 'reserved'
    const statusText = isBooked ? 'Booked' : isReserved ? 'Reserved' : 'Available'
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
        title={`Bay ${bay.id} — ${statusText}${bay.status === 'available' ? ' • Click to select' : ''}`}
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

          {userProfile?.displayName && (
            <div className="cad-student-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.3)', borderRadius: '20px', padding: '4px 10px', color: '#38bdf8' }}>
              <span>👤 {userProfile.displayName}</span>
              <span style={{ color: '#94a3b8' }}>•</span>
              <span style={{ textTransform: 'capitalize' }}>{userProfile.vehicleType || 'Scooty'}</span>
            </div>
          )}

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
          2. MAIN MAP CARD (HEADER STRIP + CLEAN 4-ZONE FLOOR CANVAS)
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
              {activeFloor === 'basement' ? 'SOCMAC Smart Park • Basement — Bikes (80 Bays)' : 'SOCMAC Smart Park • Ground Floor — Scooties (80 Bays)'}
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
            FLOOR MAP CANVAS (DIRECT RESPONSIVE BLUEPRINT LAYOUT)
            ------------------------------------------------------------------ */}
        <ParkingMapViewport>
          {activeFloor === 'basement' ? (
            
            /* ================================================================
               BASEMENT — MAP LAYOUT (B-01 TO B-80)
               ─── Row 1: Bike Front (Left: B-01..B-20) | Entry/Exit Gate | Bike Opp (Right: B-21..B-40)
               ─── Row 2: Bike Left (Left: B-41..B-60)  | Central Pathway  | Bike Right (Right: B-61..B-80)
               ================================================================ */
            <div className="cad-map-canvas cad-ground-canvas">

              {/* Subterranean Ingress Banner */}
              <div className="cad-ingress-banner">
                <div className="cad-ingress-left">
                  <span className="cad-ingress-pulse" />
                  <span className="cad-ingress-title">↓ SUBTERRANEAN VEHICULAR INGRESS · RFID AUTOMATED GATE</span>
                </div>
                <div className="cad-ingress-right">
                  <span className="cad-ingress-pill speed">MAX <strong>10 KM/H</strong></span>
                  <span className="cad-ingress-pill clearance">CLEARANCE <strong>3.4M</strong></span>
                  <span className="cad-ingress-pill rfid">RFID <strong>ONLINE</strong></span>
                </div>
              </div>

              {/* ── ROW 1: P1 Bike | Entry/Exit Gate | P2 Bike ── */}
              <div className="gf-row gf-row-top">

                {/* Left Top: Bike Area Front (B-01 to B-20) */}
                <div className="gf-zone gf-zone-f1">
                  <div className="gf-zone-header">
                    <span className="gf-zone-icon">🏍️</span>
                    <div>
                      <div className="gf-zone-title">Bike Area Front (P1)</div>
                      <div className="gf-zone-sub">B-01 — B-20 • 20 Bays</div>
                    </div>
                  </div>
                  <div className="gf-bay-grid gf-grid-5col">
                    {Array.from({ length: 20 }, (_, i) => `B-${String(i + 1).padStart(2, '0')}`).map(id => renderBayCard(id))}
                  </div>
                </div>

                {/* Central Pathway: Entry / Exit Gate */}
                <div
                  className="gf-gate-block"
                  onClick={() => setGateModalOpen(true)}
                  role="button"
                  tabIndex={0}
                  title="Click to view RFID Gate Telemetry"
                >
                  <div className="gf-gate-icon-wrap">🚧</div>
                  <div className="gf-gate-label">Entry / Exit</div>
                  <div className="gf-gate-status-row">
                    <span className="cad-gate-dot" />
                    <span>RFID · ONLINE</span>
                  </div>
                </div>

                {/* Right Top: Bike Area Opposite (B-21 to B-40) */}
                <div className="gf-zone gf-zone-f1">
                  <div className="gf-zone-header">
                    <span className="gf-zone-icon">🏍️</span>
                    <div>
                      <div className="gf-zone-title">Bike Area Opposite (P2)</div>
                      <div className="gf-zone-sub">B-21 — B-40 • 20 Bays</div>
                    </div>
                  </div>
                  <div className="gf-bay-grid gf-grid-5col">
                    {Array.from({ length: 20 }, (_, i) => `B-${String(i + 21).padStart(2, '0')}`).map(id => renderBayCard(id))}
                  </div>
                </div>

              </div>

              {/* ── ROW 2: Bike Left | Central Pathway | Bike Right ── */}
              <div className="gf-row gf-row-middle">

                {/* Left Bottom: Bike Area Left (B-41 to B-60) */}
                <div className="gf-zone gf-zone-f1">
                  <div className="gf-zone-header">
                    <span className="gf-zone-icon">🏍️</span>
                    <div>
                      <div className="gf-zone-title">Bike Area Left (F1)</div>
                      <div className="gf-zone-sub">B-41 — B-60 • 20 Bays</div>
                    </div>
                  </div>
                  <div className="gf-bay-grid gf-grid-5col">
                    {Array.from({ length: 20 }, (_, i) => `B-${String(i + 41).padStart(2, '0')}`).map(id => renderBayCard(id))}
                  </div>
                </div>

                {/* Central Pathway */}
                <div className="gf-circ-lane">
                  <span className="gf-circ-arrow">↓</span>
                  <span className="gf-circ-text">CENTRAL PATHWAY</span>
                  <span className="gf-circ-arrow">↑</span>
                </div>

                {/* Right Bottom: Bike Area Right (B-61 to B-80) */}
                <div className="gf-zone gf-zone-f1">
                  <div className="gf-zone-header">
                    <span className="gf-zone-icon">🏍️</span>
                    <div>
                      <div className="gf-zone-title">Bike Area Right (F1)</div>
                      <div className="gf-zone-sub">B-61 — B-80 • 20 Bays</div>
                    </div>
                  </div>
                  <div className="gf-bay-grid gf-grid-5col">
                    {Array.from({ length: 20 }, (_, i) => `B-${String(i + 61).padStart(2, '0')}`).map(id => renderBayCard(id))}
                  </div>
                </div>

              </div>

            </div>

          ) : (

            /* ================================================================
               GROUND FLOOR — MAP LAYOUT (G-01 TO G-80)
               ─── Row 1: Accounts Front (Left: G-01..G-20) | Entry/Exit Gate | Accounts Opp (Right: G-21..G-40)
               ─── Row 2: Exam IT Front (Left: G-41..G-60)  | Central Pathway  | Exam IT Opp (Right: G-61..G-80)
               ================================================================ */
            <div className="cad-map-canvas cad-ground-canvas">

              {/* Ingress Banner */}
              <div className="cad-ingress-banner">
                <div className="cad-ingress-left">
                  <span className="cad-ingress-pulse" />
                  <span className="cad-ingress-title">↓ CAMPUS VEHICULAR INGRESS · RFID AUTOMATED GATE</span>
                </div>
                <div className="cad-ingress-right">
                  <span className="cad-ingress-pill speed">MAX <strong>10 KM/H</strong></span>
                  <span className="cad-ingress-pill clearance">CLEARANCE <strong>3.5M</strong></span>
                  <span className="cad-ingress-pill rfid">RFID <strong>ONLINE</strong></span>
                </div>
              </div>

              {/* ── ROW 1: Accounts Front | Entry/Exit | Accounts Opp ── */}
              <div className="gf-row gf-row-top">

                {/* Left Top: Accounts Dept Front (G-01 to G-20) */}
                <div className="gf-zone gf-zone-scooty">
                  <div className="gf-zone-header">
                    <span className="gf-zone-icon">🛵</span>
                    <div>
                      <div className="gf-zone-title">Accounts Dept Front</div>
                      <div className="gf-zone-sub">G-01 — G-20 • 20 Bays</div>
                    </div>
                  </div>
                  <div className="gf-bay-grid gf-grid-5col">
                    {Array.from({ length: 20 }, (_, i) => `G-${String(i + 1).padStart(2, '0')}`).map(id => renderBayCard(id))}
                  </div>
                </div>

                {/* Central Pathway: Entry / Exit Gate */}
                <div
                  className="gf-gate-block"
                  onClick={() => setGateModalOpen(true)}
                  role="button"
                  tabIndex={0}
                  title="Click to view RFID Gate Telemetry"
                >
                  <div className="gf-gate-icon-wrap">🚧</div>
                  <div className="gf-gate-label">Entry / Exit</div>
                  <div className="gf-gate-status-row">
                    <span className="cad-gate-dot" />
                    <span>RFID · ONLINE</span>
                  </div>
                </div>

                {/* Right Top: Accounts Dept Opposite (G-21 to G-40) */}
                <div className="gf-zone gf-zone-scooty">
                  <div className="gf-zone-header">
                    <span className="gf-zone-icon">🛵</span>
                    <div>
                      <div className="gf-zone-title">Accounts Dept Opposite</div>
                      <div className="gf-zone-sub">G-21 — G-40 • 20 Bays</div>
                    </div>
                  </div>
                  <div className="gf-bay-grid gf-grid-5col">
                    {Array.from({ length: 20 }, (_, i) => `G-${String(i + 21).padStart(2, '0')}`).map(id => renderBayCard(id))}
                  </div>
                </div>

              </div>

              {/* ── ROW 2: Exam IT Front | Central Pathway | Exam IT Opp ── */}
              <div className="gf-row gf-row-middle">

                {/* Left Bottom: Exam IT Front (G-41 to G-60) */}
                <div className="gf-zone gf-zone-scooty">
                  <div className="gf-zone-header">
                    <span className="gf-zone-icon">🛵</span>
                    <div>
                      <div className="gf-zone-title">Exam IT Front</div>
                      <div className="gf-zone-sub">G-41 — G-60 • 20 Bays</div>
                    </div>
                  </div>
                  <div className="gf-bay-grid gf-grid-5col">
                    {Array.from({ length: 20 }, (_, i) => `G-${String(i + 41).padStart(2, '0')}`).map(id => renderBayCard(id))}
                  </div>
                </div>

                {/* Central Pathway */}
                <div className="gf-circ-lane">
                  <span className="gf-circ-arrow">↓</span>
                  <span className="gf-circ-text">CENTRAL PATHWAY</span>
                  <span className="gf-circ-arrow">↑</span>
                </div>

                {/* Right Bottom: Exam IT Opposite (G-61 to G-80) */}
                <div className="gf-zone gf-zone-scooty">
                  <div className="gf-zone-header">
                    <span className="gf-zone-icon">🛵</span>
                    <div>
                      <div className="gf-zone-title">Exam IT Opposite</div>
                      <div className="gf-zone-sub">G-61 — G-80 • 20 Bays</div>
                    </div>
                  </div>
                  <div className="gf-bay-grid gf-grid-5col">
                    {Array.from({ length: 20 }, (_, i) => `G-${String(i + 61).padStart(2, '0')}`).map(id => renderBayCard(id))}
                  </div>
                </div>

              </div>

            </div>
          )}
        </ParkingMapViewport>

        {/* ====================================================================
            COMPACT BOOKING ACTION BAR (APPEARS ON AVAILABLE SLOT SELECTION)
            ==================================================================== */}
        {selectedBay && selectedBay.status === 'available' && (
          <div className="cad-booking-action-bar" id="cad-booking-action-bar">
            <div className="cad-action-bar-left">
              <div className="cad-action-badge">
                <span className="cad-action-dot" />
                <span className="cad-action-slot-id">{selectedBay.id}</span>
                <span className="cad-action-selected-text">Selected</span>
              </div>
              <div className="cad-action-meta">
                <span className="cad-action-floor">
                  {activeFloor === 'basement' ? 'Basement • Bike' : 'Ground Floor • Scooty'}
                </span>
                {selectedBay.wing && (
                  <span className="cad-action-wing">• {selectedBay.wing}</span>
                )}
              </div>
            </div>

            <div className="cad-action-bar-right">
              <button
                type="button"
                className="cad-btn-proceed-booking"
                id="btn-proceed-booking"
                onClick={handleProceedToBook}
              >
                <span>Proceed to Book Slot</span>
                <span className="cad-btn-arrow">→</span>
              </button>
              <button
                type="button"
                className="cad-btn-action-clear"
                onClick={() => setActiveBay(null)}
                title="Deselect slot"
                aria-label="Deselect slot"
              >
                &times;
              </button>
            </div>
          </div>
        )}

      </div>

      {/* ====================================================================
          MODAL: MAIN GATE AUTOMATED RFID TELEMETRY (RFID Gate Details)
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
