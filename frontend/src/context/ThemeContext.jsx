import { DEFAULT_PRESET_ID, THEME_PRESETS } from "@/lib/themePresets";
import { createContext, useContext, useEffect, useState } from "react";

const STORAGE_KEY = "tudos_theme";
const PRESET_STORAGE_KEY = "tudos_theme_preset";
const ThemeContext = createContext(null);

function getStoredTheme() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === "light" || stored === "dark" ? stored : "system";
  } catch {
    return "system";
  }
}

function getStoredPreset() {
  try {
    const stored = localStorage.getItem(PRESET_STORAGE_KEY);
    return THEME_PRESETS.some((p) => p.id === stored) ? stored : DEFAULT_PRESET_ID;
  } catch {
    return DEFAULT_PRESET_ID;
  }
}

function prefersDark() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function resolve(theme) {
  return theme === "dark" || (theme === "system" && prefersDark()) ? "dark" : "light";
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(getStoredTheme);
  // Tema yang benar-benar tampil di layar ("light"/"dark") — beda dari `theme`
  // yang bisa juga "system" (preferensi, bukan hasil akhirnya).
  const [resolvedTheme, setResolvedTheme] = useState(() => resolve(theme));
  // Preset warna (palet shadcn) — independen dari light/dark, disimpen terpisah.
  const [preset, setPresetState] = useState(getStoredPreset);

  // Terapkan class .dark ke <html> tiap kali theme berubah, dan ikuti perubahan
  // preferensi sistem secara live selama mode "system" masih aktif.
  useEffect(() => {
    const root = document.documentElement;
    const media = window.matchMedia("(prefers-color-scheme: dark)");

    function applyResolvedTheme() {
      const next = resolve(theme);
      root.classList.toggle("dark", next === "dark");
      setResolvedTheme(next);
    }

    applyResolvedTheme();

    if (theme !== "system") return;

    media.addEventListener("change", applyResolvedTheme);
    return () => media.removeEventListener("change", applyResolvedTheme);
  }, [theme]);

  // Preset warna diterapkan lewat atribut data-theme-preset di <html> —
  // variabel warnanya sendiri didefinisikan di index.css per preset id.
  useEffect(() => {
    document.documentElement.setAttribute("data-theme-preset", preset);
  }, [preset]);

  function setTheme(next) {
    setThemeState(next);
    try {
      if (next === "system") localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // localStorage bisa diblokir (mis. private mode) — tema tetap jalan, cuma gak ke-persist
    }
  }

  function setPreset(next) {
    setPresetState(next);
    try {
      if (next === DEFAULT_PRESET_ID) localStorage.removeItem(PRESET_STORAGE_KEY);
      else localStorage.setItem(PRESET_STORAGE_KEY, next);
    } catch {
      // localStorage bisa diblokir (mis. private mode) — preset tetap jalan, cuma gak ke-persist
    }
  }

  return (
    <ThemeContext.Provider
      value={{ theme, resolvedTheme, setTheme, preset, setPreset, presets: THEME_PRESETS }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
