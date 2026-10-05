/**
 * Adaptador de PAC para Dinvbox (https://dinvbox.mx) — API SOAP.
 *
 * Confirmado contra su sandbox real (https://wsdemo.dinvbox.mx) con
 * credenciales de prueba públicas y el CSD de pruebas oficial del SAT
 * (EKU9003173C9): timbrado exitoso de punta a punta, con UUID real
 * devuelto. Ver docs/FACTURACION.md para el detalle de la investigación.
 *
 * Particularidades de Dinvbox frente a otros PAC (Facturama/SW/Finkok, que
 * firman ellos mismos al recibir el XML sin sello):
 *   1. En modo XML, Dinvbox EXIGE que el CFDI llegue ya firmado con el CSD
 *      del emisor — por eso este adaptador firma localmente antes de
 *      mandarlo (ver cfdiSigner.js). No es una elección de diseño nuestra,
 *      es un requisito documentado y confirmado empíricamente de Dinvbox.
 *   2. La cancelación es ASÍNCRONA: `requestCancelarCFDI` solo confirma que
 *      el UUID quedó en una cola, la cancelación real tarda 2-3 minutos y
 *      hay que confirmarla después con `consultarEstatusCFDI`. Por eso
 *      `cancelarFactura` regresa `estatus: "en_cola"` en vez de un estatus
 *      final — cfdi.service.js debe tratar eso como pendiente, no como
 *      cancelado.
 *   3. El WSDL que publica Dinvbox declara los parámetros como "request"
 *      (xsd:anyType) pero el formato real que aceptan usa "param0" — por
 *      eso este adaptador arma el sobre SOAP a mano (fetch) en vez de usar
 *      una librería de cliente SOAP genérica basada en el WSDL, que arma el
 *      sobre mal y el servicio lo rechaza con "Error en la sección de
 *      encabezado".
 */
const cfdiBuilder = require("../../cfdiBuilder");
const cfdiSigner = require("../../cfdiSigner");
const PacProvider = require("../PacProvider");
const PacError = require("../PacError");

const MOTIVOS_TEXTO_ERROR = {
  ECONNREFUSED: "No se pudo conectar con Dinvbox (red/servidor caído)",
  ETIMEDOUT: "Dinvbox no respondió a tiempo",
};

function extraerValorFault(xml, tag) {
  const m = xml.match(new RegExp(`<env:${tag}>[\\s\\S]*?<env:Value>([^<]*)</env:Value>`));
  if (m) return m[1];
  const m2 = xml.match(new RegExp(`<env:${tag}>[\\s\\S]*?<env:Text>([^<]*)</env:Text>`));
  return m2 ? m2[1] : null;
}

class DinvboxProvider extends PacProvider {
  constructor(config) {
    super();
    this.userId = config.apiKey;
    this.userPass = config.apiSecret;
    this.baseUrl = config.baseUrl; // ej. https://wsdemo.dinvbox.mx/timbrado/soap
    this.csd = config.csd;
  }

  async _llamarSoap(operacion, paramsXml) {
    const envelope =
      `<?xml version="1.0" encoding="UTF-8"?>` +
      `<env:Envelope xmlns:env="http://www.w3.org/2003/05/soap-envelope">` +
      `<env:Body>` +
      `<ns1:${operacion} env:encodingStyle="http://www.w3.org/2003/05/soap-encoding" xmlns:ns1="${this.baseUrl}">` +
      `<param0 xsi:type="enc:Struct" xmlns:enc="http://www.w3.org/2003/05/soap-encoding" ` +
      `xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">` +
      paramsXml +
      `</param0>` +
      `</ns1:${operacion}>` +
      `</env:Body>` +
      `</env:Envelope>`;

    let respuesta;
    try {
      respuesta = await fetch(this.baseUrl, {
        method: "POST",
        headers: {
          "Content-Type": `application/soap+xml; charset=utf-8; action="${this.baseUrl}#${operacion}"`,
        },
        body: envelope,
      });
    } catch (err) {
      const retryable = err.code === "ECONNREFUSED" || err.code === "ETIMEDOUT" || err.name === "AbortError";
      throw new PacError(MOTIVOS_TEXTO_ERROR[err.code] || `Dinvbox: error de red (${err.message})`, { retryable });
    }

    const texto = await respuesta.text();

    if (texto.includes("<env:Fault>")) {
      const codigo = extraerValorFault(texto, "Code");
      const mensaje = extraerValorFault(texto, "Reason") || "Dinvbox rechazó la solicitud";
      // Errores de red/servidor (5xx sin fault de negocio) sí se reintentan;
      // un fault de negocio (RFC inválido, sello inválido, etc.) nunca — no
      // se arregla solo reintentando.
      throw new PacError(`Dinvbox: ${mensaje}`, { providerCode: codigo, providerMessage: mensaje, retryable: false });
    }

    return texto;
  }

  campoXml(tag) {
    return (texto) => {
      const m = texto.match(new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`));
      return m ? m[1] : null;
    };
  }

  async timbrarFactura(comprobante) {
    const xmlSinFirmar = cfdiBuilder.construirXml(comprobante);
    const { xmlFirmado, cadenaOriginal } = cfdiSigner.firmarCfdi(xmlSinFirmar, this.csd);
    const selloMatch = xmlFirmado.match(/Sello="([^"]*)"/);
    const selloEnviado = selloMatch ? selloMatch[1] : null;

    const paramsXml =
      `<UserPass xsi:type="xsd:string">${escaparXml(this.userPass)}</UserPass>` +
      `<UserID xsi:type="xsd:string">${escaparXml(this.userId)}</UserID>` +
      `<emisorRFC xsi:type="xsd:string">${escaparXml(comprobante.emisor.rfc)}</emisorRFC>` +
      `<text2CFDI xsi:type="xsd:string">${Buffer.from(xmlFirmado).toString("base64")}</text2CFDI>`;

    const respuestaTexto = await this._llamarSoap("requestTimbrarCFDI", paramsXml);

    const xmlB64Match = respuestaTexto.match(/<xml xsi:type="xsd:string">([^<]*)<\/xml>/);
    if (!xmlB64Match) {
      throw new PacError("Dinvbox: la respuesta de timbrado no trae el XML esperado", { retryable: false });
    }
    const xmlTimbrado = Buffer.from(xmlB64Match[1], "base64").toString("utf8");
    const uuid = (xmlTimbrado.match(/UUID="([^"]+)"/) || [])[1];
    const fechaTimbradoStr = (xmlTimbrado.match(/FechaTimbrado="([^"]+)"/) || [])[1];
    const selloSat = (xmlTimbrado.match(/SelloSAT="([^"]+)"/) || [])[1];

    if (!uuid) {
      throw new PacError("Dinvbox: el CFDI timbrado no trae UUID", { retryable: false });
    }

    return {
      uuid,
      xml: xmlTimbrado,
      fechaTimbrado: fechaTimbradoStr ? new Date(fechaTimbradoStr) : new Date(),
      selloSat: selloSat || selloEnviado,
      cadenaOriginal,
    };
  }

  /**
   * OJO: Dinvbox procesa la cancelación en una cola (2-3 minutos) — esta
   * llamada solo confirma que quedó encolada, no que ya está cancelada ante
   * el SAT. `cfdi.service.cancelar` debe tratar `estatus: "en_cola"` como
   * pendiente, no como una cancelación resuelta.
   */
  async cancelarFactura({ uuid, motivoCodigo, folioSustitucion, emisorRfc }) {
    const paramsXml =
      `<UserPass xsi:type="xsd:string">${escaparXml(this.userPass)}</UserPass>` +
      `<UserID xsi:type="xsd:string">${escaparXml(this.userId)}</UserID>` +
      `<emisorRFC xsi:type="xsd:string">${escaparXml(emisorRfc)}</emisorRFC>` +
      `<uuid xsi:type="xsd:string">${escaparXml(uuid)}</uuid>` +
      `<Motivo xsi:type="xsd:string">${escaparXml(motivoCodigo)}</Motivo>` +
      (folioSustitucion ? `<FolioSustitucion xsi:type="xsd:string">${escaparXml(folioSustitucion)}</FolioSustitucion>` : "");

    const respuestaTexto = await this._llamarSoap("requestCancelarCFDI", paramsXml);
    const code = this.campoXml("Code")(respuestaTexto);
    const message = this.campoXml("Message")(respuestaTexto);

    return { estatus: "en_cola", fechaCancelacion: null, acuseXml: null, providerCode: code, providerMessage: message };
  }

  /**
   * PENDIENTE: `consultarEstatusCFDI` no vino en la documentación de Dinvbox
   * que se revisó (a diferencia de requestTimbrarCFDI/requestCancelarCFDI,
   * que sí y están confirmados funcionando contra el sandbox real). Los
   * nombres de campo de abajo son una suposición razonable por analogía con
   * los otros dos métodos, pero AÚN NO se probaron con éxito — al intentarlo
   * responde "FM501 Hace falta el RFC en el request" aunque sí se manda. No
   * bloquea nada: timbrar y cancelar (lo esencial) ya funcionan de punta a
   * punta. Revisar con soporte@dinvbox.mx (o ws@dinvbox.mx) el formato
   * exacto antes de depender de este método en producción.
   * @param {string} uuid
   * @param {string} emisorRfc
   */
  async consultarFactura(uuid, emisorRfc) {
    const paramsXml =
      `<UserPass xsi:type="xsd:string">${escaparXml(this.userPass)}</UserPass>` +
      `<UserID xsi:type="xsd:string">${escaparXml(this.userId)}</UserID>` +
      `<emisorRFC xsi:type="xsd:string">${escaparXml(emisorRfc)}</emisorRFC>` +
      `<uuid xsi:type="xsd:string">${escaparXml(uuid)}</uuid>`;
    const respuestaTexto = await this._llamarSoap("consultarEstatusCFDI", paramsXml);
    const estatus = this.campoXml("Estatus")(respuestaTexto) || this.campoXml("estatus")(respuestaTexto);
    return { estatus: estatus || "desconocido" };
  }

  async obtenerXml() {
    throw new Error("DinvboxProvider.obtenerXml: el XML timbrado ya se guarda localmente al timbrar, no se vuelve a pedir.");
  }

  async obtenerPdf() {
    throw new Error("DinvboxProvider no genera PDF — el sistema genera su propio PDF (ver certificadoPdf.js / cfdiPdf.js).");
  }
}

function escaparXml(valor) {
  return String(valor ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

module.exports = DinvboxProvider;
