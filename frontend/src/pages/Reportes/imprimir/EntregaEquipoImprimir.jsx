import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Box, CircularProgress, Typography } from "@mui/material";
import { obtenerReporteParaImprimir } from "../../../services/reportes";
import { formatDate } from "../../../shared/utils/formatDate";
import PrintLayout from "./PrintLayout";
import { direccionCliente } from "./shared";

function Centro({ children }) {
  return <Box sx={{ minHeight: "100dvh", display: "grid", placeItems: "center", bgcolor: "#fff" }}>{children}</Box>;
}

export default function EntregaEquipoImprimir() {
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
  // Equipos con calibración terminada, listos o ya marcados como entregados.
  const items = asignaciones.filter((a) => a.estados?.calibracion === "terminada");

  return (
    <PrintLayout laboratorio={laboratorio} logo={logo} titulo="COMPROBANTE DE ENTREGA DE EQUIPOS" subtitulo="EQUIPMENT DELIVERY" folio={reporte.folio}>
      <Box sx={{ display: "grid", gridTemplateColumns: "140px 1fr 90px 1fr", rowGap: 0.4, fontSize: 12.5, mb: 1 }}>
        <b>CLIENTE:</b><span>{cliente.nombre || "—"}</span>
        <b>FECHA:</b><span>{formatDate(new Date())}</span>
        <b>DOMICILIO:</b><span>{direccionCliente(cliente) || "—"}</span>
        <b>OC:</b><span>{reporte.ordenCompra || "—"}</span>
      </Box>

      <div className="rep-band">EQUIPOS A ENTREGAR</div>
      {items.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", py: 2 }}>
          Ningún equipo de este reporte tiene la calibración terminada todavía.
        </Typography>
      ) : (
        <table className="rep-table">
          <thead>
            <tr><th>Item</th><th>ID Interno</th><th>Marca</th><th>Modelo</th><th>Serie</th><th>Descripción</th><th>Estado entrega</th></tr>
          </thead>
          <tbody>
            {items.map((a, i) => (
              <tr key={a._id}>
                <td>{i + 1}</td>
                <td>{a.equipo?.idInterno || "—"}</td>
                <td>{a.equipo?.marca || "—"}</td>
                <td>{a.equipo?.modelo || "—"}</td>
                <td>{a.equipo?.serie || "—"}</td>
                <td>{a.equipo?.descripcion || "—"}</td>
                <td>{a.estados?.entrega === "entregado" ? "Entregado" : "Pendiente"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Box sx={{ mt: 3 }}>
        {items.map((a, i) => (
          <Box key={a._id} sx={{ display: "flex", alignItems: "flex-end", gap: 2, fontSize: 11.5, mb: 3 }}>
            <Typography sx={{ fontSize: 11.5, minWidth: 160 }}>
              {i + 1}. {a.equipo?.idInterno} — {a.equipo?.descripcion}
            </Typography>
            <Box sx={{ flex: 1, borderBottom: "1px solid #111", pb: 0.5 }}>Firma Recibe</Box>
            <Box sx={{ width: 120, borderBottom: "1px solid #111", pb: 0.5 }}>Fecha</Box>
          </Box>
        ))}
      </Box>

      <Typography sx={{ fontSize: 10, color: "#888", mt: 3, textAlign: "center" }}>
        {reporte.folio} · generado {formatDate(new Date())}
      </Typography>
    </PrintLayout>
  );
}
