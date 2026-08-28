import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Box, Button, CircularProgress, Typography } from "@mui/material";
import PrintOutlinedIcon from "@mui/icons-material/PrintOutlined";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { obtenerCertificado } from "../../services/certificados";
import { formatDate } from "../../shared/utils/formatDate";

/* ---------- formateo estilo informe legacy ---------- */
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

export default function InformeCalibracion() {
  const { id } = useParams();
  const [cert, setCert] = useState(null);
  const [estado, setEstado] = useState("cargando");

  useEffect(() => {
    obtenerCertificado(id)
      .then((c) => { setCert(c); setEstado("ok"); })
      .catch(() => setEstado("error"));
  }, [id]);

  if (estado === "cargando") return <Centro><CircularProgress /></Centro>;
  if (estado === "error" || !cert) return <Centro><Typography>No se pudo cargar el certificado.</Typography></Centro>;

  const eq = cert.equipoSnapshot || {};
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

  return (
    <Box sx={{ bgcolor: "#fff", minHeight: "100dvh", color: "#111" }}>
      {/* Barra de acciones — no se imprime */}
      <Box
        className="no-print"
        sx={{
          position: "sticky", top: 0, zIndex: 10, display: "flex", gap: 1.5, alignItems: "center",
          px: 3, py: 1.5, borderBottom: "1px solid #e5e7eb", bgcolor: "#fff",
        }}
      >
        <Button startIcon={<ArrowBackIcon />} onClick={() => window.close()} size="small">Cerrar</Button>
        <Box sx={{ flex: 1 }} />
        <Typography variant="body2" sx={{ color: "#6b7280" }}>
          Imprimir → destino <b>“Guardar como PDF”</b>, tamaño Carta/A4
        </Typography>
        <Button variant="contained" startIcon={<PrintOutlinedIcon />} onClick={() => window.print()}>
          Imprimir / PDF
        </Button>
      </Box>

      <style>{`
        @page { size: Letter portrait; margin: 14mm; }
        @media print { .no-print { display: none !important; } body { background: #fff; } }
        .rep-table { width: 100%; border-collapse: collapse; font-size: 11px; }
        .rep-table th, .rep-table td { border: 1px solid #9aa4b2; padding: 3px 6px; text-align: center; }
        .rep-table th { background: #cfd6df; font-weight: 700; }
        .rep-table td.nom { background: #e7ebf0; font-weight: 700; }
        .rep-band { background: #10265c; color: #fff; text-align: center; font-weight: 700;
                    letter-spacing: .05em; padding: 5px; margin: 16px 0 0; font-size: 12px; }
      `}</style>

      <Box sx={{ maxWidth: 900, mx: "auto", px: 4, py: 4, fontFamily: "Arial, Helvetica, sans-serif" }}>
        {/* Encabezado */}
        <Box sx={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "start", mb: 1 }}>
          <Box>
            <Typography sx={{ fontWeight: 800, fontSize: 18, color: "#5b2a86" }}>
              {cert.laboratorio?.nombre || "Laboratorio de Metrología"}
            </Typography>
            {cert.laboratorio?.acreditacion && (
              <Typography sx={{ fontSize: 11, color: "#555" }}>Acreditación {cert.laboratorio.acreditacion}</Typography>
            )}
          </Box>
          <Box sx={{ textAlign: "center" }}>
            <Typography sx={{ fontStyle: "italic", fontWeight: 800, fontFamily: "Georgia, serif", fontSize: 17 }}>
              INFORME DE CALIBRACIÓN
            </Typography>
            <Typography sx={{ fontStyle: "italic", fontFamily: "Georgia, serif", fontSize: 13, color: "#333" }}>
              CALIBRATION REPORT
            </Typography>
          </Box>
          <Box />
        </Box>

        <Typography sx={{ textAlign: "center", fontWeight: 800, fontSize: 22, color: "#1a9c3e", my: 2 }}>
          {cert.folio}
        </Typography>

        {/* Datos del instrumento */}
        <Box sx={{ display: "grid", gridTemplateColumns: "150px 1fr 90px 1fr", rowGap: 0.4, fontSize: 12.5, mb: 1 }}>
          <b>INSTRUMENTO:</b><span>{eq.descripcion || eq.categoria || "—"}</span>
          <b>TIPO:</b><span>{eq.subtipo || "—"}</span>
          <b>IDENTIFICACIÓN:</b><span style={{ fontWeight: 700 }}>{eq.idInterno || "—"}</span>
          <span /><span />
          <b>ALCANCE:</b><span>{eq.rango || "—"}</span>
          <span /><span />
          <b>DIV/ MÍNIMA:</b><span>{eq.divisionMinima || "—"}</span>
          <span /><span />
          <b>ACCURACY:</b><span>{eq.accuracy != null ? eq.accuracy : "—"}</span>
          <span /><span />
          <b>UNIDADES:</b><span>{unidad || "—"}</span>
          <span /><span />
        </Box>

        {puntos.length === 0 ? (
          <Box className="rep-band">SIN PUNTOS DE CALIBRACIÓN LIGADOS</Box>
        ) : (
          grupos.map(([titulo, filas]) => (
            <Box key={titulo}>
              <div className="rep-band">{titulo}</div>
              <table className="rep-table">
                <thead>
                  <tr>
                    <th>NOMINAL</th><th>1</th><th>2</th><th>3</th>
                    <th>PROMEDIO</th><th>DESVIACIÓN STD</th><th>CRITERIO</th><th>U Expan.</th>
                  </tr>
                </thead>
                <tbody>
                  {filas.map((p, i) => {
                    const L = p.lecturas || [];
                    return (
                      <tr key={i}>
                        <td className="nom">{p.puntoNominal ?? "—"}</td>
                        {[0, 1, 2].map((k) => (
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
            </Box>
          ))
        )}

        {cert.patronesSnapshot?.length > 0 && (
          <>
            <div className="rep-band">Patrones de referencia utilizados</div>
            <div className="tbl-wrap">
              <table className="rep-table">
                <thead>
                  <tr><th>Código</th><th>Descripción</th><th>Trazabilidad</th><th>N° certificado</th><th>Laboratorio</th><th>Vence</th></tr>
                </thead>
                <tbody>
                  {cert.patronesSnapshot.map((p, i) => (
                    <tr key={i}>
                      <td className="nom">{p.codigo}</td>
                      <td>{p.nombre}</td>
                      <td>{p.trazabilidad || "—"}</td>
                      <td>{p.numeroCertificado || "—"}</td>
                      <td>{p.laboratorio || "—"}</td>
                      <td>{p.vencimiento ? formatDate(p.vencimiento) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        <Box className="rep-band" sx={{ mt: 2 }}>
          Factor de conversión 1 in = 25.4 mm
        </Box>

        {/* Pie */}
        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 3, mt: 5, fontSize: 11.5 }}>
          {[
            ["Elaboró", cert.creadoPor?.nombre, formatDate(cert.fechaCalibracion)],
            ["Revisó", cert.puntos?.[0]?.revisadoPor || "—", ""],
            ["Autorizó (emisión)", "—", formatDate(cert.fechaEmision)],
          ].map(([rol, quien, fecha]) => (
            <Box key={rol} sx={{ textAlign: "center" }}>
              <Box sx={{ borderTop: "1px solid #111", mt: 4, pt: 0.5 }}>
                <b>{rol}</b><br />{quien || "—"}<br />
                <span style={{ color: "#666" }}>{fecha}</span>
              </Box>
            </Box>
          ))}
        </Box>

        <Typography sx={{ fontSize: 10, color: "#888", mt: 3, textAlign: "center" }}>
          {cert.folio} · emitido {formatDate(cert.fechaEmision)} · nivel de confianza {cert.puntos?.[0]?.nivelConfianza || "95,45 %"} ·
          método GUM (JCGM 100:2008) — cálculo determinístico. Verificable en línea con el QR del certificado.
        </Typography>
      </Box>
    </Box>
  );
}

function Centro({ children }) {
  return (
    <Box sx={{ minHeight: "100dvh", display: "grid", placeItems: "center", bgcolor: "#fff" }}>{children}</Box>
  );
}
