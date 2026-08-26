const AppError = require("../utils/AppError");

function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errors: err.errors,
    });
  }

  if (err.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      message: "Datos inválidos",
      errors: Object.fromEntries(
        Object.entries(err.errors).map(([field, e]) => [field, e.message])
      ),
    });
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0];
    return res.status(409).json({
      success: false,
      message: field ? `Ya existe un registro con ese ${field}` : "Registro duplicado",
    });
  }

  console.error(err);
  return res.status(500).json({
    success: false,
    message: "Error interno del servidor",
  });
}

module.exports = errorHandler;
