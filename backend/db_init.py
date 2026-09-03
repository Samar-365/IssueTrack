"""
Database initialization script.
Run this once to create all tables and seed the default admin user.

Usage:
    python db_init.py
"""
from app import create_app
from models import db
from models.user import User
from models.project import Project
import secrets


def init_db():
    """Create all tables, seed the admin user, and initialize project webhook tokens."""
    app = create_app()

    with app.app_context():
        # Create all tables
        db.create_all()
        print("[OK] All database tables created successfully.")

        # Ensure schema migrations for existing SQLite databases
        from sqlalchemy import inspect, text
        inspector = inspect(db.engine)
        if 'users' in inspector.get_table_names():
            existing_user_cols = [col['name'] for col in inspector.get_columns('users')]
            with db.engine.connect() as conn:
                if 'team_id' not in existing_user_cols:
                    conn.execute(text("ALTER TABLE users ADD COLUMN team_id VARCHAR(50)"))
                    print("[MIGRATE] Added column 'team_id' to users table.")
                conn.commit()

        if 'projects' in inspector.get_table_names():
            existing_cols = [col['name'] for col in inspector.get_columns('projects')]
            with db.engine.connect() as conn:
                if 'team_id' not in existing_cols:
                    conn.execute(text("ALTER TABLE projects ADD COLUMN team_id VARCHAR(50)"))
                    print("[MIGRATE] Added column 'team_id' to projects table.")
                if 'webhook_token' not in existing_cols:
                    conn.execute(text("ALTER TABLE projects ADD COLUMN webhook_token VARCHAR(64)"))
                    print("[MIGRATE] Added column 'webhook_token' to projects table.")
                if 'webhook_secret' not in existing_cols:
                    conn.execute(text("ALTER TABLE projects ADD COLUMN webhook_secret VARCHAR(64)"))
                    print("[MIGRATE] Added column 'webhook_secret' to projects table.")
                if 'github_repo' not in existing_cols:
                    conn.execute(text("ALTER TABLE projects ADD COLUMN github_repo VARCHAR(200)"))
                    print("[MIGRATE] Added column 'github_repo' to projects table.")
                conn.commit()

        # Seed admin user if not exists
        admin = User.query.filter_by(email='admin@admin.com').first()
        if not admin:
            admin = User(
                name='System Admin',
                email='admin@admin.com',
                role='admin',
                is_active=True,
            )
            admin.set_password('admin123')
            db.session.add(admin)
            db.session.commit()
            print("[OK] Default admin user created (admin@admin.com / admin123)")
        else:
            print("[INFO] Admin user already exists, skipping seed.")

        # Ensure any existing projects have webhook tokens and secrets
        projects = Project.query.all()
        for p in projects:
            updated = False
            if not p.webhook_token:
                p.webhook_token = f"proj_{secrets.token_hex(16)}"
                updated = True
            if not p.webhook_secret:
                p.webhook_secret = secrets.token_hex(32)
                updated = True
            if updated:
                db.session.add(p)
        if projects:
            db.session.commit()

        print("\n[DONE] Database initialization complete!")


if __name__ == '__main__':
    init_db()

