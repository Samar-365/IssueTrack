/**
 * CommentsPanel — Slide-over panel for viewing and managing comments on an issue.
 * FR-22: Add comments  |  FR-23: Edit comments  |  FR-24: Chronological display
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import { commentsAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'
import {
  HiOutlineX,
  HiOutlineChatAlt2,
  HiOutlinePencil,
  HiOutlineTrash,
  HiOutlinePaperAirplane,
  HiOutlineCheck,
} from 'react-icons/hi'
import './CommentsPanel.css'

export default function CommentsPanel({ isOpen, onClose, issue }) {
  const { user } = useAuth()
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(true)
  const [newComment, setNewComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editText, setEditText] = useState('')
  const [error, setError] = useState('')
  const listRef = useRef(null)
  const inputRef = useRef(null)

  // Fetch comments
  const fetchComments = useCallback(async () => {
    if (!issue) return
    try {
      setLoading(true)
      const res = await commentsAPI.list(issue.issue_id)
      setComments(res.data.comments || [])
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load comments')
    } finally {
      setLoading(false)
    }
  }, [issue])

  useEffect(() => {
    if (isOpen && issue) {
      fetchComments()
      setNewComment('')
      setEditingId(null)
      setError('')
    }
  }, [isOpen, issue, fetchComments])

  // Auto-scroll to bottom on new comments
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [comments])

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300)
    }
  }, [isOpen])

  // Add comment
  const handleAddComment = async (e) => {
    e.preventDefault()
    const text = newComment.trim()
    if (!text) return

    try {
      setSubmitting(true)
      setError('')
      await commentsAPI.add(issue.issue_id, text)
      setNewComment('')
      fetchComments()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add comment')
    } finally {
      setSubmitting(false)
    }
  }

  // Edit comment
  const startEdit = (comment) => {
    setEditingId(comment.comment_id)
    setEditText(comment.comment_text)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditText('')
  }

  const handleEditComment = async (commentId) => {
    const text = editText.trim()
    if (!text) return

    try {
      setError('')
      await commentsAPI.edit(commentId, text)
      setEditingId(null)
      setEditText('')
      fetchComments()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to edit comment')
    }
  }

  // Delete comment
  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('Delete this comment? This cannot be undone.')) return
    try {
      setError('')
      await commentsAPI.delete(commentId)
      fetchComments()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete comment')
    }
  }

  // Helpers
  const canEditComment = (comment) => {
    return comment.user_id === user?.user_id || user?.role === 'admin'
  }

  const canDeleteComment = (comment) => {
    return comment.user_id === user?.user_id || user?.role === 'admin' || user?.role === 'manager'
  }

  const formatTime = (dateStr) => {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    const now = new Date()
    const diffMs = now - d
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const getInitials = (name) => {
    if (!name) return 'U'
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
  }

  // Colors for avatars (deterministic based on name)
  const avatarColors = [
    '#2563eb', '#7c3aed', '#059669', '#d97706', '#e11d48',
    '#0891b2', '#4f46e5', '#16a34a', '#ea580c', '#db2777',
  ]

  const getAvatarColor = (name) => {
    if (!name) return avatarColors[0]
    const hash = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
    return avatarColors[hash % avatarColors.length]
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div className="comments-backdrop" onClick={onClose} />

      {/* Panel */}
      <div className={`comments-panel ${isOpen ? 'open' : ''}`}>
        {/* Header */}
        <div className="comments-panel-header">
          <div className="comments-panel-title-area">
            <HiOutlineChatAlt2 className="comments-panel-icon" />
            <div>
              <h2 className="comments-panel-title">Comments</h2>
              <p className="comments-panel-subtitle" title={issue?.title}>
                {issue?.title || 'Issue'}
              </p>
            </div>
          </div>
          <button className="comments-panel-close" onClick={onClose} title="Close" id="close-comments-panel">
            <HiOutlineX />
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="comments-error">
            {error}
          </div>
        )}

        {/* Comment list */}
        <div className="comments-list" ref={listRef}>
          {loading ? (
            <div className="comments-loading">
              {[1, 2, 3].map(i => (
                <div className="comment-skeleton" key={i}>
                  <div className="skeleton-circle" />
                  <div className="skeleton-block">
                    <div className="skeleton-line" style={{ width: '40%' }} />
                    <div className="skeleton-line" style={{ width: '80%' }} />
                    <div className="skeleton-line" style={{ width: '60%' }} />
                  </div>
                </div>
              ))}
            </div>
          ) : comments.length === 0 ? (
            <div className="comments-empty">
              <HiOutlineChatAlt2 className="comments-empty-icon" />
              <p className="comments-empty-title">No comments yet</p>
              <p className="comments-empty-text">
                Start the conversation by adding a comment below.
              </p>
            </div>
          ) : (
            comments.map((comment) => (
              <div className="comment-item" key={comment.comment_id}>
                <div
                  className="comment-avatar"
                  style={{ background: getAvatarColor(comment.author_name) }}
                >
                  {getInitials(comment.author_name)}
                </div>

                <div className="comment-body">
                  <div className="comment-meta">
                    <span className="comment-author">{comment.author_name || 'Unknown'}</span>
                    <span className="comment-time" title={comment.created_at}>
                      {formatTime(comment.created_at)}
                    </span>
                    {comment.updated_at && comment.updated_at !== comment.created_at && (
                      <span className="comment-edited">(edited)</span>
                    )}
                  </div>

                  {editingId === comment.comment_id ? (
                    <div className="comment-edit-area">
                      <textarea
                        className="form-textarea comment-edit-input"
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        rows={3}
                        autoFocus
                      />
                      <div className="comment-edit-actions">
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => handleEditComment(comment.comment_id)}
                          disabled={!editText.trim()}
                        >
                          <HiOutlineCheck /> Save
                        </button>
                        <button className="btn btn-secondary btn-sm" onClick={cancelEdit}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="comment-text">{comment.comment_text}</p>
                      <div className="comment-actions">
                        {canEditComment(comment) && (
                          <button
                            className="comment-action-btn"
                            onClick={() => startEdit(comment)}
                            title="Edit comment"
                          >
                            <HiOutlinePencil /> Edit
                          </button>
                        )}
                        {canDeleteComment(comment) && (
                          <button
                            className="comment-action-btn comment-action-delete"
                            onClick={() => handleDeleteComment(comment.comment_id)}
                            title="Delete comment"
                          >
                            <HiOutlineTrash /> Delete
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Add comment form */}
        <form className="comments-input-area" onSubmit={handleAddComment}>
          <div className="comments-input-row">
            <div
              className="comment-avatar comment-avatar-self"
              style={{ background: getAvatarColor(user?.name) }}
            >
              {getInitials(user?.name)}
            </div>
            <textarea
              ref={inputRef}
              className="form-textarea comments-input"
              placeholder="Write a comment…"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              rows={2}
              id="new-comment-input"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                  handleAddComment(e)
                }
              }}
            />
          </div>
          <div className="comments-input-footer">
            <span className="comments-input-hint">
              Ctrl + Enter to submit
            </span>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!newComment.trim() || submitting}
              id="submit-comment-btn"
            >
              <HiOutlinePaperAirplane style={{ transform: 'rotate(90deg)' }} />
              {submitting ? 'Sending…' : 'Send'}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}
