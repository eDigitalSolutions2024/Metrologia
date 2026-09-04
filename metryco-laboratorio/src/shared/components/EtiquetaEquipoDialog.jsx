import { useEffect, useMemo, useRef, useState } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Box, Typography,
  Button, MenuItem, TextField, CircularProgress,
} from "@mui/material";
import PrintOutlinedIcon from "@mui/icons-material/PrintOutlined";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import { formatDateShort } from "../utils/formatDate";

const TAMANOS = [
  { id: "50x30", label: "50 × 30 mm (estándar)", w: 50, h: 30 },
  { id: "40x25", label: "40 × 25 mm (chica)", w: 40, h: 25 },
  { id: "60x40", label: "60 × 40 mm (grande)", w: 60, h: 40 },
  { id: "100x50", label: "100 × 50 mm (ancha)", w: 100, h: 50 },
];

const trunc = (s, n) => (s && s.length > n ? s.slice(0, n - 1) + "…" : s || "");
const esc = (s) =>
  String(s ?? "").replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c]));

/** SVG de la etiqueta en unidades mm (viewBox = mm), lista para imprimir a escala 1:1. */
function construirEtiquetaSVG({ datos, qrDataUrl, w, h }) {
  const pad = w >= 60 ? 3 : 2;
  const qr = h - pad * 2;
  const qrX = w - qr - pad;
  const textW = qrX - pad - 1.5;
  const base = w >= 60 ? 2.9 : 2.4;

  const lineas = [
    { y: pad + base, size: base * 0.72, weight: 700, fill: "#334155", text: trunc(datos.encabezado, Math.floor(textW / (base * 0.42))) },
    { y: pad + base * 2.7, size: base * 1.15, weight: 800, fill: "#0F172A", text: datos.id },
    { y: pad + base * 4.2, size: base * 0.92, weight: 600, fill: "#0F172A", text: trunc(datos.descripcion || "", Math.floor(textW / (base * 0.42))) },
    { y: pad + base * 5.5, size: base * 0.8, weight: 400, fill: "#475569", text: trunc(datos.subdescripcion || "", Math.floor(textW / (base * 0.4))) },
    { y: pad + base * 6.9, size: base * 0.78, weight: 600, fill: "#475569", text: datos.vigenciaTexto || "" },
  ];

  const textos = lineas
    .filter((l) => l.text)
    .map(
      (l) =>
        `<text x="${pad}" y="${l.y.toFixed(2)}" font-family="Inter, Arial, sans-serif" font-size="${l.size.toFixed(2)}" font-weight="${l.weight}" fill="${l.fill}">${esc(l.text)}</text>`
    )
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}mm" height="${h}mm" viewBox="0 0 ${w} ${h}">
  <rect x="0.15" y="0.15" width="${w - 0.3}" height="${h - 0.3}" rx="1.4" fill="#ffffff" stroke="#CBD5E1" stroke-width="0.3"/>
  ${textos}
  <image x="${qrX.toFixed(2)}" y="${pad}" width="${qr.toFixed(2)}" height="${qr.toFixed(2)}" href="${qrDataUrl}" />
</svg>`;
}

async function blobToDataUrl(blob) {
  return new Promise((res) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.readAsDataURL(blob);
  });
}

/** Normaliza Equipo/Patrón a los campos que necesita la etiqueta. */
function normalizar(tipo, item) {
  if (!item) return null;
  if (tipo === "patron") {
    return {
      nombreArchivo: item.codigo,
      encabezado: "Patrón de referencia",
      id: item.codigo,
      descripcion: item.nombre || item.descripcion,
      subdescripcion: [item.marca, item.modelo].filter(Boolean).join(" "),
      vigenciaTexto: (item.calibracion?.vencimiento || item.ultimaCalibracion?.vencimiento)
        ? `Vence ${formatDateShort(item.calibracion?.vencimiento || item.ultimaCalibracion?.vencimiento)}`
        : "",
    };
  }
  return {
    nombreArchivo: item.idInterno,
    encabezado: item.categoria || "Equipo",
    id: item.idInterno,
    descripcion: item.descripcion,
    subdescripcion: [item.marca, item.modelo].filter(Boolean).join(" "),
    vigenciaTexto: item.ultimaCalibracion?.vencimiento
      ? `Próx. calibración ${formatDateShort(item.ultimaCalibracion.vencimiento)}`
      : "",
  };
}

/**
 * Etiqueta imprimible con QR para identificar físicamente un Equipo o Patrón
 * (pegarla en el instrumento). El QR apunta a la ficha interna del registro
 * (requiere sesión) — no es verificación pública como la de Certificados.
 */
export default function EtiquetaEquipoDialog({ open, onClose, item, tipo = "equipo", fetchQr }) {
  const [tamano, setTamano] = useState("50x30");
  const [cantidad, setCantidad] = useState(1);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [cargando, setCargando] = useState(true);
  const iframeRef = useRef(null);

  const size = TAMANOS.find((t) => t.id === tamano);
  const datos = useMemo(() => normalizar(tipo, item), [tipo, item]);

  useEffect(() => {
    if (!open || !item?._id) return;
    setCargando(true);
    setQrDataUrl("");
    fetchQr(item._id, "png").then(blobToDataUrl).then(setQrDataUrl).finally(() => setCargando(false));
  }, [open, item?._id, fetchQr]);

  const svg = useMemo(() => {
    if (!qrDataUrl || !datos) return "";
    return construirEtiquetaSVG({ datos, qrDataUrl, w: size.w, h: size.h });
  }, [qrDataUrl, datos, size]);

  const imprimir = () => {
    const n = Math.max(1, Math.min(200, Number(cantidad) || 1));
    const doc = `<!doctype html><html><head><meta charset="utf-8"><style>
      @page { size: ${size.w}mm ${size.h}mm; margin: 0; }
      html,body { margin:0; padding:0; }
      .et { width:${size.w}mm; height:${size.h}mm; page-break-after: always; overflow:hidden; }
      .et:last-child { page-break-after: auto; }
      svg { display:block; width:100%; height:100%; }
    </style></head><body>${Array.from({ length: n }).map(() => `<div class="et">${svg}</div>`).join("")}</body></html>`;

    const iframe = iframeRef.current;
    iframe.srcdoc = doc;
    iframe.onload = () => {
      try {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      } catch {
        /* noop */
      }
    };
  };

  const descargarSvg = () => {
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${datos?.nombreArchivo || "etiqueta"}-etiqueta-${size.id}.svg`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>Etiqueta — {datos?.id}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: "flex", gap: 2, mb: 2.5, flexWrap: "wrap" }}>
          <TextField
            select label="Tamaño" size="small" value={tamano}
            onChange={(e) => setTamano(e.target.value)} sx={{ minWidth: 220 }}
          >
            {TAMANOS.map((t) => <MenuItem key={t.id} value={t.id}>{t.label}</MenuItem>)}
          </TextField>
          <TextField
            label="Cantidad" type="number" size="small" value={cantidad}
            onChange={(e) => setCantidad(e.target.value)}
            slotProps={{ htmlInput: { min: 1, max: 200 } }}
            sx={{ width: 120 }}
          />
        </Box>

        <Typography variant="caption" color="text.secondary">Vista previa (a escala)</Typography>
        <Box
          sx={{
            mt: 1, p: 3, display: "flex", justifyContent: "center", alignItems: "center",
            bgcolor: "background.default", borderRadius: 3, border: 1, borderColor: "divider",
            minHeight: 200,
          }}
        >
          {cargando || !svg ? (
            <CircularProgress />
          ) : (
            <Box
              sx={{
                width: size.w * 3.6, height: size.h * 3.6,
                boxShadow: "0 6px 20px rgba(0,0,0,.12)", borderRadius: 1, overflow: "hidden",
                "& svg": { width: "100%", height: "100%" },
              }}
              dangerouslySetInnerHTML={{ __html: svg }}
            />
          )}
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
          Al escanearla, el QR abre la ficha de {tipo === "patron" ? "este patrón" : "este equipo"} dentro del
          sistema (requiere sesión iniciada). Configura la impresora al tamaño físico real ({size.w} × {size.h} mm).
        </Typography>

        <iframe ref={iframeRef} title="print" style={{ display: "none" }} />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
        <Button startIcon={<DownloadOutlinedIcon />} onClick={descargarSvg} disabled={!svg}>
          SVG
        </Button>
        <Box sx={{ flex: 1 }} />
        <Button onClick={onClose}>Cerrar</Button>
        <Button
          variant="contained" startIcon={<PrintOutlinedIcon />} onClick={imprimir}
          disabled={!svg} sx={{ borderRadius: 2 }}
        >
          Imprimir
        </Button>
      </DialogActions>
    </Dialog>
  );
}
