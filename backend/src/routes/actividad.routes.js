const { Router } = require("express");
const auth = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");
const validate = require("../middleware/validate");
const { crearActividadSchema, actualizarActividadSchema } = require("../schemas/actividad.schema");
const actividadController = require("../controllers/actividad.controller");

const router = Router();

// En el sistema original solo nivel 0 (admin) ve "Actividades" en el menú —
// ni técnico ni ventas lo tienen.
router.use(auth, requireRole("admin", "coordinador"));

router.get("/", actividadController.listar);
router.get("/:id", actividadController.obtener);
router.post("/", validate(crearActividadSchema), actividadController.crear);
router.put("/:id", validate(actualizarActividadSchema), actividadController.actualizar);
router.delete("/:id", requireRole("admin", "coordinador"), actividadController.eliminar);

module.exports = router;
