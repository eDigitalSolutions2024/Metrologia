import { useRef, useState } from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, Box, Typography, Alert } from "@mui/material";
import UploadOutlinedIcon from "@mui/icons-material/UploadOutlined";
import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import DrawOutlinedIcon from "@mui/icons-material/DrawOutlined";
import AppButton from "../../../shared/components/AppButton";
import { useAuth } from "../../../core/auth/useAuth";
import { firmaUrl, subirMiFirma, eliminarMiFirma } from "../../../services/perfil";

export default function FirmaDialog({ open, onClose }) {
  const { user, actualizarUsuario } = useAuth();
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const inputRef = useRef(null);

  const subir = async (archivo) => {
    setGuardando(true); setError("");
    try {
      const actualizado = await subirMiFirma(archivo);
      actualizarUsuario({ firmaUrl: actualizado.firmaUrl });
    } catch (err) {
      setError(err?.response?.data?.message || "No se pudo subir la firma.");
    } finally {
      setGuardando(false);
    }
  };

  const quitar = async () => {
    setGuardando(true); setError("");
    try {
      await eliminarMiFirma();
      actualizarUsuario({ firmaUrl: undefined });
    } catch {
      setError("No se pudo quitar la firma.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Firma digital</DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
        {error && <Alert severity="error" sx={{ borderRadius: 2 }} onClose={() => setError("")}>{error}</Alert>}
        <Typography variant="body2" color="text.secondary">
          Se usará en los PDFs que generes (certificados, reportes) en vez de solo tu nombre.
        </Typography>

        <Box
          sx={{
            border: 1, borderColor: "divider", borderRadius: 2, height: 120,
            display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "background.default",
          }}
        >
          {user?.firmaUrl ? (
            <Box component="img" src={firmaUrl(user.firmaUrl)} alt="Firma" sx={{ maxHeight: "100%", maxWidth: "100%", objectFit: "contain" }} />
          ) : (
            <Box sx={{ textAlign: "center", color: "text.secondary" }}>
              <DrawOutlinedIcon />
              <Typography variant="caption" sx={{ display: "block" }}>Sin firma</Typography>
            </Box>
          )}
        </Box>

        <Box sx={{ display: "flex", gap: 1, justifyContent: "center" }}>
          <AppButton variant="outlined" size="small" startIcon={<UploadOutlinedIcon />} onClick={() => inputRef.current?.click()} disabled={guardando} sx={{ borderRadius: 2 }}>
            {user?.firmaUrl ? "Cambiar" : "Subir firma"}
          </AppButton>
          {user?.firmaUrl && (
            <AppButton variant="outlined" color="error" size="small" startIcon={<DeleteOutlinedIcon />} onClick={quitar} disabled={guardando} sx={{ borderRadius: 2 }}>
              Quitar
            </AppButton>
          )}
        </Box>
        <input
          ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" hidden
          onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) subir(f); }}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <AppButton variant="outlined" onClick={onClose} sx={{ borderRadius: 2 }}>Cerrar</AppButton>
      </DialogActions>
    </Dialog>
  );
}
