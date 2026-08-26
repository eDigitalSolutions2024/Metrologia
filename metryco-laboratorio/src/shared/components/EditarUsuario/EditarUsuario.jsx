import { useEffect, useState } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Grid, Alert, Box,
  MenuItem, Select, FormControl, InputLabel, IconButton, InputAdornment, Tooltip,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { useForm, Controller } from "react-hook-form";
import AppInput from "../AppInput";
import AppButton from "../AppButton";
import { actualizarUsuario } from "../../../services/usuarios";
import { generarPasswordSegura } from "../../utils/generarPassword";

const ROLES = [
  { value: "admin", label: "Administrador" },
  { value: "tecnico", label: "Técnico" },
  { value: "ventas", label: "Ventas" },
  { value: "coordinador", label: "Coordinador" },
];

const SUCURSALES = [
  { value: "juarez", label: "Juárez" },
  { value: "chihuahua", label: "Chihuahua" },
  { value: "admin", label: "Admin" },
];

export default function EditarUsuario({ open, onClose, usuario, onSaved }) {
  const [submitError, setSubmitError] = useState("");
  const [copiado, setCopiado] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    control,
    formState: { errors, isSubmitting },
  } = useForm();

  const password = watch("password");

  useEffect(() => {
    if (open && usuario) {
      reset({
        nombre: usuario.nombre || "",
        usuario: usuario.usuario || "",
        email: usuario.email || "",
        password: "",
        rol: usuario.rol || "",
        sucursal: usuario.sucursal || "",
        status: usuario.status || "activo",
      });
      setCopiado(false);
    }
  }, [open, usuario, reset]);

  const cerrar = () => {
    setSubmitError("");
    onClose();
  };

  const generarNuevaPassword = () => {
    setValue("password", generarPasswordSegura());
    setCopiado(false);
  };

  const copiarPassword = async () => {
    if (!password) return;
    try {
      await navigator.clipboard.writeText(password);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      setCopiado(false);
    }
  };

  const onSubmit = async (data) => {
    setSubmitError("");
    const payload = { ...data };
    if (!payload.password) delete payload.password;

    try {
      await actualizarUsuario(usuario.id, payload);
      onSaved?.();
      onClose();
    } catch (err) {
      setSubmitError(err.response?.data?.message || "No se pudo guardar el usuario.");
    }
  };

  return (
    <Dialog open={open} onClose={cerrar} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontWeight: 700 }}>Editar Usuario</DialogTitle>

      <Box component="form" onSubmit={handleSubmit(onSubmit)}>
        <DialogContent>
          {submitError && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{submitError}</Alert>}

          <Grid container spacing={2}>
            <Grid size={{ xs: 12 }}>
              <AppInput
                label="Nombre completo"
                error={errors.nombre}
                {...register("nombre", { required: "Campo obligatorio" })}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <AppInput
                label="Usuario"
                error={errors.usuario}
                {...register("usuario", { required: "Campo obligatorio" })}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <AppInput
                label="Correo"
                type="email"
                error={errors.email}
                {...register("email", { required: "Campo obligatorio" })}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <AppInput
                label="Nueva contraseña (opcional)"
                type="text"
                helperText={
                  errors.password?.message ||
                  "Déjalo en blanco para no cambiarla, o genera una y compártela con el usuario"
                }
                error={errors.password}
                {...register("password", {
                  minLength: { value: 8, message: "Mínimo 8 caracteres" },
                })}
                slotProps={{
                  inputLabel: { shrink: !!password },
                  input: {
                    readOnly: true,
                    sx: { fontFamily: "monospace" },
                    endAdornment: (
                      <InputAdornment position="end">
                        <Tooltip title={copiado ? "¡Copiado!" : "Copiar"}>
                          <span>
                            <IconButton size="small" onClick={copiarPassword} edge="end" disabled={!password}>
                              <ContentCopyIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip title="Generar nueva contraseña">
                          <IconButton size="small" onClick={generarNuevaPassword} edge="end">
                            <RefreshIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </InputAdornment>
                    ),
                  },
                }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Rol</InputLabel>
                <Controller
                  name="rol"
                  control={control}
                  rules={{ required: true }}
                  render={({ field }) => (
                    <Select label="Rol" {...field} value={field.value ?? ""} sx={{ borderRadius: 2 }}>
                      {ROLES.map((r) => (
                        <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>
                      ))}
                    </Select>
                  )}
                />
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Sucursal</InputLabel>
                <Controller
                  name="sucursal"
                  control={control}
                  render={({ field }) => (
                    <Select label="Sucursal" {...field} value={field.value ?? ""} sx={{ borderRadius: 2 }}>
                      {SUCURSALES.map((s) => (
                        <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>
                      ))}
                    </Select>
                  )}
                />
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Estatus</InputLabel>
                <Controller
                  name="status"
                  control={control}
                  render={({ field }) => (
                    <Select label="Estatus" {...field} value={field.value ?? "activo"} sx={{ borderRadius: 2 }}>
                      <MenuItem value="activo">Activo</MenuItem>
                      <MenuItem value="inactivo">Inactivo</MenuItem>
                    </Select>
                  )}
                />
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <AppButton variant="outlined" onClick={cerrar}>Cancelar</AppButton>
          <AppButton type="submit" loading={isSubmitting}>Guardar Cambios</AppButton>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
