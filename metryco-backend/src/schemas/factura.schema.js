const { z } = require("zod");
const { objectId } = require("./common.schema");

const crearFacturaSchema = z.object({
  cliente: objectId,
  cotizacion: objectId.optional(),
  oc: z.string().trim().min(1, "La orden de compra es obligatoria"),
  folio: z.string().trim().min(1, "El folio es obligatorio"),
  monto: z.coerce.number().positive("El monto debe ser mayor a 0"),
  fechaCr: z.coerce.date({ error: "Fecha C/R inválida" }),
  diasPago: z.coerce.number().refine((v) => [0, 15, 30, 60].includes(v), "Días de pago inválido").optional(),
  comentarios: z.string().trim().optional(),
});

module.exports = { crearFacturaSchema };
