const { Schema, model } = require("mongoose");
const { cobradoDe, saldoDe } = require("../utils/saldoFactura");

/**
 * Registro de cuenta por cobrar (tabla `events` del legacy: php/calendario_generar.php,
 * php/calendario_consultar.php). Etapa 1 del sistema de Facturación/Cobranza:
 * lleva el control real de facturas emitidas y su cobro, SIN timbrado CFDI
 * automático todavía (eso es una integración aparte con un PAC — ver memoria
 * del proyecto). El folio de factura es texto libre por ahora (se captura el
 * folio ya timbrado fuera del sistema, o uno provisional).
 */
// Un abono es un pago parcial (o el último) contra la cuenta. Si nace de un
// Complemento de Pago timbrado lleva `comprobante` y solo se retira cancelando
// ese complemento; los demás son manuales.
const abonoSchema = new Schema(
  {
    fecha: { type: Date, required: true },
    monto: { type: Number, required: true, min: 0.01 },
    nota: { type: String, trim: true },
    comprobante: { type: Schema.Types.ObjectId, ref: "ComprobanteFiscal" },
    registradoPor: { type: Schema.Types.ObjectId, ref: "Usuario" },
  },
  { _id: true }
);

const facturaSchema = new Schema(
  {
    cliente: { type: Schema.Types.ObjectId, ref: "Cliente", required: true, index: true },
    // Liga opcional a la cotización de origen — el legacy no la tenía (solo
    // capturaba cliente/OC/folio sueltos), se agrega para no perder la
    // trazabilidad cuando sí se conoce, sin obligarla.
    cotizacion: { type: Schema.Types.ObjectId, ref: "Cotizacion" },
    // CFDI del que nació esta cuenta por cobrar (se crea sola al timbrar) —
    // único para que timbrar dos veces o reintentar nunca duplique la cuenta.
    comprobante: { type: Schema.Types.ObjectId, ref: "ComprobanteFiscal", unique: true, sparse: true },

    oc: { type: String, required: true, trim: true },
    folio: { type: String, required: true, trim: true },
    monto: { type: Number, required: true, min: 0 },

    fechaCr: { type: Date, required: true }, // fecha de creación/recepción de la factura
    diasPago: { type: Number, enum: [0, 15, 30, 60], default: 30 },
    fechaPago: { type: Date, required: true, index: true }, // = fechaCr + diasPago, calculada al guardar

    statusPago: { type: Number, enum: [0, 1], default: 0 }, // 0 = pendiente, 1 = pagada (saldo en 0)
    abonos: [abonoSchema],
    // PPD timbrada en el sistema: se cobra registrando Complementos de Pago (Facturación), no a mano.
    requiereComplemento: { type: Boolean, default: false },
    fechaPagada: Date,

    comentarios: String,
    registradoPor: { type: Schema.Types.ObjectId, ref: "Usuario" },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

facturaSchema.virtual("cobrado").get(function () { return cobradoDe(this); });
facturaSchema.virtual("saldo").get(function () { return saldoDe(this); });

module.exports = model("Factura", facturaSchema);
