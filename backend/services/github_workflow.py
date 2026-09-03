"""
GitHub Workflow Transition Engine — Safely handles automated state transitions for issues
triggered by Git commits and Pull Request events.
Respects project archive status and Issue model workflow constraints.
"""
from typing import Tuple, Optional
from models.issue import Issue


def apply_github_workflow_transition(
    issue: Issue,
    intent: str,
    auto_close_enabled: bool = True
) -> Tuple[bool, Optional[str], Optional[str], str]:
    """
    Evaluate and execute a workflow state transition on an Issue model instance.

    :param issue: SQLAlchemy Issue model instance.
    :param intent: Action intent from commit parser: 'resolve', 'progress', or 'link'.
    :param auto_close_enabled: Whether automated resolution transitions are enabled.
    :return: Tuple of (
               status_changed: bool,
               old_status: Optional[str],
               new_status: Optional[str],
               action_taken: str ('status_resolved', 'status_in_progress', 'linked')
             )
    """
    old_status = issue.status

    # Safeguard 1: Do not mutate status if project is archived
    if issue.project and issue.project.status == 'archived':
        return False, old_status, old_status, 'linked'

    # Safeguard 2: Do not mutate if issue is already closed
    if old_status == 'closed':
        return False, old_status, old_status, 'linked'

    # Case A: Intent is 'resolve' (fixes #12, closes #12, merged PR)
    if intent == 'resolve' and auto_close_enabled:
        if old_status == 'resolved':
            return False, old_status, old_status, 'linked'

        # Advance state to 'resolved'
        issue.status = 'resolved'
        return True, old_status, 'resolved', 'status_resolved'

    # Case B: Intent is 'progress' (wip #12, ref #12, working on #12)
    elif intent == 'progress':
        if old_status == 'open':
            issue.status = 'in_progress'
            return True, old_status, 'in_progress', 'status_in_progress'
        else:
            # Issue is already in_progress, testing, or resolved
            return False, old_status, old_status, 'linked'

    # Case C: Intent is 'link' (bare #12 mention)
    elif intent == 'link':
        if old_status == 'open':
            # Code commit referencing an open issue moves it to active progress
            issue.status = 'in_progress'
            return True, old_status, 'in_progress', 'status_in_progress'
        else:
            return False, old_status, old_status, 'linked'

    return False, old_status, old_status, 'linked'
