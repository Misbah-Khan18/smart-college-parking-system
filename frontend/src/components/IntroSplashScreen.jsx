import { useState, useEffect } from 'react'

export default function IntroSplashScreen({ onComplete }) {
  const [fadingOut, setFadingOut] = useState(false)
  const [phase, setPhase] = useState(1) // 1: Point appear, 2: Layout & Radar expand, 3: College Name Reveal

  useEffect(() => {
    // Check if user has prefers-reduced-motion enabled
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (prefersReducedMotion) {
      setPhase(3)
      // Fast transition for reduced-motion users (550ms)
      const tFastDone = setTimeout(() => {
        try {
          sessionStorage.setItem('soc_intro_played', 'true')
        } catch {
          // ignore
        }
        onComplete()
      }, 550)
      return () => clearTimeout(tFastDone)
    }

    // Standard high-performance CSS hardware-accelerated intro sequence
    // Phase 1: Glowing point appears in center (0s)
    const t1 = setTimeout(() => setPhase(2), 500)
    // Phase 2: Radar & Smart Parking Layout expand (0.5s)
    // Phase 3: College Name smoothly fades/slides into view after layout begins (1.0s)
    const t2 = setTimeout(() => setPhase(3), 1000)
    // Start smooth fade out of splash screen (2.6s)
    const tFade = setTimeout(() => setFadingOut(true), 2600)
    // Transition to Home / Dashboard (2.9s)
    const tDone = setTimeout(() => {
      try {
        sessionStorage.setItem('soc_intro_played', 'true')
      } catch {
        // ignore
      }
      onComplete()
    }, 2900)

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(tFade)
      clearTimeout(tDone)
    }
  }, [onComplete])

  const handleSkip = () => {
    try {
      sessionStorage.setItem('soc_intro_played', 'true')
    } catch {
      // ignore
    }
    onComplete()
  }

  return (
    <div className={`digital-intro-screen ${fadingOut ? 'intro-fade-out' : ''}`}>
      {/* Dark Navy Background with Digital Tech Grid */}
      <div className="digital-bg-grid">
        <div className="grid-lines"></div>
        <div className="ambient-glow cyan-ambient"></div>
        <div className="ambient-glow blue-ambient"></div>
        <div className="ambient-glow purple-ambient"></div>
      </div>

      <div className="digital-intro-center">
        {/* Core Digital Smart-Parking Layout Visual */}
        <div className={`digital-core-wrapper phase-${phase}`}>
          {/* Step 1: Center Glowing Point */}
          <div className="center-glow-point">
            <div className="glow-dot"></div>
            <div className="glow-ripple ripple-1"></div>
            <div className="glow-ripple ripple-2"></div>
            <div className="glow-ripple ripple-3"></div>
          </div>

          {/* Step 2: Digital Radar Scanner & Smart Bay Grid Expansion */}
          <div className="digital-radar-container">
            <div className="radar-circle circle-outer"></div>
            <div className="radar-circle circle-mid"></div>
            <div className="radar-circle circle-inner"></div>
            <div className="radar-sweep-beam"></div>

            {/* Smart Bay Wireframe Nodes */}
            <div className="smart-bay-nodes">
              <div className="bay-node node-tl">
                <span className="node-dot green"></span>
                <span className="node-code">G-01</span>
              </div>
              <div className="bay-node node-tr">
                <span className="node-dot cyan"></span>
                <span className="node-code">G-02</span>
              </div>
              <div className="bay-node node-bl">
                <span className="node-dot cyan"></span>
                <span className="node-code">B-01</span>
              </div>
              <div className="bay-node node-br">
                <span className="node-dot green"></span>
                <span className="node-code">B-02</span>
              </div>
            </div>

            {/* Center SmartPark Logo Emblem */}
            <div className="smartpark-center-emblem">
              <span className="emblem-p">P</span>
              <div className="emblem-sensor-ring"></div>
            </div>
          </div>
        </div>

        {/* College Name & System Initialization Reveal */}
        <div className={`digital-text-container ${phase >= 3 ? 'visible' : ''}`}>
          <div className="telemetry-status-pill">
            <span className="status-live-dot"></span>
            <span>SMART PARKING SYSTEM INITIALIZING</span>
          </div>

          <h1 className="digital-school-title">
            <span>SCHOOL OF COMMERCE</span>
          </h1>

          <h2 className="digital-system-subtitle">
            <span>SMART PARKING MANAGEMENT SYSTEM</span>
          </h2>

          <div className="digital-loading-tracker">
            <div className="tracker-bar"></div>
          </div>
        </div>

        {/* Skip button */}
        <button type="button" className="digital-skip-btn" onClick={handleSkip}>
          Skip &rarr;
        </button>
      </div>
    </div>
  )
}
