const { Router } = require("express");
const auth = require("../middleware/auth");
const c = require("../controllers/alerta.controller");

const router = Router();
router.use(auth);

router.get("/", c.obtener);

module.exports = router;
