const AppError = require("../../utils/AppError");

/**
 * Error de un adaptador PAC real (autenticación, validación del proveedor,
 * timeout, respuesta inválida...). Distinto de PacNotConfiguredError (que es
 * "no hay proveedor conectado"): este es "el proveedor respondió con un
 * error", o "no respondió".
 *
 * `retryable` es la señal que usa cfdi.service para decidir si reintentar
 * automáticamente (timeout/red = sí; el PAC rechazó el CFDI por datos
 * inválidos = no, reintentar no lo va a arreglar).
 */
class PacError extends AppError {
  constructor(message, { retryable = false, providerCode, providerMessage, statusCode = 502 } = {}) {
    super(message, statusCode);
    this.code = "PAC_ERROR";
    this.retryable = retryable;
    this.providerCode = providerCode;
    this.providerMessage = providerMessage;
  }
}

module.exports = PacError;
