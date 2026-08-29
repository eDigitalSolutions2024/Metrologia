import { Box, Button, Typography } from "@mui/material";
import PrintOutlinedIcon from "@mui/icons-material/PrintOutlined";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

/** Mismo ícono de marca que el sidebar (components/Sidebar/Sidebar.jsx BrandMark). */
function BrandMark({ size = 40 }) {
  const ticks = Array.from({ length: 12 }, (_, i) => {
    const a = (i * 30 * Math.PI) / 180;
    const o = 21;
    const inner = i % 3 === 0 ? 15 : 18;
    return (
      <line
        key={i}
        x1={24 + o * Math.cos(a)} y1={24 + o * Math.sin(a)}
        x2={24 + inner * Math.cos(a)} y2={24 + inner * Math.sin(a)}
        stroke="currentColor" strokeWidth={i % 3 === 0 ? 2 : 1} strokeLinecap="round"
      />
    );
  });
  return (
    <Box component="svg" viewBox="0 0 48 48" sx={{ width: size, height: size, color: "#2563EB", flexShrink: 0 }}>
      <circle cx="24" cy="24" r="22" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.35" />
      <circle cx="24" cy="24" r="12.5" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
      {ticks}
      <line x1="24" y1="24" x2="34" y2="14" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="24" cy="24" r="3.4" fill="currentColor" />
    </Box>
  );
}

/**
 * Layout compartido para los documentos imprimibles de Reportes (Reporte de
 * Servicio, Entrega de Equipo, Entrega de Certificados). Mismo patrón que
 * pages/Certificados/InformeCalibracion.jsx: página React + window.print()
 * ("Guardar como PDF"), sin librería de PDF en el servidor. Usa la marca y
 * la paleta de la app (theme/theme.js: navy #0F172A / azul #2563EB) en vez
 * del morado del formato legacy.
 */
export default function PrintLayout({ laboratorio, titulo, subtitulo, folio, children }) {
  return (
    <Box sx={{ bgcolor: "#fff", minHeight: "100dvh", color: "#111" }}>
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
          Imprimir → destino <b>“Guardar como PDF”</b>, tamaño Carta
        </Typography>
        <Button variant="contained" startIcon={<PrintOutlinedIcon />} onClick={() => window.print()}>
          Imprimir / PDF
        </Button>
      </Box>

      <style>{`
        @page { size: Letter portrait; margin: 14mm; }
        @media print { .no-print { display: none !important; } body { background: #fff; } }
        .rep-table { width: 100%; border-collapse: collapse; font-size: 11px; }
        .rep-table th, .rep-table td { border: 1px solid #9aa4b2; padding: 4px 6px; text-align: center; }
        .rep-table th { background: #E4E9F2; font-weight: 700; color: #0F172A; }
        .rep-band { background: #0F172A; color: #fff; text-align: center; font-weight: 700;
                    letter-spacing: .05em; padding: 5px; margin: 16px 0 8px; font-size: 12px; }
      `}</style>

      <Box sx={{ maxWidth: 900, mx: "auto", px: 4, py: 4, fontFamily: "Arial, Helvetica, sans-serif" }}>
        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5, mb: 1 }}>
          <BrandMark />
          <Box>
            <Typography sx={{ fontWeight: 800, fontSize: 17, color: "#0F172A", letterSpacing: "-0.01em" }}>
              {laboratorio?.nombre || "Metrología · Laboratorio de Calibración"}
            </Typography>
            {laboratorio?.rfc && <Typography sx={{ fontSize: 11, color: "#5B6B7C" }}>RFC {laboratorio.rfc}</Typography>}
            {laboratorio?.domicilio && <Typography sx={{ fontSize: 11, color: "#5B6B7C" }}>{laboratorio.domicilio}</Typography>}
            {laboratorio?.telefono && <Typography sx={{ fontSize: 11, color: "#5B6B7C" }}>Tel. {laboratorio.telefono}</Typography>}
          </Box>
          <Box sx={{ flex: 1 }} />
          <Box sx={{ textAlign: "right" }}>
            <Typography sx={{ fontWeight: 800, fontSize: 15, color: "#2563EB" }}>{titulo}</Typography>
            {subtitulo && <Typography sx={{ fontSize: 11, color: "#5B6B7C" }}>{subtitulo}</Typography>}
          </Box>
        </Box>

        <Box sx={{ border: "1px solid #E4E9F2", borderRadius: 1, textAlign: "center", py: 0.75, my: 1.5 }}>
          <Typography sx={{ fontWeight: 800, fontSize: 18, color: "#0F172A" }}>{folio}</Typography>
        </Box>

        {children}
      </Box>
    </Box>
  );
}
