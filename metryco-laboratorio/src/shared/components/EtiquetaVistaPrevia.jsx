import { useState } from "react";
import { Box, Typography, ToggleButtonGroup, ToggleButton, CircularProgress } from "@mui/material";

// Lado más largo de la vista previa a zoom 100% — antes se usaba un factor
// fijo (x3.6) sobre el tamaño real en mm, así que las etiquetas chicas (ej.
// 40×25) salían mucho más pequeñas y difíciles de leer que las grandes.
// Ajustando siempre al mismo tamaño en pantalla, todas se ven igual de
// legibles por default; el zoom manual es solo para acercar más si hace falta.
const OBJETIVO_PX = 300;
const ZOOMS = [1, 1.5, 2];

/** Vista previa de una etiqueta (SVG), con zoom manual y ajuste automático
 * de escala para que sea legible sin importar el tamaño físico elegido.
 * El texto de ayuda debajo (tamaño físico, qué hace el QR, etc.) lo pone
 * quien la usa — varía según sea certificado o equipo/patrón. */
export default function EtiquetaVistaPrevia({ svg, cargando, w, h, children }) {
  const [zoom, setZoom] = useState(1);
  const escalaBase = OBJETIVO_PX / Math.max(w, h);
  const escala = escalaBase * zoom;

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
        <Typography variant="caption" color="text.secondary">Vista previa</Typography>
        <ToggleButtonGroup size="small" value={zoom} exclusive onChange={(_, v) => v && setZoom(v)}>
          {ZOOMS.map((z) => (
            <ToggleButton key={z} value={z} sx={{ px: 1.25, py: 0.15, fontSize: 11, borderRadius: 1.5 }}>
              {Math.round(z * 100)}%
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>
      <Box
        sx={{
          p: 3, display: "flex", justifyContent: "center", alignItems: "center",
          bgcolor: "background.default", borderRadius: 3, border: 1, borderColor: "divider",
          minHeight: 220, maxHeight: 440, overflow: "auto",
        }}
      >
        {cargando || !svg ? (
          <CircularProgress />
        ) : (
          <Box
            sx={{
              width: w * escala, height: h * escala, flexShrink: 0,
              boxShadow: "0 6px 20px rgba(0,0,0,.12)", borderRadius: 1, overflow: "hidden",
              "& svg": { width: "100%", height: "100%" },
            }}
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        )}
      </Box>
      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
        {children}
      </Typography>
    </Box>
  );
}
