const { Router } = require("express");
const auth = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");
const c = require("../controllers/factura.controller");

const router = Router();
router.use(auth);

// Ventas también consulta (calendario de pagos), pero no administra facturas.
router.get("/", c.listar);

router.post("/", requireRole("admin", "coordinador"), c.crear);
router.patch("/:id/pagar", requireRole("admin", "coordinador"), c.aplicarPago);
router.patch("/:id/reabrir", requireRole("admin", "coordinador"), c.reabrir);
router.delete("/:id", requireRole("admin", "coordinador"), c.eliminar);

module.exports = router;
