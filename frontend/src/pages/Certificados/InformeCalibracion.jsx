import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Box, Button, CircularProgress, Typography } from "@mui/material";
import PrintOutlinedIcon from "@mui/icons-material/PrintOutlined";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { obtenerCertificado } from "../../services/certificados";
import HojaCertificado from "./HojaCertificado";

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

      <HojaCertificado cert={cert} />
    </Box>
  );
}

function Centro({ children }) {
  return (
    <Box sx={{ minHeight: "100dvh", display: "grid", placeItems: "center", bgcolor: "#fff" }}>{children}</Box>
  );
}
