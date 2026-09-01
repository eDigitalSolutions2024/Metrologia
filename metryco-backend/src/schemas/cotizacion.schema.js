const { z } = require("zod");
const { objectId } = require("./common.schema");

const itemSchema = z.object({
  descripcion: z.string().trim().min(1, "La descripción es obligatoria"),
  cantidad: z.coerce.number().positive("La cantidad debe ser mayor a 0"),
  precioUnitario: z.coerce.number().min(0, "El precio no puede ser negativo"),
});

const crearCotizacionSchema = z.object({
  cliente: objectId,
  vigencia: z.coerce.date({ error: "Fecha de vigencia inválida" }),
  items: z.array(itemSchema).min(1, "Agrega al menos una partida"),
  observaciones: z.string().trim().optional(),
});

const actualizarCotizacionSchema = z.object({
  cliente: objectId.optional(),
  vigencia: z.coerce.date().optional(),
  items: z.array(itemSchema).min(1).optional(),
  observaciones: z.string().trim().optional(),
  status: z.enum(["pendiente", "aprobada", "rechazada", "facturada", "vencida"]).optional(),
});

module.exports = { crearCotizacionSchema, actualizarCotizacionSchema };
