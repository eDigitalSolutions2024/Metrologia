const { Router } = require("express");
const auth = require("../middleware/auth");
const cotizacionController = require("../controllers/cotizacion.controller");

const router = Router();

router.use(auth);

router.get("/", cotizacionController.listar);
router.get("/:id", cotizacionController.obtener);
router.post("/", cotizacionController.crear);
router.put("/:id", cotizacionController.actualizar);
router.delete("/:id", cotizacionController.eliminar);

module.exports = router;
