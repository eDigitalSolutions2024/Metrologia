const jwt = require("jsonwebtoken");
const AppError = require("../utils/AppError");
const { jwt: jwtConfig } = require("../config/env");

function auth(req, _res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return next(new AppError("No autenticado", 401));
  }

  try {
    const payload = jwt.verify(token, jwtConfig.secret);
    req.user = payload; // { id, usuario, rol }
    next();
  } catch {
    next(new AppError("Token inválido o expirado", 401));
  }
}

module.exports = auth;
