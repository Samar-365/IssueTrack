/**
 * UserFormModal — Modal dialog for creating or editing a user.
 * Adapts its title and fields based on the `mode` prop ('create' | 'edit').
 */
import { useState, useEffect } from 'react'
import { HiOutlineX } from 'react-icons/hi'

const ROLES = [
  { value: 'employee', label: 'Employee' },
  { value: 'manager', label: 'Manager' },
  { value: 'admin', label: 'Admin' },
]

function UserFormModal({ mode = 'create', user = null, onClose, onSubmit }) {
  const isEdit = mode === 'edit'

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'employee',
  })
  const [errors, setErrors] = useState({})
  const [isLoading, setIsLoading] = useState(false)

  // Populate form when editing
  useEffect(() => {
    if (isEdit && user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        password: '',
        role: user.role || 'employee',
      })
    }
  }, [isEdit, user])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    // Clear field error on change
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }))
    }
  }

  const validate = () => {
    const errs = {}
    if (!formData.name.trim()) errs.name = 'Name is required'
    if (!formData.email.trim()) errs.email = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(formData.email)) errs.email = 'Invalid email format'
    if (!isEdit && (!formData.password || formData.password.length < 6)) {
      errs.password = 'Password must be at least 6 characters'
    }
    if (isEdit && formData.password && formData.password.length < 6) {
      errs.password = 'Password must be at least 6 characters'
    }
    return errs
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) {
      setErrors(errs)
      return
    }

    setIsLoading(true)
    try {
      // Build payload — omit empty password on edit
      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        role: formData.role,
      }
      if (formData.password) {
        payload.password = formData.password
      }
      await onSubmit(payload)
    } catch (err) {
      const msg = err.response?.data?.error || 'Operation failed'
      setErrors({ form: msg })
    } finally {
      setIsLoading(false)
    }
  }

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content animate-slide-up" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <h2 className="modal-title">{isEdit ? 'Edit User' : 'Create User'}</h2>
          <button className="modal-close" onClick={onClose}>
            <HiOutlineX />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {errors.form && (
            <div className="form-error" style={{ marginBottom: 'var(--space-4)', fontSize: 'var(--font-size-sm)' }}>
              {errors.form}
            </div>
          )}

          {/* Name */}
          <div className="form-group" style={{ marginBottom: 'var(--space-4)' }}>
            <label className="form-label" htmlFor="user-name">Full Name</label>
            <input
              id="user-name"
              name="name"
              type="text"
              className="form-input"
              placeholder="John Doe"
              value={formData.name}
              onChange={handleChange}
              autoFocus
            />
            {errors.name && <span className="form-error">{errors.name}</span>}
          </div>

          {/* Email */}
          <div className="form-group" style={{ marginBottom: 'var(--space-4)' }}>
            <label className="form-label" htmlFor="user-email">Email Address</label>
            <input
              id="user-email"
              name="email"
              type="email"
              className="form-input"
              placeholder="user@example.com"
              value={formData.email}
              onChange={handleChange}
            />
            {errors.email && <span className="form-error">{errors.email}</span>}
          </div>

          {/* Password */}
          <div className="form-group" style={{ marginBottom: 'var(--space-4)' }}>
            <label className="form-label" htmlFor="user-password">
              Password{isEdit && ' (leave blank to keep unchanged)'}
            </label>
            <input
              id="user-password"
              name="password"
              type="password"
              className="form-input"
              placeholder={isEdit ? '••••••••' : 'Min 6 characters'}
              value={formData.password}
              onChange={handleChange}
            />
            {errors.password && <span className="form-error">{errors.password}</span>}
          </div>

          {/* Role */}
          <div className="form-group" style={{ marginBottom: 'var(--space-6)' }}>
            <label className="form-label" htmlFor="user-role">Role</label>
            <select
              id="user-role"
              name="role"
              className="form-select"
              value={formData.role}
              onChange={handleChange}
            >
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          {/* Actions */}
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isLoading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isLoading}>
              {isLoading
                ? (isEdit ? 'Saving...' : 'Creating...')
                : (isEdit ? 'Save Changes' : 'Create User')
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default UserFormModal
