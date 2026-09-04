const { Router } = require("express");
const auth = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");
const validate = require("../middleware/validate");
const auditar = require("../middleware/auditar");
const { crearFacturaSchema } = require("../schemas/factura.schema");
const c = require("../controllers/factura.controller");

const router = Router();
router.use(auth);

// Ventas también consulta (calendario de pagos), pero no administra facturas.
router.get("/", c.listar);

router.post("/", requireRole("admin", "coordinador"), validate(crearFacturaSchema), c.crear);
router.patch("/:id/pagar", requireRole("admin", "coordinador"), auditar("factura_pagada", "Factura"), c.aplicarPago);
router.patch("/:id/reabrir", requireRole("admin", "coordinador"), auditar("factura_reabierta", "Factura"), c.reabrir);
router.delete("/:id", requireRole("admin", "coordinador"), auditar("factura_eliminada", "Factura"), c.eliminar);

module.exports = router;
