/**
 * RegisterPage — Sign-up page with validation, role selection,
 * password confirmation, and smooth switching to login.
 */
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  HiOutlineUser,
  HiOutlineMail,
  HiOutlineLockClosed,
  HiOutlineUserGroup,
  HiOutlineExclamationCircle,
} from 'react-icons/hi'
import PixelIcon from '../components/PixelIcon'
import './RegisterPage.css'
import './LoginPage.css'

function RegisterPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [teamId, setTeamId] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [role, setRole] = useState('employee')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const navigate = useNavigate()
  const { register } = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!name.trim()) {
      setError('Please enter your full name')
      return
    }
    if (!email.trim()) {
      setError('Please enter your email address')
      return
    }
    if (!teamId.trim()) {
      setError('Please enter your Team ID / Code (e.g., TEAM-ALPHA)')
      return
    }
    if (!password) {
      setError('Please enter a password')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setIsLoading(true)
    try {
      await register(name.trim(), email.trim(), password, role, teamId.trim().toUpperCase())
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

      <div className="login-container register-container animate-fade-in">
        {/* Branding */}
        <div className="login-brand">
          <div className="login-logo-icon">
            <PixelIcon name="lightning" size={24} color="#ffffff" />
          </div>
          <h1 className="login-title">Create Account</h1>
          <p className="login-subtitle">Join your team on IssueTrack</p>
        </div>

        {/* Registration Form */}
        <form className="login-form" onSubmit={handleSubmit}>
          {error && (
            <div className="login-error animate-fade-in">
              <HiOutlineExclamationCircle className="login-error-icon" />
              <span>{error}</span>
            </div>
          )}

          {/* Full Name */}
          <div className="login-field">
            <label className="login-label" htmlFor="register-name">Full Name</label>
            <div className="login-input-wrapper">
              <HiOutlineUser className="login-input-icon" />
              <input
                id="register-name"
                type="text"
                className="login-input"
                placeholder="Alex Mercer"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                autoFocus
              />
            </div>
          </div>

          {/* Email */}
          <div className="login-field">
            <label className="login-label" htmlFor="register-email">Email Address</label>
            <div className="login-input-wrapper">
              <HiOutlineMail className="login-input-icon" />
              <input
                id="register-email"
                type="email"
                className="login-input"
                placeholder="alex@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
          </div>

          {/* Team ID */}
          <div className="login-field">
            <label className="login-label" htmlFor="register-team">Team ID / Code</label>
            <div className="login-input-wrapper">
              <HiOutlineUserGroup className="login-input-icon" />
              <input
                id="register-team"
                type="text"
                className="login-input"
                placeholder="e.g. TEAM-ALPHA, DEV-01"
                value={teamId}
                onChange={(e) => setTeamId(e.target.value)}
                autoComplete="off"
              />
            </div>
          </div>

          {/* Role */}
          <div className="login-field">
            <label className="login-label" htmlFor="register-role">Workspace Role</label>
            <div className="login-input-wrapper">
              <HiOutlineUserGroup className="login-input-icon" />
              <select
                id="register-role"
                className="login-input register-select"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <option value="employee">Employee / Developer</option>
                <option value="manager">Project Manager</option>
              </select>
            </div>
          </div>

          {/* Password */}
          <div className="login-field">
            <label className="login-label" htmlFor="register-password">Password</label>
            <div className="login-input-wrapper">
              <HiOutlineLockClosed className="login-input-icon" />
              <input
                id="register-password"
                type={showPassword ? 'text' : 'password'}
                className="login-input"
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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

          {/* Confirm Password */}
          <div className="login-field">
            <label className="login-label" htmlFor="register-confirm-password">Confirm Password</label>
            <div className="login-input-wrapper">
              <HiOutlineLockClosed className="login-input-icon" />
              <input
                id="register-confirm-password"
                type={showPassword ? 'text' : 'password'}
                className="login-input"
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
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
              'Create Account'
            )}
          </button>
        </form>

        {/* Footer Navigation */}
        <div className="register-footer">
          <p>
            Already have an account?{' '}
            <Link to="/login" className="register-link">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default RegisterPage
