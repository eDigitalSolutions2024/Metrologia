const crypto = require("crypto");
const PacProvider = require("../PacProvider");
const AppError = require("../../../utils/AppError");
const { construirXml } = require("../../cfdiBuilder");

/**
 * Adaptador de PAC SIMULADO — solo para desarrollo/pruebas manuales en la
 * app real. Genera un UUID falso y un sello falso; NUNCA timbra de verdad
 * ante el SAT y el XML resultante no es válido fiscalmente.
 *
 * Se activa únicamente con PAC_PROVIDER=simulado en variables de entorno
 * (ver pac.config.js y pacFactory.js) — nunca se activa por accidente en
 * producción porque ahí esas variables no estarán definidas así. Es 100%
 * desechable: se borra este archivo y su registro en pacFactory.js el día
 * que se contrate un PAC real, sin tocar el resto del sistema.
 */
class PacSimulado extends PacProvider {
  async timbrarFactura(comprobante) {
    const uuid = crypto.randomUUID().toUpperCase();
    const fechaTimbrado = new Date();
    const selloSat = crypto.randomBytes(48).toString("base64");
    const pad = (n) => String(n).padStart(2, "0");
    const fechaTfd = `${fechaTimbrado.getFullYear()}-${pad(fechaTimbrado.getMonth() + 1)}-${pad(fechaTimbrado.getDate())}T${pad(fechaTimbrado.getHours())}:${pad(fechaTimbrado.getMinutes())}:${pad(fechaTimbrado.getSeconds())}`;

    // El sello/certificado del emisor no existen aquí (no se maneja CSD real
    // — ver docs/FACTURACION.md §10) así que se rellenan con valores falsos
    // solo para que el XML quede bien formado; NO es un timbre fiscal válido.
    const tfd =
      `<cfdi:Complemento><tfd:TimbreFiscalDigital xmlns:tfd="http://www.sat.gob.mx/TimbreFiscalDigital" ` +
      `Version="1.1" UUID="${uuid}" FechaTimbrado="${fechaTfd}" RfcProvCertif="SIM010101000" ` +
      `SelloCFD="SIMULADO" NoCertificadoSAT="00000000000000000000" SelloSAT="${selloSat}"/></cfdi:Complemento>`;

    const xmlSinTimbre = construirXml(comprobante);
    const xml = xmlSinTimbre.replace("</cfdi:Comprobante>", `${tfd}</cfdi:Comprobante>`);

    return { uuid, xml, fechaTimbrado, selloSat, cadenaOriginal: "SIMULADO||CADENA_ORIGINAL_FALSA||" };
  }

  async cancelarFactura({ uuid }) {
    return { estatus: "Cancelado", fechaCancelacion: new Date(), acuseXml: `<Simulado uuid="${uuid}"/>` };
  }

  async consultarFactura(uuid) {
    return { estatus: "Vigente" };
  }

  async obtenerXml(uuid) {
    // No debería llegar aquí en uso normal: obtenerXml() en cfdi.service ya
    // devuelve el XML guardado localmente al timbrar, antes de consultar al PAC.
    throw new AppError("El PAC simulado no puede volver a generar este XML — si se perdió el guardado localmente, no hay forma de recuperarlo en modo simulado.", 409);
  }

  async obtenerPdf(uuid) {
    throw new AppError("Todavía no hay PDF disponible: el PAC simulado no genera PDF y el diseño propio de METRYCO está pendiente de construir. Usa 'Ver XML' mientras tanto.", 409);
  }
}

module.exports = PacSimulado;
