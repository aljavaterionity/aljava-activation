/*
 * ALJAVA TERIONITY — Admin application logic
 * Keep all dashboard behavior in this file.
 */

const CONFIG = {
  supabaseUrl: 'https://lbzwmcxwxummitldxucj.supabase.co',
  supabaseKey: 'sb_publishable_uADO7eqVkcwnhY5B0IZrSA_h6p9VRaw'
};

const $ = (id) => document.getElementById(id);
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#039;'
}[char]));
const money = (value) => new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0
}).format(Number(value) || 0);

if (!window.supabase?.createClient) {
  const message = $('loginMsg');
  if (message) message.innerHTML = '<div class="notice err">Library Supabase gagal dimuat. Muat ulang halaman.</div>';
  throw new Error('Supabase client tidak tersedia.');
}

const sb = window.supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey);
const state = {
  cards: [],
  products: [],
  customers: [],
  transactions: [],
  scans: [],
  customerRows: []
};

/* ---------- Navigation ---------- */
function closeMenu() {
  $('menuButton')?.setAttribute('aria-expanded', 'false');
  $('menuPanel')?.classList.remove('open');
}

function openMenu() {
  $('menuButton')?.setAttribute('aria-expanded', 'true');
  $('menuPanel')?.classList.add('open');
}

function toggleMenu() {
  $('menuPanel')?.classList.contains('open') ? closeMenu() : openMenu();
}

function showView(viewId) {
  document.querySelectorAll('.view').forEach((view) => {
    view.classList.remove('active-view');
  });
  $(viewId)?.classList.add('active-view');
  closeMenu();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ---------- Authentication ---------- */
function setLoggedOut(message = '') {
  $('app').style.display = 'none';
  $('login').classList.remove('hidden');
  $('menuButton').classList.remove('visible');
  closeMenu();
  $('loginMsg').innerHTML = message
    ? `<div class="notice err">❌ ${esc(message)}</div>`
    : '';
}

async function ensureAdmin() {
  try {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) {
      setLoggedOut();
      return false;
    }

    const { data: { user }, error: userError } = await sb.auth.getUser();
    if (userError || !user) {
      await sb.auth.signOut({ scope: 'local' });
      setLoggedOut('Sesi login tidak valid.');
      return false;
    }

    const { data: isAdmin, error: adminError } = await sb.rpc('is_admin_user');
    if (adminError || isAdmin !== true) {
      await sb.auth.signOut({ scope: 'local' });
      setLoggedOut('Akun bukan admin.');
      return false;
    }

    $('login').classList.add('hidden');
    $('app').style.display = 'block';
    $('menuButton').classList.add('visible');
    $('userEmail').textContent = user.email || '';
    return true;
  } catch (error) {
    setLoggedOut(error.message || 'Gagal memeriksa sesi admin.');
    return false;
  }
}

async function login() {
  const email = $('email').value.trim();
  const password = $('password').value;

  if (!email || !password) {
    $('loginMsg').innerHTML = '<div class="notice err">Email dan password wajib diisi.</div>';
    return;
  }

  $('loginBtn').disabled = true;
  try {
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) {
      $('loginMsg').innerHTML = `<div class="notice err">❌ ${esc(error.message)}</div>`;
      return;
    }

    if (await ensureAdmin()) {
      await load();
      showView('dashboardView');
    }
  } catch (error) {
    $('loginMsg').innerHTML = `<div class="notice err">❌ ${esc(error.message)}</div>`;
  } finally {
    $('loginBtn').disabled = false;
  }
}

async function logout() {
  await sb.auth.signOut({ scope: 'local' });
  location.reload();
}

/* ---------- Data loading ---------- */
async function queryTable(table, select, orderBy) {
  let query = sb.from(table).select(select);
  if (orderBy) query = query.order(orderBy, { ascending: false });
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

async function load() {
  try {
    const [cards, products, customers, transactions, scans] = await Promise.all([
      queryTable(
        'Cards',
        'id,card_code,product_type,status,customer_id,product_id,google_review_url,created_at,activated_at,expires_at',
        'created_at'
      ),
      queryTable('Product', 'id,name,category', 'name'),
      queryTable('Customers', 'id,business_name,owner_name,google_review_url,created_at', 'created_at'),
      queryTable(
        'Transactions',
        'id,customer_id,card_id,product_id,quantity,selling_price,payment_status,transaction_date',
        'transaction_date'
      ),
      queryTable('CardScans', 'id,card_id,card_code,event_type,scanned_at', 'scanned_at')
    ]);

    state.cards = cards;
    state.products = products;
    state.customers = customers;
    state.transactions = transactions;
    state.scans = scans;

    renderAll();
  } catch (error) {
    const message = esc(error.message || 'Gagal memuat data.');
    $('txTable').innerHTML = `<div class="notice err">❌ ${message}</div>`;
    $('cardTable').innerHTML = `<div class="notice err">❌ ${message}</div>`;
    $('customerRows').innerHTML = `<tr><td colspan="6"><div class="notice err">❌ ${message}</div></td></tr>`;
  }
}

function renderAll() {
  renderStats();
  renderChart();
  renderTransactions();
  renderScans();
  renderCards();
  fillProductOptions();
  fillCustomerOptions();
  renderCustomers();
}

/* ---------- Dashboard ---------- */
function cardStatus(card) {
  const status = String(card.status || '').toLowerCase();

  // Expiration takes priority over activation so an expired activated card
  // never appears as active.
  if (card.expires_at && new Date(card.expires_at) < new Date()) return 'expired';
  if (status === 'active' || card.activated_at) return 'active';
  return 'pending';
}

function renderStats() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const revenue = state.transactions.reduce(
    (sum, row) => sum + Number(row.selling_price || 0) * Number(row.quantity || 1),
    0
  );
  const monthRevenue = state.transactions
    .filter((row) => {
      const date = new Date(row.transaction_date);
      return date.getFullYear() === year && date.getMonth() === month;
    })
    .reduce((sum, row) => sum + Number(row.selling_price || 0) * Number(row.quantity || 1), 0);
  const monthScan = state.scans.filter((row) => {
    const date = new Date(row.scanned_at);
    return date.getFullYear() === year && date.getMonth() === month;
  }).length;
  const active = state.cards.filter((card) => cardStatus(card) === 'active').length;

  $('totalRev').textContent = money(revenue);
  $('monthRev').textContent = money(monthRevenue);
  $('totalScan').textContent = String(state.scans.length);
  $('monthScan').textContent = String(monthScan);
  $('activeCards').textContent = String(active);
  $('pendingCards').textContent = String(state.cards.length - active);
}

function chartRows() {
  const year = Number($('year').value) || new Date().getFullYear();
  const selectedMonth = $('month').value;
  const totals = Array(12).fill(0);

  state.transactions.forEach((row) => {
    const date = new Date(row.transaction_date);
    if (date.getFullYear() === year) {
      totals[date.getMonth()] += Number(row.selling_price || 0) * Number(row.quantity || 1);
    }
  });

  return selectedMonth === ''
    ? totals.map((value, index) => ({ value, index }))
    : [{ value: totals[Number(selectedMonth)] || 0, index: Number(selectedMonth) }];
}

function renderChart() {
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const rows = chartRows();
  const max = Math.max(1, ...rows.map((row) => row.value));

  $('chart').innerHTML = rows.map((row) => `
    <div class="bar" title="${names[row.index]}: ${money(row.value)}">
      <i style="height:${Math.max(5, row.value / max * 220)}px"></i>
      <span>${names[row.index]}</span>
    </div>
  `).join('');

  $('chartTotal').textContent = `Total periode: ${money(rows.reduce((sum, row) => sum + row.value, 0))} • ${state.transactions.length} transaksi terbaca`;
}

function renderTransactions() {
  const customers = Object.fromEntries(state.customers.map((row) => [row.id, row]));
  const products = Object.fromEntries(state.products.map((row) => [row.id, row]));
  const rows = state.transactions.slice(0, 12);

  $('txTable').innerHTML = rows.length
    ? `<div class="table-wrap"><table><thead><tr><th>Tanggal</th><th>Customer</th><th>Produk</th><th>Qty</th><th>Revenue</th><th>Status</th></tr></thead><tbody>${rows.map((row) => `
        <tr>
          <td>${esc(new Date(row.transaction_date).toLocaleString('id-ID'))}</td>
          <td>${esc(customers[row.customer_id]?.business_name || customers[row.customer_id]?.owner_name || '-')}</td>
          <td>${esc(products[row.product_id]?.name || '-')}</td>
          <td>${Number(row.quantity || 1)}</td>
          <td>${money(Number(row.selling_price || 0) * Number(row.quantity || 1))}</td>
          <td>${esc(row.payment_status || '-')}</td>
        </tr>
      `).join('')}</tbody></table></div>`
    : '<div class="muted">Belum ada transaksi.</div>';
}

function renderScans() {
  const counts = {};
  state.scans.forEach((scan) => {
    const key = scan.card_code || scan.card_id || '-';
    counts[key] = (counts[key] || 0) + 1;
  });

  const rows = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10);
  $('scanSummary').innerHTML = rows.length
    ? rows.map(([code, count]) => `
      <div class="row" style="padding:9px 0;border-bottom:1px solid rgba(30,120,160,.1)">
        <strong>${esc(code)}</strong><span class="muted">${count} scan/tap</span>
      </div>
    `).join('')
    : '<div class="muted">Belum ada scan/tap.</div>';
}

function renderCards() {
  const search = ($('cardSearch').value || '').toLowerCase().trim();
  const statusFilter = $('cardStatus').value;
  const customers = Object.fromEntries(state.customers.map((row) => [row.id, row]));

  const rows = state.cards.filter((card) => {
    const status = cardStatus(card);
    const customerName = customers[card.customer_id]?.business_name || '';
    const text = `${card.card_code || ''} ${customerName} ${card.product_type || ''}`.toLowerCase();
    return (!statusFilter || status === statusFilter) && (!search || text.includes(search));
  });

  const active = rows.filter((card) => cardStatus(card) === 'active').length;
  $('cardSummary').innerHTML = `<div class="notice info">Total ${rows.length} kartu • <strong>${active}</strong> aktif • <strong>${rows.length - active}</strong> lainnya</div>`;

  $('cardTable').innerHTML = rows.length
    ? `<table><thead><tr><th>Kode</th><th>Jenis</th><th>Customer</th><th>Status</th><th>Dibuat</th></tr></thead><tbody>${rows.map((card) => {
        const status = cardStatus(card);
        const label = status === 'active' ? 'Aktif' : status === 'expired' ? 'Expired' : 'Belum Aktif';
        return `<tr>
          <td><strong>${esc(card.card_code)}</strong></td>
          <td>${esc(card.product_type || '-')}</td>
          <td>${esc(customers[card.customer_id]?.business_name || customers[card.customer_id]?.owner_name || '-')}</td>
          <td class="${status}">${label}</td>
          <td>${esc(new Date(card.created_at).toLocaleDateString('id-ID'))}</td>
        </tr>`;
      }).join('')}</tbody></table>`
    : '<div class="muted">Tidak ada kartu.</div>';
}

/* ---------- Customer database ---------- */
function customerStatus(customerId) {
  const cards = state.cards.filter((card) => card.customer_id === customerId);
  if (cards.some((card) => cardStatus(card) === 'active')) return 'Aktif';
  if (cards.some((card) => cardStatus(card) === 'pending')) return 'Pending';
  if (cards.some((card) => cardStatus(card) === 'expired')) return 'Expired';
  return 'Pending';
}

function prepareCustomerRows() {
  const scansByCard = {};
  const cardsByCustomer = {};

  state.scans.forEach((scan) => {
    scansByCard[scan.card_id] = (scansByCard[scan.card_id] || 0) + 1;
  });

  state.cards.forEach((card) => {
    if (!card.customer_id) return;
    (cardsByCustomer[card.customer_id] ||= []).push(card);
  });

  state.customerRows = state.customers.map((customer) => {
    const cards = cardsByCustomer[customer.id] || [];
    const scanCount = cards.reduce((total, card) => total + (scansByCard[card.id] || 0), 0);
    const types = [...new Set(cards.map((card) => card.product_type).filter(Boolean))].join(', ') || '-';
    const reviewUrl = customer.google_review_url || cards.find((card) => card.google_review_url)?.google_review_url || '';

    return {
      id: customer.id,
      business_name: customer.business_name || customer.owner_name || '-',
      product_type: types,
      status: customerStatus(customer.id),
      scans: scanCount,
      url: reviewUrl
    };
  });
}

function renderCustomers() {
  prepareCustomerRows();
  const search = ($('customerSearch').value || '').toLowerCase().trim();
  const rows = state.customerRows.filter((customer) =>
    !search ||
    customer.business_name.toLowerCase().includes(search) ||
    String(customer.id).toLowerCase().includes(search)
  );

  $('customerRows').innerHTML = rows.length
    ? rows.map((customer) => `
      <tr>
        <td>${esc(customer.id)}</td>
        <td><b>${esc(customer.business_name)}</b></td>
        <td>${esc(customer.product_type)}</td>
        <td class="${customer.status.toLowerCase()}">${esc(customer.status)}</td>
        <td>${customer.scans}</td>
        <td>${customer.url
          ? `<a class="btn" style="text-decoration:none;display:inline-block" href="${esc(customer.url)}" target="_blank" rel="noopener">🔗 Buka Review</a>`
          : '<span class="muted">Belum ada link</span>'}</td>
      </tr>
    `).join('')
    : '<tr><td colspan="6" class="muted">Tidak ada customer.</td></tr>';
}

/* ---------- Card creation ---------- */
function fillProductOptions() {
  const html = '<option value="">Produk (opsional)</option>' + state.products.map((product) =>
    `<option value="${esc(product.id)}">${esc(product.name || product.category || product.id)}</option>`
  ).join('');
  $('singleProduct').innerHTML = html;
  $('bulkProduct').innerHTML = html;
}

function fillCustomerOptions() {
  const html = '<option value="">Customer (opsional)</option>' + state.customers.map((customer) =>
    `<option value="${esc(customer.id)}">${esc(customer.business_name || customer.owner_name || customer.id)}</option>`
  ).join('');
  $('singleCustomer').innerHTML = html;
  $('bulkCustomer').innerHTML = html;
}

async function createCards(rows, messageElement) {
  messageElement.className = 'notice info';
  messageElement.textContent = 'Memproses...';

  const { data, error } = await sb.from('Cards').insert(rows).select('id,card_code');
  if (error) throw error;

  messageElement.className = 'notice ok';
  messageElement.textContent = `✓ ${data?.length || rows.length} kartu berhasil dibuat.`;
  await load();
}

/* ---------- Settings ---------- */
function openAddAccount() {
  $('modalTitle').textContent = 'Tambah Akun';
  $('modalBody').innerHTML = '<div class="notice info">Pembuatan akun admin harus melalui proses server-side/privileged auth. Password admin tidak dibuat otomatis dari browser.</div>';
  $('modal').classList.add('open');
}

async function resetDashboard() {
  $('year').value = String(new Date().getFullYear());
  $('month').value = '';
  await load();
  showView('dashboardView');
}

/* ---------- Events ---------- */
$('menuButton').addEventListener('click', toggleMenu);
$('closeMenu').addEventListener('click', closeMenu);
$('loginBtn').addEventListener('click', login);
$('logoutTop').addEventListener('click', logout);
$('logoutMenu').addEventListener('click', logout);
$('refresh').addEventListener('click', load);
$('resetMenu').addEventListener('click', resetDashboard);
$('addAccountMenu').addEventListener('click', openAddAccount);
$('dashboardMenu').addEventListener('click', () => showView('dashboardView'));
$('cardsMenu').addEventListener('click', () => showView('cardsView'));
$('customerMenu').addEventListener('click', () => showView('customersView'));
$('customerSearch').addEventListener('input', renderCustomers);
$('cardSearch').addEventListener('input', renderCards);
$('cardStatus').addEventListener('change', renderCards);
$('year').addEventListener('change', renderChart);
$('month').addEventListener('change', renderChart);
$('modalClose').addEventListener('click', () => $('modal').classList.remove('open'));
$('modal').addEventListener('click', (event) => {
  if (event.target === $('modal')) $('modal').classList.remove('open');
});
document.addEventListener('click', (event) => {
  const panel = $('menuPanel');
  const button = $('menuButton');
  if (panel.classList.contains('open') && !panel.contains(event.target) && event.target !== button) {
    closeMenu();
  }
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    closeMenu();
    $('modal').classList.remove('open');
  }
});

$('singleForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    const productId = $('singleProduct').value || null;
    const customerId = $('singleCustomer').value || null;
    const product = state.products.find((row) => row.id === productId);

    await createCards([{
      card_code: $('singleCode').value.trim(),
      product_type: product?.category || product?.name || 'Tanpa Jenis',
      status: 'pending',
      product_id: productId,
      customer_id: customerId,
      google_review_url: $('singleReview').value.trim() || null
    }], $('singleMsg'));

    event.target.reset();
  } catch (error) {
    $('singleMsg').className = 'notice err';
    $('singleMsg').textContent = `❌ ${esc(error.message)}`;
  }
});

$('bulkForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const codes = [...new Set(
    $('bulkCodes').value
      .split(/\r?\n/)
      .map((value) => value.trim())
      .filter(Boolean)
  )];

  if (!codes.length) return;

  try {
    const productId = $('bulkProduct').value || null;
    const customerId = $('bulkCustomer').value || null;
    const product = state.products.find((row) => row.id === productId);

    await createCards(
      codes.map((cardCode) => ({
        card_code: cardCode,
        product_type: product?.category || product?.name || 'Tanpa Jenis',
        status: 'pending',
        product_id: productId,
        customer_id: customerId
      })),
      $('bulkMsg')
    );

    event.target.reset();
  } catch (error) {
    $('bulkMsg').className = 'notice err';
    $('bulkMsg').textContent = `❌ ${esc(error.message)}`;
  }
});

for (let year = new Date().getFullYear() - 3; year <= new Date().getFullYear() + 1; year += 1) {
  $('year').insertAdjacentHTML('beforeend', `<option value="${year}">${year}</option>`);
}
$('year').value = String(new Date().getFullYear());

function boot() {
  ensureAdmin().then(async (isAdmin) => {
    if (isAdmin) {
      await load();
      showView('dashboardView');
    }
  }).catch((error) => {
    setLoggedOut(error.message || 'Gagal memulai dashboard.');
  });
}

boot();
