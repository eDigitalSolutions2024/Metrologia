import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Box, Button, CircularProgress, Typography } from "@mui/material";
import PrintOutlinedIcon from "@mui/icons-material/PrintOutlined";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { previsualizarCertificado } from "../../services/certificados";
import HojaCertificado from "./HojaCertificado";
import SelectorIdioma, { useIdiomaCertificado } from "./SelectorIdioma";

// Vista previa de la hoja de un equipo ANTES de que Calidad autorice — se usa
// desde la cola de pendientes (Calidad) para ver cómo se vería el
// certificado sin necesidad de emitirlo todavía. No tiene folio ni QR reales.
export default function InformeCalibracionPreview() {
  const { asignacionId } = useParams();
  const [idioma, setIdioma] = useIdiomaCertificado();
  const [cert, setCert] = useState(null);
  const [estado, setEstado] = useState("cargando");

  useEffect(() => {
    previsualizarCertificado(asignacionId)
      .then((c) => { setCert(c); setEstado("ok"); })
      .catch(() => setEstado("error"));
  }, [asignacionId]);

  if (estado === "cargando") return <Centro><CircularProgress /></Centro>;
  if (estado === "error" || !cert) return <Centro><Typography>No se pudo cargar la vista previa.</Typography></Centro>;

  return (
    <Box sx={{ bgcolor: "#fff", minHeight: "100dvh", color: "#111" }}>
      <Box
        className="no-print"
        sx={{
          position: "sticky", top: 0, zIndex: 10, display: "flex", gap: 1.5, alignItems: "center",
          px: 3, py: 1.5, borderBottom: "1px solid #e5e7eb", bgcolor: "#fff",
        }}
      >
        <Button type="button" startIcon={<ArrowBackIcon />} onClick={() => window.close()} size="small" sx={{ color: "#334155", fontWeight: 700, "&:hover": { bgcolor: "#e2e8f0" } }}>Cerrar</Button>
        <Box sx={{ flex: 1 }} />
        <Typography variant="body2" sx={{ color: "#6b7280" }}>
          Vista previa — todavía no autorizada por Calidad
        </Typography>
        <SelectorIdioma idioma={idioma} onChange={setIdioma} />
        <Button type="button" variant="contained" startIcon={<PrintOutlinedIcon />} onClick={() => window.print()} sx={{ bgcolor: "#10265c", color: "#fff", fontWeight: 700, "&:hover": { bgcolor: "#1a3a85" } }}>
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

      <HojaCertificado cert={cert} idioma={idioma} />
    </Box>
  );
}

function Centro({ children }) {
  return (
    <Box sx={{ minHeight: "100dvh", display: "grid", placeItems: "center", bgcolor: "#fff" }}>{children}</Box>
  );
}
