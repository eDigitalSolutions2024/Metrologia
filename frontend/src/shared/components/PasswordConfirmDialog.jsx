import { useState } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
  Box, Alert, IconButton, InputAdornment,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import AppInput from "./AppInput";
import AppButton from "./AppButton";
import { verificarPasswordAdmin } from "../../core/auth/LoginService";

/**
 * Confirmación destructiva que exige la contraseña de un administrador
 * antes de ejecutar la acción. Uso: eliminar cliente/usuario, etc.
 */
export default function PasswordConfirmDialog({ open, title, message, onConfirm, onCancel }) {
  const theme = useTheme();
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const cerrar = () => {
    setPassword("");
    setError("");
    setShowPass(false);
    onCancel();
  };

  const confirmar = async () => {
    if (!password) {
      setError("Ingresa la contraseña de administrador.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await verificarPasswordAdmin(password);
      setPassword("");
      setShowPass(false);
      await onConfirm();
    } catch (err) {
      setError(err.response?.data?.message || "Contraseña incorrecta.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={cerrar} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1.5, fontWeight: 700 }}>
        <Box
          sx={{
            width: 38, height: 38, borderRadius: 2, flexShrink: 0,
            bgcolor: theme.palette.error.main + "18", color: "error.main",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <LockOutlinedIcon fontSize="small" />
        </Box>
        {title}
      </DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 2 }}>{message}</DialogContentText>

        {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

        <AppInput
          label="Contraseña de administrador"
          type={showPass ? "text" : "password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") confirmar(); }}
          autoFocus
          slotProps={{
            input: {
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setShowPass((p) => !p)}>
                    {showPass ? <VisibilityOffOutlinedIcon fontSize="small" /> : <VisibilityOutlinedIcon fontSize="small" />}
                  </IconButton>
                </InputAdornment>
              ),
            },
          }}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <AppButton variant="outlined" onClick={cerrar} disabled={loading} sx={{ borderRadius: 2 }}>
          Cancelar
        </AppButton>
        <AppButton onClick={confirmar} loading={loading} color="error" sx={{ borderRadius: 2, bgcolor: "error.main", "&:hover": { bgcolor: "error.dark" } }}>
          Confirmar y Eliminar
        </AppButton>
      </DialogActions>
    </Dialog>
  );
}
