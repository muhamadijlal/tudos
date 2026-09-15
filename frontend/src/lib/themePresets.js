// Daftar preset warna ala theme customizer shadcn/ui (ui.shadcn.com/themes) —
// variabel CSS tiap preset didefinisikan di index.css lewat selector
// [data-theme-preset="<id>"], file ini cuma metadata buat nampilin
// pickernya (label + warna swatch buat tombolnya).
//
// "default" = tema violet Tudos yang udah ada dari awal (gak ada override,
// pakai :root/.dark biasa) — makanya gak butuh entry CSS preset sendiri.
export const DEFAULT_PRESET_ID = "default";

export const THEME_PRESETS = [
  { id: "default", label: "Default", swatch: "oklch(0.496 0.265 301.924)" },
  { id: "zinc", label: "Zinc", swatch: "oklch(0.21 0.006 285.885)" },
  { id: "slate", label: "Slate", swatch: "oklch(0.208 0.042 265.755)" },
  { id: "stone", label: "Stone", swatch: "oklch(0.216 0.006 56.043)" },
  { id: "gray", label: "Gray", swatch: "oklch(0.21 0.034 264.665)" },
  { id: "neutral", label: "Neutral", swatch: "oklch(0.205 0 0)" },
  { id: "red", label: "Red", swatch: "oklch(0.577 0.245 27.325)" },
  { id: "orange", label: "Orange", swatch: "oklch(0.646 0.222 41.116)" },
  { id: "yellow", label: "Yellow", swatch: "oklch(0.666 0.179 58.318)" },
  { id: "green", label: "Green", swatch: "oklch(0.627 0.194 149.214)" },
  { id: "blue", label: "Blue", swatch: "oklch(0.546 0.245 262.881)" },
  { id: "rose", label: "Rose", swatch: "oklch(0.586 0.253 17.585)" },
];
