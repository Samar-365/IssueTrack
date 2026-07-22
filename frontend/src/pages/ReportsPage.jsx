/**
 * ReportsPage — Generate and export reports.
 * FR-32: Issue reports, FR-33: Performance, FR-34: Project completion, FR-35: Export CSV.
 */
import { useState, useCallback } from 'react'
import { reportsAPI } from '../services/api'
import Toast from '../components/Toast'
import PixelIcon from '../components/PixelIcon'
import './ReportsPage.css'

const REPORT_TYPES = [
  {
    key: 'issues',
    label: 'Issue Report',
    iconName: 'warning',
    desc: 'Detailed breakdown of all issues by status, priority, and assignment.',
  },
  {
    key: 'performance',
    label: 'Employee Performance',
    iconName: 'report',
    desc: 'Resolution rates, workload, and engagement metrics for each team member.',
  },
  {
    key: 'projects',
    label: 'Project Completion',
    iconName: 'chart',
    desc: 'Progress tracking, team size, and overdue issues per project.',
  },
]

export default function ReportsPage() {
  const [activeReport, setActiveReport] = useState(null)
  const [reportData, setReportData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState(null)

  const generateReport = useCallback(async (type) => {
    try {
      setLoading(true)
      setActiveReport(type)
      setReportData(null)
      let res
      if (type === 'issues') res = await reportsAPI.issues()
      else if (type === 'performance') res = await reportsAPI.performance()
      else if (type === 'projects') res = await reportsAPI.projects()
      setReportData(res.data.report)
    } catch (err) {
      setToast({ type: 'error', message: 'Failed to generate report' })
    } finally {
      setLoading(false)
    }
  }, [])

  const exportCSV = useCallback(async (type) => {
    try {
      const res = await reportsAPI.export(type)
      const blob = new Blob([res.data], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${type}_report.csv`
      a.click()
      window.URL.revokeObjectURL(url)
      setToast({ type: 'success', message: 'CSV Report exported successfully' })
    } catch (err) {
      setToast({ type: 'error', message: 'Failed to export CSV report' })
    }
  }, [])

  const exportPDF = useCallback(async (type) => {
    try {
      const res = await reportsAPI.exportPDF(type)
      const blob = new Blob([res.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${type}_report.pdf`
      a.click()
      window.URL.revokeObjectURL(url)
      setToast({ type: 'success', message: 'PDF Report exported successfully' })
    } catch (err) {
      setToast({ type: 'error', message: 'Failed to export PDF report' })
    }
  }, [])

  return (
    <div className="animate-fade-in" style={{ padding: '0.5rem 0' }}>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      <div className="page-header">
        <div>
          <h1 className="page-title">Reports</h1>
          <p className="page-subtitle">Generate and export reports for project monitoring</p>
        </div>
      </div>

      {/* Report Type Cards */}
      <div className="reports-type-grid">
        {REPORT_TYPES.map((rt) => (
          <div
            key={rt.key}
            className={`reports-type-card ${activeReport === rt.key ? 'active' : ''}`}
            onClick={() => generateReport(rt.key)}
          >
            <div className="reports-type-icon">
              <PixelIcon name={rt.iconName} size={26} color="var(--color-icon-fill)" />
            </div>
            <h3 className="reports-type-label">{rt.label}</h3>
            <p className="reports-type-desc">{rt.desc}</p>
            <div className="reports-type-actions" style={{ flexWrap: 'wrap', gap: '0.35rem' }}>
              <button className="btn btn-primary btn-sm" onClick={(e) => { e.stopPropagation(); generateReport(rt.key) }}>
                Generate
              </button>
              <button className="btn btn-secondary btn-sm" onClick={(e) => { e.stopPropagation(); exportCSV(rt.key) }}>
                Export CSV
              </button>
              <button className="btn btn-secondary btn-sm" onClick={(e) => { e.stopPropagation(); exportPDF(rt.key) }}>
                Export PDF
              </button>
            </div>
          </div>
        ))}
      </div>


      {/* Report Content */}
      {loading && (
        <div className="loading-spinner"><div className="spinner" /></div>
      )}

      {reportData && !loading && activeReport === 'issues' && (
        <IssueReportView data={reportData} />
      )}
      {reportData && !loading && activeReport === 'performance' && (
        <PerformanceReportView data={reportData} />
      )}
      {reportData && !loading && activeReport === 'projects' && (
        <ProjectReportView data={reportData} />
      )}
    </div>
  )
}

/* ---- Issue Report View ---- */
function IssueReportView({ data }) {
  return (
    <div className="report-content glass-card">
      <div className="report-header">
        <h2 className="report-title">{data.title}</h2>
        <span className="report-meta">{data.total_issues} issues · {data.overdue_count} overdue</span>
      </div>

      <div className="report-summary-grid">
        {Object.entries(data.by_status).map(([s, c]) => (
          <div key={s} className="report-summary-item">
            <span className="report-summary-val">{c}</span>
            <span className="report-summary-lbl">{s.replace('_', ' ')}</span>
          </div>
        ))}
      </div>

      <div className="table-container" style={{ marginTop: 'var(--space-5)' }}>
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Title</th>
              <th>Project</th>
              <th>Assigned To</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Due Date</th>
            </tr>
          </thead>
          <tbody>
            {data.issues.map((i) => (
              <tr key={i.issue_id} className={i.is_overdue ? 'report-row-overdue' : ''}>
                <td>#{i.issue_id}</td>
                <td>{i.title}</td>
                <td>{i.project_name}</td>
                <td>{i.assigned_to}</td>
                <td><span className={`badge badge-${i.priority === 'critical' ? 'rose' : i.priority === 'high' ? 'amber' : i.priority === 'medium' ? 'blue' : 'emerald'}`}>{i.priority}</span></td>
                <td><span className="badge badge-slate">{i.status.replace('_', ' ')}</span></td>
                <td>{i.due_date || '—'} {i.is_overdue && <span className="report-overdue-tag">OVERDUE</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ---- Performance Report View ---- */
function PerformanceReportView({ data }) {
  return (
    <div className="report-content glass-card">
      <div className="report-header">
        <h2 className="report-title">{data.title}</h2>
        <span className="report-meta">{data.total_employees} employees</span>
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Role</th>
              <th>Assigned</th>
              <th>Resolved</th>
              <th>In Progress</th>
              <th>Overdue</th>
              <th>Resolution Rate</th>
              <th>Comments</th>
            </tr>
          </thead>
          <tbody>
            {data.employees.map((e) => (
              <tr key={e.user_id}>
                <td>
                  <div>
                    <div style={{ fontWeight: 600 }}>{e.name}</div>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>{e.email}</div>
                  </div>
                </td>
                <td><span className={`badge ${e.role === 'admin' ? 'badge-rose' : e.role === 'manager' ? 'badge-violet' : 'badge-blue'}`}>{e.role}</span></td>
                <td>{e.total_assigned}</td>
                <td>{e.resolved}</td>
                <td>{e.in_progress}</td>
                <td>{e.overdue > 0 ? <span style={{ color: 'var(--color-accent-rose)', fontWeight: 600 }}>{e.overdue}</span> : 0}</td>
                <td>
                  <div className="report-rate-bar">
                    <div className="report-rate-fill" style={{ width: `${e.resolution_rate}%` }} />
                    <span className="report-rate-text">{e.resolution_rate}%</span>
                  </div>
                </td>
                <td>{e.comments}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ---- Project Report View ---- */
function ProjectReportView({ data }) {
  return (
    <div className="report-content glass-card">
      <div className="report-header">
        <h2 className="report-title">{data.title}</h2>
        <span className="report-meta">{data.total_projects} projects</span>
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Project</th>
              <th>Status</th>
              <th>Total</th>
              <th>Resolved</th>
              <th>Open</th>
              <th>Overdue</th>
              <th>Progress</th>
              <th>Team</th>
            </tr>
          </thead>
          <tbody>
            {data.projects.map((p) => (
              <tr key={p.project_id}>
                <td style={{ fontWeight: 600 }}>{p.project_name}</td>
                <td><span className={`badge ${p.status === 'active' ? 'badge-emerald' : p.status === 'archived' ? 'badge-slate' : 'badge-blue'}`}>{p.status}</span></td>
                <td>{p.total_issues}</td>
                <td>{p.resolved_issues}</td>
                <td>{p.open_issues}</td>
                <td>{p.overdue_issues > 0 ? <span style={{ color: 'var(--color-accent-rose)', fontWeight: 600 }}>{p.overdue_issues}</span> : 0}</td>
                <td>
                  <div className="report-rate-bar">
                    <div className="report-rate-fill" style={{ width: `${p.progress}%` }} />
                    <span className="report-rate-text">{p.progress}%</span>
                  </div>
                </td>
                <td>{p.team_size}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
