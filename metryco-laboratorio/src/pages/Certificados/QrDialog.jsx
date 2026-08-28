import { useEffect, useState } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Box, Typography,
  IconButton, Tooltip, Button, CircularProgress, TextField, InputAdornment,
} from "@mui/material";
import ContentCopyOutlinedIcon from "@mui/icons-material/ContentCopyOutlined";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import CheckOutlinedIcon from "@mui/icons-material/CheckOutlined";
import { fetchQrBlob } from "../../services/certificados";

function descargar(blob, nombre) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function QrDialog({ open, onClose, certificado }) {
  const [pngUrl, setPngUrl] = useState("");
  const [pngBlob, setPngBlob] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [copiado, setCopiado] = useState(false);

  const urlPublica = certificado?.urlPublica || "";

  useEffect(() => {
    if (!open || !certificado?._id) return;
    setCargando(true);
    setPngUrl("");
    fetchQrBlob(certificado._id, "png")
      .then((blob) => {
        setPngBlob(blob);
        setPngUrl(URL.createObjectURL(blob));
      })
      .finally(() => setCargando(false));
  }, [open, certificado?._id]);

  useEffect(() => () => pngUrl && URL.revokeObjectURL(pngUrl), [pngUrl]);

  const copiar = () => {
    navigator.clipboard?.writeText(urlPublica);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 1500);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>
        Código QR — {certificado?.folio}
      </DialogTitle>
      <DialogContent>
        <Box
          sx={{
            display: "flex", justifyContent: "center", alignItems: "center",
            bgcolor: "#fff", borderRadius: 3, border: 1, borderColor: "divider",
            p: 2, minHeight: 240,
          }}
        >
          {cargando ? (
            <CircularProgress />
          ) : (
            <Box component="img" src={pngUrl} alt="QR" sx={{ width: 220, height: 220 }} />
          )}
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mt: 2, mb: 1 }}>
          El QR contiene únicamente este enlace con un token opaco. No lleva datos
          del certificado ni identificadores internos.
        </Typography>

        <TextField
          value={urlPublica}
          size="small"
          fullWidth
          slotProps={{
            input: {
              readOnly: true,
              endAdornment: (
                <InputAdornment position="end">
                  <Tooltip title={copiado ? "Copiado" : "Copiar enlace"}>
                    <IconButton size="small" onClick={copiar}>
                      {copiado ? <CheckOutlinedIcon fontSize="small" color="success" /> : <ContentCopyOutlinedIcon fontSize="small" />}
                    </IconButton>
                  </Tooltip>
                </InputAdornment>
              ),
            },
          }}
          sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2, fontSize: 12.5 } }}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
        <Button
          startIcon={<DownloadOutlinedIcon />}
          disabled={!pngBlob}
          onClick={() => descargar(pngBlob, `${certificado?.folio}-qr.png`)}
        >
          PNG
        </Button>
        <Button
          startIcon={<DownloadOutlinedIcon />}
          onClick={async () => {
            const b = await fetchQrBlob(certificado._id, "svg");
            descargar(b, `${certificado?.folio}-qr.svg`);
          }}
        >
          SVG
        </Button>
        <Box sx={{ flex: 1 }} />
        <Button variant="contained" onClick={onClose} sx={{ borderRadius: 2 }}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  );
}
