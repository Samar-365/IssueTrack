/**
 * LoginPage — Unified Authentication Page (Sign In, Team ID Access & Sign Up)
 * Features 3 tabs:
 * 1. Sign In (Manager / Admin / Existing user)
 * 2. Team ID Login (Direct Employee workspace access with Team ID only)
 * 3. Create Account (Register new manager/team workspace)
 */
import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  HiOutlineMail,
  HiOutlineLockClosed,
  HiOutlineUser,
  HiOutlineUserGroup,
  HiOutlineExclamationCircle,
  HiOutlineInformationCircle,
} from 'react-icons/hi'
import PixelIcon from '../components/PixelIcon'
import './LoginPage.css'

function LoginPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialMode = searchParams.get('mode') === 'register' 
    ? 'register' 
    : searchParams.get('mode') === 'team'
      ? 'team'
      : 'login'
  const [mode, setMode] = useState(initialMode)

  // Login form state
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')

  // Team login form state (Direct employee login)
  const [teamLoginId, setTeamLoginId] = useState('')
  const [teamLoginName, setTeamLoginName] = useState('')

  // Register form state
  const [regName, setRegName] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regTeamId, setRegTeamId] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regConfirmPassword, setRegConfirmPassword] = useState('')
  const [regRole, setRole] = useState('manager')

  // Common UI state
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const navigate = useNavigate()
  const { login, register, teamLogin } = useAuth()

  // Sync mode with URL query params
  useEffect(() => {
    const urlMode = searchParams.get('mode') === 'register' 
      ? 'register' 
      : searchParams.get('mode') === 'team'
        ? 'team'
        : 'login'
    if (urlMode !== mode) {
      setMode(urlMode)
      setError('')
    }
  }, [searchParams])

  const switchMode = (newMode) => {
    setMode(newMode)
    setError('')
    setSearchParams(newMode === 'login' ? {} : { mode: newMode })
  }

  const handleLoginSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!loginEmail.trim() || !loginPassword.trim()) {
      setError('Please fill in all fields')
      return
    }

    setIsLoading(true)
    try {
      await login(loginEmail, loginPassword)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      const msg = err.response?.data?.error || 'Login failed. Please check your credentials.'
      setError(msg)
    } finally {
      setIsLoading(false)
    }
  }

  const handleTeamLoginSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!teamLoginId.trim()) {
      setError('Please enter your unique Team ID')
      return
    }

    setIsLoading(true)
    try {
      await teamLogin(teamLoginId.trim().toUpperCase(), teamLoginName.trim())
      navigate('/dashboard', { replace: true })
    } catch (err) {
      const msg = err.response?.data?.error || 'Team login failed. Please check your Team ID.'
      setError(msg)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRegisterSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!regName.trim()) {
      setError('Please enter your full name')
      return
    }
    if (!regEmail.trim()) {
      setError('Please enter your email address')
      return
    }
    if (!regTeamId.trim()) {
      setError('Please enter your unique Team ID / Code (e.g., TEAM-ALPHA)')
      return
    }
    if (!regPassword) {
      setError('Please enter a password')
      return
    }
    if (regPassword.length < 6) {
      setError('Password must be at least 6 characters long')
      return
    }
    if (regPassword !== regConfirmPassword) {
      setError('Passwords do not match')
      return
    }

    setIsLoading(true)
    try {
      await register(regName.trim(), regEmail.trim(), regPassword, regRole, regTeamId.trim().toUpperCase())
      navigate('/dashboard', { replace: true })
    } catch (err) {
      const msg = err.response?.data?.error || 'Registration failed. Please try again.'
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

      <div className="login-container animate-fade-in" style={{ maxWidth: '440px' }}>
        {/* Branding */}
        <div className="login-brand">
          <div className="login-logo-icon">
            <PixelIcon name="lightning" size={24} color="#ffffff" />
          </div>
          <h1 className="login-title">IssueTracker</h1>
          <p className="login-subtitle">
            {mode === 'login'
              ? 'Sign in to your account'
              : mode === 'team'
                ? 'Direct employee access with Team ID'
                : 'Create a new team workspace'}
          </p>
        </div>

        {/* Tab Switcher (3 Tabs) */}
        <div className="auth-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'login'}
            className={`auth-tab-btn ${mode === 'login' ? 'active' : ''}`}
            onClick={() => switchMode('login')}
          >
            Sign In
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'team'}
            className={`auth-tab-btn ${mode === 'team' ? 'active' : ''}`}
            onClick={() => switchMode('team')}
          >
            Team ID Access
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'register'}
            className={`auth-tab-btn ${mode === 'register' ? 'active' : ''}`}
            onClick={() => switchMode('register')}
          >
            Register
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="login-error animate-fade-in">
            <HiOutlineExclamationCircle className="login-error-icon" />
            <span>{error}</span>
          </div>
        )}

        {/* 1. SIGN IN FORM */}
        {mode === 'login' && (
          <form className="login-form animate-fade-in" onSubmit={handleLoginSubmit}>
            <div className="login-field">
              <label className="login-label" htmlFor="login-email">Email</label>
              <div className="login-input-wrapper">
                <HiOutlineMail className="login-input-icon" />
                <input
                  id="login-email"
                  type="email"
                  className="login-input"
                  placeholder="admin@admin.com"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
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
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
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
        )}

        {/* 2. TEAM ID LOGIN FORM (Direct Employee Access) */}
        {mode === 'team' && (
          <form className="login-form animate-fade-in" onSubmit={handleTeamLoginSubmit}>
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                padding: '12px 14px',
                background: 'var(--color-bg-primary)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md, 8px)',
                fontSize: '0.8rem',
                color: 'var(--color-text-secondary)',
                lineHeight: '1.4',
                marginBottom: '1.25rem',
              }}
            >
              <HiOutlineInformationCircle style={{ color: 'var(--color-primary)', fontSize: '1.3rem', flexShrink: 0, marginTop: '2px' }} />
              <span>
                <strong>Confidential Workspace Access:</strong> Only employees with the confidential Team ID provided directly by their Project Manager can enter and access team projects.
              </span>
            </div>

            <div className="login-field">
              <label className="login-label" htmlFor="team-login-id">Confidential Team ID / Code</label>
              <div className="login-input-wrapper">
                <HiOutlineUserGroup className="login-input-icon" />
                <input
                  id="team-login-id"
                  type="text"
                  className="login-input"
                  placeholder="e.g. TEAM-ALPHA-99"
                  value={teamLoginId}
                  onChange={(e) => setTeamLoginId(e.target.value)}
                  autoComplete="off"
                  autoFocus
                />
              </div>
            </div>

            <div className="login-field">
              <label className="login-label" htmlFor="team-login-name">Your Name</label>
              <div className="login-input-wrapper">
                <HiOutlineUser className="login-input-icon" />
                <input
                  id="team-login-name"
                  type="text"
                  className="login-input"
                  placeholder="e.g. Alex Mercer"
                  value={teamLoginName}
                  onChange={(e) => setTeamLoginName(e.target.value)}
                  autoComplete="name"
                />
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
                  Connecting to Team...
                </span>
              ) : (
                'Enter Workspace'
              )}
            </button>
          </form>
        )}

        {/* 3. REGISTER FORM */}
        {mode === 'register' && (
          <form className="login-form animate-fade-in" onSubmit={handleRegisterSubmit}>
            <div className="login-field">
              <label className="login-label" htmlFor="register-name">Full Name</label>
              <div className="login-input-wrapper">
                <HiOutlineUser className="login-input-icon" />
                <input
                  id="register-name"
                  type="text"
                  className="login-input"
                  placeholder="Alex Mercer"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  autoComplete="name"
                  autoFocus
                />
              </div>
            </div>

            <div className="login-field">
              <label className="login-label" htmlFor="register-email">Email Address</label>
              <div className="login-input-wrapper">
                <HiOutlineMail className="login-input-icon" />
                <input
                  id="register-email"
                  type="email"
                  className="login-input"
                  placeholder="alex@company.com"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="login-field">
              <label className="login-label" htmlFor="register-team">Team ID / Code</label>
              <div className="login-input-wrapper">
                <HiOutlineUserGroup className="login-input-icon" />
                <input
                  id="register-team"
                  type="text"
                  className="login-input"
                  placeholder="e.g. TEAM-ALPHA, DEV-01"
                  value={regTeamId}
                  onChange={(e) => setRegTeamId(e.target.value)}
                  autoComplete="off"
                />
              </div>
            </div>

            <div className="login-field">
              <label className="login-label" htmlFor="register-role">Workspace Role</label>
              <div className="login-input-wrapper">
                <HiOutlineUserGroup className="login-input-icon" />
                <select
                  id="register-role"
                  className="login-input register-select"
                  value={regRole}
                  onChange={(e) => setRole(e.target.value)}
                >
                  <option value="manager">Project Manager (Creates & Manages Team)</option>
                  <option value="employee">Employee / Developer</option>
                </select>
              </div>
            </div>

            <div className="login-field">
              <label className="login-label" htmlFor="register-password">Password</label>
              <div className="login-input-wrapper">
                <HiOutlineLockClosed className="login-input-icon" />
                <input
                  id="register-password"
                  type={showPassword ? 'text' : 'password'}
                  className="login-input"
                  placeholder="At least 6 characters"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  autoComplete="new-password"
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

            <div className="login-field">
              <label className="login-label" htmlFor="register-confirm-password">Confirm Password</label>
              <div className="login-input-wrapper">
                <HiOutlineLockClosed className="login-input-icon" />
                <input
                  id="register-confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  className="login-input"
                  placeholder="Re-enter password"
                  value={regConfirmPassword}
                  onChange={(e) => setRegConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                />
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
                  Creating account...
                </span>
              ) : (
                'Create Workspace'
              )}
            </button>
          </form>
        )}

        {/* Footer */}
        <div className="login-footer">
          <p style={{ marginBottom: '0.5rem' }}>
            {mode === 'login' ? (
              <>
                Are you an employee?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('team')}
                  className="auth-link-btn"
                >
                  Login with Team ID
                </button>
              </>
            ) : mode === 'team' ? (
              <>
                Have manager credentials?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="auth-link-btn"
                >
                  Sign In
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="auth-link-btn"
                >
                  Sign In
                </button>
              </>
            )}
          </p>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted, #71717a)' }}>
            Issue Tracking System v1.0
          </p>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
