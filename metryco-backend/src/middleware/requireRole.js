const AppError = require("../utils/AppError");

function requireRole(...rolesPermitidos) {
  return function (req, res, next) {
    if (!req.user) return next(new AppError("No autenticado", 401));
    if (!rolesPermitidos.includes(req.user.rol)) {
      return next(new AppError("No tienes permiso para esta acción", 403));
    }
    next();
  };
}

module.exports = requireRole;
