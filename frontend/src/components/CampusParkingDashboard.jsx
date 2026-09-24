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
    if (saved === 'basement' || saved === 'ground') return saved
    if (userProfile?.vehicleType === 'bike') return 'basement'
    return 'ground'
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
  // Supports standard boxy cards [] and high-density compact bike bays
  // =========================================================================
  const renderBayCard = (bayId, isCompact = false) => {
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
      isCompact ? 'cad-compact-bike-bay' : 'cad-standard-bay',
      `bay-status-${statusText.toLowerCase()}`,
      isSelected ? 'bay-selected' : '',
      (!isMatchFilter || (searchQuery.trim() && !isMatchSearch)) ? 'bay-dimmed' : '',
      isHighlighted ? 'bay-match-highlight' : ''
    ].filter(Boolean).join(' ')

    if (isCompact) {
      return (
        <div
          key={bay.id}
          id={`bay-${bay.id}`}
          className={classNames}
          onClick={() => handleBayClick(bay)}
          title={`Bay ${bay.id} — ${statusText} • Click to select / book`}
        >
          <span className="cad-compact-bay-id">{bay.id.replace('G-', '')}</span>
          <span className={`cad-compact-bay-dot ${dotColor}`} />
        </div>
      )
    }

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
              {activeFloor === 'basement' ? 'SOCMAC Smart Park • Basement — Bikes (80 Bays)' : 'SOCMAC Smart Park • Ground Floor — Two-Wheelers & Bikes (140 Bays)'}
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
               BASEMENT — MAP LAYOUT (B-01 TO B-80)
               ─── Row 1: P1 Bike Parking (50ft, full-width) — B-01 to B-30
               ─── Row 2: IN Gate | F1 Parking (28ft, left) | gap | F1 Parking (28ft, right) | OUT Gate
               ─── Row 3: P3 Parking (25ft, left) | Lift Core | P3 Parking (25ft, right)
               ================================================================ */
            <div className="cad-map-canvas cad-lg-canvas">

              {/* Basement Ingress Banner */}
              <div className="cad-lg-warning-bar">
                <div className="cad-lg-warning-left">
                  <span className="cad-lg-warning-dot">●</span>
                  <span className="cad-lg-warning-title">↓ SUBTERRANEAN INGRESS · RFID CONTROLLED · SPEED LIMIT 10 KM/H</span>
                </div>
                <div className="cad-lg-warning-right">
                  <span className="cad-lg-clearance-text">Clearance: <strong className="cad-lg-clearance-val">3.40m</strong></span>
                  <span className="cad-lg-radar-text">Radar: <strong className="cad-lg-radar-val">Online</strong></span>
                </div>
              </div>

              {/* ── ROW 1: P1 Bike Parking — Full Width (50ft) ── */}
              <div className="bsmt-row bsmt-row-top">
                <div className="gf-zone bsmt-zone-p1">
                  <div className="gf-zone-header">
                    <span className="gf-zone-icon">🏍️</span>
                    <div>
                      <div className="gf-zone-title">P1 · Bike Parking Area</div>
                      <div className="gf-zone-sub">50 ft · B-01 – B-30 (30 Bays)</div>
                    </div>
                  </div>
                  <div className="gf-bay-grid bsmt-grid-6col">
                    {Array.from({ length: 30 }, (_, i) => `B-${String(i + 1).padStart(2, '0')}`).map(id => renderBayCard(id))}
                  </div>
                </div>
              </div>

              {/* ── ROW 2: IN Gate | F1 Left | gap | F1 Right | OUT Gate ── */}
              <div className="bsmt-row bsmt-row-middle">

                {/* IN Gate */}
                <div className="bsmt-gate-side bsmt-gate-in">
                  <div className="bsmt-gate-label">IN</div>
                </div>

                {/* F1 — 28ft Parking (Left) */}
                <div className="gf-zone bsmt-zone-f1">
                  <div className="gf-zone-header">
                    <span className="gf-zone-icon">🏍️</span>
                    <div>
                      <div className="gf-zone-title">F1 · Parking Area</div>
                      <div className="gf-zone-sub">28 ft · B-31 – B-50</div>
                    </div>
                  </div>
                  <div className="gf-bay-grid gf-grid-5col">
                    {Array.from({ length: 20 }, (_, i) => `B-${String(i + 31).padStart(2, '0')}`).map(id => renderBayCard(id))}
                  </div>
                </div>

                {/* Internal Circulation Gap */}
                <div className="gf-circ-lane bsmt-circ-lane">
                  <span className="gf-circ-arrow">←</span>
                  <span className="gf-circ-text">LANE</span>
                  <span className="gf-circ-arrow">→</span>
                </div>

                {/* F1 — 28ft Parking (Right) */}
                <div className="gf-zone bsmt-zone-f1">
                  <div className="gf-zone-header">
                    <span className="gf-zone-icon">🏍️</span>
                    <div>
                      <div className="gf-zone-title">F1 · Parking Area</div>
                      <div className="gf-zone-sub">28 ft · B-51 – B-70</div>
                    </div>
                  </div>
                  <div className="gf-bay-grid gf-grid-5col">
                    {Array.from({ length: 20 }, (_, i) => `B-${String(i + 51).padStart(2, '0')}`).map(id => renderBayCard(id))}
                  </div>
                </div>

                {/* OUT Gate */}
                <div className="bsmt-gate-side bsmt-gate-out">
                  <div className="bsmt-gate-label">OUT</div>
                </div>

              </div>

              {/* ── ROW 3: P3 Parking (left) | Lift Core | P3 Parking (right) ── */}
              <div className="bsmt-row bsmt-row-bottom">

                {/* P3 — 25ft Parking (Left) */}
                <div className="gf-zone bsmt-zone-p3">
                  <div className="gf-zone-header">
                    <span className="gf-zone-icon">🏍️</span>
                    <div>
                      <div className="gf-zone-title">P3 · Parking Area</div>
                      <div className="gf-zone-sub">25 ft · B-71 – B-75</div>
                    </div>
                  </div>
                  <div className="gf-bay-grid bsmt-grid-5col-auto">
                    {Array.from({ length: 5 }, (_, i) => `B-${String(i + 71).padStart(2, '0')}`).map(id => renderBayCard(id))}
                  </div>
                </div>

                {/* Lift Core */}
                <div className="gf-lift-block">
                  <div className="gf-lift-icon-wrap">🛗</div>
                  <div className="gf-lift-label">Lift</div>
                  <div className="gf-lift-sub">Ground Floor Access</div>
                </div>

                {/* P3 — 25ft Parking (Right) */}
                <div className="gf-zone bsmt-zone-p3">
                  <div className="gf-zone-header">
                    <span className="gf-zone-icon">🏍️</span>
                    <div>
                      <div className="gf-zone-title">P3 · Parking Area</div>
                      <div className="gf-zone-sub">25 ft · B-76 – B-80</div>
                    </div>
                  </div>
                  <div className="gf-bay-grid bsmt-grid-5col-auto">
                    {Array.from({ length: 5 }, (_, i) => `B-${String(i + 76).padStart(2, '0')}`).map(id => renderBayCard(id))}
                  </div>
                </div>

              </div>

            </div>

          ) : (

            /* ================================================================
               GROUND FLOOR — MAP LAYOUT (G-01 TO G-140)
               ─── Row 1: P1 Scooty (25ft, left) | Entry/Exit Gate | P2 Scooty (25ft, right)
               ─── Row 2: F1 Parking (28ft, left) | Circulation Lane | F1 Parking (28ft, right)
               ─── Row 3: P3 Parking (25ft, left) | Lift Core | P3 Parking (25ft, right)
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

              {/* ── ROW 1: P1 Scooty | Entry/Exit | P2 Scooty ── */}
              <div className="gf-row gf-row-top">

                {/* P1 — 25ft Scooty Area (Left) */}
                <div className="gf-zone gf-zone-scooty">
                  <div className="gf-zone-header">
                    <span className="gf-zone-icon">🛵</span>
                    <div>
                      <div className="gf-zone-title">P1 · Scooty Area</div>
                      <div className="gf-zone-sub">25 ft · G-01 – G-20</div>
                    </div>
                  </div>
                  <div className="gf-bay-grid gf-grid-5col">
                    {Array.from({ length: 20 }, (_, i) => `G-${String(i + 1).padStart(2, '0')}`).map(id => renderBayCard(id))}
                  </div>
                </div>

                {/* Entry / Exit Gate */}
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

                {/* P2 — 25ft Scooty Area (Right) */}
                <div className="gf-zone gf-zone-scooty">
                  <div className="gf-zone-header">
                    <span className="gf-zone-icon">🛵</span>
                    <div>
                      <div className="gf-zone-title">P2 · Scooty Area</div>
                      <div className="gf-zone-sub">25 ft · G-21 – G-40</div>
                    </div>
                  </div>
                  <div className="gf-bay-grid gf-grid-5col">
                    {Array.from({ length: 20 }, (_, i) => `G-${String(i + 21).padStart(2, '0')}`).map(id => renderBayCard(id))}
                  </div>
                </div>

              </div>

              {/* ── ROW 2: F1 Parking (left) | Circulation Lane | F1 Parking (right) ── */}
              <div className="gf-row gf-row-middle">

                {/* F1 — 28ft Parking (Left) */}
                <div className="gf-zone gf-zone-f1">
                  <div className="gf-zone-header">
                    <span className="gf-zone-icon">🏍️</span>
                    <div>
                      <div className="gf-zone-title">F1 · Parking Area</div>
                      <div className="gf-zone-sub">28 ft · G-41 – G-65</div>
                    </div>
                  </div>
                  <div className="gf-bay-grid gf-grid-5col">
                    {Array.from({ length: 25 }, (_, i) => `G-${String(i + 41).padStart(2, '0')}`).map(id => renderBayCard(id))}
                  </div>
                </div>

                {/* Internal Circulation Lane */}
                <div className="gf-circ-lane">
                  <span className="gf-circ-arrow">↓</span>
                  <span className="gf-circ-text">LANE</span>
                  <span className="gf-circ-arrow">↑</span>
                </div>

                {/* F1 — 28ft Parking (Right) */}
                <div className="gf-zone gf-zone-f1">
                  <div className="gf-zone-header">
                    <span className="gf-zone-icon">🏍️</span>
                    <div>
                      <div className="gf-zone-title">F1 · Parking Area</div>
                      <div className="gf-zone-sub">28 ft · G-66 – G-90</div>
                    </div>
                  </div>
                  <div className="gf-bay-grid gf-grid-5col">
                    {Array.from({ length: 25 }, (_, i) => `G-${String(i + 66).padStart(2, '0')}`).map(id => renderBayCard(id))}
                  </div>
                </div>

              </div>

              {/* ── ROW 3: P3 Parking (left) | Lift Core | P3 Parking (right) ── */}
              <div className="gf-row gf-row-bottom">

                {/* P3 — 25ft Parking (Left) */}
                <div className="gf-zone gf-zone-p3">
                  <div className="gf-zone-header">
                    <span className="gf-zone-icon">🛵</span>
                    <div>
                      <div className="gf-zone-title">P3 · Parking Area</div>
                      <div className="gf-zone-sub">25 ft · G-91 – G-115</div>
                    </div>
                  </div>
                  <div className="gf-bay-grid gf-grid-5col">
                    {Array.from({ length: 25 }, (_, i) => `G-${String(i + 91).padStart(2, '0')}`).map(id => renderBayCard(id))}
                  </div>
                </div>

                {/* Lift Core */}
                <div className="gf-lift-block">
                  <div className="gf-lift-icon-wrap">🛗</div>
                  <div className="gf-lift-label">Lift</div>
                  <div className="gf-lift-sub">Basement Access</div>
                </div>

                {/* P3 — 25ft Parking (Right) */}
                <div className="gf-zone gf-zone-p3">
                  <div className="gf-zone-header">
                    <span className="gf-zone-icon">🛵</span>
                    <div>
                      <div className="gf-zone-title">P3 · Parking Area</div>
                      <div className="gf-zone-sub">25 ft · G-116 – G-140</div>
                    </div>
                  </div>
                  <div className="gf-bay-grid gf-grid-5col">
                    {Array.from({ length: 25 }, (_, i) => `G-${String(i + 116).padStart(2, '0')}`).map(id => renderBayCard(id))}
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
