const { Router } = require("express");
const auth = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");
const c = require("../controllers/performance.controller");

const router = Router();
router.use(auth);

router.get("/", c.listar);
router.post("/calcular-punto", c.calcularPunto);
router.get("/:id", c.obtener);
router.post("/", c.crear);
router.put("/:id", c.actualizar);
router.delete("/:id", requireRole("admin", "coordinador"), c.eliminar);

module.exports = router;
