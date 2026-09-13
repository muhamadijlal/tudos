# Changelog

Semua perubahan penting pada Tudos dicatat di file ini.

## [1.0.0] - 2026-09-14

### Added

**Manajemen Project & Task**
- Project dan Task inti: CRUD project, CRUD task dengan kode ala Jira (`PROJECTCODE-N`).
- Multi-assignee per task (bukan cuma satu assignee).
- Task multi-view: daftar (Tudos), papan (Kanban, drag & drop antar status), dan Timeline (gantt project + task).
- Aturan perpindahan status task: In Review butuh owner/assignee, Done cuma boleh owner project.
- Catatan wajib untuk transisi status tertentu (In Review balik ke Todo/In Progress, Done dibuka lagi, dst), lewat popup konfirmasi.
- Riwayat perubahan status per task.
- Lampiran file/gambar di task (upload, preview, hapus).
- Catatan project ala Notion (Markdown, banyak catatan per project) — slash command (`/`) buat format cepat (heading, bold, italic, list, checklist, quote, code, divider, table), toggle checkbox langsung dari tampilan preview.

**Kolaborasi**
- Komentar task 2 level (reply, bukan reply-ke-reply), notifikasi in-app buat mention/reply/perubahan status.
- Halaman "Lihat Semua Notifikasi" dengan filter (sudah/belum dibaca), bulk mark-read/hapus, klik notifikasi langsung scroll ke komentar terkait.
- Widget "Deadline Mendekat" dan "Perlu Direview" di Dashboard + halaman detail masing-masing.

**RBAC (Role & Permission)**
- Role custom (bukan cuma admin/member tetap) — bikin role sendiri, atur permission granular per fitur.
- Halaman Role & Permission buat kelola role dan lihat siapa aja yang pakai.

**Filter & Pencarian**
- Filter project/kategori/assignee/prioritas/status/periode di Tudos dan Kanban (konsisten, semua berlabel).
- Quick filter kepemilikan ("Semua" / "Milik Saya" atau "Project Saya" / "Ditugaskan ke Saya") di Project, Management Project, Tudos, dan Kanban.
- Banner "task tersembunyi filter periode" — task yang masih perlu perhatian (belum dikerjakan/belum di-assign) tetap kelihatan meski di luar rentang tanggal yang difilter.

**Export**
- Export Excel & PDF di 7 halaman: Tudos, Management Project, Timeline, Kanban, Dashboard, Deadline Mendekat, Perlu Direview — mengikuti filter yang lagi aktif, nama file otomatis nyantumin periode.
- Export **Daily Activity** (.xlsx, mirip template laporan kerja karyawan): satu sheet per bulan, dikelompokkan per hari berdasarkan Tanggal Laporan task (bisa diedit bebas termasuk ke tanggal lampau) — weekend & libur nasional otomatis dikosongkan + ditandai merah, task yang jatuh di hari itu digeser ke hari kerja berikutnya, keterangan nama libur nasional ikut ditulis.
- Kalender libur nasional Indonesia — CRUD manual atau sync sekali-klik dari API publik (upset.dev/tanggalmerah).

**Profil User**
- Halaman Profil (self-service): update Username, Email, Nama Lengkap, NIK, Department, dan data Penanggung Jawab laporan (Nama/NIK/Jabatan).
- Upload foto profil (JPG/PNG/WEBP, maks 1MB) — otomatis di-crop & di-resize ke 300x300 di server.
- Ganti password lewat halaman ini atau dropdown user di header.

**Lain-lain**
- Breadcrumb global di header, mengikuti halaman yang lagi dibuka.
- Nomor versi aplikasi ditampilkan di footer sidebar dan halaman login/register.
- Semua form dengan field wajib diisi ditandai `*` merah + keterangan di bawah judul form.

### Changed
- Field "Nama" di form registrasi diganti jadi "Username"; form registrasi dirapikan jadi 2 kolom.
- Task sekarang punya field terpisah "Tanggal Laporan" (dipakai buat pengelompokan Daily Activity) — beda dari `createdAt` yang gak bisa diubah, field ini bisa di-set bebas termasuk ke tanggal lampau.

### Fixed
- Notifikasi/badge lintas tab browser yang sempat nyasar ke akun lain gara-gara token disimpan di localStorage yang dishare antar tab.
