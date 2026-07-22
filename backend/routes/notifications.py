"""
Notification routes — List and mark notifications as read.
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db
from models.notification import Notification

notifications_bp = Blueprint('notifications', __name__)


# --------------------------------------------------
# GET /api/notifications — List notifications for user
# --------------------------------------------------
@notifications_bp.route('', methods=['GET'])
@jwt_required()
def list_notifications():
    current_user_id = int(get_jwt_identity())
    
    query = Notification.query.filter_by(user_id=current_user_id)
    unread_count = query.filter_by(is_read=False).count()
    
    logs = query.order_by(Notification.created_at.desc()).limit(20).all()
    
    return jsonify({
        'notifications': [n.to_dict() for n in logs],
        'unread_count': unread_count,
    }), 200


# --------------------------------------------------
# PATCH /api/notifications/<id>/read — Mark notification as read
# --------------------------------------------------
@notifications_bp.route('/<int:notification_id>/read', methods=['PATCH'])
@jwt_required()
def mark_read(notification_id):
    current_user_id = int(get_jwt_identity())
    
    notif = Notification.query.filter_by(notification_id=notification_id, user_id=current_user_id).first()
    if not notif:
        return jsonify({'error': 'Notification not found'}), 404
        
    notif.is_read = True
    db.session.commit()
    
    return jsonify({'message': 'Notification marked as read'}), 200


# --------------------------------------------------
# PATCH /api/notifications/read-all — Mark all as read
# --------------------------------------------------
@notifications_bp.route('/read-all', methods=['PATCH'])
@jwt_required()
def mark_all_read():
    current_user_id = int(get_jwt_identity())
    
    Notification.query.filter_by(user_id=current_user_id, is_read=False).update({'is_read': True})
    db.session.commit()
    
    return jsonify({'message': 'All notifications marked as read'}), 200
