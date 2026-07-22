/**
 * NotificationDropdown.jsx — Header Bell Icon with unread badge & notifications menu.
 */
import { useState, useEffect, useRef } from 'react'
import axios from '../services/api'
import { HiOutlineBell, HiCheck } from 'react-icons/hi'
import './NotificationDropdown.css'

export default function NotificationDropdown() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const dropdownRef = useRef(null)

  const fetchNotifications = async () => {
    try {
      const res = await axios.get('/notifications')
      setNotifications(res.data.notifications || [])
      setUnreadCount(res.data.unread_count || 0)
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 15000)
    return () => clearInterval(interval)
  }, [])

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const markAsRead = async (id) => {
    try {
      await axios.patch(`/notifications/${id}/read`)
      fetchNotifications()
    } catch {
      // ignore
    }
  }

  const markAllAsRead = async () => {
    try {
      await axios.patch('/notifications/read-all')
      fetchNotifications()
    } catch {
      // ignore
    }
  }

  return (
    <div className="notif-dropdown-wrapper" ref={dropdownRef}>
      <button
        className="notif-bell-btn"
        onClick={() => setOpen(!open)}
        title="Notifications"
      >
        <HiOutlineBell className="notif-bell-icon" />
        {unreadCount > 0 && (
          <span className="notif-unread-badge">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="notif-popover glass-card">
          <div className="notif-header">
            <h4 className="notif-title">Notifications</h4>
            {unreadCount > 0 && (
              <button className="notif-mark-all-btn" onClick={markAllAsRead}>
                <HiCheck /> Mark all read
              </button>
            )}
          </div>

          <div className="notif-list">
            {notifications.length === 0 ? (
              <div className="notif-empty">No notifications yet</div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.notification_id}
                  className={`notif-item ${!n.is_read ? 'unread' : ''}`}
                  onClick={() => !n.is_read && markAsRead(n.notification_id)}
                >
                  <div className="notif-item-content">
                    <h5 className="notif-item-title">{n.title}</h5>
                    <p className="notif-item-msg">{n.message}</p>
                    <span className="notif-item-time">
                      {n.created_at ? new Date(n.created_at).toLocaleString() : ''}
                    </span>
                  </div>
                  {!n.is_read && <div className="notif-unread-dot" />}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
