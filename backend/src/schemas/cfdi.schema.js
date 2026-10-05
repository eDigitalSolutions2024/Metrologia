const { z } = require("zod");
const { objectId } = require("./common.schema");

const impuestoSchema = z.object({
  tipo: z.enum(["traslado", "retencion"]),
  impuesto: z.string().trim().optional(),
  tipoFactor: z.string().trim().optional(),
  tasaOCuota: z.coerce.number().min(0),
  base: z.coerce.number().min(0),
  importe: z.coerce.number().min(0),
});

const conceptoSchema = z.object({
  claveProdServ: z.string().trim().min(1, "La clave de producto/servicio SAT es obligatoria"),
  descripcion: z.string().trim().min(1, "La descripción es obligatoria"),
  cantidad: z.coerce.number().positive("La cantidad debe ser mayor a 0"),
  claveUnidad: z.string().trim().min(1, "La clave de unidad SAT es obligatoria"),
  unidad: z.string().trim().optional(),
  valorUnitario: z.coerce.number().min(0, "El valor unitario no puede ser negativo"),
  descuento: z.coerce.number().min(0).optional(),
  objetoImpuesto: z.enum(["01", "02", "03"]).optional(),
  partidaCotizacion: z.number().int().min(0).optional(),
  impuestos: z.array(impuestoSchema).optional(),
});

const crearCfdiSchema = z.object({
  cliente: objectId,
  factura: objectId.optional(),
  cotizacion: objectId.optional(),
  reporte: objectId.optional(),
  serie: z.string().trim().optional(),
  tipoComprobante: z.enum(["I", "E", "T", "N", "P"]).optional(),
  moneda: z.enum(["MXN", "USD"]).optional(),
  formaPago: z.string().trim().min(1, "La forma de pago SAT es obligatoria"),
  metodoPago: z.enum(["PUE", "PPD"]).optional(),
  conceptos: z.array(conceptoSchema).min(1, "Agrega al menos un concepto"),
  comentarios: z.string().trim().optional(),
});

// Solo aplica sobre un CFDI en "borrador" — se valida en el servicio, no aquí.
const actualizarCfdiSchema = crearCfdiSchema.partial().extend({
  cliente: objectId.optional(),
});

const cancelarCfdiSchema = z
  .object({
    motivoCodigo: z.enum(["01", "02", "03", "04"], { error: "Motivo de cancelación inválido (catálogo SAT c_MotivoCancelacion)" }),
    motivo: z.string().trim().optional(), // nota interna adicional, no la exige el SAT
    folioSustitucion: z.string().trim().optional(),
  })
  .refine((d) => d.motivoCodigo !== "01" || !!d.folioSustitucion, {
    message: "El motivo 01 (con relación) exige el UUID del CFDI que sustituye a este",
    path: ["folioSustitucion"],
  });

const resolverSolicitudCancelacionSchema = z.object({
  aceptar: z.boolean(),
});

const emitirComplementoPagoSchema = z.object({
  comprobante: objectId, // el CFDI de Ingreso (PPD) que se está pagando
  fechaPago: z.coerce.date({ error: "Fecha de pago inválida" }),
  formaPago: z.string().trim().min(1, "La forma de pago SAT es obligatoria"),
  monto: z.coerce.number().positive("El monto pagado debe ser mayor a 0"),
  numOperacion: z.string().trim().optional(),
  comentarios: z.string().trim().optional(),
});

module.exports = {
  crearCfdiSchema, actualizarCfdiSchema, cancelarCfdiSchema,
  resolverSolicitudCancelacionSchema, emitirComplementoPagoSchema,
};
