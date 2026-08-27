const rateLimit = require("express-rate-limit");

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Demasiados intentos, inténtalo de nuevo más tarde" },
});

// Límite general para toda la API: no evita que alguien use la app, pero frena
// scraping/clonado automatizado masivo de datos vía requests repetidos.
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Demasiadas solicitudes, inténtalo de nuevo más tarde" },
});

module.exports = { authLimiter, apiLimiter };
