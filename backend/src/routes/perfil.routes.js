const { Router } = require("express");
const auth = require("../middleware/auth");
const validate = require("../middleware/validate");
const auditar = require("../middleware/auditar");
const { fotoPerfil, firma } = require("../middleware/upload");
const { cambiarPasswordSchema } = require("../schemas/perfil.schema");
const c = require("../controllers/perfil.controller");

const router = Router();
router.use(auth); // cualquier usuario autenticado administra SU propio perfil, sin requireRole

router.get("/", c.obtener);
router.get("/colores-avatar", c.coloresDisponibles);
router.get("/actividad", c.actividadReciente);

router.put("/password", validate(cambiarPasswordSchema), auditar("password_cambiada", "Usuario"), c.cambiarPassword);

router.put("/avatar-color", c.elegirColorAvatar);
router.post("/foto", fotoPerfil, c.subirFoto);
router.delete("/foto", c.eliminarFoto);

router.post("/firma", firma, c.subirFirma);
router.delete("/firma", c.eliminarFirma);

module.exports = router;
