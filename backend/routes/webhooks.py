"""
GitHub Webhook Routes — Ingress point for receiving and processing GitHub Webhook events.
Handles HMAC signature verification, event dispatching (push, pull_request, ping),
and updates issue statuses and GitHubEvent records.
"""
from datetime import datetime, timezone
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from models import db
from models.issue import Issue
from models.project import Project
from models.github_event import GitHubEvent
from models.user import User
from models.activity_log import ActivityLog
from models.notification import Notification
from services.webhook_security import verify_github_signature
from services.github_parser import parse_push_payload, parse_pull_request_payload
from services.github_workflow import apply_github_workflow_transition

webhooks_bp = Blueprint('webhooks', __name__)


def _handle_webhook_payload(project=None):
    """
    Common handler for processing incoming GitHub webhook events.
    Verifies HMAC-SHA256 signature and applies workflow transitions.
    If project is provided, issue lookups are strictly scoped to project.project_id.
    """
    raw_payload = request.get_data(cache=True) or b''
    signature_header = request.headers.get('X-Hub-Signature-256') or request.headers.get('X-Hub-Signature')

    # Determine HMAC secret
    if project:
        secret = project.webhook_secret or ''
    else:
        secret = current_app.config.get('GITHUB_WEBHOOK_SECRET', '')

    # 1. Verify HMAC Signature
    is_valid, reason = verify_github_signature(raw_payload, signature_header, secret)
    if not is_valid:
        return jsonify({'error': 'Unauthorized', 'reason': reason}), 401

    # 2. Parse JSON payload
    import json
    try:
        payload = request.get_json(silent=True)
        if not payload and raw_payload:
            payload = json.loads(raw_payload.decode('utf-8'))
    except Exception:
        payload = None

    if not payload:
        return jsonify({'error': 'Invalid or empty JSON payload'}), 400

    event_type = request.headers.get('X-GitHub-Event', 'push')

    # 3. Handle 'ping' event (initial webhook setup handshake)
    if event_type == 'ping':
        zen = payload.get('zen', 'Practicality beats purity.')
        hook_id = payload.get('hook_id', 'unknown')
        return jsonify({
            'status': 'ok',
            'message': 'GitHub webhook connection verified successfully',
            'project': project.project_name if project else 'Global',
            'hook_id': hook_id,
            'zen': zen
        }), 200

    # 4. Extract parsed events based on event type
    auto_close_enabled = current_app.config.get('GITHUB_AUTO_CLOSE_ENABLED', True)
    parsed_events = []

    if event_type == 'push':
        parsed_events = parse_push_payload(payload)
    elif event_type == 'pull_request':
        parsed_events = parse_pull_request_payload(payload)
    else:
        return jsonify({
            'status': 'ignored',
            'message': f"Event type '{event_type}' is not tracked by IssueTrack",
            'processed_issues': []
        }), 200

    if not parsed_events:
        return jsonify({
            'status': 'ok',
            'message': 'Webhook received, but no issue references (#<id>) found in commits/PR',
            'processed_issues': []
        }), 200

    # 5. Process each event and update referenced issues
    processed_results = []

    for event_data in parsed_events:
        references = event_data.get('references', [])
        for ref in references:
            issue_id = ref['issue_id']
            intent = ref['intent']

            # Lookup issue — scoped to project if project webhook is used
            if project:
                issue = Issue.query.filter_by(issue_id=issue_id, project_id=project.project_id).first()
            else:
                issue = db.session.get(Issue, issue_id) if hasattr(db.session, 'get') else Issue.query.get(issue_id)

            if not issue:
                continue

            # Apply state transition
            changed, old_status, new_status, action_taken = apply_github_workflow_transition(
                issue=issue,
                intent=intent,
                auto_close_enabled=auto_close_enabled
            )

            # Parse event timestamp
            ts_str = event_data.get('timestamp')
            event_dt = None
            if ts_str:
                try:
                    event_dt = datetime.fromisoformat(ts_str.replace('Z', '+00:00'))
                except Exception:
                    event_dt = datetime.now(timezone.utc)
            else:
                event_dt = datetime.now(timezone.utc)

            # Create GitHubEvent record
            gh_event = GitHubEvent(
                issue_id=issue.issue_id,
                event_type=event_data.get('event_type', event_type),
                github_ref=event_data.get('github_ref', 'commit'),
                commit_sha=event_data.get('commit_sha'),
                branch=event_data.get('branch'),
                url=event_data.get('url'),
                author_name=event_data.get('author_name'),
                author_email=event_data.get('author_email'),
                author_avatar=event_data.get('author_avatar'),
                message=event_data.get('message'),
                action_taken=action_taken,
                timestamp=event_dt
            )
            db.session.add(gh_event)

            # Attribute activity log to matching user by email, or fallback to issue assignee/creator
            actor_user_id = None
            if gh_event.author_email:
                matched_user = User.query.filter_by(email=gh_event.author_email).first()
                if matched_user:
                    actor_user_id = matched_user.user_id

            if not actor_user_id:
                actor_user_id = issue.assigned_to or issue.created_by or 1

            action_name = 'github_pr_linked' if gh_event.event_type == 'pull_request' else 'github_commit_linked'
            status_note = f' (Status updated: {old_status} -> {new_status})' if changed else ''
            log_details = f'Linked {gh_event.event_type} [{gh_event.short_sha}] by {gh_event.author_name}: "{gh_event.message}"{status_note}'

            activity_entry = ActivityLog(
                user_id=actor_user_id,
                action=action_name,
                details=log_details,
                entity_type='issue',
                entity_id=issue.issue_id
            )
            db.session.add(activity_entry)

            # Notify assignee if assigned
            if issue.assigned_to:
                notif_msg = f'GitHub {gh_event.event_type} [{gh_event.short_sha}] by {gh_event.author_name} was linked to your issue "#{issue.title}"{status_note}'
                notif = Notification(
                    user_id=issue.assigned_to,
                    title=f'GitHub Activity on #{issue.issue_id}',
                    message=notif_msg
                )
                db.session.add(notif)

            processed_results.append({
                'issue_id': issue.issue_id,
                'issue_title': issue.title,
                'project_id': issue.project_id,
                'status_changed': changed,
                'old_status': old_status,
                'new_status': new_status,
                'action_taken': action_taken,
                'github_ref': gh_event.short_sha,
                'author': gh_event.author_name
            })

    db.session.commit()

    return jsonify({
        'status': 'success',
        'message': f'Successfully processed {len(processed_results)} issue reference(s)',
        'processed_count': len(processed_results),
        'results': processed_results
    }), 200


# --------------------------------------------------
# POST /api/webhooks/github/<webhook_token> — Project Webhook Receiver
# --------------------------------------------------
@webhooks_bp.route('/github/<string:webhook_token>', methods=['POST'])
def receive_project_github_webhook(webhook_token):
    """
    Project-dedicated webhook receiver endpoint.
    Looks up project by webhook_token, verifies with project.webhook_secret,
    and limits issue updates strictly to the given project.
    """
    project = Project.query.filter_by(webhook_token=webhook_token).first()
    if not project:
        return jsonify({'error': 'Not Found', 'message': 'Unknown or invalid project webhook token'}), 404

    return _handle_webhook_payload(project=project)


# --------------------------------------------------
# POST /api/webhooks/github — Global Fallback Receiver
# --------------------------------------------------
@webhooks_bp.route('/github', methods=['POST'])
def receive_github_webhook():
    """
    Global webhook receiver endpoint (uses GITHUB_WEBHOOK_SECRET from config).
    """
    return _handle_webhook_payload(project=None)


# --------------------------------------------------
# GET /api/webhooks/events/<issue_id> — Query Linked Events
# --------------------------------------------------
@webhooks_bp.route('/events/<int:issue_id>', methods=['GET'])
@jwt_required()
def get_issue_github_events(issue_id):
    """
    Return all linked GitHub commits and PR events for an issue.
    Employees can only view events for issues assigned to them.
    Managers and Admins can view events for any issue.
    """
    issue = db.session.get(Issue, issue_id) if hasattr(db.session, 'get') else Issue.query.get(issue_id)
    if not issue:
        return jsonify({'error': 'Issue not found'}), 404

    claims = get_jwt()
    role = claims.get('role')
    current_user_id = int(get_jwt_identity())

    if role == 'employee' and issue.assigned_to != current_user_id:
        return jsonify({'error': 'Access denied'}), 403

    events = GitHubEvent.query.filter_by(issue_id=issue_id).order_by(GitHubEvent.timestamp.desc()).all()
    return jsonify({
        'issue_id': issue_id,
        'events': [e.to_dict() for e in events],
        'total': len(events)
    }), 200


# --------------------------------------------------
# GET /api/webhooks/stats — Repository Integration Stats
# --------------------------------------------------
@webhooks_bp.route('/stats', methods=['GET'])
@jwt_required()
def get_github_stats():
    """
    Return aggregated GitHub integration metrics for widgets & reports.
    """
    total_events = GitHubEvent.query.count()
    commits_count = GitHubEvent.query.filter_by(event_type='push').count()
    prs_count = GitHubEvent.query.filter_by(event_type='pull_request').count()
    distinct_issues = db.session.query(GitHubEvent.issue_id).distinct().count()

    return jsonify({
        'stats': {
            'total_events': total_events,
            'commits_linked': commits_count,
            'prs_linked': prs_count,
            'issues_with_github': distinct_issues
        }
    }), 200
