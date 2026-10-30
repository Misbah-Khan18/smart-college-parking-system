import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const env = (typeof import.meta !== 'undefined' && import.meta?.env) ? import.meta.env : (typeof process !== 'undefined' && process?.env ? process.env : {})

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || 'mock-api-key',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || 'mock-app.firebaseapp.com',
  projectId: env.VITE_FIREBASE_PROJECT_ID || 'mock-app',
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || 'mock-app.appspot.com',
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || '123456789',
  appId: env.VITE_FIREBASE_APP_ID || '1:123456789:web:abcdef',
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db = env.VITE_ENABLE_FIRESTORE === 'false' ? null : getFirestore(app)

export default app 