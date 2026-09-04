const { Router } = require("express");
const auth = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");
const validate = require("../middleware/validate");
const auditar = require("../middleware/auditar");
const { adjuntoCotizacion } = require("../middleware/upload");
const { crearCotizacionSchema, actualizarCotizacionSchema } = require("../schemas/cotizacion.schema");
const cotizacionController = require("../controllers/cotizacion.controller");

const router = Router();

// El técnico nunca ve "Cotización" en el sistema original (solo admin/coordinador/ventas).
router.use(auth, requireRole("admin", "coordinador", "ventas"));

router.get("/", cotizacionController.listar);
router.get("/:id/imprimir", cotizacionController.paraImprimir);
router.get("/:id", cotizacionController.obtener);
router.post("/", validate(crearCotizacionSchema), cotizacionController.crear);
router.put("/:id", validate(actualizarCotizacionSchema), cotizacionController.actualizar);
router.delete("/:id", requireRole("admin", "coordinador"), auditar("cotizacion_eliminada", "Cotizacion"), cotizacionController.eliminar);

router.post("/:id/adjuntos", adjuntoCotizacion, cotizacionController.subirAdjunto);
router.get("/:id/adjuntos/:adjuntoId", cotizacionController.descargarAdjunto);
router.delete("/:id/adjuntos/:adjuntoId", cotizacionController.eliminarAdjunto);

module.exports = router;
