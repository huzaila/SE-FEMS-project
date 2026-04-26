# backend/auth.py
from flask import Blueprint, request, jsonify, current_app
from .extensions import db
from .models import User, EmailVerification, Vendor  #import any models you need
from .utils import hash_password, check_password, create_token, decode_token, generate_verification_code
from datetime import datetime, timedelta
from functools import wraps

bp = Blueprint("auth", __name__, url_prefix="/api")

def token_required(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return jsonify({"error": "Authorization header required"}), 401
        token = auth_header.split(" ", 1)[1]
        try:
            data = decode_token(token)
            user = User.query.get(data.get("user_id"))
            if not user:
                return jsonify({"error": "User not found"}), 401
            return f(user, *args, **kwargs)
        except Exception as e:
            # jwt.ExpiredSignatureError or jwt.InvalidTokenError bubble as Exception
            return jsonify({"error": str(e)}), 401
    return wrapper

#register
# @bp.route("/register", methods=["POST"])
# def register():
#     data = request.get_json() or {}
#     required = ["email", "password", "full_name", "phone", "role"]
#     for r in required:
#         if r not in data or not data[r]:
#             return jsonify({"error": f"{r} is required"}), 400

#     email = data["email"].lower().strip()
#     if User.query.filter_by(email=email).first():
#         return jsonify({"error": "Email already registered"}), 409

#     if len(data["password"]) < 6:
#         return jsonify({"error": "Password must be at least 6 characters"}), 400

#     hashed = hash_password(data["password"])
#     new_user = User(
#         email=email,
#         password_hash=hashed,
#         role="customer",# default role - set later on complete-profile
#         full_name=data["full_name"].strip(),
#         phone=data["phone"].strip()
#     )
#     try:
#         db.session.add(new_user)
#         db.session.commit()
#         # optionally: create verification code in EmailVerification here if required
#         return jsonify({"message": "User registered", "user": new_user.to_dict()}), 201
#     except Exception as e:
#         db.session.rollback()
#         return jsonify({"error": "Database error", "details": str(e)}), 500

@bp.route("/register", methods=["POST"])
def register():
    data = request.get_json() or {}
    required = ["email", "password"]
    for r in required:
        if r not in data or not data[r]:
            return jsonify({"error": f"{r} is required"}), 400

    email = data["email"].lower().strip()
    if User.query.filter_by(email=email).first():
        return jsonify({"error": "Email already registered"}), 409

    password = data["password"]
    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400

    # Get profile data if provided
    full_name = data.get("full_name", "").strip()
    phone = data.get("phone", "").strip()
    role = data.get("role", "customer").lower().strip()
    
    # Validate role
    if role not in ("vendor", "customer"):
        return jsonify({"error": "role must be 'vendor' or 'customer'"}), 400

    # If profile data is provided, validate required fields
    if full_name or phone:
        if not full_name or not phone:
            return jsonify({"error": "full_name and phone are required when provided"}), 400
        if role == "vendor" and not data.get("vendor_name", "").strip():
            return jsonify({"error": "vendor_name is required for vendor role"}), 400

    hashed = hash_password(password)
    user = User(
        email=email, 
        password_hash=hashed, 
        role=role,
        full_name=full_name if full_name else None,
        phone=phone if phone else None
    )
    
    try:
        db.session.add(user)
        db.session.flush()  # Get user.id without committing

        # If vendor role and vendor_name provided, create vendor profile
        if role == "vendor" and data.get("vendor_name"):
            from .models import Vendor
            vendor_name = data.get("vendor_name", "").strip()
            location = data.get("location", "").strip()
            vendor = Vendor(user_id=user.id, vendor_name=vendor_name, location=location)
            db.session.add(vendor)

        # create verification code for this user
        code = generate_verification_code(16)  # 32 hex chars
        expires_at = datetime.utcnow() + timedelta(minutes=current_app.config.get("VERIFICATION_CODE_EXPIRES_MINUTES", 10))
        ev = EmailVerification(user_id=user.id, code=code, expires_at=expires_at)
        db.session.add(ev)
        db.session.commit()

        # For production: send code via email. For dev, return code in response (or log it)
        return jsonify({
            "message": "User created. Please verify your email.",
            "user": user.to_dict(),
            "verification_code": code,  # remove in production; for dev convenience
            "profile_data_provided": bool(full_name and phone)
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Database error", "details": str(e)}), 500
    

# Verify email
@bp.route("/verify-email", methods=["POST"])
def verify_email():
    data = request.get_json() or {}
    email = data.get("email", "").lower().strip()
    code = data.get("code", "").strip()
    if not email or not code:
        return jsonify({"error": "email and code are required"}), 400

    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({"error": "user not found"}), 404

    verification = EmailVerification.query.filter_by(user_id=user.id, code=code, is_used=False).first()
    if not verification:
        return jsonify({"error": "invalid or used code"}), 400

    if verification.expires_at < datetime.utcnow():
        return jsonify({"error": "code expired"}), 410

    try:
        verification.is_used = True
        user.is_email_verified = True
        db.session.commit()

        # Generate token so user can complete profile
        token = create_token(user.id, user.role)

        return jsonify({
            "message": "email verified",
            "user": user.to_dict(),
            "token": token
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "DB error", "details": str(e)}), 500
    

# Login (returns JWT)

@bp.route("/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    if "email" not in data or "password" not in data:
        return jsonify({"error": "Email and password are required"}), 400

    email = data["email"].lower().strip()
    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({"error": "Invalid credentials"}), 401

    if not check_password(data["password"], user.password_hash):
        return jsonify({"error": "Invalid credentials"}), 401

    # update last_login
    user.last_login = datetime.utcnow()
    db.session.commit()

    token = create_token(user.id, user.role)

    # Include vendor data if user is a vendor
    user_data = user.to_dict()
    if user.role == "vendor" and user.vendor_profile:
        user_data["vendor_id"] = user.vendor_profile.id
        user_data["vendor_name"] = user.vendor_profile.vendor_name

    return jsonify({"message": "Login successful", "token": token, "user": user_data}), 200

@bp.route("/profile", methods=["GET"])
@token_required
def profile(current_user):
    user_data = current_user.to_dict()

    # Include vendor_id if user is a vendor
    if current_user.role == "vendor" and current_user.vendor_profile:
        user_data["vendor_id"] = current_user.vendor_profile.id
        user_data["vendor_name"] = current_user.vendor_profile.vendor_name

    return jsonify({"user": user_data}), 200


# Complete profile — full_name, phone, role; create vendor if role == 'vendor'

@bp.route("/complete-profile", methods=["POST"])
@token_required
def complete_profile(current_user):
    # current_user is an instance of User returned by decorator
    data = request.get_json() or {}
    full_name = data.get("full_name", "").strip()
    phone = data.get("phone", "").strip()
    role = data.get("role", "").lower().strip()

    if not full_name or not phone or role not in ("vendor", "customer"):
        return jsonify({"error": "full_name, phone and role (vendor/customer) are required"}), 400

    # ensure email verified
    if not current_user.is_email_verified:
        return jsonify({"error": "email not verified"}), 403

    current_user.full_name = full_name
    current_user.phone = phone
    current_user.role = role

    vendor_data = None
    try:
        if role == "vendor":
            # if vendor profile does not exist, create it
            if not current_user.vendor_profile:
                vendor_name = data.get("vendor_name", f"{full_name}'s Vendor").strip()
                location = data.get("location", "").strip()
                new_vendor = Vendor(user_id=current_user.id, vendor_name=vendor_name, location=location)
                db.session.add(new_vendor)
                db.session.flush()  # ensure new_vendor.id available
                vendor_data = new_vendor.to_dict()
            else:
                # If vendor exists, optionally update vendor fields:
                vendor = current_user.vendor_profile
                vendor.vendor_name = data.get("vendor_name", vendor.vendor_name)
                vendor.location = data.get("location", vendor.location)
                vendor_data = vendor.to_dict()

        db.session.commit()

        # Include vendor_id in user data for vendors
        user_data = current_user.to_dict()
        if current_user.role == "vendor" and current_user.vendor_profile:
            user_data["vendor_id"] = current_user.vendor_profile.id
            user_data["vendor_name"] = current_user.vendor_profile.vendor_name

        return jsonify({
            "message": "Profile completed",
            "user": user_data,
            "vendor": vendor_data
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "db error", "details": str(e)}), 500