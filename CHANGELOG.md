# Changelog

Semua perubahan penting pada Tudos dicatat di file ini.

## [2.0.0-beta.7] - 2026-09-14

### Fixed
- Scroll horizontal di Timeline (wheel biasa) sekarang gak lempar error "Unable to preventDefault inside passive event listener invocation" — listener wheel-nya dipasang manual (bukan lewat prop `onWheel` React yang passive by default).

## [2.0.0-beta.6] - 2026-09-14

### Added
- Level zoom Minggu/Bulan/Kuartal di Timeline (ala Jira) — ganti lebar kolom per hari & rentang tanggal yang ditampilin, gak nyentuh cara bar/tanggal di-render.

### Changed
- Transisi status Todo -> In Review sekarang wajib catatan review juga (sebelumnya cuma In Progress -> In Review yang wajib) — konsisten di kedua arah dari/ke In Review.
- Popup export Daily Activity di-skip otomatis (langsung download) kalau profil user (identitas + Penanggung Jawab) udah lengkap.
- Task di Timeline sekarang selalu tampil sebagai baris walau tanggalnya di luar periode 28 hari yang lagi ditampilin (bar-nya aja yang gak digambar) — sama kayak perilaku Epic.
- Timeline sekarang default expand semua Project & Epic pas dibuka (sebelumnya collapsed semua, harus klik satu-satu).
- Field Owner di form Epic sekarang nampilin foto profil + nama profil (fullName), bukan cuma nama akun.
- Form create/edit Epic dan tombol "Epic Baru" dihapus dari halaman Detail Project — epic sekarang cuma dikelola lewat halaman Management Epic (list Epic & tombol Hapus tetap ada).
- Filter Assignee di Kanban sekarang ngikutin pola yang sama kayak Tudos: dikunci ke diri sendiri (disabled) buat role yang gak punya `tasks.viewAll`.
- Filter di Dashboard sekarang ngisi lebar penuh card (sebelumnya field-nya kecil nge-cluster di kiri, nyisain banyak ruang kosong di layar lebar).

### Fixed
- Grid Timeline (garis background weekend/hari-ini) gak sejajar lagi sama baris label pas di-scroll jauh ke bawah — konstanta tinggi baris yang kepake di kolom label & grid disamain lagi.
- Grid Timeline sekarang tetap muncul (gak blank/0-tinggi) walau belum ada project sama sekali.
- Kolom tanggal Timeline gak lagi bisa scroll vertikal sendirian, terpisah dari kolom project — sekarang scroll bareng dalam 1 kontainer.
- Heatmap "Aktivitas 1 Tahun Terakhir" di Dashboard sekarang gak motong ~1 minggu terakhir termasuk hari ini — task yang dibuat hari ini sekarang muncul di grid.

## [2.0.0-beta.5] - 2026-09-14

### Changed
- Role selain Admin sekarang gak bisa assign task ke user dengan role Admin sama sekali — dicek di server (`task.service.js`, berlaku juga buat owner project/pemegang `tasks.assignOthers`) dan user Admin juga otomatis gak muncul di daftar assignee (`GET /users/assignable`) buat requester non-Admin.
- Semua modal (dialog & alert-dialog) sekarang dibatasin tinggi maksimalnya ke layar (`max-h-[calc(100%-2rem)]`) dan bisa di-scroll kalau isinya kepanjangan — sebelumnya modal yang kontennya banyak bisa meluber keluar layar tanpa cara buat lihat sisanya.

## [2.0.0-beta.4] - 2026-09-14

### Changed
- Field Owner di form Epic (Management Epic) sekarang cuma bisa diisi bebas oleh role Admin — role lain otomatis terkunci ke diri sendiri sebagai owner (gak ada pilihan lain), baik di form maupun dicek ulang di server. Permission baru `epics.assignOwner`, otomatis cuma dikasih ke role Admin (role lain bisa di-toggle manual di Role Management kalau memang perlu).
- Title tab browser sekarang diambil dari env `VITE_APP_NAME` (default "Tudos"), gak lagi hardcode "frontend" di `index.html`.

## [2.0.0-beta.3] - 2026-09-14

### Added
- `GET /` di backend sekarang balikin info status ("Tudos API is running" + nama/versi/waktu) — biar gampang ngecek backend-nya beneran nyala & bisa diakses.

### Fixed
- Error `The column projects.code does not exist` pas buka Dashboard — sisa kode mati dari sebelum migrasi Epic (`utils/projectCode.js` dan script `backfill_project_task_codes.js`, keduanya masih query kolom `Project.code` yang udah dihapus) dihapus total.

## [2.0.0-beta.2] - 2026-09-14

### Fixed
- Bar Epic di Timeline kadang nyangkut di kolom paling kiri walau udah digeser ke periode yang gak overlap sama rentang tanggal Epic-nya — sekarang bar cuma digambar kalau beneran overlap sama periode yang lagi ditampilin.
- Grid (garis background weekend/hari-ini) di Timeline sekarang selalu ngisi sampe bawah panel, gak berhenti pas-pasan ngikutin jumlah baris doang.
- Baris paling bawah di Timeline (kalau project/epic-nya punya banyak task sampai perlu di-scroll) sempet ke-clip total (grid & bar-nya gak digambar sama sekali) — direstruktur jadi 1 kontainer scroll (bukan 2 bersarang) buat ngilangin bug ini.
- Scrollbar horizontal panel grid Timeline disembunyiin (tetap bisa di-scroll pakai mouse wheel biasa).

## [2.0.0-beta.1] - 2026-09-14

### Changed (breaking)
- Hierarki data berubah dari Project -> Task jadi **Project -> Epic -> Task**. Epic adalah entitas wajib baru: setiap task sekarang harus punya Epic (bukan nempel langsung ke Project lagi), dengan nama, deskripsi, due date, owner/lead opsional, dan progress bar otomatis (dihitung dari persentase task selesai).
- Kode task berubah format dari `PROJECTCODE-N` jadi `EPICCODE-N` (mis. `BAC-1`) — kode & counter yang tadinya nempel di Project sekarang dipindah ke Epic. Project sendiri gak lagi punya kode.
- Data lama otomatis dimigrasikan: tiap project existing dapet 1 Epic default bernama "General" yang mewarisi kode & counter project-nya, semua task lama dipindah ke situ — kode task lama gak berubah.
- Project gak lagi punya field Tanggal Mulai/Due Date sendiri — Project sekarang murni container tanpa batas waktu, due date-nya sekarang di level Epic (tiap fitur/epic punya target selesai sendiri-sendiri).

### Added
- Section "Epics" di halaman detail Project — bikin/ubah/hapus Epic (cuma pemilik project), lihat progress tiap Epic.
- Halaman detail Epic baru — daftar task terkait, link cepat ke Tudos yang udah difilter ke Epic itu.
- Filter Epic baru di Kanban dan Tudos, cascading dari filter Project yang udah ada.
- Timeline sekarang 3 level (Project -> Epic -> Task) — baris Project & Epic tetap tampil sebagai baris grup meski gak punya tanggal.
- Epic sekarang punya warna sendiri (di-assign otomatis, bisa diganti manual) — tampil sebagai chip berwarna di kartu Kanban dan kolom Epic di Tudos, biar gampang bedain task dari epic mana secara visual sekilas (ala label Epic di Jira).
- Halaman baru **Management Epic** — list flat semua epic lintas project (filter Project & kepemilikan, pencarian, export), buat/ubah/hapus epic dari satu tempat tanpa harus masuk ke tiap halaman detail project. Permission baru `menu.epicsManage` (otomatis kebuka buat role yang udah punya `menu.projectsManage`).
- Epic sekarang punya `Tanggal Mulai` juga (ala Jira), gak cuma Due Date — jadi beneran punya rentang tanggal, bukan cuma 1 titik. Sama kayak Jira, gak ada validasi yang ngunci tanggal task-nya harus masuk rentang Epic itu — cuma buat perencanaan tingkat tinggi.

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
