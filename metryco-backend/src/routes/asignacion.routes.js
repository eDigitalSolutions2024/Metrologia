const { Router } = require("express");
const auth = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");
const c = require("../controllers/asignacion.controller");

const router = Router();
router.use(auth);

router.get("/", c.listar);
router.get("/:id", c.obtener);
router.post("/", c.crear);
router.put("/:id", c.actualizar);
router.patch("/:id/estado", c.cambiarEstado); // transición de calibración/entrega/certificado
router.delete("/:id", requireRole("admin", "coordinador"), c.eliminar);

module.exports = router;
