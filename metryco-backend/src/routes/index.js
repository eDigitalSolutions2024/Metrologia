const { Router } = require("express");
const authRoutes = require("./auth.routes");
const usuarioRoutes = require("./usuario.routes");
const clienteRoutes = require("./cliente.routes");
const cotizacionRoutes = require("./cotizacion.routes");
const actividadRoutes = require("./actividad.routes");
const equipoRoutes = require("./equipo.routes");
const patronRoutes = require("./patron.routes");
const performanceRoutes = require("./performance.routes");
const reporteRoutes = require("./reporte.routes");
const asignacionRoutes = require("./asignacion.routes");
const certificadoRoutes = require("./certificado.routes");
const magnitudRoutes = require("./magnitud.routes");
const incertidumbreRoutes = require("./incertidumbre.routes");
const publicoRoutes = require("./publico.routes");
const configuracionRoutes = require("./configuracion.routes");
const alertaRoutes = require("./alerta.routes");
const cobranzaRoutes = require("./cobranza.routes");
const auditoriaRoutes = require("./auditoria.routes");
const perfilRoutes = require("./perfil.routes");

const router = Router();

router.get("/health", (req, res) => res.json({ ok: true }));

// Consulta pública de certificados por token (SIN auth) — va primero.
router.use("/publico", publicoRoutes);

router.use("/auth", authRoutes);
router.use("/usuarios", usuarioRoutes);
router.use("/clientes", clienteRoutes);
router.use("/cotizaciones", cotizacionRoutes);
router.use("/actividades", actividadRoutes);
router.use("/equipos", equipoRoutes);
router.use("/patrones", patronRoutes);
router.use("/performance", performanceRoutes);
router.use("/reportes", reporteRoutes);
router.use("/asignaciones", asignacionRoutes);
router.use("/certificados", certificadoRoutes);
router.use("/magnitudes", magnitudRoutes);
router.use("/incertidumbre", incertidumbreRoutes);
router.use("/configuracion", configuracionRoutes);
router.use("/alertas", alertaRoutes);
router.use("/cobranza", cobranzaRoutes);
router.use("/auditoria", auditoriaRoutes);
router.use("/perfil", perfilRoutes);

module.exports = router;
