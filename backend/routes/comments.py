"""
Comment System routes — CRUD operations for issue comments.
FR-22: Users shall add comments.
FR-23: Users shall edit their comments.
FR-24: Comments shall be displayed chronologically.
"""
from functools import wraps
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from models import db
from models.comment import Comment
from models.issue import Issue
from models.user import User
from models.activity_log import ActivityLog

comments_bp = Blueprint('comments', __name__)


def _log_activity(user_id, action, details=None, entity_type='comment', entity_id=None):
    """Helper to record an activity log entry."""
    log = ActivityLog(
        user_id=user_id,
        action=action,
        details=details,
        entity_type=entity_type,
        entity_id=entity_id,
    )
    db.session.add(log)


def _can_access_issue(issue, claims, current_user_id):
    """Check if the current user can access the given issue."""
    role = claims.get('role')
    if role in ('admin', 'manager'):
        return True
    # Employees can only access issues assigned to them
    return issue.assigned_to == current_user_id


# --------------------------------------------------
# GET /api/comments/issue/<issue_id> — List comments for an issue (FR-24)
# --------------------------------------------------
@comments_bp.route('/issue/<int:issue_id>', methods=['GET'])
@jwt_required()
def list_comments(issue_id):
    """
    Return all comments for a given issue, ordered chronologically (oldest first).
    Employees can only view comments on issues assigned to them.
    """
    issue = Issue.query.get(issue_id)
    if not issue:
        return jsonify({'error': 'Issue not found'}), 404

    claims = get_jwt()
    current_user_id = int(get_jwt_identity())

    if not _can_access_issue(issue, claims, current_user_id):
        return jsonify({'error': 'Access denied'}), 403

    comments = (
        Comment.query
        .filter_by(issue_id=issue_id)
        .order_by(Comment.created_at.asc())
        .all()
    )

    return jsonify({
        'comments': [c.to_dict() for c in comments],
        'total': len(comments),
    }), 200


# --------------------------------------------------
# POST /api/comments/issue/<issue_id> — Add a comment (FR-22)
# --------------------------------------------------
@comments_bp.route('/issue/<int:issue_id>', methods=['POST'])
@jwt_required()
def add_comment(issue_id):
    """
    Add a new comment to an issue.
    Any user with access to the issue can comment.
    """
    issue = Issue.query.get(issue_id)
    if not issue:
        return jsonify({'error': 'Issue not found'}), 404

    claims = get_jwt()
    current_user_id = int(get_jwt_identity())

    if not _can_access_issue(issue, claims, current_user_id):
        return jsonify({'error': 'Access denied'}), 403

    data = request.get_json()
    comment_text = (data.get('comment_text') or '').strip()

    if not comment_text:
        return jsonify({'error': 'Comment text is required'}), 400

    if len(comment_text) > 5000:
        return jsonify({'error': 'Comment must be 5000 characters or less'}), 400

    comment = Comment(
        issue_id=issue_id,
        user_id=current_user_id,
        comment_text=comment_text,
    )

    db.session.add(comment)
    db.session.flush()

    _log_activity(
        current_user_id, 'comment_added',
        f'Commented on issue "{issue.title}"',
        entity_type='comment',
        entity_id=comment.comment_id,
    )

    db.session.commit()

    return jsonify({
        'message': 'Comment added successfully',
        'comment': comment.to_dict(),
    }), 201


# --------------------------------------------------
# PUT /api/comments/<comment_id> — Edit a comment (FR-23)
# --------------------------------------------------
@comments_bp.route('/<int:comment_id>', methods=['PUT'])
@jwt_required()
def edit_comment(comment_id):
    """
    Edit a comment. Users can only edit their own comments.
    Admins can edit any comment.
    """
    comment = Comment.query.get(comment_id)
    if not comment:
        return jsonify({'error': 'Comment not found'}), 404

    claims = get_jwt()
    current_user_id = int(get_jwt_identity())
    role = claims.get('role')

    # Only the author or an admin can edit
    if comment.user_id != current_user_id and role != 'admin':
        return jsonify({'error': 'You can only edit your own comments'}), 403

    data = request.get_json()
    comment_text = (data.get('comment_text') or '').strip()

    if not comment_text:
        return jsonify({'error': 'Comment text is required'}), 400

    if len(comment_text) > 5000:
        return jsonify({'error': 'Comment must be 5000 characters or less'}), 400

    old_text = comment.comment_text
    comment.comment_text = comment_text

    _log_activity(
        current_user_id, 'comment_edited',
        f'Edited comment #{comment_id} on issue #{comment.issue_id}',
        entity_type='comment',
        entity_id=comment_id,
    )

    db.session.commit()

    return jsonify({
        'message': 'Comment updated successfully',
        'comment': comment.to_dict(),
    }), 200


# --------------------------------------------------
# DELETE /api/comments/<comment_id> — Delete a comment
# --------------------------------------------------
@comments_bp.route('/<int:comment_id>', methods=['DELETE'])
@jwt_required()
def delete_comment(comment_id):
    """
    Delete a comment. Users can only delete their own comments.
    Admins and Managers can delete any comment.
    """
    comment = Comment.query.get(comment_id)
    if not comment:
        return jsonify({'error': 'Comment not found'}), 404

    claims = get_jwt()
    current_user_id = int(get_jwt_identity())
    role = claims.get('role')

    # Only the author, admin, or manager can delete
    if comment.user_id != current_user_id and role not in ('admin', 'manager'):
        return jsonify({'error': 'You can only delete your own comments'}), 403

    issue = Issue.query.get(comment.issue_id)
    issue_title = issue.title if issue else f'#{comment.issue_id}'

    _log_activity(
        current_user_id, 'comment_deleted',
        f'Deleted comment #{comment_id} from issue "{issue_title}"',
        entity_type='comment',
        entity_id=comment_id,
    )

    db.session.delete(comment)
    db.session.commit()

    return jsonify({'message': 'Comment deleted successfully'}), 200
