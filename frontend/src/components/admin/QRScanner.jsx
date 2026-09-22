import { useState, useEffect, useRef, useCallback } from 'react'
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'
import { CameraIcon, AlertCircleIcon, CheckIcon } from '../Icons'

/**
 * Reusable Live QR Camera Scanner Component for Security Gate Terminals.
 *
 * Supports:
 * - Direct camera stream via getUserMedia() with html5-qrcode
 * - Environment (rear) camera prioritization with front/rear switching
 * - Friendly human-readable permission & device error handling
 * - Single-scan lock & immediate stream pause to prevent duplicate triggers
 * - Clean MediaStream unmount cleanup
 * - Responsive viewfinder with cyber-reticle guide
 *
 * @param {Object} props
 * @param {function(string): void} props.onScan - Callback invoked when a QR code is detected
 * @param {boolean} [props.isProcessing] - External loading/verification state that locks scanner
 * @param {boolean} [props.autoStart] - Whether to automatically start camera on mount
 * @param {string} [props.scannerId] - Unique DOM ID for the scanner container
 */
export default function QRScanner({
  onScan,
  isProcessing = false,
  autoStart = false,
  scannerId = 'gate-qr-reader'
}) {
  const [isScanning, setIsScanning] = useState(false)
  const [cameraError, setCameraError] = useState(null)
  const [cameras, setCameras] = useState([])
  const [selectedCameraId, setSelectedCameraId] = useState('')
  const [facingMode, setFacingMode] = useState('environment') // 'environment' | 'user'
  const [lastScannedCode, setLastScannedCode] = useState(null)
  const [isInitializing, setIsInitializing] = useState(false)

  const scannerRef = useRef(null)
  const isMountedRef = useRef(true)
  const scanLockRef = useRef(false)

  // Map browser camera exceptions to helpful human-readable guidance
  const getHumanErrorMessage = (err) => {
    if (!window.isSecureContext && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      return {
        title: 'HTTPS Connection Required',
        message: 'Camera access requires a secure HTTPS connection. Please access over HTTPS or use manual token entry.',
        code: 'INSECURE_CONTEXT'
      }
    }

    const errStr = String(err?.message || err || '').toLowerCase()
    const errName = String(err?.name || '')

    if (errName === 'NotAllowedError' || errStr.includes('permission') || errStr.includes('denied')) {
      return {
        title: 'Camera Access Denied',
        message: 'Camera permission was denied. Please allow camera permissions in your browser address bar or settings, or use manual token entry.',
        code: 'PERMISSION_DENIED'
      }
    }

    if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError' || errStr.includes('not found') || errStr.includes('no camera')) {
      return {
        title: 'No Camera Found',
        message: 'No camera hardware was detected on this device. Please connect a webcam or use manual token entry.',
        code: 'NO_CAMERA_DEVICE'
      }
    }

    if (errName === 'NotReadableError' || errName === 'TrackStartError' || errStr.includes('in use') || errStr.includes('busy')) {
      return {
        title: 'Camera In Use',
        message: 'The camera is currently in use by another tab or application. Please close other camera apps and retry.',
        code: 'CAMERA_IN_USE'
      }
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return {
        title: 'Browser Not Supported',
        message: 'Your current browser does not support HTML5 camera streaming. Please use Chrome, Edge, Safari, or manual token entry.',
        code: 'UNSUPPORTED_BROWSER'
      }
    }

    return {
      title: 'Camera Initialization Failed',
      message: err?.message || 'Could not access video feed from camera. You can use manual token entry below.',
      code: 'CAMERA_INIT_FAILED'
    }
  }

  // Stop camera cleanly and release video tracks
  const stopScanner = useCallback(async () => {
    const scanner = scannerRef.current
    if (scanner) {
      try {
        if (scanner.isScanning) {
          await scanner.stop()
        }
      } catch (err) {
        console.warn('[QRScanner] Stop warning:', err)
      }
      try {
        scanner.clear()
      } catch {
        // clear() is synchronous in html5-qrcode
      }
    }
    if (isMountedRef.current) {
      setIsScanning(false)
      setIsInitializing(false)
    }
  }, [])

  // Start camera stream
  const startScanner = useCallback(async () => {
    if (isScanning || isInitializing) return
    setIsInitializing(true)
    setCameraError(null)
    setLastScannedCode(null)
    scanLockRef.current = false

    // Check browser mediaDevices support
    if (typeof window === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      const errInfo = getHumanErrorMessage(new Error('Browser does not support getUserMedia'))
      setCameraError(errInfo)
      setIsInitializing(false)
      return
    }

    try {
      // 1. Enumerate cameras if not already done
      let availableCameras = cameras
      if (availableCameras.length === 0) {
        try {
          availableCameras = await Html5Qrcode.getCameras()
          if (isMountedRef.current) {
            setCameras(availableCameras || [])
          }
        } catch {
          // Non-blocking device enumeration
        }
      }

      // 2. Initialize Html5Qrcode instance
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode(scannerId, {
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          verbose: false,
          experimentalFeatures: {
            useBarCodeDetectorIfSupported: true
          }
        })
      }

      // 3. Configure camera source
      let cameraConfig = { facingMode }
      if (selectedCameraId) {
        cameraConfig = { deviceId: { exact: selectedCameraId } }
      } else if (availableCameras && availableCameras.length > 0) {
        // Look for rear/back camera if facingMode is environment
        const backCam = availableCameras.find(
          (c) => c.label.toLowerCase().includes('back') || c.label.toLowerCase().includes('rear') || c.label.toLowerCase().includes('environment')
        )
        if (backCam && facingMode === 'environment') {
          cameraConfig = { deviceId: { exact: backCam.id } }
        }
      }

      const scanConfig = {
        fps: 10,
        disableFlip: facingMode === 'environment'
      }

      // 4. Start decoding video stream with full-frame uncropped processing
      await scannerRef.current.start(
        cameraConfig,
        scanConfig,
        (decodedText) => {
          // Success callback
          if (!decodedText || scanLockRef.current || isProcessing) return

          // Lock scanner immediately to prevent duplicate detections
          scanLockRef.current = true
          const cleanToken = decodedText.trim()
          setLastScannedCode(cleanToken)

          // Audio/Visual feedback can be triggered here
          if (onScan) {
            onScan(cleanToken)
          }

          // Stop scanning stream cleanly after successful detection
          if (scannerRef.current && scannerRef.current.isScanning) {
            try {
              const stopPromise = scannerRef.current.stop()
              if (stopPromise && typeof stopPromise.catch === 'function') {
                stopPromise.catch(() => {})
              }
            } catch {
              // ignore
            }
            setIsScanning(false)
          }
        },
        () => {
          // Frame decode failure (normal when QR not yet in frame) - no op
        }
      )

      if (isMountedRef.current) {
        setIsScanning(true)
        setIsInitializing(false)
      }
    } catch (err) {
      console.error('[QRScanner] Start scanner error:', err)
      const errInfo = getHumanErrorMessage(err)
      if (isMountedRef.current) {
        setCameraError(errInfo)
        setIsScanning(false)
        setIsInitializing(false)
      }
    }
  }, [isScanning, isInitializing, cameras, scannerId, facingMode, selectedCameraId, isProcessing, onScan])

  // Switch between front and rear cameras
  const handleToggleFacingMode = async () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment'
    setFacingMode(nextMode)
    setSelectedCameraId('')
    if (isScanning) {
      await stopScanner()
      setTimeout(() => {
        if (isMountedRef.current) {
          startScanner()
        }
      }, 200)
    }
  }

  // Handle explicit device selection
  const handleSelectCamera = async (deviceId) => {
    setSelectedCameraId(deviceId)
    if (isScanning) {
      await stopScanner()
      setTimeout(() => {
        if (isMountedRef.current) {
          startScanner()
        }
      }, 200)
    }
  }

  // Reset scanner state for next scan
  const resetScanner = useCallback(() => {
    scanLockRef.current = false
    setLastScannedCode(null)
    setCameraError(null)
    if (!isScanning && !isProcessing) {
      startScanner()
    }
  }, [isScanning, isProcessing, startScanner])

  // Auto-start on mount if requested & cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true
    let timer = null
    if (autoStart) {
      timer = setTimeout(() => {
        if (isMountedRef.current) {
          startScanner()
        }
      }, 50)
    }

    return () => {
      if (timer) clearTimeout(timer)
      isMountedRef.current = false
      const scanner = scannerRef.current
      if (scanner) {
        try {
          if (scanner.isScanning) {
            const stopPromise = scanner.stop()
            if (stopPromise && typeof stopPromise.then === 'function') {
              stopPromise
                .then(() => {
                  try {
                    scanner.clear()
                  } catch {
                    /* ignored */
                  }
                })
                .catch(() => {})
            }
          } else {
            try {
              scanner.clear()
            } catch {
              /* ignored */
            }
          }
        } catch {
          /* ignored */
        }
      }
    }
  }, [autoStart, startScanner])

  return (
    <div className="qr-camera-scanner-wrapper">
      {/* Viewfinder Frame Container */}
      <div className="camera-viewfinder-container">
        {/* html5-qrcode DOM Target Element */}
        <div id={scannerId} className={`qr-reader-surface ${isScanning ? 'active' : 'idle'}`} />

        {/* Live HUD Reticle Overlay */}
        {isScanning && (
          <div className="viewfinder-hud-overlay">
            <div className="hud-corner top-left"></div>
            <div className="hud-corner top-right"></div>
            <div className="hud-corner bottom-left"></div>
            <div className="hud-corner bottom-right"></div>
            <div className="hud-laser-beam"></div>
            <div className="hud-target-label font-mono">
              ALIGN QR PASS IN BOX
            </div>
          </div>
        )}

        {/* Idle Placeholder State */}
        {!isScanning && !isInitializing && !cameraError && !lastScannedCode && (
          <div className="camera-idle-overlay">
            <div className="camera-idle-icon-wrap">
              <CameraIcon className="w-10 h-10 text-cyan animate-pulse" />
            </div>
            <h4 className="text-sm font-semibold text-slate-200 mt-2">
              Optical QR Pass Reader Ready
            </h4>
            <p className="text-xs text-muted max-w-xs text-center mt-1">
              Position physical student pass or mobile screen in front of security gate camera.
            </p>
            <button
              type="button"
              className="btn btn-primary btn-sm mt-3"
              onClick={startScanner}
              disabled={isProcessing}
            >
              📷 Start Camera Scanner
            </button>
          </div>
        )}

        {/* Initializing Spinner */}
        {isInitializing && (
          <div className="camera-idle-overlay">
            <div className="live-dot-pulse mb-2" style={{ background: '#38bdf8', width: 14, height: 14 }}></div>
            <span className="text-xs font-mono text-cyan">Accessing Gate Camera Stream...</span>
          </div>
        )}

        {/* Successful Detection Banner */}
        {lastScannedCode && (
          <div className="scanned-success-overlay">
            <div className="flex items-center justify-between gap-2 w-full">
              <div className="flex items-center gap-2">
                <CheckIcon className="w-5 h-5 text-emerald" />
                <div>
                  <span className="text-xs font-bold text-emerald-400 block">QR PASS DETECTED</span>
                  <code className="text-2xs font-mono text-slate-300 break-all">{lastScannedCode}</code>
                </div>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-xs"
                onClick={resetScanner}
                title="Scan next pass"
              >
                Scan Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Camera Error Alert Banner */}
      {cameraError && (
        <div className="camera-error-banner glass-card mt-3">
          <div className="flex items-start gap-2.5">
            <AlertCircleIcon className="w-5 h-5 text-rose flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <strong className="text-xs font-bold text-rose-300 block">
                {cameraError.title}
              </strong>
              <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                {cameraError.message}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <button
                  type="button"
                  className="btn btn-secondary btn-xs"
                  onClick={startScanner}
                >
                  🔄 Retry Camera
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Camera Controls Toolbar */}
      <div className="camera-controls-bar mt-2.5 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          {isScanning ? (
            <button
              type="button"
              className="btn btn-rose btn-xs"
              onClick={stopScanner}
              disabled={isProcessing}
            >
              ⏹️ Stop Camera
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary btn-xs"
              onClick={startScanner}
              disabled={isProcessing || isInitializing}
            >
              📷 {lastScannedCode ? 'Scan Next QR' : 'Start Camera'}
            </button>
          )}

          {lastScannedCode && (
            <button
              type="button"
              className="btn btn-secondary btn-xs"
              onClick={resetScanner}
              disabled={isProcessing}
            >
              🔄 Reset Scanner
            </button>
          )}

          {/* Front / Rear Camera Switcher */}
          <button
            type="button"
            className="btn btn-secondary btn-xs"
            onClick={handleToggleFacingMode}
            disabled={isProcessing || isInitializing}
            title="Switch between front and back cameras"
          >
            🔄 {facingMode === 'environment' ? 'Back Cam' : 'Front Cam'}
          </button>
        </div>

        {/* Camera Device Dropdown if multiple hardware devices detected */}
        {cameras.length > 1 && (
          <div className="camera-select-wrap">
            <select
              value={selectedCameraId}
              onChange={(e) => handleSelectCamera(e.target.value)}
              className="text-2xs custom-select py-1 px-2 font-mono"
              disabled={isProcessing || isInitializing}
            >
              <option value="">Default Camera</option>
              {cameras.map((cam, idx) => (
                <option key={cam.id} value={cam.id}>
                  {cam.label || `Camera ${idx + 1}`}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="telemetry-live-tag">
          <span
            className="live-dot-pulse"
            style={{ background: isScanning ? '#10b981' : '#64748b' }}
          ></span>
          <span className="text-2xs font-mono text-muted">
            {isScanning ? 'SENSOR ACTIVE' : isInitializing ? 'INITIALIZING' : 'STANDBY'}
          </span>
        </div>
      </div>
    </div>
  )
}
