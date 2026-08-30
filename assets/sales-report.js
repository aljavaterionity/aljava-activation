/* ALJAVA TERIONITY — Sales operations report */
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const money = (value) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(value) || 0);
  const esc = (value) => String(value ?? '').replace(/[&<>\"']/g, (char) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;' }[char]));
  let installed = false;

  async function loadData() {
    const config = window.ALJAVA_CONFIG;
    if (!config || !window.supabase?.createClient) throw new Error('Konfigurasi aplikasi tidak tersedia.');
    const sb = window.supabase.createClient(config.supabaseUrl, config.supabaseKey);
    const [txResult, productsResult, customersResult] = await Promise.all([
      sb.from('Transactions').select('id,customer_id,product_id,quantity,selling_price,hpp,commission,payment_status,amount_paid,due_date,transaction_date').order('transaction_date', { ascending: false }),
      sb.from('Product').select('id,name,product_code'),
      sb.from('Customers').select('id,business_name,owner_name')
    ]);
    if (txResult.error) throw txResult.error;
    if (productsResult.error) throw productsResult.error;
    if (customersResult.error) throw customersResult.error;
    return { transactions: txResult.data || [], products: Object.fromEntries((productsResult.data || []).map((row) => [row.id,row])), customers: Object.fromEntries((customersResult.data || []).map((row) => [row.id,row])) };
  }

  function getPeriod() {
    const start = $('salesStart')?.value || '';
    const end = $('salesEnd')?.value || '';
    return { start: start ? new Date(`${start}T00:00:00`) : null, end: end ? new Date(`${end}T23:59:59.999`) : null };
  }

  function render(data) {
    if (!$('salesView') || installed) return;
    const { start, end } = getPeriod();
    const tx = data.transactions.filter((row) => { const date = new Date(row.transaction_date); return (!start || date >= start) && (!end || date <= end); });
    const byCustomer = {};
    const byStatus = {};
    tx.forEach((row) => {
      const qty = Number(row.quantity || 1), revenue = Number(row.selling_price || 0) * qty, hpp = Number(row.hpp || 0) * qty, commission = Number(row.commission || 0), paid = Math.min(Math.max(Number(row.amount_paid || 0),0), revenue);
      const customer = data.customers[row.customer_id] || {}, customerKey = row.customer_id || 'unknown';
      const item = byCustomer[customerKey] ||= { name: customer.business_name || customer.owner_name || '-', qty:0, revenue:0, hpp:0, commission:0, transactions:0, paid:0, receivable:0 };
      item.qty += qty; item.revenue += revenue; item.hpp += hpp; item.commission += commission; item.transactions += 1; item.paid += paid; item.receivable += Math.max(0, revenue - paid);
      const status = String(row.payment_status || 'Tidak diketahui').trim() || 'Tidak diketahui';
      const statusItem = byStatus[status] ||= { status, transactions:0, revenue:0, paid:0, receivable:0 };
      statusItem.transactions += 1; statusItem.revenue += revenue; statusItem.paid += paid; statusItem.receivable += Math.max(0, revenue - paid);
    });
    const customerRows = Object.values(byCustomer).sort((a,b) => b.revenue - a.revenue);
    const statusRows = Object.values(byStatus).sort((a,b) => b.revenue - a.revenue);
    const anchor = $('salesTransactionTable')?.closest('.panel'); if (!anchor) return;
    const section = document.createElement('section'); section.id='salesOperationsReport'; section.className='glass panel';
    section.innerHTML=`<div class="head"><div class="row"><div><h2 style="margin:0">Laporan Operasional</h2><p class="muted">Omzet, pembayaran, piutang, customer, dan status transaksi.</p></div><div class="actions"><button id="salesRefreshReport" class="btn" type="button">Refresh Laporan</button></div></div></div><div class="body"><section class="stats sales-report-stats"><div class="glass stat"><div class="muted">Omzet Periode</div><div id="reportRevenue" class="num">Rp 0</div></div><div class="glass stat"><div class="muted">Sudah Dibayar</div><div id="reportPaid" class="num">Rp 0</div></div><div class="glass stat"><div class="muted">Piutang</div><div id="reportUnpaid" class="num">Rp 0</div></div><div class="glass stat"><div class="muted">Transaksi Belum Lunas</div><div id="reportUnpaidTx" class="num">0</div></div></section><div class="grid"><div><h3 style="margin:0 0 10px">Per Customer</h3><div class="table-wrap"><table><thead><tr><th>Customer</th><th>Transaksi</th><th>Qty</th><th>Omzet</th><th>Dibayar</th><th>Piutang</th><th>Komisi</th><th>Laba Kotor</th></tr></thead><tbody id="salesCustomerRows"></tbody></table></div></div><div><h3 style="margin:0 0 10px">Status Pembayaran</h3><div class="table-wrap"><table><thead><tr><th>Status</th><th>Transaksi</th><th>Omzet</th><th>Dibayar</th><th>Piutang</th></tr></thead><tbody id="salesPaymentRows"></tbody></table></div></div></div></div>`;
    anchor.parentElement.insertBefore(section, anchor); installed = true;
    const totalRevenue=tx.reduce((s,r)=>s+Number(r.selling_price||0)*Number(r.quantity||1),0);
    const paidRevenue=tx.reduce((s,r)=>{const rev=Number(r.selling_price||0)*Number(r.quantity||1); return s+Math.min(Math.max(Number(r.amount_paid||0),0),rev);},0);
    const receivable=Math.max(0,totalRevenue-paidRevenue);
    const unpaidTx=tx.filter(r=>Math.min(Math.max(Number(r.amount_paid||0),0),Number(r.selling_price||0)*Number(r.quantity||1)) < Number(r.selling_price||0)*Number(r.quantity||1)).length;
    $('reportRevenue').textContent=money(totalRevenue); $('reportPaid').textContent=money(paidRevenue); $('reportUnpaid').textContent=money(receivable); $('reportUnpaidTx').textContent=String(unpaidTx);
    $('salesCustomerRows').innerHTML=customerRows.length?customerRows.map(r=>`<tr><td>${esc(r.name)}</td><td>${r.transactions}</td><td>${r.qty}</td><td>${money(r.revenue)}</td><td>${money(r.paid)}</td><td>${money(r.receivable)}</td><td>${money(r.commission)}</td><td>${money(r.revenue-r.hpp-r.commission)}</td></tr>`).join(''):'<tr><td colspan="8" class="muted">Belum ada data customer.</td></tr>';
    $('salesPaymentRows').innerHTML=statusRows.length?statusRows.map(r=>`<tr><td>${esc(r.status)}</td><td>${r.transactions}</td><td>${money(r.revenue)}</td><td>${money(r.paid)}</td><td>${money(r.receivable)}</td></tr>`).join(''):'<tr><td colspan="5" class="muted">Belum ada status pembayaran.</td></tr>';
    $('salesRefreshReport')?.addEventListener('click',async()=>{section.remove();installed=false;try{render(await loadData());}catch(error){console.error('[ALJAVA] sales report:',error);}});
  }
  async function install(){ if(installed||!$('salesView'))return; try{render(await loadData());}catch(error){console.error('[ALJAVA] sales report:',error);} }
  window.salesOperationsReport={install};
  document.addEventListener('aljava:sales-ui-ready',install);
  document.addEventListener('aljava:data-loaded',install);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
