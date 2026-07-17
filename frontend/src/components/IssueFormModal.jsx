/**
 * IssueFormModal — Create / Edit issue modal.
 * Reuses global modal classes from index.css.
 */
import { useState, useEffect } from 'react'
import { projectsAPI, issuesAPI } from '../services/api'

export default function IssueFormModal({ isOpen, onClose, onSubmit, issue }) {
  const isEdit = Boolean(issue)

  const [form, setForm] = useState({
    title: '',
    description: '',
    project_id: '',
    priority: 'medium',
    assigned_to: '',
    due_date: '',
  })
  const [projects, setProjects] = useState([])
  const [assignees, setAssignees] = useState([])
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  // Populate form when editing
  useEffect(() => {
    if (issue) {
      setForm({
        title: issue.title || '',
        description: issue.description || '',
        project_id: issue.project_id || '',
        priority: issue.priority || 'medium',
        assigned_to: issue.assigned_to || '',
        due_date: issue.due_date || '',
      })
    } else {
      setForm({
        title: '',
        description: '',
        project_id: '',
        priority: 'medium',
        assigned_to: '',
        due_date: '',
      })
    }
    setErrors({})
  }, [issue, isOpen])

  // Fetch projects and assignees when modal opens
  useEffect(() => {
    if (isOpen) {
      projectsAPI.list({ status: 'active' })
        .then(res => setProjects(res.data.projects || []))
        .catch(() => setProjects([]))

      issuesAPI.assignees()
        .then(res => setAssignees(res.data.assignees || []))
        .catch(() => setAssignees([]))
    }
  }, [isOpen])

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const validate = () => {
    const newErrors = {}
    if (!form.title.trim()) {
      newErrors.title = 'Issue title is required'
    }
    if (!form.project_id) {
      newErrors.project_id = 'Project is required'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return

    setSubmitting(true)
    try {
      const payload = {
        ...form,
        project_id: form.project_id ? Number(form.project_id) : null,
        assigned_to: form.assigned_to ? Number(form.assigned_to) : null,
        due_date: form.due_date || null,
      }
      await onSubmit(payload)
      onClose()
    } catch (err) {
      const msg = err.response?.data?.error || 'An error occurred'
      setErrors({ submit: msg })
    } finally {
      setSubmitting(false)
    }
  }

  if (!isOpen) return null

  const priorityOptions = [
    { value: 'low', label: '🟢 Low' },
    { value: 'medium', label: '🔵 Medium' },
    { value: 'high', label: '🟠 High' },
    { value: 'critical', label: '🔴 Critical' },
  ]

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '580px' }}>
        <div className="modal-header">
          <h2 className="modal-title">
            {isEdit ? 'Edit Issue' : 'Create New Issue'}
          </h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Title */}
          <div className="form-group" style={{ marginBottom: 'var(--space-4)' }}>
            <label className="form-label" htmlFor="issue-title">
              Title <span style={{ color: 'var(--color-accent-rose)' }}>*</span>
            </label>
            <input
              id="issue-title"
              className="form-input"
              type="text"
              name="title"
              value={form.title}
              onChange={handleChange}
              placeholder="Brief summary of the issue"
              autoFocus
            />
            {errors.title && (
              <span className="form-error">{errors.title}</span>
            )}
          </div>

          {/* Description */}
          <div className="form-group" style={{ marginBottom: 'var(--space-4)' }}>
            <label className="form-label" htmlFor="issue-desc">Description</label>
            <textarea
              id="issue-desc"
              className="form-textarea"
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="Detailed description of the issue, steps to reproduce, expected behavior…"
              rows={4}
            />
          </div>

          {/* Project + Priority row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="issue-project">
                Project <span style={{ color: 'var(--color-accent-rose)' }}>*</span>
              </label>
              <select
                id="issue-project"
                className="form-select"
                name="project_id"
                value={form.project_id}
                onChange={handleChange}
              >
                <option value="">— Select project —</option>
                {projects.map((p) => (
                  <option key={p.project_id} value={p.project_id}>
                    {p.project_name}
                  </option>
                ))}
              </select>
              {errors.project_id && (
                <span className="form-error">{errors.project_id}</span>
              )}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="issue-priority">Priority</label>
              <select
                id="issue-priority"
                className="form-select"
                name="priority"
                value={form.priority}
                onChange={handleChange}
              >
                {priorityOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Assignee + Due Date row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="issue-assignee">Assign To</label>
              <select
                id="issue-assignee"
                className="form-select"
                name="assigned_to"
                value={form.assigned_to}
                onChange={handleChange}
              >
                <option value="">— Unassigned —</option>
                {assignees.map((u) => (
                  <option key={u.user_id} value={u.user_id}>
                    {u.name} ({u.role})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="issue-due">Due Date</label>
              <input
                id="issue-due"
                className="form-input"
                type="date"
                name="due_date"
                value={form.due_date}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* Submit Error */}
          {errors.submit && (
            <div className="form-error" style={{ marginBottom: 'var(--space-4)', textAlign: 'center' }}>
              {errors.submit}
            </div>
          )}

          {/* Actions */}
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting
                ? (isEdit ? 'Saving…' : 'Creating…')
                : (isEdit ? 'Save Changes' : 'Create Issue')
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
