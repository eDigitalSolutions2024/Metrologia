/**
 * Firma digital de un CFDI con el CSD (Certificado de Sello Digital) del
 * laboratorio — necesario para el adaptador de Dinvbox (ver
 * pac/providers/dinvbox.js): a diferencia de otros PAC que firman por su
 * cuenta al recibir el XML sin sello, Dinvbox en modo XML exige que el
 * comprobante llegue YA firmado (confirmado contra su documentación real y
 * probado contra su sandbox — ver docs/FACTURACION.md).
 *
 * Usa el mismo algoritmo que exige el SAT: la "cadena original" se calcula
 * con la hoja de estilo XSLT OFICIAL del SAT (Anexo 20) vía @cfdi/transform
 * — nunca se reconstruye a mano, porque un solo carácter distinto invalida
 * el sello. El sello es RSA-SHA256 sobre esa cadena, con la llave privada
 * del CSD (@nodecfdi/credentials, librería madura del ecosistema NodeCfdi).
 *
 * Las hojas XSLT están vendidas dentro del repo (src/assets/sat-xslt/)
 * porque @cfdi/transform las necesita como archivos LOCALES (no las
 * descarga en tiempo de ejecución) — son las mismas que publica el SAT en
 * sat.gob.mx, sin ninguna modificación.
 */
const fs = require("fs");
const path = require("path");
const { Credential } = require("@nodecfdi/credentials");
const { parseXslt, generateCadenaOriginal } = require("@cfdi/transform");
const AppError = require("../utils/AppError");

const XSLT_PRINCIPAL = path.join(
  __dirname, "../assets/sat-xslt/www.sat.gob.mx/sitio_internet/cfd/4/cadenaoriginal_4_0/cadenaoriginal_4_0.xslt"
);

let registryCache = null;
function obtenerRegistryXslt() {
  if (!registryCache) registryCache = parseXslt(XSLT_PRINCIPAL);
  return registryCache;
}

/**
 * Carga el CSD del laboratorio desde archivos en disco. Rutas y contraseña
 * vienen de variables de entorno (ver pac.config.js) — nunca se hardcodean
 * ni se suben al repositorio (los .cer/.key reales van fuera de git).
 */
function cargarCredencial({ cerRuta, keyRuta, password }) {
  if (!cerRuta || !keyRuta || !password) {
    throw new AppError(
      "Faltan las variables de entorno del CSD (DINVBOX_CSD_CER, DINVBOX_CSD_KEY, DINVBOX_CSD_PASSWORD) para poder firmar el CFDI.",
      409
    );
  }
  if (!fs.existsSync(cerRuta) || !fs.existsSync(keyRuta)) {
    throw new AppError(`No se encontró el archivo del CSD en la ruta configurada (${cerRuta} / ${keyRuta}).`, 409);
  }
  try {
    const cer = fs.readFileSync(cerRuta, "binary");
    const key = fs.readFileSync(keyRuta, "binary");
    return Credential.create(cer, key, password);
  } catch (err) {
    throw new AppError(`No se pudo abrir el CSD (¿contraseña incorrecta?): ${err.message}`, 409);
  }
}

/**
 * Firma un CFDI 4.0 sin timbrar (el que arma cfdiBuilder.construirXml) con
 * el CSD indicado. Inserta Certificado/NoCertificado antes de calcular la
 * cadena original (son parte de lo que se firma) y el Sello al final.
 * @param {string} xmlSinFirmar - XML tal como lo arma cfdiBuilder (sin Sello/Certificado/NoCertificado).
 * @param {{cerRuta: string, keyRuta: string, password: string}} csd
 * @returns {{xmlFirmado: string, rfcFirmante: string, noCertificado: string}}
 */
function firmarCfdi(xmlSinFirmar, csd) {
  const credencial = cargarCredencial(csd);
  const certificado = credencial.certificate();
  const certificadoBase64 = certificado.pem()
    .replace(/-----BEGIN CERTIFICATE-----|-----END CERTIFICATE-----|\r|\n/g, "");
  const noCertificado = certificado.serialNumber().bytes();

  // Certificado/NoCertificado se insertan ANTES de calcular la cadena
  // original porque el XSLT del SAT los incluye como parte de lo firmado —
  // firmar sin ellos (o insertarlos después) produce un Sello inválido.
  let xmlConCertificado = xmlSinFirmar.replace(
    "<cfdi:Comprobante ",
    `<cfdi:Comprobante NoCertificado="${noCertificado}" Certificado="${certificadoBase64}" `
  );

  const cadenaOriginal = generateCadenaOriginal(xmlConCertificado, obtenerRegistryXslt());
  // La librería de firma (forge, por debajo) trata el string como una
  // "cadena binaria" (1 carácter = 1 byte) — si la cadena original trae
  // acentos/ñ (nombres reales de clientes o del laboratorio), hay que
  // convertirla primero a sus bytes UTF-8 reales, si no, firma un byte
  // distinto al que el SAT reconstruye al decodificar el XML (UTF-8) y
  // el sello sale inválido. Bug real encontrado y confirmado contra el
  // sandbox de Dinvbox con el nombre real del laboratorio (tiene tildes).
  const cadenaOriginalBytes = Buffer.from(cadenaOriginal, "utf8").toString("binary");
  const selloBinario = credencial.sign(cadenaOriginalBytes);
  const sello = Buffer.from(selloBinario, "binary").toString("base64");

  const xmlFirmado = xmlConCertificado.replace("<cfdi:Comprobante ", `<cfdi:Comprobante Sello="${sello}" `);

  return { xmlFirmado, rfcFirmante: certificado.rfc(), noCertificado, cadenaOriginal };
}

module.exports = { firmarCfdi };
