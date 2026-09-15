/**
 * Configuración del proveedor de timbrado (PAC) — TODO viene de variables de
 * entorno, nunca hardcodeado. Mientras no estén configuradas, `configurado`
 * es false y `cfdi.service.js` debe rechazar timbrar con PacNotConfiguredError
 * en vez de simular una respuesta exitosa.
 *
 * PAC_PROVIDER selecciona el adaptador real cuando se conecte uno (ver
 * providers/ — todavía no existe ninguno implementado). Valores esperados a
 * futuro: "facturama" | "sw" | "finkok", según cuál se contrate.
 */
const provider = process.env.PAC_PROVIDER || "";
const apiKey = process.env.PAC_API_KEY || "";
const apiSecret = process.env.PAC_API_SECRET || "";
const baseUrl = process.env.PAC_BASE_URL || "";
const sandbox = (process.env.PAC_SANDBOX ?? "true") !== "false";

const configurado = !!(provider && apiKey && baseUrl);

module.exports = { provider, apiKey, apiSecret, baseUrl, sandbox, configurado };
