const app = require("./app");
const connectDB = require("./config/db");
const { port } = require("./config/env");

async function start() {
  await connectDB();
  app.listen(port, () => {
    console.log(`API de Metryco corriendo en http://localhost:${port}`);
  });
}

start().catch((err) => {
  console.error("No se pudo iniciar el servidor:", err.message);
  process.exit(1);
});
