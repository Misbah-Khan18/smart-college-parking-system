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
    const result = await signInWithPopup(auth, googleProvider)
    const user = result.user

    const userProfileData = {
      uid: user.uid,
      displayName: user.displayName || 'Campus User',
      email: user.email,
      photoURL: user.photoURL || '',
      role: 'Student',
      lastLogin: new Date().toISOString(),
    }

    // Cache locally for offline/fast UI hydration
    try {
      const existing = localStorage.getItem(`user_profile_${user.uid}`)
      if (!existing) {
        localStorage.setItem(`user_profile_${user.uid}`, JSON.stringify(userProfileData))
      }
    } catch (e) {
      console.warn('Local storage cache warning:', e)
    }

    // Save/update user profile in Firestore
    try {
      await setDoc(
        doc(db, 'users', user.uid),
        {
          uid: user.uid,
          displayName: user.displayName || 'Campus User',
          email: user.email,
          photoURL: user.photoURL || '',
          lastLogin: serverTimestamp(),
        },
        { merge: true }
      )
    } catch (fsErr) {
      console.warn('Firestore user profile sync warning (Google Auth):', fsErr)
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
    const userCredential = await createUserWithEmailAndPassword(auth, email, password)
    const user = userCredential.user

    // Update display name in Firebase Auth
    if (name) {
      await updateProfile(user, {
        displayName: name,
      })
    }

    const preferredFloor = vehicleType === 'scooty' ? 'Ground Floor' : 'Basement'

    const userProfileData = {
      uid: user.uid,
      displayName: name || 'Campus Member',
      email: user.email,
      role: role || 'Student',
      campusId: campusId || '',
      phoneNumber: phoneNumber || '',
      vehicleType: vehicleType || 'scooty',
      isEv: Boolean(isEv),
      defaultPlate: defaultPlate || '',
      preferredFloor,
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
    }

    // Cache locally for offline/fast UI hydration
    try {
      localStorage.setItem(`user_profile_${user.uid}`, JSON.stringify(userProfileData))
      localStorage.setItem('demo_user_session', JSON.stringify(userProfileData))
    } catch (e) {
      console.warn('Local storage cache error:', e)
    }

    // If vehicle plate is provided, auto-register vehicle into registry list
    if (defaultPlate.trim()) {
      try {
        const savedVehicles = localStorage.getItem('registered_vehicles_list')
        const currentList = savedVehicles ? JSON.parse(savedVehicles) : []
        const newVehicleRecord = {
          id: `REG-2026-${String(currentList.length + 1).padStart(3, '0')}`,
          studentName: name.trim(),
          rollNumber: campusId.trim().toUpperCase() || `ID-${user.uid.slice(0, 6).toUpperCase()}`,
          stream: role === 'Student' ? 'Registered Student' : `${role} Member`,
          phoneNumber: phoneNumber.trim(),
          vehicleNumber: defaultPlate.trim().toUpperCase(),
          vehicleType: vehicleType || 'scooty',
          isEv: Boolean(isEv),
          category: role || 'Student',
          preferredFloor,
          registeredAt: new Date().toISOString().split('T')[0],
          status: 'Active',
          passId: `SMP-${campusId.trim().toUpperCase() || 'PASS'}-${String(currentList.length + 1).padStart(2, '0')}`
        }

        // Avoid duplicate vehicle plate
        if (!currentList.some(v => v.vehicleNumber === newVehicleRecord.vehicleNumber)) {
          localStorage.setItem('registered_vehicles_list', JSON.stringify([newVehicleRecord, ...currentList]))
        }
      } catch (regErr) {
        console.warn('Auto vehicle registration cache warning:', regErr)
      }
    }

    // Sync to Firestore
    try {
      await setDoc(doc(db, 'users', user.uid), {
        ...userProfileData,
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp(),
      }, { merge: true })
    } catch (fsErr) {
      console.warn('Firestore profile save warning:', fsErr)
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

  // Check Firestore
  try {
    const userDoc = await getDoc(doc(db, 'users', uid))
    if (userDoc.exists()) {
      const data = userDoc.data()
      localStorage.setItem(`user_profile_${uid}`, JSON.stringify(data))
      return data
    }
  } catch (err) {
    console.warn('Could not fetch user profile from Firestore:', err)
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