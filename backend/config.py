from dotenv import load_dotenv
import os

load_dotenv()

class Config:
    """Flask configuration"""
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL")
    if not SQLALCHEMY_DATABASE_URI:
        raise ValueError("DATABASE_URL environment variable is required. Please set it in your .env file.")

    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key-change-in-production")
    
    #JWT Configuration
    JWT_ALGORITHM = "HS256"
    JWT_EXPIRES_DAYS = int(os.getenv("JWT_EXPIRES_DAYS", 7))
    
    #Email Verification
    VERIFICATION_CODE_EXPIRES_MINUTES = int(os.getenv("VERIFICATION_CODE_EXPIRES_MINUTES", 10))
    
    #CORS
    CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")