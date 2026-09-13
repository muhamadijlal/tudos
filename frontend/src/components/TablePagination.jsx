import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CaretLeft, CaretRight } from "@phosphor-icons/react";

export const PAGE_SIZE_OPTIONS = [5, 10, 20, 50, 100];
export const DEFAULT_PAGE_SIZE = 10;

// Footer pagination generik dipakai di semua tabel data (page 1-indexed) —
// baik yang state-nya dipegang @tanstack/react-table maupun yang cuma
// di-slice manual dari array biasa, keduanya tinggal oper page/pageSize.
export function TablePagination({
  page,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  itemLabel = "item",
}) {
  const pageCount = Math.max(Math.ceil(totalItems / pageSize), 1);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-3">
      <div className="flex items-center gap-2 text-muted-foreground">
        <span>Baris per halaman</span>
        <Select value={String(pageSize)} onValueChange={(v) => onPageSizeChange(Number(v))}>
          <SelectTrigger size="sm" className="w-16">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAGE_SIZE_OPTIONS.map((size) => (
              <SelectItem key={size} value={String(size)}>
                {size}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-3 text-muted-foreground">
        <p>
          Halaman {page} dari {pageCount} — {totalItems} {itemLabel}
        </p>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            aria-label="Halaman sebelumnya"
          >
            <CaretLeft />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            disabled={page >= pageCount}
            onClick={() => onPageChange(page + 1)}
            aria-label="Halaman berikutnya"
          >
            <CaretRight />
          </Button>
        </div>
      </div>
    </div>
  );
}
