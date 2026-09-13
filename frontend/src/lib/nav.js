import { hasPermission } from "@/lib/permissions";
import {
  Briefcase,
  CalendarX,
  ChartBarHorizontal,
  Folder,
  House,
  Kanban as KanbanIcon,
  ListChecks,
  ShieldCheck,
  Tag,
  Users,
} from "@phosphor-icons/react";

// Satu sumber kebenaran buat daftar menu + permission yang ngontrol
// akses-nya — dipakai bareng oleh AppSidebar (render) & App.jsx (route
// guard + penentuan halaman default) biar gak ada kemungkinan dua tempat
// itu ketuker/gak sinkron.
export const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", icon: House, permission: "menu.dashboard" },
  { to: "/tudos", label: "Tudos", icon: ListChecks, permission: "menu.tudos" },
  { to: "/kanban", label: "Kanban", icon: KanbanIcon, permission: "menu.kanban" },
  { to: "/timeline", label: "Timeline", icon: ChartBarHorizontal, permission: "menu.timeline" },
  { to: "/projects", label: "Project", icon: Folder, permission: "menu.projects" },
  {
    to: "/projects/manage",
    label: "Management Project",
    icon: Briefcase,
    permission: "menu.projectsManage",
  },
];

export const ADMIN_NAV_ITEMS = [
  { to: "/users", label: "User Management", icon: Users, permission: "users.view" },
  { to: "/roles", label: "Role & Permission", icon: ShieldCheck, permission: "roles.view" },
  { to: "/categories", label: "Kategori Task", icon: Tag, permission: "categories.manage" },
  { to: "/holidays", label: "Libur Nasional", icon: CalendarX, permission: "holidays.view" },
];

export const ALL_NAV_ITEMS = [...NAV_ITEMS, ...ADMIN_NAV_ITEMS];

// Halaman pertama yang boleh diakses user ini — dipakai buat redirect "/"
// dan buat lempar balik user kalau nyoba buka menu yang gak dia punya
// izinnya. Kalau gak ada satupun menu yang boleh diakses, arahin ke
// "/no-access".
export function getDefaultPath(user) {
  const firstAccessible = ALL_NAV_ITEMS.find((item) => hasPermission(user, item.permission));
  return firstAccessible?.to ?? "/no-access";
}
