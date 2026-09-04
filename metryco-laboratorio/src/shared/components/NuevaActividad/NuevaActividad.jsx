import { useEffect, useState } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Grid, Alert, Box, Divider, Typography,
  MenuItem, Select, FormControl, InputLabel,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { Controller, useForm } from "react-hook-form";
import EventAvailableOutlinedIcon from "@mui/icons-material/EventAvailableOutlined";
import AppInput from "../AppInput";
import AppButton from "../AppButton";
import AppDatePicker from "../AppDatePicker";
import AppTimePicker from "../AppTimePicker";
import { crearActividad } from "../../../services/actividades";
import { obtenerDirectorio } from "../../../services/usuarios";

function SeccionTitulo({ children }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, mb: 1.5 }}>
      <Box sx={{ width: 4, height: 18, borderRadius: 1, bgcolor: "secondary.main", flexShrink: 0 }} />
      <Typography variant="subtitle2" fontWeight={700} color="text.secondary">
        {children}
      </Typography>
    </Box>
  );
}

const defaultValues = {
  fechaActividad: "",
  fechaLimite: "",
  tecnico: "",
  reporteServicio: "",
  horaInicio: "",
  horaFin: "",
  actividad: "",
  comentarios: "",
};

export default function NuevaActividad({ open, onClose, onCreated, fechaSugerida }) {
  const theme = useTheme();
  const [submitError, setSubmitError] = useState("");
  const [tecnicos, setTecnicos] = useState([]);
  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues });

  const fechaActividad = watch("fechaActividad");
  const horaInicio = watch("horaInicio");

  useEffect(() => {
    if (!open) return;
    obtenerDirectorio()
      .then((lista) => setTecnicos(lista.filter((u) => u.rol === "tecnico")))
      .catch(() => setTecnicos([]));
    reset({ ...defaultValues, fechaActividad: fechaSugerida || "", fechaLimite: fechaSugerida || "" });
    setSubmitError("");
  }, [open, fechaSugerida, reset]);

  const cerrar = () => {
    reset(defaultValues);
    setSubmitError("");
    onClose();
  };

  const onSubmit = async (data) => {
    setSubmitError("");
    try {
      await crearActividad(data);
      reset(defaultValues);
      onCreated?.();
      onClose();
    } catch (err) {
      setSubmitError(err.response?.data?.message || "No se pudo crear la actividad.");
    }
  };

  return (
    <Dialog open={open} onClose={cerrar} fullWidth maxWidth="sm">
      <DialogTitle sx={{ pb: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box
            sx={{
              width: 44, height: 44, borderRadius: 2.5, flexShrink: 0,
              bgcolor: theme.palette.secondary.main + "18", color: "secondary.main",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <EventAvailableOutlinedIcon />
          </Box>
          <Box>
            <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.2 }}>Nueva Actividad</Typography>
            <Typography variant="body2" color="text.secondary">Programa una actividad en el calendario</Typography>
          </Box>
        </Box>
      </DialogTitle>

      <Box component="form" onSubmit={handleSubmit(onSubmit)}>
        <DialogContent sx={{ pt: 0 }}>
          {submitError && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{submitError}</Alert>}

          <SeccionTitulo>Fechas y responsable</SeccionTitulo>
          <Grid container spacing={2} sx={{ mb: 1 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller
                name="fechaActividad"
                control={control}
                rules={{ required: "Campo obligatorio" }}
                render={({ field }) => (
                  <AppDatePicker label="Fecha de actividad" error={errors.fechaActividad} {...field} />
                )}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller
                name="fechaLimite"
                control={control}
                rules={{
                  required: "Campo obligatorio",
                  validate: (value) =>
                    !fechaActividad || !value || value >= fechaActividad ||
                    "No puede ser anterior a la fecha de actividad",
                }}
                render={({ field }) => (
                  <AppDatePicker label="Fecha límite" error={errors.fechaLimite} {...field} />
                )}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth size="small" error={!!errors.tecnico}>
                <InputLabel>Técnico encargado</InputLabel>
                <Select
                  label="Técnico encargado"
                  defaultValue=""
                  {...register("tecnico", { required: true })}
                  sx={{ borderRadius: 2 }}
                >
                  {tecnicos.length === 0 && (
                    <MenuItem value="" disabled>No hay técnicos activos registrados</MenuItem>
                  )}
                  {tecnicos.map((t) => (
                    <MenuItem key={t._id} value={t._id}>{t.nombre}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <AppInput
                label="Reporte de servicio (folio)"
                placeholder="Ej. RPT-2026-041"
                helperText="Folio del reporte de servicio relacionado, si aplica"
                error={errors.reporteServicio}
                {...register("reporteServicio")}
              />
            </Grid>
          </Grid>

          <Divider sx={{ my: 2.5 }} />

          <SeccionTitulo>Horario</SeccionTitulo>
          <Grid container spacing={2} sx={{ mb: 1 }}>
            <Grid size={{ xs: 6 }}>
              <Controller
                name="horaInicio"
                control={control}
                rules={{ required: "Campo obligatorio" }}
                render={({ field }) => (
                  <AppTimePicker label="Hora inicio" error={errors.horaInicio} {...field} />
                )}
              />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <Controller
                name="horaFin"
                control={control}
                rules={{
                  required: "Campo obligatorio",
                  validate: (value) =>
                    !horaInicio || !value || value > horaInicio || "Debe ser posterior a la hora de inicio",
                }}
                render={({ field }) => (
                  <AppTimePicker label="Hora fin" error={errors.horaFin} {...field} />
                )}
              />
            </Grid>
          </Grid>

          <Divider sx={{ my: 2.5 }} />

          <SeccionTitulo>Detalle</SeccionTitulo>
          <Grid container spacing={2} sx={{ mb: 1 }}>
            <Grid size={{ xs: 12 }}>
              <AppInput
                label="Actividad a realizar"
                placeholder="Ej. Calibración de equipos en sitio"
                multiline
                minRows={2}
                error={errors.actividad}
                {...register("actividad", { required: "Campo obligatorio" })}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <AppInput
                label="Comentarios"
                placeholder="Notas adicionales (opcional)"
                multiline
                minRows={2}
                error={errors.comentarios}
                {...register("comentarios")}
              />
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 3, pt: 1 }}>
          <AppButton type="button" variant="outlined" onClick={cerrar} sx={{ borderRadius: 2 }}>Cancelar</AppButton>
          <AppButton type="submit" loading={isSubmitting} sx={{ borderRadius: 2 }}>Guardar Actividad</AppButton>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
