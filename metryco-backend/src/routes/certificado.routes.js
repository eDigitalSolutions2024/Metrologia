const { Router } = require("express");
const auth = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");
const { pdfCertificado } = require("../middleware/upload");
const c = require("../controllers/certificado.controller");

const router = Router();
router.use(auth);

router.get("/", c.listar);
router.get("/:id", c.obtener);
router.get("/:id/qr.png", c.qrPng);
router.get("/:id/qr.svg", c.qrSvg);
router.get("/:id/pdf", c.descargarPdf);

router.post("/", c.emitir); // emitir (desde asignación o suelto)
router.put("/:id", c.actualizar);
router.patch("/:id/estado", c.cambiarEstado);
router.post("/:id/pdf", pdfCertificado, c.adjuntarPdf);
router.post("/:id/regenerar-token", requireRole("admin", "coordinador"), c.regenerarToken);
router.post("/:id/anular", requireRole("admin", "coordinador"), c.anular);

module.exports = router;
