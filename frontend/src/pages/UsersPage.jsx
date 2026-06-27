/**
 * UsersPage — Admin user management panel.
 * Lists all users with search, filter, and CRUD actions.
 * Non-admin users see a "Permission Denied" message.
 */
import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { usersAPI } from '../services/api'
import { useToast, ToastContainer } from '../components/Toast'
import UserFormModal from '../components/UserFormModal'
import {
  HiOutlineSearch,
  HiOutlineUserAdd,
  HiOutlinePencil,
  HiOutlineBan,
  HiOutlineCheckCircle,
  HiOutlineUsers,
  HiOutlineShieldCheck,
  HiOutlineBriefcase,
  HiOutlineLockClosed,
} from 'react-icons/hi'
import './UsersPage.css'

function UsersPage() {
  const { user: currentUser } = useAuth()
  const isAdmin = currentUser?.role === 'admin'

  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [modalMode, setModalMode] = useState(null) // null | 'create' | 'edit'
  const [editingUser, setEditingUser] = useState(null)

  const { toasts, addToast, removeToast } = useToast()

  // ---- Fetch users ----
  const fetchUsers = useCallback(async () => {
    try {
      const params = {}
      if (roleFilter) params.role = roleFilter
      if (search.trim()) params.search = search.trim()
      const res = await usersAPI.list(params)
      setUsers(res.data.users)
    } catch (err) {
      addToast('Failed to load users', 'error')
    } finally {
      setLoading(false)
    }
  }, [roleFilter, search, addToast])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  // ---- Computed Stats ----
  const stats = {
    total: users.length,
    active: users.filter((u) => u.is_active).length,
    admins: users.filter((u) => u.role === 'admin').length,
    managers: users.filter((u) => u.role === 'manager').length,
  }

  // ---- Handlers ----
  const handleCreateUser = async (payload) => {
    await usersAPI.create(payload)
    addToast(`User "${payload.name}" created successfully`, 'success')
    setModalMode(null)
    fetchUsers()
  }

  const handleEditUser = async (payload) => {
    await usersAPI.update(editingUser.user_id, payload)
    addToast(`User "${payload.name}" updated successfully`, 'success')
    setModalMode(null)
    setEditingUser(null)
    fetchUsers()
  }

  const handleToggleStatus = async (user) => {
    const newActive = !user.is_active
    try {
      await usersAPI.setStatus(user.user_id, newActive)
      addToast(
        `User "${user.name}" ${newActive ? 'activated' : 'deactivated'}`,
        newActive ? 'success' : 'info'
      )
      fetchUsers()
    } catch (err) {
      const msg = err.response?.data?.error || 'Operation failed'
      addToast(msg, 'error')
    }
  }

  const openEdit = (user) => {
    setEditingUser(user)
    setModalMode('edit')
  }

  // ---- Permission check ----
  if (!isAdmin) {
    return (
      <div className="animate-fade-in" style={{ padding: '2rem' }}>
        <div className="glass-card permission-denied">
          <div className="permission-denied-icon">🔒</div>
          <h3 className="permission-denied-title">Access Restricted</h3>
          <p className="permission-denied-text">
            User management is available to administrators only.
            Contact your admin if you need access.
          </p>
        </div>
      </div>
    )
  }

  // ---- Format date ----
  const formatDate = (iso) => {
    if (!iso) return '—'
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <div className="animate-fade-in" style={{ padding: '2rem' }}>
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">User Management</h1>
          <p className="page-subtitle">Create, edit, and manage system users</p>
        </div>
        <button className="btn btn-primary btn-lg" onClick={() => setModalMode('create')}>
          <HiOutlineUserAdd />
          Add User
        </button>
      </div>

      {/* Stats */}
      <div className="users-stats">
        <div className="users-stat-card">
          <div className="users-stat-icon blue">
            <HiOutlineUsers />
          </div>
          <div>
            <div className="users-stat-value">{stats.total}</div>
            <div className="users-stat-label">Total Users</div>
          </div>
        </div>
        <div className="users-stat-card">
          <div className="users-stat-icon emerald">
            <HiOutlineCheckCircle />
          </div>
          <div>
            <div className="users-stat-value">{stats.active}</div>
            <div className="users-stat-label">Active</div>
          </div>
        </div>
        <div className="users-stat-card">
          <div className="users-stat-icon rose">
            <HiOutlineShieldCheck />
          </div>
          <div>
            <div className="users-stat-value">{stats.admins}</div>
            <div className="users-stat-label">Admins</div>
          </div>
        </div>
        <div className="users-stat-card">
          <div className="users-stat-icon amber">
            <HiOutlineBriefcase />
          </div>
          <div>
            <div className="users-stat-value">{stats.managers}</div>
            <div className="users-stat-label">Managers</div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="users-toolbar" style={{ marginBottom: 'var(--space-6)' }}>
        <div className="users-search">
          <HiOutlineSearch className="users-search-icon" />
          <input
            type="text"
            className="form-input"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="form-select users-filter-select"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
        >
          <option value="">All Roles</option>
          <option value="admin">Admin</option>
          <option value="manager">Manager</option>
          <option value="employee">Employee</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="loading-spinner">
          <div className="spinner" />
        </div>
      ) : users.length === 0 ? (
        <div className="glass-card empty-state">
          <div className="empty-state-icon">👥</div>
          <h3 className="empty-state-title">No Users Found</h3>
          <p className="empty-state-text">
            {search || roleFilter
              ? 'Try adjusting your search or filters.'
              : 'Create your first user to get started.'}
          </p>
        </div>
      ) : (
        <div className="users-table-container">
          <table className="users-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.user_id}>
                  <td>
                    <div className="user-info-cell">
                      <div className={`user-avatar ${u.role}`}>
                        {u.name?.charAt(0)}
                      </div>
                      <div>
                        <div className="user-name">{u.name}</div>
                        <div className="user-email">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`role-badge ${u.role}`}>{u.role}</span>
                  </td>
                  <td>
                    <span className={`status-indicator ${u.is_active ? 'active' : 'inactive'}`}>
                      <span className={`status-dot ${u.is_active ? 'active' : 'inactive'}`} />
                      {u.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>
                    {formatDate(u.created_at)}
                  </td>
                  <td>
                    <div className="user-actions">
                      <button
                        className="action-btn edit"
                        title="Edit user"
                        onClick={() => openEdit(u)}
                      >
                        <HiOutlinePencil />
                      </button>
                      {u.user_id !== currentUser?.user_id && (
                        <button
                          className={`action-btn ${u.is_active ? 'deactivate' : 'activate'}`}
                          title={u.is_active ? 'Deactivate user' : 'Activate user'}
                          onClick={() => handleToggleStatus(u)}
                        >
                          {u.is_active ? <HiOutlineBan /> : <HiOutlineCheckCircle />}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modals */}
      {modalMode === 'create' && (
        <UserFormModal
          mode="create"
          onClose={() => setModalMode(null)}
          onSubmit={handleCreateUser}
        />
      )}
      {modalMode === 'edit' && editingUser && (
        <UserFormModal
          mode="edit"
          user={editingUser}
          onClose={() => { setModalMode(null); setEditingUser(null) }}
          onSubmit={handleEditUser}
        />
      )}
    </div>
  )
}

export default UsersPage
