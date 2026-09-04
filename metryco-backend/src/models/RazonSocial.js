const { Schema, model } = require("mongoose");

/**
 * Entidad legal interna con la que el laboratorio puede cotizar/facturar
 * (legacy: selector "Razón Social Interna" en cotizacion_genera.php). Un
 * mismo laboratorio puede operar bajo más de una razón social real.
 */
const razonSocialSchema = new Schema(
  {
    nombre: { type: String, required: true, trim: true },
    rfc: { type: String, trim: true },
    domicilio: { type: String, trim: true },
    telefono: { type: String, trim: true },
    acreditacion: { type: String, trim: true },
    activo: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = model("RazonSocial", razonSocialSchema);
