/**
 * DashboardPage — Project overview with analytics.
 * Stat cards, project progress bars, priority breakdown,
 * status distribution, and recent activity timeline.
 */
import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { dashboardAPI } from '../services/api'
import Toast from '../components/Toast'
import PixelIcon from '../components/PixelIcon'
import './DashboardPage.css'

const STATUS_LABELS = {
  open: 'Open',
  in_progress: 'In Progress',
  testing: 'Testing',
  resolved: 'Resolved',
  closed: 'Closed',
}

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

const ACTION_ICON_NAMES = {
  issue_created: 'plus',
  issue_updated: 'edit',
  issue_assigned: 'user',
  issue_deleted: 'trash',
  status_changed: 'refresh',
  comment_added: 'comment',
  comment_edited: 'edit',
  comment_deleted: 'trash',
  project_created: 'folder',
  project_updated: 'folder',
  project_archived: 'archive',
  user_created: 'group',
  user_updated: 'wrench',
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true)
      const res = await dashboardAPI.get()
      setData(res.data)
    } catch (err) {
      setToast({ type: 'error', message: 'Failed to load dashboard data' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchDashboard() }, [fetchDashboard])

  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return ''
    const now = new Date()
    const dt = new Date(timestamp)
    const diffMs = now - dt
    const diffMin = Math.floor(diffMs / 60000)
    if (diffMin < 1) return 'Just now'
    if (diffMin < 60) return `${diffMin}m ago`
    const diffHrs = Math.floor(diffMin / 60)
    if (diffHrs < 24) return `${diffHrs}h ago`
    const diffDays = Math.floor(diffHrs / 24)
    if (diffDays < 7) return `${diffDays}d ago`
    return dt.toLocaleDateString()
  }

  if (loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner" />
      </div>
    )
  }

  if (!data) return null

  const { issue_stats, priority_breakdown, status_distribution, projects, recent_activity, team_stats } = data

  return (
    <div className="animate-fade-in" style={{ padding: '0.5rem 0' }}>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Overview of all projects and issues</p>
        </div>
      </div>

      {/* Stat Cards Row */}
      <div className="dash-stats-grid">
        <div className="dash-stat-card dash-stat-total" onClick={() => navigate('/issues')}>
          <div className="dash-stat-value">{issue_stats.total}</div>
          <div className="dash-stat-label">Total Issues</div>
          <div className="dash-stat-icon"><PixelIcon name="chart" size={24} color="var(--color-icon-fill)" /></div>
        </div>
        <div className="dash-stat-card dash-stat-open" onClick={() => navigate('/issues')}>
          <div className="dash-stat-value">{issue_stats.open}</div>
          <div className="dash-stat-label">Open</div>
          <div className="dash-stat-icon"><PixelIcon name="circle" size={24} color="var(--color-icon-fill)" /></div>
        </div>
        <div className="dash-stat-card dash-stat-testing">
          <div className="dash-stat-value">{issue_stats.testing}</div>
          <div className="dash-stat-label">Testing</div>
          <div className="dash-stat-icon"><PixelIcon name="flask" size={24} color="var(--color-icon-fill)" /></div>
        </div>
        <div className="dash-stat-card dash-stat-resolved">
          <div className="dash-stat-value">{issue_stats.resolved}</div>
          <div className="dash-stat-label">Resolved</div>
          <div className="dash-stat-icon"><PixelIcon name="check" size={24} color="var(--color-icon-fill)" /></div>
        </div>
        <div className="dash-stat-card dash-stat-overdue">
          <div className="dash-stat-value">{issue_stats.overdue}</div>
          <div className="dash-stat-label">Overdue</div>
          <div className="dash-stat-icon"><PixelIcon name="warning" size={24} color="var(--color-icon-fill)" /></div>
        </div>
      </div>

      {/* Team Stats (Admins/Managers) */}
      {team_stats && (
        <div className="dash-team-strip">
          <div className="dash-team-item">
            <span className="dash-team-val">{team_stats.total_users}</span>
            <span className="dash-team-lbl">Active Users</span>
          </div>
          <div className="dash-team-divider" />
          <div className="dash-team-item">
            <span className="dash-team-val">{team_stats.total_projects}</span>
            <span className="dash-team-lbl">Active Projects</span>
          </div>
          <div className="dash-team-divider" />
          <div className="dash-team-item">
            <span className="dash-team-val">{team_stats.issues_this_week}</span>
            <span className="dash-team-lbl">Issues This Week</span>
          </div>
          <div className="dash-team-divider" />
          <div className="dash-team-item">
            <span className="dash-team-val">{team_stats.unassigned_issues}</span>
            <span className="dash-team-lbl">Unassigned</span>
          </div>
        </div>
      )}

      {/* Two Column Layout: Priority + Status | Projects */}
      <div className="dash-two-col">
        {/* Left Column */}
        <div className="dash-col-left">
          {/* Priority Breakdown */}
          <div className="glass-card dash-section-card">
            <h3 className="dash-section-title">Priority Breakdown</h3>
            <p className="dash-section-subtitle">Active issues by priority level</p>
            <div className="dash-priority-bars">
              {['critical', 'high', 'medium', 'low'].map((p) => {
                const count = priority_breakdown[p] || 0
                const total = Object.values(priority_breakdown).reduce((a, b) => a + b, 0)
                const pct = total > 0 ? Math.round((count / total) * 100) : 0
                return (
                  <div key={p} className="dash-priority-row">
                    <div className="dash-priority-label">
                      <span className={`dash-priority-dot priority-${p}`} />
                      <span className="dash-priority-name">{p.charAt(0).toUpperCase() + p.slice(1)}</span>
                    </div>
                    <div className="dash-priority-bar-track">
                      <div
                        className={`dash-priority-bar-fill priority-${p}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="dash-priority-count">{count}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Status Distribution */}
          <div className="glass-card dash-section-card">
            <h3 className="dash-section-title">Status Distribution</h3>
            <p className="dash-section-subtitle">Issues across all statuses</p>
            <div className="dash-status-grid">
              {Object.entries(status_distribution).map(([status, count]) => (
                <div key={status} className={`dash-status-chip status-${status}`}>
                  <span className="dash-status-chip-count">{count}</span>
                  <span className="dash-status-chip-label">{STATUS_LABELS[status] || status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column — Recent Activity */}
        <div className="dash-col-right">
          <div className="glass-card dash-section-card">
            <div className="dash-section-header">
              <div>
                <h3 className="dash-section-title">Recent Activity</h3>
                <p className="dash-section-subtitle">Latest system events</p>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('/activity')}>
                View All →
              </button>
            </div>
            <div className="dash-activity-list">
              {recent_activity.length === 0 ? (
                <div className="empty-state" style={{ padding: '2rem' }}>
                  <div className="empty-state-icon"><PixelIcon name="empty" size={32} color="var(--color-text-muted)" /></div>
                  <p className="empty-state-text">No recent activity</p>
                </div>
              ) : (
                recent_activity.map((log) => (
                  <div key={log.log_id} className="dash-activity-item">
                    <span className="dash-activity-icon">
                      <PixelIcon name={ACTION_ICON_NAMES[log.action] || 'pin'} size={16} color="var(--color-icon-fill)" />
                    </span>
                    <div className="dash-activity-content">
                      <div className="dash-activity-text">
                        <strong>{log.user_name || 'System'}</strong>{' '}
                        {ACTION_LABELS[log.action] || log.action}
                      </div>
                      {log.details && (
                        <p className="dash-activity-details">{log.details}</p>
                      )}
                    </div>
                    <span className="dash-activity-time">
                      {formatTimeAgo(log.timestamp)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Project Progress Cards (FR-31) */}
      {projects.length > 0 && (
        <div className="glass-card dash-section-card" style={{ marginTop: 'var(--space-6)' }}>
          <h3 className="dash-section-title">Project Progress</h3>
          <p className="dash-section-subtitle">Completion status across active projects</p>
          <div className="dash-projects-grid">
            {projects.map((p) => (
              <div key={p.project_id} className="dash-project-card" onClick={() => navigate('/projects')}>
                <div className="dash-project-header">
                  <h4 className="dash-project-name">{p.project_name}</h4>
                  <span className={`badge ${p.status === 'active' ? 'badge-emerald' : 'badge-slate'}`}>
                    {p.status}
                  </span>
                </div>
                <div className="dash-project-progress-track">
                  <div
                    className="dash-project-progress-fill"
                    style={{ width: `${p.progress}%` }}
                  />
                </div>
                <div className="dash-project-meta">
                  <span>{p.progress}% complete</span>
                  <span>{p.resolved_issues}/{p.total_issues} resolved</span>
                  {p.overdue_issues > 0 && (
                    <span className="dash-project-overdue">
                      {p.overdue_issues} overdue
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
