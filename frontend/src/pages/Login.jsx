import { useState } from 'react'
import {
  signInWithGoogle,
  registerWithEmail,
  loginWithEmail,
  resetPassword,
} from '../firebase/auth'
import {
  MailIcon,
  LockIcon,
  EyeIcon,
  EyeOffIcon,
  UserIcon,
  CheckIcon,
  AlertCircleIcon,
  BikeIcon,
  ShieldIcon
} from '../components/Icons'
import './Login.css'

export default function Login({ onDemoLogin }) {
  const [mode, setMode] = useState('login') // 'login' | 'register' | 'forgot'
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Login form state
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [showLoginPassword, setShowLoginPassword] = useState(false)

  // Registration form state
  const [regName, setRegName] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regRole, setRegRole] = useState('Student')
  const [regCampusId, setRegCampusId] = useState('')
  const [regVehicleType, setRegVehicleType] = useState('scooty') // 'scooty' | 'bike'
  const [regPlate, setRegPlate] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [showRegPassword, setShowRegPassword] = useState(false)

  // Forgot password state
  const [resetEmail, setResetEmail] = useState('')

  const formatAuthError = (err) => {
    const code = err?.code || ''
    switch (code) {
      case 'auth/email-already-in-use':
        return 'An account with this email already exists.'
      case 'auth/invalid-email':
        return 'Please enter a valid email address.'
      case 'auth/weak-password':
        return 'Password must be at least 6 characters long.'
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return 'Invalid email or password. Please try again.'
      case 'auth/popup-closed-by-user':
        return 'Google sign-in was cancelled.'
      case 'auth/popup-blocked':
        return 'Popup was blocked by browser. Please allow popups.'
      default:
        return err?.message || 'Authentication failed. You can also use Demo Sign In below.'
    }
  }

  const handleGoogleSignIn = async () => {
    setLoading(true)
    setError('')
    setSuccess('')
    try {
      await signInWithGoogle()
    } catch (err) {
      console.error('Google Sign In Error:', err)
      setError(formatAuthError(err))
    } finally {
      setLoading(false)
    }
  }

  const handleEmailLogin = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    if (!loginEmail.trim() || !loginPassword) {
      setError('Please enter both email and password.')
      return
    }
    setLoading(true)
    try {
      await loginWithEmail(loginEmail.trim(), loginPassword)
    } catch (err) {
      console.error('Login Error:', err)
      setError(formatAuthError(err))
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!regName.trim() || !regEmail.trim() || !regPassword) {
      setError('Please fill in all required fields.')
      return
    }
    if (regPassword.length < 6) {
      setError('Password must be at least 6 characters long.')
      return
    }

    setLoading(true)
    try {
      await registerWithEmail({
        name: regName.trim(),
        email: regEmail.trim(),
        password: regPassword,
        role: regRole,
        campusId: regCampusId.trim().toUpperCase() || `STU-${Math.floor(1000 + Math.random() * 9000)}`,
        vehicleType: regVehicleType,
        isEv: false,
        defaultPlate: regPlate.trim().toUpperCase() || 'MH-12-AP-2026',
      })
      setSuccess('Account created successfully!')
    } catch (err) {
      console.error('Registration Error:', err)
      setError(formatAuthError(err))
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordReset = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    if (!resetEmail.trim()) {
      setError('Please enter your registered email address.')
      return
    }
    setLoading(true)
    try {
      await resetPassword(resetEmail.trim())
      setSuccess('Password reset link sent to your email.')
    } catch (err) {
      setError(formatAuthError(err))
    } finally {
      setLoading(false)
    }
  }

  const handleQuickDemo = (role = 'Student') => {
    if (onDemoLogin) {
      onDemoLogin({
        uid: role === 'Admin' ? 'demo-admin-01' : 'demo-student-01',
        displayName: role === 'Admin' ? 'Campus Admin' : 'Alzuni Shaikh',
        email: role === 'Admin' ? 'admin@college.edu' : 'alzuni.shaikh@college.edu',
        role: role === 'Admin' ? 'Security Admin' : 'Student',
        campusId: role === 'Admin' ? 'ADM-101' : 'S2410701',
        vehicleType: 'scooty',
        defaultPlate: role === 'Admin' ? 'MH-04-AD-001' : 'MH-12-AB-1234',
        stream: 'BCA (Bachelor of Computer Applications)',
        phoneNumber: '+91 98765 43210'
      })
    }
  }

  return (
    <div className="login-container">
      <div className="login-card">
        {/* Brand Header */}
        <div className="login-header">
          <div className="brand-badge">
            <span className="brand-logo-text">P</span>
          </div>
          <h1 className="brand-name soc-brand-animated">
            School of Commerce <span className="accent">Smart Parking</span>
          </h1>
          <p className="brand-sub">Campus Two-Wheeler IoT Parking System</p>
        </div>

        {/* Tab Switcher: Sign In / Register */}
        {mode !== 'forgot' && (
          <div className="tab-switcher">
            <button
              type="button"
              className={`tab-btn ${mode === 'login' ? 'active' : ''}`}
              onClick={() => {
                setMode('login')
                setError('')
                setSuccess('')
              }}
            >
              Sign In
            </button>
            <button
              type="button"
              className={`tab-btn ${mode === 'register' ? 'active' : ''}`}
              onClick={() => {
                setMode('register')
                setError('')
                setSuccess('')
              }}
            >
              Register User
            </button>
          </div>
        )}

        {/* Alerts */}
        {error && (
          <div className="auth-alert error">
            <AlertCircleIcon className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="auth-alert success">
            <CheckIcon className="w-4 h-4 flex-shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Google Sign In Option */}
        {mode !== 'forgot' && (
          <>
            <button
              type="button"
              className="google-btn"
              onClick={handleGoogleSignIn}
              disabled={loading}
            >
              <svg className="google-icon" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{loading ? 'Connecting...' : 'Sign In with Google'}</span>
            </button>

            <div className="auth-divider">
              <span>OR CONTINUE WITH EMAIL</span>
            </div>
          </>
        )}

        {/* 1. SIGN IN FORM */}
        {mode === 'login' && (
          <form onSubmit={handleEmailLogin} className="auth-form">
            <div className="input-group">
              <label htmlFor="login-email">Email Address</label>
              <div className="input-wrapper">
                <MailIcon className="input-icon" />
                <input
                  id="login-email"
                  type="email"
                  placeholder="student@college.edu"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="input-group">
              <div className="label-row">
                <label htmlFor="login-password">Password</label>
                <button
                  type="button"
                  className="link-btn text-xs"
                  onClick={() => {
                    setMode('forgot')
                    setError('')
                    setSuccess('')
                  }}
                >
                  Forgot password?
                </button>
              </div>
              <div className="input-wrapper">
                <LockIcon className="input-icon" />
                <input
                  id="login-password"
                  type={showLoginPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  className="icon-toggle"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  aria-label="Toggle password visibility"
                >
                  {showLoginPassword ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button type="submit" className="submit-btn primary-btn" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        )}

        {/* 2. REGISTER USER FORM */}
        {mode === 'register' && (
          <form onSubmit={handleRegister} className="auth-form">
            <div className="input-group">
              <label htmlFor="reg-name">Full Name</label>
              <div className="input-wrapper">
                <UserIcon className="input-icon" />
                <input
                  id="reg-name"
                  type="text"
                  placeholder="e.g. Rahul Sharma"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="input-group">
              <label htmlFor="reg-email">College Email</label>
              <div className="input-wrapper">
                <MailIcon className="input-icon" />
                <input
                  id="reg-email"
                  type="email"
                  placeholder="name@college.edu"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="form-grid-2">
              <div className="input-group">
                <label>Vehicle Type</label>
                <div className="vehicle-choice-row">
                  <button
                    type="button"
                    className={`vehicle-choice-btn ${regVehicleType === 'scooty' ? 'active' : ''}`}
                    onClick={() => setRegVehicleType('scooty')}
                  >
                    <span>🛵 Scooty</span>
                    <small>Ground Floor</small>
                  </button>
                  <button
                    type="button"
                    className={`vehicle-choice-btn ${regVehicleType === 'bike' ? 'active' : ''}`}
                    onClick={() => setRegVehicleType('bike')}
                  >
                    <span>🏍️ Bike</span>
                    <small>Basement</small>
                  </button>
                </div>
              </div>

              <div className="input-group">
                <label htmlFor="reg-plate">Vehicle Plate (Optional)</label>
                <div className="input-wrapper">
                  <BikeIcon className="input-icon" />
                  <input
                    id="reg-plate"
                    type="text"
                    placeholder="MH-12-AB-1234"
                    value={regPlate}
                    onChange={(e) => setRegPlate(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            <div className="input-group">
              <label htmlFor="reg-password">Create Password</label>
              <div className="input-wrapper">
                <LockIcon className="input-icon" />
                <input
                  id="reg-password"
                  type={showRegPassword ? 'text' : 'password'}
                  placeholder="At least 6 characters"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  className="icon-toggle"
                  onClick={() => setShowRegPassword(!showRegPassword)}
                  aria-label="Toggle password visibility"
                >
                  {showRegPassword ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button type="submit" className="submit-btn primary-btn" disabled={loading}>
              {loading ? 'Creating Account...' : 'Register User'}
            </button>
          </form>
        )}

        {/* 3. FORGOT PASSWORD FORM */}
        {mode === 'forgot' && (
          <form onSubmit={handlePasswordReset} className="auth-form">
            <div className="forgot-header">
              <h3>Reset Password</h3>
              <p>Enter your college email to receive a recovery link.</p>
            </div>

            <div className="input-group">
              <label htmlFor="reset-email">Registered Email</label>
              <div className="input-wrapper">
                <MailIcon className="input-icon" />
                <input
                  id="reset-email"
                  type="email"
                  placeholder="student@college.edu"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <button type="submit" className="submit-btn primary-btn" disabled={loading}>
              {loading ? 'Sending link...' : 'Send Reset Link'}
            </button>

            <button
              type="button"
              className="link-btn back-btn"
              onClick={() => {
                setMode('login')
                setError('')
                setSuccess('')
              }}
            >
              &larr; Back to Sign In
            </button>
          </form>
        )}

        {/* Quick Demo Login Option */}
        <div className="demo-section">
          <div className="demo-divider">
            <span>QUICK PREVIEW ACCESS</span>
          </div>
          <div className="demo-buttons">
            <button
              type="button"
              className="demo-btn student-demo"
              onClick={() => handleQuickDemo('Student')}
            >
              <span>🎓 Student Demo</span>
            </button>
            <button
              type="button"
              className="demo-btn admin-demo"
              onClick={() => handleQuickDemo('Admin')}
            >
              <span>🛡️ Admin Demo</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}