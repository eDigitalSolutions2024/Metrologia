import { useState } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Alert, InputAdornment, IconButton, Typography, Box,
} from "@mui/material";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";
import AppButton from "../../../shared/components/AppButton";
import { cambiarMiPassword } from "../../../services/perfil";

export default function CambiarPasswordDialog({ open, onClose }) {
  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [verActual, setVerActual] = useState(false);
  const [verNueva, setVerNueva] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState(false);
  const [guardando, setGuardando] = useState(false);

  // Evita el fondo blanco fijo del autocompletado del navegador en modo
  // oscuro (mismo arreglo que Login.jsx) — usa las variables del tema.
  const sinAutofill = {
    "& .MuiOutlinedInput-root": { borderRadius: 2 },
    "& input:-webkit-autofill": {
      WebkitBoxShadow: "0 0 0 100px var(--mui-palette-background-paper) inset",
      WebkitTextFillColor: "var(--mui-palette-text-primary)",
      caretColor: "var(--mui-palette-text-primary)",
      transition: "background-color 9999s ease-in-out 0s",
    },
  };

  const cerrar = () => {
    setActual(""); setNueva(""); setConfirmar(""); setError(""); setOk(false);
    onClose();
  };

  const guardar = async () => {
    setError("");
    if (nueva !== confirmar) { setError("Las contraseñas nuevas no coinciden."); return; }
    setGuardando(true);
    try {
      await cambiarMiPassword(actual, nueva);
      setOk(true);
      setActual(""); setNueva(""); setConfirmar("");
    } catch (err) {
      setError(err?.response?.data?.message || err?.response?.data?.errors?.passwordNueva || "No se pudo cambiar la contraseña.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Dialog open={open} onClose={cerrar} fullWidth maxWidth="xs" slotProps={{ paper: { sx: { borderRadius: "16px" } } }}>
      <DialogTitle sx={{ pb: 0.5 }} component="div">
        <Typography variant="h6" fontWeight={700} component="p">Cambiar contraseña</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontWeight: 400 }}>
          Necesitas confirmar tu contraseña actual para poder cambiarla.
        </Typography>
      </DialogTitle>
      <DialogContent sx={{ px: 3, pt: 3, pb: 1 }}>
        {/* MUI le pone padding-top: 0 al DialogContent que sigue justo a un
            DialogTitle (para no duplicar espacio) — pisa el `pt` de arriba,
            así que el aire real se agrega aquí, en el propio contenedor. */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3, mt: 2 }}>
          {ok && <Alert severity="success" sx={{ borderRadius: 2 }}>Contraseña actualizada.</Alert>}
          {error && <Alert severity="error" sx={{ borderRadius: 2 }} onClose={() => setError("")}>{error}</Alert>}
          <TextField
            label="Contraseña actual" fullWidth
            type={verActual ? "text" : "password"}
            value={actual} onChange={(e) => setActual(e.target.value)}
            sx={sinAutofill}
            slotProps={{
              htmlInput: { autoComplete: "new-password" },
              input: { endAdornment: (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setVerActual((v) => !v)}>
                    {verActual ? <VisibilityOffOutlinedIcon fontSize="small" /> : <VisibilityOutlinedIcon fontSize="small" />}
                  </IconButton>
                </InputAdornment>
              ) },
            }}
          />
          <TextField
            label="Contraseña nueva" fullWidth
            type={verNueva ? "text" : "password"}
            value={nueva} onChange={(e) => setNueva(e.target.value)}
            helperText="Mínimo 8 caracteres, con mayúscula, minúscula y número."
            sx={sinAutofill}
            slotProps={{
              htmlInput: { autoComplete: "new-password" },
              input: { endAdornment: (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setVerNueva((v) => !v)}>
                    {verNueva ? <VisibilityOffOutlinedIcon fontSize="small" /> : <VisibilityOutlinedIcon fontSize="small" />}
                  </IconButton>
                </InputAdornment>
              ) },
            }}
          />
          <TextField
            label="Confirmar contraseña nueva" fullWidth
            type={verNueva ? "text" : "password"}
            value={confirmar} onChange={(e) => setConfirmar(e.target.value)}
            sx={sinAutofill}
            slotProps={{ htmlInput: { autoComplete: "new-password" } }}
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5, pt: 1 }}>
        <AppButton variant="outlined" onClick={cerrar} sx={{ borderRadius: 2 }}>Cerrar</AppButton>
        <AppButton onClick={guardar} loading={guardando} disabled={!actual || !nueva} sx={{ borderRadius: 2 }}>Guardar</AppButton>
      </DialogActions>
    </Dialog>
  );
}
