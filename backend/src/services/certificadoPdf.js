/**
 * Genera el PDF real del certificado de calibración en el SERVIDOR —
 * necesario para poder adjuntarlo en el recordatorio de WhatsApp (Meta no
 * puede "abrir" la pantalla del navegador). Antes el único "PDF" de un
 * certificado era o (a) el que alguien sube a mano, o (b) la vista
 * imprimible del navegador (`/informe/certificado/:id`, HojaCertificado.jsx)
 * que el usuario convierte a PDF con Ctrl+P — ninguna de las dos existe como
 * archivo generado por el backend.
 *
 * Esta plantilla es una traducción 1:1 de HojaCertificado.jsx (mismos
 * campos, mismo orden, mismos estilos) a HTML/CSS estático, renderizada con
 * un Chromium sin interfaz (Puppeteer) — así el PDF sale visualmente igual
 * al que ya ve el usuario en pantalla, sin duplicar ni reinventar el layout
 * a mano con coordenadas de una librería de PDF de bajo nivel. No depende
 * del frontend ni de una sesión iniciada: todos los datos (incluyendo
 * imágenes de logo/firmas) se incrustan como base64 directamente en el HTML.
 */
const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");
const { uploadsDir } = require("../config/env");
const qr = require("../utils/qr");
const certificadoService = require("./certificado.service");
const { traductor, idiomaValido } = require("./certificadoTextos");

function esc(v) {
  return String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function fmtFecha(fecha) {
  if (!fecha) return "—";
  return new Date(fecha).toLocaleDateString("es-MX", { year: "numeric", month: "2-digit", day: "2-digit" });
}

function sci(x, dp = 1) {
  if (x == null || !Number.isFinite(Number(x))) return "—";
  const [m, e] = Number(x).toExponential(dp).split("e");
  const sign = e[0] === "-" ? "-" : "+";
  const mag = Math.abs(parseInt(e, 10)).toString().padStart(2, "0");
  return `${m}E${sign}${mag}`;
}

function decimalesDe(divMin) {
  if (!divMin) return 4;
  const s = String(divMin);
  const i = s.indexOf(".");
  return i >= 0 ? s.length - i - 1 : 0;
}


/** Lee un archivo local (logo/firma) y lo regresa como data URI, o null si no existe. */
function archivoADataUri(rutaRelativa, mime = "image/png") {
  if (!rutaRelativa) return null;
  const ruta = path.join(uploadsDir, rutaRelativa);
  if (!fs.existsSync(ruta)) return null;
  const b64 = fs.readFileSync(ruta).toString("base64");
  return `data:${mime};base64,${b64}`;
}

function campos(filas) {
  return filas.map(([label, valor]) =>
    `<div class="campo-label">${esc(label)}</div><div class="campo-valor">${esc(valor ?? "—")}</div>`
  ).join("");
}

/** Puerto directo de GraficaCalibracion (HojaCertificado.jsx) a SVG estático. */
function graficaCalibracionSvg(titulo, filas, t) {
  const datos = filas
    .map((p) => ({
      x: p.puntoNominal,
      y: p.errorIndicacion ?? ((p.valorMedido ?? 0) - (p.puntoNominal ?? 0)),
      emp: p.emp,
    }))
    .filter((d) => Number.isFinite(d.x));
  if (datos.length < 2) return "";

  const emp = Math.max(...datos.map((d) => Math.abs(d.emp || 0)), 1e-9);
  const maxY = Math.max(emp, ...datos.map((d) => Math.abs(d.y || 0))) * 1.25 || 1;

  const W = 560, H = 190, padL = 46, padR = 14, padT = 14, padB = 26;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const xAt = (i) => padL + (plotW * i) / (datos.length - 1 || 1);
  const yAt = (v) => padT + plotH / 2 - (v / maxY) * (plotH / 2);

  const empArribaY = yAt(emp), empAbajoY = yAt(-emp), ceroY = yAt(0);
  const puntosSvg = datos.map((d, i) => `${xAt(i)},${yAt(d.y)}`).join(" ");

  const marcasY = [emp, emp / 2, 0, -emp / 2, -emp]
    .map((v) => `<text x="${padL - 5}" y="${yAt(v) + 3}" text-anchor="end" font-size="8" fill="#475569">${v.toFixed(4)}</text>`)
    .join("");
  const puntosCirculos = datos.map((d, i) => `<circle cx="${xAt(i)}" cy="${yAt(d.y)}" r="3" fill="#2563EB"/>`).join("");
  const etiquetasX = datos.map((d, i) => `<text x="${xAt(i)}" y="${H - padB + 14}" text-anchor="middle" font-size="8" fill="#475569">${esc(d.x)}</text>`).join("");

  return `
    <div class="grafica-wrap">
      <div class="grafica-titulo">${esc(t("tituloGrafica"))} · ${esc(titulo)}</div>
      <svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}" style="display:block">
        <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" fill="#fff" stroke="#cbd5e1"/>
        <rect x="${padL}" y="${empArribaY}" width="${plotW}" height="${Math.max(empAbajoY - empArribaY, 0.5)}" fill="#fecaca" opacity="0.35"/>
        <line x1="${padL}" y1="${empArribaY}" x2="${padL + plotW}" y2="${empArribaY}" stroke="#dc2626" stroke-width="1.4"/>
        <line x1="${padL}" y1="${empAbajoY}" x2="${padL + plotW}" y2="${empAbajoY}" stroke="#dc2626" stroke-width="1.4"/>
        <line x1="${padL}" y1="${ceroY}" x2="${padL + plotW}" y2="${ceroY}" stroke="#94a3b8" stroke-width="0.8" stroke-dasharray="3,2"/>
        <line x1="${padL}" y1="${padT}" x2="${padL}" y2="${padT + plotH}" stroke="#334155" stroke-width="1"/>
        ${marcasY}
        <polyline points="${puntosSvg}" fill="none" stroke="#2563EB" stroke-width="1.6"/>
        ${puntosCirculos}
        ${etiquetasX}
        <text x="${padL + plotW / 2}" y="${H - 4}" text-anchor="middle" font-size="8.5" fill="#334155">${esc(t("puntoNominal"))}</text>
        <text x="10" y="${padT - 3}" font-size="8" fill="#dc2626">± EMP</text>
      </svg>
    </div>`;
}

function tablaPatrones(patronesSnapshot, t) {
  if (!patronesSnapshot?.length) return "";
  const filas = patronesSnapshot.map((p) => `
    <tr>
      <td>${esc(p.codigo || "—")}</td>
      <td>${esc(p.numeroCertificado || p.certificadoNo || "—")}</td>
      <td>${esc(p.nombre || "—")}</td>
      <td>${esc(p.modelo || "—")}</td>
      <td>${esc(fmtFecha(p.vencimiento))}</td>
    </tr>`).join("");
  return `
    <div class="banda">${esc(t("secPatrones"))}</div>
    <div class="caja-tabla">
      <table class="rep-table" style="font-size:10.5px">
        <thead><tr><th>${esc(t("thIdPatron"))}</th><th>${esc(t("thTrazable"))}</th><th>${esc(t("thDescripcion"))}</th><th>${esc(t("thModelo"))}</th><th>${esc(t("thVencePatron"))}</th></tr></thead>
        <tbody>${filas}</tbody>
      </table>
    </div>`;
}

function tablaResultados(titulo, filas, dec, t) {
  const CRIT = { pasa: t("critPasa"), no_pasa: t("critNoPasa"), sin_evaluar: "—" };
  const nLecturas = Math.min(10, Math.max(3, ...filas.map((p) => (p.lecturas || []).length)));
  const colsHead = Array.from({ length: nLecturas }, (_, k) => `<th>${k + 1}</th>`).join("");
  const filasHtml = filas.map((p) => {
    const L = p.lecturas || [];
    const lecturasHtml = Array.from({ length: nLecturas }, (_, k) =>
      `<td>${L[k] != null ? Number(L[k]).toFixed(dec) : "—"}</td>`).join("");
    const colorCriterio = p.criterio === "no_pasa" ? "#b91c1c" : "#111";
    return `
      <tr>
        <td class="nom">${esc(p.puntoNominal ?? "—")}</td>
        ${lecturasHtml}
        <td>${p.valorMedido != null ? Number(p.valorMedido).toFixed(dec + 1) : "—"}</td>
        <td>${esc(sci(p.desviacionStd))}</td>
        <td style="font-weight:700;color:${colorCriterio}">${esc(CRIT[p.criterio] || "—")}</td>
        <td>${esc(sci(p.incertidumbreExpandida))}</td>
      </tr>`;
  }).join("");

  return `
    <div class="tabla-resultados">
      <div class="rep-band">${esc(titulo)}</div>
      <table class="rep-table">
        <thead>
          <tr>
            <th>${esc(t("thNominal"))}</th>${colsHead}<th>${esc(t("thPromedio"))}</th><th>${esc(t("thDesv"))}</th><th>${esc(t("thCriterio"))}</th><th>${esc(t("thU"))}</th>
          </tr>
        </thead>
        <tbody>${filasHtml}</tbody>
      </table>
      ${graficaCalibracionSvg(titulo, filas, t)}
    </div>`;
}

/** Arma el HTML completo (independiente, sin llamadas a red) de un certificado. */
function construirHtml(cert, qrDataUrl, idioma) {
  const lang = idiomaValido(idioma);
  const t = traductor(lang);
  const eq = cert.equipoSnapshot || {};
  const cli = cert.clienteSnapshot || {};
  const dec = decimalesDe(eq.divisionMinima);
  const unidad = eq.unidades || cert.puntos?.[0]?.unidad || "";
  const puntos = cert.puntos || [];
  const encontrado = puntos.filter((p) => p.condicion === "encontrado");
  const dejado = puntos.filter((p) => p.condicion === "dejado");
  const unicos = puntos.filter((p) => !p.condicion || p.condicion === "unico");

  const grupos = [];
  if (encontrado.length) grupos.push([t("grpEncontrado"), encontrado]);
  if (dejado.length) grupos.push([t("grpDejado"), dejado]);
  if (unicos.length) grupos.push([encontrado.length || dejado.length ? t("grpResultados") : t("grpResultadosCal"), unicos]);

  const revisor = cert.revisadoPor;
  const autorizador = cert.autorizadoPor;

  const logoDataUri = cert.laboratorio?.logo?.nombreArchivo
    ? archivoADataUri(`logos/${cert.laboratorio.logo.nombreArchivo}`)
    : null;
  const firmaCreador = archivoADataUri(cert.creadoPor?.firmaUrl ? `firmas/${cert.creadoPor.firmaUrl}` : null);
  const firmaRevisor = archivoADataUri(revisor?.id?.firmaUrl ? `firmas/${revisor.id.firmaUrl}` : null);
  const firmaAutorizador = archivoADataUri(autorizador?.id?.firmaUrl ? `firmas/${autorizador.id.firmaUrl}` : null);

  const marcaAguaUri = cert.laboratorio?.marcaAgua?.nombreArchivo
    ? archivoADataUri(`logos/${cert.laboratorio.marcaAgua.nombreArchivo}`)
    : null;
  const esAcreditado = cert.servicio?.tipo === "Acreditado";
  const acreditadoraUri = esAcreditado && cert.laboratorio?.logoAcreditadora?.nombreArchivo
    ? archivoADataUri(`logos/${cert.laboratorio.logoAcreditadora.nombreArchivo}`)
    : null;
  const marcaImg = marcaAguaUri || logoDataUri;
  const watermarkTexto = cert.laboratorio?.nombre || "CERTIFICADO ORIGINAL";
  const watermarkFontSize = Math.min(150, Math.max(72, Math.round(2100 / (watermarkTexto.length || 1))));

  const nombreLab = cert.laboratorio?.nombre || (lang === "en" ? "The laboratory" : "El laboratorio");
  const remarks = cert.laboratorio?.remarks || t("remarksDefault").replaceAll("{lab}", nombreLab);

  const asFound = puntos.some((p) => p.condicion === "encontrado")
    ? (encontrado.every((p) => p.criterio === "pasa") ? t("dentroTol") : t("fueraTol")) : "—";
  const asLeft = puntos.length
    ? (puntos.every((p) => p.criterio !== "no_pasa") ? t("dentroTol") : t("fueraTol")) : "—";

  const bloqueResultados = puntos.length === 0
    ? `<div class="rep-band" style="margin-top:16px">${esc(t("sinPuntos"))}</div>`
    : `
      <div style="page-break-before:always;padding-top:16px">
        <div class="titulo-informe">${esc(t("tituloInforme"))}</div>
        <div class="subtitulo-informe">${esc(t("subtituloInforme"))} · ${esc(cert.folio)}</div>
        <div class="grid-instrumento">
          <b>${esc(t("instrumento"))}</b><span>${esc(eq.descripcion || eq.categoria || "—")}</span>
          <b>${esc(t("alcanceMayus"))}</b><span>${esc(eq.rango || "—")}</span>
          <b>${esc(t("identificacion"))}</b><span style="font-weight:700">${esc(eq.idInterno || "—")}</span>
          <b>${esc(t("resolucionMayus"))}</b><span>${esc(eq.resolucion || eq.divisionMinima || "—")}</span>
        </div>
        ${grupos.map(([titulo, filas]) => tablaResultados(titulo, filas, dec, t)).join("")}
      </div>`;

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #111; margin: 0; }
  .hoja { max-width: 900px; margin: 0 auto; padding: 24px 32px; position: relative; }
  .marca-agua { position: absolute; inset: 0; z-index: 0; display: flex; align-items: center; justify-content: center; overflow: hidden; pointer-events: none; }
  .marca-agua img { width: 90%; max-height: 82%; object-fit: contain; opacity: 0.12; transform: rotate(-16deg); }
  .marca-agua span { transform: rotate(-30deg); white-space: nowrap; font-weight: 800; letter-spacing: .04em; color: rgba(16,38,92,0.10); font-size: ${watermarkFontSize}px; }
  .contenido { position: relative; z-index: 1; }
  .encabezado { display: flex; align-items: center; gap: 12px; border-bottom: 2px solid #10265c; padding-bottom: 8px; margin-bottom: 4px; }
  .encabezado img { width: 42px; height: 42px; object-fit: contain; flex-shrink: 0; }
  .lab-nombre { font-weight: 800; font-size: 17px; color: #10265c; }
  .lab-acred { font-size: 10px; color: #555; }
  .cert-titulo { font-weight: 800; font-size: 15px; color: #10265c; letter-spacing: .03em; text-align: right; }
  .cert-subtitulo { font-size: 10.5px; color: #666; font-style: italic; text-align: right; }
  .folio { text-align: center; font-weight: 800; font-size: 18px; color: #1a9c3e; margin-bottom: 4px; }
  .banda { background: #10265c; color: #fff; font-weight: 700; font-size: 11.5px; letter-spacing: .04em; text-transform: uppercase; padding: 5px 12px; margin-top: 12px; }
  .campos { display: grid; grid-template-columns: 150px 1fr 150px 1fr; row-gap: 4px; column-gap: 8px; font-size: 11.5px; border: 1px solid #cbd5e1; border-top: none; padding: 8px; }
  .campo-label { font-weight: 700; color: #334155; }
  .caja-tabla { border: 1px solid #cbd5e1; border-top: none; }
  .rep-table { width: 100%; border-collapse: collapse; font-size: 11px; }
  .rep-table th, .rep-table td { border: 1px solid #9aa4b2; padding: 3px 6px; text-align: center; }
  .rep-table th { background: #cfd6df; font-weight: 700; }
  .rep-table td.nom { background: #e7ebf0; font-weight: 700; }
  .rep-band { background: #10265c; color: #fff; text-align: center; font-weight: 700; letter-spacing: .05em; padding: 5px; margin: 16px 0 0; font-size: 12px; }
  .remarks { border: 1px solid #cbd5e1; border-top: none; padding: 8px; font-size: 9.5px; color: #334155; text-align: justify; white-space: pre-line; }
  .titulo-informe { font-style: italic; font-weight: 800; font-family: Georgia, serif; font-size: 15px; text-align: center; }
  .subtitulo-informe { font-style: italic; font-family: Georgia, serif; font-size: 11.5px; color: #333; text-align: center; margin-bottom: 8px; }
  .grid-instrumento { display: grid; grid-template-columns: 150px 1fr 90px 1fr; row-gap: 3px; font-size: 12px; margin-bottom: 8px; }
  .tabla-resultados { break-inside: avoid; margin-top: 8px; }
  .grafica-wrap { margin-top: 12px; break-inside: avoid; }
  .grafica-titulo { font-size: 10.5px; font-weight: 700; text-align: center; color: #334155; margin-bottom: 2px; }
  .credits-box { display: flex; gap: 16px; margin-top: 24px; margin-bottom: 8px; align-items: stretch; border: 1px solid #cbd5e1; border-top: none; padding: 16px; }
  .firmas { flex: 1; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 24px; font-size: 11px; }
  .firma-col { text-align: center; }
  .firma-img-wrap { height: 36px; display: flex; align-items: flex-end; justify-content: center; }
  .firma-img-wrap img { max-height: 34px; max-width: 80%; object-fit: contain; }
  .firma-linea { border-top: 1px solid #111; padding-top: 4px; }
  .qr-box { flex-shrink: 0; width: 132px; border-left: 1px dashed #cbd5e1; padding-left: 16px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
  .qr-label { font-size: 8px; font-weight: 800; letter-spacing: .08em; color: #10265c; }
  .qr-circle { margin-top: 4px; padding: 6px; border: 2px solid #10265c; border-radius: 50%; display: grid; place-items: center; transform: rotate(-4deg); }
  .qr-circle img { width: 78px; height: 78px; display: block; }
  .qr-nota { font-size: 7.5px; color: #555; margin-top: 5px; line-height: 1.25; }
  .pie { font-size: 9.5px; color: #888; margin-top: 16px; text-align: center; }
  @page { size: Letter portrait; margin: 14mm; }
</style>
</head>
<body>
  <div class="hoja">
    <div class="marca-agua">
      ${marcaImg ? `<img src="${marcaImg}" alt=""/>` : `<span>${esc(watermarkTexto)}</span>`}
    </div>
    <div class="contenido">
      <div class="encabezado">
        ${logoDataUri ? `<img src="${logoDataUri}" alt="Logo"/>` : ""}
        <div style="flex:1;min-width:0">
          <div class="lab-nombre">${esc(cert.laboratorio?.nombre || "Laboratorio de Metrología")}</div>
          ${cert.laboratorio?.acreditacion && esAcreditado ? `<div class="lab-acred">${esc(t("acreditacion"))} ${esc(cert.laboratorio.acreditacion)}</div>` : ""}
        </div>
        ${acreditadoraUri ? `<img src="${acreditadoraUri}" alt="Acreditadora" style="width:auto;height:46px;max-width:110px"/>` : ""}
        <div style="flex-shrink:0">
          <div class="cert-titulo">${esc(t("tituloCert"))}</div>
          <div class="cert-subtitulo">${esc(t("subtituloCert"))}</div>
        </div>
      </div>
      <div class="folio">${esc(cert.folio)}</div>

      <div class="banda">${esc(t("secCliente"))}</div>
      <div class="campos">${campos([[t("cliente"), cli.nombre], [t("direccion"), cli.direccion]])}</div>

      <div class="banda">${esc(t("secEquipo"))}</div>
      <div class="campos">${campos([
        [t("descripcion"), eq.descripcion || eq.categoria], [t("idInstrumento"), eq.idInterno],
        [t("serie"), eq.serie], [t("unidades"), unidad],
        [t("fabricante"), eq.marca], [t("alcance"), eq.rango],
        [t("modelo"), eq.modelo], [t("resolucion"), eq.resolucion || eq.divisionMinima],
        [t("ubicacion"), eq.localizacion], [t("rangoCal"), eq.rangoCalibracion],
        [t("reporteServicio"), cert.reporte?.folio], [t("rangoUso"), eq.rangoUso],
      ])}</div>

      <div class="banda">${esc(t("secCalibracion"))}</div>
      <div class="campos">${campos([
        [t("motivo"), cert.servicio?.razon], [t("procedimiento"), cert.servicio?.procedimiento],
        [t("tipoServicio"), cert.servicio?.tipo], [t("fechaIngreso"), fmtFecha(cert.fechaIngreso || cert.reporte?.fechaRecepcion)],
        [t("fechaCalibracion"), fmtFecha(cert.fechaCalibracion)], [t("fechaLiberacion"), fmtFecha(cert.fechaEmision)],
        [t("fechaVencimiento"), fmtFecha(cert.vigencia)], [t("temperatura"), cert.condiciones?.temperatura != null ? `${cert.condiciones.temperatura} °C` : "—"],
        [t("comoSeEncontro"), asFound], [t("humedad"), cert.condiciones?.humedad != null ? `${cert.condiciones.humedad} % HR` : "—"],
        [t("comoSeDejo"), asLeft], [t("informeCal"), cert.folio],
        [t("comentarios"), cert.comentarios], ["", ""],
      ])}</div>

      ${tablaPatrones(cert.patronesSnapshot, t)}

      <div class="banda">${esc(t("secObservaciones"))}</div>
      <div class="remarks">${esc(remarks)}</div>

      ${bloqueResultados}

      <div class="banda">${esc(t("secCreditos"))}</div>
      <div class="credits-box">
        <div class="firmas">
          <div class="firma-col">
            <div class="firma-img-wrap">${firmaCreador ? `<img src="${firmaCreador}"/>` : ""}</div>
            <div class="firma-linea"><b>${esc(t("elaboro"))}</b><br/>${esc(cert.creadoPor?.nombre || "—")}</div>
          </div>
          <div class="firma-col">
            <div class="firma-img-wrap">${firmaRevisor ? `<img src="${firmaRevisor}"/>` : ""}</div>
            <div class="firma-linea"><b>${esc(t("aprobTecnica"))}</b><br/>${esc(revisor?.nombre || "—")}</div>
          </div>
          <div class="firma-col">
            <div class="firma-img-wrap">${firmaAutorizador ? `<img src="${firmaAutorizador}"/>` : ""}</div>
            <div class="firma-linea"><b>${esc(t("aseguramiento"))}</b><br/>${esc(autorizador?.nombre || "—")}</div>
          </div>
        </div>
        ${qrDataUrl ? `
        <div class="qr-box">
          <div class="qr-label">${esc(t("selloVerif"))}</div>
          <div class="qr-circle"><img src="${qrDataUrl}"/></div>
          <div class="qr-nota">${esc(t("selloNota"))}</div>
        </div>` : ""}
      </div>

      <div class="pie">
        ${esc(cert.folio)} · ${esc(t("pieEmitido"))} ${fmtFecha(cert.fechaEmision)} · ${esc(t("pieConfianza"))} ${esc(cert.puntos?.[0]?.nivelConfianza || "95,45 %")} ·
        ${esc(cert.laboratorio?.notaCertificado || t("pieNotaDefault"))}
      </div>
    </div>
  </div>
</body>
</html>`;
}

let navegadorPromise = null;
/** Reutiliza una sola instancia de Chromium entre llamadas — abrirlo desde
 * cero tarda ~1-2s cada vez, y este servicio puede llamarse varias veces
 * seguidas (recordatorios masivos, pruebas desde Administración). */
function obtenerNavegador() {
  if (!navegadorPromise) {
    navegadorPromise = puppeteer.launch({ headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox"] });
  }
  return navegadorPromise;
}

/**
 * Genera el PDF del certificado tal como se ve en "Informe de calibración".
 * @returns {Promise<Buffer>}
 */
async function generarPdfCertificado(certificadoId, { idioma = "es" } = {}) {
  const cert = await certificadoService.obtener(certificadoId);
  const qrDataUrl = cert.publicToken
    ? await qr.dataUrl(certificadoService.urlPublica(cert.publicToken))
    : null;

  const html = construirHtml(cert, qrDataUrl, idioma);

  const browser = await obtenerNavegador();
  const page = await browser.newPage();
  try {
    await page.setContent(html, { waitUntil: "load" });
    const buffer = await page.pdf({ format: "Letter", printBackground: true, margin: { top: "14mm", bottom: "14mm", left: "14mm", right: "14mm" } });
    return buffer;
  } finally {
    await page.close();
  }
}

module.exports = { generarPdfCertificado };
