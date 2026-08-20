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
  CarIcon,
  CheckIcon,
  AlertCircleIcon,
  UserPlusIcon,
} from '../components/Icons'
import './Login.css'

function Login() {
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
        return 'Google sign-in popup was blocked by your browser. Please allow popups.'
      case 'auth/operation-not-allowed':
        return 'This sign-in method is currently disabled in the Firebase Console. Please enable it under Authentication > Sign-in method.'
      case 'auth/network-request-failed':
        return 'Network connection error. Please check your internet connection.'
      default:
        return err?.message || 'An unexpected error occurred. Please try again.'
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
      setError('Please provide your Full Name.')
      return
    }

    if (!regEmail.trim()) {
      setError('Please provide your Email Address.')
      return
    }

    if (!regPassword) {
      setError('Please choose a password.')
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
        defaultPlate: regPlate.trim().toUpperCase(),
      })
      // User is automatically logged in upon successful creation in Firebase Auth
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

  return (
    <div className="login-page">
      <div className="login-card">
        {/* Brand Header */}
        <div className="login-brand">
          <div className="login-logo">
            <span className="login-logo-icon">P</span>
          </div>
          <h1>SmartPark<span className="accent-dot">.</span>Campus</h1>
          <p className="login-subtitle">IoT College Parking Management & Gate Automation</p>
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
                  <h2>Welcome Back</h2>
                  <p className="login-description">
                    Sign in to reserve slots, monitor telemetry and view digital parking passes.
                  </p>
                </div>

                <form onSubmit={handleEmailLogin} className="auth-form">
                  <div className="auth-input-group">
                    <label htmlFor="login-email">Campus Email</label>
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

                <div className="auth-or-divider">
                  <span>OR CONTINUE WITH</span>
                </div>

                <button
                  type="button"
                  className="google-login-button"
                  onClick={handleGoogleLogin}
                  disabled={loading}
                >
                  <span className="google-icon">G</span>
                  <span>{loading ? 'Connecting...' : 'Continue with Google'}</span>
                </button>

                <div className="auth-switch-prompt">
                  <span>New to SmartPark Campus? </span>
                  <button
                    type="button"
                    className="auth-inline-link"
                    onClick={() => {
                      setActiveTab('register')
                      setError('')
                    }}
                  >
                    Create an account
                  </button>
                </div>
              </div>
            )}

            {/* REGISTER / CREATE ACCOUNT TAB CONTENT */}
            {activeTab === 'register' && (
              <div className="tab-fade-enter">
                <div className="section-title-wrap">
                  <h2>Register User Account</h2>
                  <p className="login-description">
                    Create your profile for campus parking access and automatic barrier permits.
                  </p>
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
                        placeholder="e.g. Aryan Sharma"
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                        required
                        disabled={loading}
                      />
                    </div>
                  </div>

                  {/* Campus Role & Roll / Campus ID */}
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
                      <label htmlFor="reg-campus-id">Campus / Roll ID</label>
                      <div className="input-with-icon">
                        <IdCardIcon className="input-icon" />
                        <input
                          id="reg-campus-id"
                          type="text"
                          placeholder="e.g. CS21B04"
                          value={regCampusId}
                          onChange={(e) => setRegCampusId(e.target.value)}
                          className="uppercase-input"
                          disabled={loading}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Email & License Plate */}
                  <div className="auth-form-row">
                    <div className="auth-input-group flex-1">
                      <label htmlFor="reg-email">Email Address *</label>
                      <div className="input-with-icon">
                        <MailIcon className="input-icon" />
                        <input
                          id="reg-email"
                          type="email"
                          placeholder="aryan@college.edu"
                          value={regEmail}
                          onChange={(e) => setRegEmail(e.target.value)}
                          required
                          disabled={loading}
                        />
                      </div>
                    </div>

                    <div className="auth-input-group flex-1">
                      <label htmlFor="reg-plate">Vehicle Plate (Optional)</label>
                      <div className="input-with-icon">
                        <CarIcon className="input-icon" />
                        <input
                          id="reg-plate"
                          type="text"
                          placeholder="KA-05-AB-1234"
                          value={regPlate}
                          onChange={(e) => setRegPlate(e.target.value)}
                          className="uppercase-input"
                          disabled={loading}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Password & Confirm Password */}
                  <div className="auth-form-row">
                    <div className="auth-input-group flex-1">
                      <label htmlFor="reg-password">Password *</label>
                      <div className="input-with-icon">
                        <LockIcon className="input-icon" />
                        <input
                          id="reg-password"
                          type={showRegPassword ? 'text' : 'password'}
                          placeholder="Min 6 chars"
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
                          placeholder="Re-type password"
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

                <div className="auth-or-divider">
                  <span>OR QUICK REGISTER</span>
                </div>

                <button
                  type="button"
                  className="google-login-button"
                  onClick={handleGoogleLogin}
                  disabled={loading}
                >
                  <span className="google-icon">G</span>
                  <span>{loading ? 'Connecting...' : 'Continue with Google'}</span>
                </button>

                <div className="auth-switch-prompt">
                  <span>Already have an account? </span>
                  <button
                    type="button"
                    className="auth-inline-link"
                    onClick={() => {
                      setActiveTab('login')
                      setError('')
                    }}
                  >
                    Sign In instead
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        <p className="login-footer">
          Authorized Campus Access Only &bull; CSE IoT Mini Project
        </p>
      </div>
    </div>
  )
}

export default Login