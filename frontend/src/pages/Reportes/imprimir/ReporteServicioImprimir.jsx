import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Box, CircularProgress, Typography } from "@mui/material";
import { obtenerReporteParaImprimir } from "../../../services/reportes";
import { formatDate } from "../../../shared/utils/formatDate";
import PrintLayout from "./PrintLayout";
import { direccionCliente } from "./shared";
import { firmaUrl } from "../../../services/perfil";

function Centro({ children }) {
  return <Box sx={{ minHeight: "100dvh", display: "grid", placeItems: "center", bgcolor: "#fff" }}>{children}</Box>;
}

const PREGUNTAS = [
  "¿El técnico llegó puntual a realizar el servicio solicitado? – Tiempo de respuesta",
  "¿Cómo considera la calidad del servicio? - Calidad en el servicio recibido",
  "¿Está conforme con el tiempo de entrega del servicio solicitado? – Tiempo de entrega",
  "¿Está satisfecho con el servicio de nuestra empresa? – Satisfacción por el servicio recibido",
  "¿Tiene alguna inconformidad? – Inconformidad",
];

export default function ReporteServicioImprimir() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [estado, setEstado] = useState("cargando");

  useEffect(() => {
    obtenerReporteParaImprimir(id)
      .then((d) => { setData(d); setEstado("ok"); })
      .catch(() => setEstado("error"));
  }, [id]);

  if (estado === "cargando") return <Centro><CircularProgress /></Centro>;
  if (estado === "error" || !data) return <Centro><Typography>No se pudo cargar el reporte.</Typography></Centro>;

  const { reporte, asignaciones, laboratorio, logo } = data;
  const cliente = reporte.cliente || {};

  return (
    <PrintLayout laboratorio={laboratorio} logo={logo} titulo="REPORTE DE SERVICIO" subtitulo="SERVICE REPORT" folio={reporte.folio}>
      <div className="rep-band">INFORMACIÓN DEL CLIENTE</div>
      <Box sx={{ display: "grid", gridTemplateColumns: "110px 1fr 110px 1fr", rowGap: 0.5, fontSize: 12, mb: 1 }}>
        <b>Cliente:</b><span>{cliente.nombre || "—"}</span>
        <b>Requisitor:</b><span>{reporte.contacto?.nombre || "—"}</span>
        <b>Domicilio:</b><span>{direccionCliente(cliente) || "—"}</span>
        <b>Teléfono:</b><span>{reporte.contacto?.telefono || "—"}</span>
        <b>Fecha:</b><span>{formatDate(reporte.fechaRecepcion)}</span>
        <b>Cotización:</b><span>{reporte.cotizacion?.folio || "—"}</span>
        <b>OC:</b><span>{reporte.ordenCompra || "—"}</span>
        <b>Factura:</b><span>{reporte.factura || "—"}</span>
        <b>Comentarios:</b><span style={{ gridColumn: "2 / -1" }}>{reporte.observaciones || "—"}</span>
      </Box>

      <div className="rep-band">INICIO DE SERVICIO</div>
      {asignaciones.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", py: 2 }}>
          Sin equipos asignados todavía.
        </Typography>
      ) : (
        <table className="rep-table">
          <thead><tr><th style={{ width: 50 }}>Cant.</th><th>Marca</th><th>Modelo</th><th>Descripción</th></tr></thead>
          <tbody>
            {asignaciones.map((a) => (
              <tr key={a._id}>
                <td>1</td>
                <td>{a.equipo?.marca || "N/A"}</td>
                <td>{a.equipo?.modelo || "N/A"}</td>
                <td style={{ textAlign: "left" }}>
                  {a.equipo?.descripcion || "—"}{a.equipo?.idInterno ? ` ID: ${a.equipo.idInterno}` : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="rep-band">OBSERVACIONES (ANOTAR)</div>
      <Box sx={{ border: "1px solid #9aa4b2", minHeight: 60, mb: 1 }} />

      <div className="rep-band">EVALUACIÓN DEL SERVICIO</div>
      <Typography sx={{ fontSize: 10.5, mb: 1 }}>
        La siguiente encuesta es importante para nuestra empresa, por favor califique el servicio recibido en general. Gracias.
        Califique de la siguiente manera: 5 Excelente, 4 Bueno, 3 Regular, 2 Puede mejorar y 1 Malo. Nota: los métricos marcados con 1 deberán ser explicados por el cliente.
      </Typography>
      {PREGUNTAS.map((p, i) => (
        <Typography key={i} sx={{ fontSize: 10.5 }}>{i + 1}. {p} – _____</Typography>
      ))}
      <Typography sx={{ fontSize: 10.5, mt: 1 }}>Métricos con calificación de 1:</Typography>
      <Box sx={{ borderBottom: "1px solid #111", height: 18, mb: 3 }} />

      <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 3, fontSize: 11, mb: 3 }}>
        <Box sx={{ borderTop: "1px solid #111", pt: 0.5 }}>Nombre y firma de cliente · Fecha</Box>
        <Box>
          {/* Firma digital de quien generó el reporte, si la subió en su perfil. */}
          <Box sx={{ height: 30, display: "flex", alignItems: "flex-end" }}>
            {reporte.creadoPor?.firmaUrl && (
              <Box component="img" src={firmaUrl(reporte.creadoPor.firmaUrl)} alt="Firma" sx={{ maxHeight: 28, maxWidth: "70%", objectFit: "contain" }} />
            )}
          </Box>
          <Box sx={{ borderTop: "1px solid #111", pt: 0.5 }}>Nombre de recibe METROLOGÍA · Fecha</Box>
        </Box>
      </Box>

      <Typography sx={{ textAlign: "center", fontWeight: 700, fontSize: 11, color: "#0F172A" }}>
        ATENTAMENTE METROLOGÍA
      </Typography>

      <Box sx={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "#888", mt: 3, borderTop: "1px solid #E4E9F2", pt: 1 }}>
        <span>FOR-85 REV1 REPORTE DE SERVICIO</span>
        <span>{reporte.folio}</span>
        <span>Página 1 de 1</span>
      </Box>
    </PrintLayout>
  );
}
