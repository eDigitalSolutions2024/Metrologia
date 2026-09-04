const { Router } = require("express");
const auth = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");
const validate = require("../middleware/validate");
const auditar = require("../middleware/auditar");
const { crearUsuarioSchema, actualizarUsuarioSchema } = require("../schemas/usuario.schema");
const usuarioController = require("../controllers/usuario.controller");

const router = Router();

router.get("/directorio", auth, usuarioController.directorio);

router.use(auth, requireRole("admin"));

router.get("/", usuarioController.listar);
router.get("/:id", usuarioController.obtener);
router.post("/", validate(crearUsuarioSchema), auditar("usuario_creado", "Usuario"), usuarioController.crear);
router.put("/:id", validate(actualizarUsuarioSchema), auditar("usuario_editado", "Usuario"), usuarioController.actualizar);
router.delete("/:id", auditar("usuario_desactivado", "Usuario"), usuarioController.desactivar);
router.patch("/:id/reactivar", auditar("usuario_reactivado", "Usuario"), usuarioController.reactivar);
router.delete("/:id/permanente", auditar("usuario_eliminado", "Usuario"), usuarioController.eliminar);
router.post("/:id/observaciones", usuarioController.agregarObservacion);
router.delete("/:id/observaciones/:obsId", usuarioController.eliminarObservacion);

module.exports = router;
