/* =========================================================
   auth.js — Authentication & Role Management
   ========================================================= */

// Define generic auth functions
const Auth = {
  checkAuth: function() {
    const userStr = localStorage.getItem("so_currentUser");
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
      
      // If we are on login page, redirect to index
      if (isLoginPage) {
        window.location.href = "./index.html";
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
      if (!isLoginPage) window.location.href = "./login.html";
      return null;
    }
  },

  getCurrentUser: function() {
    try {
      return JSON.parse(localStorage.getItem("so_currentUser"));
    } catch(e) { return null; }
  },

  logout: function() {
    localStorage.removeItem("so_currentUser");
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
            <div style="font-weight: 400; font-size: 12px; opacity: 0.85;">${user.role === 'Admin' ? '⭐ Admin' : '🧑‍💻 User'}</div>
          </div>
          <button class="btn-logout-cute" onclick="Auth.confirmLogout()">
            <span style="font-size: 15px;">👋</span> ออกจากระบบ
          </button>
        </div>
      `;
      header.appendChild(infoDiv);
    }

    // Hide or show admin menus
    const adminPages = ["user-management.html", "system-log.html"];
    const navBar = document.querySelector(".nav-bar");
    if (navBar && !window.location.pathname.endsWith("login.html")) {
        // Find existing links
        let hasUsers = false;
        let hasLogs = false;
        
        const links = navBar.querySelectorAll("a");
        links.forEach(link => {
            if(link.textContent.includes("จัดการผู้ใช้")) hasUsers = true;
            if(link.textContent.includes("ประวัติการใช้งาน")) hasLogs = true;
        });

        if (user.role === "Admin") {
            // Append if they don't exist
            if(!hasUsers) {
                const a = document.createElement("a");
                a.innerHTML = "🛡️ จัดการผู้ใช้";
                a.onclick = () => window.location.href = "./user-management.html";
                if(window.location.pathname.endsWith("user-management.html")) a.className = "active";
                navBar.appendChild(a);
            }
            if(!hasLogs) {
                const a = document.createElement("a");
                a.innerHTML = "📡 ประวัติการใช้งาน";
                a.onclick = () => window.location.href = "./system-log.html";
                if(window.location.pathname.endsWith("system-log.html")) a.className = "active";
                navBar.appendChild(a);
            }
        }
    }
  }
};

// Check on every page load
document.addEventListener("DOMContentLoaded", () => {
    const user = Auth.checkAuth();
    if(user) {
        Auth.renderUI(user);
    }
});
