const { Router } = require("express");
const auth = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");
const { pdfCertificado } = require("../middleware/upload");
const auditar = require("../middleware/auditar");
const validate = require("../middleware/validate");
const {
  emitirCertificadoSchema, actualizarCertificadoSchema,
  cambiarEstadoCertificadoSchema, anularCertificadoSchema,
} = require("../schemas/certificado.schema");
const c = require("../controllers/certificado.controller");

const router = Router();
router.use(auth);

router.get("/", c.listar);
router.get("/exportar", c.exportar);
router.get("/por-reporte/:reporteId", c.porReporte);
router.get("/:id", c.obtener);
router.get("/:id/qr.png", c.qrPng);
router.get("/:id/qr.svg", c.qrSvg);
router.get("/:id/pdf", c.descargarPdf);

router.post("/", validate(emitirCertificadoSchema), c.emitir); // emitir (desde asignación o suelto)
router.put("/:id", validate(actualizarCertificadoSchema), c.actualizar);
router.patch("/:id/estado", validate(cambiarEstadoCertificadoSchema), c.cambiarEstado);
router.post("/:id/pdf", pdfCertificado, c.adjuntarPdf);
router.post("/:id/regenerar-token", requireRole("admin", "coordinador"), c.regenerarToken);
router.post("/:id/anular", requireRole("admin", "coordinador"), validate(anularCertificadoSchema), auditar("certificado_anulado", "Certificado"), c.anular);

module.exports = router;
