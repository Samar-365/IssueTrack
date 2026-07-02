/**
 * ProjectsPage — Full project management interface.
 * Cards grid with search, filters, create/edit modals, and archive/restore.
 */
import { useState, useEffect, useCallback } from 'react'
import { projectsAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'
import ProjectFormModal from '../components/ProjectFormModal'
import { useToast, ToastContainer } from '../components/Toast'
import {
  HiOutlinePlus,
  HiOutlineSearch,
  HiOutlinePencil,
  HiOutlineArchive,
  HiOutlineRefresh,
  HiOutlineCalendar,
  HiOutlineUser,
  HiOutlineFolder,
} from 'react-icons/hi'
import './ProjectsPage.css'

export default function ProjectsPage() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'

  // State
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('active')
  const [sortBy, setSortBy] = useState('newest')

  // Modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [editingProject, setEditingProject] = useState(null)

  // Toast
  const { toasts, addToast, removeToast } = useToast()

  // Fetch projects
  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true)
      const params = { sort: sortBy }
      if (statusFilter !== 'all') params.status = statusFilter
      if (search.trim()) params.search = search.trim()
      const res = await projectsAPI.list(params)
      setProjects(res.data.projects || [])
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to load projects', 'error')
    } finally {
      setLoading(false)
    }
  }, [search, statusFilter, sortBy, addToast])

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  // Debounced search
  const [searchInput, setSearchInput] = useState('')
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 350)
    return () => clearTimeout(timer)
  }, [searchInput])

  // Handlers
  const handleCreate = async (data) => {
    const res = await projectsAPI.create(data)
    addToast(res.data.message, 'success')
    fetchProjects()
  }

  const handleEdit = async (data) => {
    const res = await projectsAPI.update(editingProject.project_id, data)
    addToast(res.data.message, 'success')
    setEditingProject(null)
    fetchProjects()
  }

  const handleArchive = async (project) => {
    const action = project.status === 'active' ? 'archive' : 'restore'
    if (!window.confirm(`Are you sure you want to ${action} "${project.project_name}"?`)) return
    try {
      const res = await projectsAPI.archive(project.project_id)
      addToast(res.data.message, 'success')
      fetchProjects()
    } catch (err) {
      addToast(err.response?.data?.error || `Failed to ${action} project`, 'error')
    }
  }

  const openCreate = () => {
    setEditingProject(null)
    setModalOpen(true)
  }

  const openEdit = (project) => {
    setEditingProject(project)
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditingProject(null)
  }

  // Format date for display
  const formatDate = (dateStr) => {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    })
  }

  return (
    <div className="animate-fade-in" style={{ padding: '2rem' }}>
      {/* Toast */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Projects</h1>
          <p className="page-subtitle">Manage and track your projects</p>
        </div>
        {isAdmin && (
          <button className="btn btn-primary" onClick={openCreate} id="create-project-btn">
            <HiOutlinePlus /> New Project
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="projects-filter-bar" style={{ marginBottom: 'var(--space-6)' }}>
        <div className="projects-search" style={{ position: 'relative' }}>
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
            placeholder="Search projects…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            style={{ paddingLeft: '36px' }}
            id="project-search-input"
          />
        </div>
        <select
          className="form-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ minWidth: '140px' }}
          id="project-status-filter"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="archived">Archived</option>
        </select>
        <select
          className="form-select"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          style={{ minWidth: '140px' }}
          id="project-sort-select"
        >
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="name">Name A–Z</option>
        </select>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="projects-grid">
          {[1, 2, 3].map((i) => (
            <div className="project-skeleton" key={i}>
              <div className="skeleton-line h-20 w-60" />
              <div className="skeleton-line w-80" />
              <div className="skeleton-line w-full h-6" />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '8px' }}>
                <div className="skeleton-line h-20" />
                <div className="skeleton-line h-20" />
                <div className="skeleton-line h-20" />
                <div className="skeleton-line h-20" />
              </div>
              <div className="skeleton-line w-40" />
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && projects.length === 0 && (
        <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
          <div className="empty-state-icon">
            <HiOutlineFolder style={{ fontSize: '3rem', color: 'var(--color-text-muted)' }} />
          </div>
          <h3 className="empty-state-title">
            {search ? 'No projects found' : 'No projects yet'}
          </h3>
          <p className="empty-state-text">
            {search
              ? 'Try adjusting your search or filter criteria.'
              : isAdmin
                ? 'Create your first project to get started with issue tracking.'
                : 'No projects are available for your account yet.'
            }
          </p>
          {!search && isAdmin && (
            <button
              className="btn btn-primary"
              onClick={openCreate}
              style={{ marginTop: 'var(--space-6)' }}
            >
              <HiOutlinePlus /> Create First Project
            </button>
          )}
        </div>
      )}

      {/* Project Cards Grid */}
      {!loading && projects.length > 0 && (
        <div className="projects-grid">
          {projects.map((project) => (
            <div
              key={project.project_id}
              className={`project-card ${project.status === 'archived' ? 'archived' : ''}`}
            >
              {/* Card Header */}
              <div className="project-card-header">
                <h3 className="project-card-name">{project.project_name}</h3>
                <span className={`badge ${project.status === 'active' ? 'badge-emerald' : 'badge-slate'}`}>
                  {project.status === 'active' ? 'Active' : 'Archived'}
                </span>
              </div>

              {/* Description */}
              <p className="project-card-desc">
                {project.description || 'No description provided.'}
              </p>

              {/* Progress Bar */}
              <div className="project-progress">
                <div className="progress-header">
                  <span className="progress-label">Progress</span>
                  <span className="progress-value">{project.progress}%</span>
                </div>
                <div className="progress-track">
                  <div
                    className="progress-fill"
                    style={{ width: `${project.progress}%` }}
                  />
                </div>
              </div>

              {/* Stats Row */}
              <div className="project-stats">
                <div className="project-stat stat-total">
                  <span className="project-stat-value">{project.issue_count}</span>
                  <span className="project-stat-label">Total</span>
                </div>
                <div className="project-stat stat-open">
                  <span className="project-stat-value">{project.open_issues}</span>
                  <span className="project-stat-label">Open</span>
                </div>
                <div className="project-stat stat-resolved">
                  <span className="project-stat-value">{project.resolved_issues}</span>
                  <span className="project-stat-label">Done</span>
                </div>
                <div className="project-stat stat-overdue">
                  <span className="project-stat-value">{project.overdue_issues}</span>
                  <span className="project-stat-label">Overdue</span>
                </div>
              </div>

              {/* Footer */}
              <div className="project-card-footer">
                <div className="project-meta">
                  {project.manager_name && (
                    <span className="project-meta-item">
                      <HiOutlineUser className="meta-icon" />
                      {project.manager_name}
                    </span>
                  )}
                  {(project.start_date || project.end_date) && (
                    <span className="project-meta-item">
                      <HiOutlineCalendar className="meta-icon" />
                      {formatDate(project.start_date)} – {formatDate(project.end_date)}
                    </span>
                  )}
                </div>
                {isAdmin && (
                  <div className="project-card-actions">
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => openEdit(project)}
                      title="Edit project"
                    >
                      <HiOutlinePencil />
                    </button>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => handleArchive(project)}
                      title={project.status === 'active' ? 'Archive project' : 'Restore project'}
                    >
                      {project.status === 'active' ? <HiOutlineArchive /> : <HiOutlineRefresh />}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <ProjectFormModal
        isOpen={modalOpen}
        onClose={closeModal}
        onSubmit={editingProject ? handleEdit : handleCreate}
        project={editingProject}
      />
    </div>
  )
}
