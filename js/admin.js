/* ==========================================================================
   Arumi Admin Portal — All Logic
   Auth, CRUD (customers, products, invoices), PDF generation (jsPDF)
   ========================================================================== */

const AdminApp = (() => {
  // ---------- Constants ----------
  const VALID_USER = "sumire";
  const VALID_HASH =
    "dd2661f93535beb18228fa092ac81efdac695aa80cb893d92bdfb565efcbd49e";
  const SESSION_KEY = "arumi_session";
  const STORE_CUSTOMERS = "arumi_customers";
  const STORE_PRODUCTS = "arumi_products";
  const STORE_INVOICES = "arumi_invoices";
  const STORE_INVOICE_NUM = "arumi_invoice_counter";

  const MS_TAX_RATE = 0.07;

  const BUSINESS = {
    name: "ARUMI LLC",
    tagline: "Electrical, Mechanical & Plumbing Contractor",
    phone: "(305) 497-9133",
    email: "info@arumielec.com",
    address: "929 Division St Apt 2",
    city: "Biloxi, MS 39530",
    license: "MSBOC Licensed & Insured",
  };

  const DEFAULT_PRODUCTS = [
    {
      id: uid(),
      name: "Panel Upgrade (100A to 200A)",
      description: "Upgrade main electrical panel from 100A to 200A service",
      price: 2500,
      unit: "job",
      createdAt: now(),
    },
    {
      id: uid(),
      name: "Outlet Installation",
      description: "Install new electrical outlet (standard 120V)",
      price: 225,
      unit: "each",
      createdAt: now(),
    },
    {
      id: uid(),
      name: "Ceiling Fan Install",
      description: "Install ceiling fan with wiring",
      price: 250,
      unit: "each",
      createdAt: now(),
    },
    {
      id: uid(),
      name: "Whole House Rewire",
      description: "Complete residential rewiring",
      price: 11000,
      unit: "job",
      createdAt: now(),
    },
    {
      id: uid(),
      name: "EV Charger Install",
      description: "Level 2 EV charger installation (240V)",
      price: 1500,
      unit: "job",
      createdAt: now(),
    },
    {
      id: uid(),
      name: "Recessed Lighting (6 pack)",
      description: "Install 6 recessed LED lights with wiring",
      price: 1100,
      unit: "job",
      createdAt: now(),
    },
    {
      id: uid(),
      name: "Emergency Service Call",
      description: "After-hours emergency electrical service",
      price: 200,
      unit: "hour",
      createdAt: now(),
    },
    {
      id: uid(),
      name: "Electrical Inspection",
      description: "Full residential electrical inspection and report",
      price: 300,
      unit: "job",
      createdAt: now(),
    },
    {
      id: uid(),
      name: "Generator Install",
      description: "Whole-home standby generator with transfer switch",
      price: 5000,
      unit: "job",
      createdAt: now(),
    },
    {
      id: uid(),
      name: "Custom Labor",
      description: "General electrical labor",
      price: 85,
      unit: "hour",
      createdAt: now(),
    },
  ];

  // ---------- Helpers ----------
  function uid() {
    return crypto.randomUUID
      ? crypto.randomUUID()
      : Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
  }

  function now() {
    return new Date().toISOString();
  }

  function load(key) {
    try {
      return JSON.parse(localStorage.getItem(key)) || [];
    } catch {
      return [];
    }
  }

  function save(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  function fmt(n) {
    return (
      "$" +
      Number(n)
        .toFixed(2)
        .replace(/\B(?=(\d{3})+(?!\d))/g, ",")
    );
  }

  function fmtShort(n) {
    if (n >= 1000)
      return "$" + (n / 1000).toFixed(n % 1000 === 0 ? 0 : 1) + "k";
    return "$" + n.toFixed(0);
  }

  function escHtml(s) {
    if (!s) return "";
    return s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  async function sha256(str) {
    const buf = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(str),
    );
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  function getNextInvoiceNum() {
    let n = parseInt(localStorage.getItem(STORE_INVOICE_NUM)) || 1000;
    n++;
    localStorage.setItem(STORE_INVOICE_NUM, n.toString());
    return "INV-" + n;
  }

  function peekNextInvoiceNum() {
    let n = parseInt(localStorage.getItem(STORE_INVOICE_NUM)) || 1000;
    return "INV-" + (n + 1);
  }

  function calcDueDate(dateStr, terms) {
    const d = new Date(dateStr + "T00:00:00");
    const days = { prepaid: 0, net15: 15, net30: 30, net60: 60, net90: 90 };
    d.setDate(d.getDate() + (days[terms] || 30));
    return d;
  }

  function formatDate(d) {
    const months = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    return months[d.getMonth()] + " " + d.getDate() + ", " + d.getFullYear();
  }

  function formatDateShort(isoStr) {
    if (!isoStr) return "";
    const d = new Date(isoStr);
    return d.getMonth() + 1 + "/" + d.getDate() + "/" + d.getFullYear();
  }

  // ---------- Auth ----------
  async function handleLogin(e) {
    e.preventDefault();
    const user = document
      .getElementById("login-user")
      .value.trim()
      .toLowerCase();
    const pass = document.getElementById("login-pass").value;
    const errorEl = document.getElementById("login-error");

    const hash = await sha256(pass);

    if (user === VALID_USER && hash === VALID_HASH) {
      sessionStorage.setItem(SESSION_KEY, uid());
      showDashboard();
      errorEl.textContent = "";
    } else {
      errorEl.textContent = "Invalid username or password.";
      document.getElementById("login-pass").value = "";
    }
  }

  function isAuthenticated() {
    return !!sessionStorage.getItem(SESSION_KEY);
  }

  function logout() {
    sessionStorage.removeItem(SESSION_KEY);
    location.reload();
  }

  function showDashboard() {
    document.getElementById("login-screen").style.display = "none";
    document.getElementById("admin-dashboard").style.display = "block";
    document.getElementById("nav-logout").style.display = "";
    initDashboard();
  }

  // ---------- Init ----------
  function init() {
    // Set today's date for invoice
    const dateInput = document.getElementById("invoice-date");
    if (dateInput) {
      dateInput.value = new Date().toISOString().split("T")[0];
    }

    // Seed default products if empty
    if (load(STORE_PRODUCTS).length === 0) {
      save(STORE_PRODUCTS, DEFAULT_PRODUCTS);
    }

    if (isAuthenticated()) {
      showDashboard();
    }
  }

  function initDashboard() {
    updateStats();
    renderCustomers();
    renderProducts();
    populateCustomerDropdown();
    renderSavedInvoices();
    renderRecentInvoices();
    addLineItem();
  }

  // ---------- Tab Switching ----------
  function switchTab(tab) {
    document
      .querySelectorAll(".tab-content")
      .forEach((el) => el.classList.remove("active"));
    document
      .querySelectorAll(".sidebar-tab")
      .forEach((el) => el.classList.remove("active"));
    document.getElementById("tab-" + tab).classList.add("active");
    document
      .querySelector(`.sidebar-tab[data-tab="${tab}"]`)
      .classList.add("active");

    if (tab === "dashboard") updateStats();
    if (tab === "invoices") populateCustomerDropdown();
  }

  // ---------- Stats ----------
  function updateStats() {
    const customers = load(STORE_CUSTOMERS);
    const products = load(STORE_PRODUCTS);
    const invoices = load(STORE_INVOICES);
    const revenue = invoices.reduce(
      (sum, inv) => sum + (inv.grandTotal || 0),
      0,
    );

    document.getElementById("stat-customers").textContent = customers.length;
    document.getElementById("stat-products").textContent = products.length;
    document.getElementById("stat-invoices").textContent = invoices.length;
    document.getElementById("stat-revenue").textContent = fmtShort(revenue);
  }

  // ---------- Customers CRUD ----------
  function renderCustomers() {
    const customers = load(STORE_CUSTOMERS);
    const search = (
      document.getElementById("customer-search")?.value || ""
    ).toLowerCase();
    const filtered = search
      ? customers.filter(
          (c) =>
            (c.company || "").toLowerCase().includes(search) ||
            (c.contact || "").toLowerCase().includes(search) ||
            (c.email || "").toLowerCase().includes(search),
        )
      : customers;

    const tbody = document.getElementById("customers-body");
    const empty = document.getElementById("customers-empty");

    if (filtered.length === 0) {
      tbody.innerHTML = "";
      empty.style.display = "";
      return;
    }

    empty.style.display = "none";
    tbody.innerHTML = filtered
      .map(
        (c) => `
      <tr>
        <td>${escHtml(c.company)}</td>
        <td>${escHtml(c.contact)}</td>
        <td>${escHtml(c.email)}</td>
        <td>${escHtml(c.phone)}</td>
        <td>
          <div class="action-btns">
            <button class="btn-edit" onclick="AdminApp.openCustomerModal(false, '${c.id}')">Edit</button>
            <button class="btn-delete" onclick="AdminApp.deleteCustomer('${c.id}')">Del</button>
          </div>
        </td>
      </tr>
    `,
      )
      .join("");
  }

  function openCustomerModal(fromInvoice = false, editId = null) {
    const customer = editId
      ? load(STORE_CUSTOMERS).find((c) => c.id === editId)
      : null;
    const title = customer ? "Edit Customer" : "Add Customer";

    document.getElementById("modal-title").textContent = title;
    document.getElementById("modal-body").innerHTML = `
      <form id="customer-form" onsubmit="AdminApp.saveCustomer(event, ${fromInvoice ? "true" : "false"}, ${editId ? `'${editId}'` : "null"})">
        <div class="form-group">
          <label for="cf-company">Company Name *</label>
          <input type="text" id="cf-company" required value="${escHtml(customer?.company || "")}">
        </div>
        <div class="form-group">
          <label for="cf-contact">Contact Name</label>
          <input type="text" id="cf-contact" value="${escHtml(customer?.contact || "")}">
        </div>
        <div class="form-group">
          <label for="cf-email">Email</label>
          <input type="email" id="cf-email" value="${escHtml(customer?.email || "")}">
        </div>
        <div class="form-group">
          <label for="cf-phone">Phone</label>
          <input type="tel" id="cf-phone" value="${escHtml(customer?.phone || "")}">
        </div>
        <div class="form-group">
          <label for="cf-address">Address</label>
          <textarea id="cf-address" rows="2">${escHtml(customer?.address || "")}</textarea>
        </div>
        <div class="form-group">
          <label for="cf-notes">Notes</label>
          <textarea id="cf-notes" rows="2">${escHtml(customer?.notes || "")}</textarea>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-outline" onclick="AdminApp.closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">${customer ? "Update" : "Save"}</button>
        </div>
      </form>
    `;
    document.getElementById("modal-overlay").classList.add("open");
    document.getElementById("cf-company").focus();
  }

  function saveCustomer(e, fromInvoice = false, editId = null) {
    e.preventDefault();
    const customers = load(STORE_CUSTOMERS);
    const data = {
      company: document.getElementById("cf-company").value.trim(),
      contact: document.getElementById("cf-contact").value.trim(),
      email: document.getElementById("cf-email").value.trim(),
      phone: document.getElementById("cf-phone").value.trim(),
      address: document.getElementById("cf-address").value.trim(),
      notes: document.getElementById("cf-notes").value.trim(),
    };

    if (editId) {
      const idx = customers.findIndex((c) => c.id === editId);
      if (idx >= 0) {
        customers[idx] = { ...customers[idx], ...data, updatedAt: now() };
      }
    } else {
      const newCustomer = { id: uid(), ...data, createdAt: now() };
      customers.push(newCustomer);
      if (fromInvoice) {
        // Select in dropdown after closing
        save(STORE_CUSTOMERS, customers);
        closeModal();
        populateCustomerDropdown();
        document.getElementById("invoice-customer").value = newCustomer.id;
        onCustomerSelect();
        renderCustomers();
        updateStats();
        return;
      }
    }

    save(STORE_CUSTOMERS, customers);
    closeModal();
    renderCustomers();
    updateStats();
  }

  function deleteCustomer(id) {
    if (!confirm("Delete this customer?")) return;
    const customers = load(STORE_CUSTOMERS).filter((c) => c.id !== id);
    save(STORE_CUSTOMERS, customers);
    renderCustomers();
    updateStats();
  }

  // ---------- Products CRUD ----------
  function renderProducts() {
    const products = load(STORE_PRODUCTS);
    const tbody = document.getElementById("products-body");
    const empty = document.getElementById("products-empty");

    if (products.length === 0) {
      tbody.innerHTML = "";
      empty.style.display = "";
      return;
    }

    empty.style.display = "none";
    tbody.innerHTML = products
      .map(
        (p) => `
      <tr>
        <td>${escHtml(p.name)}</td>
        <td>${escHtml(p.description)}</td>
        <td>${fmt(p.price)}</td>
        <td>${escHtml(p.unit)}</td>
        <td>
          <div class="action-btns">
            <button class="btn-edit" onclick="AdminApp.openProductModal('${p.id}')">Edit</button>
            <button class="btn-delete" onclick="AdminApp.deleteProduct('${p.id}')">Del</button>
          </div>
        </td>
      </tr>
    `,
      )
      .join("");
  }

  function openProductModal(editId = null) {
    const product = editId
      ? load(STORE_PRODUCTS).find((p) => p.id === editId)
      : null;
    const title = product ? "Edit Product" : "Add Product";

    document.getElementById("modal-title").textContent = title;
    document.getElementById("modal-body").innerHTML = `
      <form id="product-form" onsubmit="AdminApp.saveProduct(event, ${editId ? `'${editId}'` : "null"})">
        <div class="form-group">
          <label for="pf-name">Product/Service Name *</label>
          <input type="text" id="pf-name" required value="${escHtml(product?.name || "")}">
        </div>
        <div class="form-group">
          <label for="pf-desc">Description</label>
          <textarea id="pf-desc" rows="2">${escHtml(product?.description || "")}</textarea>
        </div>
        <div class="form-group">
          <label for="pf-price">Unit Price ($) *</label>
          <input type="number" id="pf-price" min="0" step="0.01" required value="${product?.price || ""}">
        </div>
        <div class="form-group">
          <label for="pf-unit">Unit</label>
          <select id="pf-unit">
            <option value="each" ${product?.unit === "each" ? "selected" : ""}>Each</option>
            <option value="hour" ${product?.unit === "hour" ? "selected" : ""}>Hour</option>
            <option value="job" ${product?.unit === "job" ? "selected" : ""}>Job</option>
            <option value="sqft" ${product?.unit === "sqft" ? "selected" : ""}>Sq Ft</option>
            <option value="lnft" ${product?.unit === "lnft" ? "selected" : ""}>Ln Ft</option>
          </select>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-outline" onclick="AdminApp.closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">${product ? "Update" : "Save"}</button>
        </div>
      </form>
    `;
    document.getElementById("modal-overlay").classList.add("open");
    document.getElementById("pf-name").focus();
  }

  function saveProduct(e, editId = null) {
    e.preventDefault();
    const products = load(STORE_PRODUCTS);
    const data = {
      name: document.getElementById("pf-name").value.trim(),
      description: document.getElementById("pf-desc").value.trim(),
      price: parseFloat(document.getElementById("pf-price").value) || 0,
      unit: document.getElementById("pf-unit").value,
    };

    if (editId) {
      const idx = products.findIndex((p) => p.id === editId);
      if (idx >= 0) {
        products[idx] = { ...products[idx], ...data, updatedAt: now() };
      }
    } else {
      products.push({ id: uid(), ...data, createdAt: now() });
    }

    save(STORE_PRODUCTS, products);
    closeModal();
    renderProducts();
    updateStats();
  }

  function deleteProduct(id) {
    if (!confirm("Delete this product?")) return;
    const products = load(STORE_PRODUCTS).filter((p) => p.id !== id);
    save(STORE_PRODUCTS, products);
    renderProducts();
    updateStats();
  }

  // ---------- Modal ----------
  function closeModal(e) {
    if (e && e.target !== e.currentTarget) return;
    document.getElementById("modal-overlay").classList.remove("open");
  }

  // ---------- Invoice Builder ----------
  function populateCustomerDropdown() {
    const customers = load(STORE_CUSTOMERS);
    const sel = document.getElementById("invoice-customer");
    if (!sel) return;
    const currentVal = sel.value;
    sel.innerHTML =
      '<option value="">-- Select Customer --</option>' +
      customers
        .map(
          (c) =>
            `<option value="${c.id}">${escHtml(c.company)}${c.contact ? " — " + escHtml(c.contact) : ""}</option>`,
        )
        .join("");
    if (currentVal) sel.value = currentVal;
  }

  function onCustomerSelect() {
    const id = document.getElementById("invoice-customer").value;
    const preview = document.getElementById("invoice-customer-info");
    if (!id) {
      preview.classList.remove("visible");
      return;
    }
    const c = load(STORE_CUSTOMERS).find((c) => c.id === id);
    if (!c) return;
    preview.innerHTML = [
      c.company && `<strong>${escHtml(c.company)}</strong>`,
      c.contact,
      c.email,
      c.phone,
      c.address,
    ]
      .filter(Boolean)
      .join("<br>");
    preview.classList.add("visible");
  }

  function addLineItem() {
    const container = document.getElementById("line-items-container");
    const products = load(STORE_PRODUCTS);
    const div = document.createElement("div");
    div.className = "line-item";
    div.innerHTML = `
      <select onchange="AdminApp.onProductSelect(this)">
        <option value="">-- Select --</option>
        ${products.map((p) => `<option value="${p.id}" data-price="${p.price}">${escHtml(p.name)}</option>`).join("")}
        <option value="custom">Custom item...</option>
      </select>
      <input type="number" class="li-qty-input" value="1" min="1" step="1" oninput="AdminApp.recalculate()">
      <input type="number" class="li-price-input" value="" min="0" step="0.01" placeholder="0.00" oninput="AdminApp.recalculate()">
      <span class="li-total-val">$0.00</span>
      <button class="line-item-remove" onclick="this.parentElement.remove(); AdminApp.recalculate();">&times;</button>
    `;
    container.appendChild(div);
  }

  function onProductSelect(sel) {
    const row = sel.closest(".line-item");
    const priceInput = row.querySelector(".li-price-input");
    if (sel.value === "custom") {
      priceInput.value = "";
      priceInput.focus();
      return;
    }
    const opt = sel.options[sel.selectedIndex];
    const price = parseFloat(opt.dataset.price) || 0;
    priceInput.value = price.toFixed(2);
    recalculate();
  }

  function recalculate() {
    const rows = document.querySelectorAll("#line-items-container .line-item");
    let subtotal = 0;

    rows.forEach((row) => {
      const qty = parseFloat(row.querySelector(".li-qty-input").value) || 0;
      const price = parseFloat(row.querySelector(".li-price-input").value) || 0;
      const total = qty * price;
      row.querySelector(".li-total-val").textContent = fmt(total);
      subtotal += total;
    });

    const taxOn = document.getElementById("invoice-tax-toggle").checked;
    const tax = taxOn ? subtotal * MS_TAX_RATE : 0;

    const discVal =
      parseFloat(document.getElementById("invoice-discount").value) || 0;
    const discType = document.getElementById("invoice-discount-type").value;
    const discount =
      discType === "percent" ? subtotal * (discVal / 100) : discVal;

    const grandTotal = Math.max(0, subtotal + tax - discount);

    document.getElementById("invoice-subtotal").textContent = fmt(subtotal);
    document.getElementById("invoice-tax").textContent = fmt(tax);
    document.getElementById("invoice-discount-amt").textContent =
      "-" + fmt(discount);
    document.getElementById("invoice-grand-total").textContent =
      fmt(grandTotal);
  }

  function gatherInvoiceData() {
    const customerId = document.getElementById("invoice-customer").value;
    const customer = customerId
      ? load(STORE_CUSTOMERS).find((c) => c.id === customerId)
      : null;
    const products = load(STORE_PRODUCTS);

    const rows = document.querySelectorAll("#line-items-container .line-item");
    const lineItems = [];
    let subtotal = 0;

    rows.forEach((row) => {
      const sel = row.querySelector("select");
      const qty = parseFloat(row.querySelector(".li-qty-input").value) || 0;
      const price = parseFloat(row.querySelector(".li-price-input").value) || 0;
      const total = qty * price;
      if (qty <= 0 || price <= 0) return;

      let name = "Custom Item";
      let desc = "";
      if (sel.value && sel.value !== "custom") {
        const p = products.find((p) => p.id === sel.value);
        if (p) {
          name = p.name;
          desc = p.description;
        }
      } else if (sel.value === "custom") {
        name = "Custom Item";
      }

      lineItems.push({ name, description: desc, qty, price, total });
      subtotal += total;
    });

    const taxOn = document.getElementById("invoice-tax-toggle").checked;
    const tax = taxOn ? subtotal * MS_TAX_RATE : 0;
    const discVal =
      parseFloat(document.getElementById("invoice-discount").value) || 0;
    const discType = document.getElementById("invoice-discount-type").value;
    const discount =
      discType === "percent" ? subtotal * (discVal / 100) : discVal;
    const grandTotal = Math.max(0, subtotal + tax - discount);

    const invoiceDate =
      document.getElementById("invoice-date").value ||
      new Date().toISOString().split("T")[0];
    const terms = document.getElementById("invoice-terms").value;
    const dueDate = calcDueDate(invoiceDate, terms);
    const notes = document.getElementById("invoice-notes").value.trim();

    return {
      customer,
      lineItems,
      subtotal,
      taxOn,
      tax,
      discountValue: discVal,
      discountType: discType,
      discount,
      grandTotal,
      invoiceDate,
      terms,
      dueDate,
      notes,
    };
  }

  // ---------- Save Invoice ----------
  function saveInvoice() {
    const data = gatherInvoiceData();
    if (!data.customer) {
      alert("Please select a customer.");
      return;
    }
    if (data.lineItems.length === 0) {
      alert("Please add at least one line item.");
      return;
    }

    const invoices = load(STORE_INVOICES);
    const invoiceNum = getNextInvoiceNum();
    const invoice = {
      id: uid(),
      number: invoiceNum,
      ...data,
      customerName: data.customer.company,
      createdAt: now(),
    };
    invoices.push(invoice);
    save(STORE_INVOICES, invoices);

    updateStats();
    renderSavedInvoices();
    renderRecentInvoices();
    alert("Invoice " + invoiceNum + " saved.");
  }

  function renderSavedInvoices() {
    const invoices = load(STORE_INVOICES).slice().reverse();
    const container = document.getElementById("saved-invoices-list");
    if (!container) return;

    if (invoices.length === 0) {
      container.innerHTML = '<p class="empty-state">No saved invoices.</p>';
      return;
    }

    container.innerHTML = invoices
      .map(
        (inv) => `
      <div class="saved-invoice-item">
        <div class="saved-invoice-info">
          <span class="saved-invoice-num">${escHtml(inv.number)}</span>
          <span class="saved-invoice-detail">${escHtml(inv.customerName)} &middot; ${formatDateShort(inv.createdAt)}</span>
        </div>
        <div class="saved-invoice-actions">
          <span class="saved-invoice-total">${fmt(inv.grandTotal)}</span>
          <button class="btn-edit" onclick="AdminApp.regeneratePDF('${inv.id}')">PDF</button>
          <button class="btn-delete" onclick="AdminApp.deleteInvoice('${inv.id}')">Del</button>
        </div>
      </div>
    `,
      )
      .join("");
  }

  function renderRecentInvoices() {
    const invoices = load(STORE_INVOICES).slice().reverse().slice(0, 5);
    const container = document.getElementById("recent-invoices");
    if (!container) return;

    if (invoices.length === 0) {
      container.innerHTML =
        '<p class="empty-state">No invoices yet. Create your first invoice in the Invoices tab.</p>';
      return;
    }

    container.innerHTML = invoices
      .map(
        (inv) => `
      <div class="recent-item">
        <div class="recent-item-left">
          <span class="recent-item-title">${escHtml(inv.number)} — ${escHtml(inv.customerName)}</span>
          <span class="recent-item-sub">${formatDateShort(inv.createdAt)} &middot; ${inv.terms}</span>
        </div>
        <span class="recent-item-amount">${fmt(inv.grandTotal)}</span>
      </div>
    `,
      )
      .join("");
  }

  function deleteInvoice(id) {
    if (!confirm("Delete this invoice?")) return;
    const invoices = load(STORE_INVOICES).filter((i) => i.id !== id);
    save(STORE_INVOICES, invoices);
    renderSavedInvoices();
    renderRecentInvoices();
    updateStats();
  }

  function resetInvoice() {
    document.getElementById("invoice-customer").value = "";
    document
      .getElementById("invoice-customer-info")
      .classList.remove("visible");
    document.getElementById("line-items-container").innerHTML = "";
    document.getElementById("invoice-tax-toggle").checked = false;
    document.getElementById("invoice-discount").value = "0";
    document.getElementById("invoice-notes").value = "";
    document.getElementById("invoice-date").value = new Date()
      .toISOString()
      .split("T")[0];
    document.getElementById("invoice-terms").value = "net30";
    addLineItem();
    recalculate();
  }

  // ---------- PDF Generation (jsPDF) ----------
  function generatePDF(savedData = null) {
    const data = savedData || gatherInvoiceData();
    if (!data.customer) {
      alert("Please select a customer.");
      return;
    }
    if (data.lineItems.length === 0) {
      alert("Please add at least one line item.");
      return;
    }

    const invoiceNum = savedData?.number || peekNextInvoiceNum();
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: "pt", format: "letter" });
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 50;
    const contentW = pageW - margin * 2;
    let y = margin;

    // --- Colors ---
    const PINK = [233, 30, 139];
    const DARK = [8, 12, 24];
    const GRAY = [120, 120, 144];
    const WHITE = [255, 255, 255];
    const GOLD = [218, 165, 32];

    // --- Header Bar ---
    doc.setFillColor(...DARK);
    doc.rect(0, 0, pageW, 100, "F");
    doc.setFillColor(...PINK);
    doc.rect(0, 97, pageW, 3, "F");

    // Company name
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(...WHITE);
    doc.text(BUSINESS.name, margin, 42);

    // Tagline
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(200, 200, 216);
    doc.text(BUSINESS.tagline, margin, 58);

    // Contact right side
    doc.setFontSize(8.5);
    doc.setTextColor(200, 200, 216);
    const rightX = pageW - margin;
    doc.text(BUSINESS.phone, rightX, 35, { align: "right" });
    doc.text(BUSINESS.email, rightX, 47, { align: "right" });
    doc.text(BUSINESS.address, rightX, 59, { align: "right" });
    doc.text(BUSINESS.city, rightX, 71, { align: "right" });
    doc.text(BUSINESS.license, rightX, 83, { align: "right" });

    y = 125;

    // --- Invoice Title + Number ---
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(...DARK);
    doc.text("PRO FORMA INVOICE", margin, y);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...GRAY);
    doc.text(invoiceNum, pageW - margin, y, { align: "right" });

    y += 30;

    // --- Bill To / Invoice Info columns ---
    const col2X = pageW / 2 + 20;

    // Bill To
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...PINK);
    doc.text("BILL TO", margin, y);
    y += 14;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...DARK);
    const billLines = [
      data.customer.company,
      data.customer.contact,
      data.customer.email,
      data.customer.phone,
      data.customer.address,
    ].filter(Boolean);
    billLines.forEach((line) => {
      doc.text(line, margin, y);
      y += 14;
    });

    // Invoice details right column
    let ry = 155;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...PINK);
    doc.text("INVOICE DETAILS", col2X, ry);
    ry += 14;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...DARK);

    const invDate = new Date(data.invoiceDate + "T00:00:00");
    const termsLabel = {
      prepaid: "Pre-paid",
      net15: "Net 15",
      net30: "Net 30",
      net60: "Net 60",
      net90: "Net 90",
    };

    const details = [
      ["Invoice Date:", formatDate(invDate)],
      ["Due Date:", formatDate(data.dueDate)],
      ["Terms:", termsLabel[data.terms] || data.terms],
    ];
    details.forEach(([label, val]) => {
      doc.setFont("helvetica", "bold");
      doc.text(label, col2X, ry);
      doc.setFont("helvetica", "normal");
      doc.text(val, col2X + 80, ry);
      ry += 14;
    });

    y = Math.max(y, ry) + 20;

    // --- Line Items Table ---
    const tableHead = [["Item", "Qty", "Unit Price", "Total"]];
    const tableBody = data.lineItems.map((li) => [
      li.name,
      li.qty.toString(),
      fmt(li.price),
      fmt(li.total),
    ]);

    doc.autoTable({
      startY: y,
      head: tableHead,
      body: tableBody,
      margin: { left: margin, right: margin },
      styles: {
        font: "helvetica",
        fontSize: 9.5,
        cellPadding: 8,
        lineColor: [42, 42, 64],
        lineWidth: 0.5,
        textColor: DARK,
      },
      headStyles: {
        fillColor: DARK,
        textColor: WHITE,
        fontStyle: "bold",
        fontSize: 8.5,
      },
      columnStyles: {
        0: { cellWidth: contentW * 0.45 },
        1: { halign: "center", cellWidth: contentW * 0.1 },
        2: { halign: "right", cellWidth: contentW * 0.2 },
        3: { halign: "right", cellWidth: contentW * 0.25 },
      },
      alternateRowStyles: {
        fillColor: [245, 245, 250],
      },
    });

    y = doc.lastAutoTable.finalY + 20;

    // --- Totals Box ---
    const totalsX = pageW - margin - 200;
    const totalsW = 200;

    function totalsLine(label, value, bold = false) {
      doc.setFont("helvetica", bold ? "bold" : "normal");
      doc.setFontSize(bold ? 11 : 9.5);
      doc.setTextColor(...DARK);
      doc.text(label, totalsX, y);
      doc.text(value, totalsX + totalsW, y, { align: "right" });
      y += bold ? 20 : 16;
    }

    totalsLine("Subtotal", fmt(data.subtotal));
    if (data.taxOn) {
      totalsLine("MS Sales Tax (7%)", fmt(data.tax));
    }
    if (data.discount > 0) {
      const discLabel =
        data.discountType === "percent"
          ? `Discount (${data.discountValue}%)`
          : "Discount";
      totalsLine(discLabel, "-" + fmt(data.discount));
    }

    // Separator line
    doc.setDrawColor(...PINK);
    doc.setLineWidth(1.5);
    doc.line(totalsX, y - 4, totalsX + totalsW, y - 4);
    y += 4;

    totalsLine("TOTAL DUE", fmt(data.grandTotal), true);

    // --- Notes ---
    if (data.notes) {
      y += 10;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(...PINK);
      doc.text("NOTES", margin, y);
      y += 14;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...GRAY);
      const noteLines = doc.splitTextToSize(data.notes, contentW);
      doc.text(noteLines, margin, y);
      y += noteLines.length * 12;
    }

    // --- Footer ---
    const footerY = doc.internal.pageSize.getHeight() - 50;

    // Pink line
    doc.setDrawColor(...PINK);
    doc.setLineWidth(1);
    doc.line(margin, footerY, pageW - margin, footerY);

    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(...GRAY);
    doc.text(
      "This is a pro forma invoice / estimate. Final pricing may vary based on actual conditions.",
      margin,
      footerY + 14,
    );
    doc.text("Thank you for choosing Arumi LLC.", margin, footerY + 26);

    // Gold accent
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...GOLD);
    doc.text(
      BUSINESS.name + " — " + BUSINESS.phone,
      pageW - margin,
      footerY + 26,
      { align: "right" },
    );

    // --- Download ---
    const filename =
      invoiceNum.replace(/[^a-zA-Z0-9-]/g, "_") +
      "_" +
      (data.customer.company || "customer").replace(/[^a-zA-Z0-9]/g, "_") +
      ".pdf";
    doc.save(filename);
  }

  function regeneratePDF(invoiceId) {
    const invoices = load(STORE_INVOICES);
    const inv = invoices.find((i) => i.id === invoiceId);
    if (!inv) {
      alert("Invoice not found.");
      return;
    }

    // Reconstruct dueDate as Date object
    inv.dueDate = calcDueDate(inv.invoiceDate, inv.terms);
    generatePDF(inv);
  }

  // ---------- Public API ----------
  return {
    init,
    handleLogin,
    logout,
    switchTab,
    openCustomerModal,
    saveCustomer,
    deleteCustomer,
    renderCustomers,
    openProductModal,
    saveProduct,
    deleteProduct,
    closeModal,
    onCustomerSelect,
    addLineItem,
    onProductSelect,
    recalculate,
    generatePDF,
    saveInvoice,
    resetInvoice,
    deleteInvoice,
    regeneratePDF,
  };
})();

document.addEventListener("DOMContentLoaded", AdminApp.init);
