// ============================================================
//  POS DZ - app.js  |  قاعدة البيانات والمنطق المشترك
// ============================================================

// ── IndexedDB Setup ──────────────────────────────────────────
const DB_NAME = 'POSDZ_DB';
const DB_VERSION = 1;
let db = null;

function openDB() {
  return new Promise((resolve, reject) => {
    if (db) return resolve(db);
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (e) => {
      const db = e.target.result;

      // Users
      if (!db.objectStoreNames.contains('users')) {
        const us = db.createObjectStore('users', { keyPath: 'id', autoIncrement: true });
        us.createIndex('username', 'username', { unique: true });
      }
      // Products
      if (!db.objectStoreNames.contains('products')) {
        const ps = db.createObjectStore('products', { keyPath: 'id', autoIncrement: true });
        ps.createIndex('name', 'name', { unique: true });
        ps.createIndex('barcode', 'barcode', { unique: false });
      }
      // Families
      if (!db.objectStoreNames.contains('families')) {
        const fs = db.createObjectStore('families', { keyPath: 'id', autoIncrement: true });
        fs.createIndex('name', 'name', { unique: true });
      }
      // Customers
      if (!db.objectStoreNames.contains('customers')) {
        db.createObjectStore('customers', { keyPath: 'id', autoIncrement: true });
      }
      // Suppliers
      if (!db.objectStoreNames.contains('suppliers')) {
        db.createObjectStore('suppliers', { keyPath: 'id', autoIncrement: true });
      }
      // Sales
      if (!db.objectStoreNames.contains('sales')) {
        const ss = db.createObjectStore('sales', { keyPath: 'id', autoIncrement: true });
        ss.createIndex('date', 'date', { unique: false });
        ss.createIndex('customerId', 'customerId', { unique: false });
      }
      // Sale Items
      if (!db.objectStoreNames.contains('saleItems')) {
        const si = db.createObjectStore('saleItems', { keyPath: 'id', autoIncrement: true });
        si.createIndex('saleId', 'saleId', { unique: false });
      }
      // Debts
      if (!db.objectStoreNames.contains('debts')) {
        const di = db.createObjectStore('debts', { keyPath: 'id', autoIncrement: true });
        di.createIndex('customerId', 'customerId', { unique: false });
      }
      // Settings
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
      // Operations Log
      if (!db.objectStoreNames.contains('logs')) {
        db.createObjectStore('logs', { keyPath: 'id', autoIncrement: true });
      }
      // Daily Counter
      if (!db.objectStoreNames.contains('counter')) {
        db.createObjectStore('counter', { keyPath: 'id' });
      }
    };

    req.onsuccess = async (e) => {
      db = e.target.result;
      await seedDefaults();
      resolve(db);
    };
    req.onerror = () => reject(req.error);
  });
}

// ── Generic DB Helpers ───────────────────────────────────────
function dbGet(store, key) {
  return new Promise((res, rej) => {
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).get(key);
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}
function dbGetAll(store) {
  return new Promise((res, rej) => {
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).getAll();
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}
function dbPut(store, data) {
  return new Promise((res, rej) => {
    const tx = db.transaction(store, 'readwrite');
    const req = tx.objectStore(store).put(data);
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}
function dbAdd(store, data) {
  return new Promise((res, rej) => {
    const tx = db.transaction(store, 'readwrite');
    const req = tx.objectStore(store).add(data);
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}
function dbDelete(store, key) {
  return new Promise((res, rej) => {
    const tx = db.transaction(store, 'readwrite');
    const req = tx.objectStore(store).delete(key);
    req.onsuccess = () => res();
    req.onerror = () => rej(req.error);
  });
}
function dbGetByIndex(store, indexName, value) {
  return new Promise((res, rej) => {
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).index(indexName).getAll(value);
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}

// ── Settings ─────────────────────────────────────────────────
async function getSetting(key) {
  const rec = await dbGet('settings', key);
  return rec ? rec.value : null;
}
async function setSetting(key, value) {
  await dbPut('settings', { key, value });
}

// ── Default Seed Data ─────────────────────────────────────────
async function seedDefaults() {
  // Default admin user
  try {
    await dbAdd('users', {
      username: 'ADMIN',
      password: hashPassword('1234'),
      role: 'admin',
      createdAt: new Date().toISOString()
    });
  } catch(e) {}

  // Default settings
  const defaults = {
    storeName: 'اسم المتجر', storePhone: '', storeAddress: '',
    storeWelcome: 'شكراً لزيارتكم', storeLogo: '',
    currency: 'DA', language: 'ar', dateFormat: 'DD/MM/YYYY',
    themeColor: 'blue_purple', fontSize: '15',
    soundAdd: '1', soundSell: '1', soundButtons: '1',
    barcodeReader: '1', barcodeAuto: '1',
    touchKeyboard: '0',
    paperSize: '80mm',
    printLogo: '1', printName: '1', printPhone: '1',
    printWelcome: '1', printAddress: '1', printBarcode: '1',
    autoBackup: '1',
    invoiceNumber: '1',
    lowStockAlert: '5', expiryAlertDays: '30',
    lastResetDate: '', dailyCounter: '1',
  };
  for (const [key, value] of Object.entries(defaults)) {
    const existing = await dbGet('settings', key);
    if (!existing) await dbPut('settings', { key, value });
  }

  // Daily counter
  const counter = await dbGet('counter', 1);
  if (!counter) await dbPut('counter', { id: 1, number: 1, lastReset: todayStr() });
}

// ── Password ─────────────────────────────────────────────────
function hashPassword(str) {
  // Simple hash for browser (use SHA-256 via SubtleCrypto in production)
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + c;
    hash |= 0;
  }
  return 'h_' + Math.abs(hash).toString(36) + '_' + str.length;
}

// ── Session ───────────────────────────────────────────────────
function saveSession(user) {
  sessionStorage.setItem('posdz_user', JSON.stringify(user));
}
function getSession() {
  const u = sessionStorage.getItem('posdz_user');
  return u ? JSON.parse(u) : null;
}
function clearSession() {
  sessionStorage.removeItem('posdz_user');
}
function requireAuth(redirectTo = 'index.html') {
  const user = getSession();
  if (!user) { window.location.href = redirectTo; return null; }
  return user;
}
function requireRole(roles, redirectTo = 'sale.html') {
  const user = requireAuth();
  if (!user) return null;
  if (!roles.includes(user.role)) { window.location.href = redirectTo; return null; }
  return user;
}

// ── Invoice Number ────────────────────────────────────────────
async function getNextInvoiceNumber() {
  const today = todayStr();
  let counter = await dbGet('counter', 1);
  if (!counter) counter = { id: 1, number: 1, lastReset: today };
  if (counter.lastReset !== today) {
    counter.number = 1;
    counter.lastReset = today;
  }
  const num = counter.number;
  counter.number++;
  await dbPut('counter', counter);
  return '#' + String(num).padStart(3, '0');
}

async function resetDailyCounter() {
  await dbPut('counter', { id: 1, number: 1, lastReset: todayStr() });
}

// ── Date Helpers ──────────────────────────────────────────────
function todayStr() {
  return new Date().toISOString().split('T')[0];
}
function formatDate(iso, fmt) {
  if (!iso) return '';
  const d = new Date(iso);
  const day   = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year  = d.getFullYear();
  if (!fmt || fmt === 'DD/MM/YYYY') return `${day}/${month}/${year}`;
  if (fmt === 'MM/DD/YYYY') return `${month}/${day}/${year}`;
  if (fmt === 'YYYY/MM/DD') return `${year}/${month}/${day}`;
  return `${day}/${month}/${year}`;
}
function formatDateTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('ar-DZ') + ' ' + d.toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' });
}
function startOfWeek() {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0,0,0,0);
  return d.toISOString();
}
function startOfMonth() {
  const d = new Date();
  d.setDate(1); d.setHours(0,0,0,0);
  return d.toISOString();
}
function startOfYear() {
  const d = new Date();
  d.setMonth(0,1); d.setHours(0,0,0,0);
  return d.toISOString();
}

// ── Currency ─────────────────────────────────────────────────
let _currency = 'DA';
async function loadCurrency() {
  _currency = await getSetting('currency') || 'DA';
}
function formatMoney(amount) {
  return parseFloat(amount || 0).toFixed(2) + ' ' + _currency;
}

// ── Toast Notifications ───────────────────────────────────────
function toast(message, type = 'success', duration = 2800) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }
  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  t.innerHTML = `<span>${icons[type] || ''}</span> ${message}`;
  container.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 400); }, duration);
}

// ── Modal Helpers ─────────────────────────────────────────────
function openModal(id) {
  const el = document.getElementById(id);
  if (el) { el.classList.add('open'); }
}
function closeModal(id) {
  const el = document.getElementById(id);
  if (el) { el.classList.remove('open'); }
}
function closeAllModals() {
  document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
}

// ── Sidebar ───────────────────────────────────────────────────
function initSidebar() {
  const overlay = document.getElementById('sidebarOverlay');
  const sidebar = document.getElementById('sidebar');
  const menuBtn = document.getElementById('menuBtn');

  if (menuBtn) menuBtn.addEventListener('click', () => {
    overlay.classList.add('open');
    sidebar.classList.add('open');
  });
  if (overlay) overlay.addEventListener('click', closeSidebar);

  // Mark active nav
  const current = window.location.pathname.split('/').pop();
  document.querySelectorAll('.nav-item').forEach(item => {
    if (item.getAttribute('href') === current) item.classList.add('active');
  });

  // Load user info
  const user = getSession();
  if (user) {
    const userEl = document.getElementById('sidebarUser');
    if (userEl) userEl.textContent = '👤 ' + user.username;

    // Hide restricted items
    if (user.role === 'seller') {
      document.querySelectorAll('[data-role]').forEach(el => {
        const roles = el.dataset.role.split(',');
        if (!roles.includes('seller')) el.style.display = 'none';
      });
    }
  }
}
function closeSidebar() {
  document.getElementById('sidebarOverlay')?.classList.remove('open');
  document.getElementById('sidebar')?.classList.remove('open');
}

// ── Clock ─────────────────────────────────────────────────────
function startClock() {
  const el = document.getElementById('clockDisplay');
  if (!el) return;
  function tick() {
    const now = new Date();
    const date = now.toLocaleDateString('ar-DZ', { day:'2-digit', month:'2-digit', year:'numeric' });
    const time = now.toLocaleTimeString('ar-DZ', { hour:'2-digit', minute:'2-digit', second:'2-digit', hour12: false });
    el.textContent = `${date}  ${time}`;
  }
  tick();
  setInterval(tick, 1000);
}

// ── Store Name in Header ──────────────────────────────────────
async function loadHeaderStoreName() {
  const el = document.getElementById('headerStoreName');
  if (!el) return;
  const name = await getSetting('storeName');
  if (name) el.textContent = name;
}

// applyTheme defined in Sound/Theme block below

// ── Barcode Scanner Support ───────────────────────────────────
let barcodeBuffer = '';
let barcodeTimer = null;
function initBarcodeScanner(onScan) {
  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (e.key === 'Enter') {
      if (barcodeBuffer.length > 2) onScan(barcodeBuffer);
      barcodeBuffer = '';
      clearTimeout(barcodeTimer);
    } else if (e.key.length === 1) {
      barcodeBuffer += e.key;
      clearTimeout(barcodeTimer);
      barcodeTimer = setTimeout(() => { barcodeBuffer = ''; }, 100);
    }
  });
}

// ── Virtual Keyboard ──────────────────────────────────────────
let vkbTarget = null;
function initVirtualKeyboard() {
  const overlay = document.getElementById('vkbOverlay');
  if (!overlay) return;

  document.addEventListener('focusin', async (e) => {
    const touchKb = await getSetting('touchKeyboard');
    if (touchKb !== '1') return;
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
      if (e.target.type === 'date' || e.target.type === 'file') return;
      vkbTarget = e.target;
      overlay.classList.add('open');
    }
  });
}

function vkbPress(key) {
  if (!vkbTarget) return;
  if (key === '⌫') {
    const val = vkbTarget.value;
    vkbTarget.value = val.slice(0, -1);
  } else if (key === ' ') {
    vkbTarget.value += ' ';
  } else {
    vkbTarget.value += key;
  }
  vkbTarget.dispatchEvent(new Event('input', { bubbles: true }));
}

function vkbClose() {
  document.getElementById('vkbOverlay')?.classList.remove('open');
  vkbTarget = null;
}

// ── CSV Export ────────────────────────────────────────────────
function exportCSV(data, filename) {
  if (!data.length) return toast('لا توجد بيانات للتصدير', 'warning');
  const headers = Object.keys(data[0]);
  const rows = data.map(row => headers.map(h => `"${row[h] ?? ''}"`).join(','));
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  a.click(); URL.revokeObjectURL(url);
}

// ── CSV Import ────────────────────────────────────────────────
function importCSV(file, callback) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const lines = e.target.result.split('\n').filter(l => l.trim());
    if (lines.length < 2) return toast('الملف فارغ أو غير صالح', 'error');
    const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
    const data = lines.slice(1).map(line => {
      const vals = line.split(',').map(v => v.replace(/"/g, '').trim());
      const obj = {};
      headers.forEach((h, i) => obj[h] = vals[i] || '');
      return obj;
    });
    callback(data);
  };
  reader.readAsText(file, 'UTF-8');
}

// ── CSV Template Download ─────────────────────────────────────
function downloadCSVTemplate() {
  const template = 'name,barcode,family,size,unit,buy_price,sell_price,quantity,expiry_date\n' +
    'مثال منتج,1234567890,عائلة,500ml,قطعة,100,150,50,2026-12-31\n';
  const blob = new Blob(['\uFEFF' + template], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'products_template.csv';
  a.click(); URL.revokeObjectURL(url);
}

// ── Backup ────────────────────────────────────────────────────
async function createBackup() {
  const stores = ['users','products','families','customers','suppliers','sales','saleItems','debts','settings'];
  const backup = {};
  for (const store of stores) {
    backup[store] = await dbGetAll(store);
  }
  backup.timestamp = new Date().toISOString();
  backup.version = '2.0.0';
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `POSDZ_backup_${todayStr()}.json`;
  a.click(); URL.revokeObjectURL(url);
  toast('تم إنشاء النسخة الاحتياطية بنجاح ✅', 'success');
}

// ── Thermal Print ────────────────────────────────────────────
async function printInvoice(sale, items) {
  const storeName    = await getSetting('storeName') || '';
  const storePhone   = await getSetting('storePhone') || '';
  const storeAddress = await getSetting('storeAddress') || '';
  const welcome      = await getSetting('storeWelcome') || '';
  const currency     = await getSetting('currency') || 'DA';
  const storeLogo    = await getSetting('storeLogo') || '';
  const paperSize    = await getSetting('paperSize') || '80mm';
  const printLogo    = await getSetting('printLogo') === '1';
  const printName    = await getSetting('printName') === '1';
  const printPhone   = await getSetting('printPhone') === '1';
  const printAddress = await getSetting('printAddress') === '1';
  const printWelcome = await getSetting('printWelcome') === '1';
  const printBarcode = await getSetting('printBarcode') === '1';

  // Paper width mapping
  const widthMap = { '58mm': '54mm', '80mm': '76mm', 'A5': '148mm', 'A4': '210mm' };
  const pageW = widthMap[paperSize] || '76mm';

  const now = new Date(sale.date || new Date());
  const dateStr = now.toLocaleDateString('ar-DZ');
  const timeStr = now.toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' });

  let html = `<!DOCTYPE html><html dir="rtl"><head>
    <meta charset="UTF-8">
    <style>
      @page { margin: 4mm; size: ${pageW} auto; }
      * { margin:0; padding:0; box-sizing:border-box; }
      body {
        font-family: 'Courier New', 'Arial', monospace;
        font-size: 12px; color: #000 !important;
        background: #fff;
        width: ${pageW};
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .center { text-align: center; }
      .bold { font-weight: 900 !important; }
      .big { font-size: 15px; font-weight: 900; }
      .xl { font-size: 18px; font-weight: 900; }
      .dline { border-top: 2px solid #000; margin: 5px 0; }
      .sline { border-top: 1px dashed #000; margin: 5px 0; }
      .row { display: flex; justify-content: space-between; padding: 1px 0; }
      .logo img { max-width: 70px; max-height: 70px; display: block; margin: 0 auto 4px; }
      table { width: 100%; border-collapse: collapse; font-size: 11px; }
      th { font-weight: 900; border-bottom: 1px solid #000; padding: 3px 2px; text-align: right; font-size: 11px; }
      td { padding: 3px 2px; font-weight: 700; }
      .total-row td { font-weight: 900; font-size: 13px; border-top: 2px solid #000; }
      @media print {
        body { width: 100%; }
        * { color: #000 !important; -webkit-print-color-adjust: exact; }
      }
    </style>
  </head><body>`;

  // Invoice label — clear naming for each type
  let invoiceLabel;
  if (sale.debtSettlement && sale.partialSettlement) {
    invoiceLabel = `فاتورة تسديد جزئي #${sale.invoiceNumber}`;
  } else if (sale.debtSettlement) {
    invoiceLabel = `فاتورة تسديد #${sale.invoiceNumber}`;
  } else if (sale.isDebt) {
    invoiceLabel = `فاتورة دين #${sale.invoiceNumber}`;
  } else {
    invoiceLabel = `فاتورة: #${sale.invoiceNumber}`;
  }
  html += `<div class="row bold"><span>${invoiceLabel}</span><span>${dateStr} ${timeStr}</span></div>`;
  html += `<div class="dline"></div>`;

  // Store info centered
  if (printLogo && storeLogo) html += `<div class="logo center"><img src="${storeLogo}"/></div>`;
  if (printName && storeName) html += `<div class="center xl bold">${storeName}</div>`;
  if (printPhone && storePhone) html += `<div class="center bold">📞 ${storePhone}</div>`;
  if (printAddress && storeAddress) html += `<div class="center bold">${storeAddress}</div>`;

  if (sale.customerName) {
    html += `<div class="sline"></div>`;
    html += `<div class="row"><span class="bold">الزبون:</span><span class="bold">${sale.customerName}</span></div>`;
    if (sale.customerPhone) html += `<div class="row"><span class="bold">الهاتف:</span><span class="bold">${sale.customerPhone}</span></div>`;
  }
  html += `<div class="dline"></div>`;

  // Products table
  html += `<table>
    <thead><tr><th>المنتج</th><th style="text-align:center">ك</th><th style="text-align:center">السعر</th><th style="text-align:left">المجموع</th></tr></thead>
    <tbody>`;
  items.forEach(item => {
    html += `<tr>
      <td class="bold">${item.productName}</td>
      <td style="text-align:center" class="bold">${item.quantity}</td>
      <td style="text-align:center" class="bold">${parseFloat(item.unitPrice).toFixed(2)}</td>
      <td style="text-align:left" class="bold">${parseFloat(item.total).toFixed(2)}</td>
    </tr>`;
  });
  html += `</tbody></table>`;
  html += `<div class="dline"></div>`;

  if (sale.discount > 0) {
    html += `<div class="row bold"><span>خصم:</span><span>- ${parseFloat(sale.discount).toFixed(2)} ${currency}</span></div>`;
  }
  html += `<div class="row xl bold"><span>الإجمالي:</span><span>${parseFloat(sale.total).toFixed(2)} ${currency}</span></div>`;
  if (sale.paid && sale.paid > 0) {
    html += `<div class="row bold"><span>المدفوع:</span><span>${parseFloat(sale.paid).toFixed(2)} ${currency}</span></div>`;
    if (sale.isDebt) {
      const remaining = sale.total - sale.paid;
      html += `<div class="row bold"><span>المتبقي (دين):</span><span>${remaining.toFixed(2)} ${currency}</span></div>`;
    }
  }
  // Show updated remaining debt after partial settlement
  if (sale.remainingDebt !== undefined) {
    html += `<div class="row bold"><span>المتبقي بعد التسديد:</span><span style="color:#dc2626;">${parseFloat(sale.remainingDebt).toFixed(2)} ${currency}</span></div>`;
  } else if (sale.remainingAfterPay !== undefined) {
    html += `<div class="row bold"><span>الدين المتبقي:</span><span style="color:#dc2626;">${parseFloat(sale.remainingAfterPay).toFixed(2)} ${currency}</span></div>`;
  }

  html += `<div class="dline"></div>`;
  if (printWelcome && welcome) html += `<div class="center bold" style="font-size:13px;margin:6px 0;">${welcome}</div>`;

  // Barcode placeholder (text-based)
  if (printBarcode && sale.invoiceNumber) {
    html += `<div class="center sline" style="font-family:monospace;font-size:10px;margin-top:4px;">||||| ${sale.invoiceNumber} |||||</div>`;
  }

  html += `</body></html>`;

  const win = window.open('', '_blank', 'width=500,height=700');
  if (!win) { toast('⚠️ يرجى السماح بالنوافذ المنبثقة للطباعة', 'warning', 4000); return; }
  win.document.write(html);
  win.document.close();
  win.onload = () => { win.focus(); win.print(); win.onafterprint = () => win.close(); };
}

// ── Barcode Label Print ───────────────────────────────────────
// Matches the preview in settings exactly — compact, clear, consistent
async function printBarcodeLabel(product) {
  const barcodeVal  = product.barcode || String(product.id);
  const storeName   = await getSetting('storeName')        || '';
  const currency    = await getSetting('currency')         || 'دج';
  const barcodeFont = await getSetting('barcodeFont')      || 'Cairo';
  const barcodeType = await getSetting('barcodeType')      || 'CODE128';
  const showStore   = await getSetting('barcodeShowStore') === '1';
  const showName    = (await getSetting('barcodeShowName'))  !== '0';
  const showPrice   = (await getSetting('barcodeShowPrice')) !== '0';

  // Build barcode bars — deterministic, uniform height for clean look
  function buildBars(code) {
    const str = String(code);
    // Use a fixed pattern based on character values for visual consistency
    const NARROW = 2, WIDE = 4, BAR_H = 36;
    let bars = '';
    // Start guard
    bars += `<div style="width:2px;height:${BAR_H}px;background:#000;"></div>`;
    bars += `<div style="width:2px;height:${BAR_H}px;background:#fff;"></div>`;
    bars += `<div style="width:2px;height:${BAR_H}px;background:#000;"></div>`;
    bars += `<div style="width:2px;height:${BAR_H}px;background:#fff;"></div>`;
    for (let i = 0; i < str.length; i++) {
      const c = str.charCodeAt(i);
      // 5 bars per character: alternating black/white based on bit pattern
      for (let b = 0; b < 5; b++) {
        const isBlack = (b % 2 === 0);
        const bit     = (c >> (4 - b)) & 1;
        const w       = bit ? WIDE : NARROW;
        bars += `<div style="width:${w}px;height:${BAR_H}px;background:${isBlack?'#000':'#fff'};"></div>`;
      }
      bars += `<div style="width:2px;height:${BAR_H}px;background:#fff;"></div>`;
    }
    // Stop guard
    bars += `<div style="width:2px;height:${BAR_H}px;background:#000;"></div>`;
    bars += `<div style="width:2px;height:${BAR_H}px;background:#fff;"></div>`;
    bars += `<div style="width:3px;height:${BAR_H}px;background:#000;"></div>`;
    return `<div style="display:flex;align-items:flex-end;justify-content:center;gap:0;overflow:hidden;max-width:54mm;">${bars}</div>`;
  }

  // QR fallback (text-based simplified)
  function buildQR(code) {
    return `<div style="font-size:9px;font-family:monospace;color:#000;word-break:break-all;max-width:54mm;border:2px solid #000;padding:3px;">[QR: ${code}]</div>`;
  }

  const barsHtml = barcodeType === 'QR' ? buildQR(barcodeVal) : buildBars(barcodeVal);

  const win = window.open('', '_blank', 'width=260,height=190');
  if (!win) { toast('⚠️ يرجى السماح بالنوافذ المنبثقة', 'warning'); return; }

  win.document.write(`<!DOCTYPE html>
<html><head>
<meta charset="UTF-8">
<style>
  @page { margin:1mm; size:58mm 38mm; }
  *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
  body {
    font-family: '${barcodeFont}', 'Cairo', Arial, sans-serif;
    background:#fff; color:#000;
    width:56mm; text-align:center; padding:2px 1px;
    -webkit-print-color-adjust:exact; print-color-adjust:exact;
  }
  .s  { font-size:8px;  font-weight:800; letter-spacing:0.5px; margin-bottom:1px; }
  .n  { font-size:10px; font-weight:900; margin-bottom:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:54mm; }
  .bc { font-family:'Courier New',monospace; font-size:7px; margin:1px 0; letter-spacing:2px; color:#000; }
  .pr { font-size:12px; font-weight:900; margin-top:2px; }
  @media print { * { color:#000!important; } }
</style>
</head><body>
  ${showStore && storeName ? `<div class="s">${storeName}</div>` : ''}
  ${showName ? `<div class="n">${product.name}</div>` : ''}
  ${barsHtml}
  <div class="bc">${barcodeVal}</div>
  ${showPrice ? `<div class="pr">${parseFloat(product.sellPrice||0).toFixed(2)} ${currency}</div>` : ''}
  <script>
    window.onload = function() { window.print(); window.onafterprint = function() { window.close(); }; };
  <\/script>
</body></html>`);
  win.document.close();
}


// ── Sound System ─────────────────────────────────────────────
// AudioContext created lazily on first user gesture (browser requirement)
let _AC = null;
function _getAC() {
  if (_AC && _AC.state !== 'closed') {
    if (_AC.state === 'suspended') _AC.resume().catch(()=>{});
    return _AC;
  }
  try {
    _AC = new (window.AudioContext || window.webkitAudioContext)();
    return _AC;
  } catch(e) { return null; }
}

function _beep(freq=880, dur=0.12, type='sine', vol=0.4) {
  const ac = _getAC();
  if (!ac) return;
  try {
    const g = ac.createGain();
    const o = ac.createOscillator();
    const now = ac.currentTime;
    g.gain.setValueAtTime(vol, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + dur);
    o.type = type;
    o.frequency.setValueAtTime(freq, now);
    o.connect(g); g.connect(ac.destination);
    o.start(now); o.stop(now + dur);
  } catch(e) {}
}

// Ensure context is resumed on any user interaction
document.addEventListener('click',      () => _getAC(), { passive: true });
document.addEventListener('touchstart', () => _getAC(), { passive: true });
document.addEventListener('keydown',    () => _getAC(), { passive: true });

async function playSound(type) {
  // type: 'add' | 'sell' | 'btn'
  const settingMap = { add:'soundAdd', sell:'soundSell', btn:'soundButtons' };
  try {
    const enabled = await getSetting(settingMap[type] || 'soundButtons');
    if (enabled !== '1') return;
  } catch(e) { return; }

  _getAC(); // ensure context alive
  if (type === 'add') {
    _beep(880, 0.09, 'sine', 0.4);
  } else if (type === 'sell') {
    _beep(660, 0.10, 'triangle', 0.45);
    setTimeout(() => _beep(880,  0.15, 'triangle', 0.4),  110);
    setTimeout(() => _beep(1100, 0.22, 'triangle', 0.38), 240);
  } else if (type === 'btn') {
    _beep(600, 0.06, 'square', 0.22);
  }
}

// Attach button sounds to ALL buttons/nav across the app
function initButtonSounds() {
  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('button, .btn, .nav-item, .tab-btn, .disc-pill, .theme-dot, .printer-card');
    if (!btn) return;
    if (btn.dataset.soundSkip) return; // marked as skip
    // sell/add sounds handled by their own callers — skip generic btn for those
    if (btn.classList.contains('sound-sell') || btn.classList.contains('sound-add')) return;
    playSound('btn');
  }, { passive: true });
}

// ── Global Page Translation System ─────────────────────────────
// Translates all fixed UI text across all pages when language changes.
// Excludes: product names, family names, customer names, supplier names, store name.
const APP_I18N = {
  ar: {
    // Sidebar nav
    navSale:'واجهة البيع', navInventory:'إدارة المخزون',
    navCustomers:'إدارة الزبائن', navReports:'إدارة الأعمال',
    navUsers:'إدارة المستخدمين', navSuppliers:'إدارة الموزعين',
    navSettings:'الإعدادات العامة', navLogout:'إغلاق',
    // Page titles
    titleSale:'واجهة البيع', titleInventory:'📦 إدارة المخزون',
    titleCustomers:'👥 إدارة الزبائن', titleReports:'إدارة الأعمال',
    titleUsers:'👤 إدارة المستخدمين', titleSuppliers:'🚚 إدارة الموزعين',
    titleSettings:'⚙️ الإعدادات العامة',
    // Common buttons
    btnSave:'💾 حفظ', btnCancel:'إلغاء', btnClose:'إغلاق', btnAdd:'➕ إضافة',
    btnEdit:'✏️ تعديل', btnDelete:'🗑️ حذف', btnPrint:'🖨️ طباعة', btnSearch:'🔍 بحث',
    btnBack:'← رجوع', btnConfirm:'✅ تأكيد', btnAll:'الكل',
    // Sale page
    saleSearchPlaceholder:'ابحث عن منتج أو امسح الباركود...',
    saleProduct:'المنتج', saleQty:'الكمية', salePrice:'السعر', saleTotal:'المجموع',
    saleDiscount:'🏷️ الخصم:', saleCustomer:'👤 الزبون:', salePaid:'💳 المبلغ المدفوع:',
    saleBtnCheckout:'✅ تسديد', saleBtnPartial:'🔢 جزئي + دين', saleBtnDebt:'📋 دين كامل',
    saleEmpty:'السلة فارغة', saleItems:' صنف',
    saleModalTitle:'🧾 تأكيد البيع', saleBtnPrint:'🖨️ طباعة الفاتورة', saleBtnNoprint:'✖️ إغلاق',
    // Customers
    custAdd:'➕ إضافة زبون', custSearch:'ابحث بالاسم أو الهاتف...',
    custFilterAll:'الكل', custFilterDebt:'💳 مديونون', custFilterClear:'✅ مسددون',
    custName:'👤 الاسم *', custPhone:'📞 الهاتف *',
    custBtnDebts:'📋 الديون', custBtnPartial:'💰 جزئي', custBtnPayAll:'✅ تسديد الكل',
    custBtnDebtInv:'🖨️ فاتورة دين', custBtnEdit:'✏️', custBtnDelete:'🗑️',
    custTotalCustomers:'إجمالي الزبائن', custTotalDebt:'إجمالي الديون',
    custNone:'لا يوجد زبائن', custNoDebt:'✅ لا ديون', custDebtLeft:'دين متبقي',
    // Inventory
    invAddProduct:'➕ إضافة منتج', invAddFamily:'➕ إضافة عائلة',
    invSearch:'ابحث عن منتج...', invFilterAll:'الكل',
    invColProduct:'المنتج', invColFamily:'العائلة', invColPrice:'السعر',
    invColQty:'المخزون', invColBarcode:'الباركود', invColActions:'إجراءات',
    invLowStock:'⚠️ مخزون منخفض', invOutStock:'🚫 نفذت الكمية',
    // Reports
    repDashboard:'📊 لوحة التحكم', repDaily:'💰 المداخيل اليومية',
    repDebts:'💳 الديون اليومية', repFamilies:'🏪 مداخيل العائلات',
    repProducts:'📦 مداخيل السلع', repScale:'⚖️ مداخيل الميزان',
    repBackToSale:'رجوع للبيع', repPeriodWeek:'📅 أسبوعي',
    repPeriodMonth:'🗓️ شهري', repPeriodYear:'📆 سنوي',
    repToday:'اليوم', repPrintAll:'🖨️ طباعة الكل',
    repCloseDay:'🔒 إقفال اليوم', repManageCustomers:'👥 إدارة الزبائن',
    // Users
    usersAdd:'➕ إضافة مستخدم',
    usersColName:'الاسم', usersColUser:'اسم المستخدم', usersColRole:'الصلاحية', usersColActions:'إجراءات',
    // Suppliers
    suppAdd:'➕ إضافة مورد',
    suppName:'اسم المورد', suppPhone:'الهاتف', suppEmail:'البريد الإلكتروني',
  },
  fr: {
    navSale:'Interface vente', navInventory:'Gestion stock',
    navCustomers:'Clients', navReports:'Activité commerciale',
    navUsers:'Utilisateurs', navSuppliers:'Fournisseurs',
    navSettings:'Paramètres', navLogout:'Déconnexion',
    titleSale:'Interface Vente', titleInventory:'📦 Gestion du stock',
    titleCustomers:'👥 Gestion clients', titleReports:'Activité commerciale',
    titleUsers:'👤 Gestion utilisateurs', titleSuppliers:'🚚 Fournisseurs',
    titleSettings:'⚙️ Paramètres généraux',
    btnSave:'💾 Enregistrer', btnCancel:'Annuler', btnClose:'Fermer', btnAdd:'➕ Ajouter',
    btnEdit:'✏️ Modifier', btnDelete:'🗑️ Supprimer', btnPrint:'🖨️ Imprimer', btnSearch:'🔍 Rechercher',
    btnBack:'← Retour', btnConfirm:'✅ Confirmer', btnAll:'Tout',
    saleSearchPlaceholder:'Rechercher un produit ou scanner...',
    saleProduct:'Produit', saleQty:'Quantité', salePrice:'Prix', saleTotal:'Total',
    saleDiscount:'🏷️ Remise:', saleCustomer:'👤 Client:', salePaid:'💳 Montant payé:',
    saleBtnCheckout:'✅ Payer', saleBtnPartial:'🔢 Partiel + Dette', saleBtnDebt:'📋 Crédit total',
    saleEmpty:'Panier vide', saleItems:' article(s)',
    saleModalTitle:'🧾 Confirmer la vente', saleBtnPrint:'🖨️ Imprimer la facture', saleBtnNoprint:'✖️ Fermer',
    custAdd:'➕ Ajouter client', custSearch:'Rechercher par nom ou téléphone...',
    custFilterAll:'Tout', custFilterDebt:'💳 Débiteurs', custFilterClear:'✅ Sans dette',
    custName:'👤 Nom *', custPhone:'📞 Téléphone *',
    custBtnDebts:'📋 Dettes', custBtnPartial:'💰 Partiel', custBtnPayAll:'✅ Tout payer',
    custBtnDebtInv:'🖨️ Facture dette', custBtnEdit:'✏️', custBtnDelete:'🗑️',
    custTotalCustomers:'Total clients', custTotalDebt:'Total dettes',
    custNone:'Aucun client', custNoDebt:'✅ Aucune dette', custDebtLeft:'Dette restante',
    invAddProduct:'➕ Ajouter produit', invAddFamily:'➕ Ajouter famille',
    invSearch:'Rechercher un produit...', invFilterAll:'Tout',
    invColProduct:'Produit', invColFamily:'Famille', invColPrice:'Prix',
    invColQty:'Stock', invColBarcode:'Code-barres', invColActions:'Actions',
    invLowStock:'⚠️ Stock bas', invOutStock:'🚫 Rupture de stock',
    repDashboard:'📊 Tableau de bord', repDaily:'💰 Revenus journaliers',
    repDebts:'💳 Dettes journalières', repFamilies:'🏪 Revenus par famille',
    repProducts:'📦 Revenus produits', repScale:'⚖️ Revenus balance',
    repBackToSale:'Retour vente', repPeriodWeek:'📅 Semaine',
    repPeriodMonth:'🗓️ Mois', repPeriodYear:'📆 Année',
    repToday:"Aujourd'hui", repPrintAll:'🖨️ Tout imprimer',
    repCloseDay:'🔒 Clôture journée', repManageCustomers:'👥 Gestion clients',
    usersAdd:'➕ Ajouter utilisateur',
    usersColName:'Nom', usersColUser:'Identifiant', usersColRole:'Rôle', usersColActions:'Actions',
    suppAdd:'➕ Ajouter fournisseur',
    suppName:'Nom fournisseur', suppPhone:'Téléphone', suppEmail:'E-mail',
  },
  en: {
    navSale:'Sale', navInventory:'Inventory',
    navCustomers:'Customers', navReports:'Business',
    navUsers:'Users', navSuppliers:'Suppliers',
    navSettings:'Settings', navLogout:'Logout',
    titleSale:'Sale Interface', titleInventory:'📦 Inventory Management',
    titleCustomers:'👥 Customer Management', titleReports:'Business Analytics',
    titleUsers:'👤 User Management', titleSuppliers:'🚚 Suppliers',
    titleSettings:'⚙️ General Settings',
    btnSave:'💾 Save', btnCancel:'Cancel', btnClose:'Close', btnAdd:'➕ Add',
    btnEdit:'✏️ Edit', btnDelete:'🗑️ Delete', btnPrint:'🖨️ Print', btnSearch:'🔍 Search',
    btnBack:'← Back', btnConfirm:'✅ Confirm', btnAll:'All',
    saleSearchPlaceholder:'Search product or scan barcode...',
    saleProduct:'Product', saleQty:'Qty', salePrice:'Price', saleTotal:'Total',
    saleDiscount:'🏷️ Discount:', saleCustomer:'👤 Customer:', salePaid:'💳 Paid:',
    saleBtnCheckout:'✅ Pay', saleBtnPartial:'🔢 Partial + Debt', saleBtnDebt:'📋 Full Credit',
    saleEmpty:'Cart is empty', saleItems:' item(s)',
    saleModalTitle:'🧾 Confirm Sale', saleBtnPrint:'🖨️ Print Invoice', saleBtnNoprint:'✖️ Close',
    custAdd:'➕ Add Customer', custSearch:'Search by name or phone...',
    custFilterAll:'All', custFilterDebt:'💳 Debtors', custFilterClear:'✅ Cleared',
    custName:'👤 Name *', custPhone:'📞 Phone *',
    custBtnDebts:'📋 Debts', custBtnPartial:'💰 Partial', custBtnPayAll:'✅ Pay All',
    custBtnDebtInv:'🖨️ Debt Invoice', custBtnEdit:'✏️', custBtnDelete:'🗑️',
    custTotalCustomers:'Total Customers', custTotalDebt:'Total Debts',
    custNone:'No customers', custNoDebt:'✅ No debts', custDebtLeft:'Remaining debt',
    invAddProduct:'➕ Add Product', invAddFamily:'➕ Add Family',
    invSearch:'Search product...', invFilterAll:'All',
    invColProduct:'Product', invColFamily:'Family', invColPrice:'Price',
    invColQty:'Stock', invColBarcode:'Barcode', invColActions:'Actions',
    invLowStock:'⚠️ Low stock', invOutStock:'🚫 Out of stock',
    repDashboard:'📊 Dashboard', repDaily:'💰 Daily Revenue',
    repDebts:'💳 Daily Debts', repFamilies:'🏪 Family Revenue',
    repProducts:'📦 Product Revenue', repScale:'⚖️ Scale Revenue',
    repBackToSale:'Back to sale', repPeriodWeek:'📅 Weekly',
    repPeriodMonth:'🗓️ Monthly', repPeriodYear:'📆 Yearly',
    repToday:'Today', repPrintAll:'🖨️ Print All',
    repCloseDay:'🔒 Close Day', repManageCustomers:'👥 Manage Customers',
    usersAdd:'➕ Add User',
    usersColName:'Name', usersColUser:'Username', usersColRole:'Role', usersColActions:'Actions',
    suppAdd:'➕ Add Supplier',
    suppName:'Supplier name', suppPhone:'Phone', suppEmail:'E-mail',
  }
};

function applyPageTranslation(lang) {
  const t = APP_I18N[lang] || APP_I18N.ar;
  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  document.documentElement.lang = lang;
  document.documentElement.dir = dir;

  // Sidebar nav labels — use data-nav attribute
  document.querySelectorAll('[data-nav]').forEach(el => {
    const k = el.dataset.nav;
    if (t[k] !== undefined) el.textContent = t[k];
  });

  // General data-i18n elements
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const k = el.dataset.i18n;
    if (t[k] !== undefined) {
      if (el.tagName === 'INPUT' && el.placeholder !== undefined) {
        el.placeholder = t[k];
      } else {
        el.textContent = t[k];
      }
    }
  });

  // Placeholders with data-i18n-ph
  document.querySelectorAll('[data-i18n-ph]').forEach(el => {
    const k = el.dataset.i18nPh;
    if (t[k] !== undefined) el.placeholder = t[k];
  });
}

// ── Theme Apply (accent + bg — fully separated) ───────────────
async function applyTheme() {
  const accent = await getSetting('themeColor') || 'blue_purple';
  const bg     = await getSetting('bgMode')     || 'dark';

  const root = document.documentElement;
  root.setAttribute('data-accent', accent);
  root.setAttribute('data-bg',     bg);
  root.setAttribute('data-theme', accent === 'blue_purple' ? '' : accent);

  if (bg === 'light') {
    document.body.style.background = '#EAEAF2';
    document.body.style.color      = '#111122';
  } else {
    document.body.style.background = '';
    document.body.style.color      = '';
  }

  // Language + Font
  const lang = await getSetting('language') || localStorage.getItem('posdz_lang') || 'ar';
  root.lang = lang;
  root.dir  = lang === 'ar' ? 'rtl' : 'ltr';
  localStorage.setItem('posdz_lang', lang);

  // Apply translations to current page
  applyPageTranslation(lang);

  const font = await getSetting('appFont') || 'Cairo';
  document.body.style.fontFamily = `'${font}', 'Cairo', sans-serif`;

  const fontSize = parseInt(await getSetting('fontSize')) || 15;
  root.style.fontSize = fontSize + 'px';
}

// ── Custom Confirm Dialog (replaces native browser confirm) ───────
// Injects a styled modal — no browser URL shown in the dialog
function customConfirm(message, onOk, onCancel) {
  // Remove any existing custom confirm
  const existing = document.getElementById('_posdzConfirm');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = '_posdzConfirm';
  overlay.style.cssText = `
    position:fixed;inset:0;z-index:9999;
    background:rgba(0,0,0,0.65);
    display:flex;align-items:center;justify-content:center;
    animation:fadeIn 0.15s ease;
  `;
  overlay.innerHTML = `
    <div style="
      background:var(--bg-card,#241848);
      border:1px solid var(--primary,#7C3AED);
      border-radius:16px;padding:28px 24px;
      max-width:340px;width:90%;
      box-shadow:0 16px 48px rgba(0,0,0,0.6);
      text-align:center;
    ">
      <div style="font-size:1.3rem;margin-bottom:8px;">❓</div>
      <div style="color:var(--text-primary,#F8F8FF);font-size:0.97rem;font-weight:600;margin-bottom:22px;line-height:1.5;">${message}</div>
      <div style="display:flex;gap:10px;justify-content:center;">
        <button id="_posdzConfOk" style="
          flex:1;padding:11px 18px;border-radius:10px;border:none;cursor:pointer;
          background:var(--primary,#7C3AED);color:#fff;font-family:'Cairo',sans-serif;
          font-size:0.95rem;font-weight:700;transition:opacity 0.15s;
        ">✅ نعم</button>
        <button id="_posdzConfNo" style="
          flex:1;padding:11px 18px;border-radius:10px;cursor:pointer;
          background:transparent;color:var(--text-secondary,#A0A0C0);font-family:'Cairo',sans-serif;
          font-size:0.95rem;font-weight:700;border:1px solid var(--border,#3D2E6B);
        ">✖️ لا</button>
      </div>
    </div>`;

  document.body.appendChild(overlay);

  const close = () => overlay.remove();
  document.getElementById('_posdzConfOk').onclick = () => { close(); if (onOk) onOk(); };
  document.getElementById('_posdzConfNo').onclick = () => { close(); if (onCancel) onCancel(); };
  overlay.addEventListener('click', e => { if (e.target === overlay) { close(); if (onCancel) onCancel(); } });
}

// ── Custom Alert (replaces native alert) ──────────────────────────
function customAlert(message, icon = 'ℹ️') {
  const existing = document.getElementById('_posdzAlert');
  if (existing) existing.remove();
  const overlay = document.createElement('div');
  overlay.id = '_posdzAlert';
  overlay.style.cssText = `position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.65);display:flex;align-items:center;justify-content:center;`;
  overlay.innerHTML = `
    <div style="background:var(--bg-card,#241848);border:1px solid var(--border,#3D2E6B);border-radius:16px;padding:28px 24px;max-width:320px;width:90%;box-shadow:0 16px 48px rgba(0,0,0,0.6);text-align:center;">
      <div style="font-size:1.6rem;margin-bottom:10px;">${icon}</div>
      <div style="color:var(--text-primary,#F8F8FF);font-size:0.95rem;margin-bottom:20px;line-height:1.5;">${message}</div>
      <button onclick="document.getElementById('_posdzAlert').remove()" style="padding:10px 28px;border-radius:10px;border:none;background:var(--primary,#7C3AED);color:#fff;font-family:'Cairo',sans-serif;font-size:0.9rem;font-weight:700;cursor:pointer;">حسناً</button>
    </div>`;
  document.body.appendChild(overlay);
}

// ── Async confirm wrapper (for use with await) ───────────────────
function customConfirmAsync(message) {
  return new Promise(resolve => {
    customConfirm(message, () => resolve(true), () => resolve(false));
  });
}

// ── Input Dialog (replaces native prompt) ────────────────────────
function _inputDialog(label, defaultVal = '') {
  return new Promise(resolve => {
    const existing = document.getElementById('_posdzInput');
    if (existing) existing.remove();
    const overlay = document.createElement('div');
    overlay.id = '_posdzInput';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.65);display:flex;align-items:center;justify-content:center;';
    overlay.innerHTML = `
      <div style="background:var(--bg-card,#241848);border:1px solid var(--primary,#7C3AED);border-radius:16px;padding:24px 22px;max-width:320px;width:90%;box-shadow:0 16px 48px rgba(0,0,0,0.6);">
        <div style="color:var(--text-primary,#F8F8FF);font-size:0.95rem;font-weight:600;margin-bottom:14px;">${label}</div>
        <input id="_posdzInputField" type="text" value="${defaultVal}" style="width:100%;background:var(--bg-input,#1E1540);border:1px solid var(--primary,#7C3AED);border-radius:8px;color:var(--text-primary,#F8F8FF);padding:10px 12px;font-family:'Cairo',sans-serif;font-size:1rem;outline:none;box-sizing:border-box;margin-bottom:14px;"/>
        <div style="display:flex;gap:10px;">
          <button id="_posdzInputOk" style="flex:2;padding:10px;border-radius:10px;border:none;cursor:pointer;background:var(--primary,#7C3AED);color:#fff;font-family:'Cairo',sans-serif;font-size:0.92rem;font-weight:700;">✅ تأكيد</button>
          <button id="_posdzInputCancel" style="flex:1;padding:10px;border-radius:10px;cursor:pointer;background:transparent;color:var(--text-secondary,#A0A0C0);font-family:'Cairo',sans-serif;font-size:0.92rem;border:1px solid var(--border,#3D2E6B);">إلغاء</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    const input = document.getElementById('_posdzInputField');
    input.focus();
    input.select();
    const submit = () => { overlay.remove(); resolve(input.value.trim() || null); };
    const cancel = () => { overlay.remove(); resolve(null); };
    document.getElementById('_posdzInputOk').onclick = submit;
    document.getElementById('_posdzInputCancel').onclick = cancel;
    input.addEventListener('keydown', e => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') cancel(); });
  });
}

// ── Init ──────────────────────────────────────────────────────
async function initApp() {
  await openDB();
  await applyTheme();
  await loadCurrency();
  await loadHeaderStoreName();
  startClock();
  initSidebar();
  initVirtualKeyboard();
  initButtonSounds();
  // Run notification checks after a short delay to not block init
  setTimeout(() => initNotifications(), 2000);
}

// ═══════════════════════════════════════════════════════════════
// ── NOTIFICATION ENGINE — POS DZ v4.0.0
// ═══════════════════════════════════════════════════════════════

// Notification storage key (localStorage — fast, cross-tab)
const NOTIF_KEY   = 'posdz_notifications';
const NOTIF_READ  = 'posdz_notif_read_ts'; // timestamps of read items

// ── Load / Save notifications from localStorage ────────────────
function _loadNotifs() {
  try { return JSON.parse(localStorage.getItem(NOTIF_KEY) || '[]'); } catch { return []; }
}
function _saveNotifs(list) {
  try { localStorage.setItem(NOTIF_KEY, JSON.stringify(list)); } catch {}
}

// ── Add a notification (dedup by id within 24h) ────────────────
function _pushNotif(id, icon, title, body, type = 'warning') {
  const list  = _loadNotifs();
  const now   = Date.now();
  const exist = list.find(n => n.id === id);
  // Deduplicate: if same id exists and was added < 24h ago, skip
  if (exist && (now - exist.ts) < 24 * 60 * 60 * 1000) return;
  // Remove old entry with same id if present
  const fresh = list.filter(n => n.id !== id);
  fresh.unshift({ id, icon, title, body, type, ts: now, read: false });
  // Keep max 50 notifications
  _saveNotifs(fresh.slice(0, 50));
  _renderBell();
}

// ── Mark a single notif as read ────────────────────────────────
function _markRead(id) {
  const list = _loadNotifs().map(n => n.id === id ? { ...n, read: true } : n);
  _saveNotifs(list);
  _renderBell();
  _renderNotifPanel();
}

// ── Mark all as read ──────────────────────────────────────────
function _markAllRead() {
  const list = _loadNotifs().map(n => ({ ...n, read: true }));
  _saveNotifs(list);
  _renderBell();
  _renderNotifPanel();
}

// ── Inject bell button into every page header ─────────────────
function _injectBell() {
  const header = document.querySelector('.app-header');
  if (!header || document.getElementById('_notifBell')) return;

  // Bell button — inserted BEFORE the menu button
  const menuBtn = header.querySelector('.menu-btn');
  const bell = document.createElement('button');
  bell.id = '_notifBell';
  bell.title = 'الإشعارات';
  bell.style.cssText = `
    position:relative; background:transparent; border:none;
    color:var(--text-primary); font-size:1.4rem; cursor:pointer;
    padding:6px 10px; border-radius:8px; transition:0.2s;
    line-height:1; flex-shrink:0;
  `;
  bell.innerHTML = `
    🔔
    <span id="_notifBadge" style="
      display:none; position:absolute; top:2px; right:4px;
      background:#ef4444; color:#fff; border-radius:50%;
      min-width:18px; height:18px; font-size:0.65rem; font-weight:900;
      font-family:'Cairo',sans-serif; line-height:18px; text-align:center;
      padding:0 3px; box-shadow:0 0 6px rgba(239,68,68,0.7);
      pointer-events:none;
    "></span>
  `;
  bell.addEventListener('mouseenter', () => bell.style.background = 'var(--bg-card)');
  bell.addEventListener('mouseleave', () => bell.style.background = 'transparent');
  bell.onclick = (e) => { e.stopPropagation(); _toggleNotifPanel(); };

  if (menuBtn) header.insertBefore(bell, menuBtn);
  else header.prepend(bell);

  // Notification panel (dropdown)
  const panel = document.createElement('div');
  panel.id = '_notifPanel';
  panel.style.cssText = `
    display:none; position:fixed; top:68px; right:16px; z-index:9000;
    width:340px; max-height:480px; overflow-y:auto;
    background:var(--bg-card); border:1px solid var(--primary);
    border-radius:14px; box-shadow:0 12px 40px rgba(0,0,0,0.55);
    font-family:'Cairo',sans-serif;
  `;
  document.body.appendChild(panel);

  // Close panel on outside click
  document.addEventListener('click', (e) => {
    if (!panel.contains(e.target) && e.target !== bell && !bell.contains(e.target)) {
      panel.style.display = 'none';
    }
  });

  _renderBell();
}

// ── Render badge count ─────────────────────────────────────────
function _renderBell() {
  const badge = document.getElementById('_notifBadge');
  if (!badge) return;
  const unread = _loadNotifs().filter(n => !n.read).length;
  if (unread > 0) {
    badge.style.display = 'block';
    badge.textContent   = unread > 99 ? '99+' : String(unread);
  } else {
    badge.style.display = 'none';
  }
}

// ── Toggle notification panel ─────────────────────────────────
function _toggleNotifPanel() {
  const panel = document.getElementById('_notifPanel');
  if (!panel) return;
  if (panel.style.display === 'none' || !panel.style.display) {
    _renderNotifPanel();
    panel.style.display = 'block';
  } else {
    panel.style.display = 'none';
  }
}

// ── Render notification list inside panel ─────────────────────
function _renderNotifPanel() {
  const panel = document.getElementById('_notifPanel');
  if (!panel) return;
  const list   = _loadNotifs();
  const unread = list.filter(n => !n.read).length;

  const typeColor = { warning: '#f59e0b', danger: '#ef4444', success: '#10b981', info: '#3b82f6' };

  let html = `
    <div style="display:flex;justify-content:space-between;align-items:center;
      padding:14px 16px;border-bottom:1px solid var(--border);
      background:var(--bg-dark);border-radius:14px 14px 0 0;position:sticky;top:0;z-index:1;">
      <span style="font-weight:800;font-size:1rem;color:var(--primary-light);">
        🔔 الإشعارات
        ${unread > 0 ? `<span style="background:#ef4444;color:#fff;border-radius:10px;padding:1px 8px;font-size:0.72rem;margin-right:6px;">${unread}</span>` : ''}
      </span>
      ${unread > 0 ? `<button onclick="_markAllRead()" style="background:transparent;border:1px solid var(--border);color:var(--text-secondary);padding:4px 10px;border-radius:8px;cursor:pointer;font-family:'Cairo',sans-serif;font-size:0.75rem;">قراءة الكل ✓</button>` : '<span style="color:var(--success);font-size:0.82rem;">✅ لا جديد</span>'}
    </div>
  `;

  if (!list.length) {
    html += `<div style="padding:32px;text-align:center;color:var(--text-secondary);font-size:0.9rem;">
      <div style="font-size:2rem;margin-bottom:10px;">🔕</div>
      لا توجد إشعارات
    </div>`;
  } else {
    // Show unread first, then read
    const sorted = [...list.filter(n => !n.read), ...list.filter(n => n.read)];
    html += sorted.map(n => {
      const color = typeColor[n.type] || '#6b7280';
      const dateStr = new Date(n.ts).toLocaleDateString('ar-DZ') + ' ' + new Date(n.ts).toLocaleTimeString('ar-DZ', { hour:'2-digit', minute:'2-digit' });
      return `
        <div onclick="_markRead('${n.id}')" style="
          display:flex;gap:10px;padding:12px 16px;
          border-bottom:1px solid var(--border);cursor:pointer;
          background:${n.read ? 'transparent' : 'rgba(124,58,237,0.06)'};
          transition:background 0.15s;
          ${n.read ? 'opacity:0.6;' : ''}
        " onmouseenter="this.style.background='var(--bg-medium)'" onmouseleave="this.style.background='${n.read ? 'transparent' : 'rgba(124,58,237,0.06)'}'">
          <div style="width:36px;height:36px;border-radius:50%;background:${color}22;border:2px solid ${color};
            display:flex;align-items:center;justify-content:center;font-size:1.1rem;flex-shrink:0;">
            ${n.icon}
          </div>
          <div style="flex:1;min-width:0;">
            <div style="font-weight:${n.read ? '600' : '800'};font-size:0.88rem;color:var(--text-primary);margin-bottom:3px;">
              ${n.title}
              ${!n.read ? '<span style="background:#ef4444;border-radius:50%;width:8px;height:8px;display:inline-block;margin-right:4px;"></span>' : ''}
            </div>
            <div style="font-size:0.78rem;color:var(--text-secondary);line-height:1.4;">${n.body}</div>
            <div style="font-size:0.7rem;color:var(--text-secondary);margin-top:4px;opacity:0.7;">${dateStr}</div>
          </div>
        </div>`;
    }).join('');

    // Clear all button at bottom
    html += `<div style="padding:10px 16px;text-align:center;">
      <button onclick="localStorage.removeItem('${NOTIF_KEY}');_renderBell();_renderNotifPanel();"
        style="background:transparent;border:1px solid var(--danger);color:var(--danger);
        padding:5px 14px;border-radius:8px;cursor:pointer;font-family:'Cairo',sans-serif;font-size:0.78rem;">
        🗑️ مسح جميع الإشعارات
      </button>
    </div>`;
  }

  panel.innerHTML = html;
}

// ── Notification checks (called on init + every 24h) ──────────
async function initNotifications() {
  const enabled = await getSetting('notifEnabled');
  if (enabled === '0') return;

  // Always inject the bell (even if notifs disabled, user can see history)
  _injectBell();

  const inApp = await getSetting('notifInApp');
  if (inApp === '0') return;

  try {
    const products  = await dbGetAll('products');
    const debts     = await dbGetAll('debts');
    const customers = await dbGetAll('customers');
    const now       = new Date();

    // ① Low stock
    if (await getSetting('notifLowStock') !== '0') {
      const lowStock = products.filter(p => p.quantity > 0 && p.quantity <= (p.minStock || 5));
      lowStock.forEach(p => _pushNotif(
        `low_stock_${p.id}`, '📉', 'مخزون منخفض',
        `${p.name} — الكمية المتبقية: ${p.quantity}`, 'warning'
      ));
    }

    // ② Out of stock
    if (await getSetting('notifOutStock') !== '0') {
      const outStock = products.filter(p => p.quantity === 0);
      outStock.forEach(p => _pushNotif(
        `out_stock_${p.id}`, '🚫', 'نفاذ الكمية',
        `${p.name} — نفدت الكمية من المخزون`, 'danger'
      ));
    }

    // ③ Debt >= 30 days (per customer)
    if (await getSetting('notifDebt30') !== '0') {
      const grouped = {};
      debts.filter(d => !d.isPaid).forEach(d => {
        const days = (now - new Date(d.date)) / (1000 * 60 * 60 * 24);
        if (days >= 28) { // warn at 28 days, alert at 30
          if (!grouped[d.customerId]) grouped[d.customerId] = { days: 0, amount: 0 };
          grouped[d.customerId].days   = Math.max(grouped[d.customerId].days, Math.floor(days));
          grouped[d.customerId].amount += d.amount;
        }
      });
      for (const [custId, info] of Object.entries(grouped)) {
        const c = customers.find(x => x.id === parseInt(custId));
        _pushNotif(
          `debt_30_${custId}`,
          info.days >= 30 ? '💳' : '⚠️',
          info.days >= 30 ? `دين متجاوز 30 يوم` : 'دين يقترب من 30 يوم',
          `${c ? c.name : '—'} — ${info.amount.toFixed(0)} دج — منذ ${info.days} يوم`,
          info.days >= 30 ? 'danger' : 'warning'
        );
      }
    }

    // ④ Product expiry within 7 days
    if (await getSetting('notifExpiry') !== '0') {
      products.filter(p => p.expiryDate).forEach(p => {
        const daysLeft = (new Date(p.expiryDate) - now) / (1000 * 60 * 60 * 24);
        if (daysLeft <= 7 && daysLeft >= 0) {
          _pushNotif(
            `expiry_${p.id}`, '⏰', 'انتهاء الصلاحية قريب',
            `${p.name} — يتبقى ${Math.ceil(daysLeft)} يوم`, 'warning'
          );
        } else if (daysLeft < 0) {
          _pushNotif(
            `expired_${p.id}`, '❌', 'منتج منتهي الصلاحية',
            `${p.name} — انتهت الصلاحية`, 'danger'
          );
        }
      });
    }

    // Refresh bell badge after all checks
    _renderBell();

    // Re-run checks every 24 hours
    setTimeout(() => initNotifications(), 24 * 60 * 60 * 1000);

  } catch(e) { /* silent fail */ }
}

// ── Instant notifications (login / password change) ───────────
// Called from login flow and password change — NOT periodic
function notifLogin(username) {
  getSetting('notifEnabled').then(en => {
    if (en === '0') return;
    getSetting('notifLogin').then(v => {
      if (v === '0') return;
      const now = new Date();
      const timeStr = now.toLocaleTimeString('ar-DZ', { hour:'2-digit', minute:'2-digit' });
      _pushNotif(
        `login_${username}_${Date.now()}`,
        '👤', 'دخول مستخدم',
        `${username} — سجّل الدخول في ${timeStr}`,
        'info'
      );
    });
  });
}

function notifPasswordChange(username) {
  getSetting('notifEnabled').then(en => {
    if (en === '0') return;
    getSetting('notifPwdChange').then(v => {
      if (v === '0') return;
      _pushNotif(
        `pwd_${username}_${Date.now()}`,
        '🔑', 'تغيير الرقم السري',
        `تم تغيير كلمة المرور للمستخدم: ${username}`,
        'warning'
      );
    });
  });
}
