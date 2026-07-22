/**
 * ActivityLogsPage — View and filter system activity logs.
 * FR-25/FR-26: Activity logging and viewing for admins/managers.
 */
import { useState, useEffect, useCallback } from 'react'
import { activityAPI } from '../services/api'
import Toast from '../components/Toast'
import './ActivityLogsPage.css'

const ACTION_LABELS = {
  issue_created: 'Created issue',
  issue_updated: 'Updated issue',
  issue_assigned: 'Assigned issue',
  issue_deleted: 'Deleted issue',
  status_changed: 'Changed status',
  comment_added: 'Added comment',
  comment_edited: 'Edited comment',
  comment_deleted: 'Deleted comment',
  project_created: 'Created project',
  project_updated: 'Updated project',
  project_archived: 'Archived project',
  user_created: 'Created user',
  user_updated: 'Updated user',
}

const ACTION_ICONS = {
  issue_created: '🆕', issue_updated: '✏️', issue_assigned: '👤',
  issue_deleted: '🗑️', status_changed: '🔄', comment_added: '💬',
  comment_edited: '📝', comment_deleted: '❌', project_created: '📁',
  project_updated: '📂', project_archived: '📦', user_created: '👥',
  user_updated: '🔧',
}

const ENTITY_BADGE = {
  issue: 'badge-blue',
  comment: 'badge-violet',
  project: 'badge-emerald',
  user: 'badge-amber',
}

export default function ActivityLogsPage() {
  const [logs, setLogs] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)

  // Filters
  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [entityFilter, setEntityFilter] = useState('')
  const [userFilter, setUserFilter] = useState('')
  const [users, setUsers] = useState([])

  // Stats
  const [stats, setStats] = useState(null)

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true)
      const params = { page, per_page: 20 }
      if (search) params.search = search
      if (actionFilter) params.action = actionFilter
      if (entityFilter) params.entity_type = entityFilter
      if (userFilter) params.user_id = userFilter

      const res = await activityAPI.list(params)
      setLogs(res.data.logs)
      setTotal(res.data.total)
      setTotalPages(res.data.total_pages)
    } catch (err) {
      setToast({ type: 'error', message: 'Failed to load activity logs' })
    } finally {
      setLoading(false)
    }
  }, [page, search, actionFilter, entityFilter, userFilter])

  const fetchMeta = useCallback(async () => {
    try {
      const [statsRes, usersRes] = await Promise.all([
        activityAPI.stats(),
        activityAPI.users(),
      ])
      setStats(statsRes.data.stats)
      setUsers(usersRes.data.users)
    } catch {
      // silently fail — non-critical
    }
  }, [])

  useEffect(() => { fetchMeta() }, [fetchMeta])
  useEffect(() => { fetchLogs() }, [fetchLogs])

  // Debounced search
  const [searchInput, setSearchInput] = useState('')
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1) }, 400)
    return () => clearTimeout(t)
  }, [searchInput])

  const formatTimestamp = (ts) => {
    if (!ts) return ''
    const d = new Date(ts)
    return d.toLocaleString('en-US', {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  }

  const uniqueActions = [...new Set(logs.map(l => l.action))].sort()

  return (
    <div className="animate-fade-in" style={{ padding: '0.5rem 0' }}>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      <div className="page-header">
        <div>
          <h1 className="page-title">Activity Logs</h1>
          <p className="page-subtitle">View system activity and audit trail</p>
        </div>
      </div>

      {/* Stat Cards */}
      {stats && (
        <div className="activity-stats-row">
          <div className="activity-stat-card">
            <div className="activity-stat-val">{stats.total}</div>
            <div className="activity-stat-lbl">Total Events</div>
          </div>
          <div className="activity-stat-card">
            <div className="activity-stat-val">{stats.today}</div>
            <div className="activity-stat-lbl">Today</div>
          </div>
          <div className="activity-stat-card">
            <div className="activity-stat-val">{stats.this_week}</div>
            <div className="activity-stat-lbl">This Week</div>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="activity-filter-bar">
        <input
          type="text"
          className="form-input"
          placeholder="Search activity..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          style={{ maxWidth: '260px' }}
        />
        <select
          className="form-select"
          value={actionFilter}
          onChange={(e) => { setActionFilter(e.target.value); setPage(1) }}
        >
          <option value="">All Actions</option>
          {Object.entries(ACTION_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
        <select
          className="form-select"
          value={entityFilter}
          onChange={(e) => { setEntityFilter(e.target.value); setPage(1) }}
        >
          <option value="">All Types</option>
          <option value="issue">Issue</option>
          <option value="comment">Comment</option>
          <option value="project">Project</option>
          <option value="user">User</option>
        </select>
        {users.length > 0 && (
          <select
            className="form-select"
            value={userFilter}
            onChange={(e) => { setUserFilter(e.target.value); setPage(1) }}
          >
            <option value="">All Users</option>
            {users.map(u => (
              <option key={u.user_id} value={u.user_id}>{u.name}</option>
            ))}
          </select>
        )}
        <span className="activity-total-badge">{total} events</span>
      </div>

      {/* Activity Timeline */}
      {loading ? (
        <div className="loading-spinner"><div className="spinner" /></div>
      ) : logs.length === 0 ? (
        <div className="glass-card">
          <div className="empty-state">
            <div className="empty-state-icon">📭</div>
            <h3 className="empty-state-title">No Activity Found</h3>
            <p className="empty-state-text">
              {search || actionFilter || entityFilter
                ? 'Try adjusting your filters.'
                : 'Activity logs will appear here as actions are performed.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="glass-card activity-timeline-card">
          <div className="activity-timeline">
            {logs.map((log) => (
              <div key={log.log_id} className="activity-timeline-item">
                <div className="activity-tl-dot">
                  <span>{ACTION_ICONS[log.action] || '📌'}</span>
                </div>
                <div className="activity-tl-content">
                  <div className="activity-tl-header">
                    <span className="activity-tl-user">{log.user_name || 'System'}</span>
                    <span className="activity-tl-action">
                      {ACTION_LABELS[log.action] || log.action}
                    </span>
                    {log.entity_type && (
                      <span className={`badge ${ENTITY_BADGE[log.entity_type] || 'badge-slate'}`}>
                        {log.entity_type}
                      </span>
                    )}
                  </div>
                  {log.details && (
                    <p className="activity-tl-details">{log.details}</p>
                  )}
                </div>
                <span className="activity-tl-time">{formatTimestamp(log.timestamp)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="activity-pagination">
          <button
            className="btn btn-secondary btn-sm"
            disabled={page <= 1}
            onClick={() => setPage(p => p - 1)}
          >
            ← Previous
          </button>
          <span className="activity-page-info">
            Page {page} of {totalPages}
          </span>
          <button
            className="btn btn-secondary btn-sm"
            disabled={page >= totalPages}
            onClick={() => setPage(p => p + 1)}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  )
}
