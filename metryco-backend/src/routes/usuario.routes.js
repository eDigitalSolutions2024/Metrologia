const { Router } = require("express");
const auth = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");
const usuarioController = require("../controllers/usuario.controller");

const router = Router();

router.get("/directorio", auth, usuarioController.directorio);

router.use(auth, requireRole("admin"));

router.get("/", usuarioController.listar);
router.get("/:id", usuarioController.obtener);
router.post("/", usuarioController.crear);
router.put("/:id", usuarioController.actualizar);
router.delete("/:id", usuarioController.desactivar);
router.delete("/:id/permanente", usuarioController.eliminar);
router.post("/:id/observaciones", usuarioController.agregarObservacion);
router.delete("/:id/observaciones/:obsId", usuarioController.eliminarObservacion);

module.exports = router;
