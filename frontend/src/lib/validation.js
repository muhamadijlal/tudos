const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NIK_REGEX = /^\d{5,8}$/;

export function validateRequired(value, label) {
  if (!value || !value.trim()) return `${label} wajib diisi`;
  return null;
}

export function validateEmail(email) {
  if (!email) return "Email wajib diisi";
  if (!EMAIL_REGEX.test(email)) return "Format email tidak valid";
  return null;
}

// Aturan sama seperti backend (src/validations/auth.validation.js).
export function validatePassword(password) {
  if (!password) return "Password wajib diisi";
  if (password.length < 8) return "Min password 8 character";
  if (!/[A-Z]/.test(password)) return "Password must contain at least one uppercase letter";
  if (!/[a-z]/.test(password)) return "Password must contain at least one lowercase letter";
  if (!/[0-9]/.test(password)) return "Password must contain at least one number";
  if (!/[^A-Za-z0-9]/.test(password))
    return "Password must contain at least one special character";
  return null;
}

// Sama seperti backend (src/validations/auth.validation.js#nikSchema) —
// dipakai buat NIK user sendiri maupun NIK penanggung jawab.
export function validateNik(nik) {
  if (!nik) return "NIK wajib diisi";
  if (!NIK_REGEX.test(nik)) return "NIK harus berupa angka, 5-8 digit";
  return null;
}

// Kumpulkan hasil { field: message } dari objek validator, buang field yang lolos (null).
export function collectErrors(validators) {
  return Object.fromEntries(
    Object.entries(validators)
      .map(([field, message]) => [field, message])
      .filter(([, message]) => message),
  );
}
