"""
GitHub Webhook Routes — Ingress point for receiving and processing GitHub Webhook events.
Handles HMAC signature verification, event dispatching (push, pull_request, ping),
and updates issue statuses and GitHubEvent records.
"""
from datetime import datetime, timezone
from flask import Blueprint, request, jsonify, current_app
from models import db
from models.issue import Issue
from models.github_event import GitHubEvent
from services.webhook_security import verify_github_signature
from services.github_parser import parse_push_payload, parse_pull_request_payload
from services.github_workflow import apply_github_workflow_transition

webhooks_bp = Blueprint('webhooks', __name__)


@webhooks_bp.route('/github', methods=['POST'])
def receive_github_webhook():
    """
    Main webhook receiver endpoint for GitHub events.
    Verifies HMAC-SHA256 signature and processes push and pull_request events.
    """
    raw_payload = request.get_data()
    signature_header = request.headers.get('X-Hub-Signature-256') or request.headers.get('X-Hub-Signature')
    secret = current_app.config.get('GITHUB_WEBHOOK_SECRET', '')

    # 1. Verify HMAC Signature
    is_valid, reason = verify_github_signature(raw_payload, signature_header, secret)
    if not is_valid:
        return jsonify({'error': 'Unauthorized', 'reason': reason}), 401

    # 2. Parse JSON payload
    payload = request.get_json(silent=True)
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

            # Lookup issue
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

            processed_results.append({
                'issue_id': issue.issue_id,
                'issue_title': issue.title,
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
