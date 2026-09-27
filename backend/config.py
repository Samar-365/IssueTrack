import os
from datetime import timedelta

basedir = os.path.abspath(os.path.dirname(__file__))


class Config:
    """Base configuration."""
    SECRET_KEY = os.environ.get('SECRET_KEY', 'issue-tracker-secret-key-change-in-production')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'jwt-secret-key-change-in-production')
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=2)
    JWT_TOKEN_LOCATION = ['headers']

    # GitHub Webhook Configuration
    GITHUB_WEBHOOK_SECRET = os.environ.get('GITHUB_WEBHOOK_SECRET', '')
    GITHUB_DEFAULT_BRANCH = os.environ.get('GITHUB_DEFAULT_BRANCH', 'main')
    GITHUB_AUTO_CLOSE_ENABLED = os.environ.get('GITHUB_AUTO_CLOSE_ENABLED', 'true').lower() in ('true', '1', 'yes')


class DevelopmentConfig(Config):
    """Development configuration — uses SQLite."""
    DEBUG = True
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        'DATABASE_URL',
        'sqlite:///' + os.path.join(basedir, 'issue_tracker.db')
    )


class ProductionConfig(Config):
    """Production configuration — uses PostgreSQL (Render)."""
    DEBUG = False

    @staticmethod
    def _fix_database_url(url):
        """Ensure DATABASE_URL uses the installed psycopg2 driver (postgresql+psycopg2://)."""
        if not url:
            return url
        if url.startswith('postgres://'):
            return url.replace('postgres://', 'postgresql+psycopg2://', 1)
        if url.startswith('postgresql://') and not url.startswith('postgresql+'):
            return url.replace('postgresql://', 'postgresql+psycopg2://', 1)
        return url

    SQLALCHEMY_DATABASE_URI = _fix_database_url(
        os.environ.get('DATABASE_URL', '')
    ) or 'postgresql+psycopg2://localhost/issue_tracker'

    FRONTEND_URL = os.environ.get('FRONTEND_URL', '')


class TestingConfig(Config):
    """Testing configuration — uses in-memory SQLite."""
    TESTING = True
    DEBUG = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    WTF_CSRF_ENABLED = False
    GITHUB_WEBHOOK_SECRET = 'test-webhook-secret'


config_by_name = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
}

