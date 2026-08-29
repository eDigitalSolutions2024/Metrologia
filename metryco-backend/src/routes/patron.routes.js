const { Router } = require("express");
const auth = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");
const c = require("../controllers/patron.controller");

const router = Router();
router.use(auth);

router.get("/", c.listar);
router.get("/por-vencer", c.porVencer);
router.get("/:id", c.obtener);
// Administrar el catálogo de patrones es de admin/coordinador/técnico — ventas
// solo los consulta (los necesita al armar una asignación), no los administra.
router.post("/", requireRole("admin", "coordinador", "tecnico"), c.crear);
router.put("/:id", requireRole("admin", "coordinador", "tecnico"), c.actualizar);
router.delete("/:id", requireRole("admin", "coordinador"), c.eliminar);

module.exports = router;
