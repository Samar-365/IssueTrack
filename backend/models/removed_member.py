"""
RemovedTeamMember Model — Tracks emails removed from teams by managers.
Prevents removed employees from rejoining the same team.
"""
from datetime import datetime, timezone
from models import db


class RemovedTeamMember(db.Model):
    __tablename__ = 'removed_team_members'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    team_id = db.Column(db.String(50), nullable=False, index=True)
    email = db.Column(db.String(120), nullable=False, index=True)
    user_id = db.Column(db.Integer, nullable=True)
    removed_by = db.Column(db.Integer, db.ForeignKey('users.user_id'), nullable=True)
    removed_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    def to_dict(self):
        return {
            'id': self.id,
            'team_id': self.team_id,
            'email': self.email,
            'user_id': self.user_id,
            'removed_by': self.removed_by,
            'removed_at': self.removed_at.isoformat() if self.removed_at else None,
        }
