const { Router } = require("express");
const auth = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");
const c = require("../controllers/reporte.controller");

const router = Router();
router.use(auth);

router.get("/", c.listar);
router.get("/:id", c.obtener);
router.post("/", c.crear); // cualquier usuario autenticado puede iniciar un reporte
router.put("/:id", c.actualizar);
router.delete("/:id", requireRole("admin", "coordinador"), c.eliminar);

module.exports = router;
