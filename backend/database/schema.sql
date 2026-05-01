-- 1. USERS TABLE
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(320) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('customer', 'vendor')),
    full_name VARCHAR(200),
    phone VARCHAR(20),
    is_email_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    last_login TIMESTAMP
);

-- 2. EMAIL VERIFICATIONS TABLE
CREATE TABLE email_verifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code VARCHAR(10) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 3. VENDORS TABLE
CREATE TABLE vendors (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    vendor_name VARCHAR(200) NOT NULL,
    location TEXT,
    pickup_available BOOLEAN DEFAULT TRUE,
    delivery_available BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 4. MENUS TABLE
CREATE TABLE menus (
    id SERIAL PRIMARY KEY,
    vendor_id INTEGER NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    title VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 5. MENU ITEMS TABLE
CREATE TABLE menu_items (
    id SERIAL PRIMARY KEY,
    menu_id INTEGER NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
    vendor_id INTEGER NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    available BOOLEAN DEFAULT TRUE,
    preparation_time_minutes INT DEFAULT 15,
    image_url TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 6. ORDERS TABLE
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    vendor_id INTEGER NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    placed_at TIMESTAMP DEFAULT NOW(),
    scheduled_for TIMESTAMP NOT NULL,
    total_amount DECIMAL(12,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'preparing', 'ready', 'completed', 'cancelled', 'rejected')),
    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed')),
    pickup_or_delivery VARCHAR(20) DEFAULT 'pickup' CHECK (pickup_or_delivery IN ('pickup', 'delivery')),
    notes TEXT,
    estimated_ready_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 7. ORDER ITEMS TABLE
CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    menu_item_id INTEGER REFERENCES menu_items(id) ON DELETE SET NULL,
    name_snapshot VARCHAR(200) NOT NULL,
    price_snapshot DECIMAL(10,2) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    notes TEXT
);

-- 8. NOTIFICATIONS TABLE
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    payload JSONB,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 9. VENDOR ANALYTICS EVENTS TABLE
CREATE TABLE vendor_analytics_events (
    id BIGSERIAL PRIMARY KEY,
    vendor_id INTEGER NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    meta JSONB,
    event_time TIMESTAMP DEFAULT NOW()
);


CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_vendors_user_id ON vendors(user_id);
CREATE INDEX idx_menus_vendor_id ON menus(vendor_id);
CREATE INDEX idx_menu_items_vendor_id ON menu_items(vendor_id);
CREATE INDEX idx_menu_items_menu_id ON menu_items(menu_id);
CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_orders_vendor_id ON orders(vendor_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_vendor_analytics_vendor_id ON vendor_analytics_events(vendor_id);

-- Making vendor_id UNIQUE so each vendor can only have ONE menu
ALTER TABLE menus ADD CONSTRAINT unique_vendor_menu UNIQUE (vendor_id);
