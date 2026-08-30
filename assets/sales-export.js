/* ALJAVA TERIONITY — Sales Excel export */
(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const money = (value) => Number(value || 0);
  let sb = null;

  function getClient() {
    if (sb) return sb;
    const config = window.ALJAVA_CONFIG;
    if (!config || !window.supabase?.createClient) return null;
    sb = window.supabase.createClient(config.supabaseUrl, config.supabaseKey);
    return sb;
  }

  function getPeriod() {
    const start = $('salesStart')?.value || '';
    const end = $('salesEnd')?.value || '';
    return {
      start: start ? new Date(`${start}T00:00:00`) : null,
      end: end ? new Date(`${end}T23:59:59.999`) : null
    };
  }

  function loadSheetJs() {
    if (window.XLSX) return Promise.resolve(window.XLSX);
    const existing = document.querySelector('script[data-aljava-xlsx="1"]');
    if (existing) {
      return new Promise((resolve, reject) => {
        existing.addEventListener('load', () => resolve(window.XLSX), { once: true });
        existing.addEventListener('error', () => reject(new Error('Library Excel gagal dimuat.')), { once: true });
      });
    }
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
      script.async = true;
      script.dataset.aljavaXlsx = '1';
      script.onload = () => window.XLSX ? resolve(window.XLSX) : reject(new Error('Library Excel tidak tersedia.'));
      script.onerror = () => reject(new Error('Library Excel gagal dimuat.'));
      document.head.appendChild(script);
    });
  }

  async function getData() {
    const client = getClient();
    if (!client) throw new Error('Konfigurasi aplikasi tidak tersedia.');
    const [txResult, productsResult, customersResult] = await Promise.all([
      client.from('Transactions').select('id,customer_id,card_id,product_id,quantity,selling_price,hpp,commission,payment_status,transaction_date').order('transaction_date', { ascending: false }),
      client.from('Product').select('id,name,product_code,category,hpp,selling_price,commission'),
      client.from('Customers').select('id,business_name,owner_name,whatsapp,email')
    ]);
    if (txResult.error) throw txResult.error;
    if (productsResult.error) throw productsResult.error;
    if (customersResult.error) throw customersResult.error;

    const { start, end } = getPeriod();
    const products = Object.fromEntries((productsResult.data || []).map((row) => [row.id, row]));
    const customers = Object.fromEntries((customersResult.data || []).map((row) => [row.id, row]));
    const transactions = (txResult.data || []).filter((row) => {
      const date = new Date(row.transaction_date);
      return (!start || date >= start) && (!end || date <= end);
    });
    return { transactions, products, customers, start, end };
  }

  function buildSheets(XLSX, data) {
    const rows = data.transactions.map((row) => {
      const qty = Number(row.quantity || 1);
      const unitSell = money(row.selling_price);
      const unitHpp = money(row.hpp);
      const commissionTotal = money(row.commission);
      const unitCommission = qty ? commissionTotal / qty : commissionTotal;
      const customer = data.customers[row.customer_id] || {};
      const product = data.products[row.product_id] || {};
      return {
        'Tanggal': new Date(row.transaction_date).toLocaleString('id-ID'),
        'Transaksi ID': row.id,
        'Customer': customer.business_name || customer.owner_name || '-',
        'WhatsApp': customer.whatsapp || '-',
        'Produk': product.name || '-',
        'Kode Produk': product.product_code || '-',
        'Qty': qty,
        'Harga Jual / Unit': unitSell,
        'Omzet': unitSell * qty,
        'HPP / Unit': unitHpp,
        'HPP Total': unitHpp * qty,
        'Komisi / Unit': unitCommission,
        'Komisi Total': commissionTotal,
        'Laba Kotor': (unitSell * qty) - (unitHpp * qty) - commissionTotal,
        'Status Pembayaran': row.payment_status || '-'
      };
    });

    const groupedProduct = {};
    data.transactions.forEach((row) => {
      const key = row.product_id || 'unknown';
      const product = data.products[key] || {};
      const item = groupedProduct[key] ||= { Produk: product.name || '-', 'Kode Produk': product.product_code || '-', Qty: 0, Omzet: 0, HPP: 0, Komisi: 0, 'Laba Kotor': 0 };
      const qty = Number(row.quantity || 1);
      const sell = money(row.selling_price) * qty;
      const hpp = money(row.hpp) * qty;
      const commission = money(row.commission);
      item.Qty += qty;
      item.Omzet += sell;
      item.HPP += hpp;
      item.Komisi += commission;
      item['Laba Kotor'] += sell - hpp - commission;
    });
    const productSummary = Object.values(groupedProduct).sort((a, b) => b.Omzet - a.Omzet);

    const groupedCustomer = {};
    data.transactions.forEach((row) => {
      const key = row.customer_id || 'unknown';
      const customer = data.customers[key] || {};
      const item = groupedCustomer[key] ||= {
        'Customer': customer.business_name || customer.owner_name || '-',
        'WhatsApp': customer.whatsapp || '-',
        'Transaksi': 0,
        'Qty': 0,
        'Omzet': 0,
        'HPP': 0,
        'Komisi': 0,
        'Laba Kotor': 0
      };
      const qty = Number(row.quantity || 1);
      const sell = money(row.selling_price) * qty;
      const hpp = money(row.hpp) * qty;
      const commission = money(row.commission);
      item.Transaksi += 1;
      item.Qty += qty;
      item.Omzet += sell;
      item.HPP += hpp;
      item.Komisi += commission;
      item['Laba Kotor'] += sell - hpp - commission;
    });
    const customerSummary = Object.values(groupedCustomer).sort((a, b) => b.Omzet - a.Omzet);

    const groupedStatus = {};
    data.transactions.forEach((row) => {
      const status = String(row.payment_status || 'Tidak diketahui').trim() || 'Tidak diketahui';
      const item = groupedStatus[status] ||= { 'Status Pembayaran': status, 'Transaksi': 0, 'Omzet': 0 };
      const qty = Number(row.quantity || 1);
      item.Transaksi += 1;
      item.Omzet += money(row.selling_price) * qty;
    });
    const paymentSummary = Object.values(groupedStatus).sort((a, b) => b.Omzet - a.Omzet);

    const totals = productSummary.reduce((acc, row) => {
      acc.Qty += row.Qty;
      acc.Omzet += row.Omzet;
      acc.HPP += row.HPP;
      acc.Komisi += row.Komisi;
      acc['Laba Kotor'] += row['Laba Kotor'];
      return acc;
    }, { Qty: 0, Omzet: 0, HPP: 0, Komisi: 0, 'Laba Kotor': 0 });

    const report = [{
      'Periode Mulai': data.start ? data.start.toLocaleDateString('id-ID') : 'Semua',
      'Periode Selesai': data.end ? data.end.toLocaleDateString('id-ID') : 'Semua',
      'Transaksi': data.transactions.length,
      'Qty': totals.Qty,
      'Omzet': totals.Omzet,
      'HPP': totals.HPP,
      'Komisi': totals.Komisi,
      'Laba Kotor': totals['Laba Kotor']
    }];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(report), 'Ringkasan');
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(productSummary), 'Per Produk');
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(customerSummary), 'Per Customer');
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(paymentSummary), 'Status Pembayaran');
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), 'Transaksi');
    return workbook;
  }

  async function exportExcel() {
    const button = $('salesExportExcel');
    if (button) { button.disabled = true; button.textContent = 'Menyiapkan Excel…'; }
    try {
      const XLSX = await loadSheetJs();
      const data = await getData();
      const workbook = buildSheets(XLSX, data);
      const now = new Date();
      const stamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
      XLSX.writeFile(workbook, `ALJAVA-Laporan-Penjualan-${stamp}.xlsx`);
      if (button) button.textContent = '✓ Excel Berhasil';
      setTimeout(() => { if (button) button.textContent = 'Export Excel'; }, 1800);
    } catch (error) {
      console.error('[ALJAVA] Excel export gagal:', error);
      if (button) button.textContent = 'Export Excel';
      alert(`Gagal membuat Excel: ${error?.message || error}`);
    } finally {
      if (button) button.disabled = false;
    }
  }

  function install() {
    if ($('salesExportExcel')) return;
    const host = $('salesRefresh')?.parentElement;
    if (!host) return;
    const button = document.createElement('button');
    button.id = 'salesExportExcel';
    button.type = 'button';
    button.className = 'btn';
    button.textContent = 'Export Excel';
    button.addEventListener('click', () => void exportExcel());
    host.appendChild(button);
  }

  window.salesExport = { install, exportExcel };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
  else install();
})();
