import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import {
  Box, Typography, Grid, Alert, CircularProgress,
  MenuItem, Select, FormControl, InputLabel, IconButton, InputAdornment, Tooltip,
  Chip, OutlinedInput, Avatar, Stack,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import RefreshIcon from "@mui/icons-material/Refresh";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import AddIcon from "@mui/icons-material/Add";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import BusinessOutlinedIcon from "@mui/icons-material/BusinessOutlined";
import ContactPhoneOutlinedIcon from "@mui/icons-material/ContactPhoneOutlined";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import PaymentsOutlinedIcon from "@mui/icons-material/PaymentsOutlined";
import TuneOutlinedIcon from "@mui/icons-material/TuneOutlined";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";
import AppButton from "../../shared/components/AppButton";
import AppCard from "../../shared/components/AppCard";
import AppInput from "../../shared/components/AppInput";
import { obtenerCliente, crearCliente, actualizarCliente } from "../../services/clientes";
import {
  listarContactos, crearContacto, actualizarContacto, eliminarContacto,
} from "../../services/contactos";
import { generarPasswordSegura } from "../../shared/utils/generarPassword";
import { SECTORES } from "../../shared/constants/sectores";
import ContactoDialog from "./ContactoDialog";
import ConfirmDialog from "../../shared/components/ConfirmDialog";

const USO_CFDI = [
  { value: "G01", label: "G01 - Adquisición de mercancías" },
  { value: "G02", label: "G02 - Devoluciones, descuentos o bonificaciones" },
  { value: "G03", label: "G03 - Gastos en general" },
  { value: "I01", label: "I01 - Construcciones" },
  { value: "I04", label: "I04 - Equipo de computo" },
  { value: "P01", label: "P01 - Por definir" },
];

const FORMA_PAGO = [
  { value: "01", label: "01 - Efectivo" },
  { value: "02", label: "02 - Cheque nominativo" },
  { value: "03", label: "03 - Transferencia electrónica" },
  { value: "28", label: "28 - Tarjeta de débito" },
  { value: "29", label: "29 - Tarjeta de crédito" },
  { value: "99", label: "99 - Por definir" },
];

const METODO_PAGO = [
  { value: "PUE", label: "PUE - Pago en una sola exhibición" },
  { value: "PPD", label: "PPD - Pago en parcialidades o diferido" },
];

const SUCURSALES = [
  { value: "juarez", label: "Juárez" },
  { value: "chihuahua", label: "Chihuahua" },
];

const DIAS_SEMANA = [
  { value: "lunes", label: "Lunes" },
  { value: "martes", label: "Martes" },
  { value: "miercoles", label: "Miércoles" },
  { value: "jueves", label: "Jueves" },
  { value: "viernes", label: "Viernes" },
  { value: "sabado", label: "Sábado" },
  { value: "domingo", label: "Domingo" },
];

function SeccionTitulo({ icon: Icon, children }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, mb: 0.5 }}>
      <Box sx={{ width: 4, height: 20, borderRadius: 1, bgcolor: "secondary.main", flexShrink: 0 }} />
      {Icon && <Icon fontSize="small" sx={{ color: "secondary.main" }} />}
      <Typography variant="h6" fontWeight={700}>{children}</Typography>
    </Box>
  );
}

export default function ClienteForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [loadingData, setLoadingData] = useState(isEdit);
  const [submitError, setSubmitError] = useState("");
  const [copiado, setCopiado] = useState(false);

  const [contactos, setContactos] = useState([]);
  const [dialogContactoAbierto, setDialogContactoAbierto] = useState(false);
  const [contactoEnEdicion, setContactoEnEdicion] = useState(null);
  const [contactoAEliminar, setContactoAEliminar] = useState(null);
  const [guardandoContacto, setGuardandoContacto] = useState(false);
  const [errorContactos, setErrorContactos] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    control,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: isEdit ? {} : { password: generarPasswordSegura() },
  });

  const password = watch("password");

  useEffect(() => {
    if (!isEdit) return;
    let cancelado = false;

    obtenerCliente(id)
      .then((cliente) => {
        if (cancelado) return;
        reset({ ...cliente, password: "" });
      })
      .catch(() => {
        if (!cancelado) setSubmitError("No se pudo cargar el cliente.");
      })
      .finally(() => {
        if (!cancelado) setLoadingData(false);
      });

    return () => {
      cancelado = true;
    };
  }, [id, isEdit, reset]);

  const recargarContactos = async () => {
    try {
      setContactos(await listarContactos(id));
    } catch {
      setErrorContactos("No se pudieron cargar los contactos.");
    }
  };

  useEffect(() => {
    if (!isEdit) return;
    recargarContactos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isEdit]);

  const abrirNuevoContacto = () => {
    setContactoEnEdicion(null);
    setDialogContactoAbierto(true);
  };

  const abrirEditarContacto = (contacto) => {
    setContactoEnEdicion(contacto);
    setDialogContactoAbierto(true);
  };

  const guardarContacto = async (datos) => {
    setGuardandoContacto(true);
    setErrorContactos("");
    try {
      if (contactoEnEdicion) {
        await actualizarContacto(id, contactoEnEdicion._id, datos);
      } else {
        await crearContacto(id, datos);
      }
      await recargarContactos();
      setDialogContactoAbierto(false);
    } catch (err) {
      setErrorContactos(err.response?.data?.message || "No se pudo guardar el contacto.");
    } finally {
      setGuardandoContacto(false);
    }
  };

  const confirmarEliminarContacto = async () => {
    if (!contactoAEliminar) return;
    setGuardandoContacto(true);
    try {
      await eliminarContacto(id, contactoAEliminar._id);
      setContactoAEliminar(null);
      await recargarContactos();
    } catch {
      setErrorContactos("No se pudo eliminar el contacto.");
    } finally {
      setGuardandoContacto(false);
    }
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
    if (isEdit && !payload.password) delete payload.password;

    try {
      if (isEdit) {
        await actualizarCliente(id, payload);
      } else {
        await crearCliente(payload);
      }
      navigate("/clientes");
    } catch (err) {
      setSubmitError(err.response?.data?.message || "No se pudo guardar el cliente.");
    }
  };

  if (loadingData) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: "flex", flexDirection: "row", flexWrap: "nowrap", alignItems: "center", gap: 3, mb: 4 }}>
        <AppButton
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate("/clientes")}
          sx={{ borderRadius: 2 }}
        >
          Regresar
        </AppButton>
        <Box>
          <Typography variant="h5" fontWeight={700}>
            {isEdit ? "Editar Cliente" : "Nuevo Cliente"}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {isEdit
              ? "Modifica los datos del cliente"
              : "Registra un nuevo cliente en el sistema"}
          </Typography>
        </Box>
      </Box>

      {submitError && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
          {submitError}
        </Alert>
      )}

      <Box component="form" onSubmit={handleSubmit(onSubmit)}>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>
          Los campos marcados con <Box component="span" sx={{ color: "error.main" }}>*</Box> son obligatorios
        </Typography>

        <AppCard sx={{ mb: 2.5 }}>
          <SeccionTitulo icon={BusinessOutlinedIcon}>Información Fiscal</SeccionTitulo>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>
            Datos para facturar y los correos donde le llegan cotizaciones y facturas al cliente.
          </Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <AppInput
                label="Razón Social *"
                error={errors.nombre}
                {...register("nombre", { required: "Campo obligatorio" })}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <AppInput
                label="RFC *"
                error={errors.rfc}
                {...register("rfc", { required: "Campo obligatorio" })}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <AppInput
                label="Nombre de Compañía"
                error={errors.nombreComercial}
                {...register("nombreComercial")}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <AppInput
                label="Regimen Fiscal *"
                error={errors.regimenFiscal}
                {...register("regimenFiscal", { required: "Campo obligatorio" })}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <FormControl fullWidth size="small" error={!!errors.usoCFDI}>
                <InputLabel>Uso de CFDI *</InputLabel>
                <Controller
                  name="usoCFDI"
                  control={control}
                  rules={{ required: true }}
                  render={({ field }) => (
                    <Select label="Uso de CFDI *" {...field} value={field.value ?? ""} sx={{ borderRadius: 2 }}>
                      {USO_CFDI.map((o) => (
                        <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                      ))}
                    </Select>
                  )}
                />
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <AppInput label="Correo (Cotizaciones)" {...register("contacto.emailCotizaciones")} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <AppInput label="Correo (Facturación)" {...register("contacto.emailFacturacion")} />
            </Grid>
          </Grid>
        </AppCard>

        <AppCard sx={{ mb: 2.5 }}>
          <SeccionTitulo icon={ContactPhoneOutlinedIcon}>Contacto Principal</SeccionTitulo>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>
            La persona con la que se coordina el servicio. Para más contactos del mismo cliente, usa la sección "Contactos" más abajo.
          </Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <AppInput label="Nombre Contacto" {...register("contacto.nombre")} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <AppInput label="Telefono" {...register("contacto.telefono")} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <AppInput label="Correo" {...register("contacto.correo")} />
            </Grid>
          </Grid>
        </AppCard>

        <AppCard sx={{ mb: 2.5 }}>
          <SeccionTitulo icon={LocationOnOutlinedIcon}>Domicilio Fiscal</SeccionTitulo>
          <Box sx={{ mb: 1 }} />
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <AppInput
                label="Calle *"
                error={errors.domicilioFiscal?.calle}
                {...register("domicilioFiscal.calle", { required: "Campo obligatorio" })}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <AppInput
                label="Numero Exterior *"
                error={errors.domicilioFiscal?.numExterior}
                {...register("domicilioFiscal.numExterior", { required: "Campo obligatorio" })}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <AppInput
                label="Numero Interior"
                {...register("domicilioFiscal.numInterior")}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <AppInput
                label="Colonia *"
                error={errors.domicilioFiscal?.colonia}
                {...register("domicilioFiscal.colonia", { required: "Campo obligatorio" })}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <AppInput
                label="Municipio *"
                error={errors.domicilioFiscal?.municipio}
                {...register("domicilioFiscal.municipio", { required: "Campo obligatorio" })}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <AppInput
                label="Ciudad *"
                error={errors.domicilioFiscal?.ciudad}
                {...register("domicilioFiscal.ciudad", { required: "Campo obligatorio" })}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <AppInput
                label="Estado *"
                error={errors.domicilioFiscal?.estado}
                {...register("domicilioFiscal.estado", { required: "Campo obligatorio" })}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <AppInput
                label="Pais *"
                error={errors.domicilioFiscal?.pais}
                {...register("domicilioFiscal.pais", { required: "Campo obligatorio" })}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <AppInput
                label="C.P. *"
                error={errors.domicilioFiscal?.cp}
                {...register("domicilioFiscal.cp", { required: "Campo obligatorio" })}
              />
            </Grid>
          </Grid>
        </AppCard>

        <AppCard sx={{ mb: 2.5 }}>
          <SeccionTitulo icon={PaymentsOutlinedIcon}>Facturación</SeccionTitulo>
          <Box sx={{ mb: 1 }} />
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Forma de Pago</InputLabel>
                <Controller
                  name="facturacion.formaPago"
                  control={control}
                  render={({ field }) => (
                    <Select label="Forma de Pago" {...field} value={field.value ?? ""} sx={{ borderRadius: 2 }}>
                      {FORMA_PAGO.map((o) => (
                        <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                      ))}
                    </Select>
                  )}
                />
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Metodo de Pago</InputLabel>
                <Controller
                  name="facturacion.metodoPago"
                  control={control}
                  render={({ field }) => (
                    <Select label="Metodo de Pago" {...field} value={field.value ?? ""} sx={{ borderRadius: 2 }}>
                      {METODO_PAGO.map((o) => (
                        <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                      ))}
                    </Select>
                  )}
                />
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <AppInput label="Numero de cuenta" {...register("facturacion.numCuenta")} />
            </Grid>
          </Grid>
        </AppCard>

        <AppCard sx={{ mb: 2.5 }}>
          <SeccionTitulo icon={TuneOutlinedIcon}>Operación</SeccionTitulo>
          <Box sx={{ mb: 1 }} />
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
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
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Sector</InputLabel>
                <Controller
                  name="sector"
                  control={control}
                  render={({ field }) => (
                    <Select label="Sector" {...field} value={field.value ?? ""} sx={{ borderRadius: 2 }}>
                      <MenuItem value="">Sin especificar</MenuItem>
                      {SECTORES.map((s) => (
                        <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>
                      ))}
                    </Select>
                  )}
                />
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Días de Contra Recibo</InputLabel>
                <Controller
                  name="diasContraRecibo"
                  control={control}
                  render={({ field }) => (
                    <Select
                      label="Días de Contra Recibo"
                      multiple
                      {...field}
                      value={field.value ?? []}
                      input={<OutlinedInput label="Días de Contra Recibo" />}
                      sx={{ borderRadius: 2 }}
                      renderValue={(selected) => (
                        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                          {selected.map((v) => (
                            <Chip
                              key={v}
                              label={DIAS_SEMANA.find((d) => d.value === v)?.label ?? v}
                              size="small"
                            />
                          ))}
                        </Box>
                      )}
                    >
                      {DIAS_SEMANA.map((d) => (
                        <MenuItem key={d.value} value={d.value}>{d.label}</MenuItem>
                      ))}
                    </Select>
                  )}
                />
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <AppInput
                label={isEdit ? "Nueva contraseña (opcional)" : "Contraseña generada *"}
                type="text"
                helperText={
                  errors.password?.message ||
                  (isEdit
                    ? "Déjalo en blanco para no cambiarla, o genera una y compártela con el cliente"
                    : "Cópiala y compártela con el cliente. Podrá cambiarla después.")
                }
                error={errors.password}
                {...register("password", {
                  required: isEdit ? false : "Campo obligatorio",
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
                        <Tooltip title={isEdit ? "Generar nueva contraseña" : "Generar otra"}>
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
          </Grid>
        </AppCard>

        <AppCard sx={{ mb: 2.5 }}>
          <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 2, mb: 0.5 }}>
            <SeccionTitulo icon={GroupsOutlinedIcon}>Contactos</SeccionTitulo>
            {isEdit && (
              <AppButton type="button" size="small" startIcon={<AddIcon />} onClick={abrirNuevoContacto} sx={{ borderRadius: 2 }}>
                Agregar contacto
              </AppButton>
            )}
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>
            Puedes registrar varios contactos de este cliente — se eligen al generar una cotización o un reporte.
          </Typography>

          {errorContactos && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setErrorContactos("")}>
              {errorContactos}
            </Alert>
          )}

          {!isEdit ? (
            <Typography variant="body2" color="text.secondary" sx={{ py: 1.5 }}>
              Guarda el cliente primero para poder agregarle contactos.
            </Typography>
          ) : contactos.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ py: 1.5 }}>
              Este cliente todavía no tiene contactos registrados.
            </Typography>
          ) : (
            <Stack spacing={1.25}>
              {contactos.map((c) => (
                <Box
                  key={c._id}
                  sx={{
                    display: "flex", alignItems: "center", gap: 1.5, p: 1.25, borderRadius: 2,
                    border: 1, borderColor: "divider",
                  }}
                >
                  <Avatar sx={{ width: 34, height: 34, fontSize: 13, bgcolor: "secondary.main" }}>
                    {c.nombre?.charAt(0) || "?"}
                  </Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={600} noWrap>{c.nombre}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block" }} noWrap>
                      {[c.telefono, c.correo].filter(Boolean).join(" · ") || "Sin más datos"}
                    </Typography>
                  </Box>
                  <Tooltip title="Editar contacto">
                    <IconButton size="small" onClick={() => abrirEditarContacto(c)}>
                      <EditOutlinedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Eliminar contacto">
                    <IconButton size="small" onClick={() => setContactoAEliminar(c)}>
                      <DeleteOutlineIcon fontSize="small" sx={{ color: "error.main" }} />
                    </IconButton>
                  </Tooltip>
                </Box>
              ))}
            </Stack>
          )}
        </AppCard>

        <Box sx={{ display: "flex", gap: 2, justifyContent: "flex-end" }}>
          <AppButton
            type="button"
            variant="outlined"
            onClick={() => navigate("/clientes")}
            sx={{ borderRadius: 2 }}
          >
            Cancelar
          </AppButton>
          <AppButton type="submit" loading={isSubmitting} sx={{ borderRadius: 2 }}>
            {isEdit ? "Guardar cambios" : "Registrar Cliente"}
          </AppButton>
        </Box>
      </Box>

      {isEdit && (
        <>
          <ContactoDialog
            open={dialogContactoAbierto}
            contacto={contactoEnEdicion}
            loading={guardandoContacto}
            onClose={() => setDialogContactoAbierto(false)}
            onSave={guardarContacto}
          />
          <ConfirmDialog
            open={!!contactoAEliminar}
            title="Eliminar contacto"
            message={`¿Eliminar a "${contactoAEliminar?.nombre}"? Ya no aparecerá para elegirlo en nuevas cotizaciones o reportes.`}
            loading={guardandoContacto}
            onCancel={() => setContactoAEliminar(null)}
            onConfirm={confirmarEliminarContacto}
          />
        </>
      )}
    </Box>
  );
}
