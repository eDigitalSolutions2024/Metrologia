import { useState } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Box, Typography,
  Alert, Stack, Avatar, TextField, Chip, IconButton, Tooltip,
} from "@mui/material";
import ChatBubbleOutlineOutlinedIcon from "@mui/icons-material/ChatBubbleOutlineOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlineOutlined";
import AppButton from "../AppButton";
import ConfirmDialog from "../ConfirmDialog";
import { agregarObservacion, eliminarObservacion } from "../../../services/usuarios";

function formatFecha(fecha) {
  if (!fecha) return "—";
  return new Date(fecha).toLocaleString("es-MX", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export default function ObservacionesUsuario({ open, onClose, usuario, onSaved }) {
  const [texto, setTexto] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [observaciones, setObservaciones] = useState(usuario?.observaciones || []);
  const [borrarTarget, setBorrarTarget] = useState(null);
  const [borrando, setBorrando] = useState(false);

  const cerrar = () => {
    setTexto("");
    setError("");
    onClose();
  };

  const agregar = async () => {
    if (!texto.trim()) return;
    setError("");
    setEnviando(true);
    try {
      const actualizado = await agregarObservacion(usuario.id, texto);
      setObservaciones(actualizado.observaciones || []);
      setTexto("");
      onSaved?.();
    } catch (err) {
      setError(err.response?.data?.message || "No se pudo guardar la observación.");
    } finally {
      setEnviando(false);
    }
  };

  const confirmarBorrar = async () => {
    const target = borrarTarget;
    setBorrando(true);
    try {
      const actualizado = await eliminarObservacion(usuario.id, target._id);
      setObservaciones(actualizado.observaciones || []);
      onSaved?.();
    } catch (err) {
      setError(err.response?.data?.message || "No se pudo eliminar la observación.");
    } finally {
      setBorrando(false);
      setBorrarTarget(null);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      agregar();
    }
  };

  const lista = [...observaciones].sort(
    (a, b) => new Date(b.fecha) - new Date(a.fecha)
  );

  return (
    <Dialog open={open} onClose={cerrar} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 1 }}>
        <ChatBubbleOutlineOutlinedIcon fontSize="small" sx={{ color: "secondary.main" }} />
        Observaciones
        {usuario && (
          <Typography component="span" variant="body2" color="text.secondary" fontWeight={400}>
            — {usuario.nombre}
          </Typography>
        )}
      </DialogTitle>

      <DialogContent sx={{ pt: 1 }}>
        {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

        <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, p: 1.5, mb: 3, bgcolor: "background.paper" }}>
          <TextField
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribe una observación sobre este usuario..."
            multiline
            minRows={3}
            fullWidth
            variant="standard"
            slotProps={{ input: { disableUnderline: true } }}
          />
          <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 1 }}>
            <AppButton
              size="small"
              onClick={agregar}
              loading={enviando}
              disabled={!texto.trim()}
              sx={{ borderRadius: 2 }}
            >
              Agregar
            </AppButton>
          </Box>
        </Box>

        <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 1.5 }}>
          <Typography variant="subtitle2" color="text.secondary">
            Historial
          </Typography>
          {lista.length > 0 && (
            <Chip label={lista.length} size="small" sx={{ height: 18, fontSize: 11 }} />
          )}
        </Stack>

        {lista.length === 0 ? (
          <Box sx={{ textAlign: "center", py: 4, color: "text.secondary" }}>
            <ChatBubbleOutlineOutlinedIcon sx={{ fontSize: 32, opacity: 0.3, mb: 1 }} />
            <Typography variant="body2">Todavía no hay observaciones registradas.</Typography>
          </Box>
        ) : (
          <Stack spacing={1.5} sx={{ maxHeight: 340, overflowY: "auto", pr: 0.5 }}>
            {lista.map((o, i) => (
              <Box key={o._id || i} sx={{ display: "flex", gap: 1.5 }}>
                <Avatar
                  sx={{
                    width: 32,
                    height: 32,
                    fontSize: 13,
                    bgcolor: "secondary.main",
                    mt: 0.25,
                  }}
                >
                  {o.autor?.charAt(0)?.toUpperCase()}
                </Avatar>
                <Box sx={{ flex: 1, borderRadius: 2, bgcolor: "action.hover", p: 1.5 }}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 1, mb: 0.5 }}>
                    <Typography variant="caption" fontWeight={700}>
                      @{o.autor}
                    </Typography>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: "nowrap" }}>
                        {formatFecha(o.fecha)}
                      </Typography>
                      <Tooltip title="Eliminar observación">
                        <IconButton size="small" onClick={() => setBorrarTarget(o)} sx={{ p: 0.25 }}>
                          <DeleteOutlineIcon sx={{ fontSize: 16, color: "error.main" }} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>
                  <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                    {o.texto}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Stack>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <AppButton variant="outlined" onClick={cerrar}>Cerrar</AppButton>
      </DialogActions>

      <ConfirmDialog
        open={!!borrarTarget}
        title="Eliminar observación"
        message="Esta observación se eliminará de forma permanente. ¿Continuar?"
        onConfirm={confirmarBorrar}
        onCancel={() => setBorrarTarget(null)}
        loading={borrando}
      />
    </Dialog>
  );
}
