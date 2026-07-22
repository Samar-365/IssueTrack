import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import LoginPage from './pages/LoginPage'
import UsersPage from './pages/UsersPage'
import IssuesPage from './pages/IssuesPage'
import ProjectsPage from './pages/ProjectsPage'
import DashboardPage from './pages/DashboardPage'
import ActivityLogsPage from './pages/ActivityLogsPage'
import ReportsPage from './pages/ReportsPage'
import PixelIcon from './components/PixelIcon'
import './index.css'
import './App.css'

/* ---- Placeholder Pages (will be replaced module by module) ---- */
function PlaceholderPage({ title, subtitle }) {
  return (
    <div className="animate-fade-in" style={{ padding: '2rem' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">{title}</h1>
          <p className="page-subtitle">{subtitle}</p>
        </div>
      </div>
      <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
        <div className="empty-state-icon"><PixelIcon name="construction" size={36} color="var(--color-text-secondary)" /></div>
        <h3 className="empty-state-title">Coming Soon</h3>
        <p className="empty-state-text">This module is under construction and will be available shortly.</p>
      </div>
    </div>
  )
}

/* All pages are now real components — imported from pages/ */

/* ---- Sidebar Component ---- */
import { useLocation, Link } from 'react-router-dom'
import {
  HiOutlineViewGrid,
  HiOutlineFolder,
  HiOutlineTicket,
  HiOutlineUsers,
  HiOutlineClock,
  HiOutlineDocumentReport,
  HiOutlineLogout,
} from 'react-icons/hi'

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: HiOutlineViewGrid },
  { path: '/projects', label: 'Projects', icon: HiOutlineFolder },
  { path: '/issues', label: 'Issues', icon: HiOutlineTicket },
  { path: '/users', label: 'Users', icon: HiOutlineUsers },
  { path: '/activity', label: 'Activity Logs', icon: HiOutlineClock },
  { path: '/reports', label: 'Reports', icon: HiOutlineDocumentReport },
]

function Sidebar() {
  const location = useLocation()
  const { user, logout } = useAuth()

  const handleLogout = async () => {
    await logout()
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <span className="logo-text">IssueTracker</span>
        </div>
        <p className="sidebar-tagline">Mini Jira</p>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = location.pathname.startsWith(item.path)
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon className="sidebar-nav-icon" />
              <span>{item.label}</span>
              {isActive && <div className="sidebar-active-indicator" />}
            </Link>
          )
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user-info">
          <div className="sidebar-avatar">
            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div>
            <p className="sidebar-user-name">{user?.name || 'User'}</p>
            <p className="sidebar-user-role">
              {user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Unknown'}
            </p>
          </div>
        </div>
        <button className="sidebar-logout-btn" onClick={handleLogout} title="Sign out">
          <HiOutlineLogout />
        </button>
      </div>
    </aside>
  )
}

import NotificationDropdown from './components/NotificationDropdown'
import { HiOutlineSun, HiOutlineMoon } from 'react-icons/hi'
import { useState, useEffect } from 'react'

/* ---- Header Component ---- */
function Header() {
  const { user } = useAuth()
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light')

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))
  }

  return (
    <header className="app-header">
      <div className="header-search">
        <input
          type="text"
          className="form-input"
          placeholder="Search issues, projects..."
          style={{ maxWidth: '400px', background: 'var(--color-bg-tertiary)' }}
        />
      </div>
      <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
        <button
          className="btn btn-ghost btn-sm"
          onClick={toggleTheme}
          title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
          style={{ padding: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <PixelIcon name={theme === 'light' ? 'moon' : 'sun'} size={18} color="var(--color-icon-fill)" />
        </button>

        <NotificationDropdown />

        <span className="badge badge-emerald">{user?.role ? user.role.toUpperCase() : 'v1.0'}</span>
      </div>
    </header>
  )
}


/* ---- App Shell (protected layout wrapper) ---- */
function AppLayout() {
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-area">
        <Header />
        <main className="main-content">
          <Routes>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/issues" element={<IssuesPage />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/activity" element={<ActivityLogsPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}

/* ---- Main App ---- */
function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </Router>
  )
}

export default App
