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
  HiOutlineTrash,
  HiOutlineUserRemove,
  HiOutlineUsers,
  HiOutlineShieldCheck,
  HiOutlineBriefcase,
  HiOutlineLockClosed,
} from 'react-icons/hi'
import './UsersPage.css'

function UsersPage() {
  const { user: currentUser } = useAuth()
  const isAdmin = currentUser?.role === 'admin'
  const isManager = currentUser?.role === 'manager'
  const isEmployee = currentUser?.role === 'employee'

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
    employees: users.filter((u) => u.role === 'employee').length,
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

  const handleDeleteUser = async (user) => {
    const isManagerWithTeam = user.role === 'manager' && user.team_id
    const confirmMsg = isManagerWithTeam
      ? `⚠️ WARNING: "${user.name}" is a Project Manager for Team "${user.team_id}". Deleting this manager will permanently delete the WHOLE TEAM (all team employees, projects, and issues). Are you sure you want to proceed?`
      : `Are you sure you want to permanently delete user "${user.name}" (${user.email})? This action cannot be undone.`

    if (window.confirm(confirmMsg)) {
      try {
        const res = await usersAPI.delete(user.user_id)
        addToast(res.data?.message || `User "${user.name}" deleted successfully`, 'success')
        fetchUsers()
      } catch (err) {
        const msg = err.response?.data?.error || 'Failed to delete user'
        addToast(msg, 'error')
      }
    }
  }

  const handleRemoveFromTeam = async (user) => {
    if (window.confirm(`Are you sure you want to remove employee "${user.name}" (${user.email}) from your team and projects?`)) {
      try {
        const res = await usersAPI.removeFromTeam(user.user_id)
        addToast(res.data?.message || `Employee "${user.name}" removed from team successfully`, 'success')
        fetchUsers()
      } catch (err) {
        const msg = err.response?.data?.error || 'Failed to remove employee from team'
        addToast(msg, 'error')
      }
    }
  }

  const openEdit = (user) => {
    setEditingUser(user)
    setModalMode('edit')
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
          <h1 className="page-title">
            {isAdmin ? 'User Management' : isManager ? 'Team Members' : 'Team Directory'}
          </h1>
          <p className="page-subtitle">
            {isAdmin
              ? 'Create, edit, and manage system users'
              : isManager
              ? `Manage and view employees joined under Team ${currentUser?.team_id || ''}`
              : `View your teammates and project manager in Team ${currentUser?.team_id || ''}`}
          </p>
        </div>
        {(isAdmin || isManager) && (
          <button className="btn btn-primary btn-lg" onClick={() => setModalMode('create')}>
            <HiOutlineUserAdd />
            {isAdmin ? 'Add User' : 'Add Employee'}
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="users-stats">
        <div className="users-stat-card">
          <div className="users-stat-icon blue">
            <HiOutlineUsers />
          </div>
          <div>
            <div className="users-stat-value">{stats.total}</div>
            <div className="users-stat-label">{isAdmin ? 'Total Users' : 'Team Members'}</div>
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
        {isAdmin ? (
          <>
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
          </>
        ) : isManager ? (
          <>
            <div className="users-stat-card">
              <div className="users-stat-icon amber">
                <HiOutlineBriefcase />
              </div>
              <div>
                <div className="users-stat-value">{stats.employees}</div>
                <div className="users-stat-label">Employees</div>
              </div>
            </div>
            <div className="users-stat-card">
              <div className="users-stat-icon rose">
                <HiOutlineShieldCheck />
              </div>
              <div>
                <div className="users-stat-value" style={{ fontSize: '1.25rem' }}>{currentUser?.team_id || '—'}</div>
                <div className="users-stat-label">Your Team ID</div>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="users-stat-card">
              <div className="users-stat-icon amber">
                <HiOutlineBriefcase />
              </div>
              <div>
                <div className="users-stat-value">{stats.managers}</div>
                <div className="users-stat-label">Project Manager</div>
              </div>
            </div>
            <div className="users-stat-card">
              <div className="users-stat-icon rose">
                <HiOutlineShieldCheck />
              </div>
              <div>
                <div className="users-stat-value" style={{ fontSize: '1.25rem' }}>{currentUser?.team_id || '—'}</div>
                <div className="users-stat-label">Your Team ID</div>
              </div>
            </div>
          </>
        )}
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
          {isAdmin && <option value="admin">Admin</option>}
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
              : isAdmin
              ? 'Create your first user to get started.'
              : isManager
              ? `No employees have joined team "${currentUser?.team_id || ''}" yet.`
              : `No other team members found for team "${currentUser?.team_id || ''}".`}
          </p>
        </div>
      ) : (
        <div className="users-table-container">
          <table className="users-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Team</th>
                <th>Role</th>
                <th>Status</th>
                <th>Created</th>
                <th>{isAdmin ? 'Actions' : isManager ? 'Actions' : 'Member Info'}</th>
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
                    {u.team_id ? (
                      <span className="badge badge-violet" style={{ fontSize: '0.72rem' }}>{u.team_id}</span>
                    ) : (
                      <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>—</span>
                    )}
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
                    {isAdmin ? (
                      <div className="user-actions">
                        <button
                          className="action-btn edit"
                          title="Edit user"
                          onClick={() => openEdit(u)}
                        >
                          <HiOutlinePencil />
                        </button>
                        {u.user_id !== currentUser?.user_id && (
                          <>
                            <button
                              className={`action-btn ${u.is_active ? 'deactivate' : 'activate'}`}
                              title={u.is_active ? 'Deactivate user' : 'Activate user'}
                              onClick={() => handleToggleStatus(u)}
                            >
                              {u.is_active ? <HiOutlineBan /> : <HiOutlineCheckCircle />}
                            </button>
                            <button
                              className="action-btn deactivate"
                              title="Delete user"
                              onClick={() => handleDeleteUser(u)}
                              style={{ color: 'var(--color-accent-rose)' }}
                            >
                              <HiOutlineTrash />
                            </button>
                          </>
                        )}
                      </div>
                    ) : isManager ? (
                      <div className="user-actions">
                        {u.user_id === currentUser?.user_id ? (
                          <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>
                            (You - Manager)
                          </span>
                        ) : (
                          <button
                            className="action-btn deactivate"
                            title="Remove employee from team & projects"
                            onClick={() => handleRemoveFromTeam(u)}
                            style={{ color: 'var(--color-accent-rose)' }}
                          >
                            <HiOutlineUserRemove />
                          </button>
                        )}
                      </div>
                    ) : (
                      <div style={{ fontSize: 'var(--font-size-sm)' }}>
                        {u.user_id === currentUser?.user_id ? (
                          <span style={{ color: 'var(--color-primary)', fontWeight: 600 }}>(You)</span>
                        ) : u.role === 'manager' ? (
                          <span className="badge badge-violet" style={{ fontSize: '0.72rem' }}>Project Manager</span>
                        ) : (
                          <span style={{ color: 'var(--color-text-muted)' }}>Teammate</span>
                        )}
                      </div>
                    )}
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
          currentUser={currentUser}
          onClose={() => setModalMode(null)}
          onSubmit={handleCreateUser}
        />
      )}
      {modalMode === 'edit' && editingUser && (
        <UserFormModal
          mode="edit"
          user={editingUser}
          currentUser={currentUser}
          onClose={() => { setModalMode(null); setEditingUser(null) }}
          onSubmit={handleEditUser}
        />
      )}
    </div>
  )
}

export default UsersPage
