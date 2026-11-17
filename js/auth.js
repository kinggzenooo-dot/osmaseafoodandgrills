/**
 * Osman's Seafoods and Grill — Authentication & Role Sync Module
 * Synchronizes user roles (Customer, Staff: Cashier/Chef/Driver, Admin)
 * Integrates with Python Flask Backend (/api/auth/*) and provides instant local fallback.
 */

(function () {
  const AUTH_STORAGE_KEY = 'osman_auth_session_v1';
  // Use relative URL on any hosted web server (Render, localhost, etc.)
  const API_BASE = window.location.protocol.startsWith('http')
    ? '' 
    : 'http://localhost:5000';

  // Demo seed accounts for 1-click login and offline fallback
  const DEMO_ACCOUNTS = [
    {
      id: 'usr-admin',
      name: 'Osman Al-Mansoor',
      email: 'admin@osmanseafoods.com',
      password: 'admin123',
      role: 'admin',
      subrole: 'owner',
      pin: '1001',
      phone: '+1 (555) 382-7626',
      avatar: 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&w=200&q=80',
      label: '👑 Admin (Owner)'
    },
    {
      id: 'usr-cashier',
      name: 'Maria Santos',
      email: 'cashier@osmanseafoods.com',
      password: 'staff123',
      role: 'staff',
      subrole: 'cashier',
      pin: '2002',
      phone: '+1 (555) 018-4921',
      avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=200&q=80',
      label: '💼 Cashier POS'
    },
    {
      id: 'usr-chef',
      name: 'Carlos Rivera',
      email: 'chef@osmanseafoods.com',
      password: 'chef123',
      role: 'staff',
      subrole: 'kds',
      pin: '3003',
      phone: '+1 (555) 017-7382',
      avatar: 'https://images.unsplash.com/photo-1583394293214-28ded15ee548?auto=format&fit=crop&w=200&q=80',
      label: '👨‍🍳 Kitchen KDS'
    },
    {
      id: 'usr-driver',
      name: 'David Vance',
      email: 'driver@osmanseafoods.com',
      password: 'driver123',
      role: 'staff',
      subrole: 'dispatch',
      pin: '4004',
      phone: '+1 (555) 016-3910',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
      label: '🛵 Delivery Dispatch'
    },
    {
      id: 'usr-customer',
      name: 'Elena Rostova',
      email: 'customer@gmail.com',
      password: 'customer123',
      role: 'customer',
      subrole: '',
      pin: '',
      phone: '+1 (555) 948-2019',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80',
      label: '👤 Customer'
    }
  ];

  class AuthManager {
    constructor() {
      this.channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('osman_auth_channel') : null;
      this.currentUser = this.loadSession();
      this.initEvents();
    }

    initEvents() {
      window.addEventListener('storage', (e) => {
        if (e.key === AUTH_STORAGE_KEY) {
          this.currentUser = this.loadSession();
          this.notifyAuthChange();
        }
      });

      if (this.channel) {
        this.channel.onmessage = (msg) => {
          if (msg.data && msg.data.type === 'AUTH_CHANGED') {
            this.currentUser = this.loadSession();
            this.notifyAuthChange();
          }
        };
      }
    }

    loadSession() {
      try {
        const raw = localStorage.getItem(AUTH_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          return parsed.user || null;
        }
      } catch (e) {
        console.warn('Error reading auth session:', e);
      }
      return null;
    }

    getToken() {
      try {
        const raw = localStorage.getItem(AUTH_STORAGE_KEY);
        if (raw) return JSON.parse(raw).token || '';
      } catch (e) {}
      return '';
    }

    saveSession(user, token) {
      this.currentUser = user;
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ user, token }));
      this.notifyAuthChange();
      if (this.channel) {
        this.channel.postMessage({ type: 'AUTH_CHANGED', timestamp: Date.now() });
      }
    }

    clearSession() {
      this.currentUser = null;
      localStorage.removeItem(AUTH_STORAGE_KEY);
      this.notifyAuthChange();
      if (this.channel) {
        this.channel.postMessage({ type: 'AUTH_CHANGED', timestamp: Date.now() });
      }
    }

    notifyAuthChange() {
      window.dispatchEvent(new CustomEvent('osman_auth_state_changed', { detail: { user: this.currentUser } }));
    }

    getCurrentUser() {
      return this.currentUser;
    }

    isLoggedIn() {
      return !!this.currentUser;
    }

    hasRole(roles) {
      if (!this.currentUser) return false;
      if (typeof roles === 'string') roles = [roles];
      return roles.includes(this.currentUser.role);
    }

    getDemoAccounts() {
      return DEMO_ACCOUNTS;
    }

    // Attempt API login, fall back to local seed accounts
    async login(email, password) {
      email = email.trim().toLowerCase();
      
      // 1. Try Backend API with 3.5s timeout for fast responsiveness (handles Render cold starts)
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);

        const resp = await fetch(`${API_BASE}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        const data = await resp.json();
        if (data.success && data.user) {
          this.saveSession(data.user, data.token);
          return { success: true, user: data.user, message: data.message };
        } else if (resp.status === 401) {
          // If server returned 401, check if it's one of the demo accounts as fallback
          const matchedDemo = DEMO_ACCOUNTS.find(a => a.email.toLowerCase() === email && a.password === password);
          if (matchedDemo) {
            const userObj = { ...matchedDemo };
            delete userObj.password;
            this.saveSession(userObj, 'local-token-' + Date.now());
            return { success: true, user: userObj, message: `Welcome back, ${userObj.name}!` };
          }
          return { success: false, error: data.error || 'Invalid email or password' };
        }
      } catch (err) {
        console.log('Backend API unreachable or cold-starting, using local auth fallback:', err.message);
      }

      // 2. Local Fallback Verification
      const matched = DEMO_ACCOUNTS.find(a => a.email.toLowerCase() === email && a.password === password);
      if (matched) {
        const userObj = { ...matched };
        delete userObj.password;
        this.saveSession(userObj, 'local-token-' + Date.now());
        return { success: true, user: userObj, message: `Welcome back, ${userObj.name}!` };
      }

      // Check registered users in localStorage store if any
      const storeState = window.OsmanStore ? window.OsmanStore.getState() : null;
      if (storeState && storeState.registeredUsers) {
        const custom = storeState.registeredUsers.find(u => u.email.toLowerCase() === email && u.password === password);
        if (custom) {
          const userObj = { ...custom };
          delete userObj.password;
          this.saveSession(userObj, 'local-token-' + Date.now());
          return { success: true, user: userObj, message: `Welcome back, ${userObj.name}!` };
        }
      }

      return { success: false, error: 'Invalid email or password. Try a Demo Account above!' };
    }

    // Quick Staff 4-digit PIN Login
    async pinLogin(pin) {
      pin = String(pin).trim();
      if (!pin || pin.length !== 4) {
        return { success: false, error: 'Please enter a valid 4-digit PIN' };
      }

      // 1. Try Backend API with 3.5s timeout
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);

        const resp = await fetch(`${API_BASE}/api/auth/pin-login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pin }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        const data = await resp.json();
        if (data.success && data.user) {
          this.saveSession(data.user, data.token);
          return { success: true, user: data.user, message: data.message };
        }
      } catch (err) {
        console.log('Backend API unreachable or cold-starting, using local PIN fallback:', err.message);
      }

      // 2. Local Fallback PIN verification
      const matched = DEMO_ACCOUNTS.find(a => a.pin === pin);
      if (matched) {
        const userObj = { ...matched };
        delete userObj.password;
        this.saveSession(userObj, 'local-pin-token-' + Date.now());
        return { success: true, user: userObj, message: `Terminal unlocked for ${userObj.name}` };
      }

      return { success: false, error: 'Unrecognized Staff PIN. Try: 1001 (Admin), 2002 (Cashier), 3003 (Chef), 4004 (Driver)' };
    }

    // Register customer or staff
    async register(userData) {
      const email = userData.email.trim().toLowerCase();

      // 1. Try Backend API
      try {
        const resp = await fetch(`${API_BASE}/api/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(userData)
        });
        const data = await resp.json();
        if (data.success && data.user) {
          this.saveSession(data.user, data.token);
          return { success: true, user: data.user, message: data.message };
        } else if (data.error) {
          return { success: false, error: data.error };
        }
      } catch (err) {
        console.log('Backend API unreachable, using local register fallback:', err.message);
      }

      // 2. Local fallback registration
      const newUser = {
        id: 'usr-' + Date.now(),
        name: userData.name,
        email: email,
        phone: userData.phone || '',
        role: userData.role || 'customer',
        subrole: userData.subrole || '',
        avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(userData.name)}`
      };

      if (window.OsmanStore) {
        const state = window.OsmanStore.getState();
        state.registeredUsers = state.registeredUsers || [];
        state.registeredUsers.push({ ...newUser, password: userData.password });
        window.OsmanStore.saveState(state);
      }

      this.saveSession(newUser, 'local-reg-token-' + Date.now());
      return { success: true, user: newUser, message: 'Account registered successfully!' };
    }

    logout() {
      this.clearSession();
      window.location.href = 'login.html';
    }
  }

  // Initialize Global Auth Manager
  window.OsmanAuth = new AuthManager();

  // --------------------------------------------------------------------------
  // UI Injector & Modal Manager
  // --------------------------------------------------------------------------
  class AuthUIManager {
    constructor() {
      this.currentPin = '';
      this.init();
    }

    init() {
      document.addEventListener('DOMContentLoaded', () => {
        this.injectAuthModal();
        this.renderNavWidgets();
        this.checkPageProtection();
      });

      window.addEventListener('osman_auth_state_changed', () => {
        this.renderNavWidgets();
        this.checkPageProtection();
      });
    }

    injectAuthModal() {
      if (document.getElementById('osmanAuthModal')) return;

      const modalHtml = `
      <div class="auth-modal-overlay" id="osmanAuthModal">
        <div class="auth-card">
          <div class="auth-card-banner"></div>
          
          <div class="auth-header">
            <button class="auth-close-btn" id="closeAuthModalBtn" aria-label="Close">&times;</button>
            <div class="auth-logo">
              <div class="auth-logo-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
              </div>
              <div class="auth-logo-text">
                OSMAN'S
                <span>SEAFOODS & GRILL</span>
              </div>
            </div>
            <p class="auth-subtitle" id="authModalSubtitle">Sign in to your account or access staff terminal</p>
          </div>

          <div class="auth-tabs">
            <button class="auth-tab-btn active" data-tab="login">Sign In</button>
            <button class="auth-tab-btn" data-tab="register">Register</button>
            <button class="auth-tab-btn tab-pin" data-tab="pin">Staff PIN</button>
          </div>

          <div class="auth-body">
            <div id="authAlert" class="auth-alert"></div>

            <!-- VIEW: LOGIN -->
            <form id="authLoginForm" class="auth-form-view active">
              <div class="auth-group">
                <label class="auth-label">Email Address</label>
                <div class="auth-input-wrapper">
                  <svg class="auth-input-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
                  <input type="email" id="loginEmail" class="auth-input" placeholder="e.g. admin@osmanseafoods.com" required autocomplete="email">
                </div>
              </div>

              <div class="auth-group">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.4rem;">
                  <label class="auth-label" style="margin-bottom:0;">Password</label>
                  <a href="#" id="authForgotPwdLink" style="font-size:0.75rem; color:#FF6500; text-decoration:none;">Forgot?</a>
                </div>
                <div class="auth-input-wrapper">
                  <svg class="auth-input-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>
                  <input type="password" id="loginPassword" class="auth-input" placeholder="••••••••" required autocomplete="current-password">
                  <button type="button" class="auth-password-toggle" data-target="loginPassword">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>
                  </button>
                </div>
              </div>

              <button type="submit" class="auth-submit-btn" id="loginSubmitBtn">
                <span>Sign In to System</span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"/></svg>
              </button>
            </form>

            <!-- VIEW: REGISTER -->
            <form id="authRegisterForm" class="auth-form-view">
              <div class="auth-group">
                <label class="auth-label">Full Name</label>
                <div class="auth-input-wrapper">
                  <svg class="auth-input-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                  <input type="text" id="regName" class="auth-input" placeholder="e.g. Elena Rostova" required>
                </div>
              </div>

              <div class="auth-group">
                <label class="auth-label">Email Address</label>
                <div class="auth-input-wrapper">
                  <svg class="auth-input-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
                  <input type="email" id="regEmail" class="auth-input" placeholder="name@example.com" required>
                </div>
              </div>

              <div class="auth-group">
                <label class="auth-label">Mobile Phone (For Order Tracking)</label>
                <div class="auth-input-wrapper">
                  <svg class="auth-input-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M6.62 10.79a15.053 15.053 0 006.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>
                  <input type="tel" id="regPhone" class="auth-input" placeholder="+1 (555) 000-0000" required>
                </div>
              </div>

              <div class="auth-group">
                <label class="auth-label">Create Password</label>
                <div class="auth-input-wrapper">
                  <svg class="auth-input-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>
                  <input type="password" id="regPassword" class="auth-input" placeholder="Minimum 6 characters" required minlength="6">
                  <button type="button" class="auth-password-toggle" data-target="regPassword">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>
                  </button>
                </div>
              </div>

              <button type="submit" class="auth-submit-btn" id="regSubmitBtn">
                <span>Create Account & Join</span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/></svg>
              </button>
            </form>

            <!-- VIEW: PIN QUICK LOGIN -->
            <div id="authPinForm" class="auth-form-view">
              <div class="pin-pad-container">
                <p style="font-size:0.85rem; color:#94A3B8; text-align:center;">
                  Enter your 4-digit Staff Station PIN to unlock the register or kitchen display.
                </p>

                <div class="pin-display-dots" id="pinDisplayDots">
                  <div class="pin-dot"></div>
                  <div class="pin-dot"></div>
                  <div class="pin-dot"></div>
                  <div class="pin-dot"></div>
                </div>

                <div class="pin-keypad">
                  <button class="pin-key" data-num="1">1</button>
                  <button class="pin-key" data-num="2">2</button>
                  <button class="pin-key" data-num="3">3</button>
                  <button class="pin-key" data-num="4">4</button>
                  <button class="pin-key" data-num="5">5</button>
                  <button class="pin-key" data-num="6">6</button>
                  <button class="pin-key" data-num="7">7</button>
                  <button class="pin-key" data-num="8">8</button>
                  <button class="pin-key" data-num="9">9</button>
                  <button class="pin-key key-action" id="pinClearBtn">CLEAR</button>
                  <button class="pin-key" data-num="0">0</button>
                  <button class="pin-key key-action" id="pinBackspaceBtn">⌫</button>
                </div>
              </div>
            </div>

            <!-- DEMO QUICK LOGINS (1-CLICK TESTING) -->
            <div class="demo-accounts-section">
              <div class="demo-title">⚡ Instant 1-Click Role Switcher</div>
              <div class="demo-pills" id="demoPillList"></div>
            </div>

          </div>
        </div>
      </div>
      `;

      document.body.insertAdjacentHTML('beforeend', modalHtml);
      this.attachModalEvents();
      this.renderDemoPills();
    }

    renderDemoPills() {
      const container = document.getElementById('demoPillList');
      if (!container) return;

      const accounts = window.OsmanAuth.getDemoAccounts();
      container.innerHTML = accounts.map(acc => `
        <button class="demo-pill ${acc.role === 'admin' ? 'pill-admin' : ''}" data-email="${acc.email}" data-pwd="${acc.password}" data-pin="${acc.pin}">
          ${acc.label}
        </button>
      `).join('');

      container.querySelectorAll('.demo-pill').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const email = e.currentTarget.getAttribute('data-email');
          const pwd = e.currentTarget.getAttribute('data-pwd');
          
          this.showAlert('Logging in as ' + email + '...', 'success');
          const res = await window.OsmanAuth.login(email, pwd);
          if (res.success) {
            this.showAlert(res.message, 'success');
            setTimeout(() => {
              this.closeModal();
              this.handlePostLoginRedirect(res.user);
            }, 500);
          } else {
            this.showAlert(res.error, 'error');
          }
        });
      });
    }

    attachModalEvents() {
      const modal = document.getElementById('osmanAuthModal');
      const closeBtn = document.getElementById('closeAuthModalBtn');
      const tabs = modal.querySelectorAll('.auth-tab-btn');

      // Close events
      closeBtn.addEventListener('click', () => this.closeModal());
      modal.addEventListener('click', (e) => {
        if (e.target === modal) this.closeModal();
      });

      // Tab switcher
      tabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
          tabs.forEach(t => t.classList.remove('active'));
          e.currentTarget.classList.add('active');

          const tabName = e.currentTarget.getAttribute('data-tab');
          modal.querySelectorAll('.auth-form-view').forEach(v => v.classList.remove('active'));
          
          if (tabName === 'login') {
            document.getElementById('authLoginForm').classList.add('active');
            document.getElementById('authModalSubtitle').textContent = 'Sign in to your account or access staff terminal';
          } else if (tabName === 'register') {
            document.getElementById('authRegisterForm').classList.add('active');
            document.getElementById('authModalSubtitle').textContent = 'Create a customer dining account for faster checkout & tracking';
          } else if (tabName === 'pin') {
            document.getElementById('authPinForm').classList.add('active');
            document.getElementById('authModalSubtitle').textContent = 'Quick 4-digit station terminal PIN entry for staff';
            this.resetPin();
          }
          this.clearAlert();
        });
      });

      // Password visibility toggle
      modal.querySelectorAll('.auth-password-toggle').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const targetId = e.currentTarget.getAttribute('data-target');
          const input = document.getElementById(targetId);
          if (input) {
            input.type = input.type === 'password' ? 'text' : 'password';
          }
        });
      });

      // Submit Login
      const loginForm = document.getElementById('authLoginForm');
      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        const submitBtn = document.getElementById('loginSubmitBtn');
        
        submitBtn.disabled = true;
        submitBtn.querySelector('span').textContent = 'Verifying...';

        const res = await window.OsmanAuth.login(email, password);
        submitBtn.disabled = false;
        submitBtn.querySelector('span').textContent = 'Sign In to System';

        if (res.success) {
          this.showAlert(res.message, 'success');
          setTimeout(() => {
            this.closeModal();
            this.handlePostLoginRedirect(res.user);
          }, 600);
        } else {
          this.showAlert(res.error, 'error');
        }
      });

      // Submit Register
      const regForm = document.getElementById('authRegisterForm');
      regForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('regName').value.trim();
        const email = document.getElementById('regEmail').value.trim();
        const phone = document.getElementById('regPhone').value.trim();
        const password = document.getElementById('regPassword').value;
        const submitBtn = document.getElementById('regSubmitBtn');

        submitBtn.disabled = true;
        submitBtn.querySelector('span').textContent = 'Creating Account...';

        const res = await window.OsmanAuth.register({ name, email, phone, password, role: 'customer' });
        submitBtn.disabled = false;
        submitBtn.querySelector('span').textContent = 'Create Account & Join';

        if (res.success) {
          this.showAlert(res.message, 'success');
          setTimeout(() => {
            this.closeModal();
            this.handlePostLoginRedirect(res.user);
          }, 600);
        } else {
          this.showAlert(res.error, 'error');
        }
      });

      // PIN Pad Interaction
      modal.querySelectorAll('.pin-key[data-num]').forEach(key => {
        key.addEventListener('click', (e) => {
          const num = e.currentTarget.getAttribute('data-num');
          this.enterPinDigit(num);
        });
      });

      document.getElementById('pinClearBtn').addEventListener('click', () => this.resetPin());
      document.getElementById('pinBackspaceBtn').addEventListener('click', () => this.backspacePin());
    }

    enterPinDigit(digit) {
      if (this.currentPin.length < 4) {
        this.currentPin += digit;
        this.updatePinDots();
        if (this.currentPin.length === 4) {
          this.submitPin();
        }
      }
    }

    backspacePin() {
      if (this.currentPin.length > 0) {
        this.currentPin = this.currentPin.slice(0, -1);
        this.updatePinDots();
      }
    }

    resetPin() {
      this.currentPin = '';
      this.updatePinDots();
      this.clearAlert();
    }

    updatePinDots() {
      const dots = document.querySelectorAll('#pinDisplayDots .pin-dot');
      dots.forEach((dot, idx) => {
        if (idx < this.currentPin.length) {
          dot.classList.add('filled');
        } else {
          dot.classList.remove('filled');
        }
      });
    }

    async submitPin() {
      this.showAlert('Verifying PIN...', 'success');
      const res = await window.OsmanAuth.pinLogin(this.currentPin);
      if (res.success) {
        this.showAlert(res.message, 'success');
        setTimeout(() => {
          this.closeModal();
          this.handlePostLoginRedirect(res.user);
        }, 500);
      } else {
        this.showAlert(res.error, 'error');
        setTimeout(() => this.resetPin(), 900);
      }
    }

    routeUserByRole(user, redirectParam = null) {
      if (redirectParam) {
        window.location.href = redirectParam;
        return;
      }
      if (user.role === 'admin') {
        window.location.href = 'admin.html';
      } else if (user.role === 'staff') {
        if (user.subrole === 'kds') {
          window.location.href = 'staff.html?station=kds';
        } else if (user.subrole === 'dispatch') {
          window.location.href = 'staff.html?station=dispatch';
        } else {
          window.location.href = 'staff.html?station=cashier';
        }
      } else {
        window.location.href = 'index.html';
      }
    }

    handlePostLoginRedirect(user) {
      const urlParams = new URLSearchParams(window.location.search);
      const redirect = urlParams.get('redirect');
      this.routeUserByRole(user, redirect);
    }

    openModal(options = {}) {
      this.injectAuthModal();
      const modal = document.getElementById('osmanAuthModal');
      if (!modal) return;

      const tabToActivate = options.tab || 'login';
      const targetTabBtn = modal.querySelector(`.auth-tab-btn[data-tab="${tabToActivate}"]`);
      if (targetTabBtn) targetTabBtn.click();

      if (options.alert) {
        this.showAlert(options.alert.message, options.alert.type || 'error');
      } else {
        this.clearAlert();
      }

      modal.classList.add('active');
    }

    closeModal() {
      const modal = document.getElementById('osmanAuthModal');
      if (modal) modal.classList.remove('active');
    }

    showAlert(message, type = 'error') {
      const alertEl = document.getElementById('authAlert');
      if (!alertEl) return;
      alertEl.textContent = message;
      alertEl.className = `auth-alert show ${type}`;
    }

    clearAlert() {
      const alertEl = document.getElementById('authAlert');
      if (alertEl) {
        alertEl.textContent = '';
        alertEl.className = 'auth-alert';
      }
    }

    // ------------------------------------------------------------------------
    // Navbar User Profile Widget Renderer
    // ------------------------------------------------------------------------
    renderNavWidgets() {
      const user = window.OsmanAuth.getCurrentUser();
      const navActions = document.querySelector('.nav-actions');

      // 1. Update Customer Storefront Navbar
      if (navActions) {
        let userWidget = document.getElementById('headerUserWidget');
        if (!userWidget) {
          userWidget = document.createElement('div');
          userWidget.id = 'headerUserWidget';
          userWidget.className = 'nav-user-widget';
          // Insert before cart button or tracker
          navActions.insertBefore(userWidget, navActions.firstChild);
        }

        if (!user) {
          userWidget.innerHTML = `
            <a href="login.html" class="btn btn-outline btn-sm" id="navSignInLink" style="font-size:0.82rem; padding:0.45rem 0.95rem; display:flex; align-items:center; gap:0.4rem; text-decoration:none;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
              <span>Sign In</span>
            </a>
          `;
        } else {
          const roleBadgeClass = user.role === 'admin' ? 'role-admin' : (user.role === 'staff' ? 'role-staff' : 'role-customer');
          const roleLabel = user.role === 'admin' ? '👑 Admin' : (user.role === 'staff' ? `💼 ${user.subrole || 'Staff'}` : '👤 Customer');

          userWidget.innerHTML = `
            <div class="user-profile-badge" id="userMenuToggleBtn">
              <img src="${user.avatar || 'https://api.dicebear.com/7.x/initials/svg?seed=' + encodeURIComponent(user.name)}" class="user-avatar-img" alt="${user.name}">
              <div class="user-info-text">
                <span class="user-name-text">${user.name.split(' ')[0]}</span>
                <span class="user-role-tag ${roleBadgeClass}">${roleLabel}</span>
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="color:#94A3B8;"><path d="M7 10l5 5 5-5z"/></svg>
            </div>

            <div class="user-dropdown-menu" id="userDropdownMenu">
              <div style="padding:0.5rem 0.85rem; border-bottom:1px solid rgba(255,255,255,0.08); margin-bottom:0.35rem;">
                <div style="font-weight:700; color:#FFF; font-size:0.9rem;">${user.name}</div>
                <div style="font-size:0.75rem; color:#94A3B8;">${user.email}</div>
              </div>

              ${user.role === 'admin' ? `
                <a href="admin.html" class="user-dropdown-item item-admin">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M4 5a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1h-4a1 1 0 01-1-1V5z"/></svg>
                  Admin Console
                </a>
              ` : ''}

              ${user.role === 'staff' || user.role === 'admin' ? `
                <a href="staff.html" class="user-dropdown-item">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M3 10h18M7 15h1m4 0h1m-7 4h12a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                  Staff Terminal
                </a>
              ` : ''}

              <a href="login.html" class="user-dropdown-item" style="text-decoration:none;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M16 17.01V10h-2v7.01h-3L15 21l4-3.99h-3zM9 3L5 6.99h3V14h2V6.99h3L9 3z"/></svg>
                Switch Account / Role
              </a>

              <div class="user-dropdown-divider"></div>

              <button class="user-dropdown-item" id="logoutActionBtn" style="width:100%; text-align:left; background:none; border:none; color:#F87171;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/></svg>
                Log Out
              </button>
            </div>
          `;

          const toggleBtn = document.getElementById('userMenuToggleBtn');
          const dropdown = document.getElementById('userDropdownMenu');
          
          toggleBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown?.classList.toggle('active');
          });

          document.addEventListener('click', () => {
            dropdown?.classList.remove('active');
          });

          document.getElementById('logoutActionBtn')?.addEventListener('click', () => {
            window.OsmanAuth.logout();
          });
        }
      }

      // 2. Update Admin Top Bar Widget
      this.renderAdminTopBarUser();

      // 3. Update Staff Terminal Header Widget
      this.renderStaffHeaderUser();
    }

    renderAdminTopBarUser() {
      const adminHeaderRight = document.querySelector('.admin-topbar-actions') || document.querySelector('.admin-topbar');
      if (!adminHeaderRight) return;

      const user = window.OsmanAuth.getCurrentUser();
      let adminWidget = document.getElementById('adminHeaderUserWidget');
      if (!adminWidget) {
        adminWidget = document.createElement('div');
        adminWidget.id = 'adminHeaderUserWidget';
        adminWidget.style.cssText = 'display:flex; align-items:center; gap:1rem;';
        adminHeaderRight.appendChild(adminWidget);
      }

      if (user && user.role === 'admin') {
        adminWidget.innerHTML = `
          <div style="display:flex; align-items:center; gap:0.6rem; background:rgba(0,0,0,0.25); padding:0.35rem 0.8rem; border-radius:20px; border:1px solid rgba(212,175,55,0.3);">
            <img src="${user.avatar}" style="width:28px; height:28px; border-radius:50%;" alt="Admin">
            <span style="font-weight:700; color:#FFF; font-size:0.85rem;">${user.name}</span>
            <span class="user-role-tag role-admin" style="font-size:0.65rem;">👑 Admin</span>
          </div>
          <button id="adminSwitchRoleBtn" class="btn btn-outline btn-sm" style="font-size:0.75rem; padding:0.35rem 0.75rem;">Switch Role</button>
          <button id="adminLogoutBtn" class="btn btn-navy btn-sm" style="font-size:0.75rem; padding:0.35rem 0.75rem;">Log Out</button>
        `;

        document.getElementById('adminSwitchRoleBtn')?.addEventListener('click', () => {
          window.location.href = 'login.html';
        });
        document.getElementById('adminLogoutBtn')?.addEventListener('click', () => {
          window.OsmanAuth.logout();
        });
      }
    }

    renderStaffHeaderUser() {
      const staffHeader = document.querySelector('.staff-header');
      if (!staffHeader) return;

      const user = window.OsmanAuth.getCurrentUser();
      let staffWidget = document.getElementById('staffHeaderUserWidget');
      if (!staffWidget) {
        staffWidget = document.createElement('div');
        staffWidget.id = 'staffHeaderUserWidget';
        staffWidget.style.cssText = 'display:flex; align-items:center; gap:0.75rem;';
        
        // Find right side container
        const rightContainer = staffHeader.querySelector('div:last-child');
        if (rightContainer) {
          rightContainer.insertBefore(staffWidget, rightContainer.firstChild);
        }
      }

      if (user) {
        const subroleLabel = user.subrole ? user.subrole.toUpperCase() : (user.role === 'admin' ? 'ADMIN' : 'STAFF');
        staffWidget.innerHTML = `
          <div style="display:flex; align-items:center; gap:0.5rem; background:#0F172A; padding:0.35rem 0.75rem; border-radius:20px; border:1px solid #334155;">
            <img src="${user.avatar}" style="width:26px; height:26px; border-radius:50%;" alt="Staff">
            <span style="font-weight:700; color:#FFF; font-size:0.82rem;">${user.name}</span>
            <span class="user-role-tag role-staff" style="font-size:0.65rem;">${subroleLabel}</span>
          </div>
          <button id="staffPinSwitchBtn" class="btn btn-sm btn-outline" style="font-size:0.75rem; padding:0.35rem 0.65rem;">Switch PIN</button>
          <button id="staffLogoutBtn" class="btn btn-sm btn-flame" style="font-size:0.75rem; padding:0.35rem 0.65rem;">Log Out</button>
        `;

        document.getElementById('staffPinSwitchBtn')?.addEventListener('click', () => {
          window.location.href = 'login.html?tab=pin';
        });
        document.getElementById('staffLogoutBtn')?.addEventListener('click', () => {
          window.OsmanAuth.logout();
        });
      }
    }

    // ------------------------------------------------------------------------
    // Role Protection & Route Guard
    // ------------------------------------------------------------------------
    checkPageProtection() {
      const path = window.location.pathname.toLowerCase();
      const user = window.OsmanAuth.getCurrentUser();

      // Guard for admin.html
      if (path.includes('admin.html')) {
        if (!user || user.role !== 'admin') {
          window.location.href = 'login.html?redirect=admin.html&required=admin';
        }
      }

      // Guard for staff.html
      if (path.includes('staff.html')) {
        if (!user || (user.role !== 'staff' && user.role !== 'admin')) {
          window.location.href = 'login.html?redirect=staff.html&required=staff';
        }
      }
    }
  }

  // Initialize UI Manager
  window.OsmanAuthUI = new AuthUIManager();
})();
