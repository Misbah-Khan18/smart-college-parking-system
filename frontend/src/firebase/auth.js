import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
} from 'firebase/auth'
import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
} from 'firebase/firestore'
import { auth, db } from './firebase'

const googleProvider = new GoogleAuthProvider()
googleProvider.setCustomParameters({
  prompt: 'select_account'
})

/**
 * Sign in using Google OAuth Popup
 */
export const signInWithGoogle = async () => {
  try {
    // Clear any active demo session before initiating real Google auth
    localStorage.removeItem('demo_user_session')

    const result = await signInWithPopup(auth, googleProvider)
    const user = result.user

    // Fetch existing profile if available locally first
    let existingProfile = null
    try {
      const local = localStorage.getItem(`user_profile_${user.uid}`)
      if (local) existingProfile = JSON.parse(local)
    } catch {
      // ignore
    }

    if (!existingProfile && db) {
      try {
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore timeout')), 2500))
        const userDoc = await Promise.race([
          getDoc(doc(db, 'users', user.uid)),
          timeoutPromise
        ])
        if (userDoc?.exists()) {
          existingProfile = userDoc.data()
        }
      } catch (e) {
        console.warn('Firestore profile check note (proceeding with local profile):', e?.message || e)
      }
    }

    const emailIsAdmin = user.email?.toLowerCase().includes('admin')
    const determinedRole = existingProfile?.role || (emailIsAdmin ? 'Security Admin' : 'Student')
    const campusId = existingProfile?.campusId || (determinedRole.includes('Admin') ? `ADM-${user.uid.slice(0, 5).toUpperCase()}` : `STU-${user.uid.slice(0, 5).toUpperCase()}`)
    const vehicleType = existingProfile?.vehicleType || 'scooty'
    const preferredFloor = existingProfile?.preferredFloor || (vehicleType === 'scooty' ? 'Ground Floor' : 'Basement')
    const defaultPlate = existingProfile?.defaultPlate || (determinedRole.includes('Admin') ? '' : `MH-12-GP-${Math.floor(1000 + Math.random() * 9000)}`)
    const stream = existingProfile?.stream || (determinedRole.includes('Admin') ? 'Campus Administration' : 'Registered Student')
    const phoneNumber = existingProfile?.phoneNumber || ''

    const userProfileData = {
      uid: user.uid,
      displayName: user.displayName || existingProfile?.displayName || (determinedRole.includes('Admin') ? 'Campus Admin' : 'Campus User'),
      email: user.email,
      photoURL: user.photoURL || '',
      role: determinedRole,
      campusId,
      vehicleType,
      preferredFloor,
      defaultPlate,
      stream,
      phoneNumber,
      lastLogin: new Date().toISOString(),
    }

    // Cache locally for offline/fast UI hydration
    try {
      localStorage.setItem(`user_profile_${user.uid}`, JSON.stringify(userProfileData))
    } catch (e) {
      console.warn('Local storage cache warning:', e)
    }

    // Auto-register vehicle in registry list if not present
    if (defaultPlate.trim()) {
      try {
        const savedVehicles = localStorage.getItem('registered_vehicles_list')
        const currentList = savedVehicles ? JSON.parse(savedVehicles) : []
        const newVehicleRecord = {
          id: `REG-2026-${String(currentList.length + 1).padStart(3, '0')}`,
          studentName: userProfileData.displayName,
          rollNumber: campusId,
          stream,
          phoneNumber,
          vehicleNumber: defaultPlate.trim().toUpperCase(),
          vehicleType,
          isEv: false,
          category: userProfileData.role,
          preferredFloor,
          registeredAt: new Date().toISOString().split('T')[0],
          status: 'Active',
          passId: `SMP-${campusId}-01`
        }

        if (!currentList.some(v => v.vehicleNumber === newVehicleRecord.vehicleNumber)) {
          localStorage.setItem('registered_vehicles_list', JSON.stringify([newVehicleRecord, ...currentList]))
        }
      } catch (regErr) {
        console.warn('Auto vehicle registration cache warning (Google Auth):', regErr)
      }
    }

    // Save/update user profile in Firestore safely if db is enabled
    if (db) {
      try {
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore timeout')), 2500))
        await Promise.race([
          setDoc(
            doc(db, 'users', user.uid),
            {
              ...userProfileData,
              lastLogin: serverTimestamp(),
            },
            { merge: true }
          ),
          timeoutPromise
        ])
      } catch (fsErr) {
        console.warn('Firestore user profile sync note (saved locally):', fsErr?.message || fsErr)
      }
    }

    return user
  } catch (error) {
    console.error('Google Sign-In Error:', error)
    throw error
  }
}

/**
 * Register a new user with Email and Password
 * Supports campus metadata (Role, ID, Phone, Vehicle type & plate)
 */
export const registerWithEmail = async ({
  name,
  email,
  password,
  role = 'Student',
  campusId = '',
  phoneNumber = '',
  vehicleType = 'scooty',
  isEv = false,
  defaultPlate = '',
}) => {
  try {
    localStorage.removeItem('demo_user_session')
    const userCredential = await createUserWithEmailAndPassword(auth, email, password)
    const user = userCredential.user

    const isAdmin = role === 'Security Admin' || role === 'Admin' || email.toLowerCase().includes('admin')
    const finalRole = isAdmin ? 'Security Admin' : (role || 'Student')
    const finalCampusId = campusId.trim().toUpperCase() ||
      (isAdmin ? `ADM-${user.uid.slice(0, 5).toUpperCase()}` : `STU-${user.uid.slice(0, 5).toUpperCase()}`)
    const finalDisplayName = name.trim() || (isAdmin ? 'Campus Admin' : 'Campus Member')
    const preferredFloor = vehicleType === 'scooty' ? 'Ground Floor' : 'Basement'

    const userProfileData = {
      uid: user.uid,
      displayName: finalDisplayName,
      email: user.email,
      role: finalRole,
      campusId: finalCampusId,
      phoneNumber: phoneNumber || '',
      vehicleType: vehicleType || 'scooty',
      isEv: Boolean(isEv),
      defaultPlate: defaultPlate || (isAdmin ? '' : 'MH-12-AP-2026'),
      preferredFloor,
      stream: isAdmin ? 'Campus Administration' : (finalRole === 'Student' ? 'Registered Student' : `${finalRole} Member`),
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
    }

    // 1. Immediately cache locally to eliminate race condition with onAuthStateChanged
    try {
      localStorage.setItem(`user_profile_${user.uid}`, JSON.stringify(userProfileData))
    } catch (e) {
      console.warn('Local storage cache error:', e)
    }

    // 2. Update display name in Firebase Auth
    if (finalDisplayName) {
      try {
        await updateProfile(user, {
          displayName: finalDisplayName,
        })
      } catch (upErr) {
        console.warn('updateProfile warning:', upErr)
      }
    }

    // 3. If vehicle plate is provided and role is student, auto-register vehicle into registry list
    if (userProfileData.defaultPlate.trim() && !isAdmin) {
      try {
        const savedVehicles = localStorage.getItem('registered_vehicles_list')
        const currentList = savedVehicles ? JSON.parse(savedVehicles) : []
        const newVehicleRecord = {
          id: `REG-2026-${String(currentList.length + 1).padStart(3, '0')}`,
          studentName: finalDisplayName,
          rollNumber: finalCampusId,
          stream: userProfileData.stream,
          phoneNumber: phoneNumber.trim(),
          vehicleNumber: userProfileData.defaultPlate.trim().toUpperCase(),
          vehicleType: vehicleType || 'scooty',
          isEv: Boolean(isEv),
          category: finalRole,
          preferredFloor,
          registeredAt: new Date().toISOString().split('T')[0],
          status: 'Active',
          passId: `SMP-${finalCampusId}-${String(currentList.length + 1).padStart(2, '0')}`
        }

        // Avoid duplicate vehicle plate
        if (!currentList.some(v => v.vehicleNumber === newVehicleRecord.vehicleNumber)) {
          localStorage.setItem('registered_vehicles_list', JSON.stringify([newVehicleRecord, ...currentList]))
        }
      } catch (regErr) {
        console.warn('Auto vehicle registration cache warning:', regErr)
      }
    }

    // 4. Sync to Firestore safely if db is enabled
    if (db) {
      try {
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore timeout')), 2500))
        await Promise.race([
          setDoc(doc(db, 'users', user.uid), {
            ...userProfileData,
            createdAt: serverTimestamp(),
            lastLogin: serverTimestamp(),
          }, { merge: true }),
          timeoutPromise
        ])
      } catch (fsErr) {
        console.warn('Firestore profile sync note (profile saved locally):', fsErr?.message || fsErr)
      }
    }

    return user
  } catch (error) {
    console.error('Email Registration Error:', error)
    throw error
  }
}

/**
 * Sign in using existing Email and Password
 */
export const loginWithEmail = async (email, password) => {
  try {
    localStorage.removeItem('demo_user_session')
    const userCredential = await signInWithEmailAndPassword(auth, email, password)
    return userCredential.user
  } catch (error) {
    console.error('Email Sign-In Error:', error)
    throw error
  }
}

/**
 * Send password reset email
 */
export const resetPassword = async (email) => {
  try {
    await sendPasswordResetEmail(auth, email)
  } catch (error) {
    console.error('Password Reset Error:', error)
    throw error
  }
}

/**
 * Retrieve user custom profile (role, campusId, plate, phone) from Firestore or Local Cache
 */
export const getUserProfile = async (uid) => {
  if (!uid) return null

  // Check local cache first
  try {
    const local = localStorage.getItem(`user_profile_${uid}`)
    if (local) {
      return JSON.parse(local)
    }
  } catch {
    // Ignore cache error
  }

  // Check Firestore safely if db is enabled
  if (db) {
    try {
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore timeout')), 2500))
      const userDoc = await Promise.race([
        getDoc(doc(db, 'users', uid)),
        timeoutPromise
      ])
      if (userDoc?.exists()) {
        const data = userDoc.data()
        try {
          localStorage.setItem(`user_profile_${uid}`, JSON.stringify(data))
        } catch {
          // ignore
        }
        return data
      }
    } catch (err) {
      console.warn('Firestore profile read note (using fallback/local state):', err?.message || err)
    }
  }

  return null
}

/**
 * Sign out current user
 */
export const logout = async () => {
  try {
    localStorage.removeItem('demo_user_session')
    await signOut(auth)
  } catch (error) {
    console.error('Logout Error:', error)
    // Even if Firebase signOut throws, ensure local session is cleared
    localStorage.removeItem('demo_user_session')
    throw error
  }
}