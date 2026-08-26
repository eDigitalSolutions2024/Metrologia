const { Schema, model } = require("mongoose");

const counterSchema = new Schema({
  _id: { type: String, required: true }, // ej. "cotizacion-2026"
  seq: { type: Number, default: 0 },
});

module.exports = model("Counter", counterSchema);
