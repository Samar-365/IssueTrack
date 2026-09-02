/**
 * GitHubWebhookModal — Displays project-specific webhook configuration,
 * 1-click copy for URL & Secret, show/hide secret toggle, and secret rotation.
 */
import { useState, useEffect } from 'react'
import { projectsAPI } from '../services/api'
import {
  HiOutlineClipboardCopy,
  HiOutlineCheck,
  HiOutlineEye,
  HiOutlineEyeOff,
  HiOutlineRefresh,
  HiOutlineExternalLink,
  HiOutlineShieldCheck,
  HiOutlineInformationCircle,
} from 'react-icons/hi'
import PixelIcon from './PixelIcon'
import './GitHubWebhookModal.css'

export default function GitHubWebhookModal({ isOpen, onClose, project, onSecretRotated }) {
  const [config, setConfig] = useState(null)
  const [loading, setLoading] = useState(true)
  const [rotating, setRotating] = useState(false)
  const [showSecret, setShowSecret] = useState(false)
  const [copiedField, setCopiedField] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen && project) {
      setLoading(true)
      setError('')
      projectsAPI.getWebhookConfig(project.project_id)
        .then((res) => {
          setConfig(res.data)
        })
        .catch((err) => {
          setError(err.response?.data?.error || 'Failed to fetch webhook configuration')
        })
        .finally(() => setLoading(false))
    }
  }, [isOpen, project])

  if (!isOpen || !project) return null

  const handleCopy = (text, fieldName) => {
    navigator.clipboard.writeText(text)
    setCopiedField(fieldName)
    setTimeout(() => setCopiedField(null), 2000)
  }

  const handleRotateSecret = async () => {
    const confirmMsg = 'Are you sure you want to rotate the webhook secret? Any existing webhooks in GitHub using the old secret will fail until updated.'
    if (!window.confirm(confirmMsg)) return

    setRotating(true)
    setError('')
    try {
      const res = await projectsAPI.rotateWebhookSecret(project.project_id)
      const newSecret = res.data.webhook_secret
      setConfig((prev) => ({ ...prev, webhook_secret: newSecret }))
      if (onSecretRotated) onSecretRotated(newSecret)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to rotate webhook secret')
    } finally {
      setRotating(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content webhook-modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div className="webhook-modal-title-wrap">
            <div className="webhook-badge-icon">
              <PixelIcon name="code" size={20} color="#2563eb" />
            </div>
            <div>
              <h2 className="modal-title">GitHub Webhook Integration</h2>
              <p className="webhook-modal-subtitle">
                Project: <strong>{project.project_name}</strong>
                {project.github_repo && <span className="webhook-repo-tag">({project.github_repo})</span>}
              </p>
            </div>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {/* Modal Body */}
        <div className="webhook-modal-body">
          {error && (
            <div className="form-error" style={{ marginBottom: 'var(--space-4)', padding: '0.75rem', borderRadius: 'var(--radius-md)' }}>
              {error}
            </div>
          )}

          {loading ? (
            <div style={{ padding: '2.5rem', textAlign: 'center' }}>
              <div className="login-spinner" style={{ margin: '0 auto 1rem auto' }} />
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>Loading webhook credentials…</p>
            </div>
          ) : (
            <>
              {/* Webhook URL */}
              <div className="webhook-field-group">
                <label className="form-label" htmlFor="webhook-url">
                  Payload URL
                </label>
                <div className="webhook-input-btn-wrap">
                  <input
                    id="webhook-url"
                    className="form-input webhook-code-input"
                    type="text"
                    readOnly
                    value={config?.webhook_url || ''}
                  />
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm webhook-copy-btn"
                    onClick={() => handleCopy(config?.webhook_url, 'url')}
                    title="Copy Payload URL"
                  >
                    {copiedField === 'url' ? (
                      <span className="copied-text"><HiOutlineCheck /> Copied</span>
                    ) : (
                      <span><HiOutlineClipboardCopy /> Copy</span>
                    )}
                  </button>
                </div>
                <span className="webhook-field-hint">
                  Dedicated URL for this project. Events received here only affect issues in <strong>{project.project_name}</strong>.
                </span>
              </div>

              {/* Secret Token */}
              <div className="webhook-field-group">
                <div className="webhook-label-row">
                  <label className="form-label" htmlFor="webhook-secret">
                    Webhook Secret (HMAC-SHA256)
                  </label>
                  <button
                    type="button"
                    className="webhook-rotate-btn"
                    onClick={handleRotateSecret}
                    disabled={rotating}
                    title="Regenerate a new cryptographic secret"
                  >
                    <HiOutlineRefresh className={rotating ? 'spin-anim' : ''} />
                    {rotating ? 'Rotating…' : 'Rotate Secret'}
                  </button>
                </div>
                <div className="webhook-input-btn-wrap">
                  <input
                    id="webhook-secret"
                    className="form-input webhook-code-input"
                    type={showSecret ? 'text' : 'password'}
                    readOnly
                    value={config?.webhook_secret || ''}
                  />
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => setShowSecret(!showSecret)}
                    title={showSecret ? 'Hide Secret' : 'Show Secret'}
                  >
                    {showSecret ? <HiOutlineEyeOff /> : <HiOutlineEye />}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm webhook-copy-btn"
                    onClick={() => handleCopy(config?.webhook_secret, 'secret')}
                    title="Copy Secret"
                  >
                    {copiedField === 'secret' ? (
                      <span className="copied-text"><HiOutlineCheck /> Copied</span>
                    ) : (
                      <span><HiOutlineClipboardCopy /> Copy</span>
                    )}
                  </button>
                </div>
                <span className="webhook-field-hint">
                  Auto-generated 64-character high-entropy secret. Used by GitHub to sign payload headers.
                </span>
              </div>

              {/* Step-by-step Setup Guide */}
              <div className="webhook-guide-card">
                <div className="webhook-guide-header">
                  <HiOutlineShieldCheck style={{ color: 'var(--color-primary)', fontSize: '1.25rem' }} />
                  <h4>GitHub Repository Setup Guide</h4>
                </div>
                <ol className="webhook-guide-steps">
                  <li>
                    Open your repository on <strong>GitHub</strong> &rarr; <strong>Settings</strong> &rarr; <strong>Webhooks</strong> &rarr; click <strong>Add webhook</strong>.
                  </li>
                  <li>
                    Paste the <strong>Payload URL</strong> above into the GitHub <em>Payload URL</em> input.
                  </li>
                  <li>
                    Select <strong>Content type:</strong> <code>application/json</code>.
                  </li>
                  <li>
                    Paste the <strong>Webhook Secret</strong> into the <em>Secret</em> field.
                  </li>
                  <li>
                    Under <em>Which events would you like to trigger this webhook?</em>, select <strong>Let me select individual events</strong> and check:
                    <ul className="webhook-events-list">
                      <li>[x] <strong>Pushes</strong> (triggers on git commits mentioning <code>Fixes #&lt;id&gt;</code>)</li>
                      <li>[x] <strong>Pull requests</strong> (triggers on PR open/merge)</li>
                    </ul>
                  </li>
                  <li>Click <strong>Add webhook</strong> to save.</li>
                </ol>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="modal-actions" style={{ justifyContent: 'flex-end', marginTop: 'var(--space-4)' }}>
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
