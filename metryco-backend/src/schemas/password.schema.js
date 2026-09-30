const { z } = require("zod");

// Política de contraseñas: mínimo 8 caracteres, al menos una mayúscula, una
// minúscula y un número. No se exige símbolo (fricción alta, valor bajo según
// NIST 800-63B) pero sí variedad de caracteres, no solo longitud.
const passwordSchema = z
  .string()
  .min(8, "La contraseña debe tener al menos 8 caracteres")
  .regex(/[a-z]/, "La contraseña debe incluir al menos una minúscula")
  .regex(/[A-Z]/, "La contraseña debe incluir al menos una mayúscula")
  .regex(/[0-9]/, "La contraseña debe incluir al menos un número");

module.exports = { passwordSchema };
