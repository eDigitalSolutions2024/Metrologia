const { Router } = require("express");
const authController = require("../controllers/auth.controller");
const auth = require("../middleware/auth");

const router = Router();

router.post("/login", authController.login);
router.post("/refresh", authController.refresh);
router.post("/logout", authController.logout);
router.post("/verificar-admin", auth, authController.verificarAdmin);

module.exports = router;
