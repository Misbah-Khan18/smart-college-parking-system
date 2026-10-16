/**
 * Centralized Role Definition & Evaluation Module
 * 
 * Provides a single authoritative source of truth for:
 * - Master administrator identification
 * - Role enumeration (Student, Admin, Security Admin)
 * - Safe role resolution (preventing demo & email spoofing escalation)
 * - Administrative capability checks
 */

export const ROLES = Object.freeze({
  STUDENT: 'Student',
  ADMIN: 'Admin',
  SECURITY_ADMIN: 'Security Admin'
})

export const KNOWN_ADMIN_EMAILS = Object.freeze([
  'shaikhalzuni123@gmail.com'
])

export const KNOWN_ADMIN_UIDS = Object.freeze([
  'R2eyVR9vzOUb6rwv9gNCPWcuoGr1'
])

/**
 * Checks whether an account is the hardcoded master administrator by email or UID.
 * 
 * @param {Object} userOrProfile - Firebase User object or Firestore user profile
 * @returns {boolean}
 */
export function isMasterAdmin(userOrProfile) {
  if (!userOrProfile) return false
  const email = (userOrProfile.email || '').toLowerCase().trim()
  const uid = userOrProfile.uid || ''
  return (
    (email && KNOWN_ADMIN_EMAILS.includes(email)) ||
    (uid && KNOWN_ADMIN_UIDS.includes(uid))
  )
}

/**
 * Determines whether a user or profile has Administrative privileges.
 * 
 * Rules:
 * 1. Master admin account always receives Admin privileges.
 * 2. Demo sessions can NEVER receive Admin privileges.
 * 3. Legitimate Admin / Security Admin roles in authenticated profiles receive Admin privileges.
 * 4. Normal users / Students never receive Admin privileges.
 * 
 * @param {Object} userOrProfile - Firebase User or User Profile object
 * @returns {boolean}
 */
export function evaluateIsAdmin(userOrProfile) {
  if (!userOrProfile) return false
  if (isMasterAdmin(userOrProfile)) return true
  // Demo sessions can NEVER be admin
  if (userOrProfile.isDemo) return false
  const role = userOrProfile.role
  return role === ROLES.SECURITY_ADMIN || role === ROLES.ADMIN
}

/**
 * Resolves the authoritative role for an authenticated user.
 * 
 * @param {Object} firebaseUser - Authenticated Firebase Auth user
 * @param {Object} firestoreProfile - Authoritative Firestore document data from users/{uid}
 * @returns {string} One of 'Student' | 'Admin' | 'Security Admin'
 */
export function resolveUserRole(firebaseUser, firestoreProfile) {
  if (isMasterAdmin(firebaseUser) || isMasterAdmin(firestoreProfile)) {
    return ROLES.SECURITY_ADMIN
  }
  if (firebaseUser?.isDemo || firestoreProfile?.isDemo) {
    return ROLES.STUDENT
  }
  const role = firestoreProfile?.role
  if (role === ROLES.ADMIN || role === ROLES.SECURITY_ADMIN) {
    return role
  }
  return ROLES.STUDENT
}
