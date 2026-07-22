"""
Reporting routes — Generate reports for project monitoring.
FR-32: Generate issue reports.
FR-33: Generate employee performance reports.
FR-34: Generate project completion reports.
FR-35: Export reports (CSV format).
"""
import csv
import io
from datetime import date, datetime
from flask import Blueprint, request, jsonify, Response
from flask_jwt_extended import jwt_required, get_jwt
from models import db
from models.issue import Issue
from models.project import Project
from models.user import User
from models.comment import Comment
from models.activity_log import ActivityLog

reports_bp = Blueprint('reports', __name__)


def _admin_or_manager_required():
    """Check if the current user is admin or manager."""
    claims = get_jwt()
    return claims.get('role') in ('admin', 'manager')


# --------------------------------------------------
# GET /api/reports/issues — Issue report (FR-32)
# --------------------------------------------------
@reports_bp.route('/issues', methods=['GET'])
@jwt_required()
def issue_report():
    """Generate a detailed issue report with filters."""
    if not _admin_or_manager_required():
        return jsonify({'error': 'Manager or Admin access required'}), 403

    query = Issue.query

    # Filters
    project_id = request.args.get('project_id')
    if project_id:
        query = query.filter_by(project_id=int(project_id))

    status = request.args.get('status')
    if status:
        query = query.filter_by(status=status)

    priority = request.args.get('priority')
    if priority:
        query = query.filter_by(priority=priority)

    issues = query.order_by(Issue.created_at.desc()).all()

    today = date.today()
    report_data = []
    for issue in issues:
        assignee = User.query.get(issue.assigned_to) if issue.assigned_to else None
        project = Project.query.get(issue.project_id) if issue.project_id else None

        is_overdue = (
            issue.due_date is not None
            and issue.due_date < today
            and issue.status not in ('resolved', 'closed')
        )

        report_data.append({
            'issue_id': issue.issue_id,
            'title': issue.title,
            'project_name': project.project_name if project else 'N/A',
            'assigned_to': assignee.name if assignee else 'Unassigned',
            'priority': issue.priority,
            'status': issue.status,
            'due_date': issue.due_date.isoformat() if issue.due_date else None,
            'is_overdue': is_overdue,
            'created_at': issue.created_at.isoformat() if issue.created_at else None,
        })

    # Summary counts
    total = len(report_data)
    by_status = {}
    by_priority = {}
    overdue_count = 0
    for r in report_data:
        by_status[r['status']] = by_status.get(r['status'], 0) + 1
        by_priority[r['priority']] = by_priority.get(r['priority'], 0) + 1
        if r['is_overdue']:
            overdue_count += 1

    return jsonify({
        'report': {
            'title': 'Issue Report',
            'generated_at': datetime.utcnow().isoformat(),
            'total_issues': total,
            'overdue_count': overdue_count,
            'by_status': by_status,
            'by_priority': by_priority,
            'issues': report_data,
        }
    }), 200


# --------------------------------------------------
# GET /api/reports/performance — Employee performance (FR-33)
# --------------------------------------------------
@reports_bp.route('/performance', methods=['GET'])
@jwt_required()
def performance_report():
    """Generate employee performance report."""
    if not _admin_or_manager_required():
        return jsonify({'error': 'Manager or Admin access required'}), 403

    users = User.query.filter_by(is_active=True).order_by(User.name).all()
    today = date.today()

    employee_data = []
    for user in users:
        assigned = Issue.query.filter_by(assigned_to=user.user_id)
        total_assigned = assigned.count()

        resolved = assigned.filter(
            Issue.status.in_(['resolved', 'closed'])
        ).count()

        in_progress = assigned.filter_by(status='in_progress').count()

        overdue = assigned.filter(
            Issue.due_date < today,
            Issue.status.notin_(['resolved', 'closed']),
        ).count()

        # Resolution rate
        resolution_rate = round((resolved / total_assigned) * 100) if total_assigned > 0 else 0

        # Comments count (engagement metric)
        comment_count = Comment.query.filter_by(user_id=user.user_id).count()

        employee_data.append({
            'user_id': user.user_id,
            'name': user.name,
            'email': user.email,
            'role': user.role,
            'total_assigned': total_assigned,
            'resolved': resolved,
            'in_progress': in_progress,
            'overdue': overdue,
            'resolution_rate': resolution_rate,
            'comments': comment_count,
        })

    # Sort by resolution rate descending
    employee_data.sort(key=lambda x: x['resolution_rate'], reverse=True)

    return jsonify({
        'report': {
            'title': 'Employee Performance Report',
            'generated_at': datetime.utcnow().isoformat(),
            'total_employees': len(employee_data),
            'employees': employee_data,
        }
    }), 200


# --------------------------------------------------
# GET /api/reports/projects — Project completion (FR-34)
# --------------------------------------------------
@reports_bp.route('/projects', methods=['GET'])
@jwt_required()
def project_report():
    """Generate project completion report."""
    if not _admin_or_manager_required():
        return jsonify({'error': 'Manager or Admin access required'}), 403

    projects = Project.query.order_by(Project.project_name).all()
    today = date.today()

    project_data = []
    for p in projects:
        p_issues = Issue.query.filter_by(project_id=p.project_id)
        total = p_issues.count()
        resolved = p_issues.filter(Issue.status.in_(['resolved', 'closed'])).count()
        open_count = p_issues.filter(Issue.status.in_(['open', 'in_progress'])).count()
        testing = p_issues.filter_by(status='testing').count()
        overdue = p_issues.filter(
            Issue.due_date < today,
            Issue.status.notin_(['resolved', 'closed']),
        ).count()

        progress = round((resolved / total) * 100) if total > 0 else 0

        # Get team members assigned to this project
        member_ids = db.session.query(Issue.assigned_to).filter(
            Issue.project_id == p.project_id,
            Issue.assigned_to.isnot(None),
        ).distinct().all()
        team_size = len(member_ids)

        project_data.append({
            'project_id': p.project_id,
            'project_name': p.project_name,
            'description': p.description,
            'status': p.status,
            'start_date': p.start_date.isoformat() if p.start_date else None,
            'end_date': p.end_date.isoformat() if p.end_date else None,
            'total_issues': total,
            'resolved_issues': resolved,
            'open_issues': open_count,
            'testing_issues': testing,
            'overdue_issues': overdue,
            'progress': progress,
            'team_size': team_size,
        })

    return jsonify({
        'report': {
            'title': 'Project Completion Report',
            'generated_at': datetime.utcnow().isoformat(),
            'total_projects': len(project_data),
            'projects': project_data,
        }
    }), 200


# --------------------------------------------------
# GET /api/reports/export/<type> — Export report as CSV (FR-35)
# --------------------------------------------------
@reports_bp.route('/export/<report_type>', methods=['GET'])
@jwt_required()
def export_report(report_type):
    """Export a report as CSV."""
    if not _admin_or_manager_required():
        return jsonify({'error': 'Manager or Admin access required'}), 403

    output = io.StringIO()
    writer = csv.writer(output)
    today = date.today()

    if report_type == 'issues':
        writer.writerow(['Issue ID', 'Title', 'Project', 'Assigned To', 'Priority', 'Status', 'Due Date', 'Overdue', 'Created At'])
        issues = Issue.query.order_by(Issue.created_at.desc()).all()
        for issue in issues:
            assignee = User.query.get(issue.assigned_to) if issue.assigned_to else None
            project = Project.query.get(issue.project_id) if issue.project_id else None
            is_overdue = (
                issue.due_date is not None
                and issue.due_date < today
                and issue.status not in ('resolved', 'closed')
            )
            writer.writerow([
                issue.issue_id,
                issue.title,
                project.project_name if project else 'N/A',
                assignee.name if assignee else 'Unassigned',
                issue.priority,
                issue.status,
                issue.due_date.isoformat() if issue.due_date else '',
                'Yes' if is_overdue else 'No',
                issue.created_at.isoformat() if issue.created_at else '',
            ])

    elif report_type == 'performance':
        writer.writerow(['Name', 'Email', 'Role', 'Assigned', 'Resolved', 'In Progress', 'Overdue', 'Resolution Rate %', 'Comments'])
        users = User.query.filter_by(is_active=True).order_by(User.name).all()
        for user in users:
            assigned = Issue.query.filter_by(assigned_to=user.user_id)
            total_assigned = assigned.count()
            resolved = assigned.filter(Issue.status.in_(['resolved', 'closed'])).count()
            in_progress = assigned.filter_by(status='in_progress').count()
            overdue = assigned.filter(
                Issue.due_date < today,
                Issue.status.notin_(['resolved', 'closed']),
            ).count()
            rate = round((resolved / total_assigned) * 100) if total_assigned > 0 else 0
            comment_count = Comment.query.filter_by(user_id=user.user_id).count()
            writer.writerow([
                user.name, user.email, user.role,
                total_assigned, resolved, in_progress, overdue,
                rate, comment_count,
            ])

    elif report_type == 'projects':
        writer.writerow(['Project', 'Status', 'Total Issues', 'Resolved', 'Open', 'Testing', 'Overdue', 'Progress %', 'Team Size'])
        projects = Project.query.order_by(Project.project_name).all()
        for p in projects:
            p_issues = Issue.query.filter_by(project_id=p.project_id)
            total = p_issues.count()
            resolved = p_issues.filter(Issue.status.in_(['resolved', 'closed'])).count()
            open_c = p_issues.filter(Issue.status.in_(['open', 'in_progress'])).count()
            testing = p_issues.filter_by(status='testing').count()
            overdue = p_issues.filter(
                Issue.due_date < today,
                Issue.status.notin_(['resolved', 'closed']),
            ).count()
            progress = round((resolved / total) * 100) if total > 0 else 0
            team = db.session.query(Issue.assigned_to).filter(
                Issue.project_id == p.project_id,
                Issue.assigned_to.isnot(None),
            ).distinct().count()
            writer.writerow([
                p.project_name, p.status, total, resolved, open_c,
                testing, overdue, progress, team,
            ])
    else:
        return jsonify({'error': f'Unknown report type: {report_type}'}), 400

    output.seek(0)
    return Response(
        output.getvalue(),
        mimetype='text/csv',
        headers={
            'Content-Disposition': f'attachment; filename={report_type}_report_{today.isoformat()}.csv'
        }
    )


# --------------------------------------------------
# GET /api/reports/export-pdf/<type> — Export report as PDF (FR-35)
# --------------------------------------------------
@reports_bp.route('/export-pdf/<report_type>', methods=['GET'])
@jwt_required()
def export_pdf_report(report_type):
    """Export a report as a styled PDF document."""
    if not _admin_or_manager_required():
        return jsonify({'error': 'Manager or Admin access required'}), 403

    from reportlab.lib.pagesizes import letter, landscape
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib import colors

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=landscape(letter),
        rightMargin=36, leftMargin=36, topMargin=36, bottomMargin=36
    )

    elements = []
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontSize=20,
        leading=24,
        textColor=colors.HexColor('#0F172A'),
        spaceAfter=6
    )
    meta_style = ParagraphStyle(
        'DocMeta',
        parent=styles['Normal'],
        fontSize=9,
        leading=12,
        textColor=colors.HexColor('#64748B'),
        spaceAfter=14
    )
    cell_style = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontSize=9,
        leading=11,
        textColor=colors.HexColor('#1E293B')
    )
    header_style = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontSize=9,
        leading=11,
        fontName='Helvetica-Bold',
        textColor=colors.white
    )

    today = date.today()

    if report_type == 'issues':
        elements.append(Paragraph("Issue Management Report", title_style))
        elements.append(Paragraph(f"Generated on {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')} | Mini Jira Issue Tracker", meta_style))

        headers = ['ID', 'Title', 'Project', 'Assignee', 'Priority', 'Status', 'Due Date']
        table_data = [[Paragraph(h, header_style) for h in headers]]

        issues = Issue.query.order_by(Issue.created_at.desc()).all()
        for issue in issues:
            assignee = User.query.get(issue.assigned_to) if issue.assigned_to else None
            project = Project.query.get(issue.project_id) if issue.project_id else None
            row = [
                Paragraph(f"#{issue.issue_id}", cell_style),
                Paragraph(issue.title or '', cell_style),
                Paragraph(project.project_name if project else 'N/A', cell_style),
                Paragraph(assignee.name if assignee else 'Unassigned', cell_style),
                Paragraph((issue.priority or '').capitalize(), cell_style),
                Paragraph((issue.status or '').replace('_', ' ').title(), cell_style),
                Paragraph(issue.due_date.isoformat() if issue.due_date else '—', cell_style),
            ]
            table_data.append(row)

        t = Table(table_data, colWidths=[40, 240, 120, 110, 70, 80, 80])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#4F46E5')),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F8FAFC')]),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
        ]))
        elements.append(t)

    elif report_type == 'performance':
        elements.append(Paragraph("Employee Performance Report", title_style))
        elements.append(Paragraph(f"Generated on {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')} | Mini Jira Issue Tracker", meta_style))

        headers = ['Employee', 'Role', 'Assigned', 'Resolved', 'In Progress', 'Overdue', 'Resolution Rate', 'Comments']
        table_data = [[Paragraph(h, header_style) for h in headers]]

        users = User.query.filter_by(is_active=True).order_by(User.name).all()
        for u in users:
            assigned = Issue.query.filter_by(assigned_to=u.user_id)
            total = assigned.count()
            resolved = assigned.filter(Issue.status.in_(['resolved', 'closed'])).count()
            in_prog = assigned.filter_by(status='in_progress').count()
            overdue = assigned.filter(Issue.due_date < today, Issue.status.notin_(['resolved', 'closed'])).count()
            rate = round((resolved / total) * 100) if total > 0 else 0
            comments = Comment.query.filter_by(user_id=u.user_id).count()

            row = [
                Paragraph(u.name, cell_style),
                Paragraph(u.role.capitalize(), cell_style),
                Paragraph(str(total), cell_style),
                Paragraph(str(resolved), cell_style),
                Paragraph(str(in_prog), cell_style),
                Paragraph(str(overdue), cell_style),
                Paragraph(f"{rate}%", cell_style),
                Paragraph(str(comments), cell_style),
            ]
            table_data.append(row)

        t = Table(table_data, colWidths=[150, 80, 70, 70, 80, 70, 110, 70])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0284C7')),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F8FAFC')]),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
        ]))
        elements.append(t)

    elif report_type == 'projects':
        elements.append(Paragraph("Project Completion Report", title_style))
        elements.append(Paragraph(f"Generated on {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')} | Mini Jira Issue Tracker", meta_style))

        headers = ['Project Name', 'Status', 'Total Issues', 'Resolved', 'Open', 'Overdue', 'Progress', 'Team Size']
        table_data = [[Paragraph(h, header_style) for h in headers]]

        projects = Project.query.order_by(Project.project_name).all()
        for p in projects:
            p_issues = Issue.query.filter_by(project_id=p.project_id)
            total = p_issues.count()
            resolved = p_issues.filter(Issue.status.in_(['resolved', 'closed'])).count()
            open_c = p_issues.filter(Issue.status.in_(['open', 'in_progress'])).count()
            overdue = p_issues.filter(Issue.due_date < today, Issue.status.notin_(['resolved', 'closed'])).count()
            progress = round((resolved / total) * 100) if total > 0 else 0
            team = db.session.query(Issue.assigned_to).filter(Issue.project_id == p.project_id, Issue.assigned_to.isnot(None)).distinct().count()

            row = [
                Paragraph(p.project_name, cell_style),
                Paragraph(p.status.capitalize(), cell_style),
                Paragraph(str(total), cell_style),
                Paragraph(str(resolved), cell_style),
                Paragraph(str(open_c), cell_style),
                Paragraph(str(overdue), cell_style),
                Paragraph(f"{progress}%", cell_style),
                Paragraph(str(team), cell_style),
            ]
            table_data.append(row)

        t = Table(table_data, colWidths=[180, 70, 80, 70, 70, 70, 80, 80])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#059669')),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F8FAFC')]),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
        ]))
        elements.append(t)

    else:
        return jsonify({'error': f'Unknown report type: {report_type}'}), 400

    doc.build(elements)
    buffer.seek(0)

    return Response(
        buffer.getvalue(),
        mimetype='application/pdf',
        headers={
            'Content-Disposition': f'attachment; filename={report_type}_report_{today.isoformat()}.pdf'
        }
    )

