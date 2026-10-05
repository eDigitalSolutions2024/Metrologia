const { Router } = require("express");
const auth = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");
const c = require("../controllers/auditoria.controller");

const router = Router();
router.use(auth, requireRole("admin"));

router.get("/", c.listar);

module.exports = router;
