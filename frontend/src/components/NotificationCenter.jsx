import { useState, useMemo } from 'react'
import {
  BellIcon,
  CheckIcon,
  XIcon,
  AlertCircleIcon,
  ClockIcon
} from './Icons'
import {
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  deleteAllReadNotifications,
  NOTIFICATION_TYPES
} from '../services/notificationService'

/**
 * Format timestamp into human-readable relative time
 */
function formatTimeAgo(createdAt) {
  if (!createdAt) return 'Just now'
  let millis = 0
  if (typeof createdAt.toMillis === 'function') millis = createdAt.toMillis()
  else if (createdAt.seconds) millis = createdAt.seconds * 1000
  else if (createdAt instanceof Date) millis = createdAt.getTime()
  else if (typeof createdAt === 'number') millis = createdAt
  else if (typeof createdAt === 'string') millis = new Date(createdAt).getTime()
  else millis = Date.now()

  if (!millis || isNaN(millis)) return 'Just now'

  const diffMs = Date.now() - millis
  if (diffMs < 45000) return 'Just now'
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHour < 24) return `${diffHour}h ago`
  if (diffDay === 1) return 'Yesterday'
  if (diffDay < 7) return `${diffDay}d ago`

  return new Date(millis).toLocaleDateString([], { month: 'short', day: 'numeric' })
}

/**
 * Type-specific icon and style configuration
 */
function getTypeDetails(type) {
  switch (type) {
    case NOTIFICATION_TYPES.SUCCESS:
      return {
        icon: '✓',
        badgeClass: 'notif-badge--success',
        accentColor: '#10b981',
        label: 'Success'
      }
    case NOTIFICATION_TYPES.VIOLATION:
      return {
        icon: '⚠️',
        badgeClass: 'notif-badge--violation',
        accentColor: '#f43f5e',
        label: 'Violation'
      }
    case NOTIFICATION_TYPES.WARNING:
      return {
        icon: '!',
        badgeClass: 'notif-badge--warning',
        accentColor: '#f59e0b',
        label: 'Warning'
      }
    case NOTIFICATION_TYPES.INFO:
    default:
      return {
        icon: 'ℹ',
        badgeClass: 'notif-badge--info',
        accentColor: '#38bdf8',
        label: 'Info'
      }
  }
}

export default function NotificationCenter({
  userId,
  notifications = [],
  onClose
}) {
  const [filter, setFilter] = useState('all') // 'all' | 'unread'
  const [isProcessing, setIsProcessing] = useState(false)

  // Derive unread count
  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.read).length
  }, [notifications])

  // Derive read count
  const readCount = useMemo(() => {
    return notifications.filter((n) => n.read).length
  }, [notifications])

  // Filtered list
  const filteredNotifications = useMemo(() => {
    if (filter === 'unread') {
      return notifications.filter((n) => !n.read)
    }
    return notifications
  }, [notifications, filter])

  // Handle click on a notification item
  const handleItemClick = async (notif) => {
    if (!notif.read && notif.id) {
      try {
        await markNotificationAsRead(notif.id)
      } catch (err) {
        console.warn('[NotificationCenter] Error marking read:', err?.message)
      }
    }
  }

  // Handle Mark All As Read
  const handleMarkAllAsRead = async () => {
    if (!userId || unreadCount === 0 || isProcessing) return
    setIsProcessing(true)
    try {
      await markAllNotificationsAsRead(userId)
    } catch (err) {
      console.error('[NotificationCenter] Failed to mark all as read:', err)
    } finally {
      setIsProcessing(false)
    }
  }

  // Handle Clear Read Notifications
  const handleClearRead = async () => {
    if (!userId || readCount === 0 || isProcessing) return
    setIsProcessing(true)
    try {
      await deleteAllReadNotifications(userId)
    } catch (err) {
      console.error('[NotificationCenter] Failed to clear read notifications:', err)
    } finally {
      setIsProcessing(false)
    }
  }

  // Handle Delete Single Notification
  const handleDeleteItem = async (e, notifId) => {
    e.stopPropagation()
    if (!notifId) return
    try {
      await deleteNotification(notifId)
    } catch (err) {
      console.warn('[NotificationCenter] Error deleting notification:', err?.message)
    }
  }

  return (
    <div
      className="notif-center"
      role="dialog"
      aria-label="Notifications panel"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="notif-header">
        <div className="notif-header-title-row">
          <div className="notif-title-group">
            <BellIcon className="w-5 h-5 text-cyan" />
            <h3 className="notif-title">Notifications</h3>
            {unreadCount > 0 && (
              <span className="notif-count-pill">{unreadCount}</span>
            )}
          </div>
          {onClose && (
            <button
              type="button"
              className="notif-close-btn"
              onClick={onClose}
              aria-label="Close notifications"
            >
              <XIcon className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter Tabs & Bulk Actions */}
        <div className="notif-toolbar">
          <div className="notif-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={filter === 'all'}
              className={`notif-tab ${filter === 'all' ? 'notif-tab--active' : ''}`}
              onClick={() => setFilter('all')}
            >
              All
              <span className="notif-tab-badge">{notifications.length}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={filter === 'unread'}
              className={`notif-tab ${filter === 'unread' ? 'notif-tab--active' : ''}`}
              onClick={() => setFilter('unread')}
            >
              Unread
              {unreadCount > 0 && (
                <span className="notif-tab-badge notif-tab-badge--unread">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>

          <div className="notif-actions">
            {unreadCount > 0 && (
              <button
                type="button"
                className="notif-action-btn"
                onClick={handleMarkAllAsRead}
                disabled={isProcessing}
                title="Mark all notifications as read"
              >
                <CheckIcon className="w-3.5 h-3.5" />
                <span>Mark all as read</span>
              </button>
            )}
            {readCount > 0 && (
              <button
                type="button"
                className="notif-action-btn notif-action-btn--clear"
                onClick={handleClearRead}
                disabled={isProcessing}
                title="Clear read notifications"
              >
                <span>Clear read</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Notification List Body */}
      <div className="notif-list-container">
        {filteredNotifications.length === 0 ? (
          <div className="notif-empty-state">
            {filter === 'unread' ? (
              <>
                <div className="notif-empty-icon notif-empty-icon--check">
                  <CheckIcon className="w-8 h-8" />
                </div>
                <p className="notif-empty-title">You're all caught up.</p>
                <p className="notif-empty-subtitle">No unread notifications at the moment.</p>
              </>
            ) : (
              <>
                <div className="notif-empty-icon">
                  <BellIcon className="w-8 h-8" />
                </div>
                <p className="notif-empty-title">No notifications yet.</p>
                <p className="notif-empty-subtitle">Updates about reservations and parking events will appear here.</p>
              </>
            )}
          </div>
        ) : (
          <div className="notif-list">
            {filteredNotifications.map((item) => {
              const typeDetails = getTypeDetails(item.type)
              const isUnread = !item.read

              return (
                <div
                  key={item.id}
                  className={`notif-item ${isUnread ? 'notif-item--unread' : 'notif-item--read'} notif-item--${item.type || 'info'}`}
                  onClick={() => handleItemClick(item)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      handleItemClick(item)
                    }
                  }}
                >
                  <div className="notif-item-indicator-bar" />

                  <div className="notif-item-content">
                    <div className="notif-item-top">
                      <div className="notif-item-type-tag">
                        <span className={`notif-type-dot ${typeDetails.badgeClass}`}>
                          {typeDetails.icon}
                        </span>
                        <span className="notif-item-title">{item.title}</span>
                      </div>
                      <div className="notif-item-meta">
                        <span className="notif-item-time" title={item.createdAt ? String(item.createdAt) : ''}>
                          <ClockIcon className="w-3 h-3 inline-block mr-1 opacity-60" />
                          {formatTimeAgo(item.createdAt)}
                        </span>
                        <button
                          type="button"
                          className="notif-item-delete-btn"
                          onClick={(e) => handleDeleteItem(e, item.id)}
                          aria-label="Delete notification"
                          title="Delete"
                        >
                          <XIcon className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    <p className="notif-item-message">{item.message}</p>

                    {(item.relatedSlotId || item.relatedVehiclePlate) && (
                      <div className="notif-item-chips">
                        {item.relatedSlotId && (
                          <span className="notif-chip notif-chip--slot">
                            🅿️ Bay {item.relatedSlotId}
                          </span>
                        )}
                        {item.relatedVehiclePlate && (
                          <span className="notif-chip notif-chip--plate">
                            🚘 {item.relatedVehiclePlate}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {isUnread && <span className="notif-unread-dot" title="Unread" />}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
