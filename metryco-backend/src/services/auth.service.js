const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Usuario = require("../models/Usuario");
const AppError = require("../utils/AppError");
const { jwt: jwtConfig } = require("../config/env");

function firmarTokens(usuario) {
  const payload = { id: usuario._id.toString(), usuario: usuario.usuario, rol: usuario.rol };

  const accessToken = jwt.sign(payload, jwtConfig.secret, { expiresIn: jwtConfig.expiresIn });
  const refreshToken = jwt.sign(payload, jwtConfig.refreshSecret, {
    expiresIn: jwtConfig.refreshExpiresIn,
  });

  return { accessToken, refreshToken };
}

async function login(usuarioInput, password) {
  const usuario = await Usuario.findOne({
    usuario: String(usuarioInput).toLowerCase(),
    status: "activo",
  }).select("+passwordHash");

  if (!usuario) throw new AppError("Usuario o contraseña incorrectos", 401);

  const passwordOk = await bcrypt.compare(password, usuario.passwordHash);
  if (!passwordOk) throw new AppError("Usuario o contraseña incorrectos", 401);

  const { accessToken, refreshToken } = firmarTokens(usuario);

  return {
    accessToken,
    refreshToken,
    user: {
      id: usuario._id,
      nombre: usuario.nombre,
      usuario: usuario.usuario,
      email: usuario.email,
      rol: usuario.rol,
      sucursal: usuario.sucursal,
    },
  };
}

async function refrescarToken(refreshToken) {
  if (!refreshToken) throw new AppError("No autenticado", 401);

  let payload;
  try {
    payload = jwt.verify(refreshToken, jwtConfig.refreshSecret);
  } catch {
    throw new AppError("Sesión expirada, inicia sesión de nuevo", 401);
  }

  const usuario = await Usuario.findById(payload.id);
  if (!usuario || usuario.status !== "activo") {
    throw new AppError("Sesión expirada, inicia sesión de nuevo", 401);
  }

  const { accessToken } = firmarTokens(usuario);
  return { accessToken };
}

async function verificarPasswordAdmin(password) {
  if (!password) throw new AppError("La contraseña es obligatoria", 400);

  const admins = await Usuario.find({ rol: "admin", status: "activo" }).select("+passwordHash");
  for (const admin of admins) {
    if (await bcrypt.compare(password, admin.passwordHash)) return true;
  }
  throw new AppError("Contraseña de administrador incorrecta", 401);
}

module.exports = { login, refrescarToken, verificarPasswordAdmin };
