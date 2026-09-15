import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useTheme } from "@/context/ThemeContext";
import { cn } from "@/lib/utils";
import { Check, Palette } from "@phosphor-icons/react";

export function ThemePresetPicker() {
  const { preset, setPreset, presets } = useTheme();

  return (
    <Popover>
      <PopoverTrigger
        aria-label="Ganti preset warna"
        render={<Button variant="outline" size="icon-sm" />}
      >
        <Palette size={14} />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56 p-2">
        <p className="px-1 pb-2 text-xs font-medium text-muted-foreground">Preset Warna</p>
        <div className="grid grid-cols-4 gap-1.5">
          {presets.map((p) => (
            <button
              key={p.id}
              type="button"
              title={p.label}
              onClick={() => setPreset(p.id)}
              className={cn(
                "relative flex flex-col items-center gap-1 rounded-none border border-border p-1.5 text-[10px] hover:bg-muted",
                preset === p.id && "border-ring bg-muted",
              )}
            >
              <span
                className="flex size-5 items-center justify-center rounded-full"
                style={{ backgroundColor: p.swatch }}
              >
                {preset === p.id && (
                  <Check size={11} weight="bold" className="text-white mix-blend-difference" />
                )}
              </span>
              <span className="truncate">{p.label}</span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
