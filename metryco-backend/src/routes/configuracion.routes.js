const { Router } = require("express");
const auth = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");
const c = require("../controllers/configuracion.controller");

const router = Router();
router.use(auth);

// Cualquier usuario autenticado necesita leerlo (el Sidebar lo usa para
// decidir qué mostrar); solo admin lo edita.
router.get("/menu", c.obtenerMenuPermisos);
router.put("/menu", requireRole("admin"), c.actualizarMenuPermisos);

module.exports = router;
