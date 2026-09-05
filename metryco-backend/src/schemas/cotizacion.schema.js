const { z } = require("zod");
const { objectId } = require("./common.schema");

const vacio = (schema) => z.preprocess((v) => (v === "" ? undefined : v), schema.optional());

const itemSchema = z.object({
  descripcion: z.string().trim().min(1, "La descripción es obligatoria"),
  marca: z.string().trim().optional(),
  modelo: z.string().trim().optional(),
  tiempoEntrega: z.string().trim().optional(),
  cantidad: z.coerce.number().positive("La cantidad debe ser mayor a 0"),
  precioUnitario: z.coerce.number().min(0, "El precio no puede ser negativo"),
});

const crearCotizacionSchema = z.object({
  cliente: objectId,
  razonSocial: vacio(objectId),
  contacto: vacio(objectId),
  vigencia: z.coerce.date({ error: "Fecha de vigencia inválida" }),
  ordenCompra: z.string().trim().optional(),
  items: z.array(itemSchema).min(1, "Agrega al menos una partida"),
  observaciones: z.string().trim().optional(),
  moneda: vacio(z.enum(["MXN", "USD"], { error: "Moneda inválida" })),
  ivaPorcentaje: z.coerce.number().refine((v) => [0, 8, 16].includes(v), { error: "IVA debe ser 0, 8 o 16%" }).optional(),
});

const actualizarCotizacionSchema = z.object({
  cliente: objectId.optional(),
  razonSocial: vacio(objectId),
  contacto: vacio(objectId),
  vigencia: z.coerce.date().optional(),
  ordenCompra: z.string().trim().optional(),
  items: z.array(itemSchema).min(1).optional(),
  observaciones: z.string().trim().optional(),
  status: z.enum(["pendiente", "aprobada", "rechazada", "facturada", "vencida"]).optional(),
  moneda: vacio(z.enum(["MXN", "USD"], { error: "Moneda inválida" })),
  ivaPorcentaje: z.coerce.number().refine((v) => [0, 8, 16].includes(v), { error: "IVA debe ser 0, 8 o 16%" }).optional(),
});

module.exports = { crearCotizacionSchema, actualizarCotizacionSchema };
