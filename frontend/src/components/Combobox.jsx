import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CaretDown } from "@phosphor-icons/react";
import { useState } from "react";

// Select biasa tapi bisa diketik buat nyari opsinya — dipakai gantiin
// <Select> di seluruh app tempat pilihannya bisa banyak (project, kategori,
// assignee, dll).
export function Combobox({
  options,
  value,
  onValueChange,
  placeholder = "Pilih...",
  searchPlaceholder = "Cari...",
  emptyText = "Tidak ada hasil.",
  disabled = false,
  size = "default",
  className,
  contentClassName,
  ariaInvalid,
  // Opsional: render custom buat isi trigger / tiap baris opsi (mis. avatar
  // assignee). Default-nya cuma nampilin label teks biasa.
  renderValue,
  renderOption,
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => String(o.value) === String(value));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size={size}
            disabled={disabled}
            aria-invalid={ariaInvalid}
            className={cn(
              "w-full justify-between gap-1.5 font-normal",
              !selected && "text-muted-foreground",
              className,
            )}
          />
        }
      >
        <span className="flex min-w-0 flex-1 items-center gap-1.5 truncate">
          {selected ? (renderValue ? renderValue(selected) : selected.label) : placeholder}
        </span>
        <CaretDown className="size-3.5 shrink-0 opacity-50" />
      </PopoverTrigger>
      <PopoverContent align="start" className={cn("w-(--anchor-width) p-0", contentClassName)}>
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.label}
                  data-checked={String(option.value) === String(value)}
                  onSelect={() => {
                    onValueChange(option.value);
                    setOpen(false);
                  }}
                >
                  {renderOption ? renderOption(option) : option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
