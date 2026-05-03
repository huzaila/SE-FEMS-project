-- ============================================
-- FEMS Vendor Routes - Database Objects
-- ============================================

-- ============================================
-- VIEWS
-- ============================================

-- View 1: Vendor's Orders Summary
CREATE OR REPLACE VIEW vendor_orders_view AS
SELECT 
    o.id AS order_id,
    o.customer_id,
    u.full_name AS customer_name,
    u.email AS customer_email,
    u.phone AS customer_phone,
    o.vendor_id,
    o.placed_at,
    o.scheduled_for,
    o.total_amount,
    o.status,
    o.payment_status,
    o.pickup_or_delivery,
    o.notes,
    o.estimated_ready_at,
    COUNT(oi.id) AS items_count,
    COALESCE(SUM(oi.quantity), 0) AS total_items_quantity
FROM orders o
INNER JOIN users u ON o.customer_id = u.id
LEFT JOIN order_items oi ON o.id = oi.order_id
GROUP BY o.id, u.full_name, u.email, u.phone;

-- View 2: Vendor's Menu Items with Stats
CREATE OR REPLACE VIEW vendor_menu_items_stats AS
SELECT 
    mi.id AS item_id,
    mi.vendor_id,
    mi.name,
    mi.description,
    mi.price,
    mi.available,
    mi.preparation_time_minutes,
    mi.image_url,
    mi.created_at,
    COUNT(DISTINCT oi.order_id) AS times_ordered,
    COALESCE(SUM(oi.quantity), 0) AS total_quantity_sold,
    COALESCE(SUM(oi.price_snapshot * oi.quantity), 0) AS total_revenue
FROM menu_items mi
LEFT JOIN order_items oi ON mi.id = oi.menu_item_id
GROUP BY mi.id;

-- View 3: Vendor's Revenue Analytics
CREATE OR REPLACE VIEW vendor_revenue_analytics AS
SELECT 
    v.id AS vendor_id,
    v.vendor_name,
    COUNT(DISTINCT o.id) AS total_orders,
    COALESCE(SUM(o.total_amount), 0) AS total_revenue,
    COALESCE(AVG(o.total_amount), 0) AS avg_order_value,
    COUNT(DISTINCT CASE WHEN o.status = 'completed' THEN o.id END) AS completed_orders,
    COUNT(DISTINCT CASE WHEN o.status = 'cancelled' THEN o.id END) AS cancelled_orders,
    COUNT(DISTINCT CASE WHEN o.status = 'pending' THEN o.id END) AS pending_orders
FROM vendors v
LEFT JOIN orders o ON v.id = o.vendor_id
GROUP BY v.id, v.vendor_name;


-- ============================================
-- STORED FUNCTIONS
-- ============================================

-- Function 1: Check if vendor owns menu
CREATE OR REPLACE FUNCTION vendor_owns_menu(p_vendor_id INTEGER, p_menu_id INTEGER)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM menus 
        WHERE id = p_menu_id AND vendor_id = p_vendor_id
    );
END;
$$ LANGUAGE plpgsql;

-- Function 2: Check if vendor owns menu item
CREATE OR REPLACE FUNCTION vendor_owns_item(
    p_vendor_id INTEGER, 
    p_menu_id INTEGER, 
    p_item_id INTEGER
)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM menu_items 
        WHERE id = p_item_id 
        AND menu_id = p_menu_id 
        AND vendor_id = p_vendor_id
    );
END;
$$ LANGUAGE plpgsql;

-- Function 3: Get vendor's order count by status
CREATE OR REPLACE FUNCTION get_vendor_order_count(
    p_vendor_id INTEGER,
    p_status VARCHAR DEFAULT NULL
)
RETURNS INTEGER AS $$
BEGIN
    IF p_status IS NULL THEN
        RETURN (SELECT COUNT(*) FROM orders WHERE vendor_id = p_vendor_id);
    ELSE
        RETURN (SELECT COUNT(*) FROM orders WHERE vendor_id = p_vendor_id AND status = p_status);
    END IF;
END;
$$ LANGUAGE plpgsql;


-- ============================================
-- STORED PROCEDURES
-- ============================================

-- Procedure 1: Create Menu for Vendor
CREATE OR REPLACE FUNCTION create_vendor_menu(
    p_vendor_id INTEGER,
    p_title VARCHAR(100)
)
RETURNS TABLE(
    menu_id INTEGER,
    title VARCHAR(100),
    is_active BOOLEAN,
    created_at TIMESTAMP,
    status_message TEXT
) AS $$
DECLARE
    v_menu_id INTEGER;
BEGIN
    -- Check if vendor exists
    IF NOT EXISTS (SELECT 1 FROM vendors WHERE id = p_vendor_id) THEN
        RETURN QUERY SELECT NULL::INTEGER, NULL::VARCHAR, NULL::BOOLEAN, NULL::TIMESTAMP, 'ERROR: Vendor not found';
        RETURN;
    END IF;
    
    -- Check if menu already exists
    IF EXISTS (SELECT 1 FROM menus WHERE vendor_id = p_vendor_id) THEN
        RETURN QUERY SELECT NULL::INTEGER, NULL::VARCHAR, NULL::BOOLEAN, NULL::TIMESTAMP, 'ERROR: Menu already exists for this vendor';
        RETURN;
    END IF;
    
    -- Create menu
    INSERT INTO menus (vendor_id, title, is_active)
    VALUES (p_vendor_id, p_title, TRUE)
    RETURNING id INTO v_menu_id;
    
    RETURN QUERY 
    SELECT 
        m.id, 
        m.title, 
        m.is_active, 
        m.created_at,
        'SUCCESS: Menu created'::TEXT
    FROM menus m
    WHERE m.id = v_menu_id;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN QUERY SELECT NULL::INTEGER, NULL::VARCHAR, NULL::BOOLEAN, NULL::TIMESTAMP, ('ERROR: ' || SQLERRM)::TEXT;
END;
$$ LANGUAGE plpgsql;


-- Procedure 2: Add Menu Item
CREATE OR REPLACE FUNCTION add_menu_item(
    p_vendor_id INTEGER,
    p_menu_id INTEGER,
    p_name VARCHAR(200),
    p_description TEXT,
    p_price DECIMAL(10,2),
    p_available BOOLEAN DEFAULT TRUE,
    p_prep_time INT DEFAULT 15,
    p_image_url TEXT DEFAULT NULL
)
RETURNS TABLE(
    item_id INTEGER,
    name VARCHAR(200),
    description TEXT,
    price DECIMAL(10,2),
    available BOOLEAN,
    preparation_time_minutes INT,
    image_url TEXT,
    status_message TEXT
) AS $$
DECLARE
    v_item_id INTEGER;
BEGIN
    -- Verify vendor owns menu
    IF NOT vendor_owns_menu(p_vendor_id, p_menu_id) THEN
        RETURN QUERY SELECT NULL::INTEGER, NULL::VARCHAR, NULL::TEXT, NULL::DECIMAL, NULL::BOOLEAN, NULL::INT, NULL::TEXT, 'ERROR: Menu not found or access denied';
        RETURN;
    END IF;
    
    -- Validate inputs
    IF p_name IS NULL OR TRIM(p_name) = '' THEN
        RETURN QUERY SELECT NULL::INTEGER, NULL::VARCHAR, NULL::TEXT, NULL::DECIMAL, NULL::BOOLEAN, NULL::INT, NULL::TEXT, 'ERROR: Item name is required';
        RETURN;
    END IF;
    
    IF p_price IS NULL OR p_price < 0 THEN
        RETURN QUERY SELECT NULL::INTEGER, NULL::VARCHAR, NULL::TEXT, NULL::DECIMAL, NULL::BOOLEAN, NULL::INT, NULL::TEXT, 'ERROR: Valid price is required';
        RETURN;
    END IF;
    
    -- Insert menu item
    INSERT INTO menu_items (
        menu_id, vendor_id, name, description, price, 
        available, preparation_time_minutes, image_url
    ) VALUES (
        p_menu_id, p_vendor_id, TRIM(p_name), p_description, p_price,
        p_available, p_prep_time, p_image_url
    )
    RETURNING id INTO v_item_id;
    
    RETURN QUERY
    SELECT 
        mi.id,
        mi.name,
        mi.description,
        mi.price,
        mi.available,
        mi.preparation_time_minutes,
        mi.image_url,
        'SUCCESS: Item added'::TEXT
    FROM menu_items mi
    WHERE mi.id = v_item_id;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN QUERY SELECT NULL::INTEGER, NULL::VARCHAR, NULL::TEXT, NULL::DECIMAL, NULL::BOOLEAN, NULL::INT, NULL::TEXT, ('ERROR: ' || SQLERRM)::TEXT;
END;
$$ LANGUAGE plpgsql;


-- Procedure 3: Update Menu Item
CREATE OR REPLACE FUNCTION update_menu_item(
    p_vendor_id INTEGER,
    p_menu_id INTEGER,
    p_item_id INTEGER,
    p_name VARCHAR(200) DEFAULT NULL,
    p_description TEXT DEFAULT NULL,
    p_price DECIMAL(10,2) DEFAULT NULL,
    p_available BOOLEAN DEFAULT NULL,
    p_prep_time INT DEFAULT NULL,
    p_image_url TEXT DEFAULT NULL
)
RETURNS TABLE(
    item_id INTEGER,
    name VARCHAR(200),
    description TEXT,
    price DECIMAL(10,2),
    available BOOLEAN,
    preparation_time_minutes INT,
    image_url TEXT,
    status_message TEXT
) AS $$
BEGIN
    -- Verify ownership
    IF NOT vendor_owns_item(p_vendor_id, p_menu_id, p_item_id) THEN
        RETURN QUERY SELECT NULL::INTEGER, NULL::VARCHAR, NULL::TEXT, NULL::DECIMAL, NULL::BOOLEAN, NULL::INT, NULL::TEXT, 'ERROR: Item not found or access denied';
        RETURN;
    END IF;
    
    -- Update only provided fields
    UPDATE menu_items
    SET 
        name = COALESCE(NULLIF(TRIM(p_name), ''), name),
        description = COALESCE(p_description, description),
        price = COALESCE(p_price, price),
        available = COALESCE(p_available, available),
        preparation_time_minutes = COALESCE(p_prep_time, preparation_time_minutes),
        image_url = COALESCE(p_image_url, image_url)
    WHERE id = p_item_id;
    
    RETURN QUERY
    SELECT 
        mi.id,
        mi.name,
        mi.description,
        mi.price,
        mi.available,
        mi.preparation_time_minutes,
        mi.image_url,
        'SUCCESS: Item updated'::TEXT
    FROM menu_items mi
    WHERE mi.id = p_item_id;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN QUERY SELECT NULL::INTEGER, NULL::VARCHAR, NULL::TEXT, NULL::DECIMAL, NULL::BOOLEAN, NULL::INT, NULL::TEXT, ('ERROR: ' || SQLERRM)::TEXT;
END;
$$ LANGUAGE plpgsql;


-- Procedure 4: Delete Menu Item
CREATE OR REPLACE FUNCTION delete_menu_item(
    p_vendor_id INTEGER,
    p_menu_id INTEGER,
    p_item_id INTEGER
)
RETURNS TABLE(
    deleted_item_id INTEGER,
    deleted_item_name VARCHAR(200),
    status_message TEXT
) AS $$
DECLARE
    v_item_name VARCHAR(200);
BEGIN
    -- Verify ownership
    IF NOT vendor_owns_item(p_vendor_id, p_menu_id, p_item_id) THEN
        RETURN QUERY SELECT NULL::INTEGER, NULL::VARCHAR, 'ERROR: Item not found or access denied';
        RETURN;
    END IF;
    
    -- Get item name before deletion
    SELECT name INTO v_item_name FROM menu_items WHERE id = p_item_id;
    
    -- Delete item
    DELETE FROM menu_items WHERE id = p_item_id;
    
    RETURN QUERY SELECT p_item_id, v_item_name, 'SUCCESS: Item deleted'::TEXT;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN QUERY SELECT NULL::INTEGER, NULL::VARCHAR, ('ERROR: ' || SQLERRM)::TEXT;
END;
$$ LANGUAGE plpgsql;


-- Procedure 5: Update Order Status (NEW - For Vendor Order Management)
CREATE OR REPLACE FUNCTION update_order_status(
    p_vendor_id INTEGER,
    p_order_id INTEGER,
    p_new_status VARCHAR(20),
    p_estimated_ready_at TIMESTAMP DEFAULT NULL
)
RETURNS TABLE(
    order_id INTEGER,
    old_status VARCHAR(20),
    new_status VARCHAR(20),
    estimated_ready_at TIMESTAMP,
    status_message TEXT
) AS $$
DECLARE
    v_old_status VARCHAR(20);
    v_order RECORD;
BEGIN
    -- Verify vendor owns this order
    SELECT * INTO v_order FROM orders 
    WHERE id = p_order_id AND vendor_id = p_vendor_id;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT NULL::INTEGER, NULL::VARCHAR, NULL::VARCHAR, NULL::TIMESTAMP, 'ERROR: Order not found or access denied';
        RETURN;
    END IF;
    
    v_old_status := v_order.status;
    
    -- Validate status transition
    -- pending -> accepted -> preparing -> ready -> completed
    -- Any status can go to -> cancelled/rejected
    
    IF p_new_status NOT IN ('pending', 'accepted', 'preparing', 'ready', 'completed', 'cancelled', 'rejected') THEN
        RETURN QUERY SELECT NULL::INTEGER, NULL::VARCHAR, NULL::VARCHAR, NULL::TIMESTAMP, 'ERROR: Invalid status';
        RETURN;
    END IF;
    
    -- Update order status
    UPDATE orders
    SET 
        status = p_new_status,
        estimated_ready_at = COALESCE(p_estimated_ready_at, estimated_ready_at)
    WHERE id = p_order_id;
    
    RETURN QUERY 
    SELECT 
        o.id,
        v_old_status,
        o.status,
        o.estimated_ready_at,
        'SUCCESS: Order status updated'::TEXT
    FROM orders o
    WHERE o.id = p_order_id;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN QUERY SELECT NULL::INTEGER, NULL::VARCHAR, NULL::VARCHAR, NULL::TIMESTAMP, ('ERROR: ' || SQLERRM)::TEXT;
END;
$$ LANGUAGE plpgsql;


-- Procedure 6: Get Vendor Orders with Filters
CREATE OR REPLACE FUNCTION get_vendor_orders(
    p_vendor_id INTEGER,
    p_status VARCHAR(20) DEFAULT NULL,
    p_date_from TIMESTAMP DEFAULT NULL,
    p_date_to TIMESTAMP DEFAULT NULL,
    p_limit INTEGER DEFAULT 50
)
RETURNS TABLE(
    order_id INTEGER,
    customer_name VARCHAR(200),
    customer_email VARCHAR(320),
    customer_phone VARCHAR(20),
    placed_at TIMESTAMP,
    scheduled_for TIMESTAMP,
    total_amount DECIMAL(12,2),
    status VARCHAR(20),
    payment_status VARCHAR(20),
    pickup_or_delivery VARCHAR(20),
    notes TEXT,
    estimated_ready_at TIMESTAMP,
    items_count BIGINT,
    total_items_quantity NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        v.order_id,
        v.customer_name,
        v.customer_email,
        v.customer_phone,
        v.placed_at,
        v.scheduled_for,
        v.total_amount,
        v.status,
        v.payment_status,
        v.pickup_or_delivery,
        v.notes,
        v.estimated_ready_at,
        v.items_count,
        v.total_items_quantity
    FROM vendor_orders_view v
    WHERE v.vendor_id = p_vendor_id
    AND (p_status IS NULL OR v.status = p_status)
    AND (p_date_from IS NULL OR v.placed_at >= p_date_from)
    AND (p_date_to IS NULL OR v.placed_at <= p_date_to)
    ORDER BY v.placed_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;


-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Index on order status and vendor for faster filtering
CREATE INDEX IF NOT EXISTS idx_orders_vendor_status ON orders(vendor_id, status);

-- Index on order scheduled_for for date range queries
CREATE INDEX IF NOT EXISTS idx_orders_scheduled_for ON orders(scheduled_for);

-- Index on menu_items vendor_id for faster vendor queries
CREATE INDEX IF NOT EXISTS idx_menu_items_vendor_available ON menu_items(vendor_id, available);


-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Verify all functions exist
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN (
    'vendor_owns_menu',
    'vendor_owns_item',
    'get_vendor_order_count',
    'create_vendor_menu',
    'add_menu_item',
    'update_menu_item',
    'delete_menu_item',
    'update_order_status',
    'get_vendor_orders'
)
ORDER BY routine_name;

-- Verify all views exist
SELECT 
    table_name
FROM information_schema.views
WHERE table_schema = 'public'
AND table_name IN (
    'vendor_orders_view',
    'vendor_menu_items_stats',
    'vendor_revenue_analytics'
)
ORDER BY table_name;
