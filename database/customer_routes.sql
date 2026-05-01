-- ============================================
-- FEMS Customer Routes - Database Objects
-- ============================================

-- View 1: Active menu items with vendor info
CREATE OR REPLACE VIEW active_menu_items_view AS
SELECT 
    mi.id AS item_id,
    mi.name AS item_name,
    mi.description,
    mi.price,
    mi.available,
    mi.preparation_time_minutes,
    v.id AS vendor_id,
    v.vendor_name,
    v.location,
    m.title AS menu_title
FROM menu_items mi
INNER JOIN menus m ON mi.menu_id = m.id
INNER JOIN vendors v ON mi.vendor_id = v.id
WHERE mi.available = TRUE AND m.is_active = TRUE;

--inner join used as it will basically return the items fulfilling the common condition


-- View 2: Customer order summary
CREATE OR REPLACE VIEW customer_order_summary_view AS
SELECT 
    u.id AS customer_id,
    u.full_name,
    u.email,
    COUNT(o.id) AS total_orders,
    COALESCE(SUM(o.total_amount), 0) AS total_spent,
    MAX(o.placed_at) AS last_order_date
FROM users u
LEFT JOIN orders o ON u.id = o.customer_id
WHERE u.role = 'customer'
GROUP BY u.id, u.full_name, u.email;

-- Function 1: Calculate order total
CREATE OR REPLACE FUNCTION calculate_order_total(p_order_id INTEGER)
RETURNS DECIMAL(12,2) AS $$
    SELECT COALESCE(SUM(price_snapshot * quantity), 0)
    FROM order_items
    WHERE order_id = p_order_id;
$$ LANGUAGE SQL;

-- Function 2: Get customer order count
CREATE OR REPLACE FUNCTION get_customer_order_count(p_customer_id INTEGER)
RETURNS INTEGER AS $$
    SELECT COUNT(*)::INTEGER
    FROM orders
    WHERE customer_id = p_customer_id;
$$ LANGUAGE SQL;

-- Function 3: Check if item is available
CREATE OR REPLACE FUNCTION is_item_available(p_item_id INTEGER)
RETURNS BOOLEAN AS $$
    SELECT available
    FROM menu_items
    WHERE id = p_item_id;
$$ LANGUAGE SQL;

-- Procedure 1: Place Order
CREATE OR REPLACE FUNCTION place_customer_order(
    p_customer_id INTEGER,
    p_vendor_id INTEGER,
    p_scheduled_for TIMESTAMP,
    p_pickup_or_delivery VARCHAR(20),
    p_notes TEXT,
    p_items JSONB
) RETURNS TABLE(
    order_id INTEGER,
    total_amount DECIMAL(12,2),
    status_message TEXT
) AS $$
DECLARE
    v_order_id INTEGER;
    v_total DECIMAL(12,2) := 0;
    v_item JSONB;
    v_menu_item RECORD;
    v_item_total DECIMAL(12,2);
BEGIN
    -- Validate vendor
    IF NOT EXISTS (SELECT 1 FROM vendors WHERE id = p_vendor_id) THEN
        RETURN QUERY SELECT NULL::INTEGER, NULL::DECIMAL(12,2), 'ERROR: Vendor not found';
        RETURN;
    END IF;
    
    -- Validate pickup time
    IF p_scheduled_for <= NOW() THEN
        RETURN QUERY SELECT NULL::INTEGER, NULL::DECIMAL(12,2), 'ERROR: Pickup time must be in the future';
        RETURN;
    END IF;
    
    -- Create order
    INSERT INTO orders (
        customer_id, vendor_id, scheduled_for,
        total_amount, status, payment_status,
        pickup_or_delivery, notes
    ) VALUES (
        p_customer_id, p_vendor_id, p_scheduled_for,
        0, 'pending', 'pending',
        p_pickup_or_delivery, p_notes
    ) RETURNING id INTO v_order_id;
    
    -- Process items
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        SELECT * INTO v_menu_item
        FROM menu_items
        WHERE id = (v_item->>'menu_item_id')::INTEGER
        AND vendor_id = p_vendor_id;
        
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Menu item % not found', v_item->>'menu_item_id';
        END IF;
        
        IF NOT v_menu_item.available THEN
            RAISE EXCEPTION 'Item % is not available', v_menu_item.name;
        END IF;
        
        v_item_total := v_menu_item.price * (v_item->>'quantity')::INTEGER;
        v_total := v_total + v_item_total;
        
        INSERT INTO order_items (
            order_id, menu_item_id, name_snapshot,
            price_snapshot, quantity, notes
        ) VALUES (
            v_order_id,
            v_menu_item.id,
            v_menu_item.name,
            v_menu_item.price,
            (v_item->>'quantity')::INTEGER,
            v_item->>'notes'
        );
    END LOOP;
    
    -- Update total
    UPDATE orders SET total_amount = v_total WHERE id = v_order_id;
    
    RETURN QUERY SELECT v_order_id, v_total, 'SUCCESS: Order placed successfully';
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN QUERY SELECT NULL::INTEGER, NULL::DECIMAL(12,2), ('ERROR: ' || SQLERRM);
END;
$$ LANGUAGE plpgsql;

-- Procedure 2: Cancel Order
CREATE OR REPLACE FUNCTION cancel_customer_order(
    p_order_id INTEGER,
    p_customer_id INTEGER
) RETURNS TEXT AS $$
DECLARE
    v_order RECORD;
BEGIN
    SELECT * INTO v_order
    FROM orders
    WHERE id = p_order_id AND customer_id = p_customer_id;
    
    IF NOT FOUND THEN
        RETURN 'ERROR: Order not found';
    END IF;
    
    IF v_order.status NOT IN ('pending') THEN
        RETURN 'ERROR: Only pending orders can be cancelled';
    END IF;
    
    UPDATE orders SET status = 'cancelled' WHERE id = p_order_id;
    
    RETURN 'SUCCESS: Order cancelled';
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN 'ERROR: ' || SQLERRM;
END;
$$ LANGUAGE plpgsql;
