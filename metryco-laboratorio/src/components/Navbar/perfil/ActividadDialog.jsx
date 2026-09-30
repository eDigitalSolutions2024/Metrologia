import { useEffect, useState } from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, Box, Typography, Chip, CircularProgress } from "@mui/material";
import AppButton from "../../../shared/components/AppButton";
import { obtenerMiActividad } from "../../../services/perfil";

function formatFecha(f) {
  return f ? new Date(f).toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" }) : "—";
}

export default function ActividadDialog({ open, onClose }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    obtenerMiActividad().then(setItems).catch(() => setItems([])).finally(() => setLoading(false));
  }, [open]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Mis últimos inicios de sesión</DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}><CircularProgress size={24} /></Box>
        ) : items.length === 0 ? (
          <Typography variant="body2" color="text.secondary">Sin actividad registrada todavía.</Typography>
        ) : (
          items.map((e) => (
            <Box key={e._id} sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", py: 0.9, borderBottom: 1, borderColor: "divider" }}>
              <Box>
                <Typography variant="body2">{formatFecha(e.fecha)}</Typography>
                <Typography variant="caption" color="text.secondary">{e.ip || "IP desconocida"}</Typography>
              </Box>
              <Chip label={e.exito ? "Exitoso" : "Fallido"} color={e.exito ? "success" : "error"} size="small" />
            </Box>
          ))
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <AppButton variant="outlined" onClick={onClose} sx={{ borderRadius: 2 }}>Cerrar</AppButton>
      </DialogActions>
    </Dialog>
  );
}
