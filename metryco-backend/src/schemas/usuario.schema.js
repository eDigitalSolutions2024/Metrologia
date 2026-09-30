const { z } = require("zod");
const { passwordSchema } = require("./password.schema");

const ROLES = ["admin", "tecnico", "ventas", "coordinador"];
const SUCURSALES = ["juarez", "chihuahua", "admin"];

const crearUsuarioSchema = z.object({
  nombre: z.string().trim().min(1, "El nombre es obligatorio"),
  usuario: z.string().trim().min(3, "El usuario debe tener al menos 3 caracteres"),
  email: z.string().trim().email("Correo inválido"),
  password: passwordSchema,
  rol: z.enum(ROLES, { message: "Rol inválido" }),
  sucursal: z.enum(SUCURSALES).optional(),
});

const actualizarUsuarioSchema = z.object({
  nombre: z.string().trim().min(1).optional(),
  usuario: z.string().trim().min(3).optional(),
  email: z.string().trim().email("Correo inválido").optional(),
  password: passwordSchema.optional(),
  rol: z.enum(ROLES).optional(),
  sucursal: z.enum(SUCURSALES).optional(),
  status: z.enum(["activo", "inactivo"]).optional(),
});

module.exports = { crearUsuarioSchema, actualizarUsuarioSchema };
