/**
 * GitHubEventsModal — Displays linked Git commits and Pull Requests for an issue.
 * Shows commit SHA, branch, author, message, status transition chips, and direct GitHub links.
 */
import { useState, useEffect } from 'react'
import { webhooksAPI } from '../services/api'
import {
  HiOutlineX,
  HiOutlineExternalLink,
  HiOutlineCode,
  HiOutlineClock,
  HiOutlineCheckCircle,
  HiOutlinePlay,
  HiOutlineLink,
} from 'react-icons/hi'
import { FaGithub, FaCodeBranch, FaCodeCommit, FaCodePullRequest } from 'react-icons/fa6'
import './GitHubEventsModal.css'

export default function GitHubEventsModal({ isOpen, onClose, issue }) {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen && issue) {
      const fetchEvents = async () => {
        try {
          setLoading(true)
          setError('')
          const res = await webhooksAPI.events(issue.issue_id)
          setEvents(res.data.events || [])
        } catch (err) {
          setError(err.response?.data?.error || 'Failed to load linked GitHub activity')
        } finally {
          setLoading(false)
        }
      }
      fetchEvents()
    }
  }, [isOpen, issue])

  if (!isOpen || !issue) return null

  const getActionBadge = (action) => {
    switch (action) {
      case 'status_resolved':
        return (
          <span className="gh-action-badge action-resolved">
            <HiOutlineCheckCircle /> Resolved via Commit
          </span>
        )
      case 'status_in_progress':
        return (
          <span className="gh-action-badge action-progress">
            <HiOutlinePlay /> In Progress
          </span>
        )
      default:
        return (
          <span className="gh-action-badge action-linked">
            <HiOutlineLink /> Linked
          </span>
        )
    }
  }

  const formatTimestamp = (isoString) => {
    if (!isoString) return ''
    const date = new Date(isoString)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="gh-modal-overlay" onClick={onClose}>
      <div className="gh-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="gh-modal-header">
          <div className="gh-header-left">
            <div className="gh-icon-box">
              <FaGithub className="gh-icon-main" />
            </div>
            <div>
              <h3 className="gh-modal-title">GitHub Activity</h3>
              <p className="gh-modal-subtitle">
                Issue #{issue.issue_id}: <span className="gh-issue-title">{issue.title}</span>
              </p>
            </div>
          </div>
          <button className="gh-close-btn" onClick={onClose} title="Close">
            <HiOutlineX />
          </button>
        </div>

        {/* Content Body */}
        <div className="gh-modal-body">
          {loading && (
            <div className="gh-loading-state">
              <div className="gh-spinner" />
              <p>Loading linked commits and pull requests…</p>
            </div>
          )}

          {error && !loading && (
            <div className="gh-error-state">
              <p>{error}</p>
            </div>
          )}

          {!loading && !error && events.length === 0 && (
            <div className="gh-empty-state">
              <div className="gh-empty-icon">
                <FaCodeCommit />
              </div>
              <h4>No GitHub activity linked yet</h4>
              <p>
                Mention this issue in a commit message or PR title to link code activity automatically:
              </p>
              <div className="gh-code-tip">
                <code>git commit -m "Fix bug in auth (Fixes #{issue.issue_id})"</code>
              </div>
              <ul className="gh-tips-list">
                <li><code>Fixes #{issue.issue_id}</code> — Marks issue as <strong>Resolved</strong></li>
                <li><code>WIP #{issue.issue_id}</code> — Moves issue to <strong>In Progress</strong></li>
                <li><code>#{issue.issue_id}</code> — Links commit reference</li>
              </ul>
            </div>
          )}

          {!loading && !error && events.length > 0 && (
            <div className="gh-timeline">
              <div className="gh-timeline-summary">
                <span className="gh-count-pill">
                  {events.length} {events.length === 1 ? 'Linked Event' : 'Linked Events'}
                </span>
              </div>

              {events.map((ev) => (
                <div key={ev.event_id} className="gh-timeline-item">
                  <div className="gh-item-icon-wrapper">
                    {ev.event_type === 'pull_request' ? (
                      <FaCodePullRequest className="gh-type-icon pr" />
                    ) : (
                      <FaCodeCommit className="gh-type-icon commit" />
                    )}
                  </div>

                  <div className="gh-item-card">
                    {/* Item Top Bar */}
                    <div className="gh-item-top">
                      <div className="gh-ref-group">
                        <span className="gh-ref-tag">
                          {ev.short_sha || ev.github_ref}
                        </span>
                        {ev.branch && (
                          <span className="gh-branch-tag">
                            <FaCodeBranch style={{ fontSize: '0.7rem' }} />
                            {ev.branch}
                          </span>
                        )}
                        {getActionBadge(ev.action_taken)}
                      </div>

                      {ev.url && (
                        <a
                          href={ev.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="gh-external-link"
                          title="View on GitHub"
                        >
                          View on GitHub <HiOutlineExternalLink />
                        </a>
                      )}
                    </div>

                    {/* Commit Message */}
                    <p className="gh-commit-msg">{ev.message}</p>

                    {/* Item Footer */}
                    <div className="gh-item-footer">
                      <div className="gh-author-info">
                        {ev.author_avatar ? (
                          <img src={ev.author_avatar} alt="" className="gh-author-avatar" />
                        ) : (
                          <div className="gh-author-avatar-fallback">
                            {(ev.author_name || 'U').charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span className="gh-author-name">{ev.author_name || 'GitHub User'}</span>
                      </div>

                      <div className="gh-timestamp">
                        <HiOutlineClock style={{ fontSize: '0.85rem' }} />
                        <span>{formatTimestamp(ev.timestamp)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
