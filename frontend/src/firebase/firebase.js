import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const env = (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env : (typeof process !== 'undefined' && process.env ? process.env : {})

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || 'AIzaSyPlaceholderKeyForTesting',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || 'placeholder-project.firebaseapp.com',
  projectId: env.VITE_FIREBASE_PROJECT_ID || 'placeholder-project',
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || 'placeholder-project.appspot.com',
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || '1234567890',
  appId: env.VITE_FIREBASE_APP_ID || '1:1234567890:web:abcdef123456',
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID || 'G-ABCDEF1234',
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db = (env.VITE_ENABLE_FIRESTORE === 'false') ? null : getFirestore(app)

export default app