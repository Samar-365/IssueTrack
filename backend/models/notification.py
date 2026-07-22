"""
Notification Model — Tracks in-app user notifications.
"""
from datetime import datetime, timezone
from models import db


class Notification(db.Model):
    __tablename__ = 'notifications'

    notification_id = db.Column(db.Integer, primary_key=True, autoincrement=True)

    user_id = db.Column(db.Integer, db.ForeignKey('users.user_id'), nullable=False, index=True)
    title = db.Column(db.String(150), nullable=False)
    message = db.Column(db.Text, nullable=False)
    is_read = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    def to_dict(self):
        return {
            'notification_id': self.notification_id,
            'user_id': self.user_id,
            'title': self.title,
            'message': self.message,
            'is_read': self.is_read,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
