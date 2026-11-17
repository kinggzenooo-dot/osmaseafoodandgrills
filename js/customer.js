/**
 * Osman's Seafoods and Grill — Customer Website & Ordering Script
 * Handles navigation scrolling, menu rendering, filter tabs, search, item customization modal,
 * cart drawer, checkout modal, table reservations, and live order tracking.
 */

document.addEventListener('DOMContentLoaded', () => {
  let activeCategory = 'all';
  let searchQuery = '';
  let selectedDish = null;
  let activePromoCode = '';

  initNavbarScroll();
  initMobileNav();
  renderCategoriesFilter();
  renderMenuGrid();
  updateCartUI();
  setupEventListeners();
  checkActiveOrders();

  window.addEventListener('osman_store_change', () => {
    renderMenuGrid();
    updateCartUI();
    checkActiveOrders();
    updateTrackerModalIfOpen();
  });

  function initNavbarScroll() {
    const navbar = document.querySelector('.navbar');
    if (!navbar) return;
    window.addEventListener('scroll', () => {
      if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
      } else {
        navbar.classList.remove('scrolled');
      }
    });
  }

  function initMobileNav() {
    const toggleBtn = document.querySelector('.mobile-nav-toggle');
    const navLinks = document.querySelector('.nav-links');
    if (toggleBtn && navLinks) {
      toggleBtn.addEventListener('click', () => {
        navLinks.classList.toggle('active');
      });
    }
  }

  function renderCategoriesFilter() {
    const filterContainer = document.getElementById('categoryFilterBar');
    if (!filterContainer) return;

    const categories = window.OsmanStore.getCategories();
    let html = `<button class="cat-btn ${activeCategory === 'all' ? 'active' : ''}" data-cat="all">
      <svg class="icon" viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16"/></svg> All Items
    </button>`;

    categories.forEach(cat => {
      html += `
        <button class="cat-btn ${activeCategory === cat.name ? 'active' : ''}" data-cat="${cat.name}">
          <span>${cat.name}</span>
        </button>
      `;
    });

    filterContainer.innerHTML = html;

    filterContainer.querySelectorAll('.cat-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        activeCategory = e.currentTarget.getAttribute('data-cat');
        filterContainer.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        renderMenuGrid();
      });
    });
  }

  function renderMenuGrid() {
    const grid = document.getElementById('menuGrid');
    if (!grid) return;

    let items = window.OsmanStore.getMenu();

    if (activeCategory !== 'all') {
      items = items.filter(i => i.category === activeCategory);
    }

    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      items = items.filter(i => i.name.toLowerCase().includes(q) || i.description.toLowerCase().includes(q));
    }

    if (items.length === 0) {
      grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: var(--color-text-muted);">
        <h3>No dishes found matching your criteria.</h3>
        <p>Try searching for something else or browse all menu items.</p>
      </div>`;
      return;
    }

    grid.innerHTML = items.map(item => `
      <div class="menu-card" data-id="${item.id}">
        <div class="menu-card-img">
          <img src="${item.image}" alt="${item.name}" loading="lazy">
          ${!item.available ? `<div style="position:absolute;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);color:#FFF;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:1.1rem;text-transform:uppercase;">Sold Out</div>` : ''}
        </div>
        <div class="menu-card-body">
          <div class="menu-card-tags">
            ${(item.tags || []).map(t => `<span class="badge ${t === 'Chef Special' ? 'badge-flame' : 'badge-gold'}">${t}</span>`).join('')}
            ${item.spiceLevel !== 'None' ? `<span class="badge badge-flame">🔥 ${item.spiceLevel}</span>` : ''}
          </div>
          <h3 class="menu-card-title">${item.name}</h3>
          <p class="menu-card-desc">${item.description}</p>
          <div class="menu-card-footer">
            <span class="menu-card-price">$${item.price.toFixed(2)}</span>
            <div class="menu-card-actions">
              <button class="btn btn-outline btn-sm btn-customize" data-id="${item.id}" ${!item.available ? 'disabled' : ''}>Customize</button>
              <button class="btn btn-flame btn-sm btn-quick-add" data-id="${item.id}" ${!item.available ? 'disabled' : ''}>+ Add</button>
            </div>
          </div>
        </div>
      </div>
    `).join('');

    grid.querySelectorAll('.btn-customize').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        openDishModal(id);
      });
    });

    grid.querySelectorAll('.btn-quick-add').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        const dish = window.OsmanStore.getMenuItem(id);
        if (dish) {
          window.OsmanStore.addToCart(dish, 1, 'Standard Prep');
          showToast(`Added ${dish.name} to cart!`, 'success');
          openCartDrawer();
        }
      });
    });
  }

  function openDishModal(dishId) {
    selectedDish = window.OsmanStore.getMenuItem(dishId);
    if (!selectedDish) return;

    const modal = document.getElementById('dishModal');
    const container = document.getElementById('dishModalContent');

    const optionsHtml = [];
    if (selectedDish.options) {
      if (selectedDish.options.spiceLevels) {
        optionsHtml.push(`
          <div class="option-group">
            <div class="option-group-title">Spice Level</div>
            <div class="option-pills" id="optSpice">
              ${selectedDish.options.spiceLevels.map((s, idx) => `
                <label class="option-pill ${idx === 0 ? 'selected' : ''}">
                  <input type="radio" name="spice" value="${s}" ${idx === 0 ? 'checked' : ''}> ${s}
                </label>
              `).join('')}
            </div>
          </div>
        `);
      }
      if (selectedDish.options.sauces) {
        optionsHtml.push(`
          <div class="option-group">
            <div class="option-group-title">Choice of Dipping Sauce</div>
            <div class="option-pills" id="optSauce">
              ${selectedDish.options.sauces.map((sauce, idx) => `
                <label class="option-pill ${idx === 0 ? 'selected' : ''}">
                  <input type="radio" name="sauce" value="${sauce}" ${idx === 0 ? 'checked' : ''}> ${sauce}
                </label>
              `).join('')}
            </div>
          </div>
        `);
      }
      if (selectedDish.options.sides) {
        optionsHtml.push(`
          <div class="option-group">
            <div class="option-group-title">Choice of Side Dish</div>
            <div class="option-pills" id="optSide">
              ${selectedDish.options.sides.map((side, idx) => `
                <label class="option-pill ${idx === 0 ? 'selected' : ''}">
                  <input type="radio" name="side" value="${side}" ${idx === 0 ? 'checked' : ''}> ${side}
                </label>
              `).join('')}
            </div>
          </div>
        `);
      }
    }

    container.innerHTML = `
      <img src="${selectedDish.image}" class="modal-dish-img" alt="${selectedDish.name}">
      <div style="padding: 1.5rem;">
        <h2 style="font-family:var(--font-heading); color:var(--color-ocean-deep); font-size:1.8rem;">${selectedDish.name}</h2>
        <p style="color:var(--color-text-muted); margin-top:0.5rem; margin-bottom:1.5rem;">${selectedDish.description}</p>
        
        ${optionsHtml.join('')}

        <div class="form-group">
          <label class="form-label">Special Cooking Instructions</label>
          <textarea id="dishSpecialNotes" class="form-control" rows="2" placeholder="e.g. Extra sauce on side, low salt..."></textarea>
        </div>

        <div style="display:flex; align-items:center; justify-content:space-between; margin-top:1.5rem; padding-top:1.5rem; border-top:var(--border-light);">
          <div class="qty-control">
            <button class="qty-btn" id="modalQtyMinus">-</button>
            <span class="qty-val" id="modalQtyVal">1</span>
            <button class="qty-btn" id="modalQtyPlus">+</button>
          </div>
          <div>
            <span style="font-size:0.9rem; color:var(--color-text-muted);">Total Price:</span>
            <span id="modalTotalPrice" style="font-family:var(--font-heading); font-size:1.6rem; font-weight:700; color:var(--color-ocean-deep); margin-left:0.5rem;">$${selectedDish.price.toFixed(2)}</span>
          </div>
        </div>
        <button id="btnModalAddToCart" class="btn btn-flame" style="width:100%; margin-top:1.5rem;">Add to Order — $${selectedDish.price.toFixed(2)}</button>
      </div>
    `;

    container.querySelectorAll('.option-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        const group = pill.closest('.option-pills');
        group.querySelectorAll('.option-pill').forEach(p => p.classList.remove('selected'));
        pill.classList.add('selected');
        const radio = pill.querySelector('input');
        if (radio) radio.checked = true;
      });
    });

    let currentQty = 1;
    const qtyVal = container.querySelector('#modalQtyVal');
    const totalPriceSpan = container.querySelector('#modalTotalPrice');
    const addBtn = container.querySelector('#btnModalAddToCart');

    const updatePrice = () => {
      const tot = (selectedDish.price * currentQty).toFixed(2);
      qtyVal.textContent = currentQty;
      totalPriceSpan.textContent = `$${tot}`;
      addBtn.textContent = `Add to Order — $${tot}`;
    };

    container.querySelector('#modalQtyMinus').addEventListener('click', () => {
      if (currentQty > 1) { currentQty--; updatePrice(); }
    });

    container.querySelector('#modalQtyPlus').addEventListener('click', () => {
      currentQty++; updatePrice();
    });

    addBtn.addEventListener('click', () => {
      const selectedOptionsList = [];
      container.querySelectorAll('.option-pill.selected input').forEach(inp => {
        selectedOptionsList.push(`${inp.name.toUpperCase()}: ${inp.value}`);
      });
      const specialNotes = container.querySelector('#dishSpecialNotes').value.trim();
      if (specialNotes) selectedOptionsList.push(`Notes: ${specialNotes}`);

      const customizationStr = selectedOptionsList.join(' | ') || 'Standard Prep';

      window.OsmanStore.addToCart(selectedDish, currentQty, customizationStr);
      closeModal(modal);
      showToast(`Added ${currentQty}x ${selectedDish.name} to cart!`, 'success');
      openCartDrawer();
    });

    openModal(modal);
  }

  function openCartDrawer() {
    const drawer = document.getElementById('cartDrawer');
    if (drawer) drawer.classList.add('active');
  }

  function closeCartDrawer() {
    const drawer = document.getElementById('cartDrawer');
    if (drawer) drawer.classList.remove('active');
  }

  function updateCartUI() {
    const cart = window.OsmanStore.getCart();
    const totals = window.OsmanStore.getCartTotals(activePromoCode);

    const badge = document.getElementById('navCartBadge');
    if (badge) badge.textContent = totals.itemCount;

    const cartList = document.getElementById('cartDrawerItems');
    if (!cartList) return;

    if (cart.length === 0) {
      cartList.innerHTML = `
        <div style="text-align:center; padding: 4rem 1rem; color: var(--color-text-muted);">
          <svg class="icon" style="width:48px;height:48px;margin-bottom:1rem;color:var(--color-flame-amber);" viewBox="0 0 24 24"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0"/></svg>
          <h4 style="font-size:1.2rem; color:var(--color-ocean-deep);">Your cart is empty</h4>
          <p style="font-size:0.9rem; margin-top:0.4rem;">Browse our seafood and flame-grilled dishes to begin your order.</p>
        </div>
      `;
    } else {
      cartList.innerHTML = cart.map((item, index) => `
        <div class="cart-item">
          <img src="${item.image}" class="cart-item-img" alt="${item.name}">
          <div class="cart-item-details">
            <div class="cart-item-title">${item.name}</div>
            <div class="cart-item-custom">${item.customization}</div>
            <div class="cart-item-price">$${(item.price * item.quantity).toFixed(2)}</div>
          </div>
          <div style="display:flex; flex-direction:column; align-items:flex-end; justify-content:space-between;">
            <button class="cart-remove-btn" data-index="${index}" style="background:none;border:none;color:#EF4444;cursor:pointer;">
              <svg class="icon" viewBox="0 0 24 24"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
            </button>
            <div class="qty-control" style="transform:scale(0.85); transform-origin:right bottom;">
              <button class="qty-btn cart-qty-minus" data-index="${index}">-</button>
              <span class="qty-val">${item.quantity}</span>
              <button class="qty-btn cart-qty-plus" data-index="${index}">+</button>
            </div>
          </div>
        </div>
      `).join('');

      cartList.querySelectorAll('.cart-qty-minus').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const idx = parseInt(e.currentTarget.getAttribute('data-index'));
          window.OsmanStore.updateCartQuantity(idx, cart[idx].quantity - 1);
        });
      });

      cartList.querySelectorAll('.cart-qty-plus').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const idx = parseInt(e.currentTarget.getAttribute('data-index'));
          window.OsmanStore.updateCartQuantity(idx, cart[idx].quantity + 1);
        });
      });

      cartList.querySelectorAll('.cart-remove-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const idx = parseInt(e.currentTarget.getAttribute('data-index'));
          window.OsmanStore.removeFromCart(idx);
        });
      });
    }

    document.getElementById('cartSubtotal').textContent = `$${totals.subtotal.toFixed(2)}`;
    document.getElementById('cartTax').textContent = `$${totals.tax.toFixed(2)}`;
    document.getElementById('cartDeliveryFee').textContent = totals.deliveryFee === 0 ? 'FREE' : `$${totals.deliveryFee.toFixed(2)}`;
    document.getElementById('cartDiscount').textContent = `-$${totals.discount.toFixed(2)}`;
    document.getElementById('cartTotal').textContent = `$${totals.total.toFixed(2)}`;

    const checkoutBtn = document.getElementById('btnOpenCheckout');
    if (checkoutBtn) checkoutBtn.disabled = cart.length === 0;
  }

  const promoBtn = document.getElementById('btnApplyPromo');
  if (promoBtn) {
    promoBtn.addEventListener('click', () => {
      const codeInput = document.getElementById('cartPromoInput');
      const code = codeInput ? codeInput.value.trim() : '';
      if (code.toUpperCase() === 'OSMAN10' || code.toUpperCase() === 'FRESHCATCH') {
        activePromoCode = code;
        updateCartUI();
        showToast(`Promo Code "${code.toUpperCase()}" Applied!`, 'success');
      } else {
        showToast('Invalid promo code. Try "OSMAN10" or "FRESHCATCH".', 'error');
      }
    });
  }

  const checkoutBtn = document.getElementById('btnOpenCheckout');
  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', () => {
      closeCartDrawer();
      openCheckoutModal();
    });
  }

  function openCheckoutModal() {
    const modal = document.getElementById('checkoutModal');
    if (!modal) return;

    // Auto-fill logged-in customer info if available
    if (window.OsmanAuth && window.OsmanAuth.isLoggedIn()) {
      const user = window.OsmanAuth.getCurrentUser();
      const nameInput = document.getElementById('checkoutName');
      const phoneInput = document.getElementById('checkoutPhone');
      if (nameInput && !nameInput.value) nameInput.value = user.name || '';
      if (phoneInput && !phoneInput.value) phoneInput.value = user.phone || '';
    }

    const orderTypeSelect = document.getElementById('checkoutOrderType');
    const tableField = document.getElementById('fieldTableNumber');
    const addressField = document.getElementById('fieldDeliveryAddress');
    const pickupField = document.getElementById('fieldPickupTime');

    const updateFields = () => {
      const val = orderTypeSelect.value;
      if (val === 'Dine-In') {
        tableField.style.display = 'block';
        addressField.style.display = 'none';
        pickupField.style.display = 'none';
      } else if (val === 'Delivery') {
        tableField.style.display = 'none';
        addressField.style.display = 'block';
        pickupField.style.display = 'none';
      } else {
        tableField.style.display = 'none';
        addressField.style.display = 'none';
        pickupField.style.display = 'block';
      }
    };

    orderTypeSelect.addEventListener('change', updateFields);
    updateFields();

    openModal(modal);
  }

  const checkoutForm = document.getElementById('checkoutForm');
  if (checkoutForm) {
    checkoutForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const customerName = document.getElementById('checkoutName').value.trim();
      const customerPhone = document.getElementById('checkoutPhone').value.trim();
      const orderType = document.getElementById('checkoutOrderType').value;
      const tableNumber = document.getElementById('checkoutTable').value.trim();
      const deliveryAddress = document.getElementById('checkoutAddress').value.trim();
      const pickupTime = document.getElementById('checkoutPickupTime').value.trim();
      const paymentMethod = document.getElementById('checkoutPaymentMethod').value;
      const notes = document.getElementById('checkoutNotes').value.trim();

      if (!customerName || !customerPhone) {
        showToast('Please enter your name and phone number.', 'error');
        return;
      }

      const orderData = {
        customerName,
        customerPhone,
        orderType,
        tableNumber,
        deliveryAddress,
        pickupTime,
        paymentMethod,
        notes,
        promoCode: activePromoCode
      };

      const createdOrder = window.OsmanStore.createOrder(orderData);
      closeModal(document.getElementById('checkoutModal'));
      openOrderConfirmationModal(createdOrder);
    });
  }

  function openOrderConfirmationModal(order) {
    const modal = document.getElementById('confirmationModal');
    if (!modal) return;

    document.getElementById('confOrderId').textContent = order.id;
    document.getElementById('confCustName').textContent = order.customerName;
    document.getElementById('confOrderType').textContent = order.orderType;
    document.getElementById('confTotal').textContent = `$${order.total.toFixed(2)}`;

    openModal(modal);

    const btnTrack = document.getElementById('btnTrackOrderFromConf');
    if (btnTrack) {
      btnTrack.onclick = () => {
        closeModal(modal);
        openTrackerModal(order.id);
      };
    }
  }

  function checkActiveOrders() {
    const orders = window.OsmanStore.getOrders();
    const active = orders.find(o => o.status !== 'Completed' && o.status !== 'Cancelled');
    const badge = document.getElementById('navTrackerPulse');
    if (badge) {
      badge.style.display = active ? 'inline-block' : 'none';
    }
  }

  const navTrackerBtn = document.getElementById('navTrackerBtn');
  if (navTrackerBtn) {
    navTrackerBtn.addEventListener('click', () => {
      const orders = window.OsmanStore.getOrders();
      if (orders.length === 0) {
        showToast('No recent orders found to track.', 'error');
        return;
      }
      openTrackerModal(orders[0].id);
    });
  }

  function openTrackerModal(orderId) {
    const modal = document.getElementById('trackerModal');
    if (!modal) return;

    const order = window.OsmanStore.getOrder(orderId);
    if (!order) return;

    document.getElementById('trackOrderId').textContent = order.id;
    document.getElementById('trackOrderType').textContent = order.orderType;
    document.getElementById('trackOrderItems').innerHTML = order.items.map(i => `
      <div style="display:flex;justify-content:space-between;font-size:0.9rem;margin-bottom:0.3rem;">
        <span>${i.quantity}x ${i.name}</span>
        <strong>$${(i.price * i.quantity).toFixed(2)}</strong>
      </div>
    `).join('');
    document.getElementById('trackOrderTotal').textContent = `$${order.total.toFixed(2)}`;

    const steps = [
      { id: 'step-pending', label: 'Order Placed', statuses: ['Pending', 'Preparing', 'Ready', 'Out for Delivery', 'Completed'] },
      { id: 'step-preparing', label: 'Kitchen Prep', statuses: ['Preparing', 'Ready', 'Out for Delivery', 'Completed'] },
      { id: 'step-ready', label: order.orderType === 'Delivery' ? 'Out for Delivery' : 'Ready for Pickup', statuses: ['Ready', 'Out for Delivery', 'Completed'] },
      { id: 'step-completed', label: 'Completed', statuses: ['Completed'] }
    ];

    steps.forEach(s => {
      const el = document.getElementById(s.id);
      if (el) {
        if (s.statuses.includes(order.status)) {
          el.classList.add('active');
        } else {
          el.classList.remove('active');
        }
      }
    });

    openModal(modal);
  }

  function updateTrackerModalIfOpen() {
    const modal = document.getElementById('trackerModal');
    if (modal && modal.classList.contains('active')) {
      const orderId = document.getElementById('trackOrderId').textContent;
      if (orderId) openTrackerModal(orderId);
    }
  }

  const reservationForm = document.getElementById('reservationForm');
  if (reservationForm) {
    reservationForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('resName').value.trim();
      const phone = document.getElementById('resPhone').value.trim();
      const date = document.getElementById('resDate').value;
      const time = document.getElementById('resTime').value;
      const guests = document.getElementById('resGuests').value;
      const notes = document.getElementById('resNotes').value.trim();

      const newRes = window.OsmanStore.createReservation({ name, phone, date, time, guests, notes });
      showToast(`Reservation #${newRes.id} Confirmed for ${date} at ${time}!`, 'success');
      reservationForm.reset();
    });
  }

  const searchInput = document.getElementById('menuSearchInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      renderMenuGrid();
    });
  }

  function openModal(modal) { if (modal) modal.classList.add('active'); }
  function closeModal(modal) { if (modal) modal.classList.remove('active'); }

  function setupEventListeners() {
    document.querySelectorAll('.modal-close, [data-close-modal]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        closeModal(e.currentTarget.closest('.modal-overlay'));
      });
    });

    const navCartBtn = document.getElementById('navCartBtn');
    if (navCartBtn) navCartBtn.addEventListener('click', openCartDrawer);

    const closeCartBtn = document.getElementById('closeCartBtn');
    if (closeCartBtn) closeCartBtn.addEventListener('click', closeCartDrawer);
  }

  function showToast(message, type = 'info') {
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <svg class="icon" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/></svg>
      <span>${message}</span>
    `;

    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
  }
});
