import { DEFAULT_PAGE_SIZE } from "@/components/TablePagination";
import { useMemo, useState } from "react";

// Dipakai buat tabel yang render array biasa (bukan @tanstack/react-table) —
// TudosPage sendiri pakai getPaginationRowModel dari tanstack, jadi ini
// khusus buat halaman management yang masih .map() langsung ke TableBody.
export function usePagination(items, initialPageSize = DEFAULT_PAGE_SIZE) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(initialPageSize);

  // Kalau hasil filter/reload bikin halaman sekarang jadi kosong (mis. lagi
  // di halaman 3 terus datanya tinggal 1 halaman), turunin ke halaman
  // terakhir yang valid — dihitung pas render, gak perlu effect terpisah.
  const pageCount = Math.max(Math.ceil(items.length / pageSize), 1);
  const safePage = Math.min(page, pageCount);

  const pageItems = useMemo(
    () => items.slice((safePage - 1) * pageSize, safePage * pageSize),
    [items, safePage, pageSize],
  );

  function setPageSize(size) {
    setPageSizeState(size);
    setPage(1);
  }

  return { page: safePage, pageSize, pageItems, setPage, setPageSize };
}
