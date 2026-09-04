const AppError = require("../utils/AppError");
const auditoriaService = require("../services/auditoria.service");

function requireRole(...rolesPermitidos) {
  return function (req, res, next) {
    if (!req.user) return next(new AppError("No autenticado", 401));
    if (!rolesPermitidos.includes(req.user.rol)) {
      auditoriaService.registrar({
        accion: "permiso_denegado",
        reqUser: req.user,
        exito: false,
        ip: req.ip,
        detalle: { ruta: req.originalUrl, metodo: req.method, rolesRequeridos: rolesPermitidos },
      });
      return next(new AppError("No tienes permiso para esta acción", 403));
    }
    next();
  };
}

module.exports = requireRole;
