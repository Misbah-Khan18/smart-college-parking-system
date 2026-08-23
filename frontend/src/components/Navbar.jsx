import { useState, useEffect } from 'react'
import { LogOutIcon, BellIcon, RefreshCwIcon } from './Icons'
import { logout } from '../firebase/auth'

export default function Navbar({
  user,
  userProfile,
  onLogout,
  activeTab,
  setActiveTab,
  currentRole,
  notifications = [],
  unreadCount = 0,
  onRefresh,
  onClearNotifications
}) {
  const [time, setTime] = useState(new Date())
  const [imgError, setImgError] = useState(false)
  const [showNotifMenu, setShowNotifMenu] = useState(false)
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
      console.error('Failed to logout:', err)
      setIsLoggingOut(false)
    }
  }

  const getInitials = () => {
    const name = userProfile?.displayName || user?.displayName
    if (name) {
      const parts = name.trim().split(/\s+/)
      if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      }
      return name.slice(0, 2).toUpperCase()
    }
    if (user?.email) {
      return user.email.slice(0, 2).toUpperCase()
    }
    return 'CP'
  }

  const displayRole = userProfile?.role || currentRole || 'Student'
  const displayName = userProfile?.displayName || user?.displayName || 'Campus User'
  const displayEmail = userProfile?.email || user?.email || ''

  return (
    <header className="navbar-container">
      {/* Left: Brand Logo & Campus Badge */}
      <div className="navbar-left">
        <div className="brand-logo">
          <div className="logo-icon-wrap">
            <span className="logo-p-badge">P</span>
          </div>
          <div className="brand-info">
            <h1 className="brand-title">
              SmartPark<span className="accent-dot">.</span>Campus
            </h1>
            <span className="brand-subtitle">IoT Parking Management System</span>
          </div>
        </div>

        <div className="location-pill hidden-mobile">
          <span className="live-status-dot"></span>
          <span>Main Campus Central</span>
        </div>
      </div>

      {/* Center: Navigation Tabs */}
      <nav className="nav-tabs">
        <button
          type="button"
          className={`nav-tab-btn ${activeTab === 'map' ? 'active' : ''}`}
          onClick={() => setActiveTab('map')}
        >
          🅿️ Parking Map
        </button>
        <button
          type="button"
          className={`nav-tab-btn ${activeTab === 'registry' ? 'active' : ''}`}
          onClick={() => setActiveTab('registry')}
        >
          📝 Vehicle Registry
        </button>
        <button
          type="button"
          className={`nav-tab-btn ${activeTab === 'gate' ? 'active' : ''}`}
          onClick={() => setActiveTab('gate')}
        >
          🚧 Gate Terminal
        </button>
        <button
          type="button"
          className={`nav-tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          📊 Live Analytics
        </button>
        <button
          type="button"
          className={`nav-tab-btn ${activeTab === 'logs' ? 'active' : ''}`}
          onClick={() => setActiveTab('logs')}
        >
          📜 Activity Log
        </button>
      </nav>

      {/* Right: Live Clock, Telemetry Refresh, Notifications & Profile */}
      <div className="navbar-right">
        {/* Live Timing Clock */}
        <div className="live-clock hidden-mobile">
          <span className="clock-time">
            {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
          <span className="clock-date">
            {time.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
          </span>
        </div>

        {/* Refresh Sensor Data Button */}
        {onRefresh && (
          <button
            type="button"
            className="icon-btn refresh-btn"
            onClick={onRefresh}
            title="Refresh Telemetry Data"
            aria-label="Refresh Telemetry Data"
          >
            <RefreshCwIcon className="w-4 h-4" />
          </button>
        )}

        {/* Notifications Bell & Dropdown */}
        <div className="notifications-wrapper">
          <button
            type="button"
            className="icon-btn notif-toggle-btn"
            onClick={() => setShowNotifMenu(!showNotifMenu)}
            title="Campus Alerts"
            aria-label="Campus Alerts"
          >
            <BellIcon className="w-4 h-4" />
            {unreadCount > 0 && <span className="notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
          </button>

          {showNotifMenu && (
            <div className="notifications-dropdown glass-card">
              <div className="notif-dropdown-header">
                <h4>Recent Parking Events</h4>
                {notifications.length > 0 && onClearNotifications && (
                  <button
                    type="button"
                    className="clear-notif-btn"
                    onClick={() => {
                      onClearNotifications()
                      setShowNotifMenu(false)
                    }}
                  >
                    Clear all
                  </button>
                )}
              </div>
              <div className="notif-dropdown-list">
                {notifications.length === 0 ? (
                  <div className="notif-empty">No new parking events or alerts.</div>
                ) : (
                  notifications.slice(0, 6).map((item, idx) => (
                    <div key={idx} className={`notif-item ${item.type || 'info'}`}>
                      <div className="notif-item-header">
                        <strong>{item.title}</strong>
                        <span className="notif-time">{item.time || 'Just now'}</span>
                      </div>
                      <p>{item.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Profile Badge & Logout */}
        {user && (
          <div className="user-profile-badge">
            <div className="user-avatar-wrap">
              {user.photoURL && !imgError ? (
                <img
                  key={user.photoURL}
                  src={user.photoURL}
                  alt={displayName}
                  className="user-avatar-img"
                  referrerPolicy="no-referrer"
                  onError={() => setImgError(true)}
                />
              ) : (
                <div className="user-avatar-fallback">{getInitials()}</div>
              )}
            </div>

            <div className="user-info-stack hidden-mobile">
              <div className="user-name-row">
                <span className="user-name" title={displayName}>
                  {displayName}
                </span>
                <span className="user-role-pill">{displayRole}</span>
              </div>
              <span className="user-email" title={displayEmail}>
                {displayEmail}
              </span>
            </div>

            <button
              type="button"
              className="user-logout-btn"
              onClick={handleLogout}
              disabled={isLoggingOut}
              title="Sign Out"
              aria-label="Sign Out"
            >
              <LogOutIcon className="w-4 h-4 logout-icon" />
              <span className="logout-btn-text">
                {isLoggingOut ? 'Signing out...' : 'Sign Out'}
              </span>
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
