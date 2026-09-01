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
  IdCardIcon,
  CheckIcon,
  AlertCircleIcon,
  UserPlusIcon,
  ShieldIcon
} from '../components/Icons'
import './Login.css'

export default function Login({ onDemoLogin }) {
  const [activeTab, setActiveTab] = useState('login') // 'login' | 'register'
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  // Login form state
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [showLoginPassword, setShowLoginPassword] = useState(false)

  // Registration form state
  const [regName, setRegName] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regRole, setRegRole] = useState('Student')
  const [regCampusId, setRegCampusId] = useState('')
  const [regPhone, setRegPhone] = useState('')
  const [regVehicleType, setRegVehicleType] = useState('scooty') // 'scooty' | 'bike'
  const [regIsEv, setRegIsEv] = useState(false)
  const [regPlate, setRegPlate] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regConfirmPassword, setRegConfirmPassword] = useState('')
  const [showRegPassword, setShowRegPassword] = useState(false)

  // Forgot password state
  const [resetEmail, setResetEmail] = useState('')

  // Helper to format Firebase auth errors
  const formatAuthError = (err) => {
    const code = err?.code || ''
    switch (code) {
      case 'auth/email-already-in-use':
        return 'An account with this email already exists. Please sign in instead.'
      case 'auth/invalid-email':
        return 'Please enter a valid email address.'
      case 'auth/weak-password':
        return 'Password must be at least 6 characters long.'
      case 'auth/user-not-found':
        return 'No registered account found with this email.'
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return 'Invalid email or password. Please verify and try again.'
      case 'auth/too-many-requests':
        return 'Access temporarily locked due to too many failed attempts. Please try again later.'
      case 'auth/popup-closed-by-user':
        return 'Google sign-in popup was closed before completing.'
      case 'auth/popup-blocked':
        return 'Google sign-in popup was blocked by your browser. Please enable popups.'
      case 'auth/unauthorized-domain':
        return `Domain "${window.location.hostname}" is not authorized in Firebase. Please add "${window.location.hostname}" in Firebase Console > Authentication > Settings > Authorized Domains, or use Quick Demo Access below.`
      case 'auth/operation-not-allowed':
        return 'Google Sign-In is not enabled in your Firebase Console (Authentication > Sign-in method > Google). You can also use 1-Click Quick Demo Access below.'
      case 'auth/network-request-failed':
        return 'Network connection issue. You can use 1-Click Quick Demo Access below.'
      default:
        return err?.message || 'An unexpected error occurred. Please try again or use Quick Demo Access.'
    }
  }

  // Handle Google OAuth
  const handleGoogleLogin = async () => {
    setLoading(true)
    setError('')
    setSuccessMessage('')

    try {
      await signInWithGoogle()
    } catch (err) {
      console.error('Google Sign-In Error:', err)
      setError(formatAuthError(err))
    } finally {
      setLoading(false)
    }
  }

  // Handle Email/Password Login
  const handleEmailLogin = async (e) => {
    e.preventDefault()
    setError('')
    setSuccessMessage('')

    if (!loginEmail.trim() || !loginPassword) {
      setError('Please enter both email and password.')
      return
    }

    setLoading(true)
    try {
      await loginWithEmail(loginEmail.trim(), loginPassword)
    } catch (err) {
      console.error('Email Login Error:', err)
      setError(formatAuthError(err))
    } finally {
      setLoading(false)
    }
  }

  // Handle User Registration
  const handleRegister = async (e) => {
    e.preventDefault()
    setError('')
    setSuccessMessage('')

    if (!regName.trim()) {
      setError('Please enter your full name.')
      return
    }

    if (!regEmail.trim()) {
      setError('Please enter your campus email address.')
      return
    }

    if (!regPassword) {
      setError('Please enter a password.')
      return
    }

    if (regPassword.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    if (regPassword !== regConfirmPassword) {
      setError('Passwords do not match. Please re-enter.')
      return
    }

    setLoading(true)
    try {
      await registerWithEmail({
        name: regName.trim(),
        email: regEmail.trim(),
        password: regPassword,
        role: regRole,
        campusId: regCampusId.trim().toUpperCase(),
        phoneNumber: regPhone.trim(),
        vehicleType: regVehicleType,
        isEv: regIsEv,
        defaultPlate: regPlate.trim().toUpperCase(),
      })
    } catch (err) {
      console.error('Registration Error:', err)
      setError(formatAuthError(err))
    } finally {
      setLoading(false)
    }
  }

  // Handle Password Reset
  const handlePasswordReset = async (e) => {
    e.preventDefault()
    setError('')
    setSuccessMessage('')

    if (!resetEmail.trim()) {
      setError('Please enter your email to receive a password reset link.')
      return
    }

    setLoading(true)
    try {
      await resetPassword(resetEmail.trim())
      setSuccessMessage('Password reset link has been sent to your email. Check your inbox.')
    } catch (err) {
      console.error('Reset Password Error:', err)
      setError(formatAuthError(err))
    } finally {
      setLoading(false)
    }
  }

  // Quick Demo Access Helper
  const triggerDemo = (role) => {
    if (onDemoLogin) {
      const demoUsers = {
        'Security Admin': {
          uid: 'demo-admin-01',
          displayName: 'Officer Vikram Rathore',
          email: 'admin.security@college.edu',
          role: 'Security Admin',
          campusId: 'SEC-889',
          defaultPlate: 'MH-04-SEC-01',
        },
        'Student': {
          uid: 'demo-student-01',
          displayName: 'Ananya Deshmukh',
          email: 'ananya.cs21@college.edu',
          role: 'Student',
          campusId: 'CS21B044',
          defaultPlate: 'MH-04-AB-1234',
        },
        'Faculty': {
          uid: 'demo-faculty-01',
          displayName: 'Dr. Rajesh Kulkarni',
          email: 'dr.kulkarni@college.edu',
          role: 'Faculty',
          campusId: 'FAC-IT-12',
          defaultPlate: 'MH-04-FAC-99',
        }
      }

      onDemoLogin(demoUsers[role] || demoUsers['Student'])
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        {/* Brand Header */}
        <div className="login-brand">
          <div className="module-tag-badge">
            <span>MODULE 1 &bull; SECURE ADMINISTRATOR LOGIN</span>
          </div>
          <div className="login-logo">
            <span className="login-logo-icon">P</span>
          </div>
          <h1>SmartPark<span className="accent-dot">.</span>Campus</h1>
          <p className="login-subtitle">Smart College Parking Management System</p>
        </div>

        {/* Module 1: Admin Google Auth Banner */}
        <div className="admin-auth-notice-card glass-card">
          <div className="notice-icon-box">
            <ShieldIcon className="w-5 h-5 text-cyan" />
          </div>
          <div className="notice-text">
            <strong>Authorized Administrator Access</strong>
            <p>Access the parking management system securely using authorized Google Authentication.</p>
          </div>
        </div>

        {/* Quick Demo Access Bar */}
        <div className="demo-access-banner glass-card">
          <div className="demo-header">
            <ShieldIcon className="w-4 h-4 text-cyan" />
            <span>⚡ 1-Click Authorized Administrator Access (Demo)</span>
          </div>
          <div className="demo-btn-group">
            <button
              type="button"
              className="demo-pill-btn admin font-bold"
              onClick={() => triggerDemo('Security Admin')}
            >
              🛡️ Authorized Security Admin
            </button>
            <button
              type="button"
              className="demo-pill-btn student"
              onClick={() => triggerDemo('Student')}
            >
              🎓 Student (Scooty)
            </button>
            <button
              type="button"
              className="demo-pill-btn faculty"
              onClick={() => triggerDemo('Faculty')}
            >
              👨‍🏫 Professor
            </button>
          </div>
        </div>

        {/* Forgot Password Sub-View */}
        {showForgotPassword ? (
          <div className="auth-subview">
            <div className="subview-header">
              <h2>Reset Password</h2>
              <p className="login-description">
                Enter the email address registered with your campus parking account.
              </p>
            </div>

            <form onSubmit={handlePasswordReset} className="auth-form">
              <div className="auth-input-group">
                <label htmlFor="reset-email">Email Address</label>
                <div className="input-with-icon">
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

              {error && (
                <div className="auth-alert error">
                  <AlertCircleIcon className="alert-icon" />
                  <span>{error}</span>
                </div>
              )}

              {successMessage && (
                <div className="auth-alert success">
                  <CheckIcon className="alert-icon" />
                  <span>{successMessage}</span>
                </div>
              )}

              <button type="submit" className="auth-submit-btn" disabled={loading}>
                {loading ? 'Sending link...' : 'Send Password Reset Email'}
              </button>

              <button
                type="button"
                className="auth-link-btn back-btn"
                onClick={() => {
                  setShowForgotPassword(false)
                  setError('')
                  setSuccessMessage('')
                }}
              >
                &larr; Back to Sign In
              </button>
            </form>
          </div>
        ) : (
          <>
            {/* Auth Mode Tabs */}
            <div className="auth-nav-tabs">
              <button
                type="button"
                className={`auth-tab-pill ${activeTab === 'login' ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab('login')
                  setError('')
                  setSuccessMessage('')
                }}
              >
                Sign In
              </button>
              <button
                type="button"
                className={`auth-tab-pill ${activeTab === 'register' ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab('register')
                  setError('')
                  setSuccessMessage('')
                }}
              >
                <UserPlusIcon className="tab-icon" />
                Register New User
              </button>
            </div>

            {/* Error / Success Notifications */}
            {error && (
              <div className="auth-alert error">
                <AlertCircleIcon className="alert-icon" />
                <span>{error}</span>
              </div>
            )}

            {successMessage && (
              <div className="auth-alert success">
                <CheckIcon className="alert-icon" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* SIGN IN TAB CONTENT */}
            {activeTab === 'login' && (
              <div className="tab-fade-enter">
                <div className="section-title-wrap">
                  <h2>Sign In to SmartPark</h2>
                  <p className="login-description">
                    Access campus parking maps, live bay telemetry, and barrier passes.
                  </p>
                </div>

                {/* Primary Google Sign-In Button */}
                <button
                  type="button"
                  className="google-login-button primary-google-btn"
                  onClick={handleGoogleLogin}
                  disabled={loading}
                >
                  <svg className="google-svg-icon" viewBox="0 0 24 24">
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
                  <span>{loading ? 'Authenticating with Google...' : 'Sign In with Google'}</span>
                </button>

                <div className="auth-or-divider">
                  <span>OR SIGN IN WITH EMAIL</span>
                </div>

                <form onSubmit={handleEmailLogin} className="auth-form">
                  <div className="auth-input-group">
                    <label htmlFor="login-email">Campus Email Address</label>
                    <div className="input-with-icon">
                      <MailIcon className="input-icon" />
                      <input
                        id="login-email"
                        type="email"
                        placeholder="yourname@college.edu"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        required
                        disabled={loading}
                      />
                    </div>
                  </div>

                  <div className="auth-input-group">
                    <div className="label-with-action">
                      <label htmlFor="login-password">Password</label>
                      <button
                        type="button"
                        className="auth-link-subtext"
                        onClick={() => {
                          setResetEmail(loginEmail)
                          setShowForgotPassword(true)
                          setError('')
                        }}
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="input-with-icon">
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
                        className="password-toggle-btn"
                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                        tabIndex="-1"
                        aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
                      >
                        {showLoginPassword ? (
                          <EyeOffIcon className="toggle-icon" />
                        ) : (
                          <EyeIcon className="toggle-icon" />
                        )}
                      </button>
                    </div>
                  </div>

                  <button type="submit" className="auth-submit-btn" disabled={loading}>
                    {loading ? 'Signing in...' : 'Sign In with Email'}
                  </button>
                </form>

                {/* Prominent Register Here Prompt Banner */}
                <div className="register-here-cta-banner">
                  <div className="cta-text">
                    <strong>Don't have a campus account?</strong>
                    <span>Register student details &amp; two-wheeler permit</span>
                  </div>
                  <button
                    type="button"
                    className="btn-register-here-action"
                    onClick={() => {
                      setActiveTab('register')
                      setError('')
                      setSuccessMessage('')
                    }}
                  >
                    📝 Register Here
                  </button>
                </div>
              </div>
            )}

            {/* REGISTER TAB CONTENT */}
            {activeTab === 'register' && (
              <div className="tab-fade-enter">
                <div className="section-title-wrap">
                  <h2>Register Campus Account</h2>
                  <p className="login-description">
                    Create your profile for two-wheeler parking access, barrier passes, and online slot bookings.
                  </p>
                </div>

                {/* Google Quick Sign-Up Button */}
                <button
                  type="button"
                  className="google-login-button register-google-btn"
                  onClick={handleGoogleLogin}
                  disabled={loading}
                >
                  <svg className="google-svg-icon" viewBox="0 0 24 24">
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
                  <span>{loading ? 'Connecting...' : 'Quick Sign Up with Google'}</span>
                </button>

                <div className="auth-or-divider">
                  <span>OR REGISTER WITH DETAILS</span>
                </div>

                <form onSubmit={handleRegister} className="auth-form">
                  {/* Full Name */}
                  <div className="auth-input-group">
                    <label htmlFor="reg-name">Full Name *</label>
                    <div className="input-with-icon">
                      <UserIcon className="input-icon" />
                      <input
                        id="reg-name"
                        type="text"
                        placeholder="e.g. Priya Sharma"
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                        required
                        disabled={loading}
                      />
                    </div>
                  </div>

                  {/* Role & Roll / Campus ID */}
                  <div className="auth-form-row">
                    <div className="auth-input-group flex-1">
                      <label htmlFor="reg-role">Role / Category *</label>
                      <select
                        id="reg-role"
                        className="auth-select"
                        value={regRole}
                        onChange={(e) => setRegRole(e.target.value)}
                        disabled={loading}
                      >
                        <option value="Student">Student</option>
                        <option value="Faculty">Faculty / Professor</option>
                        <option value="Staff">College Staff</option>
                        <option value="Security Admin">Security Admin</option>
                        <option value="Visitor">Visitor</option>
                      </select>
                    </div>

                    <div className="auth-input-group flex-1">
                      <label htmlFor="reg-campus-id">Roll No / Student ID</label>
                      <div className="input-with-icon">
                        <IdCardIcon className="input-icon" />
                        <input
                          id="reg-campus-id"
                          type="text"
                          placeholder="e.g. CS22B044"
                          value={regCampusId}
                          onChange={(e) => setRegCampusId(e.target.value)}
                          className="uppercase-input"
                          disabled={loading}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Email & Phone */}
                  <div className="auth-form-row">
                    <div className="auth-input-group flex-1">
                      <label htmlFor="reg-email">Campus Email Address *</label>
                      <div className="input-with-icon">
                        <MailIcon className="input-icon" />
                        <input
                          id="reg-email"
                          type="email"
                          placeholder="priya@college.edu"
                          value={regEmail}
                          onChange={(e) => setRegEmail(e.target.value)}
                          required
                          disabled={loading}
                        />
                      </div>
                    </div>

                    <div className="auth-input-group flex-1">
                      <label htmlFor="reg-phone">Phone Number</label>
                      <input
                        id="reg-phone"
                        type="tel"
                        placeholder="+91 98765 43210"
                        value={regPhone}
                        onChange={(e) => setRegPhone(e.target.value)}
                        className="form-control"
                        disabled={loading}
                      />
                    </div>
                  </div>

                  {/* Vehicle Type & Engine Power Toggle */}
                  <div className="auth-form-row">
                    <div className="auth-input-group flex-1">
                      <label htmlFor="reg-vehicle-type">Vehicle Type *</label>
                      <select
                        id="reg-vehicle-type"
                        className="auth-select"
                        value={regVehicleType}
                        onChange={(e) => setRegVehicleType(e.target.value)}
                        disabled={loading}
                      >
                        <option value="scooty">🛵 Scooty (Ground Floor Girls' Wing)</option>
                        <option value="bike">🏍️ Bike / Motorcycle (Basement Boys' Wing)</option>
                      </select>
                    </div>

                    <div className="auth-input-group flex-1">
                      <label>Engine Power</label>
                      <div className="reg-fuel-toggle-box">
                        <button
                          type="button"
                          className={`reg-fuel-btn ${!regIsEv ? 'active' : ''}`}
                          onClick={() => setRegIsEv(false)}
                        >
                          ⛽ Petrol
                        </button>
                        <button
                          type="button"
                          className={`reg-fuel-btn ev ${regIsEv ? 'active' : ''}`}
                          onClick={() => setRegIsEv(true)}
                        >
                          ⚡ Electric EV
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Vehicle License Plate Number */}
                  <div className="auth-input-group">
                    <label htmlFor="reg-plate">Vehicle License Plate Number (Optional)</label>
                    <input
                      id="reg-plate"
                      type="text"
                      placeholder="e.g. MH-04-AB-1234"
                      value={regPlate}
                      onChange={(e) => setRegPlate(e.target.value)}
                      className="form-control uppercase-input font-mono font-bold"
                      disabled={loading}
                    />
                  </div>

                  {/* Passwords */}
                  <div className="auth-form-row">
                    <div className="auth-input-group flex-1">
                      <label htmlFor="reg-password">Password *</label>
                      <div className="input-with-icon">
                        <LockIcon className="input-icon" />
                        <input
                          id="reg-password"
                          type={showRegPassword ? 'text' : 'password'}
                          placeholder="Min 6 characters"
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          required
                          disabled={loading}
                        />
                        <button
                          type="button"
                          className="password-toggle-btn"
                          onClick={() => setShowRegPassword(!showRegPassword)}
                          tabIndex="-1"
                          aria-label={showRegPassword ? 'Hide password' : 'Show password'}
                        >
                          {showRegPassword ? (
                            <EyeOffIcon className="toggle-icon" />
                          ) : (
                            <EyeIcon className="toggle-icon" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="auth-input-group flex-1">
                      <label htmlFor="reg-confirm-password">Confirm Password *</label>
                      <div className="input-with-icon">
                        <LockIcon className="input-icon" />
                        <input
                          id="reg-confirm-password"
                          type={showRegPassword ? 'text' : 'password'}
                          placeholder="Re-enter password"
                          value={regConfirmPassword}
                          onChange={(e) => setRegConfirmPassword(e.target.value)}
                          required
                          disabled={loading}
                        />
                      </div>
                    </div>
                  </div>

                  <button type="submit" className="auth-submit-btn register-btn" disabled={loading}>
                    <UserPlusIcon className="btn-icon" />
                    <span>{loading ? 'Creating Account...' : 'Complete Registration & Sign In'}</span>
                  </button>
                </form>

                <div className="auth-switch-prompt">
                  <span>Already have a campus account? </span>
                  <button
                    type="button"
                    className="auth-inline-link"
                    onClick={() => {
                      setActiveTab('login')
                      setError('')
                    }}
                  >
                    Sign In here
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        <p className="login-footer">
          Authorized Campus Access Only &bull; SmartPark Campus IoT System
        </p>
      </div>
    </div>
  )
}