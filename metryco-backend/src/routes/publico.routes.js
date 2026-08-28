const { Router } = require("express");
const rateLimit = require("express-rate-limit");
const c = require("../controllers/publico.controller");

// SIN auth: consulta pública del certificado por token opaco.
// Rate limit propio, más estricto que el general.
const publicoLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Demasiadas solicitudes, inténtalo más tarde" },
});

const router = Router();
router.use(publicoLimiter);

router.get("/certificado/:token", c.verificar);
router.get("/certificado/:token/qr.png", c.qr);
router.get("/certificado/:token/pdf", c.pdf);

module.exports = router;
