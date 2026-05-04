#!/usr/bin/env python3
"""Test Supabase database connection and verify tables"""
from app import create_app
from extensions import db
from sqlalchemy import text
import sys

def test_connection():
    """Test database connection and list tables"""
    app = create_app()

    with app.app_context():
        try:
            # Test basic connection
            result = db.session.execute(text("SELECT version()"))
            version = result.scalar()
            print("✅ Database connected successfully!")
            print(f"📊 PostgreSQL version: {version}\n")

            # List all tables
            result = db.session.execute(text("""
                SELECT table_name
                FROM information_schema.tables
                WHERE table_schema = 'public'
                ORDER BY table_name
            """))

            tables = [row[0] for row in result]

            if tables:
                print(f"📋 Found {len(tables)} tables in database:")
                for table in tables:
                    print(f"   - {table}")

                    # Count rows in each table
                    count_result = db.session.execute(text(f"SELECT COUNT(*) FROM {table}"))
                    count = count_result.scalar()
                    print(f"     ({count} rows)")
            else:
                print("⚠️  No tables found in database")
                print("   Run the app once to create tables")

            print("\n✅ Supabase is connected and working!")
            return True

        except Exception as e:
            print(f"❌ Database connection failed: {str(e)}")
            return False

if __name__ == "__main__":
    success = test_connection()
    sys.exit(0 if success else 1)
