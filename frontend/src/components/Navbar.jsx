import React, { useState, useEffect } from 'react'
import { ShieldIcon, BellIcon, UserIcon, RefreshCwIcon, MapPinIcon } from './Icons'

export default function Navbar({ activeTab, setActiveTab, currentRole, setCurrentRole, notifications, onRefresh, unreadCount }) {
  const [time, setTime] = useState(new Date())
  const [showNotifications, setShowNotifications] = useState(false)

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <header className="navbar-container">
      <div className="navbar-left">
        <div className="brand-logo">
          <div className="logo-icon-wrap">
            <span className="logo-p-badge">P</span>
          </div>
          <div className="brand-info">
            <h1 className="brand-title">SmartPark<span className="accent-dot">.</span>Campus</h1>
            <span className="brand-subtitle">IoT College Parking Management</span>
          </div>
        </div>

        <div className="location-pill">
          <MapPinIcon className="w-4 h-4 text-emerald" />
          <span>Main Campus Central Parking</span>
          <span className="live-status-dot"></span>
        </div>
      </div>

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
          className={`nav-tab-btn ${activeTab === 'gate' ? 'active' : ''}`}
          onClick={() => setActiveTab('gate')}
        >
          Gate Terminal
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
          className={`nav-tab-btn ${activeTab === 'logs' ? 'active' : ''}`}
          onClick={() => setActiveTab('logs')}
        >
          Activity Log
        </button>
      </nav>

      <div className="navbar-right">
        <div className="live-clock">
          <span className="clock-time">{time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
          <span className="clock-date">{time.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}</span>
        </div>

        <button 
          type="button" 
          className="refresh-btn" 
          onClick={onRefresh} 
          title="Refresh slot telemetry"
        >
          <RefreshCwIcon className="w-4 h-4" />
        </button>

        {/* Notifications Dropdown */}
        <div className="notifications-wrapper">
          <button 
            type="button" 
            className="icon-btn notif-btn" 
            onClick={() => setShowNotifications(!showNotifications)}
            aria-label="Notifications"
          >
            <BellIcon className="w-5 h-5" />
            {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
          </button>

          {showNotifications && (
            <div className="notifications-dropdown">
              <div className="notif-header">
                <h4>System Notifications</h4>
                <span className="notif-count-badge">{notifications.length} alerts</span>
              </div>
              <div className="notif-list">
                {notifications.length === 0 ? (
                  <p className="empty-notif">No new notifications</p>
                ) : (
                  notifications.map((n) => (
                    <div key={n.id} className={`notif-item ${n.type}`}>
                      <div className="notif-bullet"></div>
                      <div className="notif-content">
                        <div className="notif-title-row">
                          <span className="notif-title">{n.title}</span>
                          <span className="notif-time">{n.time}</span>
                        </div>
                        <p className="notif-msg">{n.message}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Role Selector */}
        <div className="role-selector">
          <UserIcon className="w-4 h-4 text-muted" />
          <select 
            value={currentRole} 
            onChange={(e) => setCurrentRole(e.target.value)}
            className="role-select"
          >
            <option value="Student">Student Mode</option>
            <option value="Faculty">Faculty / Staff</option>
            <option value="Security Admin">Security Admin</option>
          </select>
        </div>
      </div>
    </header>
  )
}
