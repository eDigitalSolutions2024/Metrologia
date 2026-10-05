const { Router } = require("express");
const auth = require("../middleware/auth");
const contactoController = require("../controllers/contacto.controller");

const router = Router({ mergeParams: true });

router.use(auth);

router.get("/", contactoController.listar);
router.post("/", contactoController.crear);
router.put("/:id", contactoController.actualizar);
router.delete("/:id", contactoController.eliminar);

module.exports = router;
