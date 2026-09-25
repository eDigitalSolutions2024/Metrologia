/**
 * Envío de mensajes por WhatsApp Business Platform (Meta Cloud API) — hoy
 * solo se usa para el recordatorio de certificados por vencer/vencidos.
 *
 * WhatsApp exige que un mensaje que el NEGOCIO inicia (el cliente no nos
 * escribió primero) use una plantilla pre-aprobada por Meta — no se puede
 * mandar texto libre. Por eso esto siempre llama al endpoint de "template",
 * nunca al de texto plano. Las plantillas se crean y aprueban desde WhatsApp
 * Manager (fuera de este sistema); aquí solo se referencian por nombre.
 *
 * La plantilla `recordatorio_certificado_vencer` se aprobó con un encabezado
 * de documento OBLIGATORIO — WhatsApp no permite que un encabezado sea
 * "opcional": si la plantilla se aprobó con un documento, TODOS los envíos
 * con esa plantilla deben mandar un documento, sin excepción (confirmado
 * contra la API real: intentar mandarla sin documento responde
 * "(#132001) Template name does not exist" mientras está en revisión, y una
 * vez aprobada respondería "missing header component" si se omite). Por eso
 * `enviarRecordatorioCertificado` exige `pdfBuffer` — no hay manera de mandar
 * este recordatorio sin el PDF del certificado adjunto (generado en el
 * momento por certificadoPdf.js, ver certificado.service.enviarRecordatorioWhatsApp).
 *
 * Credenciales en variables de entorno (ver .env.example):
 *   WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_ACCESS_TOKEN, WHATSAPP_API_VERSION,
 *   WHATSAPP_TEMPLATE_RECORDATORIO
 * Mientras no estén configuradas las credenciales, `configurado` es false y
 * `enviarRecordatorioCertificado` rechaza con WhatsAppNotConfiguredError en
 * vez de fallar con un error genérico.
 */
const AppError = require("../utils/AppError");

const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || "";
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN || "";
const API_VERSION = process.env.WHATSAPP_API_VERSION || "v25.0";
const PLANTILLA = process.env.WHATSAPP_TEMPLATE_RECORDATORIO || "recordatorio_certificado_vencer";

const configurado = !!(PHONE_NUMBER_ID && ACCESS_TOKEN);

class WhatsAppNotConfiguredError extends AppError {
  constructor(message) {
    super(message, 409);
    this.code = "WHATSAPP_NOT_CONFIGURED";
  }
}

class WhatsAppError extends AppError {
  constructor(message, providerError) {
    super(message, 502);
    this.code = "WHATSAPP_ERROR";
    this.providerError = providerError;
  }
}

/**
 * Normaliza un teléfono capturado en formato libre (con espacios, guiones,
 * paréntesis, con o sin "+52") al formato E.164 que exige la API de
 * WhatsApp: solo dígitos con código de país, sin "+". Si no trae código de
 * país (10 dígitos, MX), se le antepone "52" — asunción razonable porque
 * hoy todos los clientes del laboratorio son de México, pero si el sistema
 * algún día atiende otros países esto tendría que volverse configurable.
 */
function normalizarTelefono(telefono) {
  const digitos = String(telefono || "").replace(/\D/g, "");
  if (!digitos) return null;
  if (digitos.length === 10) return `52${digitos}`;
  return digitos;
}

function requiereConfigurado() {
  if (!configurado) {
    throw new WhatsAppNotConfiguredError(
      "Faltan WHATSAPP_PHONE_NUMBER_ID / WHATSAPP_ACCESS_TOKEN en el .env del servidor"
    );
  }
}

/**
 * Sube un PDF a los servidores de WhatsApp para poder referenciarlo como
 * encabezado de una plantilla — WhatsApp no acepta adjuntar un archivo
 * directo en el mensaje, primero hay que subirlo y usar el "media id" que
 * regresa. Cada media id es de un solo uso recomendado (aunque Meta lo deja
 * vivo unos días); por eso se sube de nuevo en cada envío en vez de guardar
 * el id para reusarlo.
 * @returns {Promise<string>} media id
 */
async function subirDocumento(buffer, nombreArchivo) {
  const form = new FormData();
  form.append("messaging_product", "whatsapp");
  form.append("file", new Blob([buffer], { type: "application/pdf" }), nombreArchivo);

  const respuesta = await fetch(`https://graph.facebook.com/${API_VERSION}/${PHONE_NUMBER_ID}/media`, {
    method: "POST",
    headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
    body: form,
  });
  const json = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok || !json?.id) {
    throw new WhatsAppError(json?.error?.message || "No se pudo subir el PDF a WhatsApp", json?.error);
  }
  return json.id;
}

/**
 * @param {{telefono: string, nombreCliente: string, folio: string, equipo: string,
 *   vigencia: string, pdfBuffer: Buffer, pdfNombre?: string}} datos
 * @returns {Promise<{whatsappMessageId: string}>}
 */
async function enviarRecordatorioCertificado(datos) {
  requiereConfigurado();

  const telefono = normalizarTelefono(datos.telefono);
  if (!telefono) throw new AppError("El cliente no tiene un teléfono capturado para enviar el WhatsApp", 400);
  if (!datos.pdfBuffer?.length) {
    throw new AppError("No se pudo generar el PDF del certificado para adjuntarlo al WhatsApp.", 400);
  }

  const mediaId = await subirDocumento(datos.pdfBuffer, datos.pdfNombre || `${datos.folio}.pdf`);

  const body = {
    messaging_product: "whatsapp",
    to: telefono,
    type: "template",
    template: {
      name: PLANTILLA,
      language: { code: "es_MX" },
      components: [
        {
          type: "header",
          parameters: [{ type: "document", document: { id: mediaId, filename: datos.pdfNombre || `${datos.folio}.pdf` } }],
        },
        {
          type: "body",
          parameters: [
            { type: "text", text: datos.nombreCliente },
            { type: "text", text: datos.folio },
            { type: "text", text: datos.equipo },
            { type: "text", text: datos.vigencia },
          ],
        },
      ],
    },
  };

  let respuesta;
  try {
    respuesta = await fetch(`https://graph.facebook.com/${API_VERSION}/${PHONE_NUMBER_ID}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${ACCESS_TOKEN}` },
      body: JSON.stringify(body),
    });
  } catch (err) {
    throw new WhatsAppError("No se pudo conectar con WhatsApp (red/timeout)", err.message);
  }

  const json = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok) {
    // Errores típicos aquí: plantilla no aprobada todavía, número de prueba
    // no registrado como destinatario, token vencido, etc. — se propaga el
    // mensaje real de Meta para poder diagnosticar sin adivinar.
    throw new WhatsAppError(
      json?.error?.message || `WhatsApp respondió ${respuesta.status}`,
      json?.error
    );
  }

  return { whatsappMessageId: json?.messages?.[0]?.id || null };
}

module.exports = {
  enviarRecordatorioCertificado, normalizarTelefono, configurado,
  WhatsAppNotConfiguredError, WhatsAppError,
};
