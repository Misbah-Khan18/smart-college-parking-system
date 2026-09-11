import { useState, useEffect } from 'react'
import { LogOutIcon } from './Icons'
import { logout } from '../firebase/auth'

export default function Navbar({
  user,
  userProfile,
  onLogout,
  activeTab,
  setActiveTab
}) {
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Close mobile menu on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setMobileMenuOpen(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleLogout = async () => {
    if (isLoggingOut) return
    setIsLoggingOut(true)
    try {
      if (onLogout) {
        await onLogout()
      } else {
        await logout()
      }
    } catch (err) {
      console.error('Logout error:', err)
      setIsLoggingOut(false)
    }
  }

  const handleTabClick = (tab) => {
    setActiveTab(tab)
    setMobileMenuOpen(false)
  }

  const displayName = userProfile?.displayName || user?.displayName || 'Campus Member'
  const displayRole = userProfile?.role || 'Student'
  const isAdmin =
    userProfile?.role === 'Security Admin' ||
    userProfile?.role === 'Admin' ||
    user?.email?.includes('admin') ||
    user?.role === 'Security Admin' ||
    user?.role === 'Admin'

  return (
    <header className="site-navbar">
      <div className="navbar-inner">
        {/* Left: Brand Identity */}
        {isAdmin ? (
          <div className="nav-brand" onClick={() => handleTabClick('admin-dashboard')}>
            <div className="nav-logo-icon">P</div>
            <div className="nav-brand-text">
              <h1 className="nav-title soc-brand-animated">
                School of Commerce<span className="accent">.</span>Park
              </h1>
              <span className="nav-sub">Admin Management Console</span>
            </div>
          </div>
        ) : (
          <div className="nav-brand" onClick={() => handleTabClick('student-dashboard')}>
            <div className="nav-logo-icon">P</div>
            <div className="nav-brand-text">
              <h1 className="nav-title soc-brand-animated">
                School of Commerce<span className="accent">.</span>Park
              </h1>
              <span className="nav-sub">Student Portal</span>
            </div>
          </div>
        )}

        {/* Center: Dynamic Role-Based Navigation */}
        <nav className={`nav-menu ${mobileMenuOpen ? 'mobile-open' : ''}`}>
          {isAdmin ? (
            /* ADMIN SIDE — 7 PAGES */
            <>
              <button
                type="button"
                className={`nav-link ${activeTab === 'home' || activeTab === 'admin-dashboard' ? 'active' : ''}`}
                onClick={() => handleTabClick('admin-dashboard')}
              >
                <span className="nav-icon">📊</span>
                <span>Admin Dashboard</span>
              </button>

              <button
                type="button"
                className={`nav-link ${activeTab === 'map' ? 'active' : ''}`}
                onClick={() => handleTabClick('map')}
              >
                <span className="nav-icon">🅿️</span>
                <span>Parking Map</span>
              </button>

              <button
                type="button"
                className={`nav-link ${activeTab === 'register' ? 'active' : ''}`}
                onClick={() => handleTabClick('register')}
              >
                <span className="nav-icon">📋</span>
                <span>Student &amp; Vehicle Registration</span>
              </button>

              <button
                type="button"
                className={`nav-link ${activeTab === 'vehicle-entry' ? 'active' : ''}`}
                onClick={() => handleTabClick('vehicle-entry')}
              >
                <span className="nav-icon">🚗</span>
                <span>Vehicle Entry</span>
              </button>

              <button
                type="button"
                className={`nav-link ${activeTab === 'vehicle-exit' ? 'active' : ''}`}
                onClick={() => handleTabClick('vehicle-exit')}
              >
                <span className="nav-icon">🛑</span>
                <span>Vehicle Exit</span>
              </button>

              <button
                type="button"
                className={`nav-link ${activeTab === 'reports-history' ? 'active' : ''}`}
                onClick={() => handleTabClick('reports-history')}
              >
                <span className="nav-icon">📜</span>
                <span>Reports &amp; Parking History</span>
              </button>

              <button
                type="button"
                className={`nav-link ${activeTab === 'wrong-parking' ? 'active' : ''}`}
                onClick={() => handleTabClick('wrong-parking')}
              >
                <span className="nav-icon">⚠️</span>
                <span>Wrong Parking Management</span>
              </button>

              <button
                type="button"
                className={`nav-link ${activeTab === 'gate-scanner' ? 'active' : ''}`}
                onClick={() => handleTabClick('gate-scanner')}
              >
                <span className="nav-icon">🛡️</span>
                <span>Gate QR Scanner</span>
              </button>
            </>
          ) : (
            /* STUDENT SIDE — 5 PAGES */
            <>
              <button
                type="button"
                className={`nav-link ${activeTab === 'home' || activeTab === 'student-dashboard' ? 'active' : ''}`}
                onClick={() => handleTabClick('student-dashboard')}
              >
                <span className="nav-icon">🏠</span>
                <span>Student Dashboard</span>
              </button>

              <button
                type="button"
                className={`nav-link ${activeTab === 'student-available-parking' ? 'active' : ''}`}
                onClick={() => handleTabClick('student-available-parking')}
              >
                <span className="nav-icon">🅿️</span>
                <span>Available Parking</span>
              </button>

              <button
                type="button"
                className={`nav-link ${activeTab === 'student-my-vehicle' ? 'active' : ''}`}
                onClick={() => handleTabClick('student-my-vehicle')}
              >
                <span className="nav-icon">🛵</span>
                <span>My Vehicle</span>
              </button>

              <button
                type="button"
                className={`nav-link ${activeTab === 'student-my-status' ? 'active' : ''}`}
                onClick={() => handleTabClick('student-my-status')}
              >
                <span className="nav-icon">📍</span>
                <span>My Parking Status</span>
              </button>

              <button
                type="button"
                className={`nav-link ${activeTab === 'student-my-history' ? 'active' : ''}`}
                onClick={() => handleTabClick('student-my-history')}
              >
                <span className="nav-icon">📜</span>
                <span>My Parking History/Profile</span>
              </button>
            </>
          )}
        </nav>

        {/* Right: Profile & Explicit Sign Out & Mobile Toggle */}
        <div className="nav-actions">
          {/* User Profile Info */}
          <div className="user-profile-chip hide-mobile">
            <div className="user-avatar">
              {displayName.slice(0, 2).toUpperCase()}
            </div>
            <div className="user-details">
              <span className="user-name">{displayName}</span>
              <span className="user-role">{displayRole}</span>
            </div>
          </div>

          {/* Prominent Sign Out Button */}
          <button
            type="button"
            className="sign-out-btn"
            onClick={handleLogout}
            disabled={isLoggingOut}
            title="Sign Out of Session"
            aria-label="Sign Out"
          >
            <LogOutIcon className="w-4 h-4" />
            <span className="sign-out-text">{isLoggingOut ? 'Signing Out...' : 'Sign Out'}</span>
          </button>

          {/* Mobile Hamburger Menu Toggle Button */}
          <button
            type="button"
            className="mobile-nav-toggle"
            onClick={() => setMobileMenuOpen(prev => !prev)}
            aria-label={mobileMenuOpen ? 'Close Navigation Menu' : 'Open Navigation Menu'}
            aria-expanded={mobileMenuOpen}
          >
            <span className="mobile-nav-icon">{mobileMenuOpen ? '✕' : '☰'}</span>
          </button>
        </div>
      </div>
    </header>
  )
}
