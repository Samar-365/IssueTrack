"""
Authentication routes — login, logout, and current user info.
Uses JWT tokens via Flask-JWT-Extended.
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import (
    create_access_token,
    jwt_required,
    get_jwt_identity,
    get_jwt,
)
from models import db
from models.user import User

auth_bp = Blueprint('auth', __name__)

# ---- In-memory token blocklist (for logout) ----
BLOCKLIST = set()


def check_if_token_revoked(jwt_header, jwt_payload):
    """Callback used by JWTManager to check if a token has been revoked."""
    jti = jwt_payload['jti']
    return jti in BLOCKLIST


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
        }
    )

    return jsonify({
        'message': 'Login successful',
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
