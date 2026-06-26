import os
from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from config import config_by_name
from models import db


def create_app(config_name=None):
    """Application factory for the Flask app."""
    if config_name is None:
        config_name = os.environ.get('FLASK_ENV', 'development')

    app = Flask(__name__)
    app.config.from_object(config_by_name[config_name])

    # Initialize extensions
    db.init_app(app)
    CORS(app, resources={r"/api/*": {"origins": "*"}})
    jwt = JWTManager(app)

    # ---- JWT token revocation check (for logout) ----
    from routes.auth import check_if_token_revoked
    jwt.token_in_blocklist_loader(check_if_token_revoked)

    # Create database tables
    with app.app_context():
        # Import all models so they are registered with SQLAlchemy
        from models.user import User
        from models.project import Project
        from models.issue import Issue
        from models.comment import Comment
        from models.activity_log import ActivityLog
        db.create_all()

    # Register blueprints (routes) — added module by module
    from routes.auth import auth_bp
    app.register_blueprint(auth_bp, url_prefix='/api/auth')

    # from routes.users import users_bp
    # from routes.projects import projects_bp
    # from routes.issues import issues_bp
    # from routes.comments import comments_bp
    # from routes.activity import activity_bp
    # from routes.dashboard import dashboard_bp
    # from routes.reports import reports_bp

    # app.register_blueprint(users_bp, url_prefix='/api/users')
    # app.register_blueprint(projects_bp, url_prefix='/api/projects')
    # app.register_blueprint(issues_bp, url_prefix='/api/issues')
    # app.register_blueprint(comments_bp, url_prefix='/api/comments')
    # app.register_blueprint(activity_bp, url_prefix='/api/activity')
    # app.register_blueprint(dashboard_bp, url_prefix='/api/dashboard')
    # app.register_blueprint(reports_bp, url_prefix='/api/reports')

    @app.route('/api/health')
    def health_check():
        return {'status': 'ok', 'message': 'Issue Tracker API is running'}

    return app


if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, port=5000)
