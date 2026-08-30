# Struktur Admin ALJAVA

`admin.html` hanya untuk struktur HTML dan tiga view: Dashboard Utama, Kelola Kartu, dan Database Customer.

`assets/admin.css` hanya untuk styling Blue Light.

`assets/admin.js` menangani logic umum: login/session, Main Menu, dashboard, customer, kartu, dan modal.

`assets/card-manager.js` khusus untuk pembuatan kartu: Qty, kode berurutan, produk, kode produk, link aktivasi, QR, dan NFC.

## Main Menu
- Dashboard Utama
- Kelola Kartu
- Database Customer
- Reset Dashboard
- Tambah Akun
- Logout

## Kelola Kartu
Form `Buat Kartu` memakai satu alur untuk 1 atau banyak kartu melalui `Qty`.

Kode kartu otomatis berurutan berdasarkan angka terakhir pada kode awal. Produk wajib dipilih agar kartu menyimpan `product_id` dan `product_type` berdasarkan `product_code` produk.

Setiap kartu baru menyimpan:
- `activation_url` → URL aktivasi publik dengan parameter `code`.
- `qr_code_url` → URL gambar QR yang mengarah ke `activation_url`.
- `nfc_url` → URL yang sama dengan `activation_url` untuk diprogram ke chip/tag NFC.

## Product
Tabel `Product` memiliki `product_code` unik. Kode otomatis dibuat dari nama produk bila tidak diberikan, misalnya nama `Basic` menjadi `BASIC`.

## Database Customer
ID | Nama Usaha | Jenis Kartu | Status | Total Scan/Tap | Link Google Review

## Aturan Modifikasi
Jangan menambahkan patch CSS/JS ke `admin.html`. Edit file sesuai tanggung jawabnya. Jangan membuat GitHub Action yang menyuntikkan patch otomatis ke `admin.html` karena dapat menyebabkan duplikasi dan konflik event.
