/* =========================================================
   app.js — Sale Order Client-Side Logic (Static Version)
   ========================================================= */

// ─── GLOBAL ERROR HANDLER ────────────────────────────────
window.onerror = function (msg, url, line) {
  console.error("JS Error:", msg, "line:", line);
  try {
    hideLoading();
  } catch (e) {}
  return false;
};

// ─── GLOBALS ────────────────────────────────────────────
let masterProducts = [];
let masterSalespersons = [];
let thaiAddressDB = [];
let rowCounter = 0;

// ─── PAGE NAVIGATION ──────────────────────────────────
function goPage(page) {
  let target = page === "index" ? "index.html" : page + ".html";
  if (page === "product") target = "master-product.html";
  if (page === "salesperson") target = "master-salesperson.html";
  window.location.href = "./" + target;
}

// ─── ON PAGE LOAD ───────────────────────────────────────
document.addEventListener("DOMContentLoaded", function () {
  loadMasterData();
  setDefaultDate();
  initDatePickers();
});

function initDatePickers() {
  const pairs = [
    { text: "soDate", pick: "soDatePick" },
    { text: "deliveryDate", pick: "deliveryDatePick" },
  ];

  pairs.forEach((p) => {
    const textEl = document.getElementById(p.text);
    const pickEl = document.getElementById(p.pick);
    if (!textEl || !pickEl) return;

    pickEl.addEventListener("change", function () {
      if (!this.value) return;
      const [y, m, d] = this.value.split("-");
      const beYear = parseInt(y) + 543;
      textEl.value = `${d}/${m}/${beYear}`;
    });
  });
}

function togglePicker(id) {
  const el = document.getElementById(id);
  if (el && el.showPicker) {
    el.showPicker();
  } else if (el) {
    el.focus();
    el.click();
  }
}

function setDefaultDate() {
  const today = new Date();
  const beYear = today.getFullYear() + 543;
  const mm = ("0" + (today.getMonth() + 1)).slice(-2);
  const dd = ("0" + today.getDate()).slice(-2);
  const dateInput = document.getElementById("soDate");
  if (dateInput) dateInput.value = dd + "/" + mm + "/" + beYear;
}

// ─── LOAD MASTER DATA ───────────────────────────────────
async function loadMasterData() {
  const isIndex = !!document.getElementById("salesId");
  if (!isIndex) return;

  if (!isIndex) return;
  showLoading(
    "กำลังเตรียมระบบ...",
    "กรุณารอสักครู่ ระบบกำลังโหลดข้อมูลพื้นฐานจากเซิร์ฟเวอร์",
  );

  let isDone = false;
  const safetyTimer = setTimeout(function () {
    if (!isDone) {
      hideLoading();
      if (rowCounter === 0) addProductRow();
      showToast("การดึงข้อมูลล่าช้า อาจมีปัญหาการเชื่อมต่อ", "warning");
    }
  }, 10000);

  try {
    // Load all data in parallel
    const [spRes, prRes, addrRes] = await Promise.all([
      API.getSalespersons({ activeOnly: true }).catch((e) => {
        console.error("Salespersons error:", e);
        return { success: false, error: e.message };
      }),
      API.getProducts().catch((e) => {
        console.error("Products error:", e);
        return { success: false, error: e.message };
      }),
      API.getThaiAddressDB().catch((e) => {
        console.error("Address DB error:", e);
        return { success: false, error: e.message };
      }),
    ]);

    isDone = true;
    clearTimeout(safetyTimer);

    // 1. Process Salespersons
    if (spRes && spRes.success && Array.isArray(spRes.data)) {
      masterSalespersons = spRes.data;
    } else {
      console.error("Failed to load salespersons:", spRes);
      showToast("⚠️ โหลดพนักงานขายไม่สำเร็จ", "error");
    }
    populateSalespersonDropdown();

    // 2. Process Products
    if (prRes && prRes.success && Array.isArray(prRes.data)) {
      masterProducts = prRes.data;
    } else {
      console.error("Failed to load products:", prRes);
      showToast("⚠️ โหลดข้อมูลสินค้าไม่สำเร็จ", "error");
    }

    // 3. Process Address Data
    if (addrRes && addrRes.success && Array.isArray(addrRes.data)) {
      thaiAddressDB = addrRes.data;
      initAddressAutocomplete(
        "billingDistrict",
        "billingAmphoe",
        "billingProvince",
        "billingZipcode",
      );
      initAddressAutocomplete(
        "shippingDistrict",
        "shippingAmphoe",
        "shippingProvince",
        "shippingZipcode",
      );
    } else {
      console.error("Failed to load address data:", addrRes);
      showToast("⚠️ โหลดสมุดรายนามที่อยู่ไม่สำเร็จ", "error");
    }

    hideLoading();
    if (rowCounter === 0) addProductRow();
  } catch (err) {
    console.error("Fatal data loading error:", err);
    isDone = true;
    clearTimeout(safetyTimer);
    hideLoading();
    showToast("เกิดข้อผิดพลาดในการโหลดข้อมูล: " + err.message, "error");
  }
}

// ─── SALESPERSON DROPDOWN ───────────────────────────────
function populateSalespersonDropdown() {
  const sel = document.getElementById("salesId");
  if (!sel) return;
  sel.innerHTML = '<option value="">-- เลือกพนักงานขาย --</option>';
  masterSalespersons.forEach(function (sp) {
    const opt = document.createElement("option");
    opt.value = sp.Sales_ID;
    opt.textContent = sp.Sales_ID + " - " + sp.Sales_Name;
    sel.appendChild(opt);
  });
}

// ─── ADDRESS AUTO-COMPLETE ──────────────────────────────
function initAddressAutocomplete(districtId, amphoeId, provinceId, zipcodeId) {
  const ids = [districtId, amphoeId, provinceId, zipcodeId];
  const sameAddressCheck = document.getElementById("sameAddress");

  ids.forEach(function (currentId) {
    const input = document.getElementById(currentId);
    if (!input) return;

    const wrapper = input.closest(".autocomplete-wrapper");
    if (!wrapper) return;
    const listEl = wrapper.querySelector(".autocomplete-list");

    input.addEventListener("input", function () {
      const query = this.value.trim().toLowerCase();
      if (query.length < 1) {
        listEl.classList.remove("show");
        return;
      }

      const matches = thaiAddressDB
        .filter(function (item) {
          const d = (item.d || "").toLowerCase();
          const a = (item.a || "").toLowerCase();
          const p = (item.p || "").toLowerCase();
          const z = (item.z || "").toLowerCase();

          return (
            d.indexOf(query) !== -1 ||
            a.indexOf(query) !== -1 ||
            p.indexOf(query) !== -1 ||
            z.indexOf(query) !== -1
          );
        })
        .slice(0, 20);

      listEl.innerHTML = "";
      if (matches.length === 0) {
        listEl.classList.remove("show");
        return;
      }

      matches.forEach(function (item) {
        const div = document.createElement("div");
        div.className = "autocomplete-item";
        div.innerHTML =
          '<span class="district">' +
          item.d +
          "</span>" +
          '<span class="detail"> » ' +
          item.a +
          " » " +
          item.p +
          " » " +
          item.z +
          "</span>";
        div.addEventListener("click", function () {
          document.getElementById(districtId).value = item.d;
          document.getElementById(amphoeId).value = item.a;
          document.getElementById(provinceId).value = item.p;
          document.getElementById(zipcodeId).value = item.z;
          listEl.classList.remove("show");

          // If "Same as Billing" is checked and we are editing billing, update shipping too
          if (
            sameAddressCheck &&
            sameAddressCheck.checked &&
            currentId.indexOf("billing") === 0
          ) {
            toggleSameAddress(sameAddressCheck);
          }
        });
        listEl.appendChild(div);
      });
      listEl.classList.add("show");
    });

    document.addEventListener("click", function (e) {
      if (!wrapper.contains(e.target)) listEl.classList.remove("show");
    });
  });
}

// ─── SAME AS BILLING CHECKBOX ───────────────────────────
function toggleSameAddress(checkbox) {
  const fields = ["Detail", "District", "Amphoe", "Province", "Zipcode"];
  if (checkbox.checked) {
    fields.forEach(function (f) {
      const src = document.getElementById("billing" + f);
      const dst = document.getElementById("shipping" + f);
      if (src && dst) dst.value = src.value;
    });
    // Also clear or set Name/Phone if needed, though they aren't on billing.
    // Usually "same address" just applies to the address parts.
  }
}

// ─── BRANCH AND PAYMENT DOM LOGIC ───────────────────────
function toggleBranchInput() {
  const isBranch = document.getElementById("billingBranch").checked;
  const branchInput = document.getElementById("billingBranchCode");
  if (isBranch) {
    branchInput.disabled = false;
    branchInput.style.opacity = "1";
    branchInput.focus();
  } else {
    branchInput.disabled = true;
    branchInput.style.opacity = "0.6";
    branchInput.value = "";
    branchInput.style.borderColor = "#e2e8f0";
    const errEl = document.getElementById("branchCodeError");
    if (errEl) errEl.style.display = "none";
  }
}

function togglePaymentTerms() {
  const type = document.getElementById("paymentType").value;
  const termGroup = document.getElementById("paymentTermGroup");
  const termSelect = document.getElementById("paymentTerm");

  if (type === "") {
    termGroup.style.display = "none";
    termSelect.innerHTML = '<option value="">-- เลือก --</option>';
  } else {
    termGroup.style.display = "flex";
    termSelect.innerHTML = '<option value="">-- เลือก --</option>';
    if (type === "ขายสด") {
      termSelect.innerHTML += '<option value="เงินสด">เงินสด</option>';
      termSelect.innerHTML += '<option value="บัตรเครดิต">บัตรเครดิต</option>';
      termSelect.innerHTML += '<option value="เงินโอน">เงินโอน</option>';
    } else if (type === "ขายเชื่อ") {
      termSelect.innerHTML +=
        '<option value="เครดิต 30 วัน">เครดิต 30 วัน</option>';
      termSelect.innerHTML +=
        '<option value="เครดิต 60 วัน">เครดิต 60 วัน</option>';
      termSelect.innerHTML +=
        '<option value="เครดิต 90 วัน">เครดิต 90 วัน</option>';
      termSelect.innerHTML +=
        '<option value="ชำระเมื่อได้รับสินค้า">ชำระเมื่อได้รับสินค้า</option>';
    } else if (type === "แบ่งชำระบริษัท") {
      termSelect.innerHTML += '<option value="แบ่งชำระ 4 งวด">แบ่งชำระ 4 งวด</option>';
      termSelect.innerHTML += '<option value="แบ่งชำระ 6 งวด">แบ่งชำระ 6 งวด</option>';
      termSelect.innerHTML += '<option value="แบ่งชำระ 8 งวด">แบ่งชำระ 8 งวด</option>';
      termSelect.innerHTML += '<option value="แบ่งชำระ 10 งวด">แบ่งชำระ 10 งวด</option>';
    }
  }
}

// ─── PRODUCT TABLE: ADD ROW ───────────────────────────
function addProductRow() {
  rowCounter++;
  const tbody = document.getElementById("productTableBody");
  if (!tbody) return;
  const tr = document.createElement("tr");
  tr.setAttribute("data-row", rowCounter);

  const unitOptions =
    '<option value="">-</option>' +
    '<option value="ชิ้น">ชิ้น</option><option value="ชุด">ชุด</option>' +
    '<option value="อัน">อัน</option><option value="กล่อง">กล่อง</option>' +
    '<option value="แพ็ค">แพ็ค</option><option value="ม้วน">ม้วน</option>' +
    '<option value="ขวด">ขวด</option><option value="หลอด">หลอด</option>' +
    '<option value="ซอง">ซอง</option><option value="ถุง">ถุง</option>' +
    '<option value="เครื่อง">เครื่อง</option><option value="ตัว">ตัว</option>' +
    '<option value="คู่">คู่</option><option value="ดวง">ดวง</option>' +
    '<option value="ผืน">ผืน</option><option value="เส้น">เส้น</option>' +
    '<option value="ด้าม">ด้าม</option><option value="กระป๋อง">กระป๋อง</option>';

  tr.innerHTML =
    '<td class="td-no">' +
    rowCounter +
    "</td>" +
    '<td class="col-code">' +
    '<div class="search-select-wrapper">' +
    '<input type="text" class="search-select-input product-search" placeholder="พิมพ์ค้นหาสินค้า..." autocomplete="off" onfocus="openProductSearch(this)" oninput="filterProductSearch(this)">' +
    '<input type="hidden" class="product-select-value">' +
    '<div class="search-select-list"></div>' +
    "</div>" +
    "</td>" +
    '<td class="col-name"><input type="text" class="product-name" placeholder="ชื่อสินค้า" readonly></td>' +
    '<td class="col-qty"><input type="number" class="qty" value="1" min="1" oninput="calculateRowTotal(this)"></td>' +
    '<td class="col-unit"><select class="unit" onchange="calculateRowTotal(this)">' +
    unitOptions +
    "</select></td>" +
    '<td class="col-price"><input type="number" class="unit-price" value="0" step="0.01" oninput="calculateRowTotal(this)"></td>' +
    '<td class="col-disc"><input type="number" class="discount" value="0" step="0.01" oninput="calculateRowTotal(this)"></td>' +
    '<td class="col-total"><span class="total-display">0.00</span></td>' +
    '<td class="col-remark"><textarea class="item-remark" placeholder="หมายเหตุ" rows="1"></textarea></td>' +
    '<td class="col-action"><button class="btn-delete" type="button" onclick="removeProductRow(this)" title="ลบรายการ">🗑</button></td>';

  tbody.appendChild(tr);
  updateRowNumbers();
}

// ─── SEARCHABLE PRODUCT DROPDOWN ────────────────────────

// ─── FLOATING PRODUCT DROPDOWN (pops out of table) ────────
var _activeProductInput = null;
var _productFloatEl = null;

function getProductFloatEl() {
  if (!_productFloatEl) {
    _productFloatEl = document.createElement("div");
    _productFloatEl.id = "productFloatDropdown";
    _productFloatEl.style.cssText =
      "position:fixed;z-index:99999;background:#fff;" +
      "border:1.5px solid #93c5fd;border-radius:0 0 8px 8px;" +
      "max-height:220px;overflow-y:auto;display:none;" +
      "box-shadow:0 10px 25px rgba(0,0,0,.15);";
    document.body.appendChild(_productFloatEl);
  }
  return _productFloatEl;
}

function positionFloatDropdown(input) {
  var dd = getProductFloatEl();
  var rect = input.getBoundingClientRect();
  dd.style.left = rect.left + "px";
  dd.style.top = rect.bottom + "px";
  dd.style.width = rect.width + "px";
}

function openProductSearch(input) {
  _activeProductInput = input;
  var dd = getProductFloatEl();
  renderProductList(dd, "");
  positionFloatDropdown(input);
  dd.style.display = "block";
}

function filterProductSearch(input) {
  _activeProductInput = input;
  var dd = getProductFloatEl();
  renderProductList(dd, input.value.trim().toLowerCase());
  positionFloatDropdown(input);
  dd.style.display = "block";
}

function renderProductList(list, query) {
  list.innerHTML = "";
  const filtered = masterProducts.filter(function (p) {
    if (!query) return true;
    return (
      (p.Product_Code + " " + p.Product_Name).toLowerCase().indexOf(query) !==
      -1
    );
  });
  if (filtered.length === 0) {
    list.innerHTML =
      '<div style="padding:10px 14px;color:#94a3b8;font-size:13px;">ไม่พบสินค้า</div>';
    return;
  }
  filtered.forEach(function (p) {
    const div = document.createElement("div");
    div.className = "search-select-item";
    div.innerHTML =
      '<span class="code">' +
      p.Product_Code +
      "</span>" +
      '<span class="name">' +
      p.Product_Name +
      "</span>";
    div.addEventListener("click", function (e) {
      e.stopPropagation();
      selectProduct(p);
    });
    list.appendChild(div);
  });
}

function selectProduct(product) {
  if (!_activeProductInput) return;
  var wrapper = _activeProductInput.closest(".search-select-wrapper");
  var row = wrapper.closest("tr");
  var hidden = wrapper.querySelector(".product-select-value");

  _activeProductInput.value =
    product.Product_Code + " - " + product.Product_Name;
  hidden.value = product.Product_Code;

  row.querySelector(".product-name").value = product.Product_Name || "";
  const unitSelect = row.querySelector(".unit");
  if (product.Unit) {
    unitSelect.value = product.Unit;
    if (!unitSelect.value) {
      const opt = document.createElement("option");
      opt.value = product.Unit;
      opt.textContent = product.Unit;
      unitSelect.appendChild(opt);
      unitSelect.value = product.Unit;
    }
  }
  row.querySelector(".unit-price").value = product.Unit_Price || 0;
  calculateRowTotal(row.querySelector(".unit-price"));

  // Close dropdown
  var dd = getProductFloatEl();
  dd.style.display = "none";
  _activeProductInput = null;
}

document.addEventListener("click", function (e) {
  // Close floating product dropdown
  if (
    _activeProductInput &&
    !e.target.closest(".search-select-wrapper") &&
    e.target !== _productFloatEl &&
    !_productFloatEl.contains(e.target)
  ) {
    var dd = getProductFloatEl();
    dd.style.display = "none";
    _activeProductInput = null;
  }
  if (!e.target.closest(".autocomplete-wrapper")) {
    document.querySelectorAll(".autocomplete-list").forEach(function (l) {
      l.classList.remove("show");
    });
  }
});

// Reposition dropdown on scroll
window.addEventListener(
  "scroll",
  function () {
    if (
      _activeProductInput &&
      _productFloatEl &&
      _productFloatEl.style.display !== "none"
    ) {
      positionFloatDropdown(_activeProductInput);
    }
  },
  true,
);

function removeProductRow(btn) {
  const tbody = document.getElementById("productTableBody");
  if (tbody.rows.length <= 1) {
    showToast("ต้องมีรายการสินค้าอย่างน้อย 1 รายการ", "error");
    return;
  }
  btn.closest("tr").remove();
  updateRowNumbers();
  calculateSummary();
}

function updateRowNumbers() {
  const rows = document.getElementById("productTableBody").rows;
  for (let i = 0; i < rows.length; i++) {
    rows[i].querySelector(".td-no").textContent = i + 1;
  }
}

function calculateRowTotal(inputEl) {
  const row = inputEl.closest("tr");
  const qty = parseFloat(row.querySelector(".qty").value) || 0;
  const price = parseFloat(row.querySelector(".unit-price").value) || 0;
  const discount = parseFloat(row.querySelector(".discount").value) || 0;
  let total = round2(qty * price - discount);
  if (total < 0) total = 0;
  row.querySelector(".total-display").textContent = formatNumber(total);
  calculateSummary();
}

function round2(num) {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

function calculateSummary() {
  const tbody = document.getElementById("productTableBody");
  if (!tbody) return;
  const rows = tbody.rows;

  let subtotalGross = 0;
  let totalDiscount = 0;

  for (let i = 0; i < rows.length; i++) {
    const qty = parseFloat(rows[i].querySelector(".qty").value) || 0;
    const price = parseFloat(rows[i].querySelector(".unit-price").value) || 0;
    const discount = parseFloat(rows[i].querySelector(".discount").value) || 0;
    subtotalGross += round2(qty * price);
    totalDiscount += round2(discount);
  }

  let subtotalNet = subtotalGross - totalDiscount;
  if (subtotalNet < 0) subtotalNet = 0;

  const deposit =
    parseFloat(document.getElementById("depositAmount").value) || 0;
  let grandTotal = round2(subtotalNet - deposit);
  if (grandTotal < 0) grandTotal = 0;

  // Base Amount before VAT = Grand Total / 1.07
  const baseAmount = round2(grandTotal / 1.07);
  const vatAmount = round2(grandTotal - baseAmount);

  const setIfExist = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = formatNumber(val);
  };

  setIfExist("subtotalDisplay", subtotalGross);
  setIfExist("totalDiscountDisplay", totalDiscount);
  setIfExist("afterDiscountDisplay", subtotalNet);
  setIfExist("depositDisplay", deposit);
  setIfExist("baseAmountDisplay", baseAmount);
  setIfExist("vatAmountDisplay", vatAmount);
  setIfExist("grandTotal", grandTotal);
}

function formatNumber(num) {
  return num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// ─── VALIDATE FORM ──────────────────────────────────────
function validateBranchCodeRealtime(el) {
  if (!el) return true;
  const branchType = document.querySelector('input[name="billingBranchType"]:checked');
  if (!branchType || branchType.value !== "Branch") {
    el.style.borderColor = "#e2e8f0";
    const errEl = document.getElementById("branchCodeError");
    if (errEl) errEl.style.display = "none";
    return true;
  }
  
  const val = el.value.trim();
  const num = parseInt(val, 10);
  const errEl = document.getElementById("branchCodeError");
  
  if (val.length > 5 || isNaN(num) || num < 0 || num > 100) {
    el.style.borderColor = "#ef4444"; // Red border
    if (errEl) errEl.style.display = "block";
    return false;
  } else {
    el.style.borderColor = "#10b981"; // Green border for success
    if (errEl) errEl.style.display = "none";
    return true;
  }
}

function validateForm() {
  const required = [
    { id: "customerName", label: "ชื่อลูกค้า" },
    { id: "salesId", label: "พนักงานขาย" },
  ];
  for (let i = 0; i < required.length; i++) {
    const el = document.getElementById(required[i].id);
    if (!el.value.trim()) {
      showToast("กรุณากรอก: " + required[i].label, "error");
      el.focus();
      return false;
    }
  }
  
  const branchType = document.querySelector('input[name="billingBranchType"]:checked');
  if (branchType && branchType.value === "Branch") {
    const branchCodeEl = document.getElementById("billingBranchCode");
    if (!validateBranchCodeRealtime(branchCodeEl)) {
      showToast("กรุณาระบุรหัสสาขาให้ถูกต้อง (ระบุเป็นตัวเลข สูงสุด 5 หลัก)", "error");
      branchCodeEl.focus();
      return false;
    }
  }
  const rows = document.getElementById("productTableBody").rows;
  let hasProduct = false;
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].querySelector(".product-select-value").value) {
      hasProduct = true;
      break;
    }
  }
  if (!hasProduct) {
    showToast("กรุณาเลือกสินค้าอย่างน้อย 1 รายการ", "error");
    return false;
  }
  return true;
}

// ═══════════════════════════════════════════════════════
// SUBMIT API FLOW
// ═══════════════════════════════════════════════════════
function submitSaleOrder() {
  if (!validateForm()) return;

  const grandTotal = document.getElementById("grandTotal").textContent;
  const custName = document.getElementById("customerName").value;
  showConfirmModal(
    "📋 ยืนยันการสร้างใบสั่งขาย",
    "คุณต้องการบันทึกใบสั่งขายให้ลูกค้า <strong>" +
      custName +
      "</strong><br>ยอดรวมทั้งสิ้น <strong>" +
      grandTotal +
      " บาท</strong><br><br>กรุณาตรวจสอบข้อมูลให้ถูกต้องก่อนกดยืนยัน",
    "ยืนยัน บันทึกเลย",
    "ยกเลิก ตรวจสอบอีกครั้ง",
    function () {
      doSave();
    },
  );
}

async function doSave() {
  showLoading("กำลังบันทึกใบสั่งขาย...", "ระบบกำลังส่งข้อมูลไปยังฐานข้อมูล");

  const billingBranchType = document.querySelector('input[name="billingBranchType"]:checked').value;
  const billingBranchCode = billingBranchType === "Branch" ? document.getElementById("billingBranchCode").value : "00000";

  const billingParts = [
    billingBranchType === "Branch" ? `(สาขา ${billingBranchCode})` : "(สำนักงานใหญ่)",
    document.getElementById("billingDetail").value,
    "ต." + document.getElementById("billingDistrict").value,
    "อ." + document.getElementById("billingAmphoe").value,
    "จ." + document.getElementById("billingProvince").value,
    document.getElementById("billingZipcode").value,
  ];
  const billingAddress = billingParts
    .filter(function (p) {
      return p && p !== "ต." && p !== "อ." && p !== "จ.";
    })
    .join(" ");

  const shippingParts = [
    document.getElementById("shippingDetail").value,
    "ต." + document.getElementById("shippingDistrict").value,
    "อ." + document.getElementById("shippingAmphoe").value,
    "จ." + document.getElementById("shippingProvince").value,
    document.getElementById("shippingZipcode").value,
  ];
  const recipientName = document.getElementById("shippingRecipientName").value.trim();
  const recipientPhone = document.getElementById("shippingRecipientPhone").value.trim();
  let shipSuffix = "";
  if (recipientName || recipientPhone) {
    shipSuffix = ` (${recipientName}${recipientName && recipientPhone ? ' ' : ''}${recipientPhone})`;
  }

  const shippingAddress = shippingParts
    .filter(function (p) {
      return p && p !== "ต." && p !== "อ." && p !== "จ.";
    })
    .join(" ") + (shipSuffix ? " " + shipSuffix : "");

  const items = [];
  const rows = document.getElementById("productTableBody").rows;
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const code = r.querySelector(".product-select-value").value;
    if (!code) continue;
    items.push({
      Product_Code: code,
      Product_Name: r.querySelector(".product-name").value,
      Qty: r.querySelector(".qty").value,
      Unit: r.querySelector(".unit").value,
      Unit_Price: r.querySelector(".unit-price").value,
      Discount: r.querySelector(".discount").value,
      Total_Price: r
        .querySelector(".total-display")
        .textContent.replace(/,/g, ""),
      Item_Remark: r.querySelector(".item-remark").value,
    });
  }

  const formData = {
    SO_Date: document.getElementById("soDate").value,
    Customer_ID: document.getElementById("customerId").value,
    Customer_Name: document.getElementById("customerName").value,
    Tax_ID: document.getElementById("taxId").value,
    Billing_Address: billingAddress,
    Billing_Branch_Type: billingBranchType,
    Billing_Branch_Code: billingBranchCode,
    Shipping_Address: shippingAddress,
    Shipping_Recipient_Name: document.getElementById("shippingRecipientName").value,
    Shipping_Recipient_Phone: document.getElementById("shippingRecipientPhone").value,
    Phone: document.getElementById("customerPhone").value,
    Email: document.getElementById("customerEmail").value,
    Contact_Person: document.getElementById("contactPerson").value,
    Sales_ID: document.getElementById("salesId").value,
    Payment_Type: document.getElementById("paymentType").value,
    Payment_Term: document.getElementById("paymentTerm").value,
    Delivery_Method: document.getElementById("deliveryMethod").value,
    Delivery_Date: document.getElementById("deliveryDate").value,
    Remarks: document.getElementById("remarks").value,

    // New 7-line summary amounts
    Subtotal: document.getElementById("subtotalDisplay").textContent.replace(/,/g, ""),
    Discount_Total: document.getElementById("totalDiscountDisplay").textContent.replace(/,/g, ""),
    After_Discount: document.getElementById("afterDiscountDisplay").textContent.replace(/,/g, ""),
    Deposit_Amount: document.getElementById("depositDisplay").textContent.replace(/,/g, ""),
    Base_Amount: document.getElementById("baseAmountDisplay").textContent.replace(/,/g, ""),
    VAT_Amount: document.getElementById("vatAmountDisplay").textContent.replace(/,/g, ""),
    Grand_Total: document.getElementById("grandTotal").textContent.replace(/,/g, ""),
    
    // New deposit proof image
    Deposit_Proof_Base64: document.getElementById("depositProofBase64").value,
    
    // Fallback for older script logic if any
    Total_Exempted_VAT: document.getElementById("subtotalDisplay").textContent.replace(/,/g, ""),

    items: items,
  };

  try {
    const result = await API.saveSaleOrder(formData);
    hideLoading();
    if (result.success) {
      const soNum = result.data || "N/A";
      // Added a slight delay as requested to ensure user feels the confirmation
      setTimeout(function () {
        showSuccessModal(soNum);
      }, 500);
    } else {
      showErrorModal(
        "บันทึกไม่สำเร็จ",
        "เกิดข้อผิดพลาด: " + result.error + "<br>กรุณาลองใหม่อีกครั้ง",
      );
    }
  } catch (err) {
    hideLoading();
    showErrorModal(
      "เกิดข้อผิดพลาด",
      "ระบบเชื่อมต่อ API ไม่สำเร็จ<br>" +
        err.message +
        "<br>กรุณาลองใหม่อีกครั้ง",
    );
  }
}

// ═══════════════════════════════════════════════════════
// ANIMATED MODALS
// ═══════════════════════════════════════════════════════
function showConfirmModal(title, desc, yesText, noText, onYes) {
  const el = document.getElementById("confirmModal");
  if (!el) return;
  document.getElementById("confirmTitle").innerHTML = title;
  document.getElementById("confirmDesc").innerHTML = desc;
  document.getElementById("confirmYesBtn").textContent = yesText || "ยืนยัน";
  document.getElementById("confirmNoBtn").textContent = noText || "ยกเลิก";

  document.getElementById("confirmYesBtn").onclick = function () {
    el.classList.remove("show");
    if (onYes) onYes();
  };
  document.getElementById("confirmNoBtn").onclick = function () {
    el.classList.remove("show");
  };

  const modal = el.querySelector(".modal");
  modal.style.animation = "none";
  setTimeout(function () {
    modal.style.animation = "";
  }, 10);
  el.classList.add("show");
}

function showSuccessModal(soNumber) {
  const el = document.getElementById("successModal");
  if (!el) return;
  document.getElementById("modalSONumber").textContent = soNumber;
  const modal = el.querySelector(".modal");
  modal.style.animation = "none";
  setTimeout(function () {
    modal.style.animation = "";
  }, 10);
  el.classList.add("show");
}

function showErrorModal(title, desc) {
  const el = document.getElementById("errorModal");
  if (!el) return;
  document.getElementById("errorTitle").innerHTML = title;
  document.getElementById("errorDesc").innerHTML = desc;
  const modal = el.querySelector(".modal");
  modal.style.animation = "none";
  setTimeout(function () {
    modal.style.animation = "";
  }, 10);
  el.classList.add("show");
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove("show");
  // If we close success modal, clear the form automatically as requested
  if (id === "successModal") {
    clearFormFields();
  }
}

function clearFormFields() {
  const form = document.getElementById("soForm");
  if (form) form.reset();

  const tbody = document.getElementById("productTableBody");
  if (tbody) {
    tbody.innerHTML = "";
    rowCounter = 0;
    addProductRow();
  }

  _soNumber = "";
  calculateSummary();
  setDefaultDate();

  window.scrollTo({ top: 0, behavior: "smooth" });
  toggleBranchInput();
}

// Global click listener for modal backdrops
document.addEventListener("click", function (e) {
  if (e.target.classList.contains("modal-backdrop")) {
    const id = e.target.id;
    closeModal(id);
  }
});


function printSO(soNumber) {
  if (!soNumber)
    soNumber = document.getElementById("modalSONumber").textContent;
  if (typeof fetchAPI !== "undefined") {
    fetchAPI("logAction", {
      actionName: "พิมพ์ใบสั่งขาย",
      details: "เลขที่ SO: " + soNumber,
    }).catch(function () {});
  }
  // Redirect to print template static page, passing SO number via URL params
  window.open("print-template.html?so=" + soNumber, "_blank");
}

function newSO() {
  closeModal("successModal");
  showConfirmModal(
    "🔄 เริ่มสร้างใบสั่งขายใหม่",
    "ระบบจะล้างข้อมูลทั้งหมดในฟอร์มปัจจุบัน<br>คุณแน่ใจหรือไม่?",
    "ยืนยัน เริ่มใหม่",
    "ยกเลิก",
    function () {
      clearFormFields();
      showToast("ล้างฟอร์มเรียบร้อย พร้อมสร้าง SO ใหม่", "success");
    },
  );
}

function resetForm() {
  showConfirmModal(
    "🔄 ล้างข้อมูลทั้งหมด",
    "ข้อมูลที่กรอกไว้ทั้งหมดจะถูกล้าง<br>คุณแน่ใจหรือไม่?",
    "ยืนยัน ล้างข้อมูล",
    "ยกเลิก ไม่ล้าง",
    function () {
      clearFormFields();
      showToast("ล้างฟอร์มเรียบร้อยแล้ว", "success");
    },
  );
}

// ═══════════════════════════════════════════════════════
// LOADING & TOAST
// ═══════════════════════════════════════════════════════
function showLoading(title, desc) {
  const el = document.getElementById("loadingOverlay");
  if (!el) return;
  const titleEl = document.getElementById("loadingText"); // Fixed ID
  const descEl = document.getElementById("loadingSubtext"); // Fixed ID
  if (titleEl && title) titleEl.textContent = title;
  if (descEl && desc) descEl.textContent = desc;
  el.classList.add("show");
}

function hideLoading() {
  const el = document.getElementById("loadingOverlay");
  if (el) el.classList.remove("show");
}

function showConfirmModal(title, desc, yesText, noText, onYes) {
  const el = document.getElementById("confirmModal");
  if (!el) {
    // Fallback if modal is missing
    if (confirm(title + "\n\n" + desc.replace(/<[^>]*>/g, ""))) {
      if (onYes) onYes();
    }
    return;
  }
  const titleEl = document.getElementById("confirmTitle");
  const descEl = document.getElementById("confirmDesc");
  if (titleEl) titleEl.innerHTML = title;
  if (descEl) descEl.innerHTML = desc;

  const yesBtn = document.getElementById("confirmYesBtn");
  const noBtn = document.getElementById("confirmNoBtn");

  if (yesText && yesBtn) yesBtn.textContent = yesText;
  if (noText && noBtn) noBtn.textContent = noText;

  if (yesBtn) {
    yesBtn.onclick = function () {
      el.classList.remove("show");
      if (onYes) onYes();
    };
  }
  if (noBtn) {
    noBtn.onclick = function () {
      el.classList.remove("show");
    };
  }

  el.classList.add("show");
}

function showToast(msg, type) {
  const container = document.getElementById("toastContainer");
  if (!container) return;
  const toast = document.createElement("div");
  toast.className = "toast " + (type || "success");

  let icon = "✓";
  if (type === "error") icon = "✕";
  if (type === "warning") icon = "!";

  toast.innerHTML =
    '<div class="toast-icon">' +
    icon +
    '</div><div class="toast-message">' +
    msg +
    "</div>";
  container.appendChild(toast);

  setTimeout(function () {
    toast.style.animation = "slideOutRight 0.3s forwards";
    setTimeout(function () {
      if (toast.parentNode) toast.remove();
    }, 300);
  }, 3000);
}

function goPage(page) {
  if (page === "index") window.location.href = "index.html";
  if (page === "history") window.location.href = "history.html";
  if (page === "salesperson") window.location.href = "master-salesperson.html";
  if (page === "product") window.location.href = "master-product.html";
}

// ─── DEPOSIT UI TOGGLE ──────────────────────────────────
function toggleDepositInput() {
  const cb = document.getElementById("hasDeposit");
  const container = document.getElementById("depositInputContainer");
  const amt = document.getElementById("depositAmount");
  if (!cb || !container || !amt) return;

  if (cb.checked) {
    container.style.display = "flex";
  } else {
    container.style.display = "none";
    amt.value = "0.00";
    calculateSummary();
  }
}

// ─── DELIVERY DATE TOGGLE ───────────────────────────────
function toggleDeliveryDate() {
  const method = document.getElementById("deliveryMethod").value;
  const dateInput = document.getElementById("deliveryDate");
  const pickerBtn = document.querySelector("#deliveryDate").nextElementSibling.nextElementSibling;
  
  if (method === "จัดส่งโดยบริษัท") {
    dateInput.value = "";
    dateInput.disabled = true;
    if (pickerBtn) pickerBtn.disabled = true;
  } else {
    dateInput.disabled = false;
    if (pickerBtn) pickerBtn.disabled = false;
  }
}

// ─── DEPOSIT PROOF UPLOAD (WEBP COMPRESSION) ────────────
function handleProofUpload(input) {
  const file = input.files[0];
  const statusEl = document.getElementById("proofUploadStatus");
  const base64Input = document.getElementById("depositProofBase64");
  
  if (!file) {
    statusEl.style.display = "none";
    base64Input.value = "";
    return;
  }

  statusEl.style.display = "inline";
  statusEl.textContent = "⏳ กำลังประมวลผล...";
  statusEl.style.color = "#d97706";

  const reader = new FileReader();
  reader.onload = function (e) {
    const img = new Image();
    img.onload = function () {
      const canvas = document.createElement("canvas");
      // Scale down if image is too large (max width 800px)
      let width = img.width;
      let height = img.height;
      if (width > 800) {
        height = Math.round((height * 800) / width);
        width = 800;
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);
      
      // Convert to webp with 0.8 quality
      const webpDataUrl = canvas.toDataURL("image/webp", 0.8);
      base64Input.value = webpDataUrl;
      
      statusEl.textContent = "✅ อัปโหลดสำเร็จ";
      statusEl.style.color = "#059669";
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}
