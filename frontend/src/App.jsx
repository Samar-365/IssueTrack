import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'

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
        <div className="empty-state-icon">🚧</div>
        <h3 className="empty-state-title">Coming Soon</h3>
        <p className="empty-state-text">This module is under construction and will be available shortly.</p>
      </div>
    </div>
  )
}

function Dashboard() {
  return <PlaceholderPage title="Dashboard" subtitle="Overview of all projects and issues" />
}
function Projects() {
  return <PlaceholderPage title="Projects" subtitle="Manage your projects" />
}
function Issues() {
  return <PlaceholderPage title="Issues" subtitle="Track and manage issues" />
}
function Users() {
  return <PlaceholderPage title="User Management" subtitle="Manage system users" />
}
function ActivityLogs() {
  return <PlaceholderPage title="Activity Logs" subtitle="View system activity" />
}
function Reports() {
  return <PlaceholderPage title="Reports" subtitle="Generate and export reports" />
}

/* ---- Sidebar Component ---- */
import { useLocation, Link } from 'react-router-dom'
import { HiOutlineViewGrid, HiOutlineFolder, HiOutlineTicket, HiOutlineUsers, HiOutlineClock, HiOutlineDocumentReport } from 'react-icons/hi'

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

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <span className="logo-icon">⚡</span>
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
          <div className="sidebar-avatar">A</div>
          <div>
            <p className="sidebar-user-name">Admin</p>
            <p className="sidebar-user-role">System Admin</p>
          </div>
        </div>
      </div>
    </aside>
  )
}

/* ---- Header Component ---- */
function Header() {
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
      <div className="header-actions">
        <span className="badge badge-emerald">v1.0</span>
      </div>
    </header>
  )
}

/* ---- App Shell ---- */
function App() {
  return (
    <Router>
      <div className="app-layout">
        <Sidebar />
        <div className="main-area">
          <Header />
          <main className="main-content">
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/projects" element={<Projects />} />
              <Route path="/issues" element={<Issues />} />
              <Route path="/users" element={<Users />} />
              <Route path="/activity" element={<ActivityLogs />} />
              <Route path="/reports" element={<Reports />} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  )
}

export default App
