"""
Project Management routes — CRUD operations for projects.
Admin-only for create, update, and archive.
All authenticated users can view projects relevant to them.
"""
from datetime import datetime
from functools import wraps
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from models import db
from models.project import Project
from models.user import User
from models.issue import Issue
from models.activity_log import ActivityLog

projects_bp = Blueprint('projects', __name__)


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
        entity_type='project',
        entity_id=entity_id,
    )
    db.session.add(log)


# --------------------------------------------------
# GET /api/projects — List all projects
# --------------------------------------------------
@projects_bp.route('', methods=['GET'])
@jwt_required()
def list_projects():
    """
    Return projects visible to the current user.
    Admins & Managers see all projects.
    Employees see only projects that have issues assigned to them.
    """
    claims = get_jwt()
    role = claims.get('role')
    current_user_id = int(get_jwt_identity())

    query = Project.query

    # Employees can only see projects where they have assigned issues
    if role == 'employee':
        project_ids = db.session.query(Issue.project_id).filter(
            Issue.assigned_to == current_user_id
        ).distinct().subquery()
        query = query.filter(Project.project_id.in_(project_ids))

    # Optional filters
    status = request.args.get('status')
    if status and status in ('active', 'archived'):
        query = query.filter_by(status=status)

    search = request.args.get('search', '').strip()
    if search:
        pattern = f'%{search}%'
        query = query.filter(
            db.or_(
                Project.project_name.ilike(pattern),
                Project.description.ilike(pattern),
            )
        )

    # Sorting
    sort_by = request.args.get('sort', 'newest')
    if sort_by == 'name':
        query = query.order_by(Project.project_name.asc())
    elif sort_by == 'oldest':
        query = query.order_by(Project.created_at.asc())
    else:  # newest (default)
        query = query.order_by(Project.created_at.desc())

    projects = query.all()
    return jsonify({'projects': [p.to_dict() for p in projects]}), 200


# --------------------------------------------------
# GET /api/projects/<id> — Get single project
# --------------------------------------------------
@projects_bp.route('/<int:project_id>', methods=['GET'])
@jwt_required()
def get_project(project_id):
    """Return details for a single project including stats."""
    project = Project.query.get(project_id)
    if not project:
        return jsonify({'error': 'Project not found'}), 404

    # Employees can only view projects they are assigned to
    claims = get_jwt()
    if claims.get('role') == 'employee':
        current_user_id = int(get_jwt_identity())
        assigned = Issue.query.filter_by(
            project_id=project_id, assigned_to=current_user_id
        ).first()
        if not assigned:
            return jsonify({'error': 'Access denied'}), 403

    return jsonify({'project': project.to_dict()}), 200


# --------------------------------------------------
# POST /api/projects — Create a new project (FR-8)
# --------------------------------------------------
@projects_bp.route('', methods=['POST'])
@admin_required
def create_project():
    """Create a new project. Admin only."""
    data = request.get_json()

    # --- Validate required fields ---
    name = (data.get('project_name') or '').strip()
    description = (data.get('description') or '').strip()
    start_date_str = data.get('start_date')
    end_date_str = data.get('end_date')
    manager_id = data.get('manager_id')

    start_date = None
    if start_date_str:
        try:
            start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
        except ValueError:
            errors.append('Invalid start_date format. Use YYYY-MM-DD')

    end_date = None
    if end_date_str:
        try:
            end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
        except ValueError:
            errors.append('Invalid end_date format. Use YYYY-MM-DD')

    errors = []
    if not name:
        errors.append('Project name is required')
    if len(name) > 200:
        errors.append('Project name must be 200 characters or less')

    if errors:
        return jsonify({'error': '; '.join(errors)}), 400

    # Check duplicate name
    existing = Project.query.filter(
        db.func.lower(Project.project_name) == name.lower()
    ).first()
    if existing:
        return jsonify({'error': 'A project with this name already exists'}), 409

    # Validate manager if provided
    if manager_id:
        manager = User.query.get(manager_id)
        if not manager:
            return jsonify({'error': 'Selected manager not found'}), 400
        if manager.role not in ('admin', 'manager'):
            return jsonify({'error': 'Selected user is not a manager or admin'}), 400

    admin_id = int(get_jwt_identity())

    project = Project(
        project_name=name,
        description=description or None,
        start_date=start_date,
        end_date=end_date,
        status='active',
        created_by=admin_id,
        manager_id=manager_id,
    )

    db.session.add(project)
    db.session.flush()  # get project_id before commit

    _log_activity(admin_id, 'project_created',
                  f'Created project "{name}"',
                  entity_id=project.project_id)

    db.session.commit()

    return jsonify({
        'message': f'Project "{name}" created successfully',
        'project': project.to_dict(),
    }), 201


# --------------------------------------------------
# PUT /api/projects/<id> — Update project info (FR-9)
# --------------------------------------------------
@projects_bp.route('/<int:project_id>', methods=['PUT'])
@admin_required
def update_project(project_id):
    """Update project information. Admin only."""
    project = Project.query.get(project_id)
    if not project:
        return jsonify({'error': 'Project not found'}), 404

    data = request.get_json()
    changes = []

    # --- Name ---
    name = (data.get('project_name') or '').strip()
    if name and name != project.project_name:
        existing = Project.query.filter(
            db.func.lower(Project.project_name) == name.lower(),
            Project.project_id != project_id
        ).first()
        if existing:
            return jsonify({'error': 'A project with this name already exists'}), 409
        changes.append(f'name: "{project.project_name}" → "{name}"')
        project.project_name = name

    # --- Description ---
    description = data.get('description')
    if description is not None:
        new_desc = description.strip() if description else None
        if new_desc != project.description:
            changes.append('description updated')
            project.description = new_desc

    # --- Start Date ---
    if 'start_date' in data:
        start_date_str = data.get('start_date')
        new_start = None
        if start_date_str:
            try:
                new_start = datetime.strptime(start_date_str, '%Y-%m-%d').date()
            except ValueError:
                return jsonify({'error': 'Invalid start_date format. Use YYYY-MM-DD'}), 400
        
        if project.start_date != new_start:
            changes.append(f'start_date: {project.start_date} → {new_start}')
            project.start_date = new_start

    # --- End Date ---
    if 'end_date' in data:
        end_date_str = data.get('end_date')
        new_end = None
        if end_date_str:
            try:
                new_end = datetime.strptime(end_date_str, '%Y-%m-%d').date()
            except ValueError:
                return jsonify({'error': 'Invalid end_date format. Use YYYY-MM-DD'}), 400

        if project.end_date != new_end:
            changes.append(f'end_date: {project.end_date} → {new_end}')
            project.end_date = new_end

    # --- Manager ---
    manager_id = data.get('manager_id')
    if manager_id is not None:
        new_manager_id = manager_id if manager_id else None
        if new_manager_id != project.manager_id:
            if new_manager_id:
                manager = User.query.get(new_manager_id)
                if not manager:
                    return jsonify({'error': 'Selected manager not found'}), 400
                if manager.role not in ('admin', 'manager'):
                    return jsonify({'error': 'Selected user is not a manager or admin'}), 400
            changes.append(f'manager updated')
            project.manager_id = new_manager_id

    if not changes:
        return jsonify({'message': 'No changes detected', 'project': project.to_dict()}), 200

    admin_id = int(get_jwt_identity())
    _log_activity(admin_id, 'project_updated',
                  f'Updated project #{project_id}: {"; ".join(changes)}',
                  entity_id=project_id)

    db.session.commit()

    return jsonify({
        'message': f'Project "{project.project_name}" updated successfully',
        'project': project.to_dict(),
    }), 200


# --------------------------------------------------
# PATCH /api/projects/<id>/archive — Archive / Restore (FR-10)
# --------------------------------------------------
@projects_bp.route('/<int:project_id>/archive', methods=['PATCH'])
@admin_required
def toggle_project_archive(project_id):
    """Archive or restore a project. Admin only."""
    project = Project.query.get(project_id)
    if not project:
        return jsonify({'error': 'Project not found'}), 404

    # Toggle status
    new_status = 'archived' if project.status == 'active' else 'active'
    project.status = new_status

    admin_id = int(get_jwt_identity())
    action = 'project_archived' if new_status == 'archived' else 'project_restored'
    _log_activity(admin_id, action,
                  f'{"Archived" if new_status == "archived" else "Restored"} project "{project.project_name}"',
                  entity_id=project_id)

    db.session.commit()

    status_text = 'archived' if new_status == 'archived' else 'restored'
    return jsonify({
        'message': f'Project "{project.project_name}" {status_text} successfully',
        'project': project.to_dict(),
    }), 200


# --------------------------------------------------
# GET /api/projects/<id>/members — List assignable users
# --------------------------------------------------
@projects_bp.route('/<int:project_id>/members', methods=['GET'])
@manager_or_admin_required
def get_project_members(project_id):
    """Return active users who can be assigned issues in this project."""
    project = Project.query.get(project_id)
    if not project:
        return jsonify({'error': 'Project not found'}), 404

    # Return all active users (they can be assigned to issues)
    users = User.query.filter_by(is_active=True).order_by(User.name).all()

    return jsonify({
        'members': [u.to_dict() for u in users],
    }), 200
