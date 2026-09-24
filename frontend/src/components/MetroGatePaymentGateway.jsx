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
  const [activeTab, setActiveTab] = useState('upi') // 'upi' | 'camera'
  const [upiQrSrc, setUpiQrSrc] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [isPaid, setIsPaid] = useState(false)
  const [statusMessage, setStatusMessage] = useState('Scan QR to pay ₹10')
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState(null)
  const [facingMode, setFacingMode] = useState('environment') // 'environment' | 'user'

  const html5QrCodeRef = useRef(null)
  const cameraScannerDomId = 'gate-camera-scanner-view'
  const isMountedRef = useRef(true)

  const fee = bookingData?.amountPaidINR || 10
  const slotId = bookingData?.slotId || 'G-76'
  const plate = bookingData?.plate || bookingData?.vehiclePlate || bookingData?.vehicleNumber || 'MH-12-IH-3595'
  const studentName = bookingData?.owner || bookingData?.userName || 'Student'
  const vehicleType = bookingData?.vehicleType || 'scooty'

  // Standard NPCI UPI Payment URI
  const upiLink = `upi://pay?pa=${encodeURIComponent(UPI_VPA)}&pn=${encodeURIComponent(MERCHANT_NAME)}&am=${encodeURIComponent(fee.toFixed(2))}&cu=INR&tn=${encodeURIComponent(`SOCMAC-${slotId}-${plate}`)}`

  // ── Generate QR Code ──
  useEffect(() => {
    let active = true
    QRCode.toDataURL(upiLink, {
      width: 220,
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

  // ── Camera Cleanup ──
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
        // clear DOM
      }
    }
    if (isMountedRef.current) {
      setCameraActive(false)
    }
  }, [])

  // ── Success Flow ──
  const completePayment = useCallback(() => {
    playSuccessChime()
    setIsProcessing(false)
    setIsPaid(true)
    setStatusMessage(`Payment of ₹${fee} verified!`)

    setTimeout(() => {
      if (onPaymentSuccess) {
        onPaymentSuccess({
          ...bookingData,
          paymentStatus: 'PAID',
          paidAmountINR: fee,
          paidAt: new Date().toISOString()
        })
      }
    }, 1000)
  }, [bookingData, fee, onPaymentSuccess])

  const handleQrDetected = useCallback(() => {
    playScannerBeep()
    stopCamera()
    setIsProcessing(true)
    setStatusMessage('Verifying payment...')
    setTimeout(completePayment, 1200)
  }, [completePayment, stopCamera])

  // ── Camera Start ──
  const startCamera = useCallback(async (mode = facingMode) => {
    setCameraError(null)
    setCameraActive(true)

    await new Promise((r) => setTimeout(r, 100))

    const domEl = document.getElementById(cameraScannerDomId)
    if (!domEl) {
      setCameraError('Camera view is not available.')
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
          qrbox: { width: 200, height: 200 },
          aspectRatio: 1.0
        },
        () => {
          handleQrDetected()
        },
        () => {
          // ignore scan frame errors
        }
      )
    } catch (err) {
      console.warn('[MetroGatePaymentGateway] Camera error:', err)
      setCameraError(
        err?.name === 'NotAllowedError'
          ? 'Camera permission denied. You can scan the QR on screen with your phone or use the Confirm button.'
          : 'Camera is unavailable. Please scan the QR code using your phone or confirm payment below.'
      )
      setCameraActive(false)
    }
  }, [cameraScannerDomId, facingMode, handleQrDetected])

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

  const handleManualConfirm = () => {
    playScannerBeep()
    setIsProcessing(true)
    setStatusMessage('Verifying payment...')
    setTimeout(completePayment, 1200)
  }

  if (!isOpen) return null

  return (
    <div className="metro-payment-backdrop" onClick={!isProcessing && !isPaid ? onCancel : undefined}>
      <div
        className="metro-payment-container"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Gate Entry Payment"
      >
        {/* Header */}
        <div className="metro-station-banner">
          <div className="metro-station-name">
            <span className="metro-logo">🚇</span>
            <div>
              <h3>Entry Gate Payment</h3>
              <p>Campus Parking &bull; Lane 2</p>
            </div>
          </div>
          {!isProcessing && !isPaid && (
            <button
              type="button"
              className="metro-close-btn"
              onClick={onCancel}
              aria-label="Close payment"
            >
              <XIcon className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content Box */}
        <div className="metro-kiosk-box">
          {/* Bay and vehicle summary */}
          <div className="metro-screen-top">
            <div className="metro-bay-tag">
              <span className="bay-pin">📍</span>
              <span className="bay-id font-mono font-bold">Bay {slotId}</span>
              <span className="bay-type">({vehicleType === 'bike' ? 'Basement' : 'Ground Floor'})</span>
            </div>
            <div className="metro-fee-pill">
              <span className="fee-currency">₹</span>
              <span className="fee-number font-mono">{fee}</span>
              <span className="fee-tag">ENTRY FEE</span>
            </div>
          </div>

          <div className="metro-vehicle-strip font-mono">
            <div>
              <span className="lbl">Plate:</span>
              <span className="val plate-highlight">{plate}</span>
            </div>
            <div>
              <span className="lbl">Student:</span>
              <span className="val">{studentName}</span>
            </div>
          </div>

          {/* Screen Content */}
          <div className="metro-screen">
            {isPaid ? (
              <div className="metro-success-screen">
                <div className="success-icon-ring">
                  <CheckIcon className="w-10 h-10 text-emerald" />
                </div>
                <h4 className="success-title">Payment Completed (₹{fee})</h4>
                <p className="success-sub">{statusMessage}</p>
                <div className="success-redirect-pill font-mono text-xs">
                  Opening your entry pass...
                </div>
              </div>
            ) : isProcessing ? (
              <div className="metro-processing-screen">
                <div className="metro-radar-spinner" />
                <h4 className="processing-title">Verifying Payment</h4>
                <p className="processing-sub">{statusMessage}</p>
              </div>
            ) : (
              <div>
                {/* Mode Selector */}
                <div className="metro-method-tabs">
                  <button
                    type="button"
                    className={`method-tab ${activeTab === 'upi' ? 'active' : ''}`}
                    onClick={() => handleTabChange('upi')}
                  >
                    <span>📱 UPI QR &amp; App</span>
                  </button>
                  <button
                    type="button"
                    className={`method-tab ${activeTab === 'camera' ? 'active' : ''}`}
                    onClick={() => handleTabChange('camera')}
                  >
                    <CameraIcon className="w-4 h-4 mr-1 inline" />
                    <span>Camera Scanner</span>
                  </button>
                </div>

                {/* Tab 1: UPI QR */}
                {activeTab === 'upi' && (
                  <div className="upi-tab-view">
                    <p className="upi-instruction">
                      Scan with Google Pay, PhonePe, or any UPI app to pay <strong>₹{fee}</strong>
                    </p>

                    <div className="qr-box-wrapper">
                      {upiQrSrc ? (
                        <img
                          src={upiQrSrc}
                          alt="UPI Payment QR"
                          width={200}
                          height={200}
                          className="metro-upi-qr-image"
                        />
                      ) : (
                        <div className="qr-loading-placeholder text-xs">
                          Loading QR Code...
                        </div>
                      )}
                    </div>

                    <div className="upi-providers-list">
                      <span className="provider-pill">GPay</span>
                      <span className="provider-pill">PhonePe</span>
                      <span className="provider-pill">Paytm</span>
                      <span className="provider-pill">BHIM</span>
                    </div>

                    <div className="upi-action-buttons">
                      <a
                        href={upiLink}
                        className="btn-launch-upi"
                      >
                        <span>📲 Open in UPI App (GPay / PhonePe)</span>
                      </a>

                      <button
                        type="button"
                        id="btn-confirm-metro-upi"
                        className="btn-instant-confirm"
                        onClick={handleManualConfirm}
                      >
                        <span>✅ I Have Completed Payment (₹{fee})</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Tab 2: Camera Scanner */}
                {activeTab === 'camera' && (
                  <div className="camera-tab-view">
                    <div className="camera-viewport-card">
                      <div className="camera-viewport-header">
                        <span className="cam-title">
                          <CameraIcon className="w-4 h-4 inline mr-1 text-cyan" />
                          Point camera at payment QR
                        </span>
                        <button
                          type="button"
                          className="btn-flip-cam text-xs"
                          onClick={handleFlipCamera}
                        >
                          🔄 Flip Camera
                        </button>
                      </div>

                      {cameraError ? (
                        <div className="camera-error-banner">
                          <AlertCircleIcon className="w-5 h-5 text-amber" />
                          <p className="text-xs text-muted">{cameraError}</p>
                        </div>
                      ) : null}

                      <div className="camera-video-container">
                        <div id={cameraScannerDomId} className="camera-feed-box" />
                        <div className="camera-hud-overlay pointer-events-none">
                          <div className="hud-reticle">
                            <div className="hud-laser-bar" />
                          </div>
                        </div>
                      </div>

                      <div className="camera-helper-row">
                        <button
                          type="button"
                          className="btn-test-scan text-xs"
                          onClick={handleQrDetected}
                        >
                          ⚡ Test QR Scan Verification
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="metro-kiosk-footer font-mono">
            <span className="status-text">{statusMessage}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
