"""
Authentication routes — login, logout, and current user info.
Uses JWT tokens via Flask-JWT-Extended.
"""
import re
from flask import Blueprint, request, jsonify
from flask_jwt_extended import (
    create_access_token,
    jwt_required,
    get_jwt_identity,
    get_jwt,
)
from models import db
from models.user import User
from models.activity_log import ActivityLog

auth_bp = Blueprint('auth', __name__)

# ---- In-memory token blocklist (for logout) ----
BLOCKLIST = set()


def check_if_token_revoked(jwt_header, jwt_payload):
    """Callback used by JWTManager to check if a token has been revoked."""
    jti = jwt_payload['jti']
    return jti in BLOCKLIST


# --------------------------------------------------
# POST /api/auth/register
# --------------------------------------------------
@auth_bp.route('/register', methods=['POST'])
def register():
    """Register a new user account and return a JWT access token."""
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Request body is required'}), 400

    name = data.get('name', '').strip()
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')
    role = data.get('role', 'employee').strip().lower()
    team_id = data.get('team_id', '').strip()

    if not name:
        return jsonify({'error': 'Full name is required'}), 400
    if not email:
        return jsonify({'error': 'Email address is required'}), 400
    if not re.match(r'^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$', email):
        return jsonify({'error': 'Invalid email address format'}), 400
    if not password or len(password) < 6:
        return jsonify({'error': 'Password must be at least 6 characters'}), 400
    if not team_id:
        return jsonify({'error': 'Team ID is required'}), 400

    if role not in ('employee', 'manager'):
        role = 'employee'

    # Check if user already exists
    existing = User.query.filter_by(email=email).first()
    if existing:
        return jsonify({'error': 'An account with this email already exists'}), 409

    # Create new user
    user = User(
        name=name,
        email=email,
        role=role,
        team_id=team_id,
        is_active=True
    )
    user.set_password(password)

    db.session.add(user)
    db.session.commit()

    # Log activity
    log = ActivityLog(
        user_id=user.user_id,
        action='user_registered',
        details=f'User {user.name} ({user.email}) registered with role {user.role} and team {user.team_id}',
        entity_type='user',
        entity_id=user.user_id,
    )
    db.session.add(log)
    db.session.commit()

    # Issue JWT token
    access_token = create_access_token(
        identity=str(user.user_id),
        additional_claims={
            'role': user.role,
            'name': user.name,
            'email': user.email,
            'team_id': user.team_id,
        }
    )

    return jsonify({
        'message': 'Registration successful',
        'access_token': access_token,
        'user': user.to_dict(),
    }), 201


# --------------------------------------------------
# POST /api/auth/login
# --------------------------------------------------
@auth_bp.route('/login', methods=['POST'])
def login():
    """Authenticate a user and return a JWT access token."""
    data = request.get_json()

    if not data or not data.get('email') or not data.get('password'):
        return jsonify({'error': 'Email and password are required'}), 400

    user = User.query.filter_by(email=data['email']).first()

    if not user or not user.check_password(data['password']):
        return jsonify({'error': 'Invalid email or password'}), 401

    if not user.is_active:
        return jsonify({'error': 'Account is deactivated. Contact an administrator.'}), 403

    access_token = create_access_token(
        identity=str(user.user_id),
        additional_claims={
            'role': user.role,
            'name': user.name,
            'email': user.email,
            'team_id': user.team_id,
        }
    )

    return jsonify({
        'message': 'Login successful',
        'access_token': access_token,
        'user': user.to_dict(),
    }), 200


# --------------------------------------------------
# POST /api/auth/team-login — Direct Employee Login with Team ID only
# --------------------------------------------------
@auth_bp.route('/team-login', methods=['POST'])
def team_login():
    """
    Authenticate an employee directly using their unique Team ID.
    Validates that the team exists (created by a manager/admin or with projects).
    Creates or retrieves the employee session for that team.
    """
    data = request.get_json() or {}
    team_id = (data.get('team_id') or '').strip().upper()
    name = (data.get('name') or '').strip()

    if not team_id:
        return jsonify({'error': 'Team ID is required'}), 400

    from models.project import Project
    # Check if team exists (any user or project registered with this team_id)
    team_exists = User.query.filter_by(team_id=team_id).first() is not None or \
                  Project.query.filter_by(team_id=team_id).first() is not None

    if not team_exists:
        return jsonify({'error': f'Team ID "{team_id}" does not exist. Please check with your Project Manager.'}), 404

    # Determine employee name and email identifier
    emp_name = name if name else f'Team Member ({team_id})'
    slug_name = re.sub(r'[^a-zA-Z0-9]', '_', emp_name.lower())
    emp_email = f"{slug_name}_{team_id.lower()}@team.local"

    # Find existing employee user or create one
    user = User.query.filter_by(email=emp_email).first()
    if not user:
        user = User(
            name=emp_name,
            email=emp_email,
            role='employee',
            team_id=team_id,
            is_active=True
        )
        user.set_password(f'team_pass_{team_id}')
        db.session.add(user)
        db.session.commit()

        # Log activity
        log = ActivityLog(
            user_id=user.user_id,
            action='team_employee_joined',
            details=f'Employee {user.name} logged in via Team ID "{team_id}"',
            entity_type='user',
            entity_id=user.user_id,
        )
        db.session.add(log)
        db.session.commit()

    if not user.is_active:
        return jsonify({'error': 'Account is deactivated. Contact your manager or an administrator.'}), 403

    access_token = create_access_token(
        identity=str(user.user_id),
        additional_claims={
            'role': user.role,
            'name': user.name,
            'email': user.email,
            'team_id': user.team_id,
        }
    )

    return jsonify({
        'message': f'Welcome to team {team_id}',
        'access_token': access_token,
        'user': user.to_dict(),
    }), 200


# --------------------------------------------------
# POST /api/auth/logout
# --------------------------------------------------
@auth_bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    """Revoke the current JWT token (add its jti to the blocklist)."""
    jti = get_jwt()['jti']
    BLOCKLIST.add(jti)
    return jsonify({'message': 'Logged out successfully'}), 200


# --------------------------------------------------
# GET /api/auth/me
# --------------------------------------------------
@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def me():
    """Return the current authenticated user's profile."""
    user_id = get_jwt_identity()
    user = User.query.get(int(user_id))

    if not user:
        return jsonify({'error': 'User not found'}), 404

    return jsonify({'user': user.to_dict()}), 200
