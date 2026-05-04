# backend/utils.py
import bcrypt
import jwt
from datetime import datetime, timedelta
from flask import current_app
import secrets


def hash_password(plain_password: str) -> str:
    pw_bytes = plain_password.encode("utf-8")
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(pw_bytes, salt)
    return hashed.decode("utf-8")

def check_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))

def create_token(user_id: int, role: str) -> str:
    secret = current_app.config["SECRET_KEY"]
    algorithm = current_app.config.get("JWT_ALGORITHM", "HS256")
    exp = datetime.utcnow() + timedelta(days=current_app.config.get("JWT_EXPIRES_DAYS", 7))
    payload = {"user_id": user_id, "role": role, "exp": exp}
    token = jwt.encode(payload, secret, algorithm=algorithm)
    # PyJWT returns str in modern versions
    return token

def decode_token(token: str):
    secret = current_app.config["SECRET_KEY"]
    algorithm = current_app.config.get("JWT_ALGORITHM", "HS256")
    return jwt.decode(token, secret, algorithms=[algorithm])

def generate_verification_code(length=32) -> str:
    # generates a secure hex token (length bytes -> 2*length hex chars)
    return secrets.token_hex(length)