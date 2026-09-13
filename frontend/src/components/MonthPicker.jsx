import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CalendarBlank, CaretLeft, CaretRight } from "@phosphor-icons/react";
import { useState } from "react";

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

function parseMonthValue(value) {
  if (!value) return null;
  const [year, month] = value.split("-").map(Number);
  return { year, month }; // month 1-indexed
}

// Popover pilih bulan+tahun (bukan tanggal spesifik) — mirip DatePicker tapi
// granularitasnya bulan doang. Dipakai buat filter Periode di Dashboard.
export function MonthPicker({ value, onChange, placeholder = "Pilih bulan", className }) {
  const [open, setOpen] = useState(false);
  const parsed = parseMonthValue(value);
  const [viewYear, setViewYear] = useState(parsed?.year ?? new Date().getFullYear());

  const label = parsed ? `${MONTH_LABELS[parsed.month - 1]} ${parsed.year}` : placeholder;

  function selectMonth(monthIndex) {
    onChange(`${viewYear}-${String(monthIndex + 1).padStart(2, "0")}`);
    setOpen(false);
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setViewYear(parsed?.year ?? new Date().getFullYear());
      }}
    >
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            className={cn(
              "w-full justify-start gap-2 font-normal",
              !parsed && "text-muted-foreground",
              className,
            )}
          />
        }
      >
        <CalendarBlank className="shrink-0" />
        <span className="truncate">{label}</span>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56">
        <div className="flex items-center justify-between pb-2">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => setViewYear((y) => y - 1)}
            aria-label="Tahun sebelumnya"
          >
            <CaretLeft />
          </Button>
          <span className="font-medium">{viewYear}</span>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => setViewYear((y) => y + 1)}
            aria-label="Tahun berikutnya"
          >
            <CaretRight />
          </Button>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {MONTH_LABELS.map((monthLabel, index) => {
            const isSelected = parsed?.year === viewYear && parsed?.month === index + 1;
            return (
              <Button
                key={monthLabel}
                type="button"
                variant={isSelected ? "secondary" : "ghost"}
                size="sm"
                onClick={() => selectMonth(index)}
              >
                {monthLabel}
              </Button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
