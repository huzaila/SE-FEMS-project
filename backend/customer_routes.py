# backend/customer_routes.py
"""
Customer Routes for FEMS
Features:
1. Browse all vendors
2. View vendor menu & items
3. Place order with cart items and pickup time
4. View order summary & status
5. View order history
6. Cancel orders
7. Get customer statistics
"""

#blueprint for creating group of related routes
#request used to access incoming http requests
#jsonify converts python objects to json format
from flask import Blueprint, request, jsonify 
from sqlalchemy import text
from .extensions import db
from .models import Vendor, Menu, MenuItem, Order, OrderItem, User
#token_required decorator to check if user is authenticated
from .auth import token_required
from datetime import datetime
from decimal import Decimal 
import json #to convert python objs to json format for stored preocedures

#blueprint for customer routes which will be used to get all customer related routes
bp = Blueprint("customer", __name__, url_prefix="/api/customer")


def require_customer(f):
    """Decorator to ensure user is a customer"""
    from functools import wraps
    @wraps(f)
    def wrapper(current_user, *args, **kwargs):
        if current_user.role != 'customer':
            return jsonify({"error": "Customer access only"}), 403
        return f(current_user, *args, **kwargs)
    return wrapper


def row_to_dict(row):
    """Converts database row to JSON-serializable dictionary"""
    if row is None:
        return None
    
    result = dict(row._mapping)
    
    #convert Decimal to float and datetime to ISO format
    for key, value in result.items():
        if isinstance(value, Decimal):
            result[key] = float(value)
        elif isinstance(value, datetime):
            result[key] = value.isoformat()
    
    return result


# ============================================
# 1. BROWSE VENDORS
# ============================================

@bp.route("/vendors", methods=["GET"])
@token_required #verifies customer token to inject current user parameter into func
@require_customer #this decorator runs to validate customer then continues to function if customer
def get_all_vendors(current_user):
    """
    Gets all available vendors on campus
    SQL: INNER JOIN between vendors and users
    """
    try:
        sql = """
            SELECT 
                v.id,
                v.vendor_name,
                v.location,
                v.pickup_available,
                v.delivery_available,
                v.created_at,
                u.full_name AS owner_name,
                u.email AS owner_email
            FROM vendors v
            INNER JOIN users u ON v.user_id = u.id
            ORDER BY v.vendor_name;
        """
        
        result = db.session.execute(db.text(sql)) #sql query string sent
        vendors = [row_to_dict(row) for row in result] #sql row to python dict
        
        return jsonify({
            "vendors": vendors,
            "total": len(vendors),
            "message": "Vendors retrieved successfully"
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Database error: {str(e)}"}), 500


# ============================================
# 2. VIEW VENDOR MENU
# ============================================

@bp.route("/vendors/<int:vendor_id>/menu", methods=["GET"])
@token_required
@require_customer
def get_vendor_menu(current_user, vendor_id):
    """
    Gets vendor's menu with all items
    SQL: Multiple LEFT JOINs
    """
    try:
        #gets vendor info 
        vendor_sql = """
            SELECT 
                id, 
                vendor_name, 
                location, 
                pickup_available, 
                delivery_available
            FROM vendors 
            WHERE id = :vendor_id;
        """
        
        vendor_result = db.session.execute(
            db.text(vendor_sql), 
            {"vendor_id": vendor_id}
        ).first()
        
        if not vendor_result:
            return jsonify({"error": "Vendor not found"}), 404
        
        #get menu with items - continued query if vendor found
        menu_sql = """
            SELECT 
                m.id AS menu_id,
                m.title AS menu_title,
                m.is_active,
                mi.id AS item_id,
                mi.name AS item_name,
                mi.description,
                mi.price,
                mi.available,
                mi.preparation_time_minutes,
                mi.image_url
            FROM menus m
            LEFT JOIN menu_items mi ON m.id = mi.menu_id
            WHERE m.vendor_id = :vendor_id AND m.is_active = TRUE
            ORDER BY mi.name;
        """
        #left join will ensure menu returned even if no items to display
        
        menu_result = db.session.execute(
            db.text(menu_sql), 
            {"vendor_id": vendor_id}
        )
        
        #processing results
        menu_info = None
        items = []
        
        for row in menu_result:
            if menu_info is None and row.menu_id:
                menu_info = {
                    "id": row.menu_id,
                    "title": row.menu_title,
                    "is_active": row.is_active
                }
            
            if row.item_id:
                items.append({
                    "id": row.item_id,
                    "name": row.item_name,
                    "description": row.description,
                    "price": float(row.price) if row.price else 0.0,
                    "available": row.available,
                    "preparation_time_minutes": row.preparation_time_minutes,
                    "image_url": row.image_url
                })
        
        if menu_info:
            menu_info["items"] = items
        
        return jsonify({
            "vendor": row_to_dict(vendor_result),
            "menu": menu_info
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Database error: {str(e)}"}), 500


# ============================================
# 3. PLACE ORDER (Stored Procedure) 
# ============================================

@bp.route("/orders", methods=["POST"])
@token_required
@require_customer
def place_order(current_user):
    """
    Place order using stored procedure
    SQL: Calls place_customer_order() with transaction handling
    """
    try:
        data = request.get_json() or {} #contains customer items and all
        
        #validate required fields
        required = ["vendor_id", "pickup_time", "items"]
        for field in required:
            if field not in data:
                return jsonify({"error": f"{field} is required"}), 400
        
        #validate items array
        if not isinstance(data["items"], list) or len(data["items"]) == 0:
            return jsonify({"error": "items must be a non-empty array"}), 400
        
        #validate each item
        for idx, item in enumerate(data["items"]):
            if "menu_item_id" not in item:
                return jsonify({"error": f"Item {idx}: menu_item_id is required"}), 400
            if "quantity" not in item:
                return jsonify({"error": f"Item {idx}: quantity is required"}), 400
            if not isinstance(item["quantity"], int) or item["quantity"] < 1:
                return jsonify({"error": f"Item {idx}: quantity must be positive integer"}), 400
        
        #parse pickup time
        try:
            pickup_time = datetime.fromisoformat(data["pickup_time"].replace("Z", ""))
        except:
            return jsonify({"error": "Invalid pickup_time format. Use ISO format: 2025-12-01T14:30:00"}), 400
        
        #check if pickup time is in future
        if pickup_time <= datetime.utcnow():
            return jsonify({"error": "Pickup time must be in the future"}), 400
        
        #prepare items as JSON
        items_json = json.dumps(data["items"])
        
        #all parameters use :param syntax, use CAST() for jsonb for parsing thro sql code
        sql = """
            SELECT * FROM place_customer_order(
                :customer_id,
                :vendor_id,
                :scheduled_for,
                :pickup_or_delivery,
                :notes,
                CAST(:items AS jsonb)
            );
        """
        
        result = db.session.execute(
            db.text(sql),
            {
                "customer_id": current_user.id,
                "vendor_id": data["vendor_id"],
                "scheduled_for": pickup_time,
                "pickup_or_delivery": data.get("pickup_or_delivery", "pickup"),
                "notes": data.get("order_notes", ""),
                "items": items_json
            }
        ).first()
        
        db.session.commit()
        
        # Check if procedure returned result
        if not result:
            return jsonify({"error": "Stored procedure failed to return result"}), 500
        
        # Check if there was an error
        if result.status_message.startswith("ERROR"):
            return jsonify({"error": result.status_message}), 400
        
        # Get complete order details 
        order_sql = """
            SELECT 
                o.id, 
                o.total_amount, 
                o.status, 
                o.placed_at,
                o.scheduled_for,
                v.vendor_name,
                v.location
            FROM orders o
            JOIN vendors v ON o.vendor_id = v.id
            WHERE o.id = :order_id;
        """
        
        order = db.session.execute(
            db.text(order_sql), 
            {"order_id": result.order_id}
        ).first()
        
        if not order:
            return jsonify({"error": "Order created but could not retrieve details"}), 500
        
        order_dict = row_to_dict(order)
        
        return jsonify({
            "message": "Order placed successfully",
            "order": {
                "order_id": order_dict["id"],
                "vendor_name": order_dict["vendor_name"],
                "total_amount": order_dict["total_amount"],
                "status": order_dict["status"],
                "placed_at": order_dict["placed_at"],
                "scheduled_for": order_dict["scheduled_for"]
            }
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Failed to place order: {str(e)}"}), 500


# ============================================
# 4. VIEW ORDER DETAILS
# ============================================
@bp.route("/orders/<int:order_id>", methods=["GET"])
@token_required
@require_customer
def get_order_details(current_user, order_id):
    """
    Get detailed order information
    SQL: Complex query with subqueries
    """
    try:
    
        sql = """
            SELECT 
                o.id,
                o.status,
                o.payment_status,
                o.total_amount,
                o.placed_at,
                o.scheduled_for,
                o.estimated_ready_at,
                o.pickup_or_delivery,
                o.notes,
                v.id AS vendor_id,
                v.vendor_name,
                v.location,
                (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) AS items_count,
                (SELECT SUM(quantity) FROM order_items WHERE order_id = o.id) AS total_quantity
            FROM orders o
            JOIN vendors v ON o.vendor_id = v.id
            WHERE o.id = :order_id AND o.customer_id = :customer_id;
        """
        
        result = db.session.execute(
            db.text(sql),
            {"order_id": order_id, "customer_id": current_user.id}
        ).first()
        
        if not result:
            return jsonify({"error": "Order not found"}), 404
        
        # Get order items 
        items_sql = """
            SELECT 
                id,
                name_snapshot AS name,
                price_snapshot AS price,
                quantity,
                notes,
                (price_snapshot * quantity) AS item_total
            FROM order_items 
            WHERE order_id = :order_id
            ORDER BY id;
        """
        
        items_result = db.session.execute(
            db.text(items_sql), 
            {"order_id": order_id}
        )
        
        items = [row_to_dict(row) for row in items_result]
        
        return jsonify({
            "order": row_to_dict(result),
            "items": items
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Database error: {str(e)}"}), 500


# ============================================
# 5. VIEW ORDER HISTORY
# ============================================
@bp.route("/orders", methods=["GET"])
@token_required
@require_customer
def get_order_history(current_user):
    """
    Get customer's order history with items
    SQL: Multiple queries to fetch orders and their items
    """
    try:
        status_filter = request.args.get("status")
        limit = request.args.get("limit", 50, type=int)

        # Validate limit
        if limit < 1 or limit > 100:
            return jsonify({"error": "Limit must be between 1 and 100"}), 400

        # Get orders
        sql = """
            SELECT
                o.id AS order_id,
                o.vendor_id,
                o.status,
                o.payment_status,
                o.total_amount,
                o.placed_at,
                o.scheduled_for,
                o.pickup_or_delivery,
                o.notes,
                v.vendor_name,
                v.location
            FROM orders o
            JOIN vendors v ON o.vendor_id = v.id
            WHERE o.customer_id = :customer_id
        """

        params = {"customer_id": current_user.id}

        # Add status filter if provided
        if status_filter:
            valid_statuses = ['pending', 'accepted', 'preparing', 'ready', 'completed', 'cancelled', 'rejected']
            if status_filter not in valid_statuses:
                return jsonify({"error": f"Invalid status. Must be one of: {', '.join(valid_statuses)}"}), 400
            sql += " AND o.status = :status"
            params["status"] = status_filter

        sql += """
            ORDER BY o.placed_at DESC
            LIMIT :limit;
        """
        params["limit"] = limit

        result = db.session.execute(db.text(sql), params)
        orders = [row_to_dict(row) for row in result]

        # Fetch items for each order
        for order in orders:
            items_sql = """
                SELECT
                    id,
                    name_snapshot AS name,
                    price_snapshot AS price,
                    quantity,
                    notes
                FROM order_items
                WHERE order_id = :order_id
                ORDER BY id;
            """

            items_result = db.session.execute(
                db.text(items_sql),
                {"order_id": order["order_id"]}
            )

            order["items"] = [row_to_dict(row) for row in items_result]

        return jsonify({
            "orders": orders,
            "total": len(orders),
            "showing": len(orders)
        }), 200

    except Exception as e:
        return jsonify({"error": f"Database error: {str(e)}"}), 500


# ============================================
# 6. CANCEL ORDER
# ============================================
@bp.route("/orders/<int:order_id>/cancel", methods=["PUT"])
@token_required
@require_customer
def cancel_order(current_user, order_id):
    """
    Cancel an order
    SQL: Calls cancel_customer_order() stored procedure
    """
    try:
        # FIXED: Use :param syntax
        sql = """
            SELECT cancel_customer_order(
                :order_id, 
                :customer_id
            ) AS result;
        """
        
        result = db.session.execute(
            db.text(sql),
            {"order_id": order_id, "customer_id": current_user.id}
        ).first()
        
        db.session.commit()
        
        if not result:
            return jsonify({"error": "Failed to cancel order"}), 500
        
        if result.result.startswith("ERROR"):
            return jsonify({"error": result.result}), 400
        
        return jsonify({
            "message": result.result,
            "order_id": order_id
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Failed to cancel: {str(e)}"}), 500


# ============================================
# 7. GET CUSTOMER STATISTICS
# ============================================
@bp.route("/stats", methods=["GET"])
@token_required
@require_customer
def get_customer_stats(current_user):
    """
    Get customer statistics
    SQL: Uses stored functions and views
    """
    try:
        # FIXED: Use :param syntax
        sql = """
            SELECT 
                get_customer_order_count(:customer_id) AS total_orders,
                COALESCE(
                    (SELECT total_spent FROM customer_order_summary_view 
                     WHERE customer_id = :customer_id), 
                    0
                ) AS total_spent,
                (SELECT last_order_date FROM customer_order_summary_view 
                 WHERE customer_id = :customer_id) AS last_order;
        """
        
        result = db.session.execute(
            db.text(sql), 
            {"customer_id": current_user.id}
        ).first()
        
        if not result:
            return jsonify({
                "stats": {
                    "total_orders": 0,
                    "total_spent": 0.0,
                    "last_order": None
                }
            }), 200
        
        stats = row_to_dict(result)
        
        return jsonify({"stats": stats}), 200
        
    except Exception as e:
        return jsonify({"error": f"Database error: {str(e)}"}), 500


# ============================================
# 8. HEALTH CHECK
# ============================================
@bp.route("/health", methods=["GET"])
def health_check():
    """Health check endpoint - no authentication required"""
    try:
        #testing database connection
        db.session.execute(db.text("SELECT 1"))
        return jsonify({
            "status": "healthy",
            "service": "customer_routes",
            "database": "connected"
        }), 200
    except Exception as e:
        return jsonify({
            "status": "unhealthy",
            "service": "customer_routes",
            "error": str(e)
        }), 500