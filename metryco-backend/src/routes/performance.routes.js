const { Router } = require("express");
const auth = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");
const validate = require("../middleware/validate");
const { crearPerformanceSchema, actualizarPerformanceSchema } = require("../schemas/performance.schema");
const c = require("../controllers/performance.controller");

const router = Router();
router.use(auth);

router.get("/", c.listar);
router.post("/calcular-punto", c.calcularPunto);
router.get("/:id", c.obtener);
// Igual que Patrones: administrar el catálogo es de admin/coordinador/técnico;
// ventas solo lo consulta al armar una asignación.
router.post("/", requireRole("admin", "coordinador", "tecnico"), validate(crearPerformanceSchema), c.crear);
router.put("/:id", requireRole("admin", "coordinador", "tecnico"), validate(actualizarPerformanceSchema), c.actualizar);
router.delete("/:id", requireRole("admin", "coordinador"), c.eliminar);

module.exports = router;
