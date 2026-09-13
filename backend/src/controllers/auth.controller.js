import { userResource } from "#resources/user.resource.js";
import * as authService from "#services/auth.service.js";

const register = async (req, res, next) => {
  try {
    const user = await authService.register(req.body);

    return res.status(201).json({
      success: true,
      data: userResource(user),
      message: "Register berhasil",
    });
  } catch (err) {
    next(err);
  }
};

const login = async (req, res, next) => {
  try {
    const { accessToken, refreshToken, user } = await authService.login(
      req.body.email,
      req.body.password,
    );

    return res.status(200).json({
      success: true,
      data: { accessToken, refreshToken, user: userResource(user) },
      message: "Login berhasil",
    });
  } catch (err) {
    next(err);
  }
};

const refresh = async (req, res, next) => {
  try {
    const { accessToken, refreshToken } = await authService.refreshAccessToken(
      req.body.refreshToken,
    );

    return res.status(200).json({
      success: true,
      data: { accessToken, refreshToken },
      message: "Token berhasil diperbarui",
    });
  } catch (err) {
    next(err);
  }
};

const logout = async (req, res, next) => {
  try {
    await authService.logout(req.body.refreshToken);

    return res.status(200).json({
      success: true,
      message: "Logout berhasil",
    });
  } catch (err) {
    next(err);
  }
};

const me = async (req, res, next) => {
  try {
    res.status(200).json({ success: true, data: req.user });
  } catch (err) {
    next(err);
  }
};

export { login, logout, me, refresh, register };
