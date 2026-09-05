const { Router } = require("express");
const auth = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");
const validate = require("../middleware/validate");
const auditar = require("../middleware/auditar");
const { crearEquipoSchema, actualizarEquipoSchema } = require("../schemas/equipo.schema");
const c = require("../controllers/equipo.controller");

const router = Router();
router.use(auth);

router.get("/", c.listar);
router.get("/siguiente-id", c.siguienteId);
router.get("/:id", c.obtener);
router.get("/:id/qr.png", c.qrPng);
router.get("/:id/qr.svg", c.qrSvg);
router.post("/", validate(crearEquipoSchema), c.crear);
router.put("/:id", validate(actualizarEquipoSchema), c.actualizar);
router.delete("/:id", requireRole("admin", "coordinador"), auditar("equipo_eliminado", "Equipo"), c.eliminar);
router.patch("/:id/reactivar", requireRole("admin", "coordinador"), auditar("equipo_reactivado", "Equipo"), c.reactivar);

module.exports = router;
