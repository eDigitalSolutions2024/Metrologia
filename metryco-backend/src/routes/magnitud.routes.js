const { Router } = require("express");
const auth = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");
const c = require("../controllers/magnitud.controller");

const router = Router();
router.use(auth);

router.get("/", c.listar);
router.get("/:clave", c.obtener);
router.post("/", requireRole("admin", "coordinador"), c.crear);
router.put("/:id", requireRole("admin", "coordinador"), c.actualizar);

module.exports = router;
