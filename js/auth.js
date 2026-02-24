/* =========================================================
   auth.js — Authentication & Role Management
   ========================================================= */

// Define generic auth functions
let notificationIntervalId = null;

const Auth = {
  getStoredUserStr: function() {
    return localStorage.getItem("so_currentUser") || sessionStorage.getItem("so_currentUser");
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
      const isAdmin = user.role === "Admin";
      
      const isManager = user.role === "Manager";

      // If we are on login page, redirect to appropriate start page
      if (isLoginPage) {
        window.location.href = isManager ? "./history.html" : "./index.html";
        return user;
      }
      
      const isHistoryPage = window.location.pathname.endsWith("history.html");
      const isPrintPage = window.location.pathname.endsWith("print-template.html");
      
      // Restrict Manager to History and Print Template only
      if (isManager && !isHistoryPage && !isPrintPage) {
        window.location.href = "./history.html";
        return user;
      }

      // If a non-admin tries to access admin pages, redirect to index
      const isAdminPage = window.location.pathname.endsWith("user-management.html") || 
                          window.location.pathname.endsWith("system-log.html");
      if (isAdminPage && !isAdmin) {
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
        </style>
        <div style="display: flex; align-items: center; gap: 16px;">
          <div style="text-align: right; color: white;">
            <div style="font-weight: 600; font-size: 14px;">👤 ${user.name}</div>
            <div style="font-weight: 400; font-size: 12px; opacity: 0.85;">
              ${user.role === 'Admin' ? '⭐ ผู้จัดการระบบ (Admin)' : 
                (user.role === 'Manager' ? '💼 ผู้จัดการ (Manager)' : 
                 (user.role === 'Accounting' ? '💴 บัญชี (Accounting)' : '🧑‍💻 พนักงานขาย (User)'))}
            </div>
          </div>
          <button class="btn-logout-cute" onclick="Auth.confirmLogout()">
            <span style="font-size: 15px;">👋</span> ออกจากระบบ
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
        const isManager = user.role === "Manager";
        const isAccounting = user.role === "Accounting";
        const isUser = user.role === "User" || user.role === "Salesperson";
        const isAdmin = user.role === "Admin";

        const links = navBar.querySelectorAll("a");
        links.forEach(link => {
            const text = link.textContent;
            
            if (isAdmin) {
                link.style.display = "flex";
                return;
            }

            if (isManager) {
                if (!text.includes("ประวัติการขาย")) link.style.display = "none";
                else link.style.display = "flex";
            } else if (isAccounting) {
                const allowed = text.includes("ประวัติการขาย") || text.includes("สินค้า");
                link.style.display = allowed ? "flex" : "none";
            } else if (isUser) {
                // User see New Order (Index), History (No Products as per latest request)
                const allowed = text.includes("สร้าง Sale Order") || text.includes("ประวัติการขาย");
                link.style.display = allowed ? "flex" : "none";
            }
        });

        // Admin-specific Extra Menus
        if (isAdmin) {
            let hasUsers = false;
            let hasLogs = false;
            links.forEach(link => {
                if (link.textContent.includes("จัดการผู้ใช้")) hasUsers = true;
                if (link.textContent.includes("ประวัติการใช้งาน")) hasLogs = true;
            });

            if (!hasUsers) {
                const a = document.createElement("a");
                a.innerHTML = "🛡️ จัดการผู้ใช้";
                a.onclick = () => window.location.href = "./user-management.html";
                if(path.endsWith("user-management.html")) a.className = "active";
                navBar.appendChild(a);
            }
            if (!hasLogs) {
                const a2 = document.createElement("a");
                a2.innerHTML = "📝 ประวัติการใช้งาน";
                a2.onclick = () => window.location.href = "./system-log.html";
                if(path.endsWith("system-log.html")) a2.className = "active";
                navBar.appendChild(a2);
            }
        }
    }

    // Page-level Access Control
    if (!isLoginPage && user.role !== "Admin") {
        const role = user.role;
        let allowed = false;
        
        if (role === "Manager") {
            allowed = path.endsWith("history.html");
        } else if (role === "Accounting") {
            allowed = path.endsWith("history.html") || path.endsWith("master-product.html");
        } else if (role === "User" || role === "Salesperson") {
            allowed = path.endsWith("index.html") || path.endsWith("history.html") || path.endsWith("/");
        }

        if (!allowed && !path.endsWith("login.html")) {
            // Show notification before redirect
            this.showNotification("จำกัดสิทธิ์การเข้าถึง", "คุณไม่มีสิทธิ์เข้าใช้งานหน้านี้ ระบบจะพากลับไปยังหน้าที่เข้าถึงได้", "🚫");
            
            setTimeout(() => {
                // Redirect to their default page
                if (role === "Manager") window.location.href = "history.html";
                else if (role === "Accounting") window.location.href = "history.html";
                else window.location.href = "index.html";
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
            background: rgba(15, 23, 42, 0.6);
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            transition: all 0.3s ease;
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
       const plainMsg = msgHtml.replace(/<[^>]+>/g, '\n');
       new Notification(title, { body: plainMsg, icon: 'https://cdn-icons-png.flaticon.com/512/1827/1827370.png' });
    }
  },

  startNotificationPolling: function(user) {
    // Only request permission if not on file:// protocol (which often doesn't persist)
    // and only ask once per user session/browser instance to avoid annoying "every page" prompt
    if (window.Notification && Notification.permission === 'default') {
       const isLocalFile = window.location.protocol === 'file:';
       const alreadyPrompted = localStorage.getItem('so_notification_prompted');
       
       if (!isLocalFile && !alreadyPrompted) {
          Notification.requestPermission().then(() => {
             localStorage.setItem('so_notification_prompted', 'true');
          });
       }
    }

    let localLastPending = -1; // For Manager initial alert on page load
    let lastSyncToken = "";    // For lightweight sync check

    const checkNotifications = async (isInitial = false) => {
      try {
        // Step 1: Lightweight check. Does not count Logs.
        const tokenResult = await API.getSyncToken();
        if (!tokenResult.success || !tokenResult.data) return;
        
        const currentToken = tokenResult.data.orders || "";
        
        // If same token, skip heavy fetch
        if (lastSyncToken && lastSyncToken === currentToken) {
           return; 
        }

        const isUpdate = !!lastSyncToken;
        lastSyncToken = currentToken;

        // Step 2: Fetch full data only if changed or first run
        const result = await API.getSaleOrders();
        if (!result.success) return;
        const orders = result.data || [];
        
        // Removed logs
        
        if (user.role === 'Manager') {
           const newPendingCount = orders.filter(o => !o.Status || o.Status === 'Pending').length;
           
           if (localLastPending === -1) {
              // First run on this page load
              if (newPendingCount > 0) {
                 Auth.showNotification('รายการรออนุมัติ', `คุณมีรายการรออนุมัติทั้งหมด <strong>${newPendingCount} รายการ</strong>`, '🔔');
              }
           } else if (newPendingCount > localLastPending) {
              // New orders arrived while the page was open
              const diff = newPendingCount - localLastPending;
              Auth.showNotification('แจ้งเตือนงานเข้าใหม่', `มีรายการเข้ามาใหม่เพิ่ม <strong>${diff} รายการ</strong>`, '🚨');
           }
           localLastPending = newPendingCount;

        } else if (user.role === 'User' || user.role === 'Salesperson') { 
           // Strictly matching based on Creator ID
           const myOrders = orders.filter(o => {
              const creatorId = String(o.Creator_ID || "").trim();
              return creatorId && creatorId === String(user.id);
           });
           
           let knownStatuses = {};
           try {
             knownStatuses = JSON.parse(localStorage.getItem('so_known_statuses_' + user.id) || '{}');
           } catch(e) {}
           
           let newlyApproved = 0;
           let newlyRejected = 0;
           let details = [];

           myOrders.forEach(o => {
              const prevStatus = knownStatuses[o.SO_Number];
              const currStatus = o.Status || 'Pending';
              
              // Only notify if we knew about the order as Pending before, or if it's a first poll for a non-pending order
              // but we prefer to avoid spam, so only transitions.
              if (prevStatus && prevStatus === 'Pending' && currStatus !== 'Pending') {
                 if (currStatus === 'Approved') {
                    newlyApproved++;
                    details.push(`✅ SO: ${o.SO_Number} <strong style="color:var(--success)">ได้รับการอนุมัติ</strong>`);
                 } else if (currStatus === 'Rejected') {
                    newlyRejected++;
                    details.push(`❌ SO: ${o.SO_Number} <strong style="color:var(--danger)">ไม่ถูกอนุมัติ</strong>`);
                 }
              }
              knownStatuses[o.SO_Number] = currStatus;
           });
           
           if (newlyApproved > 0 || newlyRejected > 0) {
              Auth.showNotification('อัปเดตสถานะใบสั่งขาย', details.join('<br>'), (newlyRejected > 0 && newlyApproved === 0 ? '⚠️' : '🎉'));
           }
           
           localStorage.setItem('so_known_statuses_' + user.id, JSON.stringify(knownStatuses));
        }

        // Dispatch global event so active pages (like history.html) can sync data
        window.dispatchEvent(new CustomEvent('so_orders_updated', { detail: orders }));

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
});
