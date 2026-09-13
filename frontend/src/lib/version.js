import pkg from "../../package.json";

// Vite ngedukung import JSON langsung (di-bundle jadi objek biasa) — gampang
// nampilin nomor versi di UI (footer sidebar, halaman login/register) tanpa
// perlu diketik ulang manual & bisa ketinggalan pas package.json di-bump.
export const APP_VERSION = pkg.version;
