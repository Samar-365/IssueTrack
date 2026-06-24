"""
Database initialization script.
Run this once to create all tables and seed the default admin user.

Usage:
    python db_init.py
"""
from app import create_app
from models import db
from models.user import User


def init_db():
    """Create all tables and seed the admin user."""
    app = create_app()

    with app.app_context():
        # Create all tables
        db.create_all()
        print("[OK] All database tables created successfully.")

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

        print("\n[DONE] Database initialization complete!")


if __name__ == '__main__':
    init_db()
