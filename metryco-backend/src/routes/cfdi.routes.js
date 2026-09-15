const { Router } = require("express");
const auth = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");
const validate = require("../middleware/validate");
const auditar = require("../middleware/auditar");
const { crearCfdiSchema, actualizarCfdiSchema, cancelarCfdiSchema } = require("../schemas/cfdi.schema");
const c = require("../controllers/cfdi.controller");

const router = Router();
router.use(auth);

// Mismo criterio de permisos que Cobranza (cobranza.routes.js): cualquier
// autenticado consulta, solo Admin/Coordinador administra comprobantes.
router.get("/", c.listar);
router.get("/:id", c.obtener);
router.get("/:id/xml", c.descargarXml);
router.get("/:id/pdf", c.descargarPdf);

router.post("/", requireRole("admin", "coordinador"), validate(crearCfdiSchema), auditar("cfdi_creado", "ComprobanteFiscal"), c.crear);
router.put("/:id", requireRole("admin", "coordinador"), validate(actualizarCfdiSchema), auditar("cfdi_editado", "ComprobanteFiscal"), c.actualizar);
router.post("/:id/timbrar", requireRole("admin", "coordinador"), auditar("cfdi_timbrado", "ComprobanteFiscal"), c.timbrar);
router.post("/:id/cancelar", requireRole("admin", "coordinador"), validate(cancelarCfdiSchema), auditar("cfdi_cancelado", "ComprobanteFiscal"), c.cancelar);

module.exports = router;
