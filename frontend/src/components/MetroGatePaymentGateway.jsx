import { useState, useEffect, useRef, useCallback } from 'react'
import QRCode from 'qrcode'
import { Html5Qrcode } from 'html5-qrcode'
import { XIcon, CameraIcon, CheckIcon, AlertCircleIcon } from './Icons'
import { playScannerBeep, playSuccessChime } from '../utils/gateAudio'
import './MetroGatePaymentGateway.css'

const UPI_VPA = 'parking.soc@upi'
const MERCHANT_NAME = 'SOCMAC Smart Park'

export default function MetroGatePaymentGateway({
  isOpen,
  bookingData,
  onPaymentSuccess,
  onCancel
}) {
  const [activeTab, setActiveTab] = useState('upi') // 'upi' | 'camera' | 'card'
  const [upiQrSrc, setUpiQrSrc] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [isPaid, setIsPaid] = useState(false)
  const [statusMessage, setStatusMessage] = useState('Awaiting payment scan...')
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState(null)
  const [facingMode, setFacingMode] = useState('environment') // 'environment' | 'user'
  const [scannedResult, setScannedResult] = useState(null)
  const [paymentMethod, setPaymentMethod] = useState('UPI')

  // Stripe publishable key from environment
  const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || ''

  const html5QrCodeRef = useRef(null)
  const cameraScannerDomId = 'metro-kiosk-camera-view'
  const isMountedRef = useRef(true)

  const fee = bookingData?.amountPaidINR || 10
  const slotId = bookingData?.slotId || 'G-76'
  const plate = bookingData?.plate || bookingData?.vehiclePlate || bookingData?.vehicleNumber || 'MH-12-IH-3595'
  const studentName = bookingData?.owner || bookingData?.userName || 'Student'
  const vehicleType = bookingData?.vehicleType || 'scooty'
  const tierName = bookingData?.permitType || bookingData?.passType || 'Daily Permit'

  // Standard NPCI UPI URI
  const upiLink = `upi://pay?pa=${encodeURIComponent(UPI_VPA)}&pn=${encodeURIComponent(MERCHANT_NAME)}&am=${encodeURIComponent(fee.toFixed(2))}&cu=INR&tn=${encodeURIComponent(`SOCMAC-${slotId}-${plate}`)}`

  // ── Generate Scannable UPI QR Code ──
  useEffect(() => {
    let active = true
    QRCode.toDataURL(upiLink, {
      width: 240,
      margin: 2,
      color: {
        dark: '#030712',
        light: '#ffffff'
      },
      errorCorrectionLevel: 'M'
    })
      .then((url) => {
        if (active) setUpiQrSrc(url)
      })
      .catch((err) => {
        console.error('[MetroGatePaymentGateway] QR generation failed:', err)
      })

    return () => {
      active = false
    }
  }, [upiLink])

  // ── Camera Scanner Lifecycle via html5-qrcode ──
  const stopCamera = useCallback(async () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop()
        }
      } catch (err) {
        console.warn('[MetroGatePaymentGateway] Camera stop warning:', err)
      }
      try {
        html5QrCodeRef.current.clear()
      } catch {
        // synchronous
      }
    }
    if (isMountedRef.current) {
      setCameraActive(false)
    }
  }, [])

  const handleQrDetected = useCallback((decodedText) => {
    playScannerBeep()
    setScannedResult(decodedText)
    stopCamera()

    // Process payment success
    setIsProcessing(true)
    setStatusMessage('QR code recognized! Verifying transaction with terminal...')

    setTimeout(() => {
      playSuccessChime()
      setIsProcessing(false)
      setIsPaid(true)
      setStatusMessage(`Payment of ₹${fee} settled! Issuing access pass...`)

      setTimeout(() => {
        if (onPaymentSuccess) {
          onPaymentSuccess({
            ...bookingData,
            paymentStatus: 'PAID',
            paymentMethod: 'UPI_QR_CAMERA_SCAN',
            paidAmountINR: fee,
            transactionId: `TXN-METRO-${Date.now().toString().slice(-6)}`
          })
        }
      }, 1200)
    }, 1500)
  }, [bookingData, fee, onPaymentSuccess, stopCamera])

  const startCamera = useCallback(async (mode = facingMode) => {
    setCameraError(null)
    setCameraActive(true)

    // Wait for DOM element to be mounted
    await new Promise((r) => setTimeout(r, 100))

    const domEl = document.getElementById(cameraScannerDomId)
    if (!domEl) {
      setCameraError('Camera view container not ready in DOM.')
      setCameraActive(false)
      return
    }

    try {
      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode(cameraScannerDomId, {
          verbose: false,
          formatsToSupport: [0] // QR_CODE
        })
      }

      await html5QrCodeRef.current.start(
        { facingMode: mode },
        {
          fps: 15,
          qrbox: { width: 220, height: 220 },
          aspectRatio: 1.0
        },
        (decodedText) => {
          handleQrDetected(decodedText)
        },
        () => {
          // ignore per-frame parse failures
        }
      )
    } catch (err) {
      console.warn('[MetroGatePaymentGateway] Camera start error:', err)
      setCameraError(
        err?.message?.includes('Permission') || err?.name === 'NotAllowedError'
          ? 'Camera permission denied. Please allow camera access in your browser or use the on-screen QR / simulated payment.'
          : 'Unable to start camera feed. You can scan the on-screen QR code using your phone or click the instant payment button.'
      )
      setCameraActive(false)
    }
  }, [cameraScannerDomId, facingMode, handleQrDetected])

  // Stop camera on unmount or tab switch away
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      stopCamera()
    }
  }, [stopCamera])

  const handleTabChange = (newTab) => {
    if (activeTab === 'camera' && newTab !== 'camera') {
      stopCamera()
    }
    setActiveTab(newTab)
    if (newTab === 'camera' && !cameraActive) {
      startCamera(facingMode)
    }
  }

  const handleFlipCamera = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment'
    setFacingMode(nextMode)
    stopCamera().then(() => {
      startCamera(nextMode)
    })
  }

  // Trigger manual simulated payment (works on all devices)
  const handleInstantPayment = (method = 'UPI') => {
    playScannerBeep()
    setPaymentMethod(method)
    setIsProcessing(true)
    setStatusMessage(`Processing ₹${fee} via ${method}...`)

    setTimeout(() => {
      playSuccessChime()
      setIsProcessing(false)
      setIsPaid(true)
      setStatusMessage(`Payment of ₹${fee} verified by Gate Terminal!`)

      setTimeout(() => {
        if (onPaymentSuccess) {
          onPaymentSuccess({
            ...bookingData,
            paymentStatus: 'PAID',
            paymentMethod: method,
            paidAmountINR: fee,
            transactionId: `TXN-UPI-${Date.now().toString().slice(-6)}`
          })
        }
      }, 1200)
    }, 1600)
  }

  if (!isOpen) return null

  return (
    <div className="metro-payment-backdrop" onClick={!isProcessing && !isPaid ? onCancel : undefined}>
      <div
        className="metro-payment-container"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Metro Station Ingress Payment Gateway"
      >
        {/* ── METRO STATION CORRIDOR PASSAGE HEADER ── */}
        <div className="metro-station-banner">
          <div className="metro-lane-badge">
            <span className="lane-pulse" />
            <span>LANE 02 • SMART INGRESS PASSAGE</span>
          </div>
          <div className="metro-station-name">
            <span className="metro-logo">🚇</span>
            <div>
              <h3>SOCMAC CAMPUS METRO GATE</h3>
              <p>Turnstile Compartment &bull; System.in Receiver Terminal</p>
            </div>
          </div>
          {!isProcessing && !isPaid && (
            <button
              type="button"
              className="metro-close-btn"
              onClick={onCancel}
              aria-label="Cancel gate entry"
            >
              <XIcon className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* ── THE METRO GATE RECEIVER COMPARTMENT (KIOSK BOX) ── */}
        <div className="metro-kiosk-box">
          {/* Receiver Terminal Head Unit */}
          <div className="metro-kiosk-head">
            <div className="kiosk-status-leds">
              <span className={`kiosk-led ${isPaid ? 'led-green' : isProcessing ? 'led-amber' : 'led-blue'}`} />
              <span className="kiosk-terminal-id font-mono">SYSTEM.IN // RECEIVER-BOX-2B</span>
            </div>
            <div className="kiosk-clock font-mono">
              {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
          </div>

          {/* Receiver Digital Screen */}
          <div className="metro-screen">
            {/* Screen Top Status Bar */}
            <div className="metro-screen-top">
              <div className="metro-bay-tag">
                <span className="bay-pin">📍</span>
                <span className="bay-id font-mono font-bold">BAY {slotId}</span>
                <span className="bay-type">({vehicleType === 'bike' ? 'Basement 🏍️' : 'Ground Floor 🛵'})</span>
              </div>
              <div className="metro-fee-pill">
                <span className="fee-currency">₹</span>
                <span className="fee-number font-mono">{fee}</span>
                <span className="fee-tag">INGRESS TOLL</span>
              </div>
            </div>

            {/* Vehicle & Student Info Strip */}
            <div className="metro-vehicle-strip font-mono">
              <div>
                <span className="lbl">VEHICLE PLATE:</span>
                <span className="val plate-highlight">{plate}</span>
              </div>
              <div>
                <span className="lbl">HOLDER:</span>
                <span className="val">{studentName}</span>
              </div>
              <div>
                <span className="lbl">PASS:</span>
                <span className="val">{tierName}</span>
              </div>
            </div>

            {/* Main Interactive Terminal Body */}
            {isPaid ? (
              /* Success / Granted Screen */
              <div className="metro-success-screen">
                <div className="success-icon-ring">
                  <CheckIcon className="w-12 h-12 text-emerald" />
                </div>
                <h4 className="success-title">PAYMENT VERIFIED &bull; ₹{fee} RECEIVED</h4>
                <p className="success-sub">{statusMessage}</p>
                <div className="font-mono text-xs text-cyan bg-cyan-950/40 px-3 py-1 rounded border border-cyan-800/40">
                  METHOD: {paymentMethod} {scannedResult ? `• TOKEN: ${scannedResult.slice(0, 16)}...` : ''}
                </div>
                <div className="success-redirect-pill font-mono">
                  <span>Routing to Reserved Bay Pass receipt...</span>
                </div>
              </div>
            ) : isProcessing ? (
              /* Processing Animation Screen */
              <div className="metro-processing-screen">
                <div className="metro-radar-spinner" />
                <h4 className="processing-title">VERIFYING WITH SYSTEM.IN</h4>
                <p className="processing-sub">{statusMessage}</p>
                <span className="font-mono text-xs text-cyan">GATEWAY: {paymentMethod}</span>
                <div className="metro-laser-line" />
              </div>
            ) : (
              /* Payment Options Screen */
              <div className="metro-payment-tabs-content">
                {/* Method Switcher Tabs */}
                <div className="metro-method-tabs">
                  <button
                    type="button"
                    className={`method-tab ${activeTab === 'upi' ? 'active' : ''}`}
                    onClick={() => handleTabChange('upi')}
                  >
                    <span>📱 UPI QR & Deeplink</span>
                  </button>
                  <button
                    type="button"
                    className={`method-tab ${activeTab === 'camera' ? 'active' : ''}`}
                    onClick={() => handleTabChange('camera')}
                  >
                    <CameraIcon className="w-4 h-4 mr-1 inline" />
                    <span>Camera Scanner</span>
                  </button>
                  <button
                    type="button"
                    className={`method-tab ${activeTab === 'card' ? 'active' : ''}`}
                    onClick={() => handleTabChange('card')}
                  >
                    <span>💳 Stripe Card</span>
                  </button>
                </div>

                {/* TAB 1: UPI DYNAMIC QR & DEEPLINK */}
                {activeTab === 'upi' && (
                  <div className="upi-tab-view">
                    <div className="upi-qr-display-card">
                      <p className="upi-instruction">
                        Point phone camera or scan with any UPI app to pay <strong>₹{fee}</strong>
                      </p>

                      <div className="qr-box-wrapper">
                        {upiQrSrc ? (
                          <img
                            src={upiQrSrc}
                            alt="Dynamic Metro Gate UPI QR"
                            width={210}
                            height={210}
                            className="metro-upi-qr-image"
                          />
                        ) : (
                          <div className="qr-loading-placeholder font-mono text-xs">
                            Generating Dynamic UPI QR...
                          </div>
                        )}
                        <div className="qr-corner corner-tl" />
                        <div className="qr-corner corner-tr" />
                        <div className="qr-corner corner-bl" />
                        <div className="qr-corner corner-br" />
                      </div>

                      {/* Supported UPI Apps */}
                      <div className="upi-providers-list">
                        <span className="provider-pill">GPay</span>
                        <span className="provider-pill">PhonePe</span>
                        <span className="provider-pill">Paytm</span>
                        <span className="provider-pill">BHIM</span>
                        <span className="provider-pill">CRED</span>
                      </div>
                    </div>

                    {/* Mobile UPI Direct App Launcher */}
                    <div className="upi-action-buttons">
                      <a
                        href={upiLink}
                        className="btn-launch-upi"
                        onClick={() => {
                          // Prompt instant verification after launch
                          setTimeout(() => {
                            setStatusMessage('UPI App opened. Waiting for settlement...')
                          }, 500)
                        }}
                      >
                        <span>📲 Tap to Pay ₹{fee} with Installed UPI App</span>
                      </a>

                      <button
                        type="button"
                        id="btn-confirm-metro-upi"
                        className="btn-instant-confirm"
                        onClick={() => handleInstantPayment('UPI')}
                      >
                        <span>✅ I Have Completed UPI Payment (₹{fee})</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* TAB 2: LIVE CAMERA SCANNER */}
                {activeTab === 'camera' && (
                  <div className="camera-tab-view">
                    <div className="camera-viewport-card">
                      <div className="camera-viewport-header">
                        <span className="cam-title font-mono">
                          <CameraIcon className="w-4 h-4 inline mr-1 text-cyan" />
                          LIVE RECEIVER OPTICAL SCANNER
                        </span>
                        <button
                          type="button"
                          className="btn-flip-cam text-xs"
                          onClick={handleFlipCamera}
                          title="Flip camera front/rear"
                        >
                          🔄 Switch Camera ({facingMode === 'environment' ? 'Rear' : 'Front'})
                        </button>
                      </div>

                      {cameraError ? (
                        <div className="camera-error-banner">
                          <AlertCircleIcon className="w-5 h-5 text-amber" />
                          <div>
                            <p className="font-semibold text-xs text-amber-200">Camera Notice</p>
                            <p className="text-2xs text-muted mt-0.5">{cameraError}</p>
                          </div>
                        </div>
                      ) : null}

                      {/* html5-qrcode DOM Target Element */}
                      <div className="camera-video-container">
                        <div id={cameraScannerDomId} className="camera-feed-box" />

                        {/* Scanner HUD Overlay */}
                        <div className="camera-hud-overlay pointer-events-none">
                          <div className="hud-reticle">
                            <div className="hud-laser-bar" />
                          </div>
                          <span className="hud-hint font-mono text-2xs">
                            Hold QR code inside the target reticle
                          </span>
                        </div>
                      </div>

                      {/* Camera Scanner Simulation Helper (great for laptops without rear cams) */}
                      <div className="camera-helper-row">
                        <button
                          type="button"
                          className="btn-test-scan font-mono text-xs"
                          onClick={() => handleQrDetected(`UPI-MOCK-${slotId}-${plate}-${Date.now()}`)}
                        >
                          ⚡ Simulate Camera QR Scan Success
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 3: STRIPE CARD CHECKOUT */}
                {activeTab === 'card' && (
                  <div className="card-tab-view">
                    <div className="stripe-card-badge">
                      <span className="text-2xs font-mono text-cyan">STRIPE TEST GATEWAY</span>
                      <p className="text-xs text-slate-300 mt-1">
                        Secure card payment using live publishable key:
                      </p>
                      <code className="text-2xs font-mono text-cyan-300 block truncate mt-1 bg-black/40 p-1.5 rounded">
                        {stripePublishableKey || 'pk_test_placeholder_key'}
                      </code>
                    </div>

                    <div className="card-simulation-box">
                      <div className="card-mock-row">
                        <span className="text-xs text-muted">Cardholder:</span>
                        <span className="text-xs font-mono font-semibold text-white">{studentName}</span>
                      </div>
                      <div className="card-mock-row">
                        <span className="text-xs text-muted">Amount:</span>
                        <span className="text-xs font-mono font-bold text-emerald">₹{fee}.00 INR</span>
                      </div>
                      <div className="card-mock-row">
                        <span className="text-xs text-muted">Allocated Bay:</span>
                        <span className="text-xs font-mono text-cyan">{slotId}</span>
                      </div>

                      <button
                        type="button"
                        className="btn-stripe-pay"
                        onClick={() => handleInstantPayment('STRIPE_CARD')}
                      >
                        💳 Pay ₹{fee} via Stripe Gateway
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Receiver Bottom Status Strip */}
          <div className="metro-kiosk-footer font-mono">
            <span className="system-in-label">[System.in]</span>
            <span className="status-text">{statusMessage}</span>
          </div>
        </div>

        {/* ── METRO TURNSTILE PASSAGE BASE ── */}
        <div className="metro-turnstile-base">
          <div className="passage-barrier">
            <div className="barrier-arm" />
            <span className="passage-notice font-mono">
              AUTOMATIC BOOM BARRIER LOCKS UNTIL PAYMENT &amp; INGRESS SCAN
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
