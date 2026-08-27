const { Router } = require("express");
const auth = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");
const actividadController = require("../controllers/actividad.controller");

const router = Router();

router.use(auth);

router.get("/", actividadController.listar);
router.get("/:id", actividadController.obtener);
router.post("/", actividadController.crear);
router.put("/:id", actividadController.actualizar);
router.delete("/:id", requireRole("admin", "coordinador"), actividadController.eliminar);

module.exports = router;
