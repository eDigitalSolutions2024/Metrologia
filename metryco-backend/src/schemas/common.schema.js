const { z } = require("zod");

// z.string() por default da un mensaje en inglés cuando el campo falta por
// completo (undefined) — se personaliza aquí una sola vez para toda la app.
const objectId = z
  .string({ error: "Este campo es obligatorio" })
  .regex(/^[0-9a-fA-F]{24}$/, "Id inválido");

module.exports = { objectId };
