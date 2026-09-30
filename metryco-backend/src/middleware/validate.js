const AppError = require("../utils/AppError");

/**
 * Middleware genérico de validación con Zod. Valida `req.body` (o la parte
 * del request que se indique) ANTES de que llegue al servicio — así los
 * datos mal formados (enum vacío, tipo equivocado, campo obligatorio
 * faltante) se rechazan de raíz con un mensaje claro por campo, en vez de
 * fallar más adelante con un error confuso de Mongoose o, peor, guardarse
 * corruptos.
 *
 * Uso: router.post("/", validate(esquemaCrear), controlador.crear)
 */
function validate(schema, parte = "body") {
  return (req, _res, next) => {
    const resultado = schema.safeParse(req[parte]);
    if (!resultado.success) {
      const errores = {};
      for (const issue of resultado.error.issues) {
        const campo = issue.path.join(".") || "_";
        if (!errores[campo]) errores[campo] = issue.message;
      }
      return next(new AppError("Datos inválidos", 400, errores));
    }
    req[parte] = resultado.data;
    next();
  };
}

module.exports = validate;
