"""
Quick Launch Script for Osman's Seafoods and Grill Full Stack System
Starts the Python Flask backend server and prints navigation URLs and demo credentials.
"""

import sys
import os
import webbrowser

def main():
    try:
        from app import app, init_db
    except ImportError as e:
        print(f"Error importing Flask app: {e}")
        print("Please ensure Flask and Flask-CORS are installed: pip install -r requirements.txt")
        sys.exit(1)

    print("\n" + "="*65)
    print(" 🔥 OSMAN'S SEAFOODS AND GRILL — FULL STACK RESTAURANT SYSTEM")
    print("="*65)
    print(" 🛠️  Initializing local database (osman_restaurant.db)...")
    init_db()

    port = 5000
    host = "127.0.0.1"

    print(f"\n 🚀 Server online at: http://{host}:{port}")
    print(f"    • Storefront & Customer Portal:  http://{host}:{port}/")
    print(f"    • Secure Sign In & Role Portal:  http://{host}:{port}/login.html")
    print(f"    • Staff Operations Terminal:     http://{host}:{port}/staff.html")
    print(f"    • Administrator Console:         http://{host}:{port}/admin.html")
    print("\n 👥 Demo User Accounts (Pre-configured):")
    print("    👑 Admin:    admin@osmanseafoods.com   / admin123  (PIN: 1001)")
    print("    💼 Cashier:  cashier@osmanseafoods.com / staff123  (PIN: 2002)")
    print("    👨‍🍳 Kitchen:  chef@osmanseafoods.com    / chef123   (PIN: 3003)")
    print("    🛵 Dispatch: driver@osmanseafoods.com  / driver123 (PIN: 4004)")
    print("    👤 Customer: customer@gmail.com        / customer123")
    print("="*65 + "\n")

    app.run(host=host, port=port, debug=True)

if __name__ == "__main__":
    main()
