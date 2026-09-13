import {
  ACCESS_TOKEN_KEY,
  api,
  clearTokens,
  getAccessToken,
  getRefreshToken,
  setTokens,
} from "@/lib/api";
import { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      if (!getAccessToken()) {
        setIsLoading(false);
        return;
      }

      try {
        const res = await api.get("/auth/me");
        setUser(res.data);
      } catch {
        clearTokens();
      } finally {
        setIsLoading(false);
      }
    }

    loadUser();
  }, []);

  // Token disimpen di localStorage, yang di-share ke SEMUA tab origin yang
  // sama — kalau tab lain login akun beda (atau logout), token di sini diam-
  // diam ketimpa, tapi state React di tab ini (user, NotificationBell, dll)
  // tetep nunjukin sesi lama sampe ada request baru yang tau-tau makai token
  // baru itu (bug: notifikasi/badge nyasar ke user yang salah). `storage`
  // event cuma nyala di tab LAIN (bukan tab yang bikin perubahannya sendiri)
  // — begitu kedetek, reload penuh biar semua state ke-refresh bersih pakai
  // token yang lagi aktif sekarang.
  useEffect(() => {
    function handleStorageChange(event) {
      if (event.key === ACCESS_TOKEN_KEY) {
        window.location.reload();
      }
    }

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  async function login(email, password) {
    const res = await api.post("/auth/login", { email, password }, { auth: false });
    setTokens(res.data);
    setUser(res.data.user);
    return res.data.user;
  }

  async function register(payload) {
    const res = await api.post("/auth/register", payload, { auth: false });
    return res.data;
  }

  // Dipakai abis PUT /users/:id (misalnya popup export Daily Activity nyimpen
  // fullName/nik/unit/supervisor*) biar `user` di context ke-update tanpa
  // perlu reload/re-fetch /auth/me.
  function updateUser(patch) {
    setUser((prev) => (prev ? { ...prev, ...patch } : prev));
  }

  async function logout() {
    const refreshToken = getRefreshToken();
    try {
      if (refreshToken) await api.post("/auth/logout", { refreshToken }, { auth: false });
    } catch {
      // token mungkin sudah invalid/kadaluarsa — tetap lanjut hapus sesi lokal
    } finally {
      clearTokens();
      setUser(null);
    }
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
