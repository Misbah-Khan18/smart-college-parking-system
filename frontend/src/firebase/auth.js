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

/**
 * Sign in using Google OAuth Popup
 */
export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider)
    const user = result.user

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
 * Supports campus metadata (Role, ID, License plate)
 */
export const registerWithEmail = async ({
  name,
  email,
  password,
  role = 'Student',
  campusId = '',
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

    const userProfileData = {
      uid: user.uid,
      displayName: name || 'Campus Member',
      email: user.email,
      role: role || 'Student',
      campusId: campusId || '',
      defaultPlate: defaultPlate || '',
      createdAt: serverTimestamp(),
      lastLogin: serverTimestamp(),
    }

    // Cache locally for offline/fast UI hydration
    try {
      localStorage.setItem(`user_profile_${user.uid}`, JSON.stringify(userProfileData))
    } catch (e) {
      console.warn('Local storage cache error:', e)
    }

    // Sync to Firestore
    try {
      await setDoc(doc(db, 'users', user.uid), userProfileData, { merge: true })
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
 * Retrieve user custom profile (role, campusId, plate) from Firestore or Local Cache
 */
export const getUserProfile = async (uid) => {
  if (!uid) return null

  // Check local cache first
  try {
    const local = localStorage.getItem(`user_profile_${uid}`)
    if (local) {
      const parsed = JSON.parse(local)
      return parsed
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
    await signOut(auth)
  } catch (error) {
    console.error('Logout Error:', error)
    throw error
  }
}