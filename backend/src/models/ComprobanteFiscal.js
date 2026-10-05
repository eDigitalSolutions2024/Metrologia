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
  "cancelacion_pendiente", // requiere aceptación del RECEPTOR (monto > umbral SAT)
  "cancelacion_en_proceso", // el PAC (ej. Dinvbox) aún no confirma — no está cancelado ante el SAT todavía
  "cancelada",
];

const TIPOS_COMPROBANTE = ["I", "E", "T", "N", "P"]; // Ingreso, Egreso, Traslado, Nómina, Pago
const MONEDAS = ["MXN", "USD"];
const OBJETOS_IMPUESTO = ["01", "02", "03"]; // No objeto / Sí objeto / Sí objeto y no obligado a desglosar

// Catálogo SAT c_MotivoCancelacion — vigente desde la reforma de cancelación
// de 2018 (antes de eso no existía "motivo", por eso el legacy en CFDI 3.2
// no lo maneja).
const MOTIVOS_CANCELACION = ["01", "02", "03", "04"];
// 01 = Comprobante emitido con errores CON relación (exige folioSustitucion)
// 02 = Comprobante emitido con errores SIN relación
// 03 = No se llevó a cabo la operación
// 04 = Operación nominativa relacionada en una factura global

const ESTADOS_SOLICITUD_CANCELACION = ["no_aplica", "pendiente", "aceptada", "rechazada"];

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
    // Índice (0, 1, 2…) de la partida de la cotización de la que viene este concepto — permite facturar
    // una cotización por partes y saber qué falta (ver cotizacionFacturacion.js).
    partidaCotizacion: { type: Number, min: 0 },
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
    // "XXX" solo aplica a la raíz del comprobante cuando tipoComprobante="P"
    // (Complemento de Pago) — el Anexo 20 exige ese valor fijo porque
    // Subtotal/Total del comprobante van en 0 (la moneda real del pago vive
    // en pago.moneda / MonedaP, no aquí).
    moneda: { type: String, enum: [...MONEDAS, "XXX"], default: "MXN" },
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
      motivoCodigo: { type: String, enum: MOTIVOS_CANCELACION },
      motivo: String, // texto libre adicional, para nuestra propia bitácora
      folioSustitucion: String, // UUID del CFDI que sustituye a este — obligatorio si motivoCodigo="01"
      fecha: Date,
      acuseXml: String,
      // Desde 2022 el SAT exige que el RECEPTOR acepte o rechace la
      // cancelación cuando el comprobante supera $5,000 MXN (salvo
      // excepciones que este sistema no modela todas — ver docs/FACTURACION.md).
      // Mientras la solicitud esté "pendiente", el CFDI sigue vigente ante
      // el SAT (estado="cancelacion_pendiente", NO "cancelada").
      requiereAceptacion: { type: Boolean, default: false },
      estadoSolicitud: { type: String, enum: ESTADOS_SOLICITUD_CANCELACION, default: "no_aplica" },
      fechaLimiteRespuesta: Date, // fecha + 72 horas
      fechaResolucion: Date,
    },

    // Solo aplica a comprobantes tipo "I" con MetodoPago "PPD" — cuánto le
    // falta por cobrar. Se inicializa = total al timbrarse; cada Complemento
    // de Pago exitoso contra este comprobante lo reduce (ver
    // cfdi.service.emitirComplementoPago). No es lo mismo que Factura
    // (Cobranza) — esto es específicamente el saldo que exige rastrear el
    // Anexo 20 para el nodo DoctoRelacionado del Complemento de Pago.
    saldoPendiente: { type: Number, min: 0 },

    // Solo aplica a comprobantes tipo "P" (Complemento de Pago) — un CFDI de
    // Pago SIEMPRE lleva Subtotal=0/Total=0 y un solo concepto genérico
    // ("Pago", ClaveProdServ 84111506); el dato real del pago vive aquí.
    pago: {
      fechaPago: Date,
      formaPago: String, // catálogo SAT c_FormaPago
      moneda: { type: String, enum: MONEDAS },
      tipoCambio: { type: Number, default: 1 }, // pago20:Pago/@TipoCambioP
      monto: Number,
      numOperacion: String,
      // Desglose de IMPUESTOS DE ESTE PAGO (pago20:ImpuestosP) — es la
      // porción de impuesto que corresponde al monto pagado, no el impuesto
      // completo del documento original (se prorratea si el pago es
      // parcial). Ver cfdi.service.emitirComplementoPago.
      impuestos: [
        {
          impuesto: String, tipoFactor: String, tasaOCuota: Number,
          base: Number, importe: Number, _id: false,
        },
      ],
      docRelacionado: {
        comprobante: { type: Schema.Types.ObjectId, ref: "ComprobanteFiscal" }, // el CFDI de Ingreso que se está pagando
        idDocumento: String, // UUID timbrado de ese CFDI
        serie: String,
        folio: String,
        moneda: String,
        equivalencia: { type: Number, default: 1 }, // pago20:DoctoRelacionado/@EquivalenciaDR
        numParcialidad: Number,
        impSaldoAnterior: Number,
        impPagado: Number,
        impSaldoInsoluto: Number,
        objetoImpDR: { type: String, enum: OBJETOS_IMPUESTO },
        // Desglose de IMPUESTOS DEL DOCUMENTO que se está pagando
        // (pago20:ImpuestosDR) — el impuesto completo de ESE comprobante,
        // sin prorratear (a diferencia de `pago.impuestos` de arriba).
        impuestos: [
          {
            impuesto: String, tipoFactor: String, tasaOCuota: Number,
            base: Number, importe: Number, _id: false,
          },
        ],
      },
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
comprobanteFiscalSchema.statics.MOTIVOS_CANCELACION = MOTIVOS_CANCELACION;
comprobanteFiscalSchema.statics.ESTADOS_SOLICITUD_CANCELACION = ESTADOS_SOLICITUD_CANCELACION;

module.exports = model("ComprobanteFiscal", comprobanteFiscalSchema);
