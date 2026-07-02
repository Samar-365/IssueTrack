/**
 * ProjectFormModal — Create / Edit project modal.
 * Reuses global modal classes from index.css.
 */
import { useState, useEffect } from 'react'
import { usersAPI } from '../services/api'

export default function ProjectFormModal({ isOpen, onClose, onSubmit, project }) {
  const isEdit = Boolean(project)

  const [form, setForm] = useState({
    project_name: '',
    description: '',
    start_date: '',
    end_date: '',
    manager_id: '',
  })
  const [managers, setManagers] = useState([])
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  // Populate form when editing
  useEffect(() => {
    if (project) {
      setForm({
        project_name: project.project_name || '',
        description: project.description || '',
        start_date: project.start_date || '',
        end_date: project.end_date || '',
        manager_id: project.manager_id || '',
      })
    } else {
      setForm({
        project_name: '',
        description: '',
        start_date: '',
        end_date: '',
        manager_id: '',
      })
    }
    setErrors({})
  }, [project, isOpen])

  // Fetch managers list
  useEffect(() => {
    if (isOpen) {
      usersAPI.list({ role: 'manager', is_active: 'true' })
        .then(res => {
          // Also include admins (they can manage projects too)
          usersAPI.list({ role: 'admin', is_active: 'true' })
            .then(adminRes => {
              const allManagers = [
                ...(res.data.users || []),
                ...(adminRes.data.users || []),
              ]
              // Deduplicate by user_id
              const unique = allManagers.filter(
                (u, i, arr) => arr.findIndex(x => x.user_id === u.user_id) === i
              )
              setManagers(unique)
            })
            .catch(() => setManagers(res.data.users || []))
        })
        .catch(() => setManagers([]))
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
    if (!form.project_name.trim()) {
      newErrors.project_name = 'Project name is required'
    }
    if (form.start_date && form.end_date && form.end_date < form.start_date) {
      newErrors.end_date = 'End date cannot be before start date'
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
        manager_id: form.manager_id ? Number(form.manager_id) : null,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
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

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">
            {isEdit ? 'Edit Project' : 'Create New Project'}
          </h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Project Name */}
          <div className="form-group" style={{ marginBottom: 'var(--space-4)' }}>
            <label className="form-label" htmlFor="project-name">
              Project Name <span style={{ color: 'var(--color-accent-rose)' }}>*</span>
            </label>
            <input
              id="project-name"
              className="form-input"
              type="text"
              name="project_name"
              value={form.project_name}
              onChange={handleChange}
              placeholder="Enter project name"
              autoFocus
            />
            {errors.project_name && (
              <span className="form-error">{errors.project_name}</span>
            )}
          </div>

          {/* Description */}
          <div className="form-group" style={{ marginBottom: 'var(--space-4)' }}>
            <label className="form-label" htmlFor="project-desc">Description</label>
            <textarea
              id="project-desc"
              className="form-textarea"
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="Describe the project scope and goals"
              rows={3}
            />
          </div>

          {/* Dates Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="project-start">Start Date</label>
              <input
                id="project-start"
                className="form-input"
                type="date"
                name="start_date"
                value={form.start_date}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="project-end">End Date</label>
              <input
                id="project-end"
                className="form-input"
                type="date"
                name="end_date"
                value={form.end_date}
                onChange={handleChange}
              />
              {errors.end_date && (
                <span className="form-error">{errors.end_date}</span>
              )}
            </div>
          </div>

          {/* Manager */}
          <div className="form-group" style={{ marginBottom: 'var(--space-4)' }}>
            <label className="form-label" htmlFor="project-manager">Assigned Manager</label>
            <select
              id="project-manager"
              className="form-select"
              name="manager_id"
              value={form.manager_id}
              onChange={handleChange}
            >
              <option value="">— No manager assigned —</option>
              {managers.map((m) => (
                <option key={m.user_id} value={m.user_id}>
                  {m.name} ({m.role})
                </option>
              ))}
            </select>
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
                : (isEdit ? 'Save Changes' : 'Create Project')
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
