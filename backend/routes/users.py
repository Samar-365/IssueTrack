"""
User Management routes — CRUD operations for system users.
Admin-only access for create, edit, and deactivate.
Managers get read-only list access (needed for issue assignment).
"""
from functools import wraps
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from models import db
from models.user import User
from models.activity_log import ActivityLog

users_bp = Blueprint('users', __name__)


# ---- Role-based access decorators ----

def admin_required(fn):
    """Decorator that restricts a route to admin users only."""
    @wraps(fn)
    @jwt_required()
    def wrapper(*args, **kwargs):
        claims = get_jwt()
        if claims.get('role') != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        return fn(*args, **kwargs)
    return wrapper


def manager_or_admin_required(fn):
    """Decorator that allows access to managers and admins."""
    @wraps(fn)
    @jwt_required()
    def wrapper(*args, **kwargs):
        claims = get_jwt()
        if claims.get('role') not in ('admin', 'manager'):
            return jsonify({'error': 'Manager or Admin access required'}), 403
        return fn(*args, **kwargs)
    return wrapper


def _log_activity(user_id, action, details=None, entity_id=None):
    """Helper to record an activity log entry."""
    log = ActivityLog(
        user_id=user_id,
        action=action,
        details=details,
        entity_type='user',
        entity_id=entity_id,
    )
    db.session.add(log)


VALID_ROLES = ('admin', 'manager', 'employee')


# --------------------------------------------------
# GET /api/users — List all users
# --------------------------------------------------
@users_bp.route('', methods=['GET'])
@manager_or_admin_required
def list_users():
    """Return all users with optional role, status, and team_id filters."""
    claims = get_jwt()
    role = claims.get('role')
    current_user_id = int(get_jwt_identity())
    current_user = User.query.get(current_user_id)
    user_team = (current_user.team_id if current_user else claims.get('team_id')) or ''

    query = User.query

    # Managers only see users within their own team
    if role == 'manager':
        if user_team.strip():
            query = query.filter(db.func.lower(User.team_id) == user_team.strip().lower())
        else:
            query = query.filter(User.user_id == current_user_id)
    elif role == 'admin':
        team_filter = request.args.get('team_id')
        if team_filter:
            query = query.filter(db.func.lower(User.team_id) == team_filter.strip().lower())

    role_filter = request.args.get('role')
    if role_filter and role_filter in VALID_ROLES:
        query = query.filter_by(role=role_filter)

    is_active = request.args.get('is_active')
    if is_active is not None:
        query = query.filter_by(is_active=is_active.lower() == 'true')

    search = request.args.get('search', '').strip()
    if search:
        pattern = f'%{search}%'
        query = query.filter(
            db.or_(
                User.name.ilike(pattern),
                User.email.ilike(pattern),
                User.team_id.ilike(pattern),
            )
        )

    users = query.order_by(User.created_at.desc()).all()
    return jsonify({'users': [u.to_dict() for u in users]}), 200


# --------------------------------------------------
# GET /api/users/<id> — Get single user
# --------------------------------------------------
@users_bp.route('/<int:user_id>', methods=['GET'])
@manager_or_admin_required
def get_user(user_id):
    """Return details for a single user."""
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404

    claims = get_jwt()
    role = claims.get('role')
    if role == 'manager':
        current_user_id = int(get_jwt_identity())
        current_user = User.query.get(current_user_id)
        user_team = (current_user.team_id if current_user else claims.get('team_id')) or ''
        if not user.team_id or user.team_id.strip().lower() != user_team.strip().lower():
            return jsonify({'error': 'Access denied to users outside your team'}), 403

    return jsonify({'user': user.to_dict()}), 200


# --------------------------------------------------
# POST /api/users — Create a new user (FR-4)
# --------------------------------------------------
@users_bp.route('', methods=['POST'])
@admin_required
def create_user():
    """Create a new user. Admin only."""
    data = request.get_json()

    # --- Validate required fields ---
    name = (data.get('name') or '').strip()
    email = (data.get('email') or '').strip()
    password = data.get('password', '')
    role = (data.get('role') or 'employee').strip().lower()
    team_id = (data.get('team_id') or '').strip() or None

    errors = []
    if not name:
        errors.append('Name is required')
    if not email:
        errors.append('Email is required')
    if not password or len(password) < 6:
        errors.append('Password must be at least 6 characters')
    if role not in VALID_ROLES:
        errors.append(f'Role must be one of: {", ".join(VALID_ROLES)}')

    if errors:
        return jsonify({'error': '; '.join(errors)}), 400

    # --- Check duplicate email ---
    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'A user with this email already exists'}), 409

    # --- Create user ---
    user = User(
        name=name,
        email=email,
        role=role,
        team_id=team_id,
        is_active=True,
    )
    user.set_password(password)

    db.session.add(user)
    db.session.flush()  # get user_id before commit

    # Log activity
    admin_id = int(get_jwt_identity())
    _log_activity(admin_id, 'user_created',
                  f'Created user "{name}" ({email}) with role {role} (Team: {team_id or "General"})',
                  entity_id=user.user_id)

    db.session.commit()

    return jsonify({
        'message': f'User "{name}" created successfully',
        'user': user.to_dict(),
    }), 201


# --------------------------------------------------
# PUT /api/users/<id> — Edit user details (FR-5, FR-7)
# --------------------------------------------------
@users_bp.route('/<int:user_id>', methods=['PUT'])
@admin_required
def update_user(user_id):
    """Update a user's name, email, role, and/or team_id. Admin only."""
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404

    data = request.get_json()
    changes = []

    # --- Name ---
    name = (data.get('name') or '').strip()
    if name and name != user.name:
        changes.append(f'name: "{user.name}" → "{name}"')
        user.name = name

    # --- Email ---
    email = (data.get('email') or '').strip()
    if email and email != user.email:
        existing = User.query.filter(User.email == email, User.user_id != user_id).first()
        if existing:
            return jsonify({'error': 'A user with this email already exists'}), 409
        changes.append(f'email: "{user.email}" → "{email}"')
        user.email = email

    # --- Role ---
    role = (data.get('role') or '').strip().lower()
    if role and role != user.role:
        if role not in VALID_ROLES:
            return jsonify({'error': f'Role must be one of: {", ".join(VALID_ROLES)}'}), 400
        changes.append(f'role: {user.role} → {role}')
        user.role = role

    # --- Team ID ---
    if 'team_id' in data:
        new_team = (data.get('team_id') or '').strip() or None
        if new_team != user.team_id:
            changes.append(f'team_id: "{user.team_id}" → "{new_team}"')
            user.team_id = new_team

    # --- Password (optional) ---
    password = data.get('password', '')
    if password:
        if len(password) < 6:
            return jsonify({'error': 'Password must be at least 6 characters'}), 400
        user.set_password(password)
        changes.append('password updated')

    if not changes:
        return jsonify({'message': 'No changes detected', 'user': user.to_dict()}), 200

    # Log activity
    admin_id = int(get_jwt_identity())
    _log_activity(admin_id, 'user_updated',
                  f'Updated user #{user_id}: {"; ".join(changes)}',
                  entity_id=user_id)

    db.session.commit()

    return jsonify({
        'message': f'User "{user.name}" updated successfully',
        'user': user.to_dict(),
    }), 200


# --------------------------------------------------
# PATCH /api/users/<id>/status — Activate / Deactivate (FR-6)
# --------------------------------------------------
@users_bp.route('/<int:user_id>/status', methods=['PATCH'])
@admin_required
def toggle_user_status(user_id):
    """Activate or deactivate a user account. Admin only."""
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404

    data = request.get_json()
    is_active = data.get('is_active')

    if is_active is None:
        return jsonify({'error': 'is_active field is required'}), 400

    # Prevent admin from deactivating themselves
    admin_id = int(get_jwt_identity())
    if user_id == admin_id and not is_active:
        return jsonify({'error': 'You cannot deactivate your own account'}), 400

    user.is_active = bool(is_active)
    action = 'user_activated' if is_active else 'user_deactivated'
    _log_activity(admin_id, action,
                  f'{"Activated" if is_active else "Deactivated"} user "{user.name}" ({user.email})',
                  entity_id=user_id)

    db.session.commit()

    status_text = 'activated' if is_active else 'deactivated'
    return jsonify({
        'message': f'User "{user.name}" {status_text} successfully',
        'user': user.to_dict(),
    }), 200


# --------------------------------------------------
# DELETE /api/users/<id> — Delete user permanently
# --------------------------------------------------
@users_bp.route('/<int:user_id>', methods=['DELETE'])
@admin_required
def delete_user(user_id):
    """Permanently delete a user. Admin only."""
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404

    admin_id = int(get_jwt_identity())
    if user_id == admin_id:
        return jsonify({'error': 'You cannot delete your own account'}), 400

    from models.issue import Issue
    from models.project import Project
    from models.comment import Comment
    from models.notification import Notification

    # Reassign created_by to the deleting admin so projects/issues aren't orphaned
    Project.query.filter_by(created_by=user_id).update({'created_by': admin_id})
    Project.query.filter_by(manager_id=user_id).update({'manager_id': None})
    Issue.query.filter_by(created_by=user_id).update({'created_by': admin_id})
    Issue.query.filter_by(assigned_to=user_id).update({'assigned_to': None})

    # Clean up notifications and comments for this user
    Notification.query.filter_by(user_id=user_id).delete()
    Comment.query.filter_by(user_id=user_id).delete()
    ActivityLog.query.filter_by(user_id=user_id).delete()

    user_name = user.name
    user_email = user.email

    db.session.delete(user)
    _log_activity(admin_id, 'user_deleted',
                  f'Deleted user "{user_name}" ({user_email})',
                  entity_id=user_id)
    db.session.commit()

    return jsonify({'message': f'User "{user_name}" deleted successfully'}), 200
