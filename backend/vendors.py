# backend/vendors.py
"""
Vendor Routes for FEMS 

Features:
1. Menu Management (Create, View)
2. Menu Items (Add, Update, Delete)
3. Order Management (View, Update Status)
4. Analytics & Statistics
5. Inventory Tracking
"""

from flask import Blueprint, request, jsonify
from .extensions import db
from .models import Vendor  # Only for type hints/validation
from .auth import token_required
from datetime import datetime, timedelta
from decimal import Decimal
import json

bp = Blueprint("vendors", __name__, url_prefix="/api/vendors")


def require_vendor(f):
    """Decorator to ensure user is a vendor"""
    from functools import wraps
    @wraps(f)
    def wrapper(current_user, *args, **kwargs):
        if current_user.role != 'vendor':
            return jsonify({"error": "Vendor access only"}), 403
        return f(current_user, *args, **kwargs)
    return wrapper


def row_to_dict(row):
    """Convert database row to JSON-serializable dictionary"""
    if row is None:
        return None
    
    result = dict(row._mapping)
    
    # Convert Decimal to float and datetime to ISO format
    for key, value in result.items():
        if isinstance(value, Decimal):
            result[key] = float(value)
        elif isinstance(value, datetime):
            result[key] = value.isoformat()
    
    return result


def verify_vendor_ownership(current_user_id, vendor_id):
    """Verify that current user owns the vendor account"""
    sql = "SELECT 1 FROM vendors WHERE id = :vendor_id AND user_id = :user_id"
    result = db.session.execute(
        db.text(sql),
        {"vendor_id": vendor_id, "user_id": current_user_id}
    ).first()
    return result is not None


# ============================================
# 1. CREATE MENU
# ============================================
@bp.route("/<int:vendor_id>/menu", methods=["POST"])
@token_required
@require_vendor
def create_menu(current_user, vendor_id):
    """
    Create menu for vendor using stored procedure
    SQL: Calls create_vendor_menu()
    """
    try:
        # Verify ownership
        if not verify_vendor_ownership(current_user.id, vendor_id):
            return jsonify({"error": "Access denied"}), 403
        
        data = request.get_json() or {}
        title = data.get("title", "").strip()
        
        if not title:
            return jsonify({"error": "title is required"}), 400
        
        # Call stored procedure
        sql = """
            SELECT * FROM create_vendor_menu(:vendor_id, :title);
        """
        
        result = db.session.execute(
            db.text(sql),
            {"vendor_id": vendor_id, "title": title}
        ).first()
        
        db.session.commit()
        
        if not result or result.status_message.startswith("ERROR"):
            error_msg = result.status_message if result else "Failed to create menu"
            return jsonify({"error": error_msg}), 400
        
        return jsonify({
            "message": "Menu created successfully",
            "menu": {
                "id": result.menu_id,
                "title": result.title,
                "is_active": result.is_active,
                "created_at": result.created_at.isoformat() if result.created_at else None
            }
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Database error: {str(e)}"}), 500


# ============================================
# 2. ADD MENU ITEMS
# ============================================
@bp.route("/<int:vendor_id>/menu/<int:menu_id>/items", methods=["POST"])
@token_required
@require_vendor
def add_menu_items(current_user, vendor_id, menu_id):
    """
    Add menu items using stored procedure
    SQL: Calls add_menu_item() for each item
    """
    try:
        # Verify ownership
        if not verify_vendor_ownership(current_user.id, vendor_id):
            return jsonify({"error": "Access denied"}), 403
        
        payload = request.get_json() or {}
        items = payload if isinstance(payload, list) else [payload]
        
        if not items:
            return jsonify({"error": "items array cannot be empty"}), 400
        
        created_items = []
        
        for item in items:
            name = item.get("name", "").strip()
            price = item.get("price")
            
            if not name or price is None:
                return jsonify({"error": "Each item requires name and price"}), 400
            
            # Call stored procedure for each item
            sql = """
                SELECT * FROM add_menu_item(
                    :vendor_id,
                    :menu_id,
                    :name,
                    :description,
                    :price,
                    :available,
                    :prep_time,
                    :image_url
                );
            """
            
            result = db.session.execute(
                db.text(sql),
                {
                    "vendor_id": vendor_id,
                    "menu_id": menu_id,
                    "name": name,
                    "description": item.get("description", ""),
                    "price": price,
                    "available": item.get("available", True),
                    "prep_time": item.get("preparation_time_minutes", 15),
                    "image_url": item.get("image_url")
                }
            ).first()
            
            if not result or result.status_message.startswith("ERROR"):
                db.session.rollback()
                error_msg = result.status_message if result else "Failed to add item"
                return jsonify({"error": error_msg}), 400
            
            created_items.append({
                "id": result.item_id,
                "name": result.name,
                "description": result.description,
                "price": float(result.price) if result.price else 0.0,
                "available": result.available,
                "preparation_time_minutes": result.preparation_time_minutes,
                "image_url": result.image_url
            })
        
        db.session.commit()
        
        return jsonify({
            "message": f"{len(created_items)} item(s) created successfully",
            "items": created_items
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Database error: {str(e)}"}), 500


# ============================================
# 3. UPDATE MENU ITEM
# ============================================
@bp.route("/<int:vendor_id>/menu/<int:menu_id>/items/<int:item_id>", methods=["PUT"])
@token_required
@require_vendor
def update_menu_item(current_user, vendor_id, menu_id, item_id):
    """
    Update menu item using stored procedure
    SQL: Calls update_menu_item()
    """
    try:
        # Verify ownership
        if not verify_vendor_ownership(current_user.id, vendor_id):
            return jsonify({"error": "Access denied"}), 403
        
        data = request.get_json() or {}
        
        # Call stored procedure with partial update support
        sql = """
            SELECT * FROM update_menu_item(
                :vendor_id,
                :menu_id,
                :item_id,
                :name,
                :description,
                :price,
                :available,
                :prep_time,
                :image_url
            );
        """
        
        result = db.session.execute(
            db.text(sql),
            {
                "vendor_id": vendor_id,
                "menu_id": menu_id,
                "item_id": item_id,
                "name": data.get("name"),
                "description": data.get("description"),
                "price": data.get("price"),
                "available": data.get("available"),
                "prep_time": data.get("preparation_time_minutes"),
                "image_url": data.get("image_url")
            }
        ).first()
        
        db.session.commit()
        
        if not result or result.status_message.startswith("ERROR"):
            error_msg = result.status_message if result else "Failed to update item"
            return jsonify({"error": error_msg}), 400
        
        return jsonify({
            "message": "Menu item updated successfully",
            "item": {
                "id": result.item_id,
                "name": result.name,
                "description": result.description,
                "price": float(result.price) if result.price else 0.0,
                "available": result.available,
                "preparation_time_minutes": result.preparation_time_minutes,
                "image_url": result.image_url
            }
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Database error: {str(e)}"}), 500


# ============================================
# 4. DELETE MENU ITEM
# ============================================
@bp.route("/<int:vendor_id>/menu/<int:menu_id>/items/<int:item_id>", methods=["DELETE"])
@token_required
@require_vendor
def delete_menu_item(current_user, vendor_id, menu_id, item_id):
    """
    Delete menu item using stored procedure
    SQL: Calls delete_menu_item()
    """
    try:
        # Verify ownership
        if not verify_vendor_ownership(current_user.id, vendor_id):
            return jsonify({"error": "Access denied"}), 403
        
        # Call stored procedure
        sql = """
            SELECT * FROM delete_menu_item(:vendor_id, :menu_id, :item_id);
        """
        
        result = db.session.execute(
            db.text(sql),
            {"vendor_id": vendor_id, "menu_id": menu_id, "item_id": item_id}
        ).first()
        
        db.session.commit()
        
        if not result or result.status_message.startswith("ERROR"):
            error_msg = result.status_message if result else "Failed to delete item"
            return jsonify({"error": error_msg}), 400
        
        return jsonify({
            "message": "Menu item deleted successfully",
            "deleted_item": {
                "id": result.deleted_item_id,
                "name": result.deleted_item_name
            }
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Database error: {str(e)}"}), 500


# ============================================
# 5. GET VENDOR INFO (Public - No Auth)
# ============================================
@bp.route("/<int:vendor_id>", methods=["GET"])
def get_vendor(vendor_id):
    """
    Get vendor information with menu and items
    SQL: Raw SQL with JOINs
    """
    try:
        # Get vendor info
        vendor_sql = """
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
            WHERE v.id = :vendor_id;
        """
        
        vendor_result = db.session.execute(
            db.text(vendor_sql),
            {"vendor_id": vendor_id}
        ).first()
        
        if not vendor_result:
            return jsonify({"error": "Vendor not found"}), 404
        
        # Get menu with items
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
            WHERE m.vendor_id = :vendor_id
            ORDER BY mi.name;
        """
        
        menu_result = db.session.execute(
            db.text(menu_sql),
            {"vendor_id": vendor_id}
        )
        
        # Process results
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
            "vendor": {
                **row_to_dict(vendor_result),
                "menu": menu_info
            }
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Database error: {str(e)}"}), 500


# ============================================
# 6. GET VENDOR ORDERS (NEW - Order Management)
# ============================================
@bp.route("/<int:vendor_id>/orders", methods=["GET"])
@token_required
@require_vendor
def get_vendor_orders(current_user, vendor_id):
    """
    Get vendor's orders with filters and items
    SQL: Raw SQL with JOINs
    """
    try:
        # Verify ownership
        if not verify_vendor_ownership(current_user.id, vendor_id):
            return jsonify({"error": "Access denied"}), 403

        # Get query parameters
        status_filter = request.args.get("status")
        limit = request.args.get("limit", 50, type=int)

        # Validate limit
        if limit < 1 or limit > 100:
            return jsonify({"error": "Limit must be between 1 and 100"}), 400

        # Get orders
        sql = """
            SELECT
                o.id AS order_id,
                o.customer_id,
                u.full_name AS customer_name,
                u.email AS customer_email,
                u.phone AS customer_phone,
                o.placed_at,
                o.scheduled_for,
                o.total_amount,
                o.status,
                o.payment_status,
                o.pickup_or_delivery,
                o.notes,
                o.estimated_ready_at
            FROM orders o
            INNER JOIN users u ON o.customer_id = u.id
            WHERE o.vendor_id = :vendor_id
        """

        params = {"vendor_id": vendor_id}

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
            "filters": {
                "status": status_filter,
                "limit": limit
            }
        }), 200

    except Exception as e:
        return jsonify({"error": f"Database error: {str(e)}"}), 500


# ============================================
# 7. GET ORDER DETAILS (NEW)
# ============================================
@bp.route("/<int:vendor_id>/orders/<int:order_id>", methods=["GET"])
@token_required
@require_vendor
def get_order_details(current_user, vendor_id, order_id):
    """
    Get detailed order information
    SQL: Raw SQL with JOINs
    """
    try:
        # Verify ownership
        if not verify_vendor_ownership(current_user.id, vendor_id):
            return jsonify({"error": "Access denied"}), 403
        
        # Get order details
        order_sql = """
            SELECT 
                o.id,
                o.customer_id,
                u.full_name AS customer_name,
                u.email AS customer_email,
                u.phone AS customer_phone,
                o.placed_at,
                o.scheduled_for,
                o.total_amount,
                o.status,
                o.payment_status,
                o.pickup_or_delivery,
                o.notes,
                o.estimated_ready_at
            FROM orders o
            INNER JOIN users u ON o.customer_id = u.id
            WHERE o.id = :order_id AND o.vendor_id = :vendor_id;
        """
        
        order_result = db.session.execute(
            db.text(order_sql),
            {"order_id": order_id, "vendor_id": vendor_id}
        ).first()
        
        if not order_result:
            return jsonify({"error": "Order not found"}), 404
        
        # Get order items
        items_sql = """
            SELECT 
                id,
                menu_item_id,
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
            "order": row_to_dict(order_result),
            "items": items,
            "items_count": len(items)
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Database error: {str(e)}"}), 500


# ============================================
# 8. UPDATE ORDER STATUS (NEW - Key Feature!)
# ============================================
@bp.route("/<int:vendor_id>/orders/<int:order_id>/status", methods=["PUT"])
@token_required
@require_vendor
def update_order_status(current_user, vendor_id, order_id):
    """
    Update order status (pending -> accepted -> preparing -> ready -> completed)
    SQL: Calls update_order_status() stored procedure
    """
    try:
        # Verify ownership
        if not verify_vendor_ownership(current_user.id, vendor_id):
            return jsonify({"error": "Access denied"}), 403
        
        data = request.get_json() or {}
        new_status = data.get("status", "").strip()
        estimated_ready_at = data.get("estimated_ready_at")
        
        if not new_status:
            return jsonify({"error": "status is required"}), 400
        
        # Parse estimated_ready_at if provided
        ready_time = None
        if estimated_ready_at:
            try:
                ready_time = datetime.fromisoformat(estimated_ready_at.replace("Z", ""))
            except:
                return jsonify({"error": "Invalid estimated_ready_at format"}), 400
        
        # Call stored procedure
        sql = """
            SELECT * FROM update_order_status(
                :vendor_id,
                :order_id,
                :new_status,
                :estimated_ready_at
            );
        """
        
        result = db.session.execute(
            db.text(sql),
            {
                "vendor_id": vendor_id,
                "order_id": order_id,
                "new_status": new_status,
                "estimated_ready_at": ready_time
            }
        ).first()
        
        db.session.commit()
        
        if not result or result.status_message.startswith("ERROR"):
            error_msg = result.status_message if result else "Failed to update status"
            return jsonify({"error": error_msg}), 400
        
        return jsonify({
            "message": "Order status updated successfully",
            "order": {
                "id": result.order_id,
                "old_status": result.old_status,
                "new_status": result.new_status,
                "estimated_ready_at": result.estimated_ready_at.isoformat() if result.estimated_ready_at else None
            }
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Database error: {str(e)}"}), 500


# ============================================
# 9. GET VENDOR STATISTICS (NEW)
# ============================================
@bp.route("/<int:vendor_id>/stats", methods=["GET"])
@token_required
@require_vendor
def get_vendor_stats(current_user, vendor_id):
    """
    Get vendor statistics and analytics
    SQL: Uses vendor_revenue_analytics view
    """
    try:
        # Verify ownership
        if not verify_vendor_ownership(current_user.id, vendor_id):
            return jsonify({"error": "Access denied"}), 403
        
        # Get revenue analytics
        stats_sql = """
            SELECT 
                total_orders,
                total_revenue,
                avg_order_value,
                completed_orders,
                cancelled_orders,
                pending_orders
            FROM vendor_revenue_analytics
            WHERE vendor_id = :vendor_id;
        """
        
        stats = db.session.execute(
            db.text(stats_sql),
            {"vendor_id": vendor_id}
        ).first()
        
        if not stats:
            return jsonify({
                "stats": {
                    "total_orders": 0,
                    "total_revenue": 0.0,
                    "avg_order_value": 0.0,
                    "completed_orders": 0,
                    "cancelled_orders": 0,
                    "pending_orders": 0
                }
            }), 200
        
        return jsonify({
            "stats": row_to_dict(stats)
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Database error: {str(e)}"}), 500


# ============================================
# 10. HEALTH CHECK
# ============================================
@bp.route("/health", methods=["GET"])
def health_check():
    """Health check endpoint"""
    try:
        db.session.execute(db.text("SELECT 1"))
        return jsonify({
            "status": "healthy",
            "service": "vendor_routes",
            "database": "connected"
        }), 200
    except Exception as e:
        return jsonify({
            "status": "unhealthy",
            "service": "vendor_routes",
            "error": str(e)
        }), 500