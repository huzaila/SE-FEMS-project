"""Entry point for running the backend as a module: python -m backend"""
from .app import create_app

if __name__ == "__main__":
    app = create_app()
    with app.app_context():
        from .extensions import db
        db.create_all()
        print("Database tables created successfully!")

    app.run(debug=True, port=5000, host='0.0.0.0')

