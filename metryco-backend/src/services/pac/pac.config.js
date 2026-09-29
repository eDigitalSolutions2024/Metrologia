/**
 * Configuración del proveedor de timbrado (PAC) — TODO viene de variables de
 * entorno, nunca hardcodeado. Mientras no estén configuradas, `configurado`
 * es false y `cfdi.service.js` debe rechazar timbrar con PacNotConfiguredError
 * en vez de simular una respuesta exitosa.
 *
 * PAC_PROVIDER selecciona el adaptador real. Para "dinvbox": apiKey=UserID,
 * apiSecret=UserPass, baseUrl=endpoint SOAP (ver providers/dinvbox.js).
 *
 * csd: solo lo usan los adaptadores que firman ELLOS MISMOS el CFDI antes de
 * mandarlo (Dinvbox en modo XML lo exige — confirmado contra su
 * documentación real, ver docs/FACTURACION.md). Las rutas apuntan a los
 * archivos .cer/.key del CSD del laboratorio, que NUNCA viven dentro del
 * repositorio (ver .gitignore) — ni siquiera los de prueba del SAT.
 */
const provider = process.env.PAC_PROVIDER || "";
const apiKey = process.env.PAC_API_KEY || "";
const apiSecret = process.env.PAC_API_SECRET || "";
const baseUrl = process.env.PAC_BASE_URL || "";
const sandbox = (process.env.PAC_SANDBOX ?? "true") !== "false";

const csd = {
  cerRuta: process.env.PAC_CSD_CER || "",
  keyRuta: process.env.PAC_CSD_KEY || "",
  password: process.env.PAC_CSD_PASSWORD || "",
};

const configurado = !!(provider && apiKey && baseUrl);

module.exports = { provider, apiKey, apiSecret, baseUrl, sandbox, csd, configurado };
