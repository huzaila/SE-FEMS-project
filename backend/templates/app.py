from flask import Flask, jsonify
from flask_cors import CORS
from .config import Config
from .extensions import db
from .auth import bp as auth_bp
from .vendors import bp as vendors_bp
from .customer_routes import bp as customer_bp

def create_app():
    app = Flask(__name__, static_folder="static", template_folder="templates")
    app.config.from_object(Config)
    db.init_app(app)

    # ============ CORS CONFIGURATION ============
    #this allows frontend on different port to call backend API
    CORS(app, resources={
        r"/*": {
            "origins": [
                "http://localhost:5173",  #vite dev server
                "http://localhost:3000",  #alternative port
                "http://127.0.0.1:5173",
                "http://127.0.0.1:3000",
            ],
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"],
            "supports_credentials": True,
            "max_age": 3600
        }
    })

    # register blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(vendors_bp)
    app.register_blueprint(customer_bp)

    @app.route("/")
    def home():
        return jsonify({
            "message": "FEMS Backend API is running!",
            "version": "1.0",
            "status": "active",
            "endpoints": {
                "auth": {
                    "register": "POST /api/register",
                    "verify_email": "POST /api/verify-email",
                    "complete_profile": "POST /api/complete-profile",
                    "login": "POST /api/login",
                    "profile": "GET /api/profile",
                },
                "vendors": {
                    "list": "GET /api/vendors",
                    "detail": "GET /api/vendors/<vendor_id>",
                    "create_menu": "POST /api/vendors/<vendor_id>/menu",
                    "add_items": "POST /api/vendors/<vendor_id>/menu/<menu_id>/items",
                    "update_item": "PUT /api/vendors/<vendor_id>/menu/<menu_id>/items/<item_id>",
                    "delete_item": "DELETE /api/vendors/<vendor_id>/menu/<menu_id>/items/<item_id>",
                },
                "customer": {
                    "browse_vendors": "GET /api/customer/vendors",
                    "view_menu": "GET /api/customer/vendors/<vendor_id>/menu",
                    "place_order": "POST /api/customer/orders",
                    "view_order": "GET /api/customer/orders/<order_id>",
                    "order_history": "GET /api/customer/orders",
                    "cancel_order": "PUT /api/customer/orders/<order_id>/cancel",
                    "get_stats": "GET /api/customer/stats",
                    "health_check": "GET /api/customer/health"
                }
            }
        })

    @app.errorhandler(404)
    def not_found(error):
        return jsonify({"error": "Endpoint not found"}), 404

    @app.errorhandler(500)
    def internal_error(error):
        return jsonify({"error": "Internal server error"}), 500

    return app


if __name__ == "__main__":
    app = create_app()
    with app.app_context():
        db.create_all()
        print("✅ Database tables created successfully!")

    app.run(debug=True, port=5000, host='0.0.0.0')
