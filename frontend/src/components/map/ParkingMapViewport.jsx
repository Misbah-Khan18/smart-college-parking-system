import { useState, useRef, useEffect, useCallback } from 'react'
import './ParkingMapViewport.css'

const NATURAL_WIDTH = 1140
const NATURAL_HEIGHT = 860
const MIN_SCALE = 0.35
const MAX_SCALE = 2.8

export default function ParkingMapViewport({
  children,
  activeFloor = 'ground',
  selectedBay = null
}) {
  const containerRef = useRef(null)
  const contentRef = useRef(null)

  // Camera transform state: scale and translation
  const [transform, setTransform] = useState({ scale: 1, x: 0, y: 0 })
  const [smoothAnimate, setSmoothAnimate] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [hasInteracted, setHasInteracted] = useState(false)
  const [minimapCollapsed, setMinimapCollapsed] = useState(false)
  const [viewportSize, setViewportSize] = useState({ width: 1000, height: 700 })

  // Drag & gesture tracking refs
  const dragRef = useRef({
    active: false,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
    distanceMoved: 0
  })

  const touchRef = useRef({
    initialDistance: 0,
    initialScale: 1,
    initialMapX: 0,
    initialMapY: 0,
    touchMidX: 0,
    touchMidY: 0,
    isPinching: false,
    isPanning: false,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0
  })

  const suppressClickRef = useRef(false)
  const animTimeoutRef = useRef(null)

  // Clamp translation within comfortable boundaries
  const clampPosition = useCallback((x, y, scale, vw, vh) => {
    const contentW = NATURAL_WIDTH * scale
    const contentH = NATURAL_HEIGHT * scale
    const margin = 100

    let minX, maxX
    if (contentW <= vw) {
      minX = (vw - contentW) / 2 - margin
      maxX = (vw - contentW) / 2 + margin
    } else {
      minX = vw - contentW - margin
      maxX = margin
    }

    let minY, maxY
    if (contentH <= vh) {
      minY = Math.max(10, (vh - contentH) / 2 - margin)
      maxY = Math.max(10, (vh - contentH) / 2 + margin)
    } else {
      minY = vh - contentH - margin
      maxY = margin
    }

    return {
      x: Math.min(Math.max(x, minX), maxX),
      y: Math.min(Math.max(y, minY), maxY)
    }
  }, [])

  // Fit whole parking layout into current viewport dimensions
  const fitToScreen = useCallback((animate = true) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const vw = rect.width
    const vh = rect.height
    setViewportSize({ width: vw, height: vh })

    const scaleX = (vw - 32) / NATURAL_WIDTH
    const scaleY = (vh - 32) / NATURAL_HEIGHT
    const idealScale = Math.min(scaleX, scaleY)
    const newScale = Math.min(Math.max(idealScale, MIN_SCALE), 1.05)

    const newX = (vw - NATURAL_WIDTH * newScale) / 2
    const newY = Math.max(12, (vh - NATURAL_HEIGHT * newScale) / 2)

    if (animate) {
      setSmoothAnimate(true)
      if (animTimeoutRef.current) clearTimeout(animTimeoutRef.current)
      animTimeoutRef.current = setTimeout(() => setSmoothAnimate(false), 380)
    }

    setTransform({
      scale: newScale,
      x: newX,
      y: newY
    })
  }, [])

  // Auto-fit on initial mount, window resize, or floor change
  useEffect(() => {
    fitToScreen(false)

    const handleResize = () => {
      fitToScreen(false)
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [fitToScreen, activeFloor])

  // Reference to latest transform to avoid infinite re-render loops in effects
  const transformRef = useRef(transform)
  useEffect(() => {
    transformRef.current = transform
  }, [transform])

  const lastCenteredBayIdRef = useRef(null)

  // Center on newly selected bay if user selects one
  useEffect(() => {
    if (!selectedBay || !selectedBay.id) {
      lastCenteredBayIdRef.current = null
      return
    }

    // Only auto-center once per unique selected bay ID
    if (lastCenteredBayIdRef.current === selectedBay.id) return
    lastCenteredBayIdRef.current = selectedBay.id

    // Don't auto-jump if user is actively panning or pinching
    if (dragRef.current.active || touchRef.current.isPinching) return

    const bayEl = document.getElementById(`bay-${selectedBay.id}`)
    if (bayEl && containerRef.current && contentRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect()
      const bayRect = bayEl.getBoundingClientRect()
      
      const currentScale = transformRef.current.scale
      const currentX = transformRef.current.x
      const currentY = transformRef.current.y

      // Calculate bay offset inside the natural content coordinates
      const bayCenterX = (bayRect.left + bayRect.width / 2 - containerRect.left - currentX) / currentScale
      const bayCenterY = (bayRect.top + bayRect.height / 2 - containerRect.top - currentY) / currentScale

      // If bay is currently outside or near boundary of viewport, center smoothly
      const screenX = currentX + bayCenterX * currentScale
      const screenY = currentY + bayCenterY * currentScale

      const isOutside = (
        screenX < 60 || screenX > containerRect.width - 60 ||
        screenY < 60 || screenY > containerRect.height - 60
      )

      if (isOutside) {
        const targetScale = Math.max(currentScale, 1.1)
        const targetX = containerRect.width / 2 - bayCenterX * targetScale
        const targetY = containerRect.height / 2 - bayCenterY * targetScale

        const clamped = clampPosition(targetX, targetY, targetScale, containerRect.width, containerRect.height)
        setSmoothAnimate(true)
        if (animTimeoutRef.current) clearTimeout(animTimeoutRef.current)
        animTimeoutRef.current = setTimeout(() => setSmoothAnimate(false), 380)

        setTransform({
          scale: targetScale,
          x: clamped.x,
          y: clamped.y
        })
      }
    }
  }, [selectedBay.id, clampPosition, selectedBay])

  // Zoom centered at given screen coordinate (e.g. mouse pointer or viewport center)
  const zoomAtPoint = useCallback((factor, focusX, focusY, animate = false) => {
    if (!containerRef.current) return
    const vw = viewportSize.width
    const vh = viewportSize.height

    setTransform(prev => {
      const newScale = Math.min(Math.max(prev.scale * factor, MIN_SCALE), MAX_SCALE)
      const mapX = (focusX - prev.x) / prev.scale
      const mapY = (focusY - prev.y) / prev.scale

      const rawX = focusX - mapX * newScale
      const rawY = focusY - mapY * newScale
      const clamped = clampPosition(rawX, rawY, newScale, vw, vh)

      if (animate) {
        setSmoothAnimate(true)
        if (animTimeoutRef.current) clearTimeout(animTimeoutRef.current)
        animTimeoutRef.current = setTimeout(() => setSmoothAnimate(false), 380)
      }

      return {
        scale: newScale,
        x: clamped.x,
        y: clamped.y
      }
    })
  }, [clampPosition, viewportSize])

  // Zoom In / Out button handlers
  const handleZoomIn = () => {
    const cx = viewportSize.width / 2
    const cy = viewportSize.height / 2
    zoomAtPoint(1.28, cx, cy, true)
    setHasInteracted(true)
  }

  const handleZoomOut = () => {
    const cx = viewportSize.width / 2
    const cy = viewportSize.height / 2
    zoomAtPoint(1 / 1.28, cx, cy, true)
    setHasInteracted(true)
  }

  // Jump smoothly to a specific section on the floor plan
  const handleJumpToSection = (targetMapX, targetMapY, targetScale = 1.3) => {
    if (!containerRef.current) return
    const vw = viewportSize.width
    const vh = viewportSize.height

    const targetX = vw / 2 - targetMapX * targetScale
    const targetY = vh / 2 - targetMapY * targetScale
    const clamped = clampPosition(targetX, targetY, targetScale, vw, vh)

    setSmoothAnimate(true)
    if (animTimeoutRef.current) clearTimeout(animTimeoutRef.current)
    animTimeoutRef.current = setTimeout(() => setSmoothAnimate(false), 380)

    setTransform({
      scale: targetScale,
      x: clamped.x,
      y: clamped.y
    })
    setHasInteracted(true)
  }

  // Double Click / Double Tap to Zoom in on spot
  const handleDoubleClick = (e) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const clickY = e.clientY - rect.top

    if (transform.scale > 1.6) {
      fitToScreen(true)
    } else {
      zoomAtPoint(1.6, clickX, clickY, true)
    }
    setHasInteracted(true)
  }

  // Mouse Wheel Zoom
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleWheel = (e) => {
      e.preventDefault()
      const rect = container.getBoundingClientRect()
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top

      const factor = e.deltaY < 0 ? 1.12 : 0.89
      setSmoothAnimate(false)
      zoomAtPoint(factor, mouseX, mouseY, false)
      setHasInteracted(true)
    }

    container.addEventListener('wheel', handleWheel, { passive: false })
    return () => container.removeEventListener('wheel', handleWheel)
  }, [zoomAtPoint])

  // Native Touch Gestures (Pinch-to-zoom + 1-finger pan on mobile)
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleTouchStart = (e) => {
      if (e.touches.length === 2) {
        // Multi-touch pinch start
        const t1 = e.touches[0]
        const t2 = e.touches[1]
        const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY)
        const rect = container.getBoundingClientRect()
        const midX = (t1.clientX + t2.clientX) / 2 - rect.left
        const midY = (t1.clientY + t2.clientY) / 2 - rect.top

        touchRef.current = {
          ...touchRef.current,
          initialDistance: dist,
          initialScale: transform.scale,
          touchMidX: midX,
          touchMidY: midY,
          initialMapX: (midX - transform.x) / transform.scale,
          initialMapY: (midY - transform.y) / transform.scale,
          isPinching: true,
          isPanning: false
        }
        setSmoothAnimate(false)
      } else if (e.touches.length === 1) {
        // Single finger pan start
        const t = e.touches[0]
        touchRef.current = {
          ...touchRef.current,
          isPanning: true,
          isPinching: false,
          startX: t.clientX,
          startY: t.clientY,
          originX: transform.x,
          originY: transform.y,
          distanceMoved: 0
        }
        setSmoothAnimate(false)
      }
    }

    const handleTouchMove = (e) => {
      const rect = container.getBoundingClientRect()
      const vw = rect.width
      const vh = rect.height

      if (e.touches.length === 2 && touchRef.current.isPinching) {
        e.preventDefault()
        const t1 = e.touches[0]
        const t2 = e.touches[1]
        const currentDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY)
        const currentMidX = (t1.clientX + t2.clientX) / 2 - rect.left
        const currentMidY = (t1.clientY + t2.clientY) / 2 - rect.top

        const scaleRatio = currentDist / (touchRef.current.initialDistance || 1)
        const newScale = Math.min(Math.max(touchRef.current.initialScale * scaleRatio, MIN_SCALE), MAX_SCALE)

        const rawX = currentMidX - touchRef.current.initialMapX * newScale
        const rawY = currentMidY - touchRef.current.initialMapY * newScale
        const clamped = clampPosition(rawX, rawY, newScale, vw, vh)

        setTransform({
          scale: newScale,
          x: clamped.x,
          y: clamped.y
        })
        setHasInteracted(true)
        suppressClickRef.current = true
      } else if (e.touches.length === 1 && touchRef.current.isPanning) {
        e.preventDefault()
        const t = e.touches[0]
        const dx = t.clientX - touchRef.current.startX
        const dy = t.clientY - touchRef.current.startY
        const dist = Math.hypot(dx, dy)
        touchRef.current.distanceMoved = dist

        if (dist > 6) {
          suppressClickRef.current = true
          setHasInteracted(true)
        }

        const rawX = touchRef.current.originX + dx
        const rawY = touchRef.current.originY + dy
        const clamped = clampPosition(rawX, rawY, transform.scale, vw, vh)

        setTransform(prev => ({
          ...prev,
          x: clamped.x,
          y: clamped.y
        }))
      }
    }

    const handleTouchEnd = () => {
      if (touchRef.current.distanceMoved > 6 || touchRef.current.isPinching) {
        suppressClickRef.current = true
        setTimeout(() => {
          suppressClickRef.current = false
        }, 120)
      }
      touchRef.current.isPinching = false
      touchRef.current.isPanning = false
    }

    container.addEventListener('touchstart', handleTouchStart, { passive: true })
    container.addEventListener('touchmove', handleTouchMove, { passive: false })
    container.addEventListener('touchend', handleTouchEnd, { passive: true })
    container.addEventListener('touchcancel', handleTouchEnd, { passive: true })

    return () => {
      container.removeEventListener('touchstart', handleTouchStart)
      container.removeEventListener('touchmove', handleTouchMove)
      container.removeEventListener('touchend', handleTouchEnd)
      container.removeEventListener('touchcancel', handleTouchEnd)
    }
  }, [transform.scale, transform.x, transform.y, clampPosition])

  // Desktop Pointer Drag (Mouse Click & Pan)
  const handlePointerDown = (e) => {
    // Only drag with primary mouse button
    if (e.button !== 0) return
    if (e.pointerType === 'touch') return // Touch handled by native touch listeners above

    dragRef.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      originX: transform.x,
      originY: transform.y,
      distanceMoved: 0
    }
    setSmoothAnimate(false)
    setIsDragging(true)

    if (containerRef.current) {
      containerRef.current.setPointerCapture(e.pointerId)
    }
  }

  const handlePointerMove = (e) => {
    if (!dragRef.current.active) return
    const dx = e.clientX - dragRef.current.startX
    const dy = e.clientY - dragRef.current.startY
    const dist = Math.hypot(dx, dy)
    dragRef.current.distanceMoved = dist

    if (dist > 5) {
      suppressClickRef.current = true
      setHasInteracted(true)
    }

    const rawX = dragRef.current.originX + dx
    const rawY = dragRef.current.originY + dy
    const clamped = clampPosition(rawX, rawY, transform.scale, viewportSize.width, viewportSize.height)

    setTransform(prev => ({
      ...prev,
      x: clamped.x,
      y: clamped.y
    }))
  }

  const handlePointerUp = (e) => {
    if (!dragRef.current.active) return
    dragRef.current.active = false
    setIsDragging(false)

    if (dragRef.current.distanceMoved > 5) {
      suppressClickRef.current = true
      setTimeout(() => {
        suppressClickRef.current = false
      }, 100)
    }

    try {
      if (containerRef.current && containerRef.current.hasPointerCapture(e.pointerId)) {
        containerRef.current.releasePointerCapture(e.pointerId)
      }
    } catch {
      // Ignore if pointer capture was already lost
    }
  }

  // Intercept click on children if dragging just occurred (so dragging doesn't select a slot!)
  const handleClickCapture = (e) => {
    if (suppressClickRef.current) {
      e.stopPropagation()
      e.preventDefault()
    }
  }

  // Mini-map calculations
  const miniW = 174
  const miniH = 120
  const ratioX = miniW / NATURAL_WIDTH
  const ratioY = miniH / NATURAL_HEIGHT

  const visibleLeft = Math.max(0, -transform.x / transform.scale)
  const visibleTop = Math.max(0, -transform.y / transform.scale)
  const visibleWidth = Math.min(NATURAL_WIDTH, viewportSize.width / transform.scale)
  const visibleHeight = Math.min(NATURAL_HEIGHT, viewportSize.height / transform.scale)

  const viewfinderBox = {
    left: Math.max(0, Math.min(miniW - 10, visibleLeft * ratioX)),
    top: Math.max(0, Math.min(miniH - 10, visibleTop * ratioY)),
    width: Math.min(miniW, Math.max(16, visibleWidth * ratioX)),
    height: Math.min(miniH, Math.max(14, visibleHeight * ratioY))
  }

  // Pan to clicked location on Mini-Map
  const handleMiniMapClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const clickY = e.clientY - rect.top

    const targetMapX = clickX / ratioX
    const targetMapY = clickY / ratioY

    handleJumpToSection(targetMapX, targetMapY, Math.max(transform.scale, 0.95))
  }

  return (
    <div
      ref={containerRef}
      className={`bms-viewport-container ${isDragging ? 'is-dragging' : ''}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onDoubleClick={handleDoubleClick}
      onClickCapture={handleClickCapture}
      role="region"
      aria-label="Interactive Parking Map Canvas"
    >
      {/* Background Architectural Grid */}
      <div className="bms-grid-underlay" />

      {/* Floating Mobile Gesture Hint (Auto fades out after first interaction) */}
      <div className={`bms-touch-hint ${hasInteracted ? 'fade-out' : ''}`}>
        <span>💡 Pinch to zoom • Drag to explore bays</span>
      </div>

      {/* Floating HUD Controls */}
      <div className="bms-hud-controls">
        <div className="bms-hud-dock">
          {/* Zoom In */}
          <button
            type="button"
            className="bms-hud-btn"
            onClick={handleZoomIn}
            title="Zoom In (+)"
            aria-label="Zoom in"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>

          {/* Zoom Level Indicator */}
          <div
            className="bms-zoom-badge"
            onClick={() => fitToScreen(true)}
            title="Click to Reset / Fit to Screen"
          >
            {Math.round(transform.scale * 100)}%
          </div>

          {/* Zoom Out */}
          <button
            type="button"
            className="bms-hud-btn"
            onClick={handleZoomOut}
            title="Zoom Out (-)"
            aria-label="Zoom out"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>

          {/* Fit to Screen / Reset */}
          <button
            type="button"
            className="bms-hud-btn"
            onClick={() => fitToScreen(true)}
            title="Fit to Screen"
            aria-label="Fit to Screen"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
            </svg>
          </button>
        </div>

        {/* Quick Jump Bar */}
        <div className="bms-quick-jump-bar">
          <button
            type="button"
            className="bms-jump-pill"
            onClick={() => handleJumpToSection(280, 180, 1.4)}
          >
            🛵 P1 Front
          </button>
          <button
            type="button"
            className="bms-jump-pill"
            onClick={() => handleJumpToSection(570, 180, 1.4)}
          >
            🚧 Gate
          </button>
          <button
            type="button"
            className="bms-jump-pill"
            onClick={() => handleJumpToSection(860, 180, 1.4)}
          >
            🛵 P2 East
          </button>
          <button
            type="button"
            className="bms-jump-pill"
            onClick={() => handleJumpToSection(570, 480, 1.3)}
          >
            🏍️ F1 Central
          </button>
          <button
            type="button"
            className="bms-jump-pill"
            onClick={() => handleJumpToSection(570, 760, 1.3)}
          >
            🅿️ P3 South
          </button>
        </div>
      </div>

      {/* Radar Mini-Map (BookMyShow Hallmark) */}
      <div className="bms-minimap-container">
        {minimapCollapsed ? (
          <button
            type="button"
            className="bms-minimap-collapsed-btn"
            onClick={() => setMinimapCollapsed(false)}
            title="Expand Radar Mini-Map"
          >
            <span className="bms-radar-dot" />
            <span>Radar Map</span>
          </button>
        ) : (
          <div className="bms-minimap-card">
            <div className="bms-minimap-header">
              <span className="bms-minimap-title">
                <span className="bms-radar-dot" />
                <span>{activeFloor === 'basement' ? 'BASEMENT RADAR' : 'GROUND RADAR'}</span>
              </span>
              <button
                type="button"
                className="bms-minimap-toggle"
                onClick={() => setMinimapCollapsed(true)}
                title="Minimize Radar"
              >
                &minus;
              </button>
            </div>

            {/* Mini-Map Schematic Canvas */}
            <div
              className="bms-minimap-canvas-box"
              onClick={handleMiniMapClick}
              title="Click anywhere to pan camera"
            >
              {/* Row 1: P1, Gate, P2 */}
              <div className="bms-mm-zone" style={{ top: '8%', left: '5%', width: '40%', height: '24%' }}>
                P1
              </div>
              <div className="bms-mm-gate" style={{ top: '8%', left: '46%', width: '8%', height: '24%' }}>
                🚧
              </div>
              <div className="bms-mm-zone" style={{ top: '8%', left: '55%', width: '40%', height: '24%' }}>
                P2
              </div>

              {/* Row 2: F1 Left, Lane, F1 Right */}
              <div className="bms-mm-zone" style={{ top: '38%', left: '5%', width: '40%', height: '28%' }}>
                F1 Left
              </div>
              <div className="bms-mm-lane" style={{ top: '38%', left: '46%', width: '8%', height: '28%' }} />
              <div className="bms-mm-zone" style={{ top: '38%', left: '55%', width: '40%', height: '28%' }}>
                F1 Right
              </div>

              {/* Row 3: P3 Left, Lift, P3 Right */}
              <div className="bms-mm-zone" style={{ top: '72%', left: '5%', width: '40%', height: '22%' }}>
                P3 Left
              </div>
              <div className="bms-mm-gate" style={{ top: '72%', left: '46%', width: '8%', height: '22%', background: 'rgba(16, 185, 129, 0.15)' }}>
                🛗
              </div>
              <div className="bms-mm-zone" style={{ top: '72%', left: '55%', width: '40%', height: '22%' }}>
                P3 Right
              </div>

              {/* Active Glowing Viewfinder Rectangle */}
              <div
                className="bms-minimap-viewfinder"
                style={{
                  left: `${viewfinderBox.left}px`,
                  top: `${viewfinderBox.top}px`,
                  width: `${viewfinderBox.width}px`,
                  height: `${viewfinderBox.height}px`
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Transformable Canvas Layer */}
      <div
        ref={contentRef}
        className={`bms-canvas-layer ${smoothAnimate ? 'smooth-animate' : ''}`}
        style={{
          transform: `translate3d(${transform.x}px, ${transform.y}px, 0px) scale(${transform.scale})`
        }}
      >
        {children}
      </div>
    </div>
  )
}
