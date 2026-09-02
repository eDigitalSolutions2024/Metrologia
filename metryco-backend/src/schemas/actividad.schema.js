const { z } = require("zod");
const { objectId } = require("./common.schema");

const base = {
  fechaActividad: z.coerce.date({ error: "Fecha de actividad inválida" }),
  fechaLimite: z.coerce.date({ error: "Fecha límite inválida" }),
  tecnico: objectId,
  reporteServicio: z.string().trim().optional(),
  horaInicio: z.string().trim().min(1, "La hora de inicio es obligatoria"),
  horaFin: z.string().trim().min(1, "La hora de fin es obligatoria"),
  actividad: z.string().trim().min(1, "La actividad es obligatoria"),
  comentarios: z.string().trim().optional(),
  status: z.enum(["pendiente", "en_proceso", "completada"]).optional(),
};

const crearActividadSchema = z.object(base);
const actualizarActividadSchema = z.object(
  Object.fromEntries(Object.entries(base).map(([k, v]) => [k, v.optional?.() ?? v]))
);

module.exports = { crearActividadSchema, actualizarActividadSchema };
