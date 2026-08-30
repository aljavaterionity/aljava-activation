# Struktur Admin ALJAVA

`admin.html` hanya untuk struktur HTML dan tiga view: Dashboard Utama, Kelola Kartu, dan Database Customer.

`assets/admin.css` hanya untuk styling Blue Light.

`assets/admin.js` hanya untuk logic: login/session, Main Menu, dashboard, customer, kelola kartu, dan modal.

## Main Menu
- Dashboard Utama
- Kelola Kartu
- Database Customer
- Reset Dashboard
- Tambah Akun
- Logout

## Database Customer
ID | Nama Usaha | Jenis Kartu | Status | Total Scan/Tap | Link Google Review

## Aturan Modifikasi
Jangan menambahkan patch CSS/JS ke `admin.html`. Edit file sesuai tanggung jawabnya. Jangan membuat GitHub Action yang menyuntikkan patch otomatis ke `admin.html` karena dapat menyebabkan duplikasi dan konflik event.
