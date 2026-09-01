import { useState, useEffect } from 'react'
import { LogOutIcon, PlusCircleIcon } from './Icons'
import { logout } from '../firebase/auth'

export default function Navbar({
  user,
  userProfile,
  onLogout,
  activeTab,
  setActiveTab,
  onOpenQuickPark
}) {
  const [time, setTime] = useState(new Date())
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
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

  const displayName = userProfile?.displayName || user?.displayName || 'Campus Member'
  const displayRole = userProfile?.role || 'Student'

  return (
    <header className="site-navbar">
      <div className="navbar-inner">
        {/* Left: Brand Identity */}
        <div className="nav-brand" onClick={() => setActiveTab('dashboard')}>
          <div className="nav-logo-icon">P</div>
          <div className="nav-brand-text">
            <h1 className="nav-title">
              SmartPark<span className="accent">.</span>College
            </h1>
            <span className="nav-sub">Smart Parking System</span>
          </div>
        </div>

        {/* Center: Clean 3-Tab Navigation */}
        <nav className="nav-menu">
          <button
            type="button"
            className={`nav-link ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <span className="nav-icon">📊</span>
            <span>Dashboard</span>
          </button>

          <button
            type="button"
            className={`nav-link ${activeTab === 'map' ? 'active' : ''}`}
            onClick={() => setActiveTab('map')}
          >
            <span className="nav-icon">🅿️</span>
            <span>Parking Layout</span>
          </button>

          <button
            type="button"
            className={`nav-link ${activeTab === 'timer' ? 'active' : ''}`}
            onClick={() => setActiveTab('timer')}
          >
            <span className="nav-icon">⏱️</span>
            <span>Live Parking</span>
          </button>
        </nav>

        {/* Right: Quick Action, Clock, Profile & Explicit Sign Out */}
        <div className="nav-actions">
          {/* Quick Park / Reserve Action */}
          {onOpenQuickPark && (
            <button
              type="button"
              className="quick-park-btn"
              onClick={onOpenQuickPark}
              title="Park or Reserve a Slot"
            >
              <PlusCircleIcon className="w-4 h-4" />
              <span>Park Vehicle</span>
            </button>
          )}

          {/* Live Campus Clock */}
          <div className="nav-clock hide-mobile">
            <span className="clock-time">
              {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>

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
            <span>{isLoggingOut ? 'Signing Out...' : 'Sign Out'}</span>
          </button>
        </div>
      </div>
    </header>
  )
}
