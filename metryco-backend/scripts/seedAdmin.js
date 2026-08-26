require("dotenv/config");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const Usuario = require("../src/models/Usuario");
const { mongoUri } = require("../src/config/env");

async function run() {
  const usuario = process.env.SEED_ADMIN_USUARIO;
  const password = process.env.SEED_ADMIN_PASSWORD;
  const nombre = process.env.SEED_ADMIN_NOMBRE || "Administrador";
  const email = process.env.SEED_ADMIN_EMAIL;

  if (!usuario || !password || !email) {
    throw new Error(
      "Define SEED_ADMIN_USUARIO, SEED_ADMIN_PASSWORD y SEED_ADMIN_EMAIL en .env antes de correr este script."
    );
  }

  await mongoose.connect(mongoUri);

  const existente = await Usuario.findOne({ usuario: usuario.toLowerCase() });
  if (existente) {
    console.log(`El usuario "${usuario}" ya existe, no se crea de nuevo.`);
    await mongoose.disconnect();
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await Usuario.create({
    nombre,
    usuario: usuario.toLowerCase(),
    email,
    passwordHash,
    rol: "admin",
    status: "activo",
  });

  console.log(`Usuario admin "${usuario}" creado correctamente.`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
