import { useState, useEffect, useRef } from 'react'
import { LogOutIcon } from './Icons'
import { logout } from '../firebase/auth'

const STUDENT_TABS = [
  { id: 'student-dashboard',         icon: '🏠', label: 'Dashboard' },
  { id: 'student-available-parking', icon: '🅿️', label: 'Available' },
  { id: 'student-my-vehicle',        icon: '🛵', label: 'My Vehicle' },
  { id: 'student-my-status',         icon: '📍', label: 'Status' },
  { id: 'student-my-history',        icon: '📜', label: 'History' },
]

const ADMIN_TABS = [
  { id: 'admin-dashboard',  icon: '📊', label: 'Dashboard' },
  { id: 'map',              icon: '🅿️', label: 'Parking Map' },
  { id: 'register',         icon: '📋', label: 'Registration' },
  { id: 'vehicle-entry',    icon: '🚗', label: 'Entry' },
  { id: 'vehicle-exit',     icon: '🛑', label: 'Exit' },
  { id: 'reports-history',  icon: '📜', label: 'Reports' },
  { id: 'wrong-parking',    icon: '⚠️', label: 'Violations' },
]

export default function Navbar({ user, userProfile, onLogout, activeTab, setActiveTab }) {
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  const isAdmin =
    userProfile?.role === 'Security Admin' ||
    userProfile?.role === 'Admin' ||
    user?.email?.includes('admin') ||
    user?.role === 'Security Admin' ||
    user?.role === 'Admin'

  const tabs = isAdmin ? ADMIN_TABS : STUDENT_TABS
  const displayName = userProfile?.displayName || user?.displayName || 'Campus Member'
  const displayRole = userProfile?.role || 'Student'
  const initials = displayName.slice(0, 2).toUpperCase()

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') setMenuOpen(false) }
    const onOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    window.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onOutside)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onOutside)
    }
  }, [])

  useEffect(() => { setMenuOpen(false) }, [activeTab])

  const handleLogout = async () => {
    if (isLoggingOut) return
    setIsLoggingOut(true)
    try {
      if (onLogout) await onLogout()
      else await logout()
    } catch (err) {
      console.error('Logout error:', err)
      setIsLoggingOut(false)
    }
  }

  const handleTab = (id) => setActiveTab(id)

  return (
    <header className="site-navbar" ref={menuRef}>
      <div className="navbar-glow-line" />
      <div className="navbar-inner">
        <button
          type="button"
          className="nav-brand"
          onClick={() => handleTab(isAdmin ? 'admin-dashboard' : 'student-dashboard')}
          aria-label="Go to dashboard"
        >
          <div className="nav-logo-icon">
            <span className="nav-logo-letter">P</span>
          </div>
          <div className="nav-brand-text">
            <span className="nav-title">SOC<span className="nav-accent">.</span>Park</span>
            <span className="nav-sub">{isAdmin ? 'Admin Console' : 'Student Portal'}</span>
          </div>
        </button>

        <nav className="nav-desktop-tabs" aria-label="Main navigation">
          {tabs.map((tab) => {
            const isActive =
              activeTab === tab.id ||
              (tab.id === 'admin-dashboard' && activeTab === 'home') ||
              (tab.id === 'student-dashboard' && activeTab === 'home')
            return (
              <button
                key={tab.id}
                type="button"
                className={`nav-tab ${isActive ? 'nav-tab--active' : ''}`}
                onClick={() => handleTab(tab.id)}
                aria-current={isActive ? 'page' : undefined}
              >
                <span className="nav-tab-icon">{tab.icon}</span>
                <span className="nav-tab-label">{tab.label}</span>
                {isActive && <span className="nav-tab-indicator" />}
              </button>
            )
          })}
        </nav>

        <div className="nav-right">
          <div className="nav-user-chip" title={`${displayName} · ${displayRole}`}>
            <div className="nav-avatar">{initials}</div>
            <div className="nav-user-info">
              <span className="nav-user-name">{displayName}</span>
              <span className="nav-user-role">{displayRole}</span>
            </div>
          </div>

          <button
            type="button"
            className="nav-signout-btn"
            onClick={handleLogout}
            disabled={isLoggingOut}
            aria-label="Sign out"
          >
            <LogOutIcon className="w-4 h-4" />
            <span className="nav-signout-label">
              {isLoggingOut ? 'Signing out…' : 'Sign Out'}
            </span>
          </button>

          <button
            type="button"
            className={`nav-hamburger ${menuOpen ? 'nav-hamburger--open' : ''}`}
            onClick={() => setMenuOpen((p) => !p)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
          >
            <span className="bar bar-1" />
            <span className="bar bar-2" />
            <span className="bar bar-3" />
          </button>
        </div>
      </div>

      <div className={`nav-mobile-drawer ${menuOpen ? 'nav-mobile-drawer--open' : ''}`}>
        <div className="drawer-user-row">
          <div className="nav-avatar nav-avatar--lg">{initials}</div>
          <div>
            <p className="drawer-user-name">{displayName}</p>
            <p className="drawer-user-role">{displayRole}</p>
          </div>
        </div>
        <div className="drawer-divider" />
        <nav className="drawer-nav" aria-label="Mobile navigation">
          {tabs.map((tab) => {
            const isActive =
              activeTab === tab.id ||
              (tab.id === 'admin-dashboard' && activeTab === 'home') ||
              (tab.id === 'student-dashboard' && activeTab === 'home')
            return (
              <button
                key={tab.id}
                type="button"
                className={`drawer-nav-item ${isActive ? 'drawer-nav-item--active' : ''}`}
                onClick={() => handleTab(tab.id)}
                aria-current={isActive ? 'page' : undefined}
              >
                <span className="drawer-nav-icon">{tab.icon}</span>
                <span className="drawer-nav-label">{tab.label}</span>
                {isActive && <span className="drawer-active-dot" />}
              </button>
            )
          })}
        </nav>
        <div className="drawer-divider" />
        <button
          type="button"
          className="drawer-signout"
          onClick={handleLogout}
          disabled={isLoggingOut}
        >
          <LogOutIcon className="w-4 h-4" />
          {isLoggingOut ? 'Signing out…' : 'Sign Out'}
        </button>
      </div>
    </header>
  )
}
