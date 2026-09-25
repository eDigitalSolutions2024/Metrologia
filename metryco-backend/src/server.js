const app = require("./app");
const connectDB = require("./config/db");
const { port } = require("./config/env");
const { iniciarProgramador } = require("./jobs/recordatoriosWhatsApp.job");

async function start() {
  await connectDB();
  app.listen(port, () => {
    console.log(`API de Metrología corriendo en http://localhost:${port}`);
  });
  iniciarProgramador();
}

start().catch((err) => {
  console.error("No se pudo iniciar el servidor:", err.message);
  process.exit(1);
});
