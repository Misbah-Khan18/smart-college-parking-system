import { useState, useEffect, useRef, useCallback } from 'react'
import { CameraIcon, AlertCircleIcon, CheckIcon } from '../Icons'
import { getHumanErrorMessage } from '../../utils/qrErrorUtils'

/**
 * Reusable Live QR Camera Scanner Component for Security Gate Terminals.
 *
 * Single-Stream Architecture:
 * - Direct native getUserMedia() stream acquisition without disposable probe cycles
 * - Direct stream reuse: once acquired, stream is immediately attached to <video> and kept active
 * - Strict initialization lock preventing concurrent getUserMedia execution
 * - Clean teardown on unmount, camera switch, or successful detection
 * - BarcodeDetector hardware QR scanning loop with duplicate-scan lock
 * - Real-time diagnostic error rendering
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

  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const activeStreamRef = useRef(null)
  const initializationInFlightRef = useRef(false)
  const isMountedRef = useRef(true)
  const scanLockRef = useRef(false)
  const isScanningRef = useRef(false)
  const animationFrameRef = useRef(null)
  const barcodeDetectorRef = useRef(null)

  // Stop active camera stream and cancel scanning loop
  const stopActiveCameraStream = useCallback(() => {
    isScanningRef.current = false
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }

    if (streamRef.current) {
      try {
        const tracks = streamRef.current.getTracks()
        tracks.forEach((track) => {
          try {
            track.stop()
          } catch {}
        })
      } catch {}
      streamRef.current = null
    }

    if (activeStreamRef.current && activeStreamRef.current !== streamRef.current) {
      try {
        const tracks = activeStreamRef.current.getTracks()
        tracks.forEach((track) => {
          try {
            track.stop()
          } catch {}
        })
      } catch {}
      activeStreamRef.current = null
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null
    }

    if (isMountedRef.current) {
      setIsScanning(false)
      setIsInitializing(false)
    }
  }, [])

  // Core stream initialization with single-active-stream reuse
  const startScannerCore = useCallback(
    async (targetFacingMode = facingMode, targetDeviceId = selectedCameraId) => {
      if (initializationInFlightRef.current) {
        console.warn('[QR CAMERA] initialization already in progress')
        return
      }
      initializationInFlightRef.current = true

      if (isMountedRef.current) {
        setIsInitializing(true)
        setCameraError(null)
        setLastScannedCode(null)
      }
      scanLockRef.current = false

      const secureContext = typeof window !== 'undefined' ? window.isSecureContext : false
      const protocol = typeof window !== 'undefined' ? window.location.protocol : ''
      const hostname = typeof window !== 'undefined' ? window.location.hostname : ''
      const mediaDevicesAvailable = typeof navigator !== 'undefined' && !!navigator.mediaDevices
      const getUserMediaAvailable = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia

      console.log('[QR CAMERA] preflight', {
        secureContext,
        protocol,
        hostname,
        mediaDevicesAvailable,
        getUserMediaAvailable
      })

      if (typeof window === 'undefined' || !mediaDevicesAvailable || !getUserMediaAvailable) {
        const errInfo = getHumanErrorMessage(new Error('Browser does not support getUserMedia'))
        console.error('[QR CAMERA] getUserMedia failed', {
          name: 'UNSUPPORTED_BROWSER',
          message: 'Browser does not support navigator.mediaDevices.getUserMedia',
          constraint: null,
          stack: null,
          secureContext,
          hasMediaDevices: mediaDevicesAvailable,
          hasGetUserMedia: getUserMediaAvailable
        })
        if (isMountedRef.current) {
          setCameraError(errInfo)
          setIsInitializing(false)
        }
        initializationInFlightRef.current = false
        return
      }

      // Query permission state
      if (typeof navigator !== 'undefined' && navigator.permissions?.query) {
        try {
          const permStatus = await navigator.permissions.query({ name: 'camera' })
          console.log('[QR CAMERA] permission state', permStatus.state)
        } catch {}
      }

      // Enumerate hardware devices
      if (typeof navigator !== 'undefined' && navigator.mediaDevices?.enumerateDevices) {
        try {
          const devices = await navigator.mediaDevices.enumerateDevices()
          const videoDevices = devices.filter((d) => d.kind === 'videoinput')
          console.log(
            '[QR CAMERA] video devices',
            videoDevices.map((d) => ({
              kind: d.kind,
              deviceIdPresent: !!d.deviceId,
              labelPresent: !!d.label
            }))
          )
          const formatted = videoDevices.map((d, idx) => ({
            id: d.deviceId,
            label: d.label || `Camera ${idx + 1}`
          }))
          if (isMountedRef.current && formatted.length > 0) {
            setCameras(formatted)
          }
        } catch (devErr) {
          console.warn('[QR CAMERA] enumerateDevices error:', devErr?.message)
        }
      }

      // Build candidate constraints: Preferred ONCE -> Generic fallback ONCE
      const candidateConstraints = []
      if (targetDeviceId) {
        candidateConstraints.push({
          video: { deviceId: { exact: targetDeviceId } },
          audio: false
        })
      } else {
        candidateConstraints.push({
          video: { facingMode: { ideal: targetFacingMode } },
          audio: false
        })
      }
      candidateConstraints.push({
        video: true,
        audio: false
      })

      let acquiredStream = null
      let lastError = null

      try {
        for (const constraints of candidateConstraints) {
          if (!isMountedRef.current) break
          try {
            console.log('[QR CAMERA] requesting stream with constraints:', constraints)
            acquiredStream = await navigator.mediaDevices.getUserMedia(constraints)
            console.log('[QR CAMERA] camera acquisition success')
            break // STOP IMMEDIATELY ON SUCCESS
          } catch (tierErr) {
            lastError = tierErr
            console.warn('[QR CAMERA] constraint attempt rejected:', {
              name: tierErr?.name,
              message: tierErr?.message,
              constraints
            })
            const errName = String(tierErr?.name || '')
            if (
              errName === 'NotAllowedError' ||
              errName === 'PermissionDeniedError' ||
              errName === 'SecurityError'
            ) {
              throw tierErr
            }
          }
        }

        if (!acquiredStream) {
          throw lastError || new Error('Could not access video feed from camera.')
        }

        // Reuse acquired stream directly
        streamRef.current = acquiredStream
        activeStreamRef.current = acquiredStream
        console.log('[QR CAMERA] using active stream')
        console.log(
          '[QR CAMERA] tracks',
          acquiredStream.getVideoTracks().map((t) => ({
            label: t.label,
            readyState: t.readyState,
            enabled: t.enabled,
            settings: typeof t.getSettings === 'function' ? t.getSettings() : {}
          }))
        )

        // Attach directly to video element
        const video = videoRef.current
        if (video) {
          video.srcObject = acquiredStream
          video.muted = true
          video.setAttribute('playsinline', 'true')
          video.setAttribute('webkit-playsinline', 'true')

          try {
            await video.play()
            console.log('[QR CAMERA] video playback started')
          } catch (playError) {
            console.error('[QR CAMERA] video.play() failed', {
              name: playError?.name,
              message: playError?.message
            })
          }
        }

        // Initialize BarcodeDetector if available
        if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
          try {
            barcodeDetectorRef.current = new window.BarcodeDetector({ formats: ['qr_code'] })
          } catch {
            try {
              barcodeDetectorRef.current = new window.BarcodeDetector()
            } catch {
              barcodeDetectorRef.current = null
            }
          }
        }

        // Start scanning loop
        isScanningRef.current = true
        scanLockRef.current = false
        console.log('[QR CAMERA] scanner started')

        const scanFrame = async () => {
          if (!isScanningRef.current || scanLockRef.current || isProcessing) return
          const v = videoRef.current
          if (v && v.readyState >= 2 && !v.paused && !v.ended) {
            try {
              if (barcodeDetectorRef.current) {
                const barcodes = await barcodeDetectorRef.current.detect(v)
                if (barcodes && barcodes.length > 0) {
                  const detected = barcodes[0].rawValue
                  if (detected && !scanLockRef.current) {
                    scanLockRef.current = true
                    const cleanToken = detected.trim()
                    setLastScannedCode(cleanToken)
                    if (onScan) {
                      onScan(cleanToken)
                    }
                    stopActiveCameraStream()
                    return
                  }
                }
              }
            } catch {
              // Frame decode miss is normal
            }
          }
          if (isScanningRef.current && !scanLockRef.current) {
            animationFrameRef.current = requestAnimationFrame(scanFrame)
          }
        }

        animationFrameRef.current = requestAnimationFrame(scanFrame)

        if (isMountedRef.current) {
          setIsScanning(true)
          setIsInitializing(false)
        }
      } catch (err) {
        console.error('[QR CAMERA] getUserMedia failed', {
          name: err?.name,
          message: err?.message,
          constraint: err?.constraint,
          stack: err?.stack,
          secureContext,
          hasMediaDevices: mediaDevicesAvailable,
          hasGetUserMedia: getUserMediaAvailable
        })

        const errInfo = getHumanErrorMessage(err)
        if (isMountedRef.current) {
          setCameraError(errInfo)
          setIsScanning(false)
          setIsInitializing(false)
        }
      } finally {
        initializationInFlightRef.current = false
      }
    },
    [facingMode, selectedCameraId, isProcessing, onScan, stopActiveCameraStream]
  )

  // Start Camera click handler (reuses stream if already active)
  const handleStartCameraClick = useCallback(async () => {
    if (isScanning || activeStreamRef.current) {
      console.log('[QR CAMERA] camera already active, preserving stream')
      return
    }
    await startScannerCore()
  }, [isScanning, startScannerCore])

  // Stop Camera click handler
  const handleStopCameraClick = useCallback(() => {
    stopActiveCameraStream()
  }, [stopActiveCameraStream])

  // Switch between front and rear cameras cleanly
  const handleToggleFacingMode = async () => {
    if (initializationInFlightRef.current) return
    const nextMode = facingMode === 'environment' ? 'user' : 'environment'
    setFacingMode(nextMode)
    setSelectedCameraId('')
    stopActiveCameraStream()
    await new Promise((r) => setTimeout(r, 60))
    await startScannerCore(nextMode, '')
  }

  // Handle explicit device selection from dropdown
  const handleSelectCamera = async (deviceId) => {
    if (initializationInFlightRef.current) return
    setSelectedCameraId(deviceId)
    stopActiveCameraStream()
    await new Promise((r) => setTimeout(r, 60))
    await startScannerCore(facingMode, deviceId)
  }

  // Reset scanner state for next scan
  const resetScanner = useCallback(async () => {
    scanLockRef.current = false
    setLastScannedCode(null)
    setCameraError(null)
    stopActiveCameraStream()
    await new Promise((r) => setTimeout(r, 60))
    if (isMountedRef.current && !isProcessing) {
      await startScannerCore()
    }
  }, [isProcessing, startScannerCore, stopActiveCameraStream])

  // Dedicated retry action
  const handleRetryCamera = async () => {
    if (initializationInFlightRef.current) return
    setCameraError(null)
    stopActiveCameraStream()
    await new Promise((r) => setTimeout(r, 60))
    await startScannerCore()
  }

  // Auto-start on mount if requested & cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true
    let timer = null
    if (autoStart) {
      timer = setTimeout(() => {
        if (isMountedRef.current) {
          startScannerCore()
        }
      }, 60)
    }

    return () => {
      if (timer) clearTimeout(timer)
      isMountedRef.current = false
      stopActiveCameraStream()
    }
  }, [autoStart, startScannerCore, stopActiveCameraStream])

  return (
    <div className="qr-camera-scanner-wrapper">
      {/* Viewfinder Frame Container */}
      <div className="camera-viewfinder-container">
        {/* Direct HTML5 Video Surface */}
        <div id={scannerId} className={`qr-reader-surface ${isScanning ? 'active' : 'idle'}`}>
          <video
            ref={videoRef}
            className="qr-camera-video-elem"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: isScanning ? 'block' : 'none'
            }}
            playsInline
            muted
            autoPlay
          />
        </div>

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
              id="btn-start-camera-scanner"
              className="btn btn-primary btn-sm mt-3"
              onClick={handleStartCameraClick}
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

      {/* Camera Error Alert Banner with Raw Browser Diagnostics & Guidance */}
      {cameraError && (
        <div className="camera-error-banner glass-card mt-3">
          <div className="flex items-start gap-2.5">
            <AlertCircleIcon className="w-5 h-5 text-rose flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <strong className="text-xs font-bold text-rose-300 block">
                {cameraError.title}
              </strong>

              {/* Diagnostic Box displaying actual browser error, raw message, and guidance */}
              <div className="camera-diagnostic-box mt-2 p-2.5 rounded bg-slate-900/90 border border-rose-500/30 font-mono text-2xs space-y-1.5 text-left">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400">Browser error:</span>
                  <span className="text-rose-400 font-bold">{cameraError.errorName || 'UNKNOWN_ERROR'}</span>
                </div>
                <div>
                  <span className="text-slate-400">Details: </span>
                  <span className="text-slate-200">{cameraError.rawMessage || cameraError.message}</span>
                </div>
                {cameraError.constraint && (
                  <div>
                    <span className="text-slate-400">Constraint: </span>
                    <span className="text-amber-400">{cameraError.constraint}</span>
                  </div>
                )}
                {cameraError.guidance && (
                  <div className="pt-1.5 border-t border-slate-700/50">
                    <span className="text-cyan font-sans font-semibold block text-xs mb-0.5">Guidance:</span>
                    <span className="text-slate-300 font-sans text-xs leading-relaxed block">{cameraError.guidance}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 mt-2.5">
                <button
                  type="button"
                  id="btn-retry-camera-scanner"
                  className="btn btn-secondary btn-xs"
                  onClick={handleRetryCamera}
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
              onClick={handleStopCameraClick}
              disabled={isProcessing}
            >
              ⏹️ Stop Camera
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary btn-xs"
              onClick={handleStartCameraClick}
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
