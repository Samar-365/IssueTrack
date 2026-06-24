from datetime import datetime, timezone
from models import db


class Issue(db.Model):
    """Issue model — core entity for tracking tasks/bugs."""
    __tablename__ = 'issues'

    issue_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    project_id = db.Column(db.Integer, db.ForeignKey('projects.project_id'), nullable=False)
    assigned_to = db.Column(db.Integer, db.ForeignKey('users.user_id'), nullable=True)
    created_by = db.Column(db.Integer, db.ForeignKey('users.user_id'), nullable=False)
    title = db.Column(db.String(300), nullable=False)
    description = db.Column(db.Text, nullable=True)
    priority = db.Column(db.String(20), default='medium')  # low, medium, high, critical
    status = db.Column(db.String(20), default='open')       # open, in_progress, testing, resolved, closed
    due_date = db.Column(db.Date, nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc),
                           onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    comments = db.relationship('Comment', backref='issue', lazy=True, cascade='all, delete-orphan')

    # Valid status transitions
    VALID_TRANSITIONS = {
        'open': ['in_progress'],
        'in_progress': ['testing', 'open'],
        'testing': ['resolved', 'in_progress'],
        'resolved': ['closed', 'in_progress'],
        'closed': ['open'],
    }

    PRIORITY_LEVELS = ['low', 'medium', 'high', 'critical']
    STATUS_OPTIONS = ['open', 'in_progress', 'testing', 'resolved', 'closed']

    def can_transition_to(self, new_status):
        """Check if a status transition is valid."""
        return new_status in self.VALID_TRANSITIONS.get(self.status, [])

    def to_dict(self):
        return {
            'issue_id': self.issue_id,
            'project_id': self.project_id,
            'assigned_to': self.assigned_to,
            'created_by': self.created_by,
            'title': self.title,
            'description': self.description,
            'priority': self.priority,
            'status': self.status,
            'due_date': self.due_date.isoformat() if self.due_date else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'assignee_name': self.assignee.name if self.assignee else None,
            'creator_name': self.creator.name if self.creator else None,
            'project_name': self.project.project_name if self.project else None,
            'comment_count': len(self.comments) if self.comments else 0,
        }
