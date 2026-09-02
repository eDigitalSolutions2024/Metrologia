const { Router } = require("express");
const auth = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");
const { pdfCertificado } = require("../middleware/upload");
const validate = require("../middleware/validate");
const auditar = require("../middleware/auditar");
const { crearPatronSchema, actualizarPatronSchema } = require("../schemas/patron.schema");
const c = require("../controllers/patron.controller");

const router = Router();
router.use(auth);

router.get("/", c.listar);
router.get("/por-vencer", c.porVencer);
router.get("/:id", c.obtener);
router.get("/:id/certificado", c.descargarCertificado);
router.get("/:id/qr.png", c.qrPng);
router.get("/:id/qr.svg", c.qrSvg);
// Administrar el catálogo de patrones es de admin/coordinador/técnico — ventas
// solo los consulta (los necesita al armar una asignación), no los administra.
router.post("/", requireRole("admin", "coordinador", "tecnico"), validate(crearPatronSchema), c.crear);
router.put("/:id", requireRole("admin", "coordinador", "tecnico"), validate(actualizarPatronSchema), c.actualizar);
router.post("/:id/certificado", requireRole("admin", "coordinador", "tecnico"), pdfCertificado, c.adjuntarCertificado);
router.delete("/:id", requireRole("admin", "coordinador"), auditar("patron_eliminado", "Patron"), c.eliminar);

module.exports = router;
