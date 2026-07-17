"""
Issue Management routes — CRUD operations for issues.
Managers/Admins can create and assign issues.
Employees can view assigned issues and update status.
Supports status workflow validation and priority management.
"""
from datetime import datetime
from functools import wraps
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from models import db
from models.issue import Issue
from models.project import Project
from models.user import User
from models.activity_log import ActivityLog

issues_bp = Blueprint('issues', __name__)


# ---- Role-based access decorators ----

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
        entity_type='issue',
        entity_id=entity_id,
    )
    db.session.add(log)


# ---- Priority / Status badge helpers ----

PRIORITY_BADGE = {
    'low': 'badge-emerald',
    'medium': 'badge-blue',
    'high': 'badge-amber',
    'critical': 'badge-rose',
}

STATUS_BADGE = {
    'open': 'badge-violet',
    'in_progress': 'badge-blue',
    'testing': 'badge-amber',
    'resolved': 'badge-emerald',
    'closed': 'badge-slate',
}


# --------------------------------------------------
# GET /api/issues — List all issues (with filters)
# --------------------------------------------------
@issues_bp.route('', methods=['GET'])
@jwt_required()
def list_issues():
    """
    Return issues visible to the current user.
    Admins & Managers see all issues.
    Employees see only issues assigned to them.
    """
    claims = get_jwt()
    role = claims.get('role')
    current_user_id = int(get_jwt_identity())

    query = Issue.query

    # Employees can only see their assigned issues
    if role == 'employee':
        query = query.filter_by(assigned_to=current_user_id)

    # ---- Filters ----
    project_id = request.args.get('project_id')
    if project_id:
        query = query.filter_by(project_id=int(project_id))

    status = request.args.get('status')
    if status and status in Issue.STATUS_OPTIONS:
        query = query.filter_by(status=status)

    priority = request.args.get('priority')
    if priority and priority in Issue.PRIORITY_LEVELS:
        query = query.filter_by(priority=priority)

    assigned_to = request.args.get('assigned_to')
    if assigned_to:
        query = query.filter_by(assigned_to=int(assigned_to))

    search = request.args.get('search', '').strip()
    if search:
        pattern = f'%{search}%'
        query = query.filter(
            db.or_(
                Issue.title.ilike(pattern),
                Issue.description.ilike(pattern),
            )
        )

    # ---- Sorting ----
    sort_by = request.args.get('sort', 'newest')
    if sort_by == 'oldest':
        query = query.order_by(Issue.created_at.asc())
    elif sort_by == 'priority':
        # Critical → High → Medium → Low
        priority_order = db.case(
            {'critical': 0, 'high': 1, 'medium': 2, 'low': 3},
            value=Issue.priority,
            else_=4,
        )
        query = query.order_by(priority_order.asc(), Issue.created_at.desc())
    elif sort_by == 'due_date':
        query = query.order_by(
            db.case((Issue.due_date.is_(None), 1), else_=0),  # nulls last
            Issue.due_date.asc(),
        )
    elif sort_by == 'status':
        status_order = db.case(
            {'open': 0, 'in_progress': 1, 'testing': 2, 'resolved': 3, 'closed': 4},
            value=Issue.status,
            else_=5,
        )
        query = query.order_by(status_order.asc(), Issue.created_at.desc())
    else:  # newest (default)
        query = query.order_by(Issue.created_at.desc())

    issues = query.all()
    return jsonify({'issues': [i.to_dict() for i in issues]}), 200


# --------------------------------------------------
# GET /api/issues/<id> — Get single issue
# --------------------------------------------------
@issues_bp.route('/<int:issue_id>', methods=['GET'])
@jwt_required()
def get_issue(issue_id):
    """Return details for a single issue."""
    issue = Issue.query.get(issue_id)
    if not issue:
        return jsonify({'error': 'Issue not found'}), 404

    # Employees can only view issues assigned to them
    claims = get_jwt()
    if claims.get('role') == 'employee':
        current_user_id = int(get_jwt_identity())
        if issue.assigned_to != current_user_id:
            return jsonify({'error': 'Access denied'}), 403

    return jsonify({'issue': issue.to_dict()}), 200


# --------------------------------------------------
# POST /api/issues — Create a new issue (FR-12, FR-13)
# --------------------------------------------------
@issues_bp.route('', methods=['POST'])
@manager_or_admin_required
def create_issue():
    """Create a new issue. Manager/Admin only."""
    data = request.get_json()

    # --- Validate required fields ---
    errors = []

    title = (data.get('title') or '').strip()
    if not title:
        errors.append('Title is required')
    if len(title) > 300:
        errors.append('Title must be 300 characters or less')

    description = (data.get('description') or '').strip()

    project_id = data.get('project_id')
    if not project_id:
        errors.append('Project is required')
    else:
        project = Project.query.get(project_id)
        if not project:
            errors.append('Selected project not found')
        elif project.status == 'archived':
            errors.append('Cannot create issues in an archived project')

    priority = (data.get('priority') or 'medium').strip().lower()
    if priority not in Issue.PRIORITY_LEVELS:
        errors.append(f'Invalid priority. Must be one of: {", ".join(Issue.PRIORITY_LEVELS)}')

    assigned_to = data.get('assigned_to')
    if assigned_to:
        assignee = User.query.get(assigned_to)
        if not assignee:
            errors.append('Assigned user not found')
        elif not assignee.is_active:
            errors.append('Assigned user is inactive')

    due_date = None
    due_date_str = data.get('due_date')
    if due_date_str:
        try:
            due_date = datetime.strptime(due_date_str, '%Y-%m-%d').date()
        except ValueError:
            errors.append('Invalid due_date format. Use YYYY-MM-DD')

    if errors:
        return jsonify({'error': '; '.join(errors)}), 400

    creator_id = int(get_jwt_identity())

    issue = Issue(
        title=title,
        description=description or None,
        project_id=project_id,
        assigned_to=assigned_to or None,
        created_by=creator_id,
        priority=priority,
        status='open',
        due_date=due_date,
    )

    db.session.add(issue)
    db.session.flush()  # get issue_id before commit

    _log_activity(creator_id, 'issue_created',
                  f'Created issue "{title}" in project #{project_id}',
                  entity_id=issue.issue_id)

    if assigned_to:
        _log_activity(creator_id, 'issue_assigned',
                      f'Assigned issue "{title}" to user #{assigned_to}',
                      entity_id=issue.issue_id)

    db.session.commit()

    return jsonify({
        'message': f'Issue "{title}" created successfully',
        'issue': issue.to_dict(),
    }), 201


# --------------------------------------------------
# PUT /api/issues/<id> — Update issue details (FR-15)
# --------------------------------------------------
@issues_bp.route('/<int:issue_id>', methods=['PUT'])
@manager_or_admin_required
def update_issue(issue_id):
    """Update issue information. Manager/Admin only."""
    issue = Issue.query.get(issue_id)
    if not issue:
        return jsonify({'error': 'Issue not found'}), 404

    data = request.get_json()
    changes = []
    updater_id = int(get_jwt_identity())

    # --- Title ---
    title = (data.get('title') or '').strip()
    if title and title != issue.title:
        if len(title) > 300:
            return jsonify({'error': 'Title must be 300 characters or less'}), 400
        changes.append(f'title: "{issue.title}" → "{title}"')
        issue.title = title

    # --- Description ---
    description = data.get('description')
    if description is not None:
        new_desc = description.strip() if description else None
        if new_desc != issue.description:
            changes.append('description updated')
            issue.description = new_desc

    # --- Project ---
    new_project_id = data.get('project_id')
    if new_project_id and new_project_id != issue.project_id:
        project = Project.query.get(new_project_id)
        if not project:
            return jsonify({'error': 'Selected project not found'}), 400
        if project.status == 'archived':
            return jsonify({'error': 'Cannot move issue to an archived project'}), 400
        changes.append(f'moved to project #{new_project_id}')
        issue.project_id = new_project_id

    # --- Priority ---
    new_priority = data.get('priority')
    if new_priority and new_priority != issue.priority:
        if new_priority not in Issue.PRIORITY_LEVELS:
            return jsonify({'error': f'Invalid priority. Must be one of: {", ".join(Issue.PRIORITY_LEVELS)}'}), 400
        changes.append(f'priority: {issue.priority} → {new_priority}')
        issue.priority = new_priority

    # --- Assigned To (FR-14) ---
    if 'assigned_to' in data:
        new_assigned = data.get('assigned_to')
        new_assigned_id = new_assigned if new_assigned else None
        if new_assigned_id != issue.assigned_to:
            if new_assigned_id:
                assignee = User.query.get(new_assigned_id)
                if not assignee:
                    return jsonify({'error': 'Assigned user not found'}), 400
                if not assignee.is_active:
                    return jsonify({'error': 'Assigned user is inactive'}), 400
                changes.append(f'assigned to user #{new_assigned_id}')
                _log_activity(updater_id, 'issue_assigned',
                              f'Assigned issue "{issue.title}" to {assignee.name}',
                              entity_id=issue_id)
            else:
                changes.append('unassigned')
            issue.assigned_to = new_assigned_id

    # --- Due Date ---
    if 'due_date' in data:
        due_date_str = data.get('due_date')
        new_due = None
        if due_date_str:
            try:
                new_due = datetime.strptime(due_date_str, '%Y-%m-%d').date()
            except ValueError:
                return jsonify({'error': 'Invalid due_date format. Use YYYY-MM-DD'}), 400
        if issue.due_date != new_due:
            changes.append(f'due_date: {issue.due_date} → {new_due}')
            issue.due_date = new_due

    if not changes:
        return jsonify({'message': 'No changes detected', 'issue': issue.to_dict()}), 200

    _log_activity(updater_id, 'issue_updated',
                  f'Updated issue #{issue_id}: {"; ".join(changes)}',
                  entity_id=issue_id)

    db.session.commit()

    return jsonify({
        'message': f'Issue "{issue.title}" updated successfully',
        'issue': issue.to_dict(),
    }), 200


# --------------------------------------------------
# PATCH /api/issues/<id>/status — Update issue status (FR-17, FR-18, FR-19)
# --------------------------------------------------
@issues_bp.route('/<int:issue_id>/status', methods=['PATCH'])
@jwt_required()
def update_issue_status(issue_id):
    """
    Update issue status with workflow validation.
    Employees can update status on their assigned issues.
    Managers/Admins can update status on any issue.
    """
    issue = Issue.query.get(issue_id)
    if not issue:
        return jsonify({'error': 'Issue not found'}), 404

    claims = get_jwt()
    role = claims.get('role')
    current_user_id = int(get_jwt_identity())

    # Employees can only update status of issues assigned to them
    if role == 'employee' and issue.assigned_to != current_user_id:
        return jsonify({'error': 'You can only update status of issues assigned to you'}), 403

    data = request.get_json()
    new_status = (data.get('status') or '').strip().lower()

    if not new_status:
        return jsonify({'error': 'Status is required'}), 400

    if new_status not in Issue.STATUS_OPTIONS:
        return jsonify({
            'error': f'Invalid status. Must be one of: {", ".join(Issue.STATUS_OPTIONS)}'
        }), 400

    if new_status == issue.status:
        return jsonify({'message': 'Status unchanged', 'issue': issue.to_dict()}), 200

    # Validate status transition
    if not issue.can_transition_to(new_status):
        allowed = Issue.VALID_TRANSITIONS.get(issue.status, [])
        return jsonify({
            'error': f'Cannot transition from "{issue.status}" to "{new_status}". '
                     f'Allowed transitions: {", ".join(allowed) if allowed else "none"}'
        }), 400

    old_status = issue.status
    issue.status = new_status

    _log_activity(current_user_id, 'status_changed',
                  f'Issue "{issue.title}" status: {old_status} → {new_status}',
                  entity_id=issue_id)

    db.session.commit()

    return jsonify({
        'message': f'Status updated from "{old_status}" to "{new_status}"',
        'issue': issue.to_dict(),
    }), 200


# --------------------------------------------------
# DELETE /api/issues/<id> — Delete an issue
# --------------------------------------------------
@issues_bp.route('/<int:issue_id>', methods=['DELETE'])
@manager_or_admin_required
def delete_issue(issue_id):
    """Delete an issue. Manager/Admin only."""
    issue = Issue.query.get(issue_id)
    if not issue:
        return jsonify({'error': 'Issue not found'}), 404

    title = issue.title
    deleter_id = int(get_jwt_identity())

    _log_activity(deleter_id, 'issue_deleted',
                  f'Deleted issue "{title}" from project #{issue.project_id}',
                  entity_id=issue_id)

    db.session.delete(issue)
    db.session.commit()

    return jsonify({'message': f'Issue "{title}" deleted successfully'}), 200


# --------------------------------------------------
# GET /api/issues/assignees — Get assignable users
# --------------------------------------------------
@issues_bp.route('/assignees', methods=['GET'])
@jwt_required()
def get_assignees():
    """Return list of active users who can be assigned issues."""
    users = User.query.filter_by(is_active=True).order_by(User.name).all()
    return jsonify({
        'assignees': [u.to_dict() for u in users],
    }), 200


# --------------------------------------------------
# GET /api/issues/stats — Issue statistics
# --------------------------------------------------
@issues_bp.route('/stats', methods=['GET'])
@jwt_required()
def issue_stats():
    """Return aggregated issue statistics for dashboard widgets."""
    claims = get_jwt()
    role = claims.get('role')
    current_user_id = int(get_jwt_identity())

    base_query = Issue.query
    if role == 'employee':
        base_query = base_query.filter_by(assigned_to=current_user_id)

    total = base_query.count()
    open_count = base_query.filter(Issue.status.in_(['open', 'in_progress'])).count()
    testing_count = base_query.filter_by(status='testing').count()
    resolved_count = base_query.filter(Issue.status.in_(['resolved', 'closed'])).count()

    from datetime import date
    today = date.today()
    overdue_count = base_query.filter(
        Issue.due_date < today,
        Issue.status.notin_(['resolved', 'closed']),
    ).count()

    # Priority breakdown
    critical = base_query.filter_by(priority='critical').filter(
        Issue.status.notin_(['resolved', 'closed'])
    ).count()
    high = base_query.filter_by(priority='high').filter(
        Issue.status.notin_(['resolved', 'closed'])
    ).count()

    return jsonify({
        'stats': {
            'total': total,
            'open': open_count,
            'testing': testing_count,
            'resolved': resolved_count,
            'overdue': overdue_count,
            'critical_active': critical,
            'high_active': high,
        }
    }), 200
