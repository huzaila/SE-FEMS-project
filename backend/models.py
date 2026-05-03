"""
FEMS db models
this file defines all database tables as classes basically showing howpython classes map to database tables
"""

from flask_sqlalchemy import SQLAlchemy #for connecting to the db
from datetime import datetime, timezone #for timestamps

#creating db connection obj that all db models will be using to connect with db
#db=SQLAlchemy()
from .extensions import db

#USER TABLE
class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(320), unique=True, nullable=False)
    password_hash = db.Column(db.Text, nullable=False)
    role = db.Column(db.String(20), nullable=False)  # 'customer' or 'vendor'
    full_name = db.Column(db.String(200))
    phone = db.Column(db.String(20))
    is_email_verified = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    last_login = db.Column(db.DateTime)
    
    #relationships with other tables
    vendor_profile = db.relationship('Vendor', backref='user', uselist=False, cascade='all, delete-orphan')
    orders = db.relationship('Order', foreign_keys='Order.customer_id', backref='customer', lazy=True)
    email_verifications = db.relationship('EmailVerification', backref='user', lazy=True, cascade='all, delete-orphan')
    notifications = db.relationship('Notification', backref='user', lazy=True, cascade='all, delete-orphan')
    
    def to_dict(self):
        #converting user object to dict for JSON responses
        return {
            'id': self.id,
            'email': self.email,
            'role': self.role,
            'full_name': self.full_name,
            'phone': self.phone,
            'is_email_verified': self.is_email_verified,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
        
#EMAIL VERIFICATIONS TABLE
class EmailVerification(db.Model):
    __tablename__ = 'email_verifications'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    code = db.Column(db.String(10), nullable=False)
    expires_at = db.Column(db.DateTime, nullable=False)
    is_used = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    
    # Relationship - not need of dup
    #user = db.relationship('User', backref='verification_codes')
    

#VENDOR TABLE
class Vendor(db.Model): #db.model means this class is a db table
    __tablename__ = 'vendors'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), unique=True, nullable=False)
    vendor_name = db.Column(db.String(200), nullable=False)
    location = db.Column(db.Text)
    pickup_available = db.Column(db.Boolean, default=True)
    delivery_available = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    
    # Relationships
    menu = db.relationship('Menu', backref='vendor', uselist=False, cascade='all, delete-orphan')#vendor deleted -> menu deleted 
    menu_items = db.relationship('MenuItem', backref='vendor', lazy=True, cascade='all, delete-orphan')
    orders = db.relationship('Order', foreign_keys='Order.vendor_id', backref='vendor', lazy=True) #lazy =true means accessed when needed
    analytics_events = db.relationship('VendorAnalyticsEvent', backref='vendor', lazy=True, cascade='all, delete-orphan')
    
    def to_dict(self):
        return {
            'id': self.id,
            'vendor_name': self.vendor_name,
            'location': self.location,
            'pickup_available': self.pickup_available,
            'delivery_available': self.delivery_available,
            'menu': self.menu.to_dict() if self.menu else None  
        }
        
#MENU TABLE
class Menu(db.Model):
    __tablename__ = 'menus'
    
    id = db.Column(db.Integer, primary_key=True)
    vendor_id = db.Column(db.Integer, db.ForeignKey('vendors.id', ondelete='CASCADE'), unique=True,nullable=False)
    title = db.Column(db.String(100), nullable=False)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    
    # Relationships
    menu_items = db.relationship('MenuItem', backref='menu', lazy=True, cascade='all, delete-orphan')
    
    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'is_active': self.is_active,
            'items': [item.to_dict() for item in self.menu_items]
        }

#MENU ITEMS TABLE
class MenuItem(db.Model):
    __tablename__ = 'menu_items'
    
    id = db.Column(db.Integer, primary_key=True)
    menu_id = db.Column(db.Integer, db.ForeignKey('menus.id', ondelete='CASCADE'), nullable=False)
    vendor_id = db.Column(db.Integer, db.ForeignKey('vendors.id', ondelete='CASCADE'), nullable=False)
    name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    price = db.Column(db.Numeric(10, 2), nullable=False)
    available = db.Column(db.Boolean, default=True)
    preparation_time_minutes = db.Column(db.Integer, default=15)
    image_url = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    
    #relationships
    order_items = db.relationship('OrderItem', backref='menu_item', lazy=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'price': float(self.price),
            'available': self.available,
            'preparation_time_minutes': self.preparation_time_minutes,
            'image_url': self.image_url
        }
        

#ORDERS TABLE
class Order(db.Model):
    __tablename__ = 'orders'
    
    id = db.Column(db.Integer, primary_key=True)
    customer_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'))
    vendor_id = db.Column(db.Integer, db.ForeignKey('vendors.id', ondelete='CASCADE'), nullable=False)
    placed_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    scheduled_for = db.Column(db.DateTime, nullable=False)
    total_amount = db.Column(db.Numeric(12, 2), nullable=False)
    status = db.Column(db.String(20), default='pending')  # pending, accepted, preparing, ready, completed, cancelled, rejected
    payment_status = db.Column(db.String(20), default='pending')  # pending, paid, failed
    pickup_or_delivery = db.Column(db.String(20), default='pickup')
    notes = db.Column(db.Text)
    estimated_ready_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    
    # Relationships
    order_items = db.relationship('OrderItem', backref='order', lazy=True, cascade='all, delete-orphan')
    
    def to_dict(self):
        return {
            'id': self.id,
            'customer_id': self.customer_id,
            'vendor_id': self.vendor_id,
            'placed_at': self.placed_at.isoformat() if self.placed_at else None,
            'scheduled_for': self.scheduled_for.isoformat() if self.scheduled_for else None,
            'total_amount': float(self.total_amount),
            'status': self.status,
            'payment_status': self.payment_status,
            'pickup_or_delivery': self.pickup_or_delivery,
            'notes': self.notes,
            'items': [item.to_dict() for item in self.order_items]
        }

#ORDER ITEMS TABLE 
class OrderItem(db.Model):
    __tablename__ = 'order_items'
    
    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey('orders.id', ondelete='CASCADE'), nullable=False)
    menu_item_id = db.Column(db.Integer, db.ForeignKey('menu_items.id', ondelete='SET NULL'))
    name_snapshot = db.Column(db.String(200), nullable=False)
    price_snapshot = db.Column(db.Numeric(10, 2), nullable=False)
    quantity = db.Column(db.Integer, nullable=False, default=1)
    notes = db.Column(db.Text)
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name_snapshot,
            'price': float(self.price_snapshot),
            'quantity': self.quantity,
            'notes': self.notes
        }
        
#NOTIFICATION TABLE 
class Notification(db.Model):
    __tablename__ = 'notifications'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    type = db.Column(db.String(50), nullable=False)
    payload = db.Column(db.JSON)
    is_read = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    
    #relationship - no need of dup
    #user = db.relationship('User', backref='notifications')

#VENDOR ANALYTICS TABLE
class VendorAnalyticsEvent(db.Model):
    __tablename__ = 'vendor_analytics_events'
    
    id = db.Column(db.BigInteger, primary_key=True)
    vendor_id = db.Column(db.Integer, db.ForeignKey('vendors.id', ondelete='CASCADE'), nullable=False)
    event_type = db.Column(db.String(50), nullable=False)
    meta = db.Column(db.JSON)
    event_time = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    
    # Relationship - no need of dup
    #vendor = db.relationship('Vendor', backref='analytics_events')
    
    def to_dict(self):
        return {
            'id': self.id,
            'vendor_id': self.vendor_id,
            'event_type': self.event_type,
            'meta': self.meta,
            'event_time': self.event_time.isoformat() if self.event_time else None
        }