import userController from "#controllers/user.controller.js";
import validate from "#middleware/validate.middleware.js";
import { UserFindByIdValidation } from "#validations/user.validation.js";
import { Router } from "express";

const router = Router();

// Sengaja PUBLIK (di-mount di routes/index.js TANPA authenticate) — <img src>
// gak bisa nempelin header Authorization, jadi endpoint yang beneran nyerve
// byte gambarnya harus bisa diakses tanpa token. Upload/hapus foto tetap
// lewat POST/DELETE /users/:id/profile-picture yang digembok autentikasi +
// authorizeSelfOr. Foto profil sendiri bukan data sensitif (setara nama/
// avatar), jadi ini trade-off yang wajar buat kemudahan pakai <img> polos di
// mana-mana.
router.get("/:id", validate(UserFindByIdValidation), userController.getProfilePicture);

export default router;
