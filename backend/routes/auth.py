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

    if role == 'employee':
        return jsonify({'error': 'Employee self-registration is disabled. Please access your workspace via Team Access.'}), 403

    # Project Manager registration (Creates a new team)
    role = 'manager'

    # Check if an active Project Manager already exists for this team_id
    existing_manager = User.query.filter(
        db.func.lower(User.team_id) == team_id.lower(),
        User.role == 'manager',
        User.is_active == True
    ).first()
    if existing_manager:
        return jsonify({'error': 'Team ID invalid'}), 409

    existing_user = User.query.filter_by(email=email).first()
    if existing_user:
        return jsonify({'error': 'An account with this email already exists'}), 409

    user = User(
        name=name,
        email=email,
        role='manager',
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
# POST /api/auth/team-login — Direct Employee Login with Team ID, Name & Email
# --------------------------------------------------
@auth_bp.route('/team-login', methods=['POST'])
def team_login():
    """
    Authenticate an employee directly using Team ID, Name, and Email.
    Strictly verifies that all employee details (Team ID, Email, and Name) match
    the details entered by the Project Manager when adding the user.
    """
    data = request.get_json() or {}
    team_id = (data.get('team_id') or '').strip().upper()
    name = (data.get('name') or '').strip()
    email = (data.get('email') or '').strip().lower()

    if not team_id:
        return jsonify({'error': 'Team ID is required'}), 400
    if not name:
        return jsonify({'error': 'Full Name is required'}), 400
    if not email:
        return jsonify({'error': 'Email ID is required'}), 400
    if not re.match(r'^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$', email):
        return jsonify({'error': 'Invalid email address format'}), 400

    from models.project import Project
    from models.removed_member import RemovedTeamMember

    # Check if team exists (any user or project registered with this team_id)
    team_exists = User.query.filter(db.func.lower(User.team_id) == team_id.lower()).first() is not None or \
                  Project.query.filter(db.func.lower(Project.team_id) == team_id.lower()).first() is not None

    if not team_exists:
        return jsonify({'error': f'Team ID "{team_id}" does not exist. Please check with your Project Manager.'}), 404

    # Check if this email was removed from this team by the project manager
    removed_entry = RemovedTeamMember.query.filter(
        db.func.lower(RemovedTeamMember.team_id) == team_id.lower(),
        db.func.lower(RemovedTeamMember.email) == email.lower()
    ).first()
    if removed_entry:
        return jsonify({
            'error': f'Access Denied: The email "{email}" was removed from Team "{team_id}" by the Project Manager and cannot rejoin.'
        }), 403

    # Check if this email has been manually added by the Project Manager (Strict whitelist)
    user = User.query.filter(
        db.func.lower(User.email) == email.lower(),
        db.func.lower(User.team_id) == team_id.lower()
    ).first()

    if not user:
        return jsonify({
            'error': f'Access Denied: The email "{email}" has not been added to Team "{team_id}" by the Project Manager. Please ask your manager to add your email in the Users section first.'
        }), 403

    if not user.is_active:
        return jsonify({'error': 'Account is deactivated. Contact your manager or an administrator.'}), 403

    # Check if the employee's name matches the name entered by the Project Manager
    if user.name and user.name.strip().lower() != name.strip().lower():
        return jsonify({
            'error': f'Access Denied: The name "{name}" does not match the name registered by your Project Manager for this email ("{user.name}").'
        }), 403

    # Log activity on login
    log = ActivityLog(
        user_id=user.user_id,
        action='team_employee_joined',
        details=f'Employee {user.name} ({user.email}) accessed workspace for Team "{team_id}"',
        entity_type='user',
        entity_id=user.user_id,
    )
    db.session.add(log)
    db.session.commit()

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
