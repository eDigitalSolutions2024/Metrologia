const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");

const routes = require("./routes");
const notFound = require("./middleware/notFound");
const errorHandler = require("./middleware/errorHandler");
const { authLimiter, apiLimiter } = require("./middleware/rateLimiters");
const { corsOrigin } = require("./config/env");
const { destinoLogos, destinoFotos, destinoFirmas } = require("./middleware/upload");

const app = express();

app.use(helmet());
app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(express.json({ limit: "100kb" }));
app.use(cookieParser());

// Logo de la empresa: público (lo necesita la pantalla de Login sin sesión) y
// servido cross-origin (frontend en otro puerto) — helmet por defecto pone
// Cross-Origin-Resource-Policy: same-origin, que bloquearía la imagen.
app.use(
  "/uploads/logos",
  (req, res, next) => { res.set("Cross-Origin-Resource-Policy", "cross-origin"); next(); },
  express.static(destinoLogos)
);

// Foto de perfil y firma digital: mismo criterio que el logo — no son datos
// sensibles (no son credenciales), se sirven públicas por simplicidad y para
// poder mostrarlas en el avatar del Navbar y en PDFs sin pasar por un fetch
// autenticado.
const corsCrossOrigin = (req, res, next) => { res.set("Cross-Origin-Resource-Policy", "cross-origin"); next(); };
app.use("/uploads/fotos-perfil", corsCrossOrigin, express.static(destinoFotos));
app.use("/uploads/firmas", corsCrossOrigin, express.static(destinoFirmas));

// Comentado temporalmente (2026-09): en dev, todo el tráfico comparte la
// misma IP (localhost) — pruebas repetidas por API agotan rápido la ventana
// de 100 intentos/15min y terminan bloqueando también al login real del
// navegador ("Demasiados intentos" tras recargar sin haber fallado antes).
// Reactivar antes de producción, e idealmente contar por usuario+IP, no solo IP.
// app.use("/api/auth/login", authLimiter);
// app.use("/api/auth/verificar-admin", authLimiter);
app.use("/api", apiLimiter, routes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
