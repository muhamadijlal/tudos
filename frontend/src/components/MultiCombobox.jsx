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

// Combobox tapi bisa milih lebih dari satu opsi sekaligus (mis. quick filter
// board Kanban ala Jira: pilih beberapa project/assignee/kategori bareng).
// Popover-nya sengaja gak nutup pas milih, biar bisa centang beberapa opsi
// berturut-turut.
export function MultiCombobox({
  options,
  values,
  onValuesChange,
  placeholder = "Semua",
  searchPlaceholder = "Cari...",
  emptyText = "Tidak ada hasil.",
  disabled = false,
  size = "default",
  className,
  contentClassName,
  // Opsional: render custom buat tiap baris opsi / label opsi yang lagi
  // kepilih (mis. avatar assignee). Default-nya cuma nampilin label teks biasa.
  renderOption,
  renderValue,
}) {
  const [open, setOpen] = useState(false);
  const selected = options.filter((o) => values.includes(String(o.value)));

  function toggle(value) {
    const key = String(value);
    onValuesChange(
      values.includes(key) ? values.filter((v) => v !== key) : [...values, key],
    );
  }

  const label =
    selected.length === 0
      ? placeholder
      : selected.length === 1
        ? renderValue
          ? renderValue(selected[0])
          : selected[0].label
        : `${selected.length} dipilih`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size={size}
            disabled={disabled}
            className={cn(
              "w-full justify-between gap-1.5 font-normal",
              selected.length === 0 && "text-muted-foreground",
              className,
            )}
          />
        }
      >
        <span className="min-w-0 flex-1 truncate text-left">{label}</span>
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
                  data-checked={values.includes(String(option.value))}
                  onSelect={() => toggle(option.value)}
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
