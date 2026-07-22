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


class DevelopmentConfig(Config):
    """Development configuration — uses SQLite."""
    DEBUG = True
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        'DATABASE_URL',
        'sqlite:///' + os.path.join(basedir, 'issue_tracker.db')
    )


class ProductionConfig(Config):
    """Production configuration — use MySQL."""
    DEBUG = False
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        'DATABASE_URL',
        'mysql+pymysql://root:password@localhost/issue_tracker'
    )


class TestingConfig(Config):
    """Testing configuration — uses in-memory SQLite."""
    TESTING = True
    DEBUG = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    WTF_CSRF_ENABLED = False


config_by_name = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
}

