const { z } = require("zod");
const { CATEGORIAS_EQUIPO } = require("../models/_shared");

const MODOS_INCERT = ["fija", "tabla"];
const ESTADOS = ["activo", "en_calibracion", "baja"];

const categoriaOpcional = z.preprocess(
  (v) => (v === "" ? undefined : v),
  z.enum(CATEGORIAS_EQUIPO, { error: "Categoría inválida" }).optional()
);

// --- Legacy (se conserva para no romper llamadas antiguas) ---
const ultimaCalibracionSchema = z.object({
  fecha: z.coerce.date().optional(),
  vencimiento: z.coerce.date().optional(),
  certificadoNo: z.string().trim().optional(),
  laboratorio: z.string().trim().optional(),
}).partial().optional();

// --- Incertidumbre estructurada del certificado del patrón ---
const puntoUSchema = z.object({
  nominal: z.coerce.number().optional(),
  U: z.coerce.number().optional(),
}).partial();

const incertidumbreSchema = z.object({
  modo: z.enum(MODOS_INCERT).optional(),
  k: z.coerce.number().optional(),
  unidad: z.string().trim().optional(),
  valor: z.coerce.number().optional(),
  puntos: z.array(puntoUSchema).optional(),
}).partial().optional();

const derivaSchema = z.object({
  valor: z.coerce.number().optional(),
  unidad: z.string().trim().optional(),
  periodoMeses: z.coerce.number().optional(),
}).partial().optional();

const calibracionSchema = z.object({
  laboratorio: z.string().trim().optional(),
  numeroCertificado: z.string().trim().optional(),
  fecha: z.coerce.date().optional(),
  periodicidadMeses: z.coerce.number().optional(),
  vencimiento: z.coerce.date().optional(),
}).partial().optional();

const basePatron = {
  codigo: z.string().trim().min(1, "El código es obligatorio"),
  nombre: z.string().trim().min(1, "El nombre es obligatorio"),
  descripcion: z.string().trim().optional(),
  categoria: categoriaOpcional,
  magnitud: z.string().trim().optional(),
  marca: z.string().trim().optional(),
  modelo: z.string().trim().optional(),
  serie: z.string().trim().optional(),
  trazabilidad: z.string().trim().optional(),
  comentarios: z.string().trim().optional(),

  // Metrología (nombres nuevos)
  unidad: z.string().trim().optional(),
  intervaloMedicion: z.string().trim().optional(),
  resolucion: z.string().trim().optional(),

  // Metrología (nombres legacy — se aceptan por compatibilidad)
  unidades: z.string().trim().optional(),
  capacidad: z.string().trim().optional(),
  divisionMinima: z.string().trim().optional(),

  incertidumbre: incertidumbreSchema,
  deriva: derivaSchema,
  calibracion: calibracionSchema,
  ultimaCalibracion: ultimaCalibracionSchema,

  condicionesReferencia: z.string().trim().optional(),
  manejo: z.string().trim().optional(),
  procedimiento: z.string().trim().optional(),
  transporte: z.string().trim().optional(),
  almacenamiento: z.string().trim().optional(),

  estado: z.enum(ESTADOS).optional(),
  activo: z.boolean().optional(),
};

const crearPatronSchema = z.object(basePatron);
const actualizarPatronSchema = z.object({ ...basePatron, codigo: basePatron.codigo.optional(), nombre: basePatron.nombre.optional() });

module.exports = { crearPatronSchema, actualizarPatronSchema };
