// Diekspor — dipakai buat nyusun URL gambar publik (foto profil) yang
// ditampilin langsung lewat <img src>, bukan lewat request() yang otomatis
// nempelin Authorization header.
export const API_URL = import.meta.env.VITE_API_URL;

// Diekspor (bukan cuma dipakai internal) — AuthContext butuh nama key-nya
// buat ndengerin `storage` event, biar tau kalau tab lain ganti sesi/login
// akun lain (localStorage di-share ke semua tab origin yang sama).
export const ACCESS_TOKEN_KEY = "tudos_access_token";
const REFRESH_TOKEN_KEY = "tudos_refresh_token";

export class ApiError extends Error {
  constructor(message, status, errors) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}

export function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setTokens({ accessToken, refreshToken }) {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

// Backend ngirim field path lengkap ("body.password") dan bisa lebih dari satu
// error untuk field yang sama — ratakan jadi { password: "pesan1, pesan2" }
// biar cocok dipakai langsung sebagai key form (mis. fieldErrors.password).
export function normalizeFieldErrors(errors = []) {
  const grouped = {};

  for (const { field, message } of errors) {
    const key = field.includes(".") ? field.split(".").slice(1).join(".") : field;
    (grouped[key] ??= []).push(message);
  }

  return Object.fromEntries(
    Object.entries(grouped).map(([key, messages]) => [key, messages.join(", ")]),
  );
}

// Refresh cuma boleh jalan sekali meski ada beberapa request 401 bersamaan.
let refreshPromise = null;

async function refreshAccessToken() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  if (!refreshPromise) {
    refreshPromise = fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .catch(() => null)
      .finally(() => {
        refreshPromise = null;
      });
  }

  const result = await refreshPromise;
  if (!result?.success) {
    clearTokens();
    return false;
  }

  setTokens(result.data);
  return true;
}

async function request(path, { auth = true, headers, ...options } = {}, isRetry = false) {
  // FormData (upload file): jangan set Content-Type manual, biar browser yang
  // nentuin boundary multipart-nya sendiri.
  const isFormData = options.body instanceof FormData;
  const finalHeaders = isFormData ? { ...headers } : { "Content-Type": "application/json", ...headers };

  if (auth) {
    const token = getAccessToken();
    if (token) finalHeaders.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, { ...options, headers: finalHeaders });

  if (res.status === 401 && auth && !isRetry) {
    const refreshed = await refreshAccessToken();
    if (refreshed) return request(path, { auth, headers, ...options }, true);
  }

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    const fallback = body?.errors?.length ? "Periksa kembali data yang kamu isi" : "Terjadi kesalahan";
    throw new ApiError(body?.message || fallback, res.status, body?.errors);
  }

  return body;
}

function toBody(data) {
  return data instanceof FormData ? data : JSON.stringify(data);
}

export const api = {
  get: (path, options) => request(path, options),
  post: (path, data, options) =>
    request(path, { method: "POST", body: toBody(data), ...options }),
  put: (path, data, options) =>
    request(path, { method: "PUT", body: toBody(data), ...options }),
  patch: (path, data, options) =>
    request(path, { method: "PATCH", body: toBody(data), ...options }),
  delete: (path, options) => request(path, { method: "DELETE", ...options }),
};

// Buat file (bukan JSON) yang butuh auth, mis. lampiran task — dipakai buat
// nge-preview atau download-nya lewat blob URL.
export async function fetchFileBlob(path) {
  const token = getAccessToken();
  const res = await fetch(`${API_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!res.ok) {
    throw new ApiError("Gagal memuat file", res.status);
  }

  return res.blob();
}
