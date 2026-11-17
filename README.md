# Osman's Seafoods and Grill — Restaurant Management & Dining Platform

A full-stack, responsive restaurant management and customer ordering web application crafted with an **Oceanic Luxury & Flame Hearth** aesthetic. Powered by a Python Flask REST backend, SQLite persistence, and reactive multi-role client architecture.

---

## 🌟 Key Features

### 1. Unified Authentication & Role Synchronization
- **Multi-Role Access Control**:
  - **👑 Administrator (`admin`)**: Complete system oversight via the Administrator Console (`admin.html`), including menu CRUD, category management, inventory control, order auditing, customer analytics, and settings.
  - **💼 Staff Terminal (`staff`)**:
    - **Cashier POS**: Fast walk-in order generation, payment processing, status updates, and receipt printing.
    - **Kitchen KDS**: Real-time cooking tickets with preparation timers and ready toggles.
    - **Delivery Dispatch**: Driver assignment, dispatch status updates, and customer address coordination.
  - **👤 Customer (`customer`)**: Seamless dining orders (Dine-In, Takeout, Hot Delivery), live thermal order tracking, table reservations, and account management.
- **Fast 1-Click Role Switcher**: Interactive demo pills to test any user role in one click.
- **Staff 4-Digit Station PIN**: On-screen interactive PIN pad for cashier terminals and kitchen displays.
- **Responsive Navigation Widget**: Displays active user profile badge, avatar, role tag, station shortcut, and dropdown menu across all pages.
- **Route Guard Protection**: Restricts sensitive pages (`admin.html`, `staff.html`) to authorized personnel with informative login dialogs.

### 2. Python REST API Backend
- **Framework**: Python 3.12+ with Flask & Flask-CORS.
- **Database**: SQLite (`osman_restaurant.db`) with automatic table creation and realistic seed data.
- **Dual-Mode Sync**: Operates synchronously with the Python backend while retaining offline/localStorage resilience if accessed as standalone static files.

---

## 👥 Demo Accounts & Pre-configured Credentials

| Role | Name | Email | Password | PIN | Default View |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Admin (Owner)** | Chef Osman Al-Mansoor | `admin@osmanseafoods.com` | `admin123` | `1001` | [Admin Console](admin.html) |
| **Staff (Cashier)** | Maria Santos | `cashier@osmanseafoods.com` | `staff123` | `2002` | [Cashier POS](staff.html) |
| **Staff (Kitchen)** | Carlos Rivera | `chef@osmanseafoods.com` | `chef123` | `3003` | [Kitchen KDS](staff.html) |
| **Staff (Driver)** | David Vance | `driver@osmanseafoods.com` | `driver123` | `4004` | [Delivery Dispatch](staff.html) |
| **Customer** | Elena Rostova | `customer@gmail.com` | `customer123` | — | [Storefront](index.html) |

---

## 🛠️ Project Structure

```
osman/
├── app.py                  # Python Flask REST API server and static host
├── run.py                  # Server bootstrap script with console helpers
├── requirements.txt        # Python package dependencies
├── osman_restaurant.db     # SQLite database (auto-generated)
├── index.html              # Customer storefront & online ordering
├── customer.html           # Customer view mirror
├── admin.html              # Administrator management console
├── staff.html              # Staff operations terminal (POS / KDS / Dispatch)
├── login.html              # Standalone sign in & role portal
├── css/
│   ├── main.css            # Shared variables, typography & layout resets
│   ├── customer.css        # Storefront styling & animations
│   ├── admin.css           # Administrator dashboard styling
│   ├── staff.css           # POS & KDS terminal styling
│   └── auth.css            # Authentication cards, modals, PIN pad & widgets
└── js/
    ├── store.js            # Reactive state management & backend API synchronization
    ├── auth.js             # Authentication manager, role guards & navbar widgets
    ├── customer.js         # Menu filtering, cart drawer, checkout & order tracking
    ├── admin.js            # Admin CRUD operations, inventory & analytics
    └── staff.js            # POS ticketing, KDS timers, and receipt printing
```

---

## 🚀 Running the Project

### Prerequisites
- Python 3.10+ installed
- Web browser (Chrome, Edge, Firefox, Safari)

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Start the Backend Server
```bash
python run.py
```
Or:
```bash
python app.py
```

### 3. Open in Browser
- **Storefront & Dining**: [http://localhost:5000](http://localhost:5000)
- **Sign In & Role Portal**: [http://localhost:5000/login.html](http://localhost:5000/login.html)
- **Staff Operations Terminal**: [http://localhost:5000/staff.html](http://localhost:5000/staff.html)
- **Admin Management Console**: [http://localhost:5000/admin.html](http://localhost:5000/admin.html)

---

## 📡 REST API Summary

- `GET /api/health` - Server status & timestamp
- `POST /api/auth/register` - Create customer or staff account
- `POST /api/auth/login` - Email & password authentication
- `POST /api/auth/pin-login` - Staff 4-digit PIN authentication
- `GET /api/auth/me` - Verify session token
- `GET /api/menu` & `POST /api/menu` - Retrieve and update dishes
- `GET /api/orders` & `POST /api/orders` - Order history & creation
- `PUT /api/orders/<id>/status` - Update order stage (Pending -> Preparing -> Ready -> Completed)
- `GET /api/inventory` & `PUT /api/inventory/<id>` - Track and update stock
- `GET /api/reservations` & `POST /api/reservations` - Table booking management
- `GET /api/analytics` - Revenue and operational metrics

---

## ☁️ Deploying to Render (render.com)

This repository includes `render.yaml` and `Procfile` for deployment on Render:

1. Go to [Render Dashboard](https://dashboard.render.com).
2. Click **New +** -> **Web Service**.
3. Choose **Build and deploy from a Git repository**.
4. Connect and select: `https://github.com/kinggzenooo-dot/osmaseafoodandgrills`.
5. Render will automatically detect the settings:
   - **Environment / Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn app:app --bind 0.0.0.0:$PORT`
   - **Plan**: `Free`
6. Click **Create Web Service** (or **Deploy**).
7. Your app will be live at `https://<your-subdomain>.onrender.com`!

---

## 🌿 Git Repository
- GitHub Remote: `https://github.com/kinggzenooo-dot/osmaseafoodandgrills.git`
