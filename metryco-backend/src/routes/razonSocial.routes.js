const { Router } = require("express");
const auth = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");
const c = require("../controllers/razonSocial.controller");

const router = Router();
router.use(auth);

// Cualquiera que cotice necesita elegir la razón social (lectura abierta);
// administrar el catálogo es solo de admin.
router.get("/", c.listar);
router.get("/:id", c.obtener);
router.post("/", requireRole("admin"), c.crear);
router.put("/:id", requireRole("admin"), c.actualizar);
router.delete("/:id", requireRole("admin"), c.eliminar);

module.exports = router;
