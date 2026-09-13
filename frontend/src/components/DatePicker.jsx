import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CalendarBlank } from "@phosphor-icons/react";

// yyyy-mm-dd (string form yang dipakai body request) <-> Date lokal.
// Sengaja pakai getter lokal (bukan toISOString) biar gak geser tanggal
// akibat konversi ke UTC.
export function parseDateStr(value) {
  if (!value) return undefined;
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function formatDateStr(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function DatePicker({ value, onChange, placeholder = "Pilih tanggal", className, ...props }) {
  const selected = parseDateStr(value);

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            className={cn(
              "w-full justify-start gap-2 font-normal",
              !selected && "text-muted-foreground",
              className,
            )}
          />
        }
        {...props}
      >
        <CalendarBlank />
        {selected
          ? selected.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })
          : placeholder}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(date) => date && onChange(formatDateStr(date))}
        />
      </PopoverContent>
    </Popover>
  );
}
