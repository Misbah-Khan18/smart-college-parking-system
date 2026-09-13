/**
 * Timer Utility Functions for Module 7 – Live Parking Timer
 */

/**
 * Format milliseconds into human readable detailed string
 * e.g., "02 Hours 15 Minutes 30 Seconds" or "45 Minutes 12 Seconds"
 */
export const formatLiveDurationDetailed = (entryTimestamp) => {
  if (!entryTimestamp) return '00 Minutes 00 Seconds'
  const now = Date.now()
  const elapsedMs = Math.max(0, now - entryTimestamp)
  
  const totalSeconds = Math.floor(elapsedMs / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (hours > 0) {
    const hh = String(hours).padStart(2, '0')
    const mm = String(minutes).padStart(2, '0')
    const ss = String(seconds).padStart(2, '0')
    return `${hh} Hours ${mm} Minutes ${ss} Seconds`
  }

  const mm = String(minutes).padStart(2, '0')
  const ss = String(seconds).padStart(2, '0')
  return `${mm} Minutes ${ss} Seconds`
}

/**
 * Format into standard requirement string:
 * e.g., "Parked for 02 Hours 15 Minutes" or "Parked for 45 Minutes"
 */
export const formatLiveDurationStandard = (entryTimestamp) => {
  if (!entryTimestamp) return 'Parked for 0 Minutes'
  const now = Date.now()
  const elapsedMs = Math.max(0, now - entryTimestamp)
  
  const totalSeconds = Math.floor(elapsedMs / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)

  if (hours > 0) {
    const hh = String(hours).padStart(2, '0')
    const mm = String(minutes).padStart(2, '0')
    return `Parked for ${hh} Hours ${mm} Minutes`
  }

  return `Parked for ${minutes} Minutes`
}

/**
 * Format into compact ticking badge:
 * e.g., "02h 15m 32s" or "45m 12s"
 */
export const formatLiveDurationCompact = (entryTimestamp) => {
  if (!entryTimestamp) return '00m 00s'
  const now = Date.now()
  const elapsedMs = Math.max(0, now - entryTimestamp)
  
  const totalSeconds = Math.floor(elapsedMs / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  const mm = String(minutes).padStart(2, '0')
  const ss = String(seconds).padStart(2, '0')

  if (hours > 0) {
    const hh = String(hours).padStart(2, '0')
    return `${hh}h ${mm}m ${ss}s`
  }

  return `${mm}m ${ss}s`
}

/**
 * Calculate stay category for color badge indicator
 */
export const getStayDurationCategory = (entryTimestamp) => {
  if (!entryTimestamp) return { label: 'Short Stay', color: 'emerald' }
  const elapsedMinutes = (Date.now() - entryTimestamp) / (1000 * 60)
  
  if (elapsedMinutes >= 180) {
    return { label: 'Extended Stay (3h+)', color: 'rose' }
  }
  if (elapsedMinutes >= 60) {
    return { label: 'Moderate Stay (1h+)', color: 'amber' }
  }
  return { label: 'Short Stay (<1h)', color: 'emerald' }
}

/**
 * Authoritatively calculate parking duration from entryTimestamp and exitTimestamp (ms).
 * Accurately handles seconds, minutes, hours, and sessions crossing midnight or multi-day stays.
 */
export const calculateAuthoritativeDuration = (entryTimestamp, exitTimestamp = Date.now()) => {
  const start = Number(entryTimestamp) || Number(exitTimestamp) || Date.now()
  const end = Number(exitTimestamp) || Date.now()
  const durationMs = Math.max(0, end - start)

  const totalSeconds = Math.floor(durationMs / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  let durationStr = ''
  if (hours > 0) {
    durationStr = minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`
  } else if (minutes > 0) {
    durationStr = `${minutes}m`
  } else {
    durationStr = `${seconds}s`
  }

  return {
    durationMs,
    durationStr,
    hours,
    minutes,
    seconds
  }
}

