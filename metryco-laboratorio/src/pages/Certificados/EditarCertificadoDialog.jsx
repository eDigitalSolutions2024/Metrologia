import { useEffect, useState } from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, Box, Typography, TextField, MenuItem, Alert } from "@mui/material";
import AppButton from "../../shared/components/AppButton";
import { obtenerCertificado, actualizarCertificado } from "../../services/certificados";

const RAZONES_SERVICIO = ["Calibración", "Revisión", "Reparación", "Verificación"];
const TIPOS_SERVICIO = ["Acreditado", "No acreditado"];

const vacio = { razon: "", tipo: "", procedimiento: "", temperatura: "", humedad: "", comentarios: "" };

/**
 * Edición de un certificado ya AUTORIZADO por Calidad — restringida a
 * Admin/Coordinador (se valida también en el backend). Solo toca texto y
 * formato (servicio/condiciones/comentarios); los resultados de la
 * calibración quedan fijos una vez autorizado, no se editan aquí.
 *
 * Se usa desde Certificados y desde el detalle de Reporte.
 */
export default function EditarCertificadoDialog({ certificadoId, onClose, onDone }) {
  const [f, setF] = useState(vacio);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!certificadoId) return;
    setCargando(true); setError("");
    obtenerCertificado(certificadoId)
      .then((c) => {
        setF({
          razon: c.servicio?.razon || "",
          tipo: c.servicio?.tipo || "",
          procedimiento: c.servicio?.procedimiento || "",
          temperatura: c.condiciones?.temperatura ?? "",
          humedad: c.condiciones?.humedad ?? "",
          comentarios: c.comentarios || "",
        });
      })
      .catch(() => setError("No se pudo cargar el certificado."))
      .finally(() => setCargando(false));
  }, [certificadoId]);

  const set = (campo) => (e) => setF((s) => ({ ...s, [campo]: e.target.value }));

  const guardar = async () => {
    setGuardando(true); setError("");
    try {
      await actualizarCertificado(certificadoId, {
        servicio: { razon: f.razon, tipo: f.tipo, procedimiento: f.procedimiento },
        condiciones: {
          temperatura: f.temperatura === "" ? undefined : Number(f.temperatura),
          humedad: f.humedad === "" ? undefined : Number(f.humedad),
        },
        comentarios: f.comentarios,
      });
      onDone();
    } catch (e) {
      setError(e?.response?.data?.message || "No se pudo guardar el certificado.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Dialog open={!!certificadoId} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>Editar certificado</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Este certificado ya fue autorizado por Calidad — solo se pueden ajustar el servicio,
          las condiciones ambientales y los comentarios. Los resultados de la calibración no se
          pueden modificar aquí.
        </Typography>
        {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}
        {!cargando && (
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
            <TextField select size="small" label="Razón del servicio" value={f.razon} onChange={set("razon")}>
              {RAZONES_SERVICIO.map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
            </TextField>
            <TextField select size="small" label="Tipo de servicio" value={f.tipo} onChange={set("tipo")}>
              {TIPOS_SERVICIO.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
            </TextField>
            <TextField size="small" label="Procedimiento" placeholder="PRO-CAL-023" value={f.procedimiento} onChange={set("procedimiento")} sx={{ gridColumn: { sm: "span 2" } }} />
            <TextField size="small" type="number" label="Temperatura (°C)" value={f.temperatura} onChange={set("temperatura")} />
            <TextField size="small" type="number" label="Humedad (% HR)" value={f.humedad} onChange={set("humedad")} />
            <TextField size="small" multiline minRows={2} label="Comentarios" value={f.comentarios} onChange={set("comentarios")} sx={{ gridColumn: { sm: "span 2" } }} />
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <AppButton type="button" variant="outlined" onClick={onClose} sx={{ borderRadius: 2 }}>Cancelar</AppButton>
        <AppButton type="button" loading={guardando} disabled={cargando} onClick={guardar} sx={{ borderRadius: 2 }}>Guardar</AppButton>
      </DialogActions>
    </Dialog>
  );
}
