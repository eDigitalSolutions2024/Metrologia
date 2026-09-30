import { useEffect, useState } from "react";
import { Box, Typography } from "@mui/material";
import { formatDate } from "../../shared/utils/formatDate";
import { firmaUrl } from "../../services/perfil";
import { logoUrl } from "../../services/configuracion";
import { fetchQrBlob } from "../../services/certificados";

/* ---------- formateo ---------- */
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
const CRIT = { pasa: "PASO", no_pasa: "NO PASA", sin_evaluar: "—" };

/** Banda de título azul, igual estilo en toda la hoja. */
function Banda({ children }) {
  return (
    <Box sx={{
      bgcolor: "#10265c", color: "#fff", fontWeight: 700, fontSize: 11.5,
      letterSpacing: ".04em", textTransform: "uppercase", px: 1.5, py: 0.6, mt: 1.5,
    }}>
      {children}
    </Box>
  );
}

/** Cuadrícula de campo:valor de 4 columnas (label/valor x2), estilo formulario. */
function Campos({ filas }) {
  return (
    <Box sx={{
      display: "grid", gridTemplateColumns: "150px 1fr 150px 1fr", rowGap: 0.5, columnGap: 1,
      fontSize: 11.5, border: "1px solid #cbd5e1", borderTop: "none", p: 1,
    }}>
      {filas.map(([label, valor], i) => (
        <Box key={i} sx={{ display: "contents" }}>
          <Box sx={{ fontWeight: 700, color: "#334155" }}>{label}</Box>
          <Box>{valor ?? "—"}</Box>
        </Box>
      ))}
    </Box>
  );
}

/** Gráfica de calibración: desviación de cada punto vs. banda de tolerancia (±EMP). */
function GraficaCalibracion({ titulo, filas }) {
  const datos = filas
    .map((p) => ({
      x: p.puntoNominal,
      y: p.errorIndicacion ?? ((p.valorMedido ?? 0) - (p.puntoNominal ?? 0)),
      emp: p.emp,
    }))
    .filter((d) => Number.isFinite(d.x));
  if (datos.length < 2) return null;

  const emp = Math.max(...datos.map((d) => Math.abs(d.emp || 0)), 1e-9);
  const maxY = Math.max(emp, ...datos.map((d) => Math.abs(d.y || 0))) * 1.25 || 1;

  const W = 560, H = 190, padL = 46, padR = 14, padT = 14, padB = 26;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const xAt = (i) => padL + (plotW * i) / (datos.length - 1 || 1);
  const yAt = (v) => padT + plotH / 2 - (v / maxY) * (plotH / 2);

  const empArribaY = yAt(emp), empAbajoY = yAt(-emp), ceroY = yAt(0);
  const puntos = datos.map((d, i) => `${xAt(i)},${yAt(d.y)}`).join(" ");

  return (
    <Box sx={{ mt: 1.5, breakInside: "avoid" }}>
      <Typography sx={{ fontSize: 10.5, fontWeight: 700, textAlign: "center", color: "#334155", mb: 0.3 }}>
        DIAGRAMA DE CALIBRACIÓN · {titulo}
      </Typography>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} style={{ display: "block" }}>
        <rect x={0.5} y={0.5} width={W - 1} height={H - 1} fill="#fff" stroke="#cbd5e1" />
        {/* banda de tolerancia */}
        <rect x={padL} y={empArribaY} width={plotW} height={Math.max(empAbajoY - empArribaY, 0.5)} fill="#fecaca" opacity="0.35" />
        <line x1={padL} y1={empArribaY} x2={padL + plotW} y2={empArribaY} stroke="#dc2626" strokeWidth="1.4" />
        <line x1={padL} y1={empAbajoY} x2={padL + plotW} y2={empAbajoY} stroke="#dc2626" strokeWidth="1.4" />
        <line x1={padL} y1={ceroY} x2={padL + plotW} y2={ceroY} stroke="#94a3b8" strokeWidth="0.8" strokeDasharray="3,2" />
        {/* eje Y */}
        <line x1={padL} y1={padT} x2={padL} y2={padT + plotH} stroke="#334155" strokeWidth="1" />
        {[emp, emp / 2, 0, -emp / 2, -emp].map((v, i) => (
          <text key={i} x={padL - 5} y={yAt(v) + 3} textAnchor="end" fontSize="8" fill="#475569">{v.toFixed(4)}</text>
        ))}
        {/* serie */}
        <polyline points={puntos} fill="none" stroke="#2563EB" strokeWidth="1.6" />
        {datos.map((d, i) => (
          <circle key={i} cx={xAt(i)} cy={yAt(d.y)} r="3" fill="#2563EB" />
        ))}
        {/* eje X */}
        {datos.map((d, i) => (
          <text key={i} x={xAt(i)} y={H - padB + 14} textAnchor="middle" fontSize="8" fill="#475569">{d.x}</text>
        ))}
        <text x={padL + plotW / 2} y={H - 4} textAnchor="middle" fontSize="8.5" fill="#334155">Punto nominal</text>
        <text x={10} y={padT - 3} fontSize="8" fill="#dc2626">± EMP</text>
      </svg>
    </Box>
  );
}

/** Una hoja de certificado, sin la barra de acciones — reutilizable en la
 * vista de un solo certificado y en el PDF combinado por reporte. */
export default function HojaCertificado({ cert, ultima = true }) {
  const [qrDataUrl, setQrDataUrl] = useState("");

  useEffect(() => {
    let cancelado = false;
    // La vista previa no tiene certificado emitido: su _id es "preview-<...>",
    // que no es un ObjectId — pedir su QR devuelve 500. No hay QR en el previo.
    if (!cert?._id || cert.preview) return;
    fetchQrBlob(cert._id, "png")
      .then((blob) => {
        if (cancelado) return;
        const r = new FileReader();
        r.onload = () => !cancelado && setQrDataUrl(r.result);
        r.readAsDataURL(blob);
      })
      .catch(() => {});
    return () => { cancelado = true; };
  }, [cert?._id, cert?.preview]);

  const eq = cert.equipoSnapshot || {};
  const cli = cert.clienteSnapshot || {};
  const dec = decimalesDe(eq.divisionMinima);
  const unidad = eq.unidades || cert.puntos?.[0]?.unidad || "";
  const puntos = cert.puntos || [];
  const encontrado = puntos.filter((p) => p.condicion === "encontrado");
  const dejado = puntos.filter((p) => p.condicion === "dejado");
  const unicos = puntos.filter((p) => !p.condicion || p.condicion === "unico");

  const grupos = [];
  if (encontrado.length) grupos.push(["COMO SE ENCONTRÓ", encontrado]);
  if (dejado.length) grupos.push(["COMO SE DEJÓ", dejado]);
  if (unicos.length) grupos.push([encontrado.length || dejado.length ? "RESULTADOS" : "RESULTADOS DE CALIBRACIÓN", unicos]);

  const revisor = cert.revisadoPor;
  const autorizador = cert.autorizadoPor;

  // Marca de agua: en un certificado emitido usa el LOGOTIPO configurado en
  // Administración → Datos del Laboratorio (así se cambia sin tocar código);
  // si no hay logo, cae a texto con el nombre del laboratorio. La vista previa
  // siempre lleva el texto "VISTA PREVIA".
  const watermarkLogo = !cert.preview && cert.laboratorio?.logo?.nombreArchivo
    ? logoUrl(cert.laboratorio.logo.nombreArchivo)
    : null;
  const watermarkText = cert.preview ? "VISTA PREVIA" : (cert.laboratorio?.nombre || "CERTIFICADO ORIGINAL");

  return (
    <Box sx={{ maxWidth: 900, mx: "auto", px: 4, py: 4, fontFamily: "Arial, Helvetica, sans-serif", breakAfter: ultima ? "auto" : "page", position: "relative", overflow: "hidden" }}>

      {/* ---------- Marca de agua: UNA sola, grande, en diagonal ---------- */}
      <Box
        aria-hidden
        sx={{
          position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none",
          display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden",
          WebkitPrintColorAdjust: "exact", printColorAdjust: "exact",
        }}
      >
        {watermarkLogo ? (
          <Box
            component="img" src={watermarkLogo} alt=""
            sx={{ width: "90%", maxHeight: "82%", objectFit: "contain", opacity: 0.12, transform: "rotate(-16deg)", userSelect: "none" }}
          />
        ) : (
          <Typography
            sx={{
              transform: "rotate(-30deg)", whiteSpace: "nowrap", fontWeight: 800, lineHeight: 1,
              letterSpacing: ".04em", userSelect: "none",
              // grande: una palabra/frase que cruza buena parte de la hoja.
              fontSize: cert.preview ? 150 : Math.min(150, Math.max(72, Math.round(2100 / (watermarkText.length || 1)))),
              color: cert.preview ? "rgba(217,119,6,0.16)" : "rgba(16,38,92,0.10)",
            }}
          >
            {watermarkText}
          </Typography>
        )}
      </Box>

      <Box sx={{ position: "relative", zIndex: 1 }}>

      {/* ---------- Encabezado ---------- */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, borderBottom: "2px solid #10265c", pb: 1, mb: 0.5 }}>
        {cert.laboratorio?.logo?.nombreArchivo && (
          <Box
            component="img"
            src={logoUrl(cert.laboratorio.logo.nombreArchivo)}
            alt="Logo"
            sx={{ width: 42, height: 42, objectFit: "contain", flexShrink: 0 }}
          />
        )}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontWeight: 800, fontSize: 17, color: "#10265c" }}>
            {cert.laboratorio?.nombre || "Laboratorio de Metrología"}
          </Typography>
          {cert.laboratorio?.acreditacion && (
            <Typography sx={{ fontSize: 10, color: "#555" }}>Acreditación {cert.laboratorio.acreditacion}</Typography>
          )}
        </Box>
        <Box sx={{ textAlign: "right", flexShrink: 0 }}>
          <Typography sx={{ fontWeight: 800, fontSize: 15, color: "#10265c", letterSpacing: ".03em" }}>CERTIFICADO DE CALIBRACIÓN</Typography>
          <Typography sx={{ fontSize: 10.5, color: "#666", fontStyle: "italic" }}>Calibration Certificate</Typography>
        </Box>
      </Box>
      <Typography sx={{ textAlign: "center", fontWeight: 800, fontSize: 18, color: cert.preview ? "#b45309" : "#1a9c3e", mb: 0.5 }}>
        {cert.folio}
      </Typography>
      {cert.preview && (
        <Typography sx={{ textAlign: "center", fontSize: 10.5, color: "#b45309", fontWeight: 700, mb: 1 }}>
          VISTA PREVIA — sin folio ni QR hasta que Calidad autorice y se emita el certificado
        </Typography>
      )}

      {/* ---------- Customer Information ---------- */}
      <Banda>Customer Information</Banda>
      <Campos filas={[
        ["Company Name:", cli.nombre],
        ["Address:", cli.direccion],
      ]} />

      {/* ---------- Equipment Information ---------- */}
      <Banda>Equipment Information</Banda>
      <Campos filas={[
        ["Description:", eq.descripcion || eq.categoria],
        ["Instrument ID:", eq.idInterno],
        ["Serial No.:", eq.serie],
        ["Units:", unidad],
        ["Manufacturer:", eq.marca],
        ["Range:", eq.rango],
        ["Model:", eq.modelo],
        ["Resolution:", eq.resolucion || eq.divisionMinima],
        ["Location:", eq.localizacion],
        ["Range Cal.:", eq.rangoCalibracion],
        ["Service Report:", cert.reporte?.folio],
        ["Range Used:", eq.rangoUso],
      ]} />

      {/* ---------- Calibration Information ---------- */}
      <Banda>Calibration Information</Banda>
      <Campos filas={[
        ["Reason of Service:", cert.servicio?.razon],
        ["Procedure:", cert.servicio?.procedimiento],
        ["Type of Service:", cert.servicio?.tipo],
        ["Cal Date:", formatDate(cert.fechaCalibracion)],
        ["As Found:", puntos.some((p) => p.condicion === "encontrado") ? (encontrado.every((p) => p.criterio === "pasa") ? "Dentro de Tolerancia" : "Fuera de Tolerancia") : "—"],
        ["Cal Due:", formatDate(cert.vigencia)],
        ["As Left:", puntos.length ? (puntos.every((p) => p.criterio !== "no_pasa") ? "Dentro de Tolerancia" : "Fuera de Tolerancia") : "—"],
        ["Temperature:", cert.condiciones?.temperatura != null ? `${cert.condiciones.temperatura} °C` : "—"],
        ["Calibration Report:", cert.folio],
        ["Humidity:", cert.condiciones?.humedad != null ? `${cert.condiciones.humedad} % HR` : "—"],
        ["Comments:", cert.comentarios],
        ["", ""],
      ]} />

      {/* ---------- Instrument Used (patrones) ---------- */}
      {cert.patronesSnapshot?.length > 0 && (
        <>
          <Banda>Instrument Used</Banda>
          <Box sx={{ border: "1px solid #cbd5e1", borderTop: "none" }}>
            <table className="rep-table" style={{ fontSize: 10.5 }}>
              <thead>
                <tr>
                  <th>Instrument ID No.</th><th>NIST Traceable #</th><th>Description</th><th>Model#</th><th>Cal Due Date</th>
                </tr>
              </thead>
              <tbody>
                {cert.patronesSnapshot.map((p, i) => (
                  <tr key={i}>
                    <td>{p.codigo || "—"}</td>
                    <td>{p.numeroCertificado || p.certificadoNo || "—"}</td>
                    <td>{p.nombre || "—"}</td>
                    <td>{p.modelo || "—"}</td>
                    <td>{formatDate(p.vencimiento)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Box>
        </>
      )}

      {/* ---------- Remarks (editable desde Admin → Datos del laboratorio) ---------- */}
      <Banda>Remarks</Banda>
      <Box sx={{ border: "1px solid #cbd5e1", borderTop: "none", p: 1, fontSize: 9.5, color: "#334155", textAlign: "justify", whiteSpace: "pre-line" }}>
        {cert.laboratorio?.remarks ||
          `The instrument(s) listed in this certification have been calibrated against standards traceable to N.I.S.T. (National Institute of Standards and Technology) derived from ratio type measurements, or compared to national or internationally recognized consensus standards. A calibration uncertainty ratio of 4:1 was maintained and a K=2 coverage factor with a confidence level of 95%, unless otherwise stated. ${cert.laboratorio?.nombre || "The laboratory"} quality system complies with applicable requirements of ISO/IEC 17025:2017. All results contained within this certification relate only to item(s) calibrated. This calibration report shall not be reproduced except in full and with the written consent of ${cert.laboratorio?.nombre || "the laboratory"}. Decision rule: Simple acceptance / Shared risk.`}
      </Box>

      {/* ---------- página de resultados / gráfica ---------- */}
      {puntos.length === 0 ? (
        <Box className="rep-band" sx={{ mt: 2 }}>SIN PUNTOS DE CALIBRACIÓN LIGADOS</Box>
      ) : (
        <Box sx={{ breakBefore: "page", pt: 2 }}>
          <Typography sx={{ fontStyle: "italic", fontWeight: 800, fontFamily: "Georgia, serif", fontSize: 15, textAlign: "center" }}>
            INFORME DE CALIBRACIÓN
          </Typography>
          <Typography sx={{ fontStyle: "italic", fontFamily: "Georgia, serif", fontSize: 11.5, color: "#333", textAlign: "center", mb: 1 }}>
            CALIBRATION REPORT · {cert.folio}
          </Typography>
          <Box sx={{ display: "grid", gridTemplateColumns: "150px 1fr 90px 1fr", rowGap: 0.4, fontSize: 12, mb: 1 }}>
            <b>INSTRUMENTO:</b><span>{eq.descripcion || eq.categoria || "—"}</span>
            <b>ALCANCE:</b><span>{eq.rango || "—"}</span>
            <b>IDENTIFICACIÓN:</b><span style={{ fontWeight: 700 }}>{eq.idInterno || "—"}</span>
            <b>RESOLUCIÓN:</b><span>{eq.resolucion || eq.divisionMinima || "—"}</span>
          </Box>

          {grupos.map(([titulo, filas]) => {
            // Columnas de lecturas = las que realmente se capturaron (mín. 3,
            // tope 10 para no desbordar la hoja). Antes estaba fijo en 3 y
            // recortaba las lecturas 4+.
            const nLecturas = Math.min(
              10,
              Math.max(3, ...filas.map((p) => (p.lecturas || []).length)),
            );
            const colsLectura = Array.from({ length: nLecturas }, (_, k) => k);
            return (
            <Box key={titulo} sx={{ breakInside: "avoid" }}>
              <div className="rep-band">{titulo}</div>
              <table className="rep-table">
                <thead>
                  <tr>
                    <th>NOMINAL</th>
                    {colsLectura.map((k) => <th key={k}>{k + 1}</th>)}
                    <th>PROMEDIO</th><th>DESVIACIÓN STD</th><th>CRITERIO</th><th>U Expan.</th>
                  </tr>
                </thead>
                <tbody>
                  {filas.map((p, i) => {
                    const L = p.lecturas || [];
                    return (
                      <tr key={i}>
                        <td className="nom">{p.puntoNominal ?? "—"}</td>
                        {colsLectura.map((k) => (
                          <td key={k}>{L[k] != null ? Number(L[k]).toFixed(dec) : "—"}</td>
                        ))}
                        <td>{p.valorMedido != null ? Number(p.valorMedido).toFixed(dec + 1) : "—"}</td>
                        <td>{sci(p.desviacionStd)}</td>
                        <td style={{ fontWeight: 700, color: p.criterio === "no_pasa" ? "#b91c1c" : "#111" }}>
                          {CRIT[p.criterio] || "—"}
                        </td>
                        <td>{sci(p.incertidumbreExpandida)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <GraficaCalibracion titulo={titulo} filas={filas} />
            </Box>
            );
          })}

          <Box className="rep-band" sx={{ mt: 2 }}>
            Factor de conversión 1 in = 25.4 mm
          </Box>
        </Box>
      )}

      {/* ---------- Credits / firmas + sello de verificación ---------- */}
      <Banda>Credits</Banda>
      <Box sx={{ display: "flex", gap: 2, mt: 3, mb: 1, alignItems: "stretch", border: "1px solid #cbd5e1", borderTop: "none", p: 2 }}>
        <Box sx={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 3, fontSize: 11 }}>
          {[
            ["Elaboró", cert.creadoPor?.nombre, cert.creadoPor?.firmaUrl],
            ["Technical Approval", revisor?.nombre, revisor?.id?.firmaUrl],
            ["Quality Assurance", autorizador?.nombre, autorizador?.id?.firmaUrl],
          ].map(([rol, quien, firma]) => (
            <Box key={rol} sx={{ textAlign: "center" }}>
              <Box sx={{ height: 36, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
                {firma && (
                  <Box component="img" src={firmaUrl(firma)} alt="Firma" sx={{ maxHeight: 34, maxWidth: "80%", objectFit: "contain" }} />
                )}
              </Box>
              <Box sx={{ borderTop: "1px solid #111", pt: 0.5 }}>
                <b>{rol}</b><br />{quien || "—"}
              </Box>
            </Box>
          ))}
        </Box>

        {qrDataUrl && (
          <Box
            sx={{
              flexShrink: 0, width: 132, borderLeft: "1px dashed #cbd5e1", pl: 2,
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center",
              WebkitPrintColorAdjust: "exact", printColorAdjust: "exact",
            }}
          >
            <Typography sx={{ fontSize: 8, fontWeight: 800, letterSpacing: ".08em", color: "#10265c" }}>
              SELLO DE VERIFICACIÓN
            </Typography>
            <Box
              sx={{
                mt: 0.5, p: 0.75, border: "2px solid #10265c", borderRadius: "50%",
                display: "grid", placeItems: "center", transform: "rotate(-4deg)",
              }}
            >
              <Box component="img" src={qrDataUrl} alt="QR de verificación en línea" sx={{ width: 78, height: 78, display: "block" }} />
            </Box>
            <Typography sx={{ fontSize: 7.5, color: "#555", mt: 0.6, lineHeight: 1.25 }}>
              Escanea para comprobar la autenticidad de este certificado en línea.
            </Typography>
          </Box>
        )}
      </Box>

      <Typography sx={{ fontSize: 9.5, color: "#888", mt: 2, textAlign: "center" }}>
        {cert.folio} · emitido {formatDate(cert.fechaEmision)} · nivel de confianza {cert.puntos?.[0]?.nivelConfianza || "95,45 %"} ·{" "}
        {cert.laboratorio?.notaCertificado ||
          "método GUM (JCGM 100:2008) — cálculo determinístico. Verificable en línea con el QR del certificado."}
      </Typography>

      </Box>
    </Box>
  );
}
