
import { useState } from 'react'
import { signInWithGoogle } from '../firebase/auth'
import './Login.css'

function Login() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleGoogleLogin = async () => {
    setLoading(true)
    setError('')

    try {
      await signInWithGoogle()
    } catch (error) {
      console.error('Google Sign-In Error:', error)

      if (error.code === 'auth/popup-closed-by-user') {
        setError('Google sign-in was cancelled.')
      } else if (error.code === 'auth/popup-blocked') {
        setError('Please allow popups for this website and try again.')
      } else {
        setError('Unable to sign in with Google. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">

        <div className="login-logo">
          <span className="login-logo-icon">P</span>
        </div>

        <h1>SmartPark.Campus</h1>

        <p className="login-subtitle">
          IoT College Parking Management
        </p>

        <div className="login-divider" />

        <h2>Welcome Back</h2>

        <p className="login-description">
          Sign in to access your smart campus parking dashboard.
        </p>

        <button
          className="google-login-button"
          onClick={handleGoogleLogin}
          disabled={loading}
        >
          <span className="google-icon">G</span>

          <span>
            {loading ? 'Signing in...' : 'Continue with Google'}
          </span>
        </button>

        {error && (
          <div className="login-error">
            {error}
          </div>
        )}

        <p className="login-footer">
          Secure access for authorized campus users
        </p>

      </div>
    </div>
  )
}

export default Login