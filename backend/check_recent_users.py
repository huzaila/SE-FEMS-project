#!/usr/bin/env python3
from app import create_app
from extensions import db
from models import User

app = create_app()
with app.app_context():
    recent = User.query.order_by(User.last_login.desc()).limit(5).all()
    print('=== Last 5 logged in users ===')
    for u in recent:
        if u.last_login:
            print(f'Email: {u.email}')
            print(f'  Role: {u.role}')
            print(f'  Name: {u.full_name}')
            print(f'  Last login: {u.last_login}')
            print()