const { Schema, model } = require("mongoose");

const contactoSchema = new Schema(
  {
    cliente: { type: Schema.Types.ObjectId, ref: "Cliente", required: true },
    nombre: { type: String, required: true, trim: true },
    telefono: { type: String, trim: true },
    correo: { type: String, trim: true },
    status: { type: String, enum: ["activo", "inactivo"], default: "activo" },
    // Marca el contacto sincronizado automáticamente desde el "Contacto
    // Principal" del alta/edición del cliente (Cliente.contacto), para poder
    // mantenerlo actualizado sin duplicarlo cada vez que el cliente se edita.
    esPrincipal: { type: Boolean, default: false },
  },
  { timestamps: true }
);

contactoSchema.index({ cliente: 1 });

module.exports = model("Contacto", contactoSchema);
