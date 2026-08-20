import React, { useState, useEffect } from 'react'
import { LogOutIcon } from './Icons'
import { logout } from '../firebase/auth'

export default function Navbar({
  user,
  userProfile,
  onLogout,
  activeTab,
  setActiveTab,
  currentRole,
}) {
  const [time, setTime] = useState(new Date())
  const [imgError, setImgError] = useState(false)

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    setImgError(false)
  }, [user?.photoURL])

  const handleLogout = async () => {
    try {
      if (onLogout) {
        await onLogout()
      } else {
        await logout()
      }
    } catch (err) {
      console.error('Failed to logout:', err)
    }
  }

  const getInitials = () => {
    if (user?.displayName) {
      const parts = user.displayName.trim().split(/\s+/)
      if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      }
      return user.displayName.slice(0, 2).toUpperCase()
    }
    if (user?.email) {
      return user.email.slice(0, 2).toUpperCase()
    }
    return 'CP'
  }

  const displayRole = userProfile?.role || currentRole || 'Student'

  return (
    <header className="navbar-container">
      {/* Left: Brand Logo */}
      <div className="navbar-left">
        <div className="brand-logo">
          <div className="logo-icon-wrap">
            <span className="logo-p-badge">P</span>
          </div>
          <div className="brand-info">
            <h1 className="brand-title">SmartPark<span className="accent-dot">.</span>Campus</h1>
            <span className="brand-subtitle">Smart Parking System</span>
          </div>
        </div>
      </div>

      {/* Center: Clean Navigation Tabs */}
      <nav className="nav-tabs">
        <button
          type="button"
          className={`nav-tab-btn ${activeTab === 'map' ? 'active' : ''}`}
          onClick={() => setActiveTab('map')}
        >
          Parking Map
        </button>
        <button
          type="button"
          className={`nav-tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          Live Analytics
        </button>
        <button
          type="button"
          className={`nav-tab-btn ${activeTab === 'gate' ? 'active' : ''}`}
          onClick={() => setActiveTab('gate')}
        >
          Gate Terminal
        </button>
        <button
          type="button"
          className={`nav-tab-btn ${activeTab === 'logs' ? 'active' : ''}`}
          onClick={() => setActiveTab('logs')}
        >
          Activity Log
        </button>
      </nav>

      {/* Right: Live Clock, User Profile & Sign Out */}
      <div className="navbar-right">
        {/* Live Timing Clock */}
        <div className="live-clock">
          <span className="clock-time">
            {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
          <span className="clock-date">
            {time.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
          </span>
        </div>

        {user && (
          <div className="user-profile-badge">
            <div className="user-avatar-wrap">
              {user.photoURL && !imgError ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'User Profile'}
                  className="user-avatar-img"
                  referrerPolicy="no-referrer"
                  onError={() => setImgError(true)}
                />
              ) : (
                <div className="user-avatar-fallback">
                  {getInitials()}
                </div>
              )}
            </div>

            <div className="user-info-stack">
              <div className="user-name-row">
                <span className="user-name" title={user.displayName || 'Campus User'}>
                  {user.displayName || 'Campus User'}
                </span>
                <span className="user-role-pill">{displayRole}</span>
              </div>
              <span className="user-email" title={user.email || ''}>
                {user.email || ''}
              </span>
            </div>

            <button
              type="button"
              className="user-logout-btn"
              onClick={handleLogout}
              title="Sign out"
              aria-label="Sign out"
            >
              <LogOutIcon className="w-4 h-4 logout-icon" />
              <span className="logout-btn-text">Sign Out</span>
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
