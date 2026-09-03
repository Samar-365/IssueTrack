/**
 * ProjectMembersModal — Displays team members assigned to a project,
 * with ability for managers/admins to remove members from the project.
 */
import { useState, useEffect, useCallback } from 'react'
import { projectsAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'
import {
  HiOutlineUsers,
  HiOutlineUserRemove,
  HiOutlineX,
  HiOutlineShieldCheck,
  HiOutlineMail,
} from 'react-icons/hi'

export default function ProjectMembersModal({ isOpen, onClose, project, onMemberRemoved }) {
  const { user: currentUser } = useAuth()
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')

  const fetchMembers = useCallback(async () => {
    if (!project) return
    setLoading(true)
    setError('')
    try {
      const res = await projectsAPI.members(project.project_id)
      setMembers(res.data.members || [])
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch project members')
    } finally {
      setLoading(false)
    }
  }, [project])

  useEffect(() => {
    if (isOpen && project) {
      fetchMembers()
    }
  }, [isOpen, project, fetchMembers])

  if (!isOpen || !project) return null

  const handleRemoveMember = async (member) => {
    if (!window.confirm(`Are you sure you want to remove ${member.name} from "${project.project_name}"?`)) {
      return
    }

    setActionError('')
    try {
      await projectsAPI.removeMember(project.project_id, member.user_id)
      if (onMemberRemoved) {
        onMemberRemoved(member)
      }
      fetchMembers()
    } catch (err) {
      setActionError(err.response?.data?.error || 'Failed to remove member')
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-container glass-card animate-scale-up"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '560px', width: '90%' }}
      >
        {/* Header */}
        <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: 'var(--radius-lg)',
                background: 'rgba(99, 102, 241, 0.15)',
                color: 'var(--color-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.2rem',
              }}
            >
              <HiOutlineUsers />
            </div>
            <div>
              <h3 className="modal-title" style={{ margin: 0 }}>Project Members</h3>
              <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
                {project.project_name} {project.team_id ? `(Team: ${project.team_id})` : ''}
              </p>
            </div>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>
            <HiOutlineX />
          </button>
        </div>

        {/* Error Alert */}
        {(error || actionError) && (
          <div className="alert alert-error" style={{ marginBottom: 'var(--space-4)' }}>
            {error || actionError}
          </div>
        )}

        {/* Member List */}
        <div style={{ maxHeight: '360px', overflowY: 'auto', padding: '4px 0' }}>
          {loading ? (
            <div className="loading-spinner" style={{ padding: '2rem' }}>
              <div className="spinner" />
            </div>
          ) : members.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>
              No members found in this project/team.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {members.map((m) => {
                const isSelf = m.user_id === currentUser?.user_id
                return (
                  <div
                    key={m.user_id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      background: 'rgba(255, 255, 255, 0.03)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div
                        className={`user-avatar ${m.role}`}
                        style={{
                          width: '36px',
                          height: '36px',
                          fontSize: '0.9rem',
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: '50%',
                        }}
                      >
                        {m.name?.charAt(0)?.toUpperCase()}
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontWeight: 600, fontSize: '0.92rem' }}>{m.name}</span>
                          <span className={`role-badge ${m.role}`} style={{ fontSize: '0.68rem', padding: '2px 6px' }}>
                            {m.role}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <HiOutlineMail />
                          {m.email}
                        </div>
                      </div>
                    </div>

                    <div>
                      {isSelf ? (
                        <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                          You
                        </span>
                      ) : (
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ color: 'var(--color-accent-rose)' }}
                          title="Remove member from project"
                          onClick={() => handleRemoveMember(m)}
                        >
                          <HiOutlineUserRemove style={{ marginRight: '4px' }} /> Remove
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer" style={{ marginTop: 'var(--space-4)', display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
