const AppError = require("../../utils/AppError");

/**
 * Se lanza cuando se intenta timbrar/cancelar/consultar un CFDI sin tener un
 * proveedor PAC configurado (variables PAC_PROVIDER/PAC_API_KEY/... vacías).
 * NUNCA se debe simular un timbrado exitoso en su lugar — ver pac.config.js.
 */
class PacNotConfiguredError extends AppError {
  constructor(detalle) {
    super(
      "No hay un proveedor de timbrado (PAC) configurado. Define las variables PAC_* en el .env para poder timbrar." +
        (detalle ? ` (${detalle})` : ""),
      503
    );
    this.code = "PAC_NOT_CONFIGURED";
  }
}

module.exports = PacNotConfiguredError;
