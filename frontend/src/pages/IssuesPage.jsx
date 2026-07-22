/**
 * IssuesPage — Full issue management interface.
 * Table view with stat cards, search, filters, create/edit modals,
 * inline status transitions, and delete functionality.
 */
import { useState, useEffect, useCallback } from 'react'
import { issuesAPI, projectsAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'
import IssueFormModal from '../components/IssueFormModal'
import CommentsPanel from '../components/CommentsPanel'
import KanbanBoard from '../components/KanbanBoard'
import PixelIcon from '../components/PixelIcon'
import { useToast, ToastContainer } from '../components/Toast'
import {
  HiOutlinePlus,
  HiOutlineSearch,
  HiOutlinePencil,
  HiOutlineTrash,
  HiOutlineTicket,
  HiOutlineExclamationCircle,
  HiOutlineClock,
  HiOutlineCheckCircle,
  HiOutlineFolder,
  HiOutlineChatAlt2,
  HiOutlineViewList,
  HiOutlineViewBoards,
} from 'react-icons/hi'
import './IssuesPage.css'

/* ---- Helper maps ---- */
const PRIORITY_MAP = {
  low:      { label: 'Low',      class: 'priority-low',      iconName: 'circle', color: '#71717a' },
  medium:   { label: 'Medium',   class: 'priority-medium',   iconName: 'circle', color: '#52525b' },
  high:     { label: 'High',     class: 'priority-high',     iconName: 'warning', color: '#27272a' },
  critical: { label: 'Critical', class: 'priority-critical',  iconName: 'warning', color: '#000000' },
}

const STATUS_MAP = {
  open:        { label: 'Open',        class: 'status-open' },
  in_progress: { label: 'In Progress', class: 'status-in_progress' },
  testing:     { label: 'Testing',     class: 'status-testing' },
  resolved:    { label: 'Resolved',    class: 'status-resolved' },
  closed:      { label: 'Closed',      class: 'status-closed' },
}

/* Valid transitions (mirrors backend) */
const VALID_TRANSITIONS = {
  open:        ['in_progress'],
  in_progress: ['testing', 'open'],
  testing:     ['resolved', 'in_progress'],
  resolved:    ['closed', 'in_progress'],
  closed:      ['open'],
}

export default function IssuesPage() {
  const { user } = useAuth()
  const isManagerOrAdmin = user?.role === 'admin' || user?.role === 'manager'

  // View Mode: 'list' | 'kanban'
  const [viewMode, setViewMode] = useState('list')

  // State
  const [issues, setIssues] = useState([])
  const [stats, setStats] = useState(null)
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [projectFilter, setProjectFilter] = useState('')
  const [sortBy, setSortBy] = useState('newest')


  // Modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [editingIssue, setEditingIssue] = useState(null)

  // Comments panel state
  const [commentsPanelOpen, setCommentsPanelOpen] = useState(false)
  const [commentsPanelIssue, setCommentsPanelIssue] = useState(null)

  // Toast
  const { toasts, addToast, removeToast } = useToast()

  // Fetch issues
  const fetchIssues = useCallback(async () => {
    try {
      setLoading(true)
      const params = { sort: sortBy }
      if (statusFilter) params.status = statusFilter
      if (priorityFilter) params.priority = priorityFilter
      if (projectFilter) params.project_id = projectFilter
      if (search.trim()) params.search = search.trim()
      const res = await issuesAPI.list(params)
      setIssues(res.data.issues || [])
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to load issues', 'error')
    } finally {
      setLoading(false)
    }
  }, [search, statusFilter, priorityFilter, projectFilter, sortBy, addToast])

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const res = await issuesAPI.stats()
      setStats(res.data.stats || null)
    } catch {
      // non-critical
    }
  }, [])

  // Fetch projects for filter dropdown
  const fetchProjects = useCallback(async () => {
    try {
      const res = await projectsAPI.list({})
      setProjects(res.data.projects || [])
    } catch {
      // non-critical
    }
  }, [])

  useEffect(() => {
    fetchIssues()
  }, [fetchIssues])

  useEffect(() => {
    fetchStats()
    fetchProjects()
  }, [fetchStats, fetchProjects])

  // Debounced search
  const [searchInput, setSearchInput] = useState('')
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 350)
    return () => clearTimeout(timer)
  }, [searchInput])

  // Handlers
  const handleCreate = async (data) => {
    const res = await issuesAPI.create(data)
    addToast(res.data.message, 'success')
    fetchIssues()
    fetchStats()
  }

  const handleEdit = async (data) => {
    const res = await issuesAPI.update(editingIssue.issue_id, data)
    addToast(res.data.message, 'success')
    setEditingIssue(null)
    fetchIssues()
    fetchStats()
  }

  const handleStatusChange = async (issue, newStatus) => {
    try {
      const res = await issuesAPI.updateStatus(issue.issue_id, newStatus)
      addToast(res.data.message, 'success')
      fetchIssues()
      fetchStats()
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to update status', 'error')
    }
  }

  const handleDelete = async (issue) => {
    if (!window.confirm(`Are you sure you want to delete "${issue.title}"? This cannot be undone.`)) return
    try {
      const res = await issuesAPI.delete(issue.issue_id)
      addToast(res.data.message, 'success')
      fetchIssues()
      fetchStats()
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to delete issue', 'error')
    }
  }

  const openCreate = () => {
    setEditingIssue(null)
    setModalOpen(true)
  }

  const openEdit = (issue) => {
    setEditingIssue(issue)
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditingIssue(null)
  }

  const openComments = (issue) => {
    setCommentsPanelIssue(issue)
    setCommentsPanelOpen(true)
  }

  const closeComments = () => {
    setCommentsPanelOpen(false)
    setCommentsPanelIssue(null)
  }

  // Format date for display
  const formatDate = (dateStr) => {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    })
  }

  // Due date class
  const getDueDateClass = (dateStr, status) => {
    if (!dateStr || ['resolved', 'closed'].includes(status)) return ''
    const due = new Date(dateStr)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const diff = (due - today) / (1000 * 60 * 60 * 24)
    if (diff < 0) return 'overdue'
    if (diff <= 3) return 'due-soon'
    return ''
  }

  // Get allowed status transitions for a given issue
  const getTransitionOptions = (issue) => {
    const current = issue.status
    const allowed = VALID_TRANSITIONS[current] || []
    return [current, ...allowed]
  }

  return (
    <div className="animate-fade-in" style={{ padding: '2rem' }}>
      {/* Toast */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Issues</h1>
          <p className="page-subtitle">Track, assign, and manage issues across projects</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          {/* View Toggle */}
          <div className="view-mode-toggle" style={{ display: 'flex', background: 'var(--color-bg-secondary)', padding: '3px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
            <button
              className={`btn btn-xs ${viewMode === 'list' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setViewMode('list')}
              title="List View"
            >
              <HiOutlineViewList /> List
            </button>
            <button
              className={`btn btn-xs ${viewMode === 'kanban' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setViewMode('kanban')}
              title="Kanban Board View"
            >
              <HiOutlineViewBoards /> Board
            </button>
          </div>

          {isManagerOrAdmin && (
            <button className="btn btn-primary" onClick={openCreate} id="create-issue-btn">
              <HiOutlinePlus /> New Issue
            </button>
          )}
        </div>
      </div>


      {/* Stat Cards */}
      {stats && (
        <div className="issues-stats">
          <div className="stat-card stat-total">
            <div className="stat-card-icon">
              <HiOutlineTicket />
            </div>
            <div className="stat-card-info">
              <span className="stat-card-value">{stats.total}</span>
              <span className="stat-card-label">Total Issues</span>
            </div>
          </div>
          <div className="stat-card stat-open">
            <div className="stat-card-icon">
              <HiOutlineExclamationCircle />
            </div>
            <div className="stat-card-info">
              <span className="stat-card-value">{stats.open}</span>
              <span className="stat-card-label">Open</span>
            </div>
          </div>
          <div className="stat-card stat-testing">
            <div className="stat-card-icon">
              <HiOutlineClock />
            </div>
            <div className="stat-card-info">
              <span className="stat-card-value">{stats.testing}</span>
              <span className="stat-card-label">Testing</span>
            </div>
          </div>
          <div className="stat-card stat-resolved">
            <div className="stat-card-icon">
              <HiOutlineCheckCircle />
            </div>
            <div className="stat-card-info">
              <span className="stat-card-value">{stats.resolved}</span>
              <span className="stat-card-label">Resolved</span>
            </div>
          </div>
          <div className="stat-card stat-overdue">
            <div className="stat-card-icon">
              <HiOutlineExclamationCircle />
            </div>
            <div className="stat-card-info">
              <span className="stat-card-value">{stats.overdue}</span>
              <span className="stat-card-label">Overdue</span>
            </div>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="issues-filter-bar">
        <div className="issues-search">
          <HiOutlineSearch
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--color-text-muted)',
              fontSize: '1rem',
            }}
          />
          <input
            className="form-input"
            type="text"
            placeholder="Search issues…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            style={{ paddingLeft: '36px' }}
            id="issue-search-input"
          />
        </div>
        <select
          className="form-select"
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
          style={{ minWidth: '160px' }}
          id="issue-project-filter"
        >
          <option value="">All Projects</option>
          {projects.map((p) => (
            <option key={p.project_id} value={p.project_id}>
              {p.project_name}
            </option>
          ))}
        </select>
        <select
          className="form-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ minWidth: '140px' }}
          id="issue-status-filter"
        >
          <option value="">All Status</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="testing">Testing</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
        <select
          className="form-select"
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          style={{ minWidth: '130px' }}
          id="issue-priority-filter"
        >
          <option value="">All Priority</option>
          <option value="critical">🔴 Critical</option>
          <option value="high">🟠 High</option>
          <option value="medium">🔵 Medium</option>
          <option value="low">🟢 Low</option>
        </select>
        <select
          className="form-select"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          style={{ minWidth: '140px' }}
          id="issue-sort-select"
        >
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="priority">Priority</option>
          <option value="due_date">Due Date</option>
          <option value="status">Status</option>
        </select>
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div className="issues-table-wrapper">
          <div className="issues-skeleton">
            {[1, 2, 3, 4, 5].map((i) => (
              <div className="issue-skeleton-row" key={i}>
                <div className="skeleton-line" style={{ width: '35%' }} />
                <div className="skeleton-line" style={{ width: '12%' }} />
                <div className="skeleton-line" style={{ width: '14%' }} />
                <div className="skeleton-line" style={{ width: '15%' }} />
                <div className="skeleton-line" style={{ width: '12%' }} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && issues.length === 0 && (
        <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
          <div className="empty-state-icon">
            <HiOutlineTicket style={{ fontSize: '3rem', color: 'var(--color-text-muted)' }} />
          </div>
          <h3 className="empty-state-title">
            {search || statusFilter || priorityFilter || projectFilter
              ? 'No issues found'
              : 'No issues yet'
            }
          </h3>
          <p className="empty-state-text">
            {search || statusFilter || priorityFilter || projectFilter
              ? 'Try adjusting your search or filter criteria.'
              : isManagerOrAdmin
                ? 'Create your first issue to start tracking work.'
                : 'No issues are assigned to you yet.'
            }
          </p>
          {!search && !statusFilter && !priorityFilter && !projectFilter && isManagerOrAdmin && (
            <button
              className="btn btn-primary"
              onClick={openCreate}
              style={{ marginTop: 'var(--space-6)' }}
            >
              <HiOutlinePlus /> Create First Issue
            </button>
          )}
        </div>
      )}

      {/* Issues Content (Table or Kanban) */}
      {!loading && issues.length > 0 && viewMode === 'kanban' && (
        <KanbanBoard
          issues={issues}
          onStatusChange={handleStatusChange}
          onEdit={openEdit}
          onDelete={handleDelete}
          onOpenComments={openComments}
          isManagerOrAdmin={isManagerOrAdmin}
        />
      )}

      {!loading && issues.length > 0 && viewMode === 'list' && (
        <div className="issues-table-wrapper">
          <table className="issues-table">
            <thead>
              <tr>
                <th>Issue</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Assignee</th>
                <th>Due Date</th>
                <th>Created</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {issues.map((issue) => {
                const pri = PRIORITY_MAP[issue.priority] || PRIORITY_MAP.medium
                const dueDateClass = getDueDateClass(issue.due_date, issue.status)
                const transitionOptions = getTransitionOptions(issue)

                return (
                  <tr key={issue.issue_id}>
                    {/* Title + Project */}
                    <td>
                      <div className="issue-title-cell">
                        <span className="issue-title-text" title={issue.title}>
                          {issue.title}
                        </span>
                        <span className="issue-project-tag">
                          <HiOutlineFolder style={{ fontSize: '0.7rem' }} />
                          {issue.project_name || `Project #${issue.project_id}`}
                        </span>
                      </div>
                    </td>

                    {/* Priority */}
                    <td>
                      <span className={`priority-badge ${pri.class}`}>
                        <PixelIcon name={pri.iconName} size={10} color={pri.color} /> {pri.label}
                      </span>
                    </td>

                    {/* Status — inline select for status transitions */}
                    <td>
                      <select
                        className={`status-select-inline status-${issue.status}`}
                        value={issue.status}
                        onChange={(e) => handleStatusChange(issue, e.target.value)}
                        id={`status-select-${issue.issue_id}`}
                      >
                        {transitionOptions.map((s) => (
                          <option key={s} value={s}>
                            {STATUS_MAP[s]?.label || s}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Assignee */}
                    <td>
                      {issue.assignee_name ? (
                        <div className="assignee-cell">
                          <div className="assignee-avatar">
                            {issue.assignee_name.charAt(0).toUpperCase()}
                          </div>
                          <span className="assignee-name">{issue.assignee_name}</span>
                        </div>
                      ) : (
                        <span className="unassigned-text">Unassigned</span>
                      )}
                    </td>

                    {/* Due Date */}
                    <td>
                      <span className={`due-date-text ${dueDateClass}`}>
                        {formatDate(issue.due_date)}
                      </span>
                    </td>

                    {/* Created */}
                    <td style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-xs)' }}>
                      {formatDate(issue.created_at)}
                    </td>

                    {/* Actions */}
                    <td>
                      <div className="issue-actions" style={{ justifyContent: 'flex-end' }}>
                        <button
                          className="btn btn-ghost btn-sm comments-btn"
                          onClick={() => openComments(issue)}
                          title="View comments"
                          id={`comments-btn-${issue.issue_id}`}
                        >
                          <HiOutlineChatAlt2 />
                          {issue.comment_count > 0 && (
                            <span className="comment-count-badge">{issue.comment_count}</span>
                          )}
                        </button>
                        {isManagerOrAdmin && (
                          <>
                            <button
                              className="btn btn-ghost btn-sm"
                              onClick={() => openEdit(issue)}
                              title="Edit issue"
                            >
                              <HiOutlinePencil />
                            </button>
                            <button
                              className="btn btn-ghost btn-sm"
                              onClick={() => handleDelete(issue)}
                              title="Delete issue"
                              style={{ color: 'var(--color-accent-rose)' }}
                            >
                              <HiOutlineTrash />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}


      {/* Modal */}
      <IssueFormModal
        isOpen={modalOpen}
        onClose={closeModal}
        onSubmit={editingIssue ? handleEdit : handleCreate}
        issue={editingIssue}
      />

      {/* Comments Panel */}
      <CommentsPanel
        isOpen={commentsPanelOpen}
        onClose={closeComments}
        issue={commentsPanelIssue}
      />
    </div>
  )
}
