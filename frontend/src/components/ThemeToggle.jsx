import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useTheme } from "@/context/ThemeContext";
import { cn } from "@/lib/utils";
import { Check, Monitor, Moon, Sun } from "@phosphor-icons/react";

const OPTIONS = [
  { value: "light", label: "Terang", icon: Sun },
  { value: "dark", label: "Gelap", icon: Moon },
  { value: "system", label: "Sistem", icon: Monitor },
];

export function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const TriggerIcon = resolvedTheme === "dark" ? Moon : Sun;

  return (
    <Popover>
      <PopoverTrigger
        aria-label="Ganti tema"
        render={<Button variant="outline" size="icon-sm" />}
      >
        <TriggerIcon size={14} />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-36 p-1">
        {OPTIONS.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            type="button"
            onClick={() => setTheme(value)}
            className={cn(
              "flex w-full items-center justify-between gap-2 px-2 py-1.5 text-left text-xs hover:bg-muted",
              theme === value && "bg-muted",
            )}
          >
            <span className="flex items-center gap-2">
              <Icon size={14} />
              {label}
            </span>
            {theme === value && <Check size={12} />}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}
