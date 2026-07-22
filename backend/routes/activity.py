"""
Activity Log routes — View and filter system activity.
FR-25: The system shall log issue creation, assignment, status changes, comment additions.
FR-26: Admins and Managers shall view activity history.
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from models import db
from models.activity_log import ActivityLog
from models.user import User

activity_bp = Blueprint('activity', __name__)


# --------------------------------------------------
# GET /api/activity — List activity logs (FR-26)
# --------------------------------------------------
@activity_bp.route('', methods=['GET'])
@jwt_required()
def list_activity():
    """
    Return activity logs visible to the current user.
    Admins & Managers see all logs.
    Employees see only their own activity.
    """
    claims = get_jwt()
    role = claims.get('role')
    current_user_id = int(get_jwt_identity())

    query = ActivityLog.query

    # Employees can only see their own activity
    if role == 'employee':
        query = query.filter_by(user_id=current_user_id)

    # ---- Filters ----
    user_id = request.args.get('user_id')
    if user_id and role in ('admin', 'manager'):
        query = query.filter_by(user_id=int(user_id))

    action = request.args.get('action')
    if action:
        query = query.filter_by(action=action)

    entity_type = request.args.get('entity_type')
    if entity_type:
        query = query.filter_by(entity_type=entity_type)

    search = request.args.get('search', '').strip()
    if search:
        pattern = f'%{search}%'
        query = query.filter(ActivityLog.details.ilike(pattern))

    # Date range filters
    from datetime import datetime
    date_from = request.args.get('date_from')
    if date_from:
        try:
            from_dt = datetime.strptime(date_from, '%Y-%m-%d')
            query = query.filter(ActivityLog.timestamp >= from_dt)
        except ValueError:
            pass

    date_to = request.args.get('date_to')
    if date_to:
        try:
            to_dt = datetime.strptime(date_to, '%Y-%m-%d')
            # Include the entire day
            to_dt = to_dt.replace(hour=23, minute=59, second=59)
            query = query.filter(ActivityLog.timestamp <= to_dt)
        except ValueError:
            pass

    # ---- Pagination ----
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 25, type=int)
    per_page = min(per_page, 100)  # cap at 100

    # Always newest first
    query = query.order_by(ActivityLog.timestamp.desc())

    total = query.count()
    logs = query.offset((page - 1) * per_page).limit(per_page).all()

    return jsonify({
        'logs': [log.to_dict() for log in logs],
        'total': total,
        'page': page,
        'per_page': per_page,
        'total_pages': (total + per_page - 1) // per_page,
    }), 200


# --------------------------------------------------
# GET /api/activity/stats — Activity statistics
# --------------------------------------------------
@activity_bp.route('/stats', methods=['GET'])
@jwt_required()
def activity_stats():
    """Return aggregated activity statistics for dashboard widgets."""
    claims = get_jwt()
    role = claims.get('role')
    current_user_id = int(get_jwt_identity())

    base = ActivityLog.query
    if role == 'employee':
        base = base.filter_by(user_id=current_user_id)

    total = base.count()

    # Today's activity
    from datetime import datetime, timezone, timedelta
    now = datetime.now(timezone.utc)
    start_of_today = now.replace(hour=0, minute=0, second=0, microsecond=0)
    today_count = base.filter(ActivityLog.timestamp >= start_of_today).count()

    # This week
    start_of_week = now - timedelta(days=now.weekday())
    start_of_week = start_of_week.replace(hour=0, minute=0, second=0, microsecond=0)
    week_count = base.filter(ActivityLog.timestamp >= start_of_week).count()

    # Action breakdown
    action_counts = {}
    for action_name in [
        'issue_created', 'issue_updated', 'issue_assigned',
        'issue_deleted', 'status_changed',
        'comment_added', 'comment_edited', 'comment_deleted',
        'project_created', 'project_updated', 'project_archived',
        'user_created', 'user_updated',
    ]:
        count = base.filter_by(action=action_name).count()
        if count > 0:
            action_counts[action_name] = count

    return jsonify({
        'stats': {
            'total': total,
            'today': today_count,
            'this_week': week_count,
            'by_action': action_counts,
        }
    }), 200


# --------------------------------------------------
# GET /api/activity/users — List users with activity
# --------------------------------------------------
@activity_bp.route('/users', methods=['GET'])
@jwt_required()
def activity_users():
    """Return list of users who have activity logs (for filter dropdown)."""
    claims = get_jwt()
    if claims.get('role') not in ('admin', 'manager'):
        return jsonify({'users': []}), 200

    # Get distinct user_ids from activity logs
    user_ids = db.session.query(ActivityLog.user_id).distinct().all()
    user_ids = [uid[0] for uid in user_ids]

    if not user_ids:
        return jsonify({'users': []}), 200

    users = User.query.filter(User.user_id.in_(user_ids)).order_by(User.name).all()
    return jsonify({
        'users': [{'user_id': u.user_id, 'name': u.name, 'role': u.role} for u in users],
    }), 200
