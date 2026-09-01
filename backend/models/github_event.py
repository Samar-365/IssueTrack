from datetime import datetime, timezone
from models import db


class GitHubEvent(db.Model):
    """GitHubEvent model — tracks commits and pull requests linked to issues."""
    __tablename__ = 'github_events'

    event_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    issue_id = db.Column(db.Integer, db.ForeignKey('issues.issue_id'), nullable=False)
    event_type = db.Column(db.String(20), nullable=False)  # 'push', 'pull_request'
    github_ref = db.Column(db.String(100), nullable=False)  # Commit SHA or PR number (e.g., '#42')
    commit_sha = db.Column(db.String(40), nullable=True)    # Full 40-character SHA if applicable
    branch = db.Column(db.String(100), nullable=True)       # Target or head branch name (e.g., 'main')
    url = db.Column(db.String(500), nullable=True)          # Direct GitHub link to commit or PR
    author_name = db.Column(db.String(100), nullable=True)  # Git commit author or PR creator
    author_email = db.Column(db.String(150), nullable=True) # Git author email
    author_avatar = db.Column(db.String(500), nullable=True)# GitHub avatar URL if available
    message = db.Column(db.Text, nullable=True)             # Commit message or PR title/body
    action_taken = db.Column(db.String(50), nullable=True)  # 'linked', 'status_in_progress', 'status_resolved'
    timestamp = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    @property
    def short_sha(self):
        """Return 7-character abbreviated commit hash or ref."""
        return self.commit_sha[:7] if self.commit_sha else self.github_ref

    def to_dict(self):
        return {
            'event_id': self.event_id,
            'issue_id': self.issue_id,
            'event_type': self.event_type,
            'github_ref': self.github_ref,
            'commit_sha': self.commit_sha,
            'short_sha': self.short_sha,
            'branch': self.branch,
            'url': self.url,
            'author_name': self.author_name,
            'author_email': self.author_email,
            'author_avatar': self.author_avatar,
            'message': self.message,
            'action_taken': self.action_taken,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None,
        }
