const { z } = require("zod");

const MODOS = ["semiamplitud", "desviacion_std", "incertidumbre_std", "certificado"];
const DISTRIBUCIONES = ["normal", "rectangular", "triangular", "forma_u"];
const REGLAS = ["simple", "guard_band_U", "guard_band_2U"];

const vacio = (schema) => z.preprocess((v) => (v === "" ? undefined : v), schema.optional());

const contribucionSchema = z.object({
  fuente: z.string().trim().min(1, "La fuente es obligatoria"),
  simbolo: z.string().trim().optional(),
  tipo: vacio(z.enum(["A", "B"], { error: "Tipo inválido" })),
  modo: vacio(z.enum(MODOS, { error: "Modo inválido" })),
  distribucion: vacio(z.enum(DISTRIBUCIONES, { error: "Distribución inválida" })),
  valorSugerido: z.coerce.number().optional(),
  k: z.coerce.number().optional(),
  n: z.coerce.number().optional(),
  divisorManual: z.coerce.number().optional(),
  coefSensibilidad: z.coerce.number().optional(),
  gradosLibertad: z.coerce.number().optional(),
  unidad: z.string().trim().optional(),
  ayuda: z.string().trim().optional(),
  obligatoria: z.boolean().optional(),
});

const crearModeloSchema = z.object({
  magnitud: z.string().trim().min(1, "La magnitud es obligatoria"),
  tipoInstrumento: z.string().trim().min(1, "El tipo de instrumento es obligatorio"),
  nombre: z.string().trim().min(1, "El nombre es obligatorio"),
  mensurando: z.string().trim().optional(),
  unidad: z.string().trim().optional(),
  normaReferencia: z.string().trim().optional(),
  nivelConfianza: z.string().trim().optional(),
  rangoTipico: z.string().trim().optional(),
  notas: z.string().trim().optional(),
  activo: z.boolean().optional(),
  criterioAceptacion: z.object({
    emp: z.coerce.number().optional(),
    regla: vacio(z.enum(REGLAS, { error: "Regla inválida" })),
  }).optional(),
  contribuciones: z.array(contribucionSchema).optional(),
});

const actualizarModeloSchema = crearModeloSchema.partial();

module.exports = { crearModeloSchema, actualizarModeloSchema };
