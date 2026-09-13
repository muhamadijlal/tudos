import { ALL_NAV_ITEMS } from "@/lib/nav";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";

const BreadcrumbContext = createContext(null);

// Breadcrumb default: cuma 1 level, nama menu-nya doang dari nav.js — cukup
// buat halaman menu utama. Halaman yang bukan menu (detail project, catatan,
// dst) gak ke-cover di sini (pathname-nya gak match nav.js persis, karena
// ada :id/:noteId) — mereka nimpa sendiri lewat useBreadcrumb().
function defaultItemsFor(pathname) {
  const navItem = ALL_NAV_ITEMS.find((item) => item.to === pathname);
  return navItem ? [{ label: navItem.label }] : [];
}

// Dipasang sekali di AppLayout, ngebungkus header (yang nampilin breadcrumb)
// & <Outlet/> (halaman yang bisa nimpa breadcrumb-nya).
export function BreadcrumbProvider({ children }) {
  const location = useLocation();
  const [items, setItems] = useState(() => defaultItemsFor(location.pathname));

  // Reset ke default nav.js tiap pindah halaman. Kalau halaman yang baru
  // dibuka manggil useBreadcrumb(), efeknya jalan setelah ini (mount
  // parent -> child), jadi override-nya gak ketiban reset ini.
  useEffect(() => {
    setItems(defaultItemsFor(location.pathname));
  }, [location.pathname]);

  const value = useMemo(() => ({ items, setItems }), [items]);

  return <BreadcrumbContext.Provider value={value}>{children}</BreadcrumbContext.Provider>;
}

export function useBreadcrumbItems() {
  return useContext(BreadcrumbContext).items;
}

// Dipanggil dari halaman non-menu yang butuh breadcrumb custom/dinamis,
// misal detail project: [{label:"Project", to:"/projects"}, {label: nama}].
// Key di-serialize dulu (bukan `items` mentah) soalnya array literal baru
// kebentuk tiap render — kalau dipakai langsung sebagai dep, efeknya bakal
// looping terus.
export function useBreadcrumb(items) {
  const ctx = useContext(BreadcrumbContext);
  const key = JSON.stringify(items);
  useEffect(() => {
    ctx.setItems(items);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}
