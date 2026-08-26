const mongoose = require("mongoose");
const { mongoUri } = require("./env");

async function connectDB() {
  mongoose.connection.on("connected", () => {
    console.log("MongoDB conectado");
  });
  mongoose.connection.on("error", (err) => {
    console.error("Error de conexión a MongoDB:", err.message);
  });

  await mongoose.connect(mongoUri);
}

module.exports = connectDB;
