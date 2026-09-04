const { Schema, model } = require("mongoose");

/**
 * Registro de cuenta por cobrar (tabla `events` del legacy: php/calendario_generar.php,
 * php/calendario_consultar.php). Etapa 1 del sistema de Facturación/Cobranza:
 * lleva el control real de facturas emitidas y su cobro, SIN timbrado CFDI
 * automático todavía (eso es una integración aparte con un PAC — ver memoria
 * del proyecto). El folio de factura es texto libre por ahora (se captura el
 * folio ya timbrado fuera del sistema, o uno provisional).
 */
const facturaSchema = new Schema(
  {
    cliente: { type: Schema.Types.ObjectId, ref: "Cliente", required: true, index: true },
    // Liga opcional a la cotización de origen — el legacy no la tenía (solo
    // capturaba cliente/OC/folio sueltos), se agrega para no perder la
    // trazabilidad cuando sí se conoce, sin obligarla.
    cotizacion: { type: Schema.Types.ObjectId, ref: "Cotizacion" },

    oc: { type: String, required: true, trim: true },
    folio: { type: String, required: true, trim: true },
    monto: { type: Number, required: true, min: 0 },

    fechaCr: { type: Date, required: true }, // fecha de creación/recepción de la factura
    diasPago: { type: Number, enum: [0, 15, 30, 60], default: 30 },
    fechaPago: { type: Date, required: true, index: true }, // = fechaCr + diasPago, calculada al guardar

    statusPago: { type: Number, enum: [0, 1], default: 0 }, // 0 = pendiente, 1 = pagada
    fechaPagada: Date,

    comentarios: String,
    registradoPor: { type: Schema.Types.ObjectId, ref: "Usuario" },
  },
  { timestamps: true }
);

module.exports = model("Factura", facturaSchema);
