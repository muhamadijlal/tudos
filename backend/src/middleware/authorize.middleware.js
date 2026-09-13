import ApiError from "#utils/ApiError.js";

// Harus dipasang setelah `authenticate` supaya req.user (dan req.user.permissions) sudah tersedia.
// Lolos kalau user punya SALAH SATU dari permission yang diminta (OR).
export function can(...permissionKeys) {
  return (req, res, next) => {
    if (!req.user) return next(new ApiError(401, "Unauthorized"));

    const granted = req.user.permissions || [];
    if (!permissionKeys.some((key) => granted.includes(key))) {
      return next(new ApiError(403, "Forbidden: insufficient permissions"));
    }

    next();
  };
}

// Izinkan pemilik resource (req.params.id === req.user.id) atau user dengan permission tertentu.
export function authorizeSelfOr(...permissionKeys) {
  return (req, res, next) => {
    if (!req.user) return next(new ApiError(401, "Unauthorized"));

    const isSelf = Number(req.params.id) === req.user.id;
    const granted = req.user.permissions || [];
    if (isSelf || permissionKeys.some((key) => granted.includes(key))) return next();

    return next(new ApiError(403, "Forbidden: insufficient permissions"));
  };
}

export default can;
