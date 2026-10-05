const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/AppError");
const authService = require("../services/auth.service");
const auditoriaService = require("../services/auditoria.service");

const REFRESH_COOKIE = "metryco_refresh";
const isProd = process.env.NODE_ENV === "production";

const login = asyncHandler(async (req, res) => {
  const { usuario, password } = req.body;
  if (!usuario || !password) {
    throw new AppError("Usuario y contraseña son obligatorios", 400);
  }

  let resultado;
  try {
    resultado = await authService.login(usuario, password);
  } catch (err) {
    auditoriaService.registrar({
      accion: "login_fallido", usuarioIntentado: usuario, exito: false, ip: req.ip,
    });
    throw err;
  }

  const { accessToken, refreshToken, user } = resultado;

  auditoriaService.registrar({
    accion: "login_exitoso",
    reqUser: { id: user.id, usuario: user.usuario, rol: user.rol },
    ip: req.ip,
  });

  res.cookie(REFRESH_COOKIE, refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.json({ success: true, data: { token: accessToken, user } });
});

const refresh = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies?.[REFRESH_COOKIE];
  const { accessToken } = await authService.refrescarToken(refreshToken);
  res.json({ success: true, data: { token: accessToken } });
});

const logout = asyncHandler(async (req, res) => {
  res.clearCookie(REFRESH_COOKIE);
  res.json({ success: true });
});

const verificarAdmin = asyncHandler(async (req, res) => {
  await authService.verificarPasswordAdmin(req.body.password);
  res.json({ success: true });
});

module.exports = { login, refresh, logout, verificarAdmin };
