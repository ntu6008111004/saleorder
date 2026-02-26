/* =========================================================
   auth.js — Authentication & Role Management
   ========================================================= */

// Define generic auth functions
let notificationIntervalId = null;

const Auth = {
  getStoredUserStr: function() {
    return localStorage.getItem("so_currentUser") || sessionStorage.getItem("so_currentUser");
  },

  getDefaultPage: function(role) {
    const r = (role || "").toLowerCase();
    if (r === "manager" || r === "accounting") {
        return "./history.html";
    }
    return "./index.html";
  },

  checkAuth: function() {
    const userStr = this.getStoredUserStr();
    const isLoginPage = window.location.pathname.endsWith("login.html");

    if (!userStr) {
      if (!isLoginPage) {
        window.location.href = "./login.html";
      }
      return null;
    }
    
    try {
      const user = JSON.parse(userStr);
      const role = (user.role || "").toLowerCase();
      const isSuperAdmin = role === "super admin";
      const isAdmin = role === "admin";
      const isPrivileged = isSuperAdmin || isAdmin;
      
      const isManager = role === "manager";

      // If we are on login page, redirect to appropriate start page
      if (isLoginPage) {
        window.location.href = this.getDefaultPage(role);
        return user;
      }
      
      const isHistoryPage = window.location.pathname.endsWith("history.html");
      const isPrintPage = window.location.pathname.endsWith("print-template.html");
      
      // Restrict Manager to History and Print Template only
      if (isManager && !isHistoryPage && !isPrintPage) {
        window.location.href = "./history.html";
        return user;
      }

      // Page-level Access Control
      const isUserMgmtPage = window.location.pathname.endsWith("user-management.html");
      const isLogsPage = window.location.pathname.endsWith("system-log.html");
      
      if (isUserMgmtPage && !isPrivileged) {
        window.location.href = "./index.html";
      }
      if (isLogsPage && !isSuperAdmin) {
        window.location.href = "./index.html";
      }

      return user;
    } catch(e) {
      localStorage.removeItem("so_currentUser");
      sessionStorage.removeItem("so_currentUser");
      if (!isLoginPage) window.location.href = "./login.html";
      return null;
    }
  },

  getCurrentUser: function() {
    try {
      const userStr = this.getStoredUserStr();
      return userStr ? JSON.parse(userStr) : null;
    } catch(e) { return null; }
  },

  logout: function() {
    localStorage.removeItem("so_currentUser");
    sessionStorage.removeItem("so_currentUser");
    window.location.href = "./login.html";
  },

  confirmLogout: function() {
    let backdrop = document.getElementById("logoutConfirmModal");
    if (!backdrop) {
      backdrop = document.createElement("div");
      backdrop.id = "logoutConfirmModal";
      backdrop.className = "modal-backdrop";
      backdrop.style.zIndex = "10005"; // ensure it covers everything
      backdrop.innerHTML = `
        <div class="modal" style="text-align: center;">
          <div class="modal-icon" style="background: linear-gradient(135deg, #fee2e2, #fecaca); color: #ef4444; font-size: 40px; margin-bottom: 16px;">👋</div>
          <h3 style="margin-bottom: 8px; color: var(--text);">จะไปแล้วหรอคะ? 🥺</h3>
          <div class="modal-desc" style="margin-bottom: 24px; color: var(--text-secondary);">ยืนยันการออกจากระบบหรือไม่?</div>
          <div class="modal-actions" style="display: flex; justify-content: center; gap: 12px;">
            <button class="btn-confirm-no" onclick="document.getElementById('logoutConfirmModal').classList.remove('show')" style="padding: 10px 24px; border-radius: 20px;">อยู่ต่อ</button>
            <button class="btn-confirm-yes" style="background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%); padding: 10px 24px; border-radius: 20px; box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);" onclick="Auth.logout()">ใช่, ออกจากระบบ</button>
          </div>
        </div>
      `;
      document.body.appendChild(backdrop);
    }
    backdrop.classList.add("show");
  },

  renderUI: function(user) {
    if (!user) return;
    
    // Show user info securely in top nav if exists
    const header = document.querySelector(".app-header");
    if(header && !document.getElementById("auth-user-info")) {
      const infoDiv = document.createElement("div");
      infoDiv.id = "auth-user-info";
      infoDiv.style.marginLeft = "auto";
      infoDiv.innerHTML = `
        <style>
          .btn-logout-cute {
            background: linear-gradient(135deg, #f87171, #ef4444);
            color: white; border: none; padding: 8px 16px; border-radius: 24px; 
            font-size: 13px; font-weight: 600; cursor: pointer; 
            display: flex; align-items: center; gap: 6px; 
            box-shadow: 0 4px 12px rgba(239, 68, 68, 0.35); 
            transition: all 0.2s ease; font-family: 'Sarabun', sans-serif;
          }
          .btn-logout-cute:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 16px rgba(239, 68, 68, 0.45);
          }
          .btn-logout-cute:active {
            transform: translateY(0);
          }
          @media (max-width: 768px) {
            .btn-logout-cute { padding: 4px 10px !important; font-size: 11px !important; white-space: nowrap !important; width: 100%; justify-content: center; }
            .logout-emoji { display: none !important; }
            .auth-user-name { font-size: 11px !important; }
            .auth-user-role { font-size: 9px !important; }
            .auth-top-container { flex-direction: column; align-items: flex-end !important; gap: 6px !important; }
            .auth-text-container { display: flex; align-items: center; gap: 8px; }
          }
        </style>
        <div class="auth-top-container" style="display: flex; align-items: center; gap: 16px;">
          <div class="auth-text-container" style="text-align: right; color: white;">
            <div class="auth-user-name" style="font-weight: 600; font-size: 14px;">👤 ${user.name}</div>
            <div class="auth-user-role" style="font-weight: 400; font-size: 12px; opacity: 0.85;">
              ${user.role === 'Super Admin' ? '⚡ ผู้ดูแลระบบสูงสุด (Super Admin)' : 
                (user.role === 'Admin' ? '🛡️ ผู้จัดการระบบ (Admin)' : 
                 (user.role === 'Manager' ? '💼 ผู้จัดการ (Manager)' : 
                  (user.role === 'Accounting' ? '💴 บัญชี (Accounting)' : '🧑‍💻 พนักงานขาย (User)')))}
            </div>
          </div>
          <button class="btn-logout-cute" onclick="Auth.confirmLogout()">
            <span class="logout-emoji" style="font-size: 15px;">👋</span> ออกจากระบบ
          </button>
        </div>
      `;
      header.appendChild(infoDiv);
    }

    // Role-based menu visibility
    const navBar = document.querySelector(".nav-bar");
    const path = window.location.pathname;
    const isLoginPage = path.endsWith("login.html");

    if (navBar && !isLoginPage) {
        const role = (user.role || "").toLowerCase();
        const isSuperAdmin = role === "super admin";
        const isAdmin = role === "admin";
        const isManager = role === "manager";
        const isAccounting = role === "accounting";
        const isUser = role === "user" || role === "salesperson";

        const links = navBar.querySelectorAll("a");
        links.forEach(link => {
            const onclick = (link.getAttribute("onclick") || "").toLowerCase();
            const text = link.textContent || "";
            const isActive = link.classList.contains("active");

            // Robust page matching using both onclick and text content
            const isHome = onclick.includes("index") || text.includes("สร้าง") || (isActive && (path.endsWith("index.html") || path.endsWith("/")));
            const isHistory = onclick.includes("history") || text.includes("ประวัติ") || (isActive && path.endsWith("history.html"));
            const isSalesperson = onclick.includes("salesperson") || text.includes("พนักงานขาย") || (isActive && path.endsWith("master-salesperson.html"));
            const isProduct = onclick.includes("product") || text.includes("สินค้า") || (isActive && path.endsWith("master-product.html"));
            const isUserMgmt = onclick.includes("user-management") || text.includes("จัดการผู้ใช้") || (isActive && path.endsWith("user-management.html"));
            const isLogs = onclick.includes("system-log") || text.includes("ประวัติการใช้งาน") || (isActive && path.endsWith("system-log.html"));

            if (isSuperAdmin) {
                link.style.display = "flex";
            } else if (isAdmin) {
                link.style.display = isLogs ? "none" : "flex";
            } else if (isManager) {
                // Manager only sees history
                link.style.display = isHistory ? "flex" : "none";
            } else if (isAccounting) {
                // Accounting sees history and products
                link.style.display = (isHistory || isProduct) ? "flex" : "none";
            } else {
                // Default / User / Salesperson
                // can see Create Sale Order and History
                link.style.display = (isHome || isHistory) ? "flex" : "none";
            }
        });

        // Ensure User Management and Logs are visible for authorized roles
        let hasUsers = false;
        let hasLogs = false;
        links.forEach(link => {
            const onclick = link.getAttribute("onclick") || "";
            const text = link.textContent;
            // Check if link exists via onclick or if it's the active current-page link
            if (onclick.includes("user-management.html") || (path.endsWith("user-management.html") && text.includes("จัดการผู้ใช้"))) hasUsers = true;
            if (onclick.includes("system-log.html") || (path.endsWith("system-log.html") && text.includes("ประวัติการใช้งาน"))) hasLogs = true;
        });

        if (!hasUsers && (isSuperAdmin || isAdmin)) {
            const a = document.createElement("a");
            a.innerHTML = "🛡️ จัดการผู้ใช้";
            a.onclick = () => window.location.href = "./user-management.html";
            if(path.endsWith("user-management.html")) a.className = "active";
            navBar.appendChild(a);
        }
        if (!hasLogs && isSuperAdmin) {
            const a2 = document.createElement("a");
            a2.innerHTML = "📝 ประวัติการใช้งาน";
            a2.onclick = () => window.location.href = "./system-log.html";
            if(path.endsWith("system-log.html")) a2.className = "active";
            navBar.appendChild(a2);
        }
    }

    // Page-level Access Control
    if (!isLoginPage) {
        const role = (user.role || "").toLowerCase();
        const isSuperAdmin = role === "super admin";
        const isAdmin = role === "admin";
        
        if (isSuperAdmin) return; // Super Admin has access to everything
        
        let allowed = false;
        if (isAdmin) {
            allowed = !path.endsWith("system-log.html");
        } else if (role === "manager") {
            allowed = path.endsWith("history.html") || path.endsWith("print-template.html");
        } else if (role === "accounting") {
            allowed = path.endsWith("history.html") || path.endsWith("master-product.html") || path.endsWith("print-template.html");
        } else if (role === "user" || role === "salesperson") {
            allowed = path.endsWith("index.html") || path.endsWith("history.html") || path.endsWith("/") || path.endsWith("print-template.html");
        }

        if (!allowed && !path.endsWith("login.html")) {
            // Show notification before redirect
            this.showNotification("จำกัดสิทธิ์การเข้าถึง", "คุณไม่มีสิทธิ์เข้าใช้งานหน้านี้ ระบบจะพากลับไปยังหน้าที่เข้าถึงได้", "🚫");
            
            setTimeout(() => {
                window.location.href = this.getDefaultPage(role);
            }, 2000);
            
            return; // Stop further initialization
        }
    }
    
    // Start notification polling
    if (!notificationIntervalId && typeof API !== 'undefined' && API.getSaleOrders) {
       this.startNotificationPolling(user);
    }
  },

  showNotification: function(title, msgHtml, icon) {
    let alertModal = document.getElementById("globalAlertModal");
    if (!alertModal) {
      alertModal = document.createElement("div");
      alertModal.id = "globalAlertModal";
      alertModal.className = "modal-backdrop";
      alertModal.style.zIndex = "30000"; 
      alertModal.innerHTML = `
        <style>
          #globalAlertModal.modal-backdrop {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            display: none;
            justify-content: center;
            align-items: center;
            padding: 20px;
            background: rgba(15, 23, 42, 0.6);
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            transition: all 0.3s ease;
            z-index: 30000;
          }
          #globalAlertModal.modal-backdrop.show {
            display: flex;
          }
          #globalAlertModal .modal-card {
            background: #ffffff;
            border-radius: 24px;
            padding: 40px 32px;
            width: 100%;
            max-width: 420px;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
            position: relative;
            overflow: hidden;
            border: 1px solid rgba(255, 255, 255, 0.2);
            text-align: center;
            transform: translateY(20px);
            opacity: 0;
            transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          }
          #globalAlertModal.show .modal-card {
            transform: translateY(0);
            opacity: 1;
          }
          .alert-icon-wrapper {
            width: 80px;
            height: 80px;
            background: #eff6ff;
            border-radius: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 42px;
            margin: 0 auto 24px;
          }
          .alert-title {
            font-size: 22px;
            font-weight: 700;
            color: #1e293b;
            margin-bottom: 12px;
            font-family: 'Sarabun', sans-serif;
          }
          .alert-message {
            font-size: 16px;
            color: #64748b;
            line-height: 1.6;
            margin-bottom: 32px;
          }
          .alert-btn {
            background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
            color: white;
            border: none;
            padding: 14px 28px;
            border-radius: 14px;
            font-size: 16px;
            font-weight: 600;
            width: 100%;
            cursor: pointer;
            transition: all 0.2s ease;
            box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);
          }
          .alert-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 15px -3px rgba(37, 99, 235, 0.3);
            filter: brightness(1.1);
          }
          .alert-btn:active {
            transform: translateY(0);
          }
        </style>
        <div class="modal-card">
          <div class="alert-icon-wrapper" id="globalAlertIcon">🔔</div>
          <h3 class="alert-title" id="globalAlertTitle">แจ้งเตือน</h3>
          <div class="alert-message" id="globalAlertMsg"></div>
          <button class="alert-btn" onclick="document.getElementById('globalAlertModal').classList.remove('show')">รับทราบ</button>
        </div>
      `;
      alertModal.addEventListener("click", function(e) {
        if (e.target === alertModal) alertModal.classList.remove("show");
      });
      document.body.appendChild(alertModal);
    }

    document.getElementById("globalAlertTitle").textContent = title;
    document.getElementById("globalAlertMsg").innerHTML = msgHtml;
    document.getElementById("globalAlertIcon").textContent = icon || '🔔';
    alertModal.classList.add("show");
    
    if (window.Notification && Notification.permission === 'granted') {
       try {
         const plainMsg = msgHtml.replace(/<[^>]+>/g, '\n');
         new Notification(title, { 
           body: plainMsg, 
           icon: 'https://cdn-icons-png.flaticon.com/512/1827/1827370.png',
           tag: 'so-alert-' + Date.now(),
           renotify: true
         });
       } catch(e) { console.error("Web Notification error:", e); }
    }
  },

  requestNotificationPermission: function() {
    const modal = document.getElementById('notifPermModal');
    if (modal) modal.classList.remove('show');
    if (window.Notification) {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          Auth.showNotification('สำเร็จ', 'ระบบเปิดใช้งานการแจ้งเตือนแล้ว', '✅');
        }
      });
    }
  },

  startNotificationPolling: function(user) {
    // Only request permission if not on file:// protocol (which often doesn't persist)
    if (window.Notification && Notification.permission === 'default') {
       const isLocalFile = window.location.protocol === 'file:';
       if (!isLocalFile) {
          if (!document.getElementById("notifPermModal") && sessionStorage.getItem("so_asked_notif") !== "true") {
             sessionStorage.setItem("so_asked_notif", "true");
             let permModal = document.createElement("div");
             permModal.id = "notifPermModal";
             permModal.className = "modal-backdrop show";
             permModal.style.zIndex = "40000";
             permModal.innerHTML = `
               <div class="modal">
                 <div class="modal-icon" style="background: linear-gradient(135deg, #dbeafe, #bfdbfe); font-size: 40px;">🔔</div>
                 <h3 style="margin-bottom: 8px;">เปิดการแจ้งเตือนระบบ</h3>
                 <div class="modal-desc" style="margin-bottom: 24px;">กรุณาอนุญาตให้ระบบส่งการแจ้งเตือน เพื่อให้คุณไม่พลาดใบสั่งขายใหม่และการอัปเดตสถานะการอนุมัติ</div>
                 <div class="modal-actions" style="display: flex; gap: 12px; justify-content: center;">
                   <button class="btn btn-secondary" onclick="document.getElementById('notifPermModal').classList.remove('show')">ไว้ทีหลัง</button>
                   <button class="btn btn-primary" onclick="Auth.requestNotificationPermission()">อนุญาตการแจ้งเตือน</button>
                 </div>
               </div>
             `;
             document.body.appendChild(permModal);
          }
       }
    }

    // For Manager/Admin alerts across page loads
    let storageKey = 'so_last_pending_count_' + user.id;
    let localLastPending = parseInt(localStorage.getItem(storageKey) || "-1");
    let lastSyncToken = "";    // For lightweight sync check

    const checkNotifications = async (isInitial = false) => {
      try {
        // Step 1: Lightweight check
        const tokenResult = await API.getSyncToken();
        if (!tokenResult.success || !tokenResult.data) return;
        
        const currentToken = tokenResult.data.orders || "";
        if (lastSyncToken && lastSyncToken === currentToken) {
            return; 
        }

        lastSyncToken = currentToken;

        // Step 2: Fetch full data
        const result = await API.getSaleOrders();
        if (!result.success) return;
        const validOrders = (result.data || []).filter(o => o.SO_Number && String(o.SO_Number).trim() !== '');
        
        // ── MANAGER / ADMIN / SUPER ADMIN NOTIFICATION ──
        const role = (user.role || "").toLowerCase();
        if (role === 'manager' || role === 'admin' || role === 'super admin') {
           // Sync current state from storage to avoid multi-tab repeat
           localLastPending = parseInt(localStorage.getItem(storageKey) || "-1");

           const newPendingCount = validOrders.filter(o => !o.Status || o.Status === 'Pending').length;
           
           if (localLastPending === -1) {
              if (newPendingCount > 0) {
                 Auth.showNotification('รายการรออนุมัติ', `คุณมีรายการรออนุมัติทั้งหมด <strong>${newPendingCount} รายการ</strong>`, '🔔');
              }
           } else if (newPendingCount > localLastPending) {
              const diff = newPendingCount - localLastPending;
              Auth.showNotification('แจ้งเตือนงานเข้าใหม่', `มีรายการเข้ามาใหม่เพิ่ม <strong>${diff} รายการ</strong>`, '🚨');
           }
           
           localLastPending = newPendingCount;
           localStorage.setItem(storageKey, localLastPending);

        } else if (role === 'user' || role === 'salesperson') { 
           const myOrders = validOrders.filter(o => {
              const creatorId = String(o.Creator_ID || "").trim();
              return creatorId && creatorId === String(user.id);
           });
           
           let knownStatusKey = 'so_known_statuses_' + user.id;
           let knownStatuses = {};
           try {
             knownStatuses = JSON.parse(localStorage.getItem(knownStatusKey) || '{}');
           } catch(e) {}
           
           let isFirstLoad = Object.keys(knownStatuses).length === 0;

           let newlyApproved = 0;
           let newlyRejected = 0;
           let newlyCreated = 0;
           let details = [];

           myOrders.forEach(o => {
              const prevStatus = knownStatuses[o.SO_Number];
              const currStatus = o.Status || 'Pending';
              
              if (prevStatus !== undefined) {
                 if (prevStatus === 'Pending' && currStatus !== 'Pending') {
                    if (currStatus === 'Approved') {
                       newlyApproved++;
                       details.push(`✅ SO: ${o.SO_Number} <strong style="color:var(--success)">ได้รับการอนุมัติ</strong>`);
                    } else if (currStatus === 'Rejected') {
                       newlyRejected++;
                       details.push(`❌ SO: ${o.SO_Number} <strong style="color:var(--danger)">ไม่ถูกอนุมัติ</strong>`);
                    }
                 }
              } else {
                 // Brand new order of mine
                 if (!isFirstLoad) {
                    newlyCreated++;
                    details.push(`📝 สร้าง SO: ${o.SO_Number} สำเร็จ (รอตรวจสอบ)`);
                 }
              }
              knownStatuses[o.SO_Number] = currStatus;
           });
           
           if (newlyApproved > 0 || newlyRejected > 0 || newlyCreated > 0) {
              const title = newlyCreated > 0 ? 'สร้างรายการใหม่เรียบร้อย' : 'อัปเดตสถานะใบสั่งขาย';
              const icon = newlyCreated > 0 ? '📝' : (newlyRejected > 0 ? '⚠️' : '🎉');
              Auth.showNotification(title, details.join('<br>'), icon);
           }
           
           localStorage.setItem(knownStatusKey, JSON.stringify(knownStatuses));
        }

        // Dispatch global event so active pages (like history.html) can sync data
        window.dispatchEvent(new CustomEvent('so_orders_updated', { detail: validOrders }));

      } catch(e) { /* silent mode */ }
    };
    
    // Check shortly after load
    setTimeout(checkNotifications, 2000);
    // Then poll every 15 seconds
    notificationIntervalId = setInterval(checkNotifications, 15000);
  }
};

// Check on every page load
document.addEventListener("DOMContentLoaded", () => {
    const user = Auth.checkAuth();
    if(user) {
        Auth.renderUI(user);
    }

    // --- Global Horizontal Swipe for Tables ---
    let startX = null;
    let startY = null;
    let isSwiping = false;

    document.addEventListener("touchstart", function(e) {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      isSwiping = false;
    }, {passive: true});

    document.addEventListener("touchmove", function(e) {
      if (!startX || !startY) return;
      
      const tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.target.closest('.table-wrapper')) return; // Let native override handle it directly

      const currentX = e.touches[0].clientX;
      const currentY = e.touches[0].clientY;
      const diffX = startX - currentX;
      const diffY = startY - currentY;

      if (!isSwiping) {
        if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 8) {
          isSwiping = true;
        } else if (Math.abs(diffY) > Math.abs(diffX) && Math.abs(diffY) > 8) {
          startX = null;
          startY = null;
          return;
        }
      }

      if (isSwiping) {
        let scrolled = false;
        document.querySelectorAll(".table-wrapper").forEach(wrapper => {
           if (wrapper.scrollWidth > wrapper.clientWidth) {
              wrapper.scrollLeft += diffX;
              scrolled = true;
           }
        });
        
        if (scrolled && e.cancelable) {
           e.preventDefault(); 
        }
        
        startX = currentX;
        startY = currentY;
      }
    }, {passive: false});
});
