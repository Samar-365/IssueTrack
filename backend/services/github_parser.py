"""
GitHub Parser Service — Extracts issue references and action intents from commit messages and PR metadata.
Supports multiple issue tags per commit and intent classification (resolve, progress, link).
"""
import re
from typing import List, Dict, Any, Tuple


# Regex pattern definitions
RESOLVE_KEYWORDS = r'(?:fix|fixes|fixed|close|closes|closed|resolve|resolves|resolved)'
PROGRESS_KEYWORDS = r'(?:ref|refs|see|working\s+on|wip|implements|progress\s+on)'

# Patterns for extracting issue numbers with associated keyword prefixes
# Group 1: keyword or empty, Group 2: issue number
PATTERN_KEYWORD_OR_BARE = re.compile(
    r'(?i)(?:(?P<action>' + RESOLVE_KEYWORDS + r'|' + PROGRESS_KEYWORDS + r')\s+)?(?:#|issue\s*#?|gh-)(?P<id>\d+)\b'
)


def extract_branch_from_ref(git_ref: str) -> str:
    """
    Extract clean branch name from a git ref string.
    Example: 'refs/heads/main' -> 'main', 'refs/heads/feature/auth' -> 'feature/auth'
    """
    if not git_ref:
        return 'main'
    if git_ref.startswith('refs/heads/'):
        return git_ref[11:]
    if git_ref.startswith('refs/tags/'):
        return git_ref[10:]
    return git_ref


def extract_issue_references(text: str) -> List[Dict[str, Any]]:
    """
    Parse a commit message or PR body/title to find all mentioned issue IDs and their intent.

    :param text: Commit message or PR description text.
    :return: List of dicts, e.g.:
             [
               {'issue_id': 12, 'intent': 'resolve', 'matched_keyword': 'fixes'},
               {'issue_id': 15, 'intent': 'progress', 'matched_keyword': 'wip'},
               {'issue_id': 3,  'intent': 'link',     'matched_keyword': None}
             ]
    """
    if not text:
        return []

    results = []
    seen_ids = set()

    for match in PATTERN_KEYWORD_OR_BARE.finditer(text):
        issue_id = int(match.group('id'))
        if issue_id in seen_ids:
            continue
        seen_ids.add(issue_id)

        action = (match.group('action') or '').lower().strip()

        if re.match(r'^' + RESOLVE_KEYWORDS + r'$', action, re.IGNORECASE):
            intent = 'resolve'
        elif re.match(r'^' + PROGRESS_KEYWORDS + r'$', action, re.IGNORECASE):
            intent = 'progress'
        else:
            intent = 'link'

        results.append({
            'issue_id': issue_id,
            'intent': intent,
            'matched_keyword': action if action else None,
        })

    return results


def parse_push_payload(payload: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Extract normalized commit events and issue references from a GitHub 'push' event payload.

    :param payload: GitHub webhook JSON payload for push event.
    :return: List of parsed commit objects with their extracted issue references.
    """
    commits = payload.get('commits', [])
    if not commits and 'head_commit' in payload and payload['head_commit']:
        commits = [payload['head_commit']]

    branch = extract_branch_from_ref(payload.get('ref', ''))
    parsed_commits = []

    for commit in commits:
        message = commit.get('message', '')
        references = extract_issue_references(message)

        if not references:
            continue

        author_info = commit.get('author') or {}
        committer_info = commit.get('committer') or {}

        parsed_commits.append({
            'event_type': 'push',
            'commit_sha': commit.get('id'),
            'github_ref': commit.get('id', '')[:7] if commit.get('id') else 'commit',
            'branch': branch,
            'url': commit.get('url'),
            'author_name': author_info.get('name') or committer_info.get('name') or 'GitHub User',
            'author_email': author_info.get('email') or committer_info.get('email'),
            'author_avatar': None,
            'message': message,
            'timestamp': commit.get('timestamp'),
            'references': references,
        })

    return parsed_commits


def parse_pull_request_payload(payload: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Extract normalized PR event and issue references from a GitHub 'pull_request' event payload.

    :param payload: GitHub webhook JSON payload for pull_request event.
    :return: List containing parsed PR object (if references found).
    """
    pr = payload.get('pull_request')
    if not pr:
        return []

    action = payload.get('action', '')  # opened, closed, reopened, synchronize
    pr_number = pr.get('number')
    pr_title = pr.get('title', '')
    pr_body = pr.get('body', '') or ''
    combined_text = f"{pr_title}\n{pr_body}"

    references = extract_issue_references(combined_text)
    if not references:
        return []

    # If PR was closed and merged, elevate all references to 'resolve'
    is_merged = pr.get('merged', False) and action == 'closed'
    if is_merged:
        for ref in references:
            ref['intent'] = 'resolve'
            ref['matched_keyword'] = 'merged_pr'

    user = pr.get('user') or {}
    head = pr.get('head') or {}

    return [{
        'event_type': 'pull_request',
        'github_ref': f"PR #{pr_number}",
        'commit_sha': head.get('sha'),
        'branch': head.get('ref', 'main'),
        'url': pr.get('html_url'),
        'author_name': user.get('login', 'GitHub User'),
        'author_email': None,
        'author_avatar': user.get('avatar_url'),
        'message': f"[PR #{pr_number}] {pr_title}" + (" (Merged)" if is_merged else ""),
        'action_taken': 'status_resolved' if is_merged else 'linked',
        'timestamp': pr.get('updated_at') or pr.get('created_at'),
        'references': references,
        'is_merged': is_merged,
        'pr_action': action,
    }]
