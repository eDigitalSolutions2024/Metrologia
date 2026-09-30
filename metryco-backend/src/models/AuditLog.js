const { Schema, model } = require("mongoose");

/**
 * Registro de auditoría de seguridad — quién hizo qué y cuándo. Separado del
 * `historial` que ya traen algunos documentos (Certificado, Asignacion, que
 * llevan su propio historial de negocio) porque este es transversal a todo
 * el sistema y pensado para investigar incidentes (intentos de login
 * fallidos, borrados, cambios de permisos), no para mostrarse en pantallas
 * de negocio normales.
 */
const auditLogSchema = new Schema(
  {
    accion: { type: String, required: true, index: true }, // "login_exitoso", "login_fallido", "usuario_eliminado", ...
    entidad: String, // "Usuario", "Equipo", "Configuracion"...
    entidadId: Schema.Types.ObjectId,

    usuario: {
      id: { type: Schema.Types.ObjectId, ref: "Usuario" },
      usuario: String, // se guarda el nombre de usuario aunque no exista/no se resuelva la cuenta (ej. login fallido con usuario inexistente)
      rol: String,
    },

    exito: { type: Boolean, default: true },
    ip: String,
    detalle: Schema.Types.Mixed,

    fecha: { type: Date, default: Date.now, index: true },
  },
  { timestamps: false }
);

module.exports = model("AuditLog", auditLogSchema);
