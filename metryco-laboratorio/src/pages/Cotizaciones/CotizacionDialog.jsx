import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Box, Typography, Grid,
  IconButton, Table, TableHead, TableRow, TableCell, TableBody, Paper, Chip,
  MenuItem, Select, FormControl, InputLabel, Alert, CircularProgress,
} from "@mui/material";
import { AddCircleOutlined as AddCircleOutlineIcon } from "@mui/icons-material";
import { DeleteOutlined as DeleteOutlineIcon } from "@mui/icons-material";
import CloseIcon from "@mui/icons-material/Close";
import FactCheckOutlinedIcon from "@mui/icons-material/FactCheckOutlined";

import AppButton from "../../shared/components/AppButton";
import AppInput from "../../shared/components/AppInput";
import AppDatePicker from "../../shared/components/AppDatePicker";
import { formatCurrency } from "../../shared/utils/currency";
import { direccionCliente } from "../../shared/utils/direccionCliente";
import { listarClientes } from "../../services/clientes";
import { obtenerCotizacion, crearCotizacion, actualizarCotizacion } from "../../services/cotizaciones";

const STATUS_MAP = {
  pendiente: { label: "Pendiente", color: "warning" },
  aprobada: { label: "Aprobada", color: "success" },
  rechazada: { label: "Rechazada", color: "error" },
  facturada: { label: "Facturada", color: "info" },
  vencida: { label: "Vencida", color: "default" },
};

const DEFAULT_VALUES = {
  cliente: "",
  vigencia: "",
  observaciones: "",
  items: [{ descripcion: "", cantidad: 1, precioUnitario: 0 }],
};

export default function CotizacionDialog({ open, cotizacionId, onClose, onSaved }) {
  const isEdit = !!cotizacionId;
  const navigate = useNavigate();

  const [clientes, setClientes] = useState([]);
  const [cotizacionData, setCotizacionData] = useState(null); // folio, status, reporte ligado — solo lectura
  const [loadingData, setLoadingData] = useState(true);
  const [submitError, setSubmitError] = useState("");
  const [pasoClienteConfirmado, setPasoClienteConfirmado] = useState(isEdit);

  const {
    register, control, handleSubmit, watch, reset, getValues,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: DEFAULT_VALUES });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const items = watch("items");
  const clienteSeleccionado = watch("cliente");
  const total = items.reduce((sum, i) => sum + (Number(i.cantidad) * Number(i.precioUnitario) || 0), 0);

  useEffect(() => {
    if (!open) return;
    let cancelado = false;

    (async () => {
      setLoadingData(true);
      setSubmitError("");
      try {
        const [{ items: clientesData }, cotizacion] = await Promise.all([
          listarClientes({ pageSize: 200 }),
          isEdit ? obtenerCotizacion(cotizacionId) : Promise.resolve(null),
        ]);
        if (cancelado) return;

        setClientes(clientesData);

        if (cotizacion) {
          reset({
            cliente: cotizacion.cliente?._id || cotizacion.cliente,
            vigencia: cotizacion.vigencia ? cotizacion.vigencia.slice(0, 10) : "",
            observaciones: cotizacion.observaciones || "",
            items: cotizacion.items,
          });
          setCotizacionData(cotizacion);
          setPasoClienteConfirmado(true);
        } else {
          reset(DEFAULT_VALUES);
          setCotizacionData(null);
          setPasoClienteConfirmado(false);
        }
      } catch {
        if (!cancelado) setSubmitError("No se pudieron cargar los datos de la cotización.");
      } finally {
        if (!cancelado) setLoadingData(false);
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [open, cotizacionId, isEdit, reset]);

  const onSubmit = async (data) => {
    setSubmitError("");
    try {
      if (isEdit) {
        await actualizarCotizacion(cotizacionId, data);
      } else {
        await crearCotizacion(data);
      }
      onSaved();
    } catch (err) {
      setSubmitError(err.response?.data?.message || "No se pudo guardar la cotización.");
    }
  };

  const clienteNombre = clientes.find((c) => c._id === clienteSeleccionado)?.nombre;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth scroll="paper">
      <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontWeight: 700 }}>
        {isEdit ? "Editar Cotización" : "Generar Nueva Cotización"}
        <IconButton size="small" onClick={onClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        {loadingData ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Box component="form" id="cotizacion-form" onSubmit={handleSubmit(onSubmit)}>
            {submitError && <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>{submitError}</Alert>}

            {clientes.length === 0 && (
              <Alert severity="warning" sx={{ mb: 3, borderRadius: 2 }}>
                Todavía no hay clientes registrados. Da de alta un cliente antes de generar una cotización.
              </Alert>
            )}

            {!pasoClienteConfirmado ? (
              <Box>
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
                  Seleccionar Cliente a Cotizar
                </Typography>
                <Grid container spacing={2} alignItems="center">
                  <Grid size={{ xs: 12, md: 8 }}>
                    <FormControl fullWidth size="small" error={!!errors.cliente}>
                      <InputLabel>Cliente</InputLabel>
                      <Select label="Cliente" defaultValue="" {...register("cliente", { required: true })} sx={{ borderRadius: 2 }}>
                        {clientes.map((c) => (
                          <MenuItem key={c._id} value={c._id}>{c.nombre}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <AppButton
                      fullWidth
                      disabled={!getValues("cliente") && !clienteSeleccionado}
                      onClick={() => {
                        if (clienteSeleccionado) setPasoClienteConfirmado(true);
                      }}
                      sx={{ borderRadius: 2 }}
                    >
                      Continuar
                    </AppButton>
                  </Grid>
                </Grid>
              </Box>
            ) : (
              <>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: isEdit ? 1 : 3, p: 1.5, borderRadius: 2, bgcolor: "background.default", flexWrap: "wrap" }}>
                  <Typography variant="body2" color="text.secondary">Cliente:</Typography>
                  <Typography variant="body2" fontWeight={700}>{clienteNombre}</Typography>
                  {isEdit && cotizacionData?.status && (
                    <Chip size="small" label={STATUS_MAP[cotizacionData.status]?.label || cotizacionData.status}
                      color={STATUS_MAP[cotizacionData.status]?.color || "default"} />
                  )}
                  {!isEdit && (
                    <AppButton variant="text" size="small" onClick={() => setPasoClienteConfirmado(false)} sx={{ ml: "auto" }}>
                      Cambiar cliente
                    </AppButton>
                  )}
                </Box>

                {isEdit && cotizacionData && (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 3, p: 1.5, borderRadius: 2, border: 1, borderColor: "divider", flexWrap: "wrap" }}>
                    <Box sx={{ flex: 1, minWidth: 220 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                        {cotizacionData.cliente?.contacto?.nombre ? `Contacto: ${cotizacionData.cliente.contacto.nombre}` : ""}
                        {cotizacionData.cliente?.contacto?.telefono ? ` · Tel. ${cotizacionData.cliente.contacto.telefono}` : ""}
                      </Typography>
                      {direccionCliente(cotizacionData.cliente) && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.25 }}>
                          {direccionCliente(cotizacionData.cliente)}
                        </Typography>
                      )}
                    </Box>
                    {cotizacionData.reporte ? (
                      <AppButton size="small" variant="outlined" startIcon={<FactCheckOutlinedIcon />}
                        onClick={() => { onClose(); navigate(`/reportes/${cotizacionData.reporte._id}`); }}
                        sx={{ borderRadius: 2 }}>
                        Reporte de Servicio: {cotizacionData.reporte.folio}
                      </AppButton>
                    ) : (
                      <Typography variant="caption" color="text.secondary">Sin reporte de servicio ligado todavía</Typography>
                    )}
                  </Box>
                )}

                <Grid container spacing={2} sx={{ mb: 3 }}>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <Controller
                      name="vigencia"
                      control={control}
                      rules={{ required: "Campo obligatorio" }}
                      render={({ field, fieldState }) => (
                        <AppDatePicker
                          label="Fecha de vigencia"
                          value={field.value}
                          onChange={field.onChange}
                          error={fieldState.error}
                        />
                      )}
                    />
                  </Grid>
                </Grid>

                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
                  Servicios / Partidas
                </Typography>
                <Paper elevation={0} sx={{ border: 1, borderColor: "divider", borderRadius: 2, overflow: "hidden", mb: 2 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: "background.default" }}>
                        <TableCell sx={{ fontWeight: 700 }}>Descripción del servicio</TableCell>
                        <TableCell sx={{ fontWeight: 700 }} width={110}>Cantidad</TableCell>
                        <TableCell sx={{ fontWeight: 700 }} width={150}>Precio Unitario</TableCell>
                        <TableCell sx={{ fontWeight: 700 }} width={130}>Importe</TableCell>
                        <TableCell width={50} />
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {fields.map((field, idx) => (
                        <TableRow key={field.id}>
                          <TableCell>
                            <AppInput {...register(`items.${idx}.descripcion`, { required: true })} placeholder="Ej: Calibración de vernier" />
                          </TableCell>
                          <TableCell>
                            <AppInput type="number" {...register(`items.${idx}.cantidad`, { required: true, min: 1 })} inputProps={{ min: 1 }} />
                          </TableCell>
                          <TableCell>
                            <AppInput type="number" {...register(`items.${idx}.precioUnitario`, { required: true, min: 0 })} inputProps={{ min: 0, step: 0.01 }} />
                          </TableCell>
                          <TableCell>
                            <Typography fontWeight={600}>
                              {formatCurrency(Number(items[idx]?.cantidad) * Number(items[idx]?.precioUnitario) || 0)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <IconButton size="small" onClick={() => remove(idx)} disabled={fields.length === 1}>
                              <DeleteOutlineIcon fontSize="small" sx={{ color: "error.main" }} />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Paper>

                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
                  <AppButton
                    variant="outlined"
                    startIcon={<AddCircleOutlineIcon />}
                    onClick={() => append({ descripcion: "", cantidad: 1, precioUnitario: 0 })}
                    sx={{ borderRadius: 2 }}
                  >
                    Agregar partida
                  </AppButton>
                  <Box sx={{ textAlign: "right" }}>
                    <Typography color="text.secondary" variant="body2">Total estimado (antes de IVA)</Typography>
                    <Typography variant="h5" fontWeight={700} color="secondary.main">{formatCurrency(total)}</Typography>
                    <Typography variant="caption" color="text.secondary">El IVA (16%) se calcula al guardar</Typography>
                  </Box>
                </Box>

                <AppInput
                  label="Observaciones o condiciones especiales"
                  multiline
                  rows={3}
                  {...register("observaciones")}
                />
              </>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <AppButton variant="outlined" onClick={onClose} sx={{ borderRadius: 2 }}>Cancelar</AppButton>
        {pasoClienteConfirmado && (
          <AppButton type="submit" form="cotizacion-form" loading={isSubmitting} sx={{ borderRadius: 2 }}>
            {isEdit ? "Guardar cambios" : "Generar Cotización"}
          </AppButton>
        )}
      </DialogActions>
    </Dialog>
  );
}
