const { Router } = require("express");
const auth = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");
const c = require("../controllers/asignacion.controller");

const router = Router();
router.use(auth);

router.get("/", c.listar);
// Cola de Calidad: exclusiva de admin/coordinador, igual que aprobar/rechazar.
router.get("/calidad", requireRole("admin", "coordinador"), c.calidad);
router.get("/:id", c.obtener);
// Quien decide qué equipo se calibra y con quién: administración/coordinación/ventas.
router.post("/", requireRole("admin", "coordinador", "ventas"), c.crear);
// Datos operativos (patrones, performance, factura de la asignación, recolección):
// los llena quien ejecuta el trabajo o quien supervisa — no ventas.
router.put("/:id", requireRole("admin", "coordinador", "tecnico"), c.actualizar);
// Transición de calibración/entrega/certificado: el permiso fino por dominio
// (certificado = solo Calidad) se valida dentro del servicio, no aquí.
router.patch("/:id/estado", requireRole("admin", "coordinador", "tecnico"), c.cambiarEstado);
router.delete("/:id", requireRole("admin", "coordinador"), c.eliminar);

module.exports = router;
