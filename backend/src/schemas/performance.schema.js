const { z } = require("zod");

const puntoSchema = z.object({
  prueba: z.string().trim().optional(),
  nominal: z.coerce.number().optional(),
  unidad: z.string().trim().optional(),
  escalaTotal: z.coerce.number().optional(),
  porcentajeRdg: z.coerce.number().optional(),
  porcentajeFs: z.coerce.number().optional(),
  unidades: z.coerce.number().optional(),
  incertidumbre: z.coerce.number().optional(),
});

const base = {
  nombre: z.string().trim().min(1, "El nombre es obligatorio"),
  comentarios: z.string().trim().optional(),
  imagenUrl: z.string().trim().optional(),
  magnitud: z.string().trim().optional(),
  tipoInstrumento: z.string().trim().optional(),
  puntos: z.array(puntoSchema).optional(),
};

const crearPerformanceSchema = z.object(base);
const actualizarPerformanceSchema = z.object({ ...base, nombre: base.nombre.optional() });

module.exports = { crearPerformanceSchema, actualizarPerformanceSchema };
