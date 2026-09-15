import { formatDateStr, parseDateStr } from "@/components/DatePicker";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CalendarBlank } from "@phosphor-icons/react";

function formatShort(date) {
  return date.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

export function DateRangePicker({
  from,
  to,
  onChange,
  placeholder = "Pilih rentang tanggal",
  className,
}) {
  const range = { from: parseDateStr(from), to: parseDateStr(to) };

  let label = placeholder;
  if (range.from && range.to) {
    label = `${formatShort(range.from)} - ${formatShort(range.to)}`;
  } else if (range.from) {
    label = formatShort(range.from);
  }

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            className={cn(
              "w-full justify-start gap-2 font-normal",
              !range.from && "text-muted-foreground",
              className,
            )}
          />
        }
      >
        <CalendarBlank />
        {label}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="range"
          required
          numberOfMonths={2}
          selected={range}
          onSelect={(next) =>
            onChange({
              from: next?.from ? formatDateStr(next.from) : "",
              to: next?.to ? formatDateStr(next.to) : "",
            })
          }
        />
        {/* Kalender "required" gak bisa di-clear lewat klik biasa — ini
            satu-satunya jalan keluar dari rentang tanggal ke "semua tanggal"
            tanpa harus nge-reset filter lain lewat tombol "Reset Filter". */}
        <div className="border-t p-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full"
            onClick={() => onChange({ from: "", to: "" })}
          >
            Semua Tanggal
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
