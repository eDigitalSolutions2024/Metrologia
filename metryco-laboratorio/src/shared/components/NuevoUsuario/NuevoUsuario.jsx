import { useState } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Grid, Alert, Box, Divider, Typography,
  MenuItem, Select, FormControl, InputLabel, IconButton, InputAdornment, Tooltip,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import PersonAddAltOutlinedIcon from "@mui/icons-material/PersonAddAltOutlined";
import RefreshIcon from "@mui/icons-material/Refresh";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import VpnKeyOutlinedIcon from "@mui/icons-material/VpnKeyOutlined";
import { useForm } from "react-hook-form";
import AppInput from "../AppInput";
import AppButton from "../AppButton";
import { crearUsuario } from "../../../services/usuarios";
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

export default function NuevoUsuario({ open, onClose, onCreated }) {
  const theme = useTheme();
  const [submitError, setSubmitError] = useState("");
  const [copiado, setCopiado] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      nombre: "", usuario: "", email: "", password: generarPasswordSegura(), rol: "", sucursal: "",
    },
  });

  const password = watch("password");

  const cerrar = () => {
    reset({ password: generarPasswordSegura() });
    setSubmitError("");
    setCopiado(false);
    onClose();
  };

  const regenerarPassword = () => {
    setValue("password", generarPasswordSegura());
    setCopiado(false);
  };

  const copiarPassword = async () => {
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
    try {
      await crearUsuario(data);
      reset({ password: generarPasswordSegura() });
      onCreated?.();
      onClose();
    } catch (err) {
      setSubmitError(err.response?.data?.message || "No se pudo crear el usuario.");
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
            <PersonAddAltOutlinedIcon />
          </Box>
          <Box>
            <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.2 }}>Nuevo Usuario</Typography>
            <Typography variant="body2" color="text.secondary">Registra un nuevo usuario en el sistema</Typography>
          </Box>
        </Box>
      </DialogTitle>

      <Box component="form" onSubmit={handleSubmit(onSubmit)}>
        <DialogContent sx={{ pt: 0 }}>
          {submitError && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{submitError}</Alert>}

          <SeccionTitulo>Datos de acceso</SeccionTitulo>
          <Grid container spacing={2} sx={{ mb: 1 }}>
            <Grid size={{ xs: 12 }}>
              <AppInput
                label="Nombre completo"
                placeholder="Ej. Juan Pérez"
                error={errors.nombre}
                {...register("nombre", { required: "Campo obligatorio" })}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <AppInput
                label="Usuario"
                placeholder="Ej. juanp"
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
          </Grid>

          <Divider sx={{ my: 2.5 }} />

          <SeccionTitulo>Configuración</SeccionTitulo>
          <Grid container spacing={2} sx={{ mb: 1 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth size="small" error={!!errors.rol}>
                <InputLabel>Rol</InputLabel>
                <Select
                  label="Rol"
                  defaultValue=""
                  {...register("rol", { required: true })}
                  sx={{ borderRadius: 2 }}
                >
                  {ROLES.map((r) => (
                    <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Sucursal</InputLabel>
                <Select
                  label="Sucursal"
                  defaultValue=""
                  {...register("sucursal")}
                  sx={{ borderRadius: 2 }}
                >
                  {SUCURSALES.map((s) => (
                    <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          <Divider sx={{ my: 2.5 }} />

          <SeccionTitulo>Contraseña temporal</SeccionTitulo>
          <Box
            sx={{
              p: 2, borderRadius: 3, border: 1, borderColor: "divider",
              bgcolor: "background.default", display: "flex", alignItems: "center", gap: 1.5,
            }}
          >
            <Box
              sx={{
                width: 38, height: 38, borderRadius: 2, flexShrink: 0,
                bgcolor: theme.palette.warning.main + "18", color: "warning.main",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <VpnKeyOutlinedIcon fontSize="small" />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <AppInput
                type="text"
                error={errors.password}
                helperText={errors.password?.message}
                {...register("password", {
                  required: "Campo obligatorio",
                  minLength: { value: 8, message: "Mínimo 8 caracteres" },
                })}
                slotProps={{
                  input: {
                    readOnly: true,
                    sx: { fontFamily: "monospace", fontWeight: 600, bgcolor: "background.paper" },
                    endAdornment: (
                      <InputAdornment position="end">
                        <Tooltip title={copiado ? "¡Copiado!" : "Copiar"}>
                          <IconButton size="small" onClick={copiarPassword} edge="end">
                            <ContentCopyIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Generar otra">
                          <IconButton size="small" onClick={regenerarPassword} edge="end">
                            <RefreshIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </InputAdornment>
                    ),
                  },
                }}
              />
            </Box>
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
            Cópiala y compártela con el usuario. Podrá cambiarla después.
          </Typography>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 3, pt: 1 }}>
          <AppButton variant="outlined" onClick={cerrar} sx={{ borderRadius: 2 }}>Cancelar</AppButton>
          <AppButton type="submit" loading={isSubmitting} sx={{ borderRadius: 2 }}>Crear Usuario</AppButton>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
