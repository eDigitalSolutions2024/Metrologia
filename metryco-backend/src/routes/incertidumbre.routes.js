const { Router } = require("express");
const auth = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");
const c = require("../controllers/incertidumbre.controller");

const router = Router();
router.use(auth);

/* Plantillas / modelos de presupuesto de incertidumbre */
router.get("/modelos", c.listarModelos);
router.get("/modelos/:id", c.obtenerModelo);
router.post("/modelos", c.crearModelo);
router.put("/modelos/:id", c.actualizarModelo);
router.delete("/modelos/:id", requireRole("admin", "coordinador"), c.eliminarModelo);

/* Cálculo determinístico en vivo (no persiste) */
router.post("/preview", c.preview);

/* Asistente virtual — IA de apoyo (nunca calcula el resultado final) */
router.post("/asistente", c.asistir);

/* Cálculos ejecutados (con trazabilidad y versionado) */
router.get("/calculos", c.listarCalculos);
router.get("/calculos/:id", c.obtenerCalculo);
router.post("/calculos", c.crearCalculo);
router.patch("/calculos/:id/recalcular", c.recalcular);
router.patch("/calculos/:id/revisar", c.revisar);
router.patch("/calculos/:id/aprobar", c.aprobar);

module.exports = router;
