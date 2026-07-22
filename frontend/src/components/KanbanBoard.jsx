/**
 * KanbanBoard.jsx — Interactive Kanban Board for Issue Workflow Management.
 * Supports HTML5 Drag-and-Drop + Status transition enforcement.
 */
import { useState } from 'react'
import {
  HiOutlineChatAlt2,
  HiOutlinePencil,
  HiOutlineTrash,
  HiOutlineFolder,
  HiOutlineClock,
} from 'react-icons/hi'
import PixelIcon from './PixelIcon'
import './KanbanBoard.css'

const COLUMNS = [
  { id: 'open', label: 'Open', color: '#18181b', iconName: 'circle' },
  { id: 'in_progress', label: 'In Progress', color: '#3f3f46', iconName: 'lightning' },
  { id: 'testing', label: 'Testing', color: '#52525b', iconName: 'flask' },
  { id: 'resolved', label: 'Resolved', color: '#71717a', iconName: 'check' },
  { id: 'closed', label: 'Closed', color: '#a1a1aa', iconName: 'lock' },
]

const PRIORITY_MAP = {
  low:      { label: 'Low',      class: 'priority-low',      iconName: 'circle', color: '#71717a' },
  medium:   { label: 'Medium',   class: 'priority-medium',   iconName: 'circle', color: '#52525b' },
  high:     { label: 'High',     class: 'priority-high',     iconName: 'warning', color: '#27272a' },
  critical: { label: 'Critical', class: 'priority-critical',  iconName: 'warning', color: '#000000' },
}

const VALID_TRANSITIONS = {
  open:        ['in_progress'],
  in_progress: ['testing', 'open'],
  testing:     ['resolved', 'in_progress'],
  resolved:    ['closed', 'in_progress'],
  closed:      ['open'],
}

export default function KanbanBoard({
  issues = [],
  onStatusChange,
  onEdit,
  onDelete,
  onOpenComments,
  isManagerOrAdmin,
}) {
  const [draggedIssue, setDraggedIssue] = useState(null)
  const [dragOverColumn, setDragOverColumn] = useState(null)

  // Drag Handlers
  const handleDragStart = (e, issue) => {
    setDraggedIssue(issue)
    e.dataTransfer.setData('text/plain', issue.issue_id)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e, columnId) => {
    e.preventDefault()
    if (dragOverColumn !== columnId) {
      setDragOverColumn(columnId)
    }
  }

  const handleDragLeave = () => {
    setDragOverColumn(null)
  }

  const handleDrop = (e, targetColumnId) => {
    e.preventDefault()
    setDragOverColumn(null)
    if (!draggedIssue) return

    const currentStatus = draggedIssue.status
    if (currentStatus === targetColumnId) return

    const allowed = VALID_TRANSITIONS[currentStatus] || []
    if (allowed.includes(targetColumnId)) {
      onStatusChange(draggedIssue, targetColumnId)
    } else {
      alert(`Cannot move directly from "${currentStatus.replace('_', ' ')}" to "${targetColumnId.replace('_', ' ')}". Allowed next status: ${allowed.map(s => s.replace('_', ' ')).join(', ')}`)
    }
    setDraggedIssue(null)
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return null
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const isOverdue = (dateStr, status) => {
    if (!dateStr || ['resolved', 'closed'].includes(status)) return false
    const due = new Date(dateStr)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return due < today
  }

  return (
    <div className="kanban-container">
      {COLUMNS.map((col) => {
        const colIssues = issues.filter((i) => i.status === col.id)
        const isTarget = dragOverColumn === col.id

        return (
          <div
            key={col.id}
            className={`kanban-column ${isTarget ? 'kanban-column-dragover' : ''}`}
            onDragOver={(e) => handleDragOver(e, col.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, col.id)}
          >
            {/* Column Header */}
            <div className="kanban-column-header">
              <div className="kanban-column-title">
                <span className="kanban-column-icon"><PixelIcon name={col.iconName} size={16} color={col.color} /></span>
                <span>{col.label}</span>
              </div>
              <span className="kanban-column-count">{colIssues.length}</span>
            </div>

            {/* Cards List */}
            <div className="kanban-cards-list">
              {colIssues.length === 0 ? (
                <div className="kanban-empty-drop">Drop issues here</div>
              ) : (
                colIssues.map((issue) => {
                  const pri = PRIORITY_MAP[issue.priority] || PRIORITY_MAP.medium
                  const overdue = isOverdue(issue.due_date, issue.status)
                  const allowed = VALID_TRANSITIONS[issue.status] || []

                  return (
                    <div
                      key={issue.issue_id}
                      className="kanban-card glass-card"
                      draggable
                      onDragStart={(e) => handleDragStart(e, issue)}
                    >
                      {/* Top Row: Project & Priority */}
                      <div className="kanban-card-top">
                        <span className="kanban-project-tag">
                          <HiOutlineFolder style={{ fontSize: '0.7rem' }} />
                          {issue.project_name || `P#${issue.project_id}`}
                        </span>
                        <span className={`priority-badge ${pri.class}`}>
                          <PixelIcon name={pri.iconName} size={10} color={pri.color} /> {pri.label}
                        </span>
                      </div>

                      {/* Title */}
                      <h4 className="kanban-card-title">{issue.title}</h4>

                      {/* Due Date Indicator */}
                      {issue.due_date && (
                        <div className={`kanban-card-due ${overdue ? 'overdue' : ''}`}>
                          <HiOutlineClock style={{ fontSize: '0.8rem' }} />
                          <span>{formatDate(issue.due_date)}</span>
                          {overdue && <span className="kanban-overdue-tag">OVERDUE</span>}
                        </div>
                      )}

                      {/* Footer: Assignee & Action Buttons */}
                      <div className="kanban-card-footer">
                        {issue.assignee_name ? (
                          <div className="assignee-cell" title={issue.assignee_name}>
                            <div className="assignee-avatar">
                              {issue.assignee_name.charAt(0).toUpperCase()}
                            </div>
                            <span className="assignee-name" style={{ maxWidth: '70px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {issue.assignee_name.split(' ')[0]}
                            </span>
                          </div>
                        ) : (
                          <span className="unassigned-text">Unassigned</span>
                        )}

                        <div className="kanban-card-actions">
                          <button
                            className="btn btn-ghost btn-xs"
                            onClick={() => onOpenComments(issue)}
                            title="Comments"
                          >
                            <HiOutlineChatAlt2 />
                            {issue.comment_count > 0 && <span>{issue.comment_count}</span>}
                          </button>

                          {isManagerOrAdmin && (
                            <>
                              <button
                                className="btn btn-ghost btn-xs"
                                onClick={() => onEdit(issue)}
                                title="Edit"
                              >
                                <HiOutlinePencil />
                              </button>
                              <button
                                className="btn btn-ghost btn-xs"
                                onClick={() => onDelete(issue)}
                                title="Delete"
                                style={{ color: 'var(--color-accent-rose)' }}
                              >
                                <HiOutlineTrash />
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Quick Move Bar */}
                      {allowed.length > 0 && (
                        <div className="kanban-quick-move">
                          <span className="kanban-move-label">Next:</span>
                          {allowed.map((nextStatus) => (
                            <button
                              key={nextStatus}
                              className="kanban-move-btn"
                              onClick={() => onStatusChange(issue, nextStatus)}
                            >
                              ➔ {nextStatus.replace('_', ' ')}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
