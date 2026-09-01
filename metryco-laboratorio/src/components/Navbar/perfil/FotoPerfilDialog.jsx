import { useEffect, useRef, useState } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Avatar, Box, Typography, Alert,
} from "@mui/material";
import UploadOutlinedIcon from "@mui/icons-material/UploadOutlined";
import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import AddIcon from "@mui/icons-material/Add";
import AppButton from "../../../shared/components/AppButton";
import { useAuth } from "../../../core/auth/useAuth";
import {
  fotoUrl, obtenerColoresAvatar, elegirColorAvatar, subirMiFoto, eliminarMiFoto,
} from "../../../services/perfil";

export default function FotoPerfilDialog({ open, onClose }) {
  const { user, actualizarUsuario } = useAuth();
  const [colores, setColores] = useState([]);
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    obtenerColoresAvatar().then(setColores).catch(() => setColores([]));
  }, [open]);

  const inicial = (user?.nombre || user?.usuario || "?").charAt(0).toUpperCase();

  const subir = async (archivo) => {
    setGuardando(true); setError("");
    try {
      const actualizado = await subirMiFoto(archivo);
      actualizarUsuario({ fotoUrl: actualizado.fotoUrl, avatarColor: undefined });
    } catch (err) {
      setError(err?.response?.data?.message || "No se pudo subir la imagen.");
    } finally {
      setGuardando(false);
    }
  };

  const elegirColor = async (color) => {
    setGuardando(true); setError("");
    try {
      await elegirColorAvatar(color);
      actualizarUsuario({ avatarColor: color, fotoUrl: undefined });
    } catch (err) {
      setError(err?.response?.data?.message || "No se pudo aplicar el color.");
    } finally {
      setGuardando(false);
    }
  };

  const quitarFoto = async () => {
    setGuardando(true); setError("");
    try {
      await eliminarMiFoto();
      actualizarUsuario({ fotoUrl: undefined });
    } catch {
      setError("No se pudo quitar la foto.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Foto de perfil</DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2.5, pt: 1 }}>
        {error && <Alert severity="error" sx={{ borderRadius: 2 }} onClose={() => setError("")}>{error}</Alert>}

        <Box sx={{ display: "flex", justifyContent: "center" }}>
          <Avatar
            src={user?.fotoUrl ? fotoUrl(user.fotoUrl) : undefined}
            sx={{ width: 84, height: 84, fontSize: 32, fontWeight: 700, bgcolor: user?.avatarColor || "secondary.main" }}
          >
            {inicial}
          </Avatar>
        </Box>

        <Box sx={{ display: "flex", gap: 1, justifyContent: "center" }}>
          <AppButton variant="outlined" size="small" startIcon={<UploadOutlinedIcon />} onClick={() => inputRef.current?.click()} disabled={guardando} sx={{ borderRadius: 2 }}>
            Subir foto
          </AppButton>
          {user?.fotoUrl && (
            <AppButton variant="outlined" color="error" size="small" startIcon={<DeleteOutlinedIcon />} onClick={quitarFoto} disabled={guardando} sx={{ borderRadius: 2 }}>
              Quitar
            </AppButton>
          )}
        </Box>
        <input
          ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" hidden
          onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) subir(f); }}
        />

        <Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
            O elige un color predeterminado (se usa con tu inicial):
          </Typography>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}>
            {colores.map((c) => (
              <Box
                key={c}
                onClick={() => !guardando && elegirColor(c)}
                sx={{
                  width: 32, height: 32, borderRadius: "50%", bgcolor: c, cursor: "pointer",
                  border: user?.avatarColor === c ? "2px solid" : "2px solid transparent",
                  borderColor: user?.avatarColor === c ? "text.primary" : "transparent",
                  outline: "1px solid", outlineColor: "divider", outlineOffset: "1px",
                }}
              />
            ))}

            {/* Color libre — el usuario elige cualquier tono con el selector nativo */}
            <Box
              component="label"
              sx={{
                position: "relative", width: 32, height: 32, borderRadius: "50%", cursor: "pointer",
                display: "grid", placeItems: "center",
                background: "conic-gradient(red, yellow, lime, cyan, blue, magenta, red)",
                border: user?.avatarColor && !colores.includes(user.avatarColor) ? "2px solid" : "2px solid transparent",
                borderColor: user?.avatarColor && !colores.includes(user.avatarColor) ? "text.primary" : "transparent",
                outline: "1px solid", outlineColor: "divider", outlineOffset: "1px",
              }}
            >
              <input
                type="color"
                value={user?.avatarColor || "#2563EB"}
                onChange={(e) => elegirColor(e.target.value.toUpperCase())}
                disabled={guardando}
                style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer", width: "100%", height: "100%" }}
              />
              <AddIcon sx={{ fontSize: 16, color: "#fff", filter: "drop-shadow(0 0 1px rgba(0,0,0,.6))" }} />
            </Box>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <AppButton variant="outlined" onClick={onClose} sx={{ borderRadius: 2 }}>Cerrar</AppButton>
      </DialogActions>
    </Dialog>
  );
}
