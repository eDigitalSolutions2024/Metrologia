const { Router } = require("express");
const auth = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");
const { logo: subirLogoMiddleware } = require("../middleware/upload");
const auditar = require("../middleware/auditar");
const validate = require("../middleware/validate");
const {
  actualizarLaboratorioSchema, actualizarColoresSchema, actualizarMenuPermisosSchema,
} = require("../schemas/configuracion.schema");
const c = require("../controllers/configuracion.controller");

const router = Router();

// PÚBLICO (sin auth): el logo lo necesita hasta la pantalla de Login, antes
// de que exista una sesión. Debe ir ANTES de `router.use(auth)` de abajo.
router.get("/logo", c.obtenerLogo);
router.get("/colores", c.obtenerColores);

router.use(auth);

// Cualquier usuario autenticado necesita leerlo (el Sidebar lo usa para
// decidir qué mostrar); solo admin lo edita.
router.get("/menu", c.obtenerMenuPermisos);
router.put("/menu", requireRole("admin"), validate(actualizarMenuPermisosSchema), auditar("permisos_menu_actualizados", "Configuracion"), c.actualizarMenuPermisos);

// Solo admin — la usa la pantalla de Administración y los generadores de PDF
// (estos últimos llaman al servicio directo, sin pasar por HTTP).
router.get("/laboratorio", requireRole("admin"), c.obtenerLaboratorio);
router.put("/laboratorio", requireRole("admin"), validate(actualizarLaboratorioSchema), c.actualizarLaboratorio);

router.post("/logo", requireRole("admin"), subirLogoMiddleware, c.subirLogo);
router.delete("/logo", requireRole("admin"), c.eliminarLogo);

router.put("/colores", requireRole("admin"), validate(actualizarColoresSchema), c.actualizarColores);

module.exports = router;
