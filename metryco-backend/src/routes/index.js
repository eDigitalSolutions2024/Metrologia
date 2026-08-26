const { Router } = require("express");
const authRoutes = require("./auth.routes");
const usuarioRoutes = require("./usuario.routes");
const clienteRoutes = require("./cliente.routes");
const cotizacionRoutes = require("./cotizacion.routes");

const router = Router();

router.get("/health", (req, res) => res.json({ ok: true }));

router.use("/auth", authRoutes);
router.use("/usuarios", usuarioRoutes);
router.use("/clientes", clienteRoutes);
router.use("/cotizaciones", cotizacionRoutes);

module.exports = router;
