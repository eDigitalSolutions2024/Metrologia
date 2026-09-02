const { z } = require("zod");
const { objectId } = require("./common.schema");

const resultadoSchema = z.object({
  valorMedido: z.coerce.number().optional(),
  unidad: z.string().trim().optional(),
  incertidumbreExpandida: z.coerce.number().optional(),
  k: z.coerce.number().optional(),
  nivelConfianza: z.string().trim().optional(),
}).partial().optional();

// emitir(): o viene de una Asignación (equipo/cliente/patrones se resuelven
// solos), o hay que mandar el equipo suelto — igual que valida el service,
// solo que aquí se rechaza antes de tocar la base de datos.
const emitirCertificadoSchema = z.object({
  asignacion: objectId.optional(),
  equipo: objectId.optional(),
  cliente: objectId.optional(),
  patrones: z.array(objectId).optional(),
  fechaCalibracion: z.coerce.date().optional(),
  fechaEmision: z.coerce.date().optional(),
  vigencia: z.coerce.date().optional(),
  resultado: resultadoSchema,
}).refine((d) => d.asignacion || d.equipo, {
  message: "Falta el equipo (o una asignación)",
  path: ["equipo"],
});

const actualizarCertificadoSchema = z.object({
  fechaCalibracion: z.coerce.date().optional(),
  fechaEmision: z.coerce.date().optional(),
  vigencia: z.coerce.date().optional(),
  resultado: resultadoSchema,
});

const cambiarEstadoCertificadoSchema = z.object({
  estado: z.enum(["borrador", "vigente"], { error: "Estado no permitido manualmente (borrador o vigente)" }),
});

const anularCertificadoSchema = z.object({
  motivo: z.string().trim().min(1, "El motivo de anulación es obligatorio"),
});

module.exports = {
  emitirCertificadoSchema, actualizarCertificadoSchema,
  cambiarEstadoCertificadoSchema, anularCertificadoSchema,
};
