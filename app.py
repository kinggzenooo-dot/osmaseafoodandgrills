"""
Osman's Seafoods and Grill — Flask REST Backend & Static Server
Provides full API endpoints for:
- User Authentication (Register, Login, Staff PIN Login, Session, Role Management)
- Menu & Category Management (CRUD)
- Order Lifecycle (Creation, Status, Audit, Filtering)
- Inventory Control (Real-time stock, threshold alerts)
- Staff Management
- Table Reservations
- System Settings & Analytics
- Frontend static asset serving
"""

import os
import sqlite3
import json
import hashlib
import hmac
import time
from datetime import datetime
from functools import wraps
from flask import Flask, request, jsonify, send_from_directory, g
from flask_cors import CORS

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "osman_restaurant.db")
SECRET_KEY = os.environ.get("SECRET_KEY", "osman-flame-seafood-secret-key-2026")

app = Flask(__name__, static_folder=BASE_DIR, static_url_path="")
CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=True)

# --------------------------------------------------------------------------
# Database Helpers
# --------------------------------------------------------------------------
def get_db():
    if "db" not in g:
        g.db = sqlite3.connect(DB_PATH)
        g.db.row_factory = sqlite3.Row
    return g.db

@app.teardown_appcontext
def close_db(error):
    db = g.pop("db", None)
    if db is not None:
        db.close()

def hash_password(password: str) -> str:
    salt = "osman_salt_flame_2026"
    return hashlib.sha256(f"{salt}{password}".encode("utf-8")).hexdigest()

def verify_password(password: str, hashed: str) -> bool:
    return hmac.compare_digest(hash_password(password), hashed)

def generate_token(user_id: str, role: str) -> str:
    timestamp = str(int(time.time()))
    payload = f"{user_id}:{role}:{timestamp}"
    signature = hmac.new(SECRET_KEY.encode(), payload.encode(), hashlib.sha256).hexdigest()
    return f"{payload}:{signature}"

def verify_token(token: str):
    try:
        parts = token.split(":")
        if len(parts) != 4:
            return None
        user_id, role, timestamp, sig = parts
        expected = hmac.new(SECRET_KEY.encode(), f"{user_id}:{role}:{timestamp}".encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(sig, expected):
            return None
        # Valid for 7 days
        if int(time.time()) - int(timestamp) > 7 * 86400:
            return None
        return {"user_id": user_id, "role": role}
    except Exception:
        return None

def auth_required(roles=None):
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            auth_header = request.headers.get("Authorization", "")
            token = None
            if auth_header.startswith("Bearer "):
                token = auth_header.split(" ", 1)[1]
            elif request.cookies.get("auth_token"):
                token = request.cookies.get("auth_token")

            if not token:
                return jsonify({"success": False, "error": "Authentication required"}), 401

            payload = verify_token(token)
            if not payload:
                return jsonify({"success": False, "error": "Invalid or expired token"}), 401

            if roles and payload["role"] not in roles:
                return jsonify({"success": False, "error": "Unauthorized role for this resource"}), 403

            g.current_user = payload
            return f(*args, **kwargs)
        return decorated
    return decorator

# --------------------------------------------------------------------------
# Database Initialization & Seeding
# --------------------------------------------------------------------------
def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Users Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'customer',
        subrole TEXT DEFAULT '',
        pin TEXT DEFAULT '',
        phone TEXT DEFAULT '',
        avatar TEXT DEFAULT '',
        created_at TEXT NOT NULL
    )
    """)

    # Menu Items Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS menu_items (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        price REAL NOT NULL,
        image TEXT NOT NULL,
        description TEXT NOT NULL,
        prep_time INTEGER NOT NULL DEFAULT 15,
        spice_level TEXT NOT NULL DEFAULT 'None',
        tags TEXT DEFAULT '[]',
        available INTEGER NOT NULL DEFAULT 1,
        options_json TEXT DEFAULT '{}'
    )
    """)

    # Categories Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        icon TEXT NOT NULL,
        slug TEXT NOT NULL
    )
    """)

    # Inventory Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS inventory (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        unit TEXT NOT NULL,
        stock REAL NOT NULL,
        alert_threshold REAL NOT NULL,
        cost_per_unit REAL NOT NULL
    )
    """)

    # Orders Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        created_at TEXT NOT NULL,
        customer_name TEXT NOT NULL,
        customer_phone TEXT NOT NULL,
        order_type TEXT NOT NULL,
        delivery_address TEXT DEFAULT '',
        table_number TEXT DEFAULT '',
        pickup_time TEXT DEFAULT '',
        items_json TEXT NOT NULL,
        subtotal REAL NOT NULL,
        tax REAL NOT NULL,
        delivery_fee REAL NOT NULL,
        discount REAL NOT NULL,
        total REAL NOT NULL,
        payment_method TEXT NOT NULL,
        payment_status TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'Pending',
        assigned_driver TEXT DEFAULT '',
        notes TEXT DEFAULT '',
        user_id TEXT DEFAULT ''
    )
    """)

    # Reservations Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS reservations (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        date TEXT NOT NULL,
        time TEXT NOT NULL,
        guests INTEGER NOT NULL,
        seating TEXT NOT NULL,
        notes TEXT DEFAULT '',
        status TEXT NOT NULL DEFAULT 'Confirmed',
        created_at TEXT NOT NULL
    )
    """)

    # Settings Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
    )
    """)

    conn.commit()

    # Seed Default Users if none exist
    cursor.execute("SELECT COUNT(*) FROM users")
    if cursor.fetchone()[0] == 0:
        seed_users = [
            ("usr-admin", "Osman Al-Mansoor", "admin@osmanseafoods.com", hash_password("admin123"), "admin", "owner", "1001", "+1 (555) 382-7626", "https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&w=200&q=80", datetime.utcnow().isoformat()),
            ("usr-cashier", "Maria Santos", "cashier@osmanseafoods.com", hash_password("staff123"), "staff", "cashier", "2002", "+1 (555) 018-4921", "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=200&q=80", datetime.utcnow().isoformat()),
            ("usr-chef", "Carlos Rivera", "chef@osmanseafoods.com", hash_password("chef123"), "staff", "kds", "3003", "+1 (555) 017-7382", "https://images.unsplash.com/photo-1583394293214-28ded15ee548?auto=format&fit=crop&w=200&q=80", datetime.utcnow().isoformat()),
            ("usr-driver", "David Vance", "driver@osmanseafoods.com", hash_password("driver123"), "staff", "dispatch", "4004", "+1 (555) 016-3910", "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80", datetime.utcnow().isoformat()),
            ("usr-customer", "Elena Rostova", "customer@gmail.com", hash_password("customer123"), "customer", "", "", "+1 (555) 948-2019", "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80", datetime.utcnow().isoformat())
        ]
        cursor.executemany("INSERT INTO users VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", seed_users)
        conn.commit()

    # Seed Default Menu Items if none exist
    cursor.execute("SELECT COUNT(*) FROM menu_items")
    if cursor.fetchone()[0] == 0:
        seed_menu = [
            ("menu-1", "Grand Seafood Bucket", "Seafood Buckets", 68.00, "https://images.unsplash.com/photo-1559737194-67e3c1a84f37?auto=format&fit=crop&w=800&q=80", "Whole Atlantic Lobster, Jumbo Tiger Prawns, Snow Crab Legs, Sweet Corn, and Smoked Sausage tossed in signature Cajun Garlic Butter.", 25, "Fiery", json.dumps(["Chef Special", "Popular", "Shellfish"]), 1, json.dumps({"spiceLevels": ["Mild Butter", "Medium Cajun", "Fiery Ember"], "sauces": ["Signature Garlic Butter", "Lemon Herb Infusion", "Smoky Cajun Craze"], "sides": ["Garlic Butter Toast", "Steamed Jasmine Rice", "Cajun Fries"]})),
            ("menu-2", "Char-Grilled Lobster Tail", "Flame Grill", 42.00, "https://images.unsplash.com/photo-1551248429-40975aa4de74?auto=format&fit=crop&w=800&q=80", "Wood-fired 10oz Atlantic Lobster Tail basted with lemon garlic herb butter, served with grilled asparagus and charred lemon.", 20, "Mild", json.dumps(["Chef Special", "Gluten-Free"]), 1, json.dumps({"spiceLevels": ["Mild", "Spicy Glaze"], "sauces": ["Garlic Herb Butter", "Truffle Mayo"], "sides": ["Grilled Asparagus", "Truffle Fries"]})),
            ("menu-3", "Flame-Kissed Prime Ribeye", "Flame Grill", 38.00, "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80", "14oz Prime Angus Ribeye seared over white oak charcoal, finished with chimichurri butter and smoked sea salt.", 22, "None", json.dumps(["Flame Grill", "Customer Favorite"]), 1, json.dumps({"doneness": ["Rare", "Medium Rare", "Medium", "Medium Well", "Well Done"], "sauces": ["Fresh Chimichurri", "Red Wine Demiglace", "Peppercorn Cream"], "sides": ["Mashed Potatoes", "Charred Vegetables"]})),
            ("menu-4", "Jumbo Tiger Prawn Skewers", "Flame Grill", 26.00, "https://images.unsplash.com/photo-1535400255456-984241443b29?auto=format&fit=crop&w=800&q=80", "Four marinated jumbo prawns threaded on rosemary skewers, char-broiled with citrus chili glaze and cilantro.", 15, "Medium", json.dumps(["Flame Grill", "Gluten-Free"]), 1, json.dumps({"spiceLevels": ["Mild Citrus", "Medium Chili", "Extra Hot"], "sauces": ["Chipotle Aioli", "Cilantro Lime"], "sides": ["Coconut Rice", "House Salad"]})),
            ("menu-5", "Osman's Signature Crab Cakes", "Starters", 22.00, "https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?auto=format&fit=crop&w=800&q=80", "Pan-seared jumbo lump blue crab cakes with Old Bay seasoning, microgreens, and house-made tartar sauce.", 12, "Mild", json.dumps(["Chef Special", "Starters"]), 1, json.dumps({"sauces": ["Zesty Tartar Sauce", "Spicy Remoulade"]})),
            ("menu-6", "Crispy Calamari Rings", "Starters", 16.00, "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=800&q=80", "Lightly seasoned crispy tender squid rings served with smoked paprika aioli and charred lemon wedges.", 10, "None", json.dumps(["Starters", "Popular"]), 1, json.dumps({})),
            ("menu-7", "Wood-Fired Wild Salmon", "Fresh Catch", 32.00, "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=800&q=80", "Fresh Pacific king salmon roasted cedar-plank style over coals with Dijon dill glaze and honey blistered tomatoes.", 18, "None", json.dumps(["Fresh Catch", "Healthy Choice"]), 1, json.dumps({})),
            ("menu-8", "Whole Mediterranean Sea Bass", "Fresh Catch", 36.00, "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=800&q=80", "Charcoal roasted Mediterranean branzino stuffed with wild thyme, garlic cloves, and extra virgin olive oil.", 25, "None", json.dumps(["Fresh Catch", "Gluten-Free"]), 1, json.dumps({})),
            ("menu-9", "Charred Butter Corn on the Cob", "Sides & Dips", 6.50, "https://images.unsplash.com/photo-1551754655-cd27e38d2076?auto=format&fit=crop&w=800&q=80", "Sweet summer corn charred on the grill, coated in cotija cheese, chili lime salt, and cilantro crema.", 8, "Mild", json.dumps(["Sides", "Vegetarian"]), 1, json.dumps({})),
            ("menu-10", "Truffle Parmesan Fries", "Sides & Dips", 9.50, "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=800&q=80", "Double-cooked crispy skin fries tossed in black truffle oil, aged parmesan reggiano, and rosemary sea salt.", 8, "None", json.dumps(["Sides", "Customer Favorite"]), 1, json.dumps({})),
            ("menu-11", "Ocean Breeze Craft Cocktail", "Drinks", 12.00, "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=800&q=80", "Blue curacao, artisan botanical gin, fresh pressed lime, elderflower tonic, served over crystalline ice sphere.", 5, "None", json.dumps(["Signature Drink"]), 1, json.dumps({"type": ["Alcoholic", "Non-Alcoholic Mocktail"]})),
            ("menu-12", "Classic Key Lime Pie", "Desserts", 10.00, "https://images.unsplash.com/photo-1535141192574-5d4897c13136?auto=format&fit=crop&w=800&q=80", "Authentic Key lime custard on a buttery graham cracker crust, topped with handmade vanilla whipped cream.", 5, "None", json.dumps(["Dessert", "Sweet Finish"]), 1, json.dumps({}))
        ]
        cursor.executemany("INSERT INTO menu_items VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", seed_menu)
        conn.commit()

    # Seed Categories
    cursor.execute("SELECT COUNT(*) FROM categories")
    if cursor.fetchone()[0] == 0:
        seed_cats = [
            ("cat-1", "Seafood Buckets", "anchor", "seafood-buckets"),
            ("cat-2", "Flame Grill", "flame", "flame-grill"),
            ("cat-3", "Fresh Catch", "fish", "fresh-catch"),
            ("cat-4", "Starters", "utensils", "starters"),
            ("cat-5", "Sides & Dips", "sparkles", "sides-dips"),
            ("cat-6", "Drinks", "wine", "drinks"),
            ("cat-7", "Desserts", "cake", "desserts")
        ]
        cursor.executemany("INSERT INTO categories VALUES (?, ?, ?, ?)", seed_cats)
        conn.commit()

    # Seed Inventory
    cursor.execute("SELECT COUNT(*) FROM inventory")
    if cursor.fetchone()[0] == 0:
        seed_inv = [
            ("inv-1", "Atlantic Lobster Tails", "Seafood", "lbs", 45.0, 15.0, 18.50),
            ("inv-2", "Jumbo Tiger Prawns", "Seafood", "lbs", 60.0, 20.0, 12.00),
            ("inv-3", "Prime Angus Ribeye Cuts", "Meat", "lbs", 35.0, 10.0, 16.00),
            ("inv-4", "Wild Salmon Fillets", "Seafood", "lbs", 28.0, 10.0, 11.50),
            ("inv-5", "Lump Blue Crab Meat", "Seafood", "lbs", 12.0, 15.0, 22.00),
            ("inv-6", "Cajun Garlic Butter Sauce", "Pantry", "quarts", 30.0, 8.0, 4.50),
            ("inv-7", "Oak Wood Charcoal", "Supplies", "bags", 18.0, 5.0, 14.00)
        ]
        cursor.executemany("INSERT INTO inventory VALUES (?, ?, ?, ?, ?, ?, ?)", seed_inv)
        conn.commit()

    # Seed Default Orders
    cursor.execute("SELECT COUNT(*) FROM orders")
    if cursor.fetchone()[0] == 0:
        seed_orders = [
            (
                "OSM-8941",
                datetime.utcnow().isoformat(),
                "Elena Rostova",
                "+1 (555) 948-2019",
                "Delivery",
                "450 Harbor View Ave, Apt 3B",
                "",
                "",
                json.dumps([
                    {"id": "menu-1", "name": "Grand Seafood Bucket", "price": 68.00, "quantity": 1, "customization": "Spice: Fiery Ember | Sauce: Signature Garlic Butter | Side: Garlic Butter Toast"},
                    {"id": "menu-11", "name": "Ocean Breeze Craft Cocktail", "price": 12.00, "quantity": 2, "customization": "Alcoholic"}
                ]),
                92.00, 7.36, 0.00, 0.00, 99.36,
                "Credit Card", "Paid", "Ready", "David Vance", "Please ring bell upon arrival.", "usr-customer"
            ),
            (
                "OSM-8942",
                datetime.utcnow().isoformat(),
                "Marcus Thorne",
                "+1 (555) 773-1044",
                "Dine-In",
                "",
                "Table 04",
                "",
                json.dumps([
                    {"id": "menu-2", "name": "Char-Grilled Lobster Tail", "price": 42.00, "quantity": 2, "customization": "Spice: Mild | Sauce: Garlic Herb Butter | Side: Truffle Fries"},
                    {"id": "menu-10", "name": "Truffle Parmesan Fries", "price": 9.50, "quantity": 1, "customization": ""}
                ]),
                93.50, 7.48, 0.00, 9.35, 91.63,
                "GCash / Digital Wallet", "Paid", "Preparing", "", "Extra napkins requested.", ""
            )
        ]
        cursor.executemany("INSERT INTO orders VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", seed_orders)
        conn.commit()

    # Seed Default Settings
    cursor.execute("SELECT COUNT(*) FROM settings")
    if cursor.fetchone()[0] == 0:
        default_settings = {
            "restaurantName": "Osman's Seafoods and Grill",
            "tagline": "Where Oceanic Catch Meets Flame Grill Mastery",
            "address": "742 Coastal Boulevard, Harbor Bay, CA 90210",
            "phone": "+1 (555) 382-7626",
            "email": "contact@osmanseafoods.com",
            "taxRate": "8.0",
            "deliveryFee": "4.99",
            "freeDeliveryThreshold": "60.00",
            "currencySymbol": "$",
            "openingHours": "Mon-Sun: 11:00 AM - 10:30 PM",
            "acceptingOrders": "true"
        }
        for k, v in default_settings.items():
            cursor.execute("INSERT OR REPLACE INTO settings VALUES (?, ?)", (k, v))
        conn.commit()

    conn.close()

# --------------------------------------------------------------------------
# API Routes: Authentication & Users
# --------------------------------------------------------------------------
@app.route("/api/health", methods=["GET"])
def health_check():
    return jsonify({
        "status": "healthy",
        "service": "Osman Seafoods and Grill API",
        "timestamp": datetime.utcnow().isoformat(),
        "database": "connected"
    })

@app.route("/api/auth/register", methods=["POST"])
def auth_register():
    data = request.get_json() or {}
    name = data.get("name", "").strip()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")
    phone = data.get("phone", "").strip()
    role = data.get("role", "customer").lower()
    subrole = data.get("subrole", "").lower()
    pin = data.get("pin", "").strip()

    if not name or not email or not password:
        return jsonify({"success": False, "error": "Name, email, and password are required"}), 400

    if role not in ["customer", "staff", "admin"]:
        role = "customer"

    db = get_db()
    cursor = db.cursor()
    cursor.execute("SELECT id FROM users WHERE email = ?", (email,))
    if cursor.fetchone():
        return jsonify({"success": False, "error": "Email is already registered"}), 409

    user_id = f"usr-{int(time.time() * 1000)}"
    password_hash = hash_password(password)
    now = datetime.utcnow().isoformat()
    avatar = f"https://api.dicebear.com/7.x/initials/svg?seed={name}"

    cursor.execute(
        "INSERT INTO users (id, name, email, password_hash, role, subrole, pin, phone, avatar, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        (user_id, name, email, password_hash, role, subrole, pin, phone, avatar, now)
    )
    db.commit()

    token = generate_token(user_id, role)
    user_data = {
        "id": user_id,
        "name": name,
        "email": email,
        "role": role,
        "subrole": subrole,
        "phone": phone,
        "avatar": avatar
    }

    return jsonify({
        "success": True,
        "message": "Registration successful",
        "user": user_data,
        "token": token
    }), 201

@app.route("/api/auth/login", methods=["POST"])
def auth_login():
    data = request.get_json() or {}
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    if not email or not password:
        return jsonify({"success": False, "error": "Email and password are required"}), 400

    db = get_db()
    cursor = db.cursor()
    cursor.execute("SELECT * FROM users WHERE email = ?", (email,))
    user = cursor.fetchone()

    if not user or not verify_password(password, user["password_hash"]):
        return jsonify({"success": False, "error": "Invalid email or password"}), 401

    token = generate_token(user["id"], user["role"])
    user_data = {
        "id": user["id"],
        "name": user["name"],
        "email": user["email"],
        "role": user["role"],
        "subrole": user["subrole"],
        "pin": user["pin"],
        "phone": user["phone"],
        "avatar": user["avatar"]
    }

    return jsonify({
        "success": True,
        "message": f"Welcome back, {user['name']}!",
        "user": user_data,
        "token": token
    })

@app.route("/api/auth/pin-login", methods=["POST"])
def auth_pin_login():
    data = request.get_json() or {}
    pin = str(data.get("pin", "")).strip()

    if not pin or len(pin) != 4:
        return jsonify({"success": False, "error": "Valid 4-digit PIN is required"}), 400

    db = get_db()
    cursor = db.cursor()
    cursor.execute("SELECT * FROM users WHERE pin = ? AND (role = 'staff' OR role = 'admin')", (pin,))
    user = cursor.fetchone()

    if not user:
        return jsonify({"success": False, "error": "Unrecognized Staff PIN"}), 401

    token = generate_token(user["id"], user["role"])
    user_data = {
        "id": user["id"],
        "name": user["name"],
        "email": user["email"],
        "role": user["role"],
        "subrole": user["subrole"],
        "phone": user["phone"],
        "avatar": user["avatar"]
    }

    return jsonify({
        "success": True,
        "message": f"Terminal unlocked for {user['name']}",
        "user": user_data,
        "token": token
    })

@app.route("/api/auth/me", methods=["GET"])
def auth_me():
    auth_header = request.headers.get("Authorization", "")
    token = None
    if auth_header.startswith("Bearer "):
        token = auth_header.split(" ", 1)[1]
    
    if not token:
        return jsonify({"authenticated": False}), 200

    payload = verify_token(token)
    if not payload:
        return jsonify({"authenticated": False}), 200

    db = get_db()
    cursor = db.cursor()
    cursor.execute("SELECT id, name, email, role, subrole, phone, avatar FROM users WHERE id = ?", (payload["user_id"],))
    user = cursor.fetchone()

    if not user:
        return jsonify({"authenticated": False}), 200

    return jsonify({
        "authenticated": True,
        "user": dict(user)
    })

@app.route("/api/auth/users", methods=["GET"])
def list_users():
    db = get_db()
    cursor = db.cursor()
    cursor.execute("SELECT id, name, email, role, subrole, phone, created_at FROM users ORDER BY created_at DESC")
    users = [dict(row) for row in cursor.fetchall()]
    return jsonify({"success": True, "users": users})

# --------------------------------------------------------------------------
# API Routes: Menu & Categories
# --------------------------------------------------------------------------
@app.route("/api/menu", methods=["GET"])
def get_menu():
    db = get_db()
    cursor = db.cursor()
    cursor.execute("SELECT * FROM menu_items")
    items = []
    for row in cursor.fetchall():
        d = dict(row)
        try:
            d["tags"] = json.loads(d.get("tags") or "[]")
        except:
            d["tags"] = []
        try:
            d["options"] = json.loads(d.get("options_json") or "{}")
        except:
            d["options"] = {}
        d["available"] = bool(d["available"])
        items.append(d)
    return jsonify({"success": True, "menu": items})

@app.route("/api/menu", methods=["POST"])
def add_menu_item():
    data = request.get_json() or {}
    item_id = data.get("id") or f"menu-{int(time.time() * 1000)}"
    name = data.get("name", "Untitled Dish")
    category = data.get("category", "Starters")
    price = float(data.get("price", 0.0))
    image = data.get("image", "https://images.unsplash.com/photo-1559737194-67e3c1a84f37?auto=format&fit=crop&w=800&q=80")
    desc = data.get("description", "")
    prep_time = int(data.get("prepTime", data.get("prep_time", 15)))
    spice = data.get("spiceLevel", data.get("spice_level", "None"))
    tags = json.dumps(data.get("tags", []))
    available = 1 if data.get("available", True) else 0
    options = json.dumps(data.get("options", {}))

    db = get_db()
    cursor = db.cursor()
    cursor.execute("""
    INSERT OR REPLACE INTO menu_items (id, name, category, price, image, description, prep_time, spice_level, tags, available, options_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (item_id, name, category, price, image, desc, prep_time, spice, tags, available, options))
    db.commit()

    return jsonify({"success": True, "message": "Dish saved successfully", "id": item_id}), 201

@app.route("/api/menu/<item_id>", methods=["PUT"])
def update_menu_item(item_id):
    data = request.get_json() or {}
    db = get_db()
    cursor = db.cursor()

    if "available" in data and len(data) == 1:
        cursor.execute("UPDATE menu_items SET available = ? WHERE id = ?", (1 if data["available"] else 0, item_id))
    else:
        cursor.execute("""
        UPDATE menu_items SET 
            name = COALESCE(?, name),
            category = COALESCE(?, category),
            price = COALESCE(?, price),
            image = COALESCE(?, image),
            description = COALESCE(?, description),
            prep_time = COALESCE(?, prep_time),
            spice_level = COALESCE(?, spice_level),
            available = COALESCE(?, available)
        WHERE id = ?
        """, (
            data.get("name"),
            data.get("category"),
            data.get("price"),
            data.get("image"),
            data.get("description"),
            data.get("prepTime") or data.get("prep_time"),
            data.get("spiceLevel") or data.get("spice_level"),
            1 if data.get("available") else (0 if "available" in data else None),
            item_id
        ))

    db.commit()
    return jsonify({"success": True, "message": "Menu item updated"})

@app.route("/api/menu/<item_id>", methods=["DELETE"])
def delete_menu_item(item_id):
    db = get_db()
    cursor = db.cursor()
    cursor.execute("DELETE FROM menu_items WHERE id = ?", (item_id,))
    db.commit()
    return jsonify({"success": True, "message": "Menu item removed"})

@app.route("/api/categories", methods=["GET"])
def get_categories():
    db = get_db()
    cursor = db.cursor()
    cursor.execute("SELECT * FROM categories")
    categories = [dict(row) for row in cursor.fetchall()]
    return jsonify({"success": True, "categories": categories})

@app.route("/api/categories", methods=["POST"])
def add_category():
    data = request.get_json() or {}
    cat_id = data.get("id") or f"cat-{int(time.time() * 1000)}"
    name = data.get("name", "New Category")
    icon = data.get("icon", "utensils")
    slug = data.get("slug") or name.lower().replace(" ", "-")

    db = get_db()
    cursor = db.cursor()
    cursor.execute("INSERT OR REPLACE INTO categories (id, name, icon, slug) VALUES (?, ?, ?, ?)", (cat_id, name, icon, slug))
    db.commit()
    return jsonify({"success": True, "category": {"id": cat_id, "name": name, "icon": icon, "slug": slug}}), 201

# --------------------------------------------------------------------------
# API Routes: Orders
# --------------------------------------------------------------------------
@app.route("/api/orders", methods=["GET"])
def get_orders():
    db = get_db()
    cursor = db.cursor()
    cursor.execute("SELECT * FROM orders ORDER BY created_at DESC")
    orders = []
    for row in cursor.fetchall():
        d = dict(row)
        try:
            d["items"] = json.loads(d.get("items_json") or "[]")
        except:
            d["items"] = []
        orders.append(d)
    return jsonify({"success": True, "orders": orders})

@app.route("/api/orders", methods=["POST"])
def create_order():
    data = request.get_json() or {}
    order_id = data.get("id") or f"OSM-{int(1000 + (time.time() % 1) * 9000)}"
    now = datetime.utcnow().isoformat()

    items = data.get("items", [])
    items_json = json.dumps(items)

    db = get_db()
    cursor = db.cursor()
    cursor.execute("""
    INSERT INTO orders (
        id, created_at, customer_name, customer_phone, order_type, delivery_address,
        table_number, pickup_time, items_json, subtotal, tax, delivery_fee,
        discount, total, payment_method, payment_status, status, assigned_driver, notes, user_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        order_id,
        now,
        data.get("customerName", "Guest Diner"),
        data.get("customerPhone", ""),
        data.get("orderType", "Dine-In"),
        data.get("deliveryAddress", ""),
        data.get("tableNumber", ""),
        data.get("pickupTime", ""),
        items_json,
        float(data.get("subtotal", 0.0)),
        float(data.get("tax", 0.0)),
        float(data.get("deliveryFee", 0.0)),
        float(data.get("discount", 0.0)),
        float(data.get("total", 0.0)),
        data.get("paymentMethod", "Cash"),
        data.get("paymentStatus", "Paid"),
        data.get("status", "Pending"),
        data.get("assignedDriver", ""),
        data.get("notes", ""),
        data.get("userId", "")
    ))
    db.commit()

    return jsonify({"success": True, "message": "Order created successfully", "orderId": order_id}), 201

@app.route("/api/orders/<order_id>/status", methods=["PUT"])
def update_order_status(order_id):
    data = request.get_json() or {}
    status = data.get("status")
    assigned_driver = data.get("assignedDriver")

    db = get_db()
    cursor = db.cursor()

    if assigned_driver is not None:
        cursor.execute("UPDATE orders SET status = ?, assigned_driver = ? WHERE id = ?", (status, assigned_driver, order_id))
    else:
        cursor.execute("UPDATE orders SET status = ? WHERE id = ?", (status, order_id))

    db.commit()
    return jsonify({"success": True, "message": f"Order {order_id} status updated to {status}"})

# --------------------------------------------------------------------------
# API Routes: Inventory & Staff
# --------------------------------------------------------------------------
@app.route("/api/inventory", methods=["GET"])
def get_inventory():
    db = get_db()
    cursor = db.cursor()
    cursor.execute("SELECT * FROM inventory")
    inv = [dict(row) for row in cursor.fetchall()]
    return jsonify({"success": True, "inventory": inv})

@app.route("/api/inventory/<inv_id>", methods=["PUT"])
def update_inventory_stock(inv_id):
    data = request.get_json() or {}
    delta = float(data.get("delta", 0.0))
    set_stock = data.get("stock")

    db = get_db()
    cursor = db.cursor()

    if set_stock is not None:
        cursor.execute("UPDATE inventory SET stock = ? WHERE id = ?", (float(set_stock), inv_id))
    else:
        cursor.execute("UPDATE inventory SET stock = MAX(0, stock + ?) WHERE id = ?", (delta, inv_id))

    db.commit()
    return jsonify({"success": True, "message": "Inventory updated"})

@app.route("/api/staff", methods=["GET"])
def get_staff():
    db = get_db()
    cursor = db.cursor()
    cursor.execute("SELECT id, name, email, role, subrole, pin, phone, avatar FROM users WHERE role = 'staff' OR role = 'admin'")
    staff = [dict(row) for row in cursor.fetchall()]
    return jsonify({"success": True, "staff": staff})

# --------------------------------------------------------------------------
# API Routes: Reservations & Settings
# --------------------------------------------------------------------------
@app.route("/api/reservations", methods=["GET", "POST"])
def handle_reservations():
    db = get_db()
    cursor = db.cursor()

    if request.method == "POST":
        data = request.get_json() or {}
        res_id = data.get("id") or f"RES-{int(100 + (time.time() % 1) * 900)}"
        now = datetime.utcnow().isoformat()
        cursor.execute("""
        INSERT INTO reservations (id, name, phone, date, time, guests, seating, notes, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            res_id,
            data.get("name", "Guest"),
            data.get("phone", ""),
            data.get("date", ""),
            data.get("time", ""),
            int(data.get("guests", 2)),
            data.get("seating", "Main Dining"),
            data.get("notes", ""),
            "Confirmed",
            now
        ))
        db.commit()
        return jsonify({"success": True, "message": "Table reservation confirmed", "reservationId": res_id}), 201

    cursor.execute("SELECT * FROM reservations ORDER BY created_at DESC")
    res_list = [dict(row) for row in cursor.fetchall()]
    return jsonify({"success": True, "reservations": res_list})

@app.route("/api/settings", methods=["GET", "POST"])
def handle_settings():
    db = get_db()
    cursor = db.cursor()

    if request.method == "POST":
        data = request.get_json() or {}
        for k, v in data.items():
            cursor.execute("INSERT OR REPLACE INTO settings VALUES (?, ?)", (k, str(v)))
        db.commit()
        return jsonify({"success": True, "message": "Settings updated"})

    cursor.execute("SELECT key, value FROM settings")
    settings = {row["key"]: row["value"] for row in cursor.fetchall()}
    return jsonify({"success": True, "settings": settings})

@app.route("/api/analytics", methods=["GET"])
def get_analytics():
    db = get_db()
    cursor = db.cursor()

    cursor.execute("SELECT COUNT(*) as total_orders, SUM(total) as revenue FROM orders WHERE payment_status = 'Paid'")
    order_summary = cursor.fetchone()

    cursor.execute("SELECT COUNT(*) FROM inventory WHERE stock <= alert_threshold")
    low_stock = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM reservations WHERE status = 'Confirmed'")
    active_reservations = cursor.fetchone()[0]

    return jsonify({
        "success": True,
        "totalOrders": order_summary["total_orders"] or 0,
        "totalRevenue": round(order_summary["revenue"] or 0.0, 2),
        "lowStockCount": low_stock,
        "activeReservations": active_reservations
    })

# --------------------------------------------------------------------------
# Static Assets Serving
# --------------------------------------------------------------------------
@app.route("/")
def index():
    return send_from_directory(BASE_DIR, "index.html")

@app.route("/<path:path>")
def static_proxy(path):
    if os.path.exists(os.path.join(BASE_DIR, path)):
        return send_from_directory(BASE_DIR, path)
    return send_from_directory(BASE_DIR, "index.html")

# --------------------------------------------------------------------------
# Application Entry Point & Auto-Initialization
# --------------------------------------------------------------------------
init_db()

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    print(f"\n============================================================")
    print(f" 🔥 OSMAN'S SEAFOODS & GRILL RESTAURANT SYSTEM RUNNING")
    print(f" 🌐 Web Server: http://localhost:{port}")
    print(f" 👑 Admin Console: http://localhost:{port}/admin.html")
    print(f" 💼 Staff Terminal: http://localhost:{port}/staff.html")
    print(f" 🔐 Sign In / Log In: http://localhost:{port}/login.html")
    print(f"============================================================\n")
    app.run(host="0.0.0.0", port=port, debug=True)
