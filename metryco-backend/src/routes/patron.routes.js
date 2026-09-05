const { Router } = require("express");
const auth = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");
const { pdfPatron } = require("../middleware/upload");
const validate = require("../middleware/validate");
const auditar = require("../middleware/auditar");
const { crearPatronSchema, actualizarPatronSchema } = require("../schemas/patron.schema");
const c = require("../controllers/patron.controller");

const router = Router();
router.use(auth);

router.get("/", c.listar);
router.get("/por-vencer", c.porVencer);
router.get("/siguiente-codigo", c.siguienteCodigo);
router.get("/:id", c.obtener);
router.get("/:id/certificado", c.descargarCertificado);
router.get("/:id/qr.png", c.qrPng);
router.get("/:id/qr.svg", c.qrSvg);
// Administrar el catálogo de patrones es solo de admin/coordinador (regla del
// sistema legacy: el técnico consulta y usa patrones al calibrar, pero no da
// de alta ni edita el catálogo) — ventas tampoco lo administra, solo consulta.
router.post("/", requireRole("admin", "coordinador"), validate(crearPatronSchema), c.crear);
router.put("/:id", requireRole("admin", "coordinador"), validate(actualizarPatronSchema), c.actualizar);
router.post("/:id/certificado", requireRole("admin", "coordinador"), pdfPatron, c.adjuntarPdf);
router.delete("/:id", requireRole("admin", "coordinador"), auditar("patron_eliminado", "Patron"), c.eliminar);

module.exports = router;
