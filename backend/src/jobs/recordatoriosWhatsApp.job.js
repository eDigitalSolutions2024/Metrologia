/**
 * Recordatorio automático semanal por WhatsApp de certificados por vencer —
 * corre solo, sin que nadie tenga que darle clic al botón manual. Reglas
 * acordadas con el cliente:
 *
 *   - Empieza a mandar cuando faltan 30 días o menos para que venza.
 *   - Se repite cada 7 días exactos mientras siga "por vencer" (nunca antes
 *     de que pase una semana desde el último envío a ese certificado).
 *   - DEJA de mandarse automáticamente en cuanto la vigencia ya pasó (se
 *     vuelve "vencido") — de ahí en adelante, si se quiere seguir avisando,
 *     es manual (botón en Certificados → Por vencer, o el panel de pruebas).
 *
 * No manda nada si WhatsApp no está configurado (ver whatsapp.service.js) —
 * corre igual el job pero no hace ninguna llamada a la API, para no llenar
 * el log de errores en un ambiente donde todavía no se conectó WhatsApp.
 */
const cron = require("node-cron");
const Certificado = require("../models/Certificado");
const whatsappService = require("../services/whatsapp.service");

const DIAS_VENTANA = 30; // empieza a avisar cuando falten esto o menos días
const DIAS_ENTRE_ENVIOS = 7;

/**
 * Ejecuta una pasada del recordatorio — exportado aparte del cron para poder
 * dispararlo manualmente desde Administración ("Ejecutar ahora") sin
 * esperar al horario programado, útil para probar la lógica del lote.
 * @returns {Promise<{revisados: number, enviados: number, errores: number, detalle: Array}>}
 */
async function ejecutarRecordatorios() {
  const resultado = { revisados: 0, enviados: 0, errores: 0, detalle: [] };

  if (!whatsappService.configurado) {
    resultado.detalle.push({ mensaje: "WhatsApp no configurado — no se mandó nada." });
    return resultado;
  }

  const ahora = new Date();
  const limiteVentana = new Date(ahora.getTime() + DIAS_VENTANA * 86400000);
  const limiteReenvio = new Date(ahora.getTime() - DIAS_ENTRE_ENVIOS * 86400000);

  // Solo "por vencer" (vigencia futura dentro de la ventana) — nunca
  // "vencido" (vigencia ya pasada), por la regla de parar al vencer.
  const candidatos = await Certificado.find({
    estado: "vigente",
    vigencia: { $exists: true, $ne: null, $gte: ahora, $lte: limiteVentana },
    $or: [
      { "recordatorioWhatsApp.ultimoEnvio": { $exists: false } },
      { "recordatorioWhatsApp.ultimoEnvio": null },
      { "recordatorioWhatsApp.ultimoEnvio": { $lte: limiteReenvio } },
    ],
  }).populate("cliente", "nombre contacto.telefono");

  for (const cert of candidatos) {
    resultado.revisados++;
    if (!cert.cliente?.contacto?.telefono) continue; // no hay a quién mandarle — se omite en silencio, no es un error del job

    try {
      const equipo = [cert.equipoSnapshot?.idInterno, cert.equipoSnapshot?.descripcion].filter(Boolean).join(" — ") || "equipo";
      const vigenciaTexto = new Date(cert.vigencia).toLocaleDateString("es-MX");
      const pdfBuffer = await require("../services/certificadoPdf").generarPdfCertificado(cert._id);

      await whatsappService.enviarRecordatorioCertificado({
        telefono: cert.cliente.contacto.telefono,
        nombreCliente: cert.cliente.nombre,
        folio: cert.folio,
        equipo,
        vigencia: vigenciaTexto,
        pdfBuffer,
        pdfNombre: `${cert.folio}.pdf`,
      });

      cert.recordatorioWhatsApp = { ultimoEnvio: new Date(), ultimoResultado: "enviado", ultimoError: undefined };
      await cert.save();
      resultado.enviados++;
      resultado.detalle.push({ folio: cert.folio, ok: true });
    } catch (err) {
      cert.recordatorioWhatsApp = { ultimoEnvio: new Date(), ultimoResultado: "error", ultimoError: err.message };
      await cert.save().catch(() => {}); // si ni esto se pudo guardar, no bloquea el resto del lote
      resultado.errores++;
      resultado.detalle.push({ folio: cert.folio, ok: false, error: err.message });
      console.error(`[recordatoriosWhatsApp] Falló el envío de ${cert.folio}:`, err.message);
    }
  }

  return resultado;
}

/** Programa la corrida diaria (9:00 am, hora del servidor) — se llama una vez al iniciar el servidor. */
function iniciarProgramador() {
  cron.schedule("0 9 * * *", () => {
    ejecutarRecordatorios()
      .then((r) => console.log(`[recordatoriosWhatsApp] Revisados: ${r.revisados}, enviados: ${r.enviados}, errores: ${r.errores}`))
      .catch((err) => console.error("[recordatoriosWhatsApp] Falló la corrida programada:", err.message));
  });
}

module.exports = { ejecutarRecordatorios, iniciarProgramador };
