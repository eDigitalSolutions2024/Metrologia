const { z } = require("zod");

const actualizarLaboratorioSchema = z.object({
  nombre: z.string().trim().optional(),
  acreditacion: z.string().trim().optional(),
  rfc: z.string().trim().optional(),
  domicilio: z.string().trim().optional(),
  telefono: z.string().trim().optional(),
});

const hexColor = z.string().trim().regex(/^#[0-9A-Fa-f]{6}$/, "Debe ser un color hexadecimal válido (#RRGGBB)");

const actualizarColoresSchema = z.object({
  primario: hexColor,
  secundario: hexColor,
});

const ROLES = ["admin", "coordinador", "ventas", "tecnico"];

const actualizarMenuPermisosSchema = z.object({
  permisos: z.record(z.string(), z.array(z.enum(ROLES, { error: "Rol inválido" }))).optional(),
});

module.exports = { actualizarLaboratorioSchema, actualizarColoresSchema, actualizarMenuPermisosSchema };
