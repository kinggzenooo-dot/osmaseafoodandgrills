/**
 * Osman's Seafoods and Grill — Staff Operations Script
 * Handles Cashier POS, Kitchen KDS timers, Delivery Dispatch, POS order entry, and receipt printing.
 */

document.addEventListener('DOMContentLoaded', () => {
  let activeStation = 'cashier'; // 'cashier' | 'kds' | 'dispatch'
  let cashierStatusFilter = 'all';
  let searchQuery = '';
  let soundEnabled = true;
  let previousPendingCount = 0;

  initStationTabs();

  // Auto-switch based on URL param or assigned user role
  const urlStation = new URLSearchParams(window.location.search).get('station');
  if (urlStation) {
    const tab = document.querySelector(`.station-tab[data-station="${urlStation}"]`);
    if (tab) tab.click();
  } else if (window.OsmanAuth && window.OsmanAuth.isLoggedIn()) {
    const u = window.OsmanAuth.getCurrentUser();
    if (u.subrole === 'kds') {
      const tab = document.querySelector('.station-tab[data-station="kds"]');
      if (tab) tab.click();
    } else if (u.subrole === 'dispatch') {
      const tab = document.querySelector('.station-tab[data-station="dispatch"]');
      if (tab) tab.click();
    }
  }

  renderCurrentStation();
  setupEventListeners();

  window.addEventListener('osman_store_change', () => {
    checkNewOrdersSound();
    renderCurrentStation();
  });

  function initStationTabs() {
    const tabs = document.querySelectorAll('.station-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        tabs.forEach(t => t.classList.remove('active'));
        e.currentTarget.classList.add('active');
        activeStation = e.currentTarget.getAttribute('data-station');

        document.getElementById('viewCashier').style.display = activeStation === 'cashier' ? 'block' : 'none';
        document.getElementById('viewKDS').style.display = activeStation === 'kds' ? 'block' : 'none';
        document.getElementById('viewDispatch').style.display = activeStation === 'dispatch' ? 'block' : 'none';

        renderCurrentStation();
      });
    });
  }

  function renderCurrentStation() {
    if (activeStation === 'cashier') renderCashierPOS();
    else if (activeStation === 'kds') renderKitchenKDS();
    else if (activeStation === 'dispatch') renderDeliveryDispatch();
  }

  function renderCashierPOS() {
    const container = document.getElementById('cashierOrderGrid');
    if (!container) return;

    let orders = window.OsmanStore.getOrders();

    if (cashierStatusFilter !== 'all') {
      orders = orders.filter(o => o.status === cashierStatusFilter);
    }

    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      orders = orders.filter(o => o.id.toLowerCase().includes(q) || o.customerName.toLowerCase().includes(q) || o.customerPhone.includes(q));
    }

    if (orders.length === 0) {
      container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: #94A3B8;">
        <h3>No orders found.</h3>
      </div>`;
      return;
    }

    container.innerHTML = orders.map(order => `
      <div class="order-card-staff" data-id="${order.id}">
        <div class="order-card-header">
          <div>
            <span class="order-card-id">${order.id}</span>
            <div class="order-card-time">${new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
          </div>
          <span class="badge ${getStatusBadgeClass(order.status)}">${order.status}</span>
        </div>
        <div class="order-card-body">
          <div class="order-cust-info">
            <div>
              <strong>${order.customerName}</strong> (${order.customerPhone})
              <div style="font-size:0.8rem; color:#94A3B8;">Type: <strong>${order.orderType}</strong> ${order.tableNumber ? `(${order.tableNumber})` : ''}</div>
            </div>
            <span class="badge ${order.paymentStatus === 'Paid' ? 'badge-success' : 'badge-warning'}">${order.paymentStatus}</span>
          </div>

          <ul class="order-items-list">
            ${order.items.map(item => `
              <li class="order-item-row">
                <span><strong>${item.quantity}x</strong> ${item.name}</span>
                <span>$${(item.price * item.quantity).toFixed(2)}</span>
              </li>
              ${item.customization ? `<div class="order-item-customization">${item.customization}</div>` : ''}
            `).join('')}
          </ul>
        </div>
        <div class="order-card-footer">
          <span class="order-card-total">$${order.total.toFixed(2)}</span>
          <div style="display:flex; gap:0.4rem;">
            <button class="btn btn-secondary btn-sm btn-print-receipt" data-id="${order.id}">Receipt</button>
            ${renderCashierActionButtons(order)}
          </div>
        </div>
      </div>
    `).join('');

    container.querySelectorAll('.btn-update-status').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        const nextStatus = e.currentTarget.getAttribute('data-next');
        window.OsmanStore.updateOrderStatus(id, nextStatus);
        showToast(`Order ${id} updated to ${nextStatus}!`, 'success');
      });
    });

    container.querySelectorAll('.btn-print-receipt').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        openReceiptModal(id);
      });
    });
  }

  function renderCashierActionButtons(order) {
    if (order.status === 'Pending') {
      return `<button class="btn btn-flame btn-sm btn-update-status" data-id="${order.id}" data-next="Preparing">Accept & Prep</button>`;
    } else if (order.status === 'Preparing') {
      return `<button class="btn btn-navy btn-sm btn-update-status" data-id="${order.id}" data-next="Ready">Mark Ready</button>`;
    } else if (order.status === 'Ready') {
      return `<button class="btn btn-flame btn-sm btn-update-status" data-id="${order.id}" data-next="Completed">Complete</button>`;
    }
    return '';
  }

  function getStatusBadgeClass(status) {
    switch (status) {
      case 'Pending': return 'badge-warning';
      case 'Preparing': return 'badge-navy';
      case 'Ready': return 'badge-gold';
      case 'Completed': return 'badge-success';
      case 'Cancelled': return 'badge-danger';
      default: return 'badge-gold';
    }
  }

  function renderKitchenKDS() {
    const container = document.getElementById('kdsGrid');
    if (!container) return;

    let orders = window.OsmanStore.getOrders().filter(o => 
      o.status === 'Pending' || o.status === 'Preparing'
    );

    if (orders.length === 0) {
      container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 4rem; color: #94A3B8;">
        <h2>No Active Kitchen Tickets</h2>
        <p>All orders are prepped and completed!</p>
      </div>`;
      return;
    }

    container.innerHTML = orders.map(order => {
      const elapsedMins = Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 60000);
      const isUrgent = elapsedMins > 15;

      return `
        <div class="kds-ticket ${isUrgent ? 'urgent' : ''}" data-id="${order.id}">
          <div class="kds-ticket-header ${order.status.toLowerCase()}">
            <div>
              <span>${order.id}</span>
              <span style="font-size:0.8rem; opacity:0.8; margin-left:0.5rem;">(${order.orderType})</span>
            </div>
            <span class="kds-timer">⏱️ ${elapsedMins}m ago</span>
          </div>
          <div class="kds-ticket-body">
            ${order.items.map(item => `
              <div class="kds-item-line">
                <span class="kds-item-qty">${item.quantity}x</span>
                <div>
                  <div class="kds-item-title">${item.name}</div>
                  ${item.customization ? `<div class="kds-item-options">${item.customization}</div>` : ''}
                </div>
              </div>
            `).join('')}
          </div>
          <div class="kds-ticket-footer">
            ${order.status === 'Pending' ? `
              <button class="btn btn-flame btn-sm btn-kds-action" style="width:100%;" data-id="${order.id}" data-next="Preparing">Start Preparing</button>
            ` : `
              <button class="btn btn-navy btn-sm btn-kds-action" style="width:100%; background:#10B981;" data-id="${order.id}" data-next="Ready">Mark Ready</button>
            `}
          </div>
        </div>
      `;
    }).join('');

    container.querySelectorAll('.btn-kds-action').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        const next = e.currentTarget.getAttribute('data-next');
        window.OsmanStore.updateOrderStatus(id, next);
      });
    });
  }

  function renderDeliveryDispatch() {
    const container = document.getElementById('dispatchGrid');
    if (!container) return;

    let deliveryOrders = window.OsmanStore.getOrders().filter(o => o.orderType === 'Delivery' && o.status !== 'Completed' && o.status !== 'Cancelled');
    const drivers = window.OsmanStore.getStaff().filter(s => s.role.includes('Driver'));

    if (deliveryOrders.length === 0) {
      container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: #94A3B8;">
        <h3>No active deliveries pending.</h3>
      </div>`;
      return;
    }

    container.innerHTML = deliveryOrders.map(order => `
      <div class="dispatch-card">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
          <h4 style="color:var(--color-gold-accent); font-size:1.2rem;">${order.id}</h4>
          <span class="badge ${getStatusBadgeClass(order.status)}">${order.status}</span>
        </div>
        <div style="font-size:0.95rem; margin-bottom:0.5rem;">
          <strong>${order.customerName}</strong> — ${order.customerPhone}
        </div>
        <div style="color:#94A3B8; font-size:0.88rem; margin-bottom:1rem;">
          📍 Address: ${order.deliveryAddress || 'Standard Delivery Zone'}
        </div>
        ${order.notes ? `<div style="font-size:0.82rem; color:#F59E0B; margin-bottom:1rem;">Note: ${order.notes}</div>` : ''}
        
        <div style="margin-bottom:1rem;">
          <label style="display:block; font-size:0.8rem; text-transform:uppercase; color:#94A3B8; margin-bottom:0.3rem;">Assign Driver</label>
          <select class="form-control dispatch-driver-select" data-id="${order.id}" style="background:#0F172A; color:#FFF; border-color:#334155;">
            <option value="">-- Select Driver --</option>
            ${drivers.map(d => `<option value="${d.name}" ${order.assignedDriver === d.name ? 'selected' : ''}>${d.name}</option>`).join('')}
          </select>
        </div>

        <div style="display:flex; gap:0.5rem;">
          <button class="btn btn-navy btn-sm btn-dispatch-action" data-id="${order.id}" data-next="Out for Delivery" style="flex:1;">Out for Delivery</button>
          <button class="btn btn-flame btn-sm btn-dispatch-action" data-id="${order.id}" data-next="Completed" style="flex:1;">Delivered</button>
        </div>
      </div>
    `).join('');

    container.querySelectorAll('.dispatch-driver-select').forEach(sel => {
      sel.addEventListener('change', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        const driver = e.currentTarget.value;
        window.OsmanStore.updateOrderStatus(id, window.OsmanStore.getOrder(id).status, { assignedDriver: driver });
        showToast(`Assigned ${driver} to order ${id}`, 'success');
      });
    });

    container.querySelectorAll('.btn-dispatch-action').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        const next = e.currentTarget.getAttribute('data-next');
        window.OsmanStore.updateOrderStatus(id, next);
        showToast(`Order ${id} marked as ${next}!`, 'success');
      });
    });
  }

  function openReceiptModal(orderId) {
    const order = window.OsmanStore.getOrder(orderId);
    if (!order) return;

    const receiptBox = document.getElementById('receiptContent');
    if (!receiptBox) return;

    receiptBox.innerHTML = `
      <div class="receipt-printable">
        <div class="receipt-header">
          <h2>OSMAN'S SEAFOODS & GRILL</h2>
          <div>742 Coastal Blvd, Harbor Bay</div>
          <div>Tel: +1 (555) 382-7626</div>
          <div class="receipt-divider"></div>
          <div>Order Ref: <strong>${order.id}</strong></div>
          <div>Date: ${new Date(order.createdAt).toLocaleString()}</div>
          <div>Type: ${order.orderType} ${order.tableNumber ? `(${order.tableNumber})` : ''}</div>
          <div>Customer: ${order.customerName}</div>
        </div>

        <table class="receipt-table">
          <thead>
            <tr><th>Item</th><th>Qty</th><th>Price</th></tr>
          </thead>
          <tbody>
            ${order.items.map(item => `
              <tr>
                <td>${item.name}</td>
                <td>${item.quantity}</td>
                <td>$${(item.price * item.quantity).toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="receipt-divider"></div>
        <div style="display:flex; justify-content:space-between;"><span>Subtotal:</span><span>$${order.subtotal.toFixed(2)}</span></div>
        <div style="display:flex; justify-content:space-between;"><span>Tax (8%):</span><span>$${order.tax.toFixed(2)}</span></div>
        ${order.deliveryFee > 0 ? `<div style="display:flex; justify-content:space-between;"><span>Delivery:</span><span>$${order.deliveryFee.toFixed(2)}</span></div>` : ''}
        ${order.discount > 0 ? `<div style="display:flex; justify-content:space-between;"><span>Discount:</span><span>-$${order.discount.toFixed(2)}</span></div>` : ''}
        <div class="receipt-divider"></div>
        <div style="display:flex; justify-content:space-between; font-weight:bold; font-size:1.1rem;"><span>TOTAL:</span><span>$${order.total.toFixed(2)}</span></div>
        <div style="display:flex; justify-content:space-between; margin-top:0.3rem;"><span>Payment:</span><span>${order.paymentMethod} (${order.paymentStatus})</span></div>
        
        <div style="text-align:center; margin-top:1.5rem; font-size:0.8rem;">
          *** Thank you for dining with Osman's! ***
        </div>
      </div>
    `;

    openModal(document.getElementById('receiptModal'));
  }

  function checkNewOrdersSound() {
    const orders = window.OsmanStore.getOrders();
    const pendingCount = orders.filter(o => o.status === 'Pending').length;
    if (pendingCount > previousPendingCount && soundEnabled) {
      playChimeSound();
    }
    previousPendingCount = pendingCount;
  }

  function playChimeSound() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch (e) {}
  }

  function setupEventListeners() {
    document.querySelectorAll('.modal-close, [data-close-modal]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        closeModal(e.currentTarget.closest('.modal-overlay'));
      });
    });

    const printBtn = document.getElementById('btnPrintReceiptAction');
    if (printBtn) {
      printBtn.addEventListener('click', () => {
        window.print();
      });
    }
  }

  function openModal(m) { if (m) m.classList.add('active'); }
  function closeModal(m) { if (m) m.classList.remove('active'); }

  function showToast(msg, type = 'info') {
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
    const t = document.createElement('div');
    t.className = `toast toast-${type}`;
    t.innerHTML = `<span>${msg}</span>`;
    container.appendChild(t);
    setTimeout(() => t.remove(), 3500);
  }
});
