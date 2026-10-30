/**
 * Error mapping utilities for QR Camera Scanner.
 * Formats DOMException and browser errors into user-facing diagnostic guidance.
 */
export function getHumanErrorMessage(err, overrideSecureContext = null) {
  const isSecure = overrideSecureContext !== null
    ? overrideSecureContext
    : (typeof window !== 'undefined'
        ? (window.isSecureContext ||
           window.location.hostname === 'localhost' ||
           window.location.hostname === '127.0.0.1' ||
           window.location.hostname === '[::1]')
        : true)

  const errName = String(err?.name || (typeof err === 'string' ? 'StringError' : 'UNKNOWN_CAMERA_ERROR'))
  const rawMessage = String(err?.message || (typeof err === 'string' ? err : 'Unknown camera initialization error'))
  const constraint = err?.constraint ? String(err.constraint) : null
  const errStr = rawMessage.toLowerCase()

  if (!isSecure) {
    return {
      title: 'HTTPS Connection Required',
      errorName: errName || 'SecurityError',
      rawMessage,
      constraint,
      guidance: 'Camera access requires a secure HTTPS connection. Please access over HTTPS (or localhost) or use manual token entry.',
      message: 'Camera access requires a secure HTTPS connection. Please access over HTTPS or use manual token entry.',
      code: 'INSECURE_CONTEXT'
    }
  }

  if (
    errName === 'NotAllowedError' ||
    errName === 'PermissionDeniedError' ||
    errName === 'SecurityError' ||
    errStr.includes('permission') ||
    errStr.includes('denied')
  ) {
    return {
      title: 'Camera Access Denied',
      errorName: errName,
      rawMessage,
      constraint,
      guidance: 'Camera permission was denied. Please allow camera permissions in your browser address bar or settings, or use manual token entry.',
      message: 'Camera permission was denied. Please allow camera permissions in your browser address bar or settings, or use manual token entry.',
      code: 'PERMISSION_DENIED'
    }
  }

  if (
    errName === 'NotFoundError' ||
    errName === 'DevicesNotFoundError' ||
    errStr.includes('not found') ||
    errStr.includes('no camera') ||
    errStr.includes('devicesnotfound') ||
    errStr.includes('requested device not found')
  ) {
    return {
      title: 'No Camera Found',
      errorName: errName,
      rawMessage,
      constraint,
      guidance: 'No camera hardware was detected on this device. Please connect a webcam or use manual token entry.',
      message: 'No camera hardware was detected on this device. Please connect a webcam or use manual token entry.',
      code: 'NO_CAMERA_DEVICE'
    }
  }

  if (
    errName === 'NotReadableError' ||
    errName === 'TrackStartError' ||
    errStr.includes('in use') ||
    errStr.includes('busy') ||
    errStr.includes('could not start video source') ||
    errStr.includes('source unavailable') ||
    errStr.includes('transition')
  ) {
    return {
      title: 'Camera In Use',
      errorName: errName,
      rawMessage,
      constraint,
      guidance: 'The camera is currently in use by another tab or application. Please close other camera apps and retry.',
      message: 'The camera is currently in use by another tab or application. Please close other camera apps and retry.',
      code: 'CAMERA_IN_USE'
    }
  }

  if (errName === 'OverconstrainedError' || errStr.includes('overconstrained')) {
    return {
      title: 'Camera Configuration Error',
      errorName: errName,
      rawMessage,
      constraint,
      guidance: 'Unable to start the camera with the current settings. Trying a compatible camera configuration...',
      message: 'Unable to start the camera with the current settings. Trying a compatible camera configuration...',
      code: 'OVERCONSTRAINED'
    }
  }

  if (errName === 'AbortError' || errStr.includes('aborted')) {
    return {
      title: 'Camera Initialization Aborted',
      errorName: errName,
      rawMessage,
      constraint,
      guidance: 'Camera access was aborted. Please click Retry Camera to start again.',
      message: 'Camera access was aborted. Please click Retry Camera to start again.',
      code: 'ABORTED'
    }
  }

  if (
    errName === 'UNSUPPORTED_BROWSER' ||
    errStr.includes('getusermedia') ||
    errStr.includes('notsupported') ||
    errStr.includes('mediadevices')
  ) {
    return {
      title: 'Browser Not Supported',
      errorName: errName || 'UNSUPPORTED_BROWSER',
      rawMessage,
      constraint,
      guidance: 'Your current browser does not support HTML5 camera streaming. Please use Chrome, Edge, Safari, or manual token entry.',
      message: 'Your current browser does not support HTML5 camera streaming. Please use Chrome, Edge, Safari, or manual token entry.',
      code: 'UNSUPPORTED_BROWSER'
    }
  }

  return {
    title: 'Camera Initialization Failed',
    errorName: errName || 'UNKNOWN_CAMERA_ERROR',
    rawMessage: rawMessage || 'Could not access video feed from camera.',
    constraint,
    guidance: 'Could not access video feed from camera. You can use manual token entry below or click Retry Camera.',
    message: rawMessage || 'Could not access video feed from camera.',
    code: 'CAMERA_INIT_FAILED'
  }
}
