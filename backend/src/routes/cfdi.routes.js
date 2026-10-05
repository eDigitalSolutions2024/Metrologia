const { Router } = require("express");
const auth = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");
const validate = require("../middleware/validate");
const auditar = require("../middleware/auditar");
const {
  crearCfdiSchema, actualizarCfdiSchema, cancelarCfdiSchema,
  resolverSolicitudCancelacionSchema, emitirComplementoPagoSchema,
} = require("../schemas/cfdi.schema");
const c = require("../controllers/cfdi.controller");

const router = Router();
router.use(auth);

// Mismo criterio de permisos que Cobranza (cobranza.routes.js): cualquier
// autenticado consulta, solo Admin/Coordinador administra comprobantes.
router.get("/", c.listar);
router.get("/:id", c.obtener);
router.get("/:id/xml-preview", c.previsualizarXml);
router.get("/:id/xml", c.descargarXml);
router.get("/:id/pdf", c.descargarPdf);

router.post("/", requireRole("admin", "coordinador"), validate(crearCfdiSchema), auditar("cfdi_creado", "ComprobanteFiscal"), c.crear);
router.put("/:id", requireRole("admin", "coordinador"), validate(actualizarCfdiSchema), auditar("cfdi_editado", "ComprobanteFiscal"), c.actualizar);
router.delete("/:id", requireRole("admin", "coordinador"), auditar("cfdi_eliminado", "ComprobanteFiscal"), c.eliminar);
router.post("/:id/timbrar", requireRole("admin", "coordinador"), auditar("cfdi_timbrado", "ComprobanteFiscal"), c.timbrar);
router.post("/:id/cancelar", requireRole("admin", "coordinador"), validate(cancelarCfdiSchema), auditar("cfdi_cancelado", "ComprobanteFiscal"), c.cancelar);
router.patch(
  "/:id/cancelacion",
  requireRole("admin", "coordinador"),
  validate(resolverSolicitudCancelacionSchema),
  auditar("cfdi_cancelacion_resuelta", "ComprobanteFiscal"),
  c.resolverSolicitudCancelacion
);
// Confirma manualmente una cancelación que el PAC solo encoló (ver
// cfdi.service.confirmarCancelacionEnProceso) — admin-only porque implica
// que alguien ya verificó el folio como cancelado en el portal del SAT.
router.post(
  "/:id/confirmar-cancelacion",
  requireRole("admin"),
  auditar("cfdi_cancelacion_confirmada", "ComprobanteFiscal"),
  c.confirmarCancelacionEnProceso
);
router.post(
  "/pagos",
  requireRole("admin", "coordinador"),
  validate(emitirComplementoPagoSchema),
  auditar("cfdi_complemento_pago_creado", "ComprobanteFiscal"),
  c.emitirComplementoPago
);

module.exports = router;
