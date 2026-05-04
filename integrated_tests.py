"""
FEMS Complete System Integration Test
Tests both VENDOR and CUSTOMER flows with new test inputs
"""

import requests
from datetime import datetime, timedelta

BASE_URL = "http://127.0.0.1:5000"

# ANSI Colors
GREEN = "\033[92m"
RED = "\033[91m"
BLUE = "\033[94m"
CYAN = "\033[96m"
MAGENTA = "\033[95m"
RESET = "\033[0m"


def print_section(title, color=BLUE):
    print(f"\n{color}{'='*80}")
    print(f"  {title}")
    print(f"{'='*80}{RESET}\n")


def print_success(msg):
    print(f"{GREEN}✓ {msg}{RESET}")


def print_error(msg):
    print(f"{RED}✗ {msg}{RESET}")


def print_info(msg):
    print(f"{CYAN}➤ {msg}{RESET}")


# ============================================================================ #
# VENDOR FLOW
# ============================================================================ #

def create_vendor():
    """Create a new vendor and set up a menu with items"""
    print_section("🏪 VENDOR SETUP", MAGENTA)

    # 1. Register Vendor
    print_info("Registering vendor...")
    response = requests.post(f"{BASE_URL}/api/register", json={
        "email": "gourmet@example.com",
        "password": "gourmet"
    })
    data = response.json()
    if response.status_code != 201:
        print_error(f"Registration failed: {data}")
        return None
    print_success("Vendor registered")
    verification_code = data["verification_code"]

    # 2. Verify Email
    print_info("Verifying email...")
    response = requests.post(f"{BASE_URL}/api/verify-email", json={
        "email": "gourmet@example.com",
        "code": verification_code
    })
    if response.status_code != 200:
        print_error("Email verification failed")
        return None
    print_success("Email verified")

    # 3. Login
    print_info("Logging in...")
    response = requests.post(f"{BASE_URL}/api/login", json={
        "email": "gourmet@example.com",
        "password": "gourmet"
    })
    data = response.json()
    if response.status_code != 200:
        print_error("Login failed")
        return None
    vendor_token = data["token"]
    print_success("Vendor logged in")

    # 4. Complete Profile
    print_info("Completing vendor profile...")
    response = requests.post(f"{BASE_URL}/api/complete-profile",
        headers={"Authorization": f"Bearer {vendor_token}"},
        json={
            "full_name": "Gourmet Kitchen Owner",
            "phone": "1112223333",
            "role": "vendor",
            "vendor_name": "Gourmet Kitchen",
            "location": "City Center Street"
        }
    )
    data = response.json()
    if response.status_code != 200:
        print_error("Profile completion failed")
        return None
    vendor_id = data["vendor"]["id"]
    print_success(f"Vendor profile created (ID: {vendor_id})")

    # 5. Create Menu
    print_info("Creating menu...")
    response = requests.post(f"{BASE_URL}/api/vendors/{vendor_id}/menu",
        headers={"Authorization": f"Bearer {vendor_token}"},
        json={"title": "Gourmet Menu"}
    )
    data = response.json()
    if response.status_code != 201:
        print_error("Menu creation failed")
        return None
    menu_id = data["menu"]["id"]
    print_success(f"Menu created (ID: {menu_id})")

    # 6. Add Menu Items
    print_info("Adding menu items...")
    response = requests.post(
        f"{BASE_URL}/api/vendors/{vendor_id}/menu/{menu_id}/items",
        headers={"Authorization": f"Bearer {vendor_token}"},
        json=[
            {
                "name": "Truffle Pasta",
                "price": 25.50,
                "description": "Creamy truffle sauce pasta",
                "available": True,
                "preparation_time_minutes": 30
            },
            {
                "name": "Steak Deluxe",
                "price": 45.00,
                "description": "Grilled steak with sides",
                "available": True,
                "preparation_time_minutes": 40
            },
            {
                "name": "Lemonade",
                "price": 5.00,
                "description": "Fresh lemonade",
                "available": True,
                "preparation_time_minutes": 5
            }
        ]
    )
    data = response.json()
    if response.status_code != 201:
        print_error("Adding menu items failed")
        return None
    print_success(f"Added {len(data['items'])} menu items")

    print_section("✅ VENDOR SETUP COMPLETE", GREEN)
    return {
        "vendor_id": vendor_id,
        "menu_id": menu_id,
        "token": vendor_token,
        "items": data["items"]
    }


# ============================================================================ #
# CUSTOMER FLOW
# ============================================================================ #

def create_customer_and_order(vendor_info):
    """Create a customer and place an order"""
    print_section("👤 CUSTOMER FLOW", CYAN)

    # 1. Register Customer
    print_info("Registering customer...")
    response = requests.post(f"{BASE_URL}/api/register", json={
        "email": "ali_customer@example.com",
        "password": "alice123"
    })
    data = response.json()
    if response.status_code != 201:
        print_error(f"Registration failed: {data}")
        return None
    print_success("Customer registered")
    verification_code = data["verification_code"]

    # 2. Verify Email
    print_info("Verifying email...")
    response = requests.post(f"{BASE_URL}/api/verify-email", json={
        "email": "ali_customer@example.com",
        "code": verification_code
    })
    if response.status_code != 200:
        print_error("Email verification failed")
        return None
    print_success("Email verified")

    # 3. Login
    print_info("Logging in...")
    response = requests.post(f"{BASE_URL}/api/login", json={
        "email": "ali_customer@example.com",
        "password": "alice123"
    })
    data = response.json()
    if response.status_code != 200:
        print_error("Login failed")
        return None
    customer_token = data["token"]
    customer_id = data["user"]["id"]
    print_success("Customer logged in")

    # 4. Complete profile
    print_info("Completing customer profile...")
    response = requests.post(f"{BASE_URL}/api/complete-profile",
        headers={"Authorization": f"Bearer {customer_token}"},
        json={
            "full_name": "Ali Customer",
            "phone": "9998887777",
            "role": "customer"
        }
    )
    if response.status_code != 200:
        print_error("Profile completion failed")
        return None
    print_success("Customer profile completed")

    # 5. Place Order
    print_info("Placing order...")
    pickup_time = (datetime.utcnow() + timedelta(hours=2)).isoformat()
    item_ids = [item["id"] for item in vendor_info["items"][:2]]  # first 2 items

    response = requests.post(f"{BASE_URL}/api/customer/orders",
        headers={"Authorization": f"Bearer {customer_token}"},
        json={
            "vendor_id": vendor_info["vendor_id"],
            "pickup_time": pickup_time,
            "pickup_or_delivery": "pickup",
            "order_notes": "Please add extra forks",
            "items": [
                {"menu_item_id": item_ids[0], "quantity": 2},
                {"menu_item_id": item_ids[1], "quantity": 1}
            ]
        }
    )
    data = response.json()
    if response.status_code != 201:
        print_error(f"Order placement failed: {data}")
        return None

    order_id = data["order"]["order_id"]
    total = data["order"]["total_amount"]
    print_success(f"Order placed successfully! Order ID: {order_id}, Total: ${total}")

    return {
        "customer_id": customer_id,
        "token": customer_token,
        "order_id": order_id
    }


# ============================================================================ #
# MAIN TEST
# ============================================================================ #

def main():
    print_section("🚀 FEMS COMPLETE SYSTEM INTEGRATION TEST", BLUE)

    # Test server health
    print_info("Checking server connection...")
    response = requests.get(f"{BASE_URL}/api/health")
    if response.status_code != 200:
        print_error("Server health check failed")
        return
    print_success("Server is healthy")

    # Vendor flow
    vendor_info = create_vendor()
    if not vendor_info:
        print_error("Vendor setup failed")
        return

    # Customer flow
    customer_info = create_customer_and_order(vendor_info)
    if not customer_info:
        print_error("Customer flow failed")
        return

    # Final summary
    print_section("📊 TEST SUMMARY", GREEN)
    print_success("All tests executed successfully!")
    print(f"Vendor ID: {vendor_info['vendor_id']}")
    print(f"Customer ID: {customer_info['customer_id']}")
    print(f"Order ID: {customer_info['order_id']}")


if __name__ == "__main__":
    main()
