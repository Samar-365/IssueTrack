#!/usr/bin/env python3
"""
GitHub Webhook Simulator — Sends mock signed GitHub webhook payloads to IssueTrack API.
Allows full end-to-end testing of webhook processing without needing live GitHub repos or tunnels.

Usage:
  python simulate_webhook.py --issue 1 --action fix
  python simulate_webhook.py --issue 2 --action wip --author "Alice"
  python simulate_webhook.py --type pull_request --issue 1 --merged
"""
import argparse
import hashlib
import hmac
import json
import os
import random
import sys
import time
import urllib.request
import urllib.error


def generate_sha():
    """Generate mock 40-character hexadecimal SHA."""
    return ''.join(random.choices('0123456789abcdef', k=40))


def compute_signature(payload_bytes: bytes, secret: str) -> str:
    """Compute HMAC-SHA256 signature."""
    mac = hmac.new(secret.encode('utf-8'), msg=payload_bytes, digestmod=hashlib.sha256)
    return f"sha256={mac.hexdigest()}"


def build_push_payload(issue_id: int, action: str, author_name: str, author_email: str, branch: str, custom_msg: str):
    """Construct mock push payload."""
    sha = generate_sha()
    short_sha = sha[:7]

    if custom_msg:
        commit_message = custom_msg
    else:
        if action == 'fix':
            commit_message = f"Fix auth validation bug (Fixes #{issue_id})"
        elif action == 'close':
            commit_message = f"Close ticket requirements (Closes #{issue_id})"
        elif action == 'wip':
            commit_message = f"Refactor database queries (WIP #{issue_id})"
        elif action == 'progress':
            commit_message = f"Work on layout styling (Working on #{issue_id})"
        else:
            commit_message = f"Update documentation and links (#{issue_id})"

    return {
        'ref': f'refs/heads/{branch}',
        'before': generate_sha(),
        'after': sha,
        'repository': {
            'name': 'IssueTrack',
            'full_name': 'user/IssueTrack',
            'html_url': 'https://github.com/Samar-365/IssueTrack'
        },
        'pusher': {
            'name': author_name,
            'email': author_email
        },
        'sender': {
            'login': author_name.lower().replace(' ', ''),
            'avatar_url': 'https://avatars.githubusercontent.com/u/583231'
        },
        'commits': [
            {
                'id': sha,
                'tree_id': generate_sha(),
                'distinct': True,
                'message': commit_message,
                'timestamp': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
                'url': f'https://github.com/Samar-365/IssueTrack/commit/{short_sha}',
                'author': {
                    'name': author_name,
                    'email': author_email,
                    'username': author_name.lower().replace(' ', '')
                },
                'committer': {
                    'name': author_name,
                    'email': author_email
                },
                'added': ['backend/app.py'],
                'removed': [],
                'modified': ['backend/config.py']
            }
        ],
        'head_commit': {
            'id': sha,
            'message': commit_message,
            'url': f'https://github.com/Samar-365/IssueTrack/commit/{short_sha}',
            'author': {
                'name': author_name,
                'email': author_email
            }
        }
    }


def build_pr_payload(issue_id: int, pr_number: int, merged: bool, author_name: str, branch: str):
    """Construct mock pull request payload."""
    action = 'closed' if merged else 'opened'
    title = f"Feature: implement dashboard enhancements (Fixes #{issue_id})"
    body = f"This pull request addresses and resolves issue #{issue_id}."

    return {
        'action': action,
        'number': pr_number,
        'pull_request': {
            'number': pr_number,
            'title': title,
            'body': body,
            'state': 'closed' if merged else 'open',
            'merged': merged,
            'html_url': f'https://github.com/Samar-365/IssueTrack/pull/{pr_number}',
            'user': {
                'login': author_name.lower().replace(' ', ''),
                'avatar_url': 'https://avatars.githubusercontent.com/u/583231'
            },
            'head': {
                'ref': branch,
                'sha': generate_sha()
            },
            'base': {
                'ref': 'main',
                'sha': generate_sha()
            },
            'created_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
            'updated_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
        },
        'sender': {
            'login': author_name.lower().replace(' ', ''),
            'avatar_url': 'https://avatars.githubusercontent.com/u/583231'
        }
    }


def main():
    parser = argparse.ArgumentParser(description="Simulate GitHub Webhooks for IssueTrack")
    parser.add_argument('--url', default='', help='Target Webhook URL (overrides --project-token)')
    parser.add_argument('--project-token', default='', help='Project-specific webhook token (e.g. proj_8f3a9b...)')
    parser.add_argument('--secret', default=os.environ.get('GITHUB_WEBHOOK_SECRET', ''), help='Webhook HMAC Secret')
    parser.add_argument('--type', choices=['push', 'pull_request', 'ping'], default='push', help='Event type')
    parser.add_argument('--issue', '-i', type=int, default=1, help='Referenced Issue ID (e.g. 1)')
    parser.add_argument('--action', '-a', choices=['fix', 'close', 'wip', 'progress', 'link'], default='fix', help='Action keyword intent')
    parser.add_argument('--message', '-m', default='', help='Custom commit message (overrides --action)')
    parser.add_argument('--author', default='Dev Tester', help='Commit/PR Author Name')
    parser.add_argument('--email', default='dev@example.com', help='Author Email')
    parser.add_argument('--branch', '-b', default='main', help='Git Branch')
    parser.add_argument('--pr-number', type=int, default=42, help='PR number (for pull_request events)')
    parser.add_argument('--merged', action='store_true', help='Set merged=true for pull_request events')

    args = parser.parse_args()

    # Determine URL
    target_url = args.url
    if not target_url:
        if args.project_token:
            target_url = f'http://127.0.0.1:5005/api/webhooks/github/{args.project_token}'
        else:
            target_url = 'http://127.0.0.1:5005/api/webhooks/github'

    print(f"\n{'='*60}")
    print(f">> IssueTrack GitHub Webhook Simulator")
    print(f"{'='*60}")
    print(f"Target URL   : {target_url}")
    print(f"Event Type   : {args.type}")
    print(f"Target Issue : #{args.issue}")
    print(f"Action Intent: {args.action}")

    # Build payload
    if args.type == 'ping':
        payload = {'zen': 'Simulated webhook ping handshake.', 'hook_id': 99999}
    elif args.type == 'pull_request':
        payload = build_pr_payload(args.issue, args.pr_number, args.merged, args.author, args.branch)
    else:
        payload = build_push_payload(args.issue, args.action, args.author, args.email, args.branch, args.message)

    payload_bytes = json.dumps(payload, indent=2).encode('utf-8')

    # Headers
    headers = {
        'Content-Type': 'application/json',
        'X-GitHub-Event': args.type,
        'User-Agent': 'GitHub-Hookshot/simulated'
    }

    if args.secret:
        sig = compute_signature(payload_bytes, args.secret)
        headers['X-Hub-Signature-256'] = sig
        print(f"HMAC Signature: {sig[:20]}...")
    else:
        print("HMAC Signature: [None configured; testing in development mode]")

    req = urllib.request.Request(target_url, data=payload_bytes, headers=headers, method='POST')

    print(f"\nSending payload ({len(payload_bytes)} bytes)...")
    try:
        with urllib.request.urlopen(req) as response:
            res_body = response.read().decode('utf-8')
            res_json = json.loads(res_body)
            print(f"\n[OK] Status: {response.status} OK")
            print(f"Response:\n{json.dumps(res_json, indent=2)}")
    except urllib.error.HTTPError as e:
        err_body = e.read().decode('utf-8')
        print(f"\n[ERROR] HTTP Error {e.code}: {e.reason}")
        try:
            print(f"Details:\n{json.dumps(json.loads(err_body), indent=2)}")
        except Exception:
            print(f"Details:\n{err_body}")
        sys.exit(1)
    except urllib.error.URLError as e:
        print(f"\n[ERROR] Connection Failed: {e.reason}")
        print("Make sure the IssueTrack backend server is running on http://127.0.0.1:5005")
        sys.exit(1)


if __name__ == '__main__':
    main()
