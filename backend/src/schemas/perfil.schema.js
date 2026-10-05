const { z } = require("zod");
const { passwordSchema } = require("./password.schema");

const cambiarPasswordSchema = z.object({
  passwordActual: z.string().min(1, "Ingresa tu contraseña actual"),
  passwordNueva: passwordSchema,
});

module.exports = { cambiarPasswordSchema };
