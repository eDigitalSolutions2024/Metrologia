const { Schema, model } = require("mongoose");

const STATUS = ["pendiente", "en_proceso", "completada"];

const actividadSchema = new Schema(
  {
    fechaActividad: { type: Date, required: true },
    fechaLimite: { type: Date, required: true },
    tecnico: { type: Schema.Types.ObjectId, ref: "Usuario", required: true },
    reporte: { type: Schema.Types.ObjectId, ref: "Reporte" },
    horaInicio: { type: String, required: true },
    horaFin: { type: String, required: true },
    actividad: { type: String, required: true, trim: true },
    comentarios: { type: String, trim: true },
    status: { type: String, enum: STATUS, default: "pendiente" },
    creadoPor: { type: Schema.Types.ObjectId, ref: "Usuario" },
  },
  { timestamps: true }
);

actividadSchema.statics.STATUS = STATUS;

module.exports = model("Actividad", actividadSchema);
