/**
 * Osman's Seafoods and Grill — Shared Data Store & State Manager
 * Handles local persistence, reactive state broadcasting across tabs, cart state, orders, inventory, menu, and system settings.
 */

const SEED_DATA = {
  menu: [
    {
      id: 'menu-1',
      name: 'Grand Seafood Bucket',
      category: 'Seafood Buckets',
      price: 68.00,
      image: 'https://images.unsplash.com/photo-1559737194-67e3c1a84f37?auto=format&fit=crop&w=800&q=80',
      description: 'Whole Atlantic Lobster, Jumbo Tiger Prawns, Snow Crab Legs, Sweet Corn, and Smoked Sausage tossed in signature Cajun Garlic Butter.',
      prepTime: 25,
      spiceLevel: 'Fiery',
      tags: ['Chef Special', 'Popular', 'Shellfish'],
      available: true,
      options: {
        spiceLevels: ['Mild Butter', 'Medium Cajun', 'Fiery Ember'],
        sauces: ['Signature Garlic Butter', 'Lemon Herb Infusion', 'Smoky Cajun Craze'],
        sides: ['Garlic Butter Toast', 'Steamed Jasmine Rice', 'Cajun Fries']
      }
    },
    {
      id: 'menu-2',
      name: 'Char-Grilled Lobster Tail',
      category: 'Flame Grill',
      price: 42.00,
      image: 'https://images.unsplash.com/photo-1551248429-40975aa4de74?auto=format&fit=crop&w=800&q=80',
      description: 'Wood-fired 10oz Atlantic Lobster Tail basted with lemon garlic herb butter, served with grilled asparagus and charred lemon.',
      prepTime: 20,
      spiceLevel: 'Mild',
      tags: ['Chef Special', 'Gluten-Free'],
      available: true,
      options: {
        spiceLevels: ['Mild', 'Spicy Glaze'],
        sauces: ['Garlic Herb Butter', 'Truffle Mayo'],
        sides: ['Grilled Asparagus', 'Truffle Fries']
      }
    },
    {
      id: 'menu-3',
      name: 'Flame-Kissed Prime Ribeye',
      category: 'Flame Grill',
      price: 38.00,
      image: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80',
      description: '14oz Prime Angus Ribeye seared over white oak charcoal, finished with chimichurri butter and smoked sea salt.',
      prepTime: 22,
      spiceLevel: 'None',
      tags: ['Flame Grill', 'Customer Favorite'],
      available: true,
      options: {
        doneness: ['Rare', 'Medium Rare', 'Medium', 'Medium Well', 'Well Done'],
        sauces: ['Fresh Chimichurri', 'Red Wine Demiglace', 'Peppercorn Cream'],
        sides: ['Mashed Potatoes', 'Charred Vegetables']
      }
    },
    {
      id: 'menu-4',
      name: 'Jumbo Tiger Prawn Skewers',
      category: 'Flame Grill',
      price: 26.00,
      image: 'https://images.unsplash.com/photo-1535400255456-984241443b29?auto=format&fit=crop&w=800&q=80',
      description: 'Four marinated jumbo prawns threaded on rosemary skewers, char-broiled with citrus chili glaze and cilantro.',
      prepTime: 15,
      spiceLevel: 'Medium',
      tags: ['Flame Grill', 'Gluten-Free'],
      available: true,
      options: {
        spiceLevels: ['Mild Citrus', 'Medium Chili', 'Extra Hot'],
        sauces: ['Chipotle Aioli', 'Cilantro Lime'],
        sides: ['Coconut Rice', 'House Salad']
      }
    },
    {
      id: 'menu-5',
      name: 'Osman’s Signature Crab Cakes',
      category: 'Starters',
      price: 22.00,
      image: 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?auto=format&fit=crop&w=800&q=80',
      description: 'Pan-seared jumbo lump blue crab cakes with Old Bay seasoning, microgreens, and house-made tartar sauce.',
      prepTime: 12,
      spiceLevel: 'Mild',
      tags: ['Chef Special', 'Starters'],
      available: true,
      options: {
        sauces: ['Zesty Tartar Sauce', 'Spicy Remoulade']
      }
    },
    {
      id: 'menu-6',
      name: 'Crispy Calamari Rings',
      category: 'Starters',
      price: 16.00,
      image: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=800&q=80',
      description: 'Lightly seasoned crispy tender squid rings served with smoked paprika aioli and charred lemon wedges.',
      prepTime: 10,
      spiceLevel: 'None',
      tags: ['Starters', 'Popular'],
      available: true,
      options: {
        sauces: ['Smoked Paprika Aioli', 'Classic Marinara']
      }
    },
    {
      id: 'menu-7',
      name: 'Wild Pacific Salmon Steak',
      category: 'Fresh Catch',
      price: 31.00,
      image: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=800&q=80',
      description: 'Fresh pan-grilled wild salmon fillet served over wilted garlic spinach, roasted baby potatoes, and honey-mustard drizzle.',
      prepTime: 18,
      spiceLevel: 'None',
      tags: ['Fresh Catch', 'Healthy Choice'],
      available: true,
      options: {
        sauces: ['Honey Mustard Glaze', 'Dill Cream Sauce'],
        sides: ['Roasted Baby Potatoes', 'Quinoa Salad']
      }
    },
    {
      id: 'menu-8',
      name: 'Seafood Paella Royal',
      category: 'Fresh Catch',
      price: 36.00,
      image: 'https://images.unsplash.com/photo-1534080564583-6be75777b70a?auto=format&fit=crop&w=800&q=80',
      description: 'Traditional Spanish saffron rice cooked with black mussels, prawns, calamari, scallops, chorizo, and sweet bell peppers.',
      prepTime: 25,
      spiceLevel: 'Mild',
      tags: ['Chef Special', 'Family Favorite'],
      available: true,
      options: {
        sides: ['Extra Saffron Aioli', 'Garlic Bread']
      }
    },
    {
      id: 'menu-9',
      name: 'Smoky Grilled Corn on Cob',
      category: 'Sides & Dips',
      price: 8.00,
      image: 'https://images.unsplash.com/photo-1536592231755-97305943a539?auto=format&fit=crop&w=800&q=80',
      description: 'Charred sweet corn topped with cotija cheese, chili powder drizzle, cilantro, and garlic lime butter.',
      prepTime: 8,
      spiceLevel: 'Mild',
      tags: ['Vegetarian', 'Sides'],
      available: true,
      options: {}
    },
    {
      id: 'menu-10',
      name: 'Truffle Parmesan Fries',
      category: 'Sides & Dips',
      price: 9.50,
      image: 'https://images.unsplash.com/photo-1576107232684-1279f3908594?auto=format&fit=crop&w=800&q=80',
      description: 'Hand-cut russet fries tossed with white truffle oil, aged Parmigiano-Reggiano, and fresh chopped parsley.',
      prepTime: 8,
      spiceLevel: 'None',
      tags: ['Vegetarian', 'Popular'],
      available: true,
      options: {}
    },
    {
      id: 'menu-11',
      name: 'Ocean Breeze Craft Cocktail',
      category: 'Drinks',
      price: 12.00,
      image: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=800&q=80',
      description: 'Blue Curaçao, coconut rum, fresh pineapple juice, lime, and a splash of sparkling soda over crushed ice.',
      prepTime: 5,
      spiceLevel: 'None',
      tags: ['Signature Drink'],
      available: true,
      options: {
        type: ['Alcoholic', 'Non-Alcoholic Mocktail']
      }
    },
    {
      id: 'menu-12',
      name: 'Classic Key Lime Pie',
      category: 'Desserts',
      price: 10.00,
      image: 'https://images.unsplash.com/photo-1535141192574-5d4897c13136?auto=format&fit=crop&w=800&q=80',
      description: 'Authentic Key lime custard on a buttery graham cracker crust, topped with handmade vanilla whipped cream.',
      prepTime: 5,
      spiceLevel: 'None',
      tags: ['Dessert', 'Sweet Finish'],
      available: true,
      options: {}
    }
  ],

  categories: [
    { id: 'cat-1', name: 'Seafood Buckets', icon: 'anchor', slug: 'seafood-buckets' },
    { id: 'cat-2', name: 'Flame Grill', icon: 'flame', slug: 'flame-grill' },
    { id: 'cat-3', name: 'Fresh Catch', icon: 'fish', slug: 'fresh-catch' },
    { id: 'cat-4', name: 'Starters', icon: 'utensils', slug: 'starters' },
    { id: 'cat-5', name: 'Sides & Dips', icon: 'sparkles', slug: 'sides-dips' },
    { id: 'cat-6', name: 'Drinks', icon: 'wine', slug: 'drinks' },
    { id: 'cat-7', name: 'Desserts', icon: 'cake', slug: 'desserts' }
  ],

  inventory: [
    { id: 'inv-1', name: 'Atlantic Lobster Tails', category: 'Seafood', unit: 'lbs', stock: 45, alertThreshold: 15, costPerUnit: 18.50 },
    { id: 'inv-2', name: 'Jumbo Tiger Prawns', category: 'Seafood', unit: 'lbs', stock: 60, alertThreshold: 20, costPerUnit: 12.00 },
    { id: 'inv-3', name: 'Prime Angus Ribeye Cuts', category: 'Meat', unit: 'lbs', stock: 35, alertThreshold: 10, costPerUnit: 16.00 },
    { id: 'inv-4', name: 'Wild Salmon Fillets', category: 'Seafood', unit: 'lbs', stock: 28, alertThreshold: 10, costPerUnit: 11.50 },
    { id: 'inv-5', name: 'Lump Blue Crab Meat', category: 'Seafood', unit: 'lbs', stock: 12, alertThreshold: 15, costPerUnit: 22.00 },
    { id: 'inv-6', name: 'Cajun Garlic Butter Sauce', category: 'Pantry', unit: 'quarts', stock: 30, alertThreshold: 8, costPerUnit: 4.50 },
    { id: 'inv-7', name: 'Oak Wood Charcoal', category: 'Supplies', unit: 'bags', stock: 18, alertThreshold: 5, costPerUnit: 14.00 }
  ],

  staff: [
    { id: 'st-1', name: 'Osman Al-Mansoor', role: 'Executive Chef / Owner', pin: '1001', phone: '+1 555 0192', active: true },
    { id: 'st-2', name: 'Maria Santos', role: 'Head Cashier', pin: '2002', phone: '+1 555 0184', active: true },
    { id: 'st-3', name: 'Carlos Rivera', role: 'Kitchen Lead Chef', pin: '3003', phone: '+1 555 0177', active: true },
    { id: 'st-4', name: 'David Vance', role: 'Senior Delivery Driver', pin: '4004', phone: '+1 555 0163', active: true }
  ],

  orders: [
    {
      id: 'OSM-8941',
      createdAt: new Date(Date.now() - 45 * 60000).toISOString(),
      customerName: 'Elena Rostova',
      customerPhone: '+1 (555) 948-2019',
      orderType: 'Delivery',
      deliveryAddress: '450 Harbor View Ave, Apt 3B',
      tableNumber: '',
      pickupTime: '',
      items: [
        {
          id: 'menu-1',
          name: 'Grand Seafood Bucket',
          price: 68.00,
          quantity: 1,
          customization: 'Spice: Fiery Ember | Sauce: Signature Garlic Butter | Side: Garlic Butter Toast'
        },
        {
          id: 'menu-11',
          name: 'Ocean Breeze Craft Cocktail',
          price: 12.00,
          quantity: 2,
          customization: 'Alcoholic'
        }
      ],
      subtotal: 92.00,
      tax: 7.36,
      deliveryFee: 0.00,
      discount: 0.00,
      total: 99.36,
      paymentMethod: 'Credit Card',
      paymentStatus: 'Paid',
      status: 'Ready',
      assignedDriver: 'David Vance',
      notes: 'Please ring bell upon arrival.'
    },
    {
      id: 'OSM-8942',
      createdAt: new Date(Date.now() - 20 * 60000).toISOString(),
      customerName: 'Marcus Thorne',
      customerPhone: '+1 (555) 773-1044',
      orderType: 'Dine-In',
      tableNumber: 'Table 04',
      deliveryAddress: '',
      pickupTime: '',
      items: [
        {
          id: 'menu-2',
          name: 'Char-Grilled Lobster Tail',
          price: 42.00,
          quantity: 2,
          customization: 'Spice: Mild | Sauce: Garlic Herb Butter | Side: Truffle Fries'
        },
        {
          id: 'menu-10',
          name: 'Truffle Parmesan Fries',
          price: 9.50,
          quantity: 1,
          customization: ''
        }
      ],
      subtotal: 93.50,
      tax: 7.48,
      deliveryFee: 0.00,
      discount: 9.35,
      total: 91.63,
      paymentMethod: 'GCash / Digital Wallet',
      paymentStatus: 'Paid',
      status: 'Preparing',
      assignedDriver: '',
      notes: 'Extra napkins requested.'
    },
    {
      id: 'OSM-8940',
      createdAt: new Date(Date.now() - 90 * 60000).toISOString(),
      customerName: 'Sarah Jenkins',
      customerPhone: '+1 (555) 321-9876',
      orderType: 'Takeout',
      tableNumber: '',
      deliveryAddress: '',
      pickupTime: '7:15 PM',
      items: [
        {
          id: 'menu-3',
          name: 'Flame-Kissed Prime Ribeye',
          price: 38.00,
          quantity: 1,
          customization: 'Doneness: Medium Rare | Sauce: Fresh Chimichurri'
        }
      ],
      subtotal: 38.00,
      tax: 3.04,
      deliveryFee: 0.00,
      discount: 0.00,
      total: 41.04,
      paymentMethod: 'Cash on Pickup',
      paymentStatus: 'Paid',
      status: 'Completed',
      assignedDriver: '',
      notes: ''
    }
  ],

  reservations: [
    {
      id: 'RES-101',
      name: 'Jonathan Miller',
      phone: '+1 555 8821',
      date: '2026-09-21',
      time: '19:00',
      guests: 4,
      seating: 'Coastal Terrace',
      notes: 'Celebrating anniversary',
      status: 'Confirmed'
    }
  ],

  settings: {
    restaurantName: "Osman's Seafoods and Grill",
    tagline: 'Where Oceanic Catch Meets Flame Grill Mastery',
    address: '742 Coastal Boulevard, Harbor Bay, CA 90210',
    phone: '+1 (555) 382-7626',
    email: 'contact@osmanseafoods.com',
    taxRate: 8.0,
    deliveryFee: 4.99,
    freeDeliveryThreshold: 60.00,
    currencySymbol: '$',
    openingHours: 'Mon-Sun: 11:00 AM - 10:30 PM',
    acceptingOrders: true
  },

  cart: []
};

class StoreManager {
  constructor() {
    this.STORAGE_KEY = 'osman_restaurant_store_v1';
    this.API_BASE = window.location.origin.includes(':5000') || window.location.port === '5000'
      ? '' 
      : 'http://localhost:5000';
    this.broadcastChannel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('osman_store_channel') : null;
    this.init();
    this.syncWithBackend();
  }

  async syncWithBackend() {
    try {
      const res = await fetch(`${this.API_BASE}/api/health`);
      if (res.ok) {
        // Backend is up! Sync menu and orders
        const [menuRes, ordersRes, invRes] = await Promise.allSettled([
          fetch(`${this.API_BASE}/api/menu`).then(r => r.json()),
          fetch(`${this.API_BASE}/api/orders`).then(r => r.json()),
          fetch(`${this.API_BASE}/api/inventory`).then(r => r.json())
        ]);

        const state = this.getState();
        let changed = false;

        if (menuRes.status === 'fulfilled' && menuRes.value.success && menuRes.value.menu.length) {
          state.menu = menuRes.value.menu;
          changed = true;
        }
        if (ordersRes.status === 'fulfilled' && ordersRes.value.success && ordersRes.value.orders.length) {
          state.orders = ordersRes.value.orders;
          changed = true;
        }
        if (invRes.status === 'fulfilled' && invRes.value.success && invRes.value.inventory.length) {
          state.inventory = invRes.value.inventory;
          changed = true;
        }

        if (changed) {
          this.saveState(state);
        }
      }
    } catch (e) {
      // Offline or file system mode, running on local storage
    }
  }

  init() {
    const existing = localStorage.getItem(this.STORAGE_KEY);
    if (!existing) {
      this.saveState(SEED_DATA);
    }

    window.addEventListener('storage', (e) => {
      if (e.key === this.STORAGE_KEY) {
        this.notifyListeners();
      }
    });

    if (this.broadcastChannel) {
      this.broadcastChannel.onmessage = () => {
        this.notifyListeners();
      };
    }
  }

  getState() {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : SEED_DATA;
    } catch (err) {
      console.error('Error reading localStorage state:', err);
      return SEED_DATA;
    }
  }

  saveState(state) {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(state));
      this.notifyListeners();
      if (this.broadcastChannel) {
        this.broadcastChannel.postMessage({ type: 'STATE_UPDATED', timestamp: Date.now() });
      }
    } catch (err) {
      console.error('Error saving state to localStorage:', err);
    }
  }

  notifyListeners() {
    window.dispatchEvent(new CustomEvent('osman_store_change', { detail: this.getState() }));
  }

  getMenu() { return this.getState().menu || []; }
  getMenuItem(id) { return this.getMenu().find(item => item.id === id); }

  saveMenuItem(itemData) {
    const state = this.getState();
    const index = state.menu.findIndex(item => item.id === itemData.id);
    if (index >= 0) {
      state.menu[index] = { ...state.menu[index], ...itemData };
    } else {
      const newId = 'menu-' + Date.now();
      state.menu.push({ id: newId, available: true, ...itemData });
    }
    this.saveState(state);
  }

  toggleMenuItemAvailability(id) {
    const state = this.getState();
    const item = state.menu.find(i => i.id === id);
    if (item) {
      item.available = !item.available;
      this.saveState(state);
    }
  }

  deleteMenuItem(id) {
    const state = this.getState();
    state.menu = state.menu.filter(i => i.id !== id);
    this.saveState(state);
  }

  getCategories() { return this.getState().categories || []; }

  saveCategory(catData) {
    const state = this.getState();
    const index = state.categories.findIndex(c => c.id === catData.id);
    if (index >= 0) {
      state.categories[index] = { ...state.categories[index], ...catData };
    } else {
      const newId = 'cat-' + Date.now();
      state.categories.push({ id: newId, ...catData });
    }
    this.saveState(state);
  }

  deleteCategory(id) {
    const state = this.getState();
    state.categories = state.categories.filter(c => c.id !== id);
    this.saveState(state);
  }

  getCart() { return this.getState().cart || []; }

  addToCart(menuItem, quantity = 1, customization = '', selectedOptions = {}) {
    const state = this.getState();
    state.cart = state.cart || [];
    
    const existingIndex = state.cart.findIndex(cartItem => 
      cartItem.id === menuItem.id && cartItem.customization === customization
    );

    if (existingIndex >= 0) {
      state.cart[existingIndex].quantity += quantity;
    } else {
      state.cart.push({
        id: menuItem.id,
        name: menuItem.name,
        price: menuItem.price,
        image: menuItem.image,
        category: menuItem.category,
        quantity: quantity,
        customization: customization,
        selectedOptions: selectedOptions
      });
    }

    this.saveState(state);
  }

  updateCartQuantity(index, newQty) {
    const state = this.getState();
    if (newQty <= 0) {
      state.cart.splice(index, 1);
    } else {
      if (state.cart[index]) {
        state.cart[index].quantity = newQty;
      }
    }
    this.saveState(state);
  }

  removeFromCart(index) {
    const state = this.getState();
    state.cart.splice(index, 1);
    this.saveState(state);
  }

  clearCart() {
    const state = this.getState();
    state.cart = [];
    this.saveState(state);
  }

  getCartTotals(promoCode = '') {
    const cart = this.getCart();
    const settings = this.getSettings();

    const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    
    let discount = 0;
    const cleanPromo = promoCode.trim().toUpperCase();
    if (cleanPromo === 'OSMAN10') {
      discount = subtotal * 0.10;
    } else if (cleanPromo === 'FRESHCATCH') {
      discount = subtotal >= 30 ? 5.00 : 0;
    }

    const discountedSubtotal = Math.max(0, subtotal - discount);
    const tax = discountedSubtotal * (settings.taxRate / 100);
    
    const deliveryFee = (subtotal === 0 || subtotal >= settings.freeDeliveryThreshold) ? 0 : settings.deliveryFee;
    const total = discountedSubtotal + tax + deliveryFee;

    return {
      subtotal,
      discount,
      discountedSubtotal,
      tax,
      deliveryFee,
      total,
      itemCount: cart.reduce((acc, item) => acc + item.quantity, 0)
    };
  }

  createOrder(orderData) {
    const state = this.getState();
    const totals = this.getCartTotals(orderData.promoCode || '');

    const currentUser = window.OsmanAuth ? window.OsmanAuth.getCurrentUser() : null;

    const orderId = 'OSM-' + Math.floor(1000 + Math.random() * 9000);
    const newOrder = {
      id: orderId,
      createdAt: new Date().toISOString(),
      customerName: orderData.customerName || (currentUser ? currentUser.name : 'Diner'),
      customerPhone: orderData.customerPhone || (currentUser ? currentUser.phone : ''),
      orderType: orderData.orderType,
      tableNumber: orderData.tableNumber || '',
      deliveryAddress: orderData.deliveryAddress || '',
      pickupTime: orderData.pickupTime || '',
      items: orderData.items || state.cart,
      subtotal: totals.subtotal,
      discount: totals.discount,
      tax: totals.tax,
      deliveryFee: orderData.orderType === 'Delivery' ? totals.deliveryFee : 0,
      total: orderData.orderType === 'Delivery' ? totals.total : totals.discountedSubtotal + totals.tax,
      paymentMethod: orderData.paymentMethod || 'Cash',
      paymentStatus: orderData.paymentStatus || 'Paid',
      status: 'Pending',
      assignedDriver: '',
      notes: orderData.notes || '',
      userId: currentUser ? currentUser.id : ''
    };

    state.orders = state.orders || [];
    state.orders.unshift(newOrder);
    state.cart = [];
    
    this.saveState(state);

    // Sync to backend API if available
    try {
      fetch(`${this.API_BASE}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newOrder)
      }).catch(() => {});
    } catch (e) {}

    return newOrder;
  }

  getOrders() { return this.getState().orders || []; }
  getOrder(id) { return this.getOrders().find(o => o.id === id); }

  updateOrderStatus(orderId, newStatus, extraProps = {}) {
    const state = this.getState();
    const order = state.orders.find(o => o.id === orderId);
    if (order) {
      order.status = newStatus;
      Object.assign(order, extraProps);
      this.saveState(state);

      // Sync status to backend API
      try {
        fetch(`${this.API_BASE}/api/orders/${orderId}/status`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus, ...extraProps })
        }).catch(() => {});
      } catch (e) {}
    }
  }

  getInventory() { return this.getState().inventory || []; }
  updateInventoryStock(id, addedQuantity) {
    const state = this.getState();
    const item = state.inventory.find(i => i.id === id);
    if (item) {
      item.stock = Math.max(0, item.stock + addedQuantity);
      this.saveState(state);
    }
  }

  saveInventoryItem(invData) {
    const state = this.getState();
    const index = state.inventory.findIndex(i => i.id === invData.id);
    if (index >= 0) {
      state.inventory[index] = { ...state.inventory[index], ...invData };
    } else {
      const newId = 'inv-' + Date.now();
      state.inventory.push({ id: newId, ...invData });
    }
    this.saveState(state);
  }

  deleteInventoryItem(id) {
    const state = this.getState();
    state.inventory = state.inventory.filter(i => i.id !== id);
    this.saveState(state);
  }

  getStaff() { return this.getState().staff || []; }

  saveStaff(staffData) {
    const state = this.getState();
    const index = state.staff.findIndex(s => s.id === staffData.id);
    if (index >= 0) {
      state.staff[index] = { ...state.staff[index], ...staffData };
    } else {
      const newId = 'st-' + Date.now();
      state.staff.push({ id: newId, active: true, ...staffData });
    }
    this.saveState(state);
  }

  deleteStaff(id) {
    const state = this.getState();
    state.staff = state.staff.filter(s => s.id !== id);
    this.saveState(state);
  }

  getReservations() { return this.getState().reservations || []; }

  createReservation(resData) {
    const state = this.getState();
    const resId = 'RES-' + Math.floor(100 + Math.random() * 900);
    const newRes = {
      id: resId,
      status: 'Confirmed',
      createdAt: new Date().toISOString(),
      ...resData
    };
    state.reservations = state.reservations || [];
    state.reservations.unshift(newRes);
    this.saveState(state);
    return newRes;
  }

  getSettings() { return this.getState().settings || SEED_DATA.settings; }

  saveSettings(newSettings) {
    const state = this.getState();
    state.settings = { ...state.settings, ...newSettings };
    this.saveState(state);
  }

  resetToSeedData() {
    this.saveState(SEED_DATA);
  }
}

window.OsmanStore = new StoreManager();
