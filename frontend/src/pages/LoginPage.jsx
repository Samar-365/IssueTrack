/**
 * LoginPage — Premium glassmorphism login form with validation,
 * error handling, and smooth animations.
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { HiOutlineMail, HiOutlineLockClosed, HiOutlineExclamationCircle } from 'react-icons/hi'
import PixelIcon from '../components/PixelIcon'
import './LoginPage.css'

function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const navigate = useNavigate()
  const { login } = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields')
      return
    }

    setIsLoading(true)
    try {
      await login(email, password)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      const msg = err.response?.data?.error || 'Login failed. Please try again.'
      setError(msg)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="login-page">
      {/* Animated background orbs */}
      <div className="login-bg-orb login-bg-orb-1" />
      <div className="login-bg-orb login-bg-orb-2" />
      <div className="login-bg-orb login-bg-orb-3" />

      <div className="login-container animate-fade-in">
        {/* Branding */}
        <div className="login-brand">
          <div className="login-logo-icon"><PixelIcon name="lightning" size={24} color="#ffffff" /></div>
          <h1 className="login-title">IssueTracker</h1>
          <p className="login-subtitle">Sign in to your workspace</p>
        </div>

        {/* Login Form */}
        <form className="login-form" onSubmit={handleSubmit}>
          {error && (
            <div className="login-error animate-fade-in">
              <HiOutlineExclamationCircle className="login-error-icon" />
              <span>{error}</span>
            </div>
          )}

          <div className="login-field">
            <label className="login-label" htmlFor="login-email">Email</label>
            <div className="login-input-wrapper">
              <HiOutlineMail className="login-input-icon" />
              <input
                id="login-email"
                type="email"
                className="login-input"
                placeholder="admin@admin.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                autoFocus
              />
            </div>
          </div>

          <div className="login-field">
            <label className="login-label" htmlFor="login-password">Password</label>
            <div className="login-input-wrapper">
              <HiOutlineLockClosed className="login-input-icon" />
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                className="login-input"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="login-toggle-password"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="login-submit-btn"
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="login-btn-loading">
                <span className="login-spinner" />
                Signing in...
              </span>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="login-footer">
          <p>Issue Tracking System v1.0</p>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
