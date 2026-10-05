export const truncarTexto = (s, n) => (s && s.length > n ? s.slice(0, n - 1) + "…" : s || "");

const escaparXml = (s) =>
  String(s ?? "").replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c]));

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

/**
 * Motor de layout para etiquetas QR (unidades mm, viewBox = mm, impresión a
 * escala 1:1). Estructura tipo "membrete":
 *
 *   [ Encabezado — franja completa, todo el ancho, no compite con el QR  ]
 *   [ Folio/ID/descripción...  |  QR  ]  (columna de texto + QR, debajo)
 *
 * El encabezado (nombre del laboratorio) antes vivía apretado en la misma
 * columna angosta que el resto del texto (junto al QR) y se truncaba casi
 * siempre. Ahora tiene su propia franja de ancho completo Y su tamaño se
 * ENCOGE para que el texto quepa completo en una sola línea — solo se
 * trunca como último recurso si ni al tamaño mínimo legible cabe.
 *
 * El resto de las líneas reparten el espacio vertical sobrante en partes
 * iguales (entre márgenes y huecos) para que ninguna etiqueta se vea
 * amontonada arriba ni con huecos sueltos, y el QR se centra verticalmente
 * cuando queda más chico que el alto disponible.
 *
 * @param {number} w ancho de la etiqueta en mm
 * @param {number} h alto de la etiqueta en mm
 * @param {string} qrDataUrl PNG del QR en data URL
 * @param {{texto:string, weight?:number, fill?:string}} [encabezado] línea de
 *   membrete, ancho completo, tamaño automático (nunca se corta salvo casos extremos).
 * @param {{texto:string, peso?:number, weight?:number, fill?:string, truncar?:boolean}[]} filas
 *   líneas de la columna junto al QR, de arriba hacia abajo; `peso` es el
 *   tamaño relativo a la fuente base (1 = normal).
 * @param {{texto:string, fill?:string}} [pie] línea opcional anclada abajo.
 */
// Tamaño mínimo legible al que se deja encoger una línea antes de rendirse
// y truncar — en la presentación más chica (40×25) el nombre del laboratorio
// y la línea de fechas necesitaban ~1.0-1.09mm para caber completos; con el
// piso anterior (1.15mm) se quedaban a un pelo de lograrlo y se cortaban.
const MIN_LEGIBLE = 1.0;

export function construirEtiquetaSVG({ w, h, qrDataUrl, encabezado, filas, pie }) {
  const pad = clamp(w * 0.045, 1.7, 4);

  // --- Encabezado: franja de ancho completo, tamaño "shrink-to-fit" ---
  const anchoEncabezado = w - pad * 2;
  const pesoEncW = (encabezado?.weight ?? 700) >= 700 ? 0.62 : 0.5;
  let encabezadoSvg = "";
  let altoEncabezado = 0;
  if (encabezado?.texto) {
    const tope = clamp(h * 0.095, 1.6, 2.8);
    const largo = encabezado.texto.length;
    const tamanoQueCabe = anchoEncabezado / (largo * pesoEncW);
    const sizeEnc = Math.min(tope, Math.max(MIN_LEGIBLE, tamanoQueCabe));
    const maxChars = Math.max(4, Math.floor(anchoEncabezado / (sizeEnc * pesoEncW)));
    const texto = truncarTexto(encabezado.texto, maxChars);
    const yEnc = pad + sizeEnc * 0.82;
    encabezadoSvg = `<text x="${pad.toFixed(2)}" y="${yEnc.toFixed(2)}" font-family="Inter, Arial, sans-serif" font-size="${sizeEnc.toFixed(2)}" font-weight="${encabezado.weight ?? 700}" fill="${encabezado.fill || "#334155"}">${escaparXml(texto)}</text>`;
    altoEncabezado = sizeEnc * 1.28 + pad * 0.3;
  }

  const topContenido = pad + altoEncabezado;
  const qr = Math.min(h - topContenido - pad, w * 0.46);
  const qrX = w - qr - pad;
  const textW = qrX - pad - 1.3;

  // Fuente base del resto de las líneas: la más grande que quepa razonable
  // (~14 caracteres en negritas, el folio típico) sin invadir el QR.
  const base = clamp(Math.min((h - topContenido) * 0.16, textW / 9.6), 1.8, 4.3);

  // Igual que el encabezado: cada línea intenta primero ENCOGERSE para caber
  // completa (nunca crece por encima de su tamaño normal) — solo se trunca
  // como último recurso si ni al tamaño mínimo legible alcanza.
  const activas = (filas || []).filter((f) => f.texto);
  const conTamano = activas.map((f) => {
    const weight = f.weight ?? 500;
    const anchoChar = weight >= 700 ? 0.62 : 0.5;
    const tamanoNormal = base * (f.peso ?? 1);
    let size = tamanoNormal;
    if (f.truncar !== false) {
      const anchoNecesario = f.texto.length * tamanoNormal * anchoChar;
      if (anchoNecesario > textW) {
        const tamanoQueCabe = textW / (f.texto.length * anchoChar);
        size = Math.max(MIN_LEGIBLE, Math.min(tamanoNormal, tamanoQueCabe));
      }
    }
    const texto =
      f.truncar === false ? f.texto : truncarTexto(f.texto, Math.max(4, Math.floor(textW / (size * anchoChar))));
    return { texto, size, weight, fill: f.fill ?? "#0F172A" };
  });

  const ASCENSO = 0.82;
  const DESCENSO = 0.3;
  const N = conTamano.length;
  const alturaMinima = conTamano.reduce((acc, l) => acc + l.size * (ASCENSO + DESCENSO), 0);
  const altoUtil = h - topContenido - pad - (pie ? base * 0.6 : 0);
  const sobrante = Math.max(0, altoUtil - alturaMinima);
  const hueco = N > 0 ? sobrante / (N + 1) : 0;

  let cursor = topContenido + hueco;
  const lineas = conTamano.map((l) => {
    cursor += l.size * ASCENSO;
    const y = cursor;
    cursor += l.size * DESCENSO + hueco;
    return { ...l, y };
  });

  const textos = lineas
    .map(
      (l) =>
        `<text x="${pad.toFixed(2)}" y="${l.y.toFixed(2)}" font-family="Inter, Arial, sans-serif" font-size="${l.size.toFixed(2)}" font-weight="${l.weight}" fill="${l.fill}">${escaparXml(l.texto)}</text>`
    )
    .join("");

  let pieSvg = "";
  if (pie?.texto) {
    const tamanoNormalPie = base * 0.55;
    const anchoNecesarioPie = pie.texto.length * tamanoNormalPie * 0.5;
    const sizePie = anchoNecesarioPie > textW
      ? Math.max(MIN_LEGIBLE, Math.min(tamanoNormalPie, textW / (pie.texto.length * 0.5)))
      : tamanoNormalPie;
    const textoPie = truncarTexto(pie.texto, Math.max(4, Math.floor(textW / (sizePie * 0.5))));
    pieSvg = `<text x="${pad.toFixed(2)}" y="${(h - pad * 0.65).toFixed(2)}" font-family="Inter, Arial, sans-serif" font-size="${sizePie.toFixed(2)}" font-weight="400" fill="${pie.fill || "#64748B"}">${escaparXml(textoPie)}</text>`;
  }

  // El QR se centra verticalmente en el espacio bajo el encabezado cuando
  // queda más chico que el alto disponible (formatos angostos).
  const qrY = topContenido + Math.max(0, (h - topContenido - pad - qr) / 2);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}mm" height="${h}mm" viewBox="0 0 ${w} ${h}">
  <rect x="0.15" y="0.15" width="${w - 0.3}" height="${h - 0.3}" rx="1.4" fill="#ffffff" stroke="#CBD5E1" stroke-width="0.3"/>
  ${encabezadoSvg}
  ${textos}
  ${pieSvg}
  <image x="${qrX.toFixed(2)}" y="${qrY.toFixed(2)}" width="${qr.toFixed(2)}" height="${qr.toFixed(2)}" href="${qrDataUrl}" />
</svg>`;
}
