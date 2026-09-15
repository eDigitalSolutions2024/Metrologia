const { Schema, model } = require("mongoose");

/**
 * CFDI 4.0 — documento fiscal, DISTINTO de `Factura` (que es la cuenta por
 * cobrar / control de cobro de Cobranza, con su propio ciclo de vida de
 * pago). Un ComprobanteFiscal puede opcionalmente ligarse a una `Factura`
 * (misma cobranza, ahora con su comprobante fiscal formal), a una
 * `Cotizacion` o quedar suelto — igual patrón opcional que ya usa Factura
 * con `cotizacion`.
 *
 * Por qué un modelo aparte y no extender Factura: Factura.statusPago
 * (pagado/pendiente) y el estado fiscal de un CFDI (borrador/timbrada/
 * cancelada) son dos ciclos de vida independientes — una factura se puede
 * cobrar sin CFDI (como ya pasa hoy) y, al revés, un CFDI cancelado no debe
 * tocar el registro de cobro ya hecho. Mezclarlos en un solo documento
 * obliga a cargar campos fiscales vacíos en cada registro de Cobranza y a
 * decidir cuál "estado" manda — separarlos evita ambigüedad y no rompe nada
 * de lo que Cobranza ya usa.
 */
const ESTADOS = [
  "borrador",
  "pendiente_timbrar",
  "timbrando",
  "timbrada",
  "error_timbrado",
  "cancelacion_pendiente",
  "cancelada",
];

const TIPOS_COMPROBANTE = ["I", "E", "T", "N", "P"]; // Ingreso, Egreso, Traslado, Nómina, Pago
const MONEDAS = ["MXN", "USD"];
const OBJETOS_IMPUESTO = ["01", "02", "03"]; // No objeto / Sí objeto / Sí objeto y no obligado a desglosar

const impuestoSchema = new Schema(
  {
    tipo: { type: String, enum: ["traslado", "retencion"], required: true },
    impuesto: { type: String, default: "002" }, // 002 = IVA
    tipoFactor: { type: String, default: "Tasa" },
    tasaOCuota: { type: Number, required: true }, // ej. 0.16
    base: { type: Number, required: true },
    importe: { type: Number, required: true },
  },
  { _id: false }
);

const conceptoSchema = new Schema(
  {
    claveProdServ: { type: String, required: true, trim: true }, // catálogo SAT c_ClaveProdServ
    descripcion: { type: String, required: true, trim: true },
    cantidad: { type: Number, required: true, min: 0 },
    claveUnidad: { type: String, required: true, trim: true }, // catálogo SAT c_ClaveUnidad
    unidad: { type: String, trim: true },
    valorUnitario: { type: Number, required: true, min: 0 },
    importe: { type: Number, required: true, min: 0 },
    descuento: { type: Number, default: 0, min: 0 },
    objetoImpuesto: { type: String, enum: OBJETOS_IMPUESTO, default: "02" },
    impuestos: [impuestoSchema],
  },
  { _id: false }
);

const comprobanteFiscalSchema = new Schema(
  {
    // Ligas opcionales — nunca obligatorias, para no forzar un origen único.
    factura: { type: Schema.Types.ObjectId, ref: "Factura" },
    cotizacion: { type: Schema.Types.ObjectId, ref: "Cotizacion" },
    reporte: { type: Schema.Types.ObjectId, ref: "Reporte" },
    cliente: { type: Schema.Types.ObjectId, ref: "Cliente", required: true, index: true },

    folioInterno: { type: String, required: true, unique: true }, // CFDI-2026-0001 — control interno, no el folio fiscal del PAC
    serie: { type: String, trim: true },

    tipoComprobante: { type: String, enum: TIPOS_COMPROBANTE, default: "I" },
    moneda: { type: String, enum: MONEDAS, default: "MXN" },
    formaPago: { type: String, trim: true }, // catálogo SAT c_FormaPago, ej "03"
    metodoPago: { type: String, enum: ["PUE", "PPD"], default: "PUE" },
    lugarExpedicion: { type: String, trim: true }, // CP del emisor al momento de timbrar

    // Snapshots — el emisor/receptor se congelan al crear el borrador, igual
    // criterio que Certificado.clienteSnapshot: si después se edita el
    // Cliente o la Configuración del laboratorio, un CFDI ya generado no
    // debe cambiar retroactivamente.
    emisor: {
      rfc: { type: String, required: true, trim: true, uppercase: true },
      nombre: { type: String, required: true, trim: true },
      regimenFiscal: { type: String, required: true, trim: true },
    },
    receptor: {
      rfc: { type: String, required: true, trim: true, uppercase: true },
      nombre: { type: String, required: true, trim: true },
      codigoPostal: { type: String, required: true, trim: true },
      regimenFiscal: { type: String, required: true, trim: true },
      usoCFDI: { type: String, required: true, trim: true },
    },

    conceptos: {
      type: [conceptoSchema],
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.length > 0,
        message: "El comprobante debe tener al menos un concepto",
      },
    },

    // Totales — siempre recalculados en el backend a partir de `conceptos`,
    // nunca confiados del body del request (ver cfdi.service.js `calcularTotales`).
    subtotal: { type: Number, required: true, min: 0 },
    totalImpuestosTrasladados: { type: Number, default: 0 },
    totalImpuestosRetenidos: { type: Number, default: 0 },
    descuento: { type: Number, default: 0 },
    total: { type: Number, required: true, min: 0 },

    estado: { type: String, enum: ESTADOS, default: "borrador" },

    // Solo se llenan con una respuesta REAL del PAC — nunca simulados.
    uuid: { type: String, index: true },
    xml: { type: String }, // XML timbrado completo (texto)
    selloSat: String,
    cadenaOriginal: String,
    fechaTimbrado: Date,

    cancelacion: {
      motivo: String,
      folioSustitucion: String,
      fecha: Date,
      acuseXml: String,
    },

    errorTimbrado: {
      codigo: String,
      mensaje: String,
      fecha: Date,
    },

    comentarios: String,
    registradoPor: { type: Schema.Types.ObjectId, ref: "Usuario" },
  },
  { timestamps: true }
);

comprobanteFiscalSchema.statics.ESTADOS = ESTADOS;
comprobanteFiscalSchema.statics.TIPOS_COMPROBANTE = TIPOS_COMPROBANTE;
comprobanteFiscalSchema.statics.MONEDAS = MONEDAS;
comprobanteFiscalSchema.statics.OBJETOS_IMPUESTO = OBJETOS_IMPUESTO;

module.exports = model("ComprobanteFiscal", comprobanteFiscalSchema);
