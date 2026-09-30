import { useEffect, useMemo, useRef, useState } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Box, Typography,
  Button, MenuItem, TextField,
} from "@mui/material";
import PrintOutlinedIcon from "@mui/icons-material/PrintOutlined";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import { fetchQrBlob } from "../../services/certificados";
import { formatDateShort } from "../../shared/utils/formatDate";
import { construirEtiquetaSVG as construirEtiquetaSVGBase } from "../../shared/utils/etiquetaSvg";
import EtiquetaVistaPrevia from "../../shared/components/EtiquetaVistaPrevia";

const TAMANOS = [
  { id: "50x30", label: "50 × 30 mm (estándar)", w: 50, h: 30 },
  { id: "40x25", label: "40 × 25 mm (chica)", w: 40, h: 25 },
  { id: "60x40", label: "60 × 40 mm (grande)", w: 60, h: 40 },
  { id: "100x50", label: "100 × 50 mm (ancha)", w: 100, h: 50 },
];

function construirEtiquetaSVG({ cert, qrDataUrl, w, h }) {
  const host = (() => {
    try { return new URL(cert.urlPublica).host; } catch { return ""; }
  })();

  return construirEtiquetaSVGBase({
    w, h, qrDataUrl,
    encabezado: { texto: cert.laboratorio?.nombre || "Laboratorio de Metrología", weight: 700, fill: "#334155" },
    filas: [
      { texto: cert.folio, peso: 1.05, weight: 800, fill: "#0F172A" },
      { texto: "ID: " + (cert.equipoSnapshot?.idInterno || "—"), peso: 0.8, weight: 600, fill: "#0F172A" },
      { texto: cert.equipoSnapshot?.descripcion || "", peso: 0.68, weight: 400, fill: "#475569" },
      { texto: `Cal ${formatDateShort(cert.fechaCalibracion)}${cert.vigencia ? "   Próx " + formatDateShort(cert.vigencia) : ""}`, peso: 0.66, weight: 600, fill: "#475569" },
    ],
    pie: host ? { texto: `Verifica: ${host}` } : undefined,
  });
}

async function blobToDataUrl(blob) {
  return new Promise((res) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.readAsDataURL(blob);
  });
}

export default function EtiquetaDialog({ open, onClose, certificado }) {
  const [tamano, setTamano] = useState("50x30");
  const [cantidad, setCantidad] = useState(1);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [cargando, setCargando] = useState(true);
  const iframeRef = useRef(null);

  const size = TAMANOS.find((t) => t.id === tamano);

  useEffect(() => {
    if (!open || !certificado?._id) return;
    setCargando(true);
    setQrDataUrl("");
    fetchQrBlob(certificado._id, "png")
      .then(blobToDataUrl)
      .then(setQrDataUrl)
      .finally(() => setCargando(false));
  }, [open, certificado?._id]);

  const svg = useMemo(() => {
    if (!qrDataUrl || !certificado) return "";
    return construirEtiquetaSVG({ cert: certificado, qrDataUrl, w: size.w, h: size.h });
  }, [qrDataUrl, certificado, size]);

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
    a.download = `${certificado?.folio}-etiqueta-${size.id}.svg`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>Etiqueta — {certificado?.folio}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: "flex", gap: 2, mt: 2, mb: 2.5, flexWrap: "wrap" }}>
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

        <EtiquetaVistaPrevia svg={svg} cargando={cargando} w={size.w} h={size.h}>
          Al imprimir, cada etiqueta sale a tamaño físico real ({size.w} × {size.h} mm). Configura la
          impresora al mismo tamaño de papel/rollo.
        </EtiquetaVistaPrevia>

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
