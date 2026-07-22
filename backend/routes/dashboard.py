"""
Dashboard routes — Provides project overview.
FR-27: Display total issues.
FR-28: Display open issues.
FR-29: Display resolved issues.
FR-30: Display overdue issues.
FR-31: Display project progress.
"""
from datetime import date, datetime, timezone, timedelta
from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from models import db
from models.issue import Issue
from models.project import Project
from models.user import User
from models.activity_log import ActivityLog
from models.comment import Comment

dashboard_bp = Blueprint('dashboard', __name__)


@dashboard_bp.route('', methods=['GET'])
@jwt_required()
def get_dashboard():
    """
    Return comprehensive dashboard data.
    Admins & Managers see global data.
    Employees see only data relevant to their assignments.
    """
    claims = get_jwt()
    role = claims.get('role')
    current_user_id = int(get_jwt_identity())

    is_restricted = role == 'employee'
    base_issue_query = Issue.query
    if is_restricted:
        base_issue_query = base_issue_query.filter_by(assigned_to=current_user_id)

    today = date.today()

    # ---- Issue Statistics (FR-27 to FR-30) ----
    total_issues = base_issue_query.count()
    open_issues = base_issue_query.filter(
        Issue.status.in_(['open', 'in_progress'])
    ).count()
    testing_issues = base_issue_query.filter_by(status='testing').count()
    resolved_issues = base_issue_query.filter(
        Issue.status.in_(['resolved', 'closed'])
    ).count()
    overdue_issues = base_issue_query.filter(
        Issue.due_date < today,
        Issue.status.notin_(['resolved', 'closed']),
    ).count()

    # ---- Priority Breakdown ----
    active_issues = base_issue_query.filter(
        Issue.status.notin_(['resolved', 'closed'])
    )
    priority_data = {
        'critical': active_issues.filter_by(priority='critical').count(),
        'high': active_issues.filter_by(priority='high').count(),
        'medium': active_issues.filter_by(priority='medium').count(),
        'low': active_issues.filter_by(priority='low').count(),
    }

    # ---- Status Distribution ----
    status_data = {}
    for s in ['open', 'in_progress', 'testing', 'resolved', 'closed']:
        status_data[s] = base_issue_query.filter_by(status=s).count()

    # ---- Project Progress (FR-31) ----
    projects = []
    if is_restricted:
        # Get projects for employee's assigned issues
        project_ids = db.session.query(Issue.project_id).filter_by(
            assigned_to=current_user_id
        ).distinct().all()
        project_ids = [pid[0] for pid in project_ids if pid[0]]
        project_list = Project.query.filter(
            Project.project_id.in_(project_ids)
        ).all() if project_ids else []
    else:
        project_list = Project.query.filter(
            Project.status != 'archived'
        ).order_by(Project.project_name).all()

    for p in project_list:
        p_issues = Issue.query.filter_by(project_id=p.project_id)
        if is_restricted:
            p_issues = p_issues.filter_by(assigned_to=current_user_id)

        p_total = p_issues.count()
        p_resolved = p_issues.filter(
            Issue.status.in_(['resolved', 'closed'])
        ).count()
        p_overdue = p_issues.filter(
            Issue.due_date < today,
            Issue.status.notin_(['resolved', 'closed']),
        ).count()

        progress = round((p_resolved / p_total) * 100) if p_total > 0 else 0

        projects.append({
            'project_id': p.project_id,
            'project_name': p.project_name,
            'status': p.status,
            'total_issues': p_total,
            'resolved_issues': p_resolved,
            'overdue_issues': p_overdue,
            'progress': progress,
        })

    # ---- Recent Activity ----
    recent_query = ActivityLog.query
    if is_restricted:
        recent_query = recent_query.filter_by(user_id=current_user_id)
    recent_logs = recent_query.order_by(
        ActivityLog.timestamp.desc()
    ).limit(10).all()

    # ---- Team Stats (Admins/Managers only) ----
    team_stats = None
    if not is_restricted:
        total_users = User.query.filter_by(is_active=True).count()
        total_projects = Project.query.filter(
            Project.status != 'archived'
        ).count()

        # Issues created this week
        now = datetime.now(timezone.utc)
        start_of_week = now - timedelta(days=now.weekday())
        start_of_week = start_of_week.replace(hour=0, minute=0, second=0, microsecond=0)
        issues_this_week = Issue.query.filter(
            Issue.created_at >= start_of_week
        ).count()

        # Unassigned issues
        unassigned = Issue.query.filter(
            Issue.assigned_to.is_(None),
            Issue.status.notin_(['resolved', 'closed']),
        ).count()

        team_stats = {
            'total_users': total_users,
            'total_projects': total_projects,
            'issues_this_week': issues_this_week,
            'unassigned_issues': unassigned,
        }

    return jsonify({
        'issue_stats': {
            'total': total_issues,
            'open': open_issues,
            'testing': testing_issues,
            'resolved': resolved_issues,
            'overdue': overdue_issues,
        },
        'priority_breakdown': priority_data,
        'status_distribution': status_data,
        'projects': projects,
        'recent_activity': [log.to_dict() for log in recent_logs],
        'team_stats': team_stats,
    }), 200
