const { Router } = require("express");
const auth = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");
const c = require("../controllers/reporte.controller");

const router = Router();
router.use(auth);

router.get("/", c.listar);
router.get("/:id/imprimir", c.paraImprimir);
router.get("/:id", c.obtener);
// Quien da de alta el servicio: administración/coordinación/ventas. El técnico
// ejecuta el trabajo (ver asignacion.routes.js) pero no abre reportes nuevos.
router.post("/", requireRole("admin", "coordinador", "ventas"), c.crear);
router.post("/:id/comentarios", c.agregarComentario); // cualquiera puede comentar
router.put("/:id", requireRole("admin", "coordinador", "ventas"), c.actualizar);
router.delete("/:id", requireRole("admin", "coordinador"), c.eliminar);

module.exports = router;
