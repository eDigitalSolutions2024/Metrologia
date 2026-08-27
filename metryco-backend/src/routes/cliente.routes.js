const { Router } = require("express");
const auth = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");
const clienteController = require("../controllers/cliente.controller");
const contactoRoutes = require("./contacto.routes");

const router = Router();

router.use(auth);

router.get("/", clienteController.listar);
router.get("/:id", clienteController.obtener);
router.post("/", clienteController.crear);
router.put("/:id", clienteController.actualizar);
router.delete("/:id", requireRole("admin", "coordinador"), clienteController.eliminar);

router.use("/:clienteId/contactos", contactoRoutes);

module.exports = router;
