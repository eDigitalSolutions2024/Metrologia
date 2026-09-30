const rateLimit = require("express-rate-limit");

const isProd = process.env.NODE_ENV === "production";

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: isProd ? 10 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Demasiados intentos, inténtalo de nuevo más tarde" },
});

// Límite general para toda la API: no evita que alguien use la app, pero frena
// scraping/clonado automatizado masivo de datos vía requests repetidos.
// El uso normal ya genera muchas llamadas por sí solo (polling de alertas
// cada 20s, listados, subidas de archivo, pruebas de desarrollo repetidas
// desde la misma IP) — 300/15min se agotaba con uso real, no solo abuso.
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: isProd ? 1500 : 100000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Demasiadas solicitudes, inténtalo de nuevo más tarde" },
});

module.exports = { authLimiter, apiLimiter };
