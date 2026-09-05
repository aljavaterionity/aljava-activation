# Struktur Admin ALJAVA TERIONITY

## Prinsip
Admin memakai satu source of truth untuk konfigurasi Supabase dan satu owner untuk setiap fitur. `admin.html` hanya menyusun struktur halaman dan memuat module; business logic berada di module masing-masing.

## Core
- `assets/app-config.js` — konfigurasi publik, satu Supabase client, helper bersama (`$`, `esc`, `money`).
- `assets/admin.js` — session/admin authorization, routing view, dashboard utama, dan lifecycle data bersama.

## Feature modules
- `assets/card-manager.js` — pembuatan kartu, Qty, kode berurutan, produk, activation URL, QR, NFC.
- `assets/card-summary.js` — satu-satunya owner tabel ringkasan kartu, filter, selection, delete single/bulk.
- `assets/product-manager.js` — CRUD master `Product`.
- `assets/customer-manager.js` — CRUD `Customers` dan relasi jumlah kartu.
- `assets/sales-dashboard.js` — dashboard penjualan, filter periode, ringkasan produk, transaksi, dan WhatsApp.
- `assets/sales-report.js` — laporan operasional penjualan per customer/status pembayaran.
- `assets/operations-dashboard.js` — dashboard operasional.
- `assets/scan-analytics.js` — analytics scan/tap.
- `assets/reset-dashboard.js` — satu owner untuk reset operasional melalui RPC `admin_reset_dashboard`.
- `assets/menu-cleanup.js` — satu owner untuk normalisasi Main Menu; tidak menggunakan `MutationObserver`.

## UI / CSS
- `assets/admin.css` — styling dasar admin.
- `assets/dashboard-sections.css` — styling section dashboard dan stat accent.
- `assets/cards-ui.css` — styling kartu.
- `assets/customer-ui.css` — styling customer.
- `assets/sales-dashboard-ui.css` — styling dashboard penjualan.
- `assets/operations-dashboard-ui.css` — styling operations dashboard.
- `assets/scan-analytics-ui.css` — styling scan analytics.
- `assets/main-menu-icons.css` — styling authoritative icon Main Menu.
- `assets/scroll-fix.css` — aturan scrolling tabel/mobile.
- `assets/dark-theme.css` — tema admin.

## Database contract
Admin memakai tabel aktif berikut:
- `Product` — master produk.
- `Cards` — kartu aktif.
- `Customers` — customer.
- `Transactions` — transaksi.
- `CardScans` — aktivitas scan/tap.
- `Subscriptions`, `Sales`, dan `admin_card_actions` — data operasional yang juga dipertimbangkan oleh reset RPC.

`public.cards` lowercase adalah tabel legacy compatibility dan belum boleh dihapus tanpa migration plan terpisah. Produk tidak ikut reset.

## Aturan pengembangan
1. Fitur baru dibuat sebagai module yang jelas, bukan ditambahkan acak ke `admin.js`.
2. Jangan membuat Supabase client kedua; gunakan `window.ALJAVA_CORE.supabase`.
3. Jangan menambahkan `MutationObserver` untuk binding/render global.
4. Setiap control hanya memiliki satu owner/event handler.
5. Jika API lama masih dipakai, migrasikan caller lalu hapus API lama.
6. Database DDL hanya melalui migration.
7. Setelah perubahan: login → dashboard → product → card → activation → scan/tap → payment/report → reset.
