"""
Comprehensive Backend Test Suite — Issue Tracking System (Mini Jira)
Tests all 10 core SRS modules end-to-end.
"""
import unittest
import json
from app import create_app
from models import db
from models.user import User
from models.project import Project
from models.issue import Issue
from models.comment import Comment
from models.activity_log import ActivityLog


class IssueTrackerTestCase(unittest.TestCase):
    def setUp(self):
        """Set up test Flask application with an in-memory SQLite database."""
        self.app = create_app('testing')
        self.client = self.app.test_client()
        self.app_context = self.app.app_context()
        self.app_context.push()

        db.create_all()

        # Seed initial test data
        self.admin_user = User(
            name='Test Admin',
            email='admin@test.com',
            role='admin',
            is_active=True
        )
        self.admin_user.set_password('AdminPass123')

        self.manager_user = User(
            name='Test Manager',
            email='manager@test.com',
            role='manager',
            is_active=True
        )
        self.manager_user.set_password('ManagerPass123')

        self.employee_user = User(
            name='Test Employee',
            email='employee@test.com',
            role='employee',
            is_active=True
        )
        self.employee_user.set_password('EmpPass123')

        db.session.add_all([self.admin_user, self.manager_user, self.employee_user])
        db.session.commit()

        # Login as Admin to get token
        login_res = self.client.post('/api/auth/login', json={
            'email': 'admin@test.com',
            'password': 'AdminPass123'
        })
        self.admin_token = json.loads(login_res.data)['access_token']
        self.admin_headers = {'Authorization': f'Bearer {self.admin_token}'}

    def tearDown(self):
        """Clean up database after each test."""
        db.session.remove()
        db.drop_all()
        self.app_context.pop()

    # 1. User Authentication Module Tests
    def test_auth_login_success(self):
        res = self.client.post('/api/auth/login', json={
            'email': 'admin@test.com',
            'password': 'AdminPass123'
        })
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertIn('access_token', data)
        self.assertEqual(data['user']['role'], 'admin')

    def test_auth_login_invalid_password(self):
        res = self.client.post('/api/auth/login', json={
            'email': 'admin@test.com',
            'password': 'WrongPassword'
        })
        self.assertEqual(res.status_code, 401)

    def test_auth_me(self):
        res = self.client.get('/api/auth/me', headers=self.admin_headers)
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertEqual(data['user']['email'], 'admin@test.com')

    # 2. User Management Module Tests
    def test_user_creation(self):
        res = self.client.post('/api/users', headers=self.admin_headers, json={
            'name': 'New Dev',
            'email': 'newdev@test.com',
            'password': 'Password123',
            'role': 'employee'
        })
        self.assertEqual(res.status_code, 201)
        data = json.loads(res.data)
        self.assertEqual(data['user']['name'], 'New Dev')

    def test_user_list(self):
        res = self.client.get('/api/users', headers=self.admin_headers)
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertGreaterEqual(len(data['users']), 3)

    # 3. Project Management Module Tests
    def test_project_crud(self):
        # Create Project
        create_res = self.client.post('/api/projects', headers=self.admin_headers, json={
            'project_name': 'Alpha Portal',
            'description': 'Building next-gen dashboard'
        })
        self.assertEqual(create_res.status_code, 201)
        project_id = json.loads(create_res.data)['project']['project_id']

        # Update Project
        update_res = self.client.put(f'/api/projects/{project_id}', headers=self.admin_headers, json={
            'project_name': 'Alpha Portal V2',
            'description': 'Updated description'
        })
        self.assertEqual(update_res.status_code, 200)

        # Archive Project
        archive_res = self.client.patch(f'/api/projects/{project_id}/archive', headers=self.admin_headers)
        self.assertEqual(archive_res.status_code, 200)

    # 4. Issue Management & Workflow Tests
    def test_issue_workflow(self):
        # Create project first
        p_res = self.client.post('/api/projects', headers=self.admin_headers, json={
            'project_name': 'Beta System'
        })
        pid = json.loads(p_res.data)['project']['project_id']

        # Create Issue
        i_res = self.client.post('/api/issues', headers=self.admin_headers, json={
            'title': 'Fix login timeout bug',
            'description': 'Users logged out early',
            'project_id': pid,
            'priority': 'high',
            'assigned_to': self.employee_user.user_id
        })
        self.assertEqual(i_res.status_code, 201)
        issue_id = json.loads(i_res.data)['issue']['issue_id']

        # Status transition open -> in_progress
        st_res = self.client.patch(f'/api/issues/{issue_id}/status', headers=self.admin_headers, json={
            'status': 'in_progress'
        })
        self.assertEqual(st_res.status_code, 200)

        # Status transition in_progress -> testing
        st_res2 = self.client.patch(f'/api/issues/{issue_id}/status', headers=self.admin_headers, json={
            'status': 'testing'
        })
        self.assertEqual(st_res2.status_code, 200)

    # 5. Comment System Tests
    def test_comments(self):
        # Create project & issue
        p_res = self.client.post('/api/projects', headers=self.admin_headers, json={'project_name': 'Gamma'})
        pid = json.loads(p_res.data)['project']['project_id']

        i_res = self.client.post('/api/issues', headers=self.admin_headers, json={
            'title': 'Comment test issue',
            'project_id': pid
        })
        iid = json.loads(i_res.data)['issue']['issue_id']

        # Add comment
        c_res = self.client.post(f'/api/comments/issue/{iid}', headers=self.admin_headers, json={
            'comment_text': 'Investigating this issue now.'
        })
        self.assertEqual(c_res.status_code, 201)

        # List comments
        list_res = self.client.get(f'/api/comments/issue/{iid}', headers=self.admin_headers)
        self.assertEqual(list_res.status_code, 200)
        self.assertEqual(len(json.loads(list_res.data)['comments']), 1)

    # 6. Dashboard & Activity Logs Tests
    def test_dashboard_and_activity(self):
        dash_res = self.client.get('/api/dashboard', headers=self.admin_headers)
        self.assertEqual(dash_res.status_code, 200)

        act_res = self.client.get('/api/activity', headers=self.admin_headers)
        self.assertEqual(act_res.status_code, 200)

    # 7. Reports & PDF Export Tests
    def test_report_generation_and_exports(self):
        rep_res = self.client.get('/api/reports/issues', headers=self.admin_headers)
        self.assertEqual(rep_res.status_code, 200)

        csv_res = self.client.get('/api/reports/export/issues', headers=self.admin_headers)
        self.assertEqual(csv_res.status_code, 200)
        self.assertEqual(csv_res.mimetype, 'text/csv')

        pdf_res = self.client.get('/api/reports/export-pdf/issues', headers=self.admin_headers)
        self.assertEqual(pdf_res.status_code, 200)
        self.assertEqual(pdf_res.mimetype, 'application/pdf')

    # 8. Notifications Tests
    def test_notifications(self):
        notif_res = self.client.get('/api/notifications', headers=self.admin_headers)
        self.assertEqual(notif_res.status_code, 200)


class GitHubWebhooksTestCase(unittest.TestCase):
    """Test Suite for GitHub Webhook Integration and Automated Workflow."""

    def setUp(self):
        self.app = create_app('testing')
        self.client = self.app.test_client()
        self.app_context = self.app.app_context()
        self.app_context.push()
        self.secret = self.app.config.get('GITHUB_WEBHOOK_SECRET', 'test-webhook-secret')

        db.create_all()

        # Seed admin and employee
        self.admin = User(name='Admin Dev', email='admin@dev.io', role='admin')
        self.admin.set_password('AdminPass123')
        self.employee = User(name='Sam Dev', email='sam@dev.io', role='employee')
        self.employee.set_password('EmpPass123')
        db.session.add_all([self.admin, self.employee])
        db.session.commit()

        # Seed Project and Issue
        self.project = Project(project_name='Backend Core', created_by=self.admin.user_id)
        db.session.add(self.project)
        db.session.commit()

        self.issue = Issue(
            title='Fix authentication cookie bug',
            project_id=self.project.project_id,
            created_by=self.admin.user_id,
            assigned_to=self.employee.user_id,
            status='open'
        )
        db.session.add(self.issue)
        db.session.commit()

        # Generate auth tokens
        from flask_jwt_extended import create_access_token
        self.admin_token = create_access_token(identity=str(self.admin.user_id), additional_claims={'role': 'admin'})
        self.emp_token = create_access_token(identity=str(self.employee.user_id), additional_claims={'role': 'employee'})

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.app_context.pop()

    def _sign_payload(self, payload_bytes, secret=None):
        from services.webhook_security import compute_github_signature
        return compute_github_signature(payload_bytes, secret or self.secret)

    def test_webhook_ping_handshake(self):
        """Test GitHub ping event handshake."""
        payload = json.dumps({'zen': 'Keep it simple.', 'hook_id': 12345}).encode('utf-8')
        sig = self._sign_payload(payload)

        res = self.client.post(
            '/api/webhooks/github',
            data=payload,
            headers={'Content-Type': 'application/json', 'X-GitHub-Event': 'ping', 'X-Hub-Signature-256': sig}
        )
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data['status'], 'ok')
        self.assertIn('verified successfully', data['message'])

    def test_webhook_signature_rejection(self):
        """Test invalid or missing HMAC signature rejection."""
        payload = json.dumps({'ref': 'refs/heads/main', 'commits': []}).encode('utf-8')

        # Bad signature
        res = self.client.post(
            '/api/webhooks/github',
            data=payload,
            headers={'Content-Type': 'application/json', 'X-GitHub-Event': 'push', 'X-Hub-Signature-256': 'sha256=invalid'}
        )
        self.assertEqual(res.status_code, 401)

    def test_webhook_push_auto_resolve(self):
        """Test push commit with 'Fixes #<id>' automatically resolves issue and records audit log."""
        issue_id = self.issue.issue_id
        payload = json.dumps({
            'ref': 'refs/heads/main',
            'commits': [{
                'id': 'a1b2c3d4e5f67890123456789012345678901234',
                'message': f'Fix cookie validation flaw (Fixes #{issue_id})',
                'url': 'https://github.com/Samar-365/IssueTrack/commit/a1b2c3d',
                'author': {'name': 'Sam Dev', 'email': 'sam@dev.io'},
                'timestamp': '2026-09-01T21:00:00Z'
            }]
        }).encode('utf-8')
        sig = self._sign_payload(payload)

        res = self.client.post(
            '/api/webhooks/github',
            data=payload,
            headers={'Content-Type': 'application/json', 'X-GitHub-Event': 'push', 'X-Hub-Signature-256': sig}
        )
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data['processed_count'], 1)
        self.assertEqual(data['results'][0]['new_status'], 'resolved')

        # Verify DB state
        updated_issue = Issue.query.get(issue_id)
        self.assertEqual(updated_issue.status, 'resolved')
        self.assertEqual(len(updated_issue.github_events), 1)
        self.assertEqual(updated_issue.github_events[0].short_sha, 'a1b2c3d')

        # Verify ActivityLog and Notification
        log = ActivityLog.query.filter_by(entity_id=issue_id).first()
        self.assertIsNotNone(log)
        self.assertEqual(log.action, 'github_commit_linked')

    def test_webhook_pull_request_merge(self):
        """Test merged pull request automatically resolves referenced issue."""
        issue_id = self.issue.issue_id
        payload = json.dumps({
            'action': 'closed',
            'pull_request': {
                'number': 77,
                'title': f'Feature: auth enhancements (Fixes #{issue_id})',
                'body': 'Closes ticket completely',
                'merged': True,
                'html_url': 'https://github.com/Samar-365/IssueTrack/pull/77',
                'user': {'login': 'samdev', 'avatar_url': 'https://avatar.url'},
                'head': {'sha': 'f9e8d7c6b5a41234567890123456789012345678', 'ref': 'feature/auth'},
                'updated_at': '2026-09-01T21:30:00Z'
            }
        }).encode('utf-8')
        sig = self._sign_payload(payload)

        res = self.client.post(
            '/api/webhooks/github',
            data=payload,
            headers={'Content-Type': 'application/json', 'X-GitHub-Event': 'pull_request', 'X-Hub-Signature-256': sig}
        )
        self.assertEqual(res.status_code, 200)
        updated_issue = Issue.query.get(issue_id)
        self.assertEqual(updated_issue.status, 'resolved')

    def test_query_github_events_endpoint(self):
        """Test GET /api/webhooks/events/<issue_id> endpoint."""
        issue_id = self.issue.issue_id
        # Link a commit
        payload = json.dumps({
            'ref': 'refs/heads/main',
            'commits': [{
                'id': '1234567890abcdef1234567890abcdef12345678',
                'message': f'Work on #{issue_id}',
                'url': 'https://github.com/Samar-365/IssueTrack/commit/1234567',
                'author': {'name': 'Sam Dev', 'email': 'sam@dev.io'},
                'timestamp': '2026-09-01T21:00:00Z'
            }]
        }).encode('utf-8')
        sig = self._sign_payload(payload)
        self.client.post('/api/webhooks/github', data=payload, headers={'Content-Type': 'application/json', 'X-GitHub-Event': 'push', 'X-Hub-Signature-256': sig})

        # Query events as admin
        res = self.client.get(f'/api/webhooks/events/{issue_id}', headers={'Authorization': f'Bearer {self.admin_token}'})
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data['total'], 1)
        self.assertEqual(data['events'][0]['short_sha'], '1234567')

        # Query stats
        stats_res = self.client.get('/api/webhooks/stats', headers={'Authorization': f'Bearer {self.admin_token}'})
        self.assertEqual(stats_res.status_code, 200)
        stats_data = stats_res.get_json()
        self.assertEqual(stats_data['stats']['total_events'], 1)


if __name__ == '__main__':
    unittest.main()
