const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");

const routes = require("./routes");
const notFound = require("./middleware/notFound");
const errorHandler = require("./middleware/errorHandler");
const { authLimiter, apiLimiter } = require("./middleware/rateLimiters");
const { corsOrigin } = require("./config/env");
const { destinoLogos } = require("./middleware/upload");

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

app.use("/api/auth/login", authLimiter);
app.use("/api/auth/verificar-admin", authLimiter);
app.use("/api", apiLimiter, routes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
