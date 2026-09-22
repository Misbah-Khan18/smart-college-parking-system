import { useState, useEffect, useRef } from 'react'
import QRCode from 'qrcode'

// ─────────────────────────────────────────────────────────────────────────────
// GatePassActivationScreen
// Shown after "Activate Pass & Reserve Slot" is clicked.
// Plays a 3-stage metro / transit-gate animation:
//   Stage 1 – "CONNECTING TO GATE..."  (0-800ms)
//   Stage 2 – "VERIFYING PERMIT..."    (800-1800ms)
//   Stage 3 – "ACCESS GRANTED ✓"       (1800ms onward)
// After 4.2 s total it auto-calls onDone().
// ─────────────────────────────────────────────────────────────────────────────

export default function GatePassActivationScreen({ passData, onDone }) {
  const [stage, setStage] = useState(0) // 0=connecting | 1=verifying | 2=granted | 3=done
  const [qrSrc, setQrSrc] = useState('')
  const [barrierLifted, setBarrierLifted] = useState(false)
  const [ledColor, setLedColor] = useState('#ef4444') // red → amber → green
  const doneCalledRef = useRef(false)

  // Generate QR for the pass token
  useEffect(() => {
    const token = passData?.qrToken || passData?.passId || passData?.slotId || 'SOC-PASS'
    QRCode.toDataURL(token, {
      width: 160,
      margin: 1,
      color: { dark: '#0f172a', light: '#ffffff' },
      errorCorrectionLevel: 'M'
    })
      .then(setQrSrc)
      .catch(() => setQrSrc(''))
  }, [passData])

  // Animation timeline
  useEffect(() => {
    const timers = []

    // Stage 0 → 1: Connecting
    timers.push(setTimeout(() => {
      setStage(1)
      setLedColor('#f59e0b') // amber
    }, 900))

    // Stage 1 → 2: Verifying → Granted
    timers.push(setTimeout(() => {
      setStage(2)
      setLedColor('#22c55e') // green
    }, 1900))

    // Raise barrier
    timers.push(setTimeout(() => {
      setBarrierLifted(true)
    }, 2200))

    // Stage 2 → 3: auto-close
    timers.push(setTimeout(() => {
      setStage(3)
      if (!doneCalledRef.current) {
        doneCalledRef.current = true
        onDone?.()
      }
    }, 4200))

    return () => timers.forEach(clearTimeout)
  }, [onDone])

  const handleManualDismiss = () => {
    if (!doneCalledRef.current) {
      doneCalledRef.current = true
      onDone?.()
    }
  }

  const plate = passData?.plate || passData?.vehiclePlate || passData?.vehicleNumber || '—'
  const slotId = passData?.slotId || '—'
  const floor = passData?.floor || 'Campus Parking'
  const owner = passData?.owner || passData?.userName || passData?.studentName || 'Campus Member'
  const vehicleType = passData?.vehicleType || passData?.type || 'scooty'
  const tierName = passData?.permitType || passData?.passType || 'Parking Pass'

  const stageLabels = [
    { icon: '📡', line1: 'CONNECTING TO', line2: 'CAMPUS GATE TERMINAL', sub: 'Establishing secure channel...' },
    { icon: '🔍', line1: 'VERIFYING', line2: 'PARKING PERMIT', sub: 'Cross-checking SOCMAC registry...' },
    { icon: '✅', line1: 'ACCESS', line2: 'GRANTED', sub: 'Welcome! Proceed to your bay.' }
  ]
  const currentLabel = stageLabels[Math.min(stage, 2)]

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'radial-gradient(ellipse at 50% 0%, rgba(6,182,212,0.18) 0%, #020817 60%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        fontFamily: "'Inter', 'Roboto', sans-serif",
        overflow: 'hidden'
      }}
      onClick={stage >= 2 ? handleManualDismiss : undefined}
    >
      {/* ── Animated background grid lines ── */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} style={{
            position: 'absolute',
            top: 0,
            left: `${(i / 12) * 100}%`,
            width: '1px',
            height: '100%',
            background: 'rgba(56,189,248,0.06)',
            animation: `gridLineFade 3s ease-in-out ${i * 0.15}s infinite alternate`
          }} />
        ))}
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} style={{
            position: 'absolute',
            left: 0,
            top: `${(i / 8) * 100}%`,
            width: '100%',
            height: '1px',
            background: 'rgba(56,189,248,0.04)',
          }} />
        ))}
      </div>

      {/* ── Corner decorations ── */}
      <CornerBracket pos="top-left" />
      <CornerBracket pos="top-right" />
      <CornerBracket pos="bottom-left" />
      <CornerBracket pos="bottom-right" />

      {/* ── Main Gate Panel ── */}
      <div style={{
        width: '100%',
        maxWidth: '420px',
        background: 'linear-gradient(160deg, rgba(15,23,42,0.97) 0%, rgba(2,8,23,0.99) 100%)',
        border: `1px solid ${ledColor}44`,
        borderRadius: '20px',
        padding: '28px 24px',
        boxShadow: `0 0 60px ${ledColor}22, 0 20px 60px rgba(0,0,0,0.8)`,
        transition: 'border-color 0.5s ease, box-shadow 0.5s ease',
        position: 'relative',
        overflow: 'hidden'
      }}>

        {/* Animated scan-line sweep */}
        {stage < 2 && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '2px',
            background: `linear-gradient(90deg, transparent, ${ledColor}, transparent)`,
            animation: 'scanSweep 1.2s linear infinite',
            zIndex: 2
          }} />
        )}

        {/* Glowing border accent on granted */}
        {stage >= 2 && (
          <div style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '20px',
            background: 'radial-gradient(ellipse at 50% 0%, rgba(34,197,94,0.12) 0%, transparent 70%)',
            pointerEvents: 'none'
          }} />
        )}

        {/* ── Header Bar ── */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '20px',
          paddingBottom: '14px',
          borderBottom: '1px solid rgba(56,189,248,0.15)'
        }}>
          <div>
            <div style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '2px', color: '#38bdf8', textTransform: 'uppercase' }}>
              SOCMAC SMART PARK
            </div>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px', letterSpacing: '0.5px' }}>
              Campus Gate Terminal v3
            </div>
          </div>
          {/* LED Indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: ledColor,
              boxShadow: `0 0 12px ${ledColor}, 0 0 24px ${ledColor}66`,
              transition: 'background 0.5s ease, box-shadow 0.5s ease',
              animation: stage < 2 ? 'ledPulse 0.8s ease-in-out infinite alternate' : 'none'
            }} />
            <span style={{ fontSize: '10px', color: ledColor, fontWeight: 700, letterSpacing: '1px', transition: 'color 0.5s ease' }}>
              {stage === 0 ? 'WAIT' : stage === 1 ? 'SCAN' : 'OPEN'}
            </span>
          </div>
        </div>

        {/* ── Stage Status Block ── */}
        <div style={{
          textAlign: 'center',
          marginBottom: '22px',
          minHeight: '80px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{ fontSize: '28px', marginBottom: '6px', animation: stage < 2 ? 'iconBounce 1s ease-in-out infinite' : 'iconPop 0.4s ease' }}>
            {currentLabel.icon}
          </div>
          <div style={{
            fontSize: '11px',
            fontWeight: 800,
            letterSpacing: '3px',
            color: '#64748b',
            textTransform: 'uppercase'
          }}>
            {currentLabel.line1}
          </div>
          <div style={{
            fontSize: stage >= 2 ? '26px' : '18px',
            fontWeight: 900,
            color: ledColor,
            letterSpacing: stage >= 2 ? '4px' : '2px',
            textTransform: 'uppercase',
            transition: 'all 0.4s ease',
            textShadow: `0 0 20px ${ledColor}66`
          }}>
            {currentLabel.line2}
          </div>
          <div style={{ fontSize: '12px', color: '#475569', marginTop: '4px', fontStyle: 'italic' }}>
            {currentLabel.sub}
          </div>

          {/* Progress dots (stages 0 & 1 only) */}
          {stage < 2 && (
            <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }}>
              {[0, 1, 2].map((i) => (
                <div key={i} style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: i <= stage ? ledColor : '#1e293b',
                  transition: 'background 0.3s',
                  boxShadow: i <= stage ? `0 0 6px ${ledColor}` : 'none'
                }} />
              ))}
            </div>
          )}
        </div>

        {/* ── Vehicle Details Block ── */}
        <div style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '12px',
          padding: '14px 16px',
          marginBottom: '18px'
        }}>
          {/* Plate number — big like an ANPR reader */}
          <div style={{ textAlign: 'center', marginBottom: '12px' }}>
            <div style={{ fontSize: '10px', color: '#475569', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '4px' }}>
              VEHICLE PLATE
            </div>
            <div style={{
              fontFamily: 'monospace',
              fontSize: '28px',
              fontWeight: 900,
              color: '#f8fafc',
              letterSpacing: '5px',
              textShadow: stage >= 2 ? '0 0 20px rgba(34,197,94,0.5)' : '0 0 10px rgba(56,189,248,0.3)',
              transition: 'text-shadow 0.5s ease',
              background: 'rgba(15,23,42,0.8)',
              padding: '8px 16px',
              borderRadius: '8px',
              border: '2px solid rgba(255,255,255,0.1)',
              display: 'inline-block',
              minWidth: '200px'
            }}>
              {plate}
            </div>
          </div>

          {/* Info row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <InfoCell label="BAY" value={slotId} mono />
            <InfoCell label="FLOOR" value={floor.replace(' Floor', '').replace('ound', '').replace('Gr', 'GRD').replace('Basement', 'BSMT')} mono />
            <InfoCell label="HOLDER" value={owner} />
            <InfoCell label="TYPE" value={vehicleType === 'bike' ? '🏍️ Bike' : '🛵 Scooty'} />
          </div>
        </div>

        {/* ── QR Code (shown from stage 1) ── */}
        {stage >= 1 && qrSrc && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            marginBottom: '18px',
            animation: 'fadeSlideUp 0.4s ease'
          }}>
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <img
                src={qrSrc}
                alt="Gate Access QR"
                style={{
                  width: 140,
                  height: 140,
                  borderRadius: '10px',
                  display: 'block',
                  border: `3px solid ${ledColor}88`,
                  padding: '3px',
                  background: '#fff',
                  transition: 'border-color 0.5s ease'
                }}
              />
              {/* QR scan beam */}
              {stage === 1 && (
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '3px',
                  background: 'linear-gradient(90deg, transparent, #38bdf8, transparent)',
                  animation: 'qrBeam 0.9s linear infinite',
                  borderRadius: '2px'
                }} />
              )}
              {/* Check overlay on granted */}
              {stage >= 2 && (
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'rgba(34,197,94,0.15)',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  animation: 'fadeIn 0.4s ease'
                }}>
                  <span style={{ fontSize: '48px', filter: 'drop-shadow(0 0 12px #22c55e)' }}>✓</span>
                </div>
              )}
            </div>
            <div style={{ fontSize: '10px', color: '#475569', marginTop: '6px', letterSpacing: '1.5px', textTransform: 'uppercase' }}>
              {stage === 1 ? 'Scanning QR Code...' : 'QR Verified ✓'}
            </div>
          </div>
        )}

        {/* ── Boom Barrier ── */}
        <BoomBarrier lifted={barrierLifted} color={ledColor} />

        {/* ── Tier Badge ── */}
        <div style={{
          textAlign: 'center',
          marginTop: '14px',
          fontSize: '11px',
          color: '#475569',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          paddingTop: '12px'
        }}>
          <span style={{ background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.2)', color: '#38bdf8', padding: '3px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 700 }}>
            {tierName}
          </span>
        </div>

        {/* Tap to dismiss */}
        {stage >= 2 && (
          <div style={{
            textAlign: 'center',
            marginTop: '16px',
            fontSize: '11px',
            color: '#334155',
            letterSpacing: '1px',
            animation: 'fadeIn 0.6s ease 0.5s both'
          }}>
            TAP ANYWHERE TO DISMISS
          </div>
        )}
      </div>

      {/* Inline keyframe styles */}
      <style>{`
        @keyframes scanSweep {
          0%   { transform: translateX(-100%); opacity: 0; }
          20%  { opacity: 1; }
          80%  { opacity: 1; }
          100% { transform: translateX(100%); opacity: 0; }
        }
        @keyframes ledPulse {
          from { opacity: 0.5; transform: scale(0.85); }
          to   { opacity: 1;   transform: scale(1.15); }
        }
        @keyframes iconBounce {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(-4px); }
        }
        @keyframes iconPop {
          0%   { transform: scale(0.6); opacity: 0; }
          60%  { transform: scale(1.2); }
          100% { transform: scale(1);   opacity: 1; }
        }
        @keyframes qrBeam {
          0%   { top: 0%;   opacity: 0; }
          10%  { opacity: 1; }
          90%  { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes gridLineFade {
          from { opacity: 0.3; }
          to   { opacity: 1; }
        }
        @keyframes barrierRise {
          from { transform: scaleX(1); }
          to   { transform: scaleX(0); transform-origin: left; }
        }
        @keyframes cornerPulse {
          0%, 100% { opacity: 0.5; }
          50%      { opacity: 1; }
        }
      `}</style>
    </div>
  )
}

// ── Sub-components ──────────────────────────────────────────────────────────

function InfoCell({ label, value, mono = false }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: '8px',
      padding: '8px 10px'
    }}>
      <div style={{ fontSize: '9px', color: '#475569', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '3px' }}>
        {label}
      </div>
      <div style={{
        fontSize: '13px',
        fontWeight: 700,
        color: '#e2e8f0',
        fontFamily: mono ? 'monospace' : 'inherit',
        letterSpacing: mono ? '1px' : 'normal',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap'
      }}>
        {value}
      </div>
    </div>
  )
}

function BoomBarrier({ lifted, color }) {
  return (
    <div style={{
      marginTop: '14px',
      display: 'flex',
      alignItems: 'center',
      gap: '0',
      height: '40px',
      position: 'relative'
    }}>
      {/* Post */}
      <div style={{
        width: '14px',
        height: '40px',
        background: 'linear-gradient(180deg, #334155, #1e293b)',
        borderRadius: '4px 4px 0 0',
        flexShrink: 0,
        border: '1px solid rgba(255,255,255,0.1)'
      }} />
      {/* LED on post */}
      <div style={{
        position: 'absolute',
        top: '8px',
        left: '4px',
        width: '6px',
        height: '6px',
        borderRadius: '50%',
        background: color,
        boxShadow: `0 0 8px ${color}`,
        transition: 'background 0.5s, box-shadow 0.5s'
      }} />
      {/* Barrier arm */}
      <div style={{
        flex: 1,
        height: '10px',
        background: lifted
          ? 'transparent'
          : `repeating-linear-gradient(90deg, ${color} 0px, ${color} 20px, #1e293b 20px, #1e293b 40px)`,
        borderRadius: '0 4px 4px 0',
        border: lifted ? 'none' : '1px solid rgba(255,255,255,0.15)',
        transition: 'all 0.7s cubic-bezier(0.34, 1.56, 0.64, 1)',
        transformOrigin: 'left center',
        transform: lifted ? 'rotate(-75deg) translateY(-20px)' : 'rotate(0deg)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {!lifted && (
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)',
            animation: 'scanSweep 2s linear infinite'
          }} />
        )}
      </div>
      {/* ENTRY label */}
      <div style={{
        position: 'absolute',
        bottom: '-18px',
        left: '50%',
        transform: 'translateX(-50%)',
        fontSize: '9px',
        color: '#334155',
        fontWeight: 700,
        letterSpacing: '2px',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap'
      }}>
        {lifted ? '⬆ BARRIER OPEN — ENTRY CLEAR' : '— BARRIER CLOSED —'}
      </div>
    </div>
  )
}

function CornerBracket({ pos }) {
  const styles = {
    'top-left':     { top: 16, left: 16 },
    'top-right':    { top: 16, right: 16, transform: 'scaleX(-1)' },
    'bottom-left':  { bottom: 16, left: 16, transform: 'scaleY(-1)' },
    'bottom-right': { bottom: 16, right: 16, transform: 'scale(-1)' }
  }
  return (
    <div style={{
      position: 'fixed',
      ...styles[pos],
      width: '30px',
      height: '30px',
      borderTop: '2px solid rgba(56,189,248,0.4)',
      borderLeft: '2px solid rgba(56,189,248,0.4)',
      borderRadius: '4px 0 0 0',
      animation: 'cornerPulse 2s ease-in-out infinite'
    }} />
  )
}
