const QRCode = require("qrcode");

const OPCIONES = { errorCorrectionLevel: "M", margin: 1, scale: 8 };

/** PNG (Buffer) del texto/URL dado. */
function pngBuffer(texto, opts = {}) {
  return QRCode.toBuffer(texto, { type: "png", ...OPCIONES, ...opts });
}

/** data URL (base64) para incrustar en HTML/JSON. */
function dataUrl(texto, opts = {}) {
  return QRCode.toDataURL(texto, { ...OPCIONES, ...opts });
}

/** SVG (string) — escala sin perder nitidez, ideal para etiquetas impresas. */
function svg(texto, opts = {}) {
  return QRCode.toString(texto, { type: "svg", ...OPCIONES, ...opts });
}

module.exports = { pngBuffer, dataUrl, svg };
