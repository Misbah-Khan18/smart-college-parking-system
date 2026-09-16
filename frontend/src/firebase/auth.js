import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInAnonymously,
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

    // Fetch existing authoritative profile from Firestore if it exists
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid))
      if (userDoc.exists()) {
        const firestoreData = userDoc.data()
        try {
          localStorage.setItem(`user_profile_${user.uid}`, JSON.stringify(firestoreData))
        } catch (e) {
          console.warn('Local storage cache warning:', e)
        }
      }
    } catch (fsCheckErr) {
      console.warn('Firestore user profile lookup warning (Google Auth):', fsCheckErr)
    }

    // Save/update basic user metadata in Firestore WITHOUT overriding or setting a client role
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
      rollNumber: campusId || '',
      phoneNumber: phoneNumber || '',
      vehicleType: vehicleType || 'scooty',
      isEv: Boolean(isEv),
      defaultPlate: defaultPlate || '',
      vehiclePlate: defaultPlate || '',
      vehicleNumber: defaultPlate || '',
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

    // If vehicle plate is provided, auto-register vehicle into Firestore registered_vehicles collection
    if (defaultPlate.trim()) {
      try {
        const cleanPlate = defaultPlate.trim().toUpperCase()
        const cleanRoll = campusId.trim().toUpperCase() || `ID-${user.uid.slice(0, 6).toUpperCase()}`
        const vType = vehicleType || 'scooty'
        const docId = `REG-${user.uid.slice(0, 8).toUpperCase()}`

        await setDoc(doc(db, 'registered_vehicles', docId), {
          id: docId,
          studentId: user.uid,
          studentName: name.trim() || 'Campus Member',
          rollNumber: cleanRoll,
          campusId: cleanRoll,
          stream: role === 'Student' ? 'Registered Student' : `${role} Member`,
          phoneNumber: phoneNumber.trim(),
          vehicleNumber: cleanPlate,
          vehicleType: vType,
          isEv: Boolean(isEv),
          category: role || 'Student',
          preferredFloor,
          registeredAt: new Date().toISOString().split('T')[0],
          status: 'Active',
          passId: `SMP-${cleanRoll}-${Date.now().toString().slice(-4)}`,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        }, { merge: true })
      } catch (regErr) {
        console.warn('Auto vehicle registration Firestore sync warning:', regErr)
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
 * Sign in as Demo Student using Firebase Anonymous Authentication
 * Attaches a real request.auth identity and creates a Student Firestore profile
 */
export const signInDemoStudent = async () => {
  try {
    const cred = await signInAnonymously(auth)
    const user = cred.user

    const userProfileData = {
      uid: user.uid,
      displayName: 'Alzuni Shaikh',
      email: 'alzuni.shaikh@college.edu',
      role: 'Student',
      campusId: 'S2410701',
      rollNumber: 'S2410701',
      vehicleType: 'scooty',
      isEv: false,
      defaultPlate: 'MH-12-AB-1234',
      vehiclePlate: 'MH-12-AB-1234',
      vehicleNumber: 'MH-12-AB-1234',
      stream: 'BCA (Bachelor of Computer Applications)',
      phoneNumber: '+91 98765 43210',
      preferredFloor: 'Ground Floor',
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
    }

    // Cache locally
    try {
      localStorage.setItem(`user_profile_${user.uid}`, JSON.stringify(userProfileData))
      localStorage.setItem('demo_user_session', JSON.stringify(userProfileData))
    } catch (e) {
      console.warn('Local storage cache error:', e)
    }

    // Save profile to Firestore
    try {
      await setDoc(
        doc(db, 'users', user.uid),
        {
          ...userProfileData,
          createdAt: serverTimestamp(),
          lastLogin: serverTimestamp(),
        },
        { merge: true }
      )
    } catch (fsErr) {
      console.warn('Firestore demo student profile save warning:', fsErr)
    }

    return user
  } catch (error) {
    console.error('Demo Student Sign-In Error:', error)
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

  // 1. PRIMARY / AUTHORITATIVE SOURCE: Live Firestore users/{uid}
  try {
    const userDoc = await getDoc(doc(db, 'users', uid))
    if (userDoc.exists()) {
      const data = userDoc.data()
      // Update/refresh local cache with the authoritative Firestore data
      try {
        localStorage.setItem(`user_profile_${uid}`, JSON.stringify(data))
      } catch (cacheErr) {
        console.warn('Could not update user_profile cache in localStorage:', cacheErr)
      }
      return data
    }
  } catch (err) {
    console.warn('Could not fetch user profile from Firestore, attempting offline cache fallback:', err)
    // 2. FALLBACK ONLY ON GENUINE FIRESTORE READ / NETWORK ERROR
    try {
      const local = localStorage.getItem(`user_profile_${uid}`)
      if (local) {
        return JSON.parse(local)
      }
    } catch {
      // Ignore cache error
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