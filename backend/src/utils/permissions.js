// Katalog permission — single source of truth buat seed migration RBAC
// (prisma/migrations/20260912100000_add_rbac_roles,
// prisma/migrations/20260912120000_add_menu_permissions) dan validasi
// role.validation.js. Nambah/ubah key di sini HARUS disinkronkan manual ke
// migration SQL tsb.
export const PERMISSIONS = [
  // Akses menu — masing-masing ngontrol boleh/gaknya suatu role buka
  // halaman itu (bukan cuma menu administrasi, semua menu diatur di sini).
  { key: "menu.dashboard", group: "Menu", label: "Akses menu Dashboard" },
  { key: "menu.tudos", group: "Menu", label: "Akses menu Tudos" },
  { key: "menu.kanban", group: "Menu", label: "Akses menu Kanban" },
  { key: "menu.timeline", group: "Menu", label: "Akses menu Timeline" },
  { key: "menu.projects", group: "Menu", label: "Akses menu Project" },
  { key: "menu.projectsManage", group: "Menu", label: "Akses menu Management Project" },
  { key: "menu.epicsManage", group: "Menu", label: "Akses menu Management Epic" },
  { key: "users.view", group: "Users", label: "Lihat daftar user" },
  { key: "users.update", group: "Users", label: "Edit data user lain" },
  { key: "users.delete", group: "Users", label: "Hapus user" },
  { key: "users.assignRole", group: "Users", label: "Ubah role user" },
  { key: "roles.view", group: "Roles", label: "Lihat role & permission" },
  { key: "roles.manage", group: "Roles", label: "Buat/ubah/hapus role" },
  { key: "categories.manage", group: "Categories", label: "Kelola kategori task" },
  { key: "holidays.view", group: "Holidays", label: "Lihat kalender libur nasional" },
  {
    key: "holidays.manage",
    group: "Holidays",
    label: "Kelola kalender libur nasional (buat/ubah/hapus/sync)",
  },
  {
    key: "projects.viewAll",
    group: "Projects",
    label: "Lihat semua project (bukan cuma yang ada task miliknya)",
  },
  { key: "tasks.viewAll", group: "Tasks", label: "Lihat semua task (bukan cuma miliknya)" },
  { key: "tasks.assignOthers", group: "Tasks", label: "Assign task ke user lain" },
];

export const PERMISSION_KEYS = PERMISSIONS.map((p) => p.key);
