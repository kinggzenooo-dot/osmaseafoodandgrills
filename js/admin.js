/**
 * Osman's Seafoods and Grill — Administrator Management Console Script
 * Full CRUD operations for Menu, Categories, Inventory, Staff, Orders Audit, Analytics, and Settings.
 */

document.addEventListener('DOMContentLoaded', () => {
  let activeTab = 'dashboard';
  let editingMenuId = null;

  initNavigation();
  renderCurrentTab();

  window.addEventListener('osman_store_change', () => {
    renderCurrentTab();
  });

  function initNavigation() {
    const links = document.querySelectorAll('.admin-nav-link');
    links.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        links.forEach(l => l.classList.remove('active'));
        e.currentTarget.classList.add('active');
        activeTab = e.currentTarget.getAttribute('data-tab');

        const titleEl = document.getElementById('adminPageTitle');
        if (titleEl) titleEl.textContent = e.currentTarget.textContent.trim();

        document.querySelectorAll('.admin-tab-content').forEach(c => c.style.display = 'none');
        const activeSection = document.getElementById(`tab-${activeTab}`);
        if (activeSection) activeSection.style.display = 'block';

        renderCurrentTab();
      });
    });
  }

  function renderCurrentTab() {
    switch (activeTab) {
      case 'dashboard': renderDashboard(); break;
      case 'menu': renderMenuManagement(); break;
      case 'categories': renderCategoryManagement(); break;
      case 'inventory': renderInventoryManagement(); break;
      case 'orders': renderOrdersAudit(); break;
      case 'customers': renderCustomerDirectory(); break;
      case 'staff': renderStaffManagement(); break;
      case 'analytics': renderAnalytics(); break;
      case 'settings': renderSettings(); break;
    }
  }

  function renderDashboard() {
    const orders = window.OsmanStore.getOrders();
    const inventory = window.OsmanStore.getInventory();

    const totalRevenue = orders.reduce((sum, o) => sum + (o.paymentStatus === 'Paid' ? o.total : 0), 0);
    const totalOrders = orders.length;
    const avgOrderValue = totalOrders > 0 ? (totalRevenue / totalOrders) : 0;
    const lowStockCount = inventory.filter(i => i.stock <= i.alertThreshold).length;

    document.getElementById('dashMetricRevenue').textContent = `$${totalRevenue.toFixed(2)}`;
    document.getElementById('dashMetricOrders').textContent = totalOrders;
    document.getElementById('dashMetricAvgValue').textContent = `$${avgOrderValue.toFixed(2)}`;
    document.getElementById('dashMetricLowStock').textContent = lowStockCount;

    renderSalesTrendChart();
    renderRecentOrdersFeed(orders.slice(0, 5));
  }

  function renderSalesTrendChart() {
    const chartContainer = document.getElementById('salesTrendChart');
    if (!chartContainer) return;

    chartContainer.innerHTML = `
      <svg width="100%" height="220" viewBox="0 0 600 200" preserveAspectRatio="none">
        <defs>
          <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#FF6500" stop-opacity="0.4"/>
            <stop offset="100%" stop-color="#FF6500" stop-opacity="0"/>
          </linearGradient>
        </defs>
        <line x1="0" y1="40" x2="600" y2="40" stroke="#E2E8F0" stroke-dasharray="4"/>
        <line x1="0" y1="100" x2="600" y2="100" stroke="#E2E8F0" stroke-dasharray="4"/>
        <line x1="0" y1="160" x2="600" y2="160" stroke="#E2E8F0" stroke-dasharray="4"/>
        
        <path d="M 20,160 Q 100,60 200,120 T 400,50 T 580,90 L 580,180 L 20,180 Z" fill="url(#chartGrad)"/>
        <path d="M 20,160 Q 100,60 200,120 T 400,50 T 580,90" fill="none" stroke="#FF6500" stroke-width="3"/>
        <circle cx="20" cy="160" r="5" fill="#FF6500"/>
        <circle cx="200" cy="120" r="5" fill="#FF6500"/>
        <circle cx="400" cy="50" r="5" fill="#FF6500"/>
        <circle cx="580" cy="90" r="5" fill="#FF6500"/>
      </svg>
    `;
  }

  function renderRecentOrdersFeed(recentOrders) {
    const body = document.getElementById('dashRecentOrdersBody');
    if (!body) return;

    body.innerHTML = recentOrders.map(o => `
      <tr>
        <td><strong>${o.id}</strong></td>
        <td>${o.customerName}</td>
        <td><span class="badge badge-navy">${o.orderType}</span></td>
        <td><strong>$${o.total.toFixed(2)}</strong></td>
        <td><span class="badge ${o.status === 'Completed' ? 'badge-success' : 'badge-warning'}">${o.status}</span></td>
        <td>${new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
      </tr>
    `).join('');
  }

  function renderMenuManagement() {
    const tableBody = document.getElementById('adminMenuTableBody');
    if (!tableBody) return;

    const menu = window.OsmanStore.getMenu();

    tableBody.innerHTML = menu.map(item => `
      <tr>
        <td><img src="${item.image}" class="table-img-thumb" alt="${item.name}"></td>
        <td><strong>${item.name}</strong></td>
        <td><span class="badge badge-gold">${item.category}</span></td>
        <td><strong>$${item.price.toFixed(2)}</strong></td>
        <td>${item.spiceLevel !== 'None' ? `🔥 ${item.spiceLevel}` : 'Standard'}</td>
        <td>
          <label class="switch">
            <input type="checkbox" class="toggle-availability" data-id="${item.id}" ${item.available ? 'checked' : ''}>
            <span class="slider"></span>
          </label>
        </td>
        <td>
          <button class="btn btn-secondary btn-sm btn-edit-menu" data-id="${item.id}">Edit</button>
          <button class="btn btn-danger btn-sm btn-delete-menu" data-id="${item.id}">Delete</button>
        </td>
      </tr>
    `).join('');

    tableBody.querySelectorAll('.toggle-availability').forEach(inp => {
      inp.addEventListener('change', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        window.OsmanStore.toggleMenuItemAvailability(id);
        showToast('Updated item availability', 'info');
      });
    });

    tableBody.querySelectorAll('.btn-edit-menu').forEach(btn => {
      btn.addEventListener('click', (e) => {
        openMenuModal(e.currentTarget.getAttribute('data-id'));
      });
    });

    tableBody.querySelectorAll('.btn-delete-menu').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        if (confirm('Are you sure you want to delete this menu dish?')) {
          window.OsmanStore.deleteMenuItem(id);
          showToast('Menu dish deleted', 'success');
        }
      });
    });
  }

  const btnAddDish = document.getElementById('btnOpenAddMenuModal');
  if (btnAddDish) {
    btnAddDish.addEventListener('click', () => openMenuModal(null));
  }

  function openMenuModal(id) {
    editingMenuId = id;
    const modal = document.getElementById('menuFormModal');
    const form = document.getElementById('menuForm');
    const categories = window.OsmanStore.getCategories();

    const catSelect = document.getElementById('menuFormCategory');
    catSelect.innerHTML = categories.map(c => `<option value="${c.name}">${c.name}</option>`).join('');

    if (id) {
      const item = window.OsmanStore.getMenuItem(id);
      document.getElementById('menuModalTitle').textContent = 'Edit Menu Dish';
      document.getElementById('menuFormName').value = item.name;
      catSelect.value = item.category;
      document.getElementById('menuFormPrice').value = item.price;
      document.getElementById('menuFormImage').value = item.image;
      document.getElementById('menuFormDesc').value = item.description;
      document.getElementById('menuFormSpice').value = item.spiceLevel || 'None';
      document.getElementById('menuFormPrepTime').value = item.prepTime || 15;
    } else {
      document.getElementById('menuModalTitle').textContent = 'Add New Menu Dish';
      form.reset();
    }

    openModal(modal);
  }

  const menuForm = document.getElementById('menuForm');
  if (menuForm) {
    menuForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const itemData = {
        id: editingMenuId || undefined,
        name: document.getElementById('menuFormName').value.trim(),
        category: document.getElementById('menuFormCategory').value,
        price: parseFloat(document.getElementById('menuFormPrice').value) || 0,
        image: document.getElementById('menuFormImage').value.trim(),
        description: document.getElementById('menuFormDesc').value.trim(),
        spiceLevel: document.getElementById('menuFormSpice').value,
        prepTime: parseInt(document.getElementById('menuFormPrepTime').value) || 15,
        tags: ['Chef Special']
      };

      window.OsmanStore.saveMenuItem(itemData);
      closeModal(document.getElementById('menuFormModal'));
      showToast(editingMenuId ? 'Dish updated successfully!' : 'New dish added to menu!', 'success');
    });
  }

  function renderCategoryManagement() {
    const body = document.getElementById('adminCatTableBody');
    if (!body) return;

    const categories = window.OsmanStore.getCategories();
    const menu = window.OsmanStore.getMenu();

    body.innerHTML = categories.map(cat => {
      const dishCount = menu.filter(m => m.category === cat.name).length;
      return `
        <tr>
          <td><strong>${cat.id}</strong></td>
          <td><strong>${cat.name}</strong></td>
          <td><code>${cat.slug}</code></td>
          <td><span class="badge badge-navy">${dishCount} Dishes</span></td>
          <td>
            <button class="btn btn-secondary btn-sm btn-edit-cat" data-id="${cat.id}">Edit</button>
            <button class="btn btn-danger btn-sm btn-delete-cat" data-id="${cat.id}">Delete</button>
          </td>
        </tr>
      `;
    }).join('');

    body.querySelectorAll('.btn-delete-cat').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        if (confirm('Delete this category?')) {
          window.OsmanStore.deleteCategory(id);
          showToast('Category deleted', 'success');
        }
      });
    });
  }

  function renderInventoryManagement() {
    const body = document.getElementById('adminInventoryTableBody');
    if (!body) return;

    const inventory = window.OsmanStore.getInventory();

    body.innerHTML = inventory.map(item => {
      let statusBadge = '<span class="badge badge-success">In Stock</span>';
      if (item.stock === 0) statusBadge = '<span class="badge badge-danger">Out of Stock</span>';
      else if (item.stock <= item.alertThreshold) statusBadge = '<span class="badge badge-warning">Low Stock</span>';

      return `
        <tr>
          <td><strong>${item.name}</strong></td>
          <td>${item.category}</td>
          <td><strong>${item.stock}</strong> ${item.unit}</td>
          <td>${item.alertThreshold} ${item.unit}</td>
          <td>$${item.costPerUnit.toFixed(2)} / ${item.unit}</td>
          <td>${statusBadge}</td>
          <td>
            <button class="btn btn-flame btn-sm btn-restock-inv" data-id="${item.id}">+ Restock</button>
            <button class="btn btn-danger btn-sm btn-delete-inv" data-id="${item.id}">Delete</button>
          </td>
        </tr>
      `;
    }).join('');

    body.querySelectorAll('.btn-restock-inv').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        const qtyStr = prompt('Enter quantity to add to stock:', '10');
        if (qtyStr) {
          const qty = parseInt(qtyStr);
          if (!isNaN(qty) && qty > 0) {
            window.OsmanStore.updateInventoryStock(id, qty);
            showToast('Inventory restocked successfully!', 'success');
          }
        }
      });
    });
  }

  function renderOrdersAudit() {
    const body = document.getElementById('adminOrdersTableBody');
    if (!body) return;

    const orders = window.OsmanStore.getOrders();

    body.innerHTML = orders.map(order => `
      <tr>
        <td><strong>${order.id}</strong></td>
        <td>${order.customerName}<br><small style="color:#64748B;">${order.customerPhone}</small></td>
        <td><span class="badge badge-navy">${order.orderType}</span></td>
        <td><strong>$${order.total.toFixed(2)}</strong></td>
        <td><span class="badge ${order.paymentStatus === 'Paid' ? 'badge-success' : 'badge-warning'}">${order.paymentStatus}</span></td>
        <td>
          <select class="form-control admin-status-select" data-id="${order.id}" style="padding:0.3rem 0.6rem; font-size:0.85rem;">
            <option value="Pending" ${order.status === 'Pending' ? 'selected' : ''}>Pending</option>
            <option value="Preparing" ${order.status === 'Preparing' ? 'selected' : ''}>Preparing</option>
            <option value="Ready" ${order.status === 'Ready' ? 'selected' : ''}>Ready</option>
            <option value="Completed" ${order.status === 'Completed' ? 'selected' : ''}>Completed</option>
            <option value="Cancelled" ${order.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
          </select>
        </td>
        <td>${new Date(order.createdAt).toLocaleString()}</td>
      </tr>
    `).join('');

    body.querySelectorAll('.admin-status-select').forEach(sel => {
      sel.addEventListener('change', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        const newStatus = e.currentTarget.value;
        window.OsmanStore.updateOrderStatus(id, newStatus);
        showToast(`Updated order ${id} status to ${newStatus}`, 'success');
      });
    });
  }

  function renderCustomerDirectory() {
    const body = document.getElementById('adminCustTableBody');
    if (!body) return;

    const orders = window.OsmanStore.getOrders();
    const customerMap = {};

    orders.forEach(o => {
      if (!customerMap[o.customerPhone]) {
        customerMap[o.customerPhone] = {
          name: o.customerName,
          phone: o.customerPhone,
          ordersCount: 0,
          totalSpent: 0,
          lastOrder: o.createdAt
        };
      }
      customerMap[o.customerPhone].ordersCount += 1;
      customerMap[o.customerPhone].totalSpent += o.total;
    });

    const customers = Object.values(customerMap);

    body.innerHTML = customers.map(c => `
      <tr>
        <td><strong>${c.name}</strong></td>
        <td>${c.phone}</td>
        <td><span class="badge badge-navy">${c.ordersCount} Orders</span></td>
        <td><strong>$${c.totalSpent.toFixed(2)}</strong></td>
        <td>${new Date(c.lastOrder).toLocaleDateString()}</td>
      </tr>
    `).join('');
  }

  function renderStaffManagement() {
    const body = document.getElementById('adminStaffTableBody');
    if (!body) return;

    const staff = window.OsmanStore.getStaff();

    body.innerHTML = staff.map(s => `
      <tr>
        <td><strong>${s.name}</strong></td>
        <td><span class="badge badge-gold">${s.role}</span></td>
        <td>${s.phone}</td>
        <td><code>${s.pin}</code></td>
        <td><span class="badge ${s.active ? 'badge-success' : 'badge-danger'}">${s.active ? 'Active' : 'Inactive'}</span></td>
        <td>
          <button class="btn btn-danger btn-sm btn-delete-staff" data-id="${s.id}">Delete</button>
        </td>
      </tr>
    `).join('');
  }

  function renderAnalytics() {
    const orders = window.OsmanStore.getOrders();
    const totalRev = orders.reduce((sum, o) => sum + o.total, 0);

    const el = document.getElementById('analyticsRevSummary');
    if (el) {
      el.innerHTML = `
        <div style="background:#FFF; padding:2rem; border-radius:var(--radius-md); border:var(--border-light);">
          <h3>Total Generated Sales</h3>
          <h1 style="font-size:3rem; color:var(--color-flame-amber); margin:1rem 0;">$${totalRev.toFixed(2)}</h1>
          <p style="color:var(--color-text-muted);">From ${orders.length} processed customer orders.</p>
        </div>
      `;
    }
  }

  function renderSettings() {
    const settings = window.OsmanStore.getSettings();
    document.getElementById('settRestName').value = settings.restaurantName;
    document.getElementById('settTaxRate').value = settings.taxRate;
    document.getElementById('settDeliveryFee').value = settings.deliveryFee;
    document.getElementById('settFreeThreshold').value = settings.freeDeliveryThreshold;
    document.getElementById('settHours').value = settings.openingHours;
  }

  const settingsForm = document.getElementById('settingsForm');
  if (settingsForm) {
    settingsForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const updated = {
        restaurantName: document.getElementById('settRestName').value.trim(),
        taxRate: parseFloat(document.getElementById('settTaxRate').value) || 0,
        deliveryFee: parseFloat(document.getElementById('settDeliveryFee').value) || 0,
        freeDeliveryThreshold: parseFloat(document.getElementById('settFreeThreshold').value) || 0,
        openingHours: document.getElementById('settHours').value.trim()
      };
      window.OsmanStore.saveSettings(updated);
      showToast('System Settings saved!', 'success');
    });
  }

  const btnResetSeed = document.getElementById('btnResetSeedData');
  if (btnResetSeed) {
    btnResetSeed.addEventListener('click', () => {
      if (confirm('Are you sure you want to reset all data back to original seed data? All custom orders and menu modifications will be reset.')) {
        window.OsmanStore.resetToSeedData();
        showToast('System data reset to initial seed data!', 'success');
        location.reload();
      }
    });
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
