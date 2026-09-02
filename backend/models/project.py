import secrets
from datetime import datetime, timezone
from models import db


class Project(db.Model):
    """Project model — container for issues and GitHub repository sync."""
    __tablename__ = 'projects'

    project_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    project_name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=True)
    start_date = db.Column(db.Date, nullable=True)
    end_date = db.Column(db.Date, nullable=True)
    status = db.Column(db.String(20), default='active')  # active, archived
    created_by = db.Column(db.Integer, db.ForeignKey('users.user_id'), nullable=False)
    manager_id = db.Column(db.Integer, db.ForeignKey('users.user_id'), nullable=True)
    team_id = db.Column(db.String(50), nullable=True, index=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    # GitHub Webhook Integration Credentials
    webhook_token = db.Column(db.String(64), unique=True, nullable=True, index=True)
    webhook_secret = db.Column(db.String(64), nullable=True)
    github_repo = db.Column(db.String(200), nullable=True)

    # Relationships
    issues = db.relationship('Issue', backref='project', lazy=True, cascade='all, delete-orphan')
    manager = db.relationship('User', foreign_keys=[manager_id], backref='managed_projects', lazy=True)
    owner = db.relationship('User', foreign_keys=[created_by], backref='created_projects', lazy=True)

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if not self.webhook_token:
            self.webhook_token = f"proj_{secrets.token_hex(16)}"
        if not self.webhook_secret:
            self.webhook_secret = secrets.token_hex(32)

    def rotate_webhook_secret(self):
        """Regenerate a new 32-byte cryptographically secure HMAC secret."""
        self.webhook_secret = secrets.token_hex(32)
        return self.webhook_secret

    def to_dict(self):
        total = len(self.issues) if self.issues else 0
        open_count = sum(1 for i in self.issues if i.status in ('open', 'in_progress')) if self.issues else 0
        resolved_count = sum(1 for i in self.issues if i.status in ('resolved', 'closed')) if self.issues else 0
        testing_count = sum(1 for i in self.issues if i.status == 'testing') if self.issues else 0
        progress = round((resolved_count / total) * 100, 1) if total > 0 else 0

        from datetime import date
        overdue_count = 0
        if self.issues:
            today = date.today()
            overdue_count = sum(
                1 for i in self.issues
                if i.due_date and i.due_date < today and i.status not in ('resolved', 'closed')
            )

        return {
            'project_id': self.project_id,
            'project_name': self.project_name,
            'description': self.description,
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'end_date': self.end_date.isoformat() if self.end_date else None,
            'status': self.status,
            'team_id': self.team_id,
            'created_by': self.created_by,
            'creator_name': self.owner.name if self.owner else None,
            'manager_id': self.manager_id,
            'manager_name': self.manager.name if self.manager else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'webhook_token': self.webhook_token,
            'webhook_secret': self.webhook_secret,
            'github_repo': self.github_repo,
            'issue_count': total,
            'open_issues': open_count,
            'resolved_issues': resolved_count,
            'testing_issues': testing_count,
            'overdue_issues': overdue_count,
            'progress': progress,
        }
