import { useEffect, useState } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Grid, Alert, Box, Typography,
  MenuItem, Select, FormControl, InputLabel, IconButton, InputAdornment, Tooltip, Button,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DrawOutlinedIcon from "@mui/icons-material/DrawOutlined";
import { useForm, Controller } from "react-hook-form";
import AppInput from "../AppInput";
import AppButton from "../AppButton";
import { actualizarUsuario, subirFirmaUsuario, eliminarFirmaUsuario } from "../../../services/usuarios";
import { firmaUrl } from "../../../services/perfil";
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
  const [firma, setFirma] = useState("");
  const [firmaBusy, setFirmaBusy] = useState(false);
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
      setFirma(usuario.firmaUrl || "");
    }
  }, [open, usuario, reset]);

  const onFirmaArchivo = async (e) => {
    const archivo = e.target.files?.[0];
    e.target.value = "";
    if (!archivo || !usuario?.id) return;
    setFirmaBusy(true); setSubmitError("");
    try {
      const u = await subirFirmaUsuario(usuario.id, archivo);
      setFirma(u.firmaUrl || "");
      onSaved?.();
    } catch (err) {
      setSubmitError(err.response?.data?.message || "No se pudo subir la firma.");
    } finally {
      setFirmaBusy(false);
    }
  };

  const quitarFirma = async () => {
    if (!usuario?.id) return;
    setFirmaBusy(true); setSubmitError("");
    try {
      await eliminarFirmaUsuario(usuario.id);
      setFirma("");
      onSaved?.();
    } catch {
      setSubmitError("No se pudo quitar la firma.");
    } finally {
      setFirmaBusy(false);
    }
  };

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
                            <IconButton type="button" size="small" onClick={copiarPassword} edge="end" disabled={!password}>
                              <ContentCopyIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip title="Generar nueva contraseña">
                          <IconButton type="button" size="small" onClick={generarNuevaPassword} edge="end">
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

            <Grid size={{ xs: 12 }}>
              <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <DrawOutlinedIcon sx={{ fontSize: 16 }} /> Firma digital
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
                Aparece en los certificados que este usuario elabore, revise o autorice.
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
                <Box sx={{ width: 160, height: 60, border: "1px dashed", borderColor: "divider", borderRadius: 2, display: "grid", placeItems: "center", bgcolor: "background.default" }}>
                  {firma
                    ? <Box component="img" src={firmaUrl(firma)} alt="Firma" sx={{ maxWidth: "90%", maxHeight: "80%", objectFit: "contain" }} />
                    : <Typography variant="caption" color="text.disabled">Sin firma</Typography>}
                </Box>
                <Button component="label" size="small" variant="outlined" disabled={firmaBusy} sx={{ borderRadius: 2 }}>
                  {firma ? "Cambiar" : "Subir firma"}
                  <input type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" hidden onChange={onFirmaArchivo} />
                </Button>
                {firma && (
                  <Button size="small" color="error" onClick={quitarFirma} disabled={firmaBusy} sx={{ borderRadius: 2 }}>
                    Quitar
                  </Button>
                )}
              </Box>
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <AppButton type="button" variant="outlined" onClick={cerrar}>Cancelar</AppButton>
          <AppButton type="submit" loading={isSubmitting}>Guardar Cambios</AppButton>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
