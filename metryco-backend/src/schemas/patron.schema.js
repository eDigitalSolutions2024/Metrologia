const { z } = require("zod");
const { CATEGORIAS_EQUIPO } = require("../models/_shared");

const categoriaOpcional = z.preprocess(
  (v) => (v === "" ? undefined : v),
  z.enum(CATEGORIAS_EQUIPO, { error: "Categoría inválida" }).optional()
);

const ultimaCalibracionSchema = z.object({
  fecha: z.coerce.date().optional(),
  vencimiento: z.coerce.date().optional(),
  certificadoNo: z.string().trim().optional(),
  laboratorio: z.string().trim().optional(),
}).partial().optional();

const basePatron = {
  codigo: z.string().trim().min(1, "El código es obligatorio"),
  nombre: z.string().trim().min(1, "El nombre es obligatorio"),
  descripcion: z.string().trim().optional(),
  categoria: categoriaOpcional,
  marca: z.string().trim().optional(),
  modelo: z.string().trim().optional(),
  serie: z.string().trim().optional(),
  trazabilidad: z.string().trim().optional(),
  comentarios: z.string().trim().optional(),
  unidades: z.string().trim().optional(),
  capacidad: z.string().trim().optional(),
  divisionMinima: z.string().trim().optional(),
  ultimaCalibracion: ultimaCalibracionSchema,
  manejo: z.string().trim().optional(),
  procedimiento: z.string().trim().optional(),
  transporte: z.string().trim().optional(),
  almacenamiento: z.string().trim().optional(),
  activo: z.boolean().optional(),
};

const crearPatronSchema = z.object(basePatron);
const actualizarPatronSchema = z.object({ ...basePatron, codigo: basePatron.codigo.optional(), nombre: basePatron.nombre.optional() });

module.exports = { crearPatronSchema, actualizarPatronSchema };
