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
import PrintOutlinedIcon from "@mui/icons-material/PrintOutlined";
import AttachFileOutlinedIcon from "@mui/icons-material/AttachFileOutlined";
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import ContentCopyOutlinedIcon from "@mui/icons-material/ContentCopyOutlined";

import AppButton from "../../shared/components/AppButton";
import AppInput from "../../shared/components/AppInput";
import AppCard from "../../shared/components/AppCard";
import AppDatePicker from "../../shared/components/AppDatePicker";
import { formatCurrency } from "../../shared/utils/currency";
import { formatDate } from "../../shared/utils/formatDate";
import { listarClientes } from "../../services/clientes";
import { listarRazonesSociales } from "../../services/razonesSociales";
import { listarContactos } from "../../services/contactos";
import {
  obtenerCotizacion, crearCotizacion, actualizarCotizacion,
  subirAdjuntoCotizacion, fetchAdjuntoCotizacionBlob, eliminarAdjuntoCotizacion,
} from "../../services/cotizaciones";
import { pedirRefrescoAlertas } from "../../shared/utils/alertasBus";

const MONEDAS = ["MXN", "USD"];
const IVAS = [0, 8, 16];

function tamanoLegible(bytes) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const STATUS_MAP = {
  pendiente: { label: "Pendiente", color: "warning" },
  aprobada: { label: "Aprobada", color: "success" },
  rechazada: { label: "Rechazada", color: "error" },
  facturada: { label: "Facturada", color: "info" },
  vencida: { label: "Vencida", color: "default" },
};

const DEFAULT_VALUES = {
  cliente: "",
  razonSocial: "",
  contacto: "",
  vigencia: "",
  observaciones: "",
  moneda: "MXN",
  ivaPorcentaje: 16,
  items: [{ descripcion: "", cantidad: 1, precioUnitario: 0 }],
};

export default function CotizacionDialog({ open, cotizacionId, duplicarDesdeId, onClose, onSaved, onGenerarFactura, onDuplicar }) {
  const isEdit = !!cotizacionId;
  const navigate = useNavigate();

  const [clientes, setClientes] = useState([]);
  const [razonesSociales, setRazonesSociales] = useState([]);
  const [contactosCliente, setContactosCliente] = useState([]);
  const [cotizacionData, setCotizacionData] = useState(null); // folio, status, reporte ligado — solo lectura
  const [loadingData, setLoadingData] = useState(true);
  const [submitError, setSubmitError] = useState("");
  const [pasoClienteConfirmado, setPasoClienteConfirmado] = useState(isEdit);
  const [adjuntos, setAdjuntos] = useState([]);
  const [subiendoAdjunto, setSubiendoAdjunto] = useState(false);

  const {
    register, control, handleSubmit, watch, reset, getValues,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: DEFAULT_VALUES });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const items = watch("items");
  const ivaPorcentaje = watch("ivaPorcentaje");
  const moneda = watch("moneda");
  const clienteSeleccionado = watch("cliente");
  const subtotal = items.reduce((sum, i) => sum + (Number(i.cantidad) * Number(i.precioUnitario) || 0), 0);
  const ivaCalc = subtotal * (Number(ivaPorcentaje || 0) / 100);
  const total = subtotal + ivaCalc;

  useEffect(() => {
    if (!open) return;
    let cancelado = false;

    (async () => {
      setLoadingData(true);
      setSubmitError("");
      try {
        const [{ items: clientesData }, cotizacion, razonesData] = await Promise.all([
          listarClientes({ pageSize: 200 }),
          isEdit ? obtenerCotizacion(cotizacionId)
            : duplicarDesdeId ? obtenerCotizacion(duplicarDesdeId)
            : Promise.resolve(null),
          listarRazonesSociales({ soloActivas: "true" }).catch(() => []),
        ]);
        if (cancelado) return;

        setClientes(clientesData);
        setRazonesSociales(razonesData);

        if (isEdit && cotizacion) {
          reset({
            cliente: cotizacion.cliente?._id || cotizacion.cliente,
            razonSocial: cotizacion.razonSocial?._id || cotizacion.razonSocial || "",
            contacto: cotizacion.contacto?._id || cotizacion.contacto || "",
            vigencia: cotizacion.vigencia ? cotizacion.vigencia.slice(0, 10) : "",
            observaciones: cotizacion.observaciones || "",
            moneda: cotizacion.moneda || "MXN",
            ivaPorcentaje: cotizacion.ivaPorcentaje ?? 16,
            items: cotizacion.items,
          });
          setCotizacionData(cotizacion);
          setAdjuntos(cotizacion.adjuntos || []);
          setPasoClienteConfirmado(true);
        } else if (duplicarDesdeId && cotizacion) {
          // Duplicar: mismo cliente/partidas/moneda, sin folio/adjuntos/vigencia
          // — se captura como una cotización nueva desde cero.
          reset({
            cliente: cotizacion.cliente?._id || cotizacion.cliente,
            razonSocial: cotizacion.razonSocial?._id || cotizacion.razonSocial || "",
            contacto: cotizacion.contacto?._id || cotizacion.contacto || "",
            vigencia: "",
            observaciones: cotizacion.observaciones || "",
            moneda: cotizacion.moneda || "MXN",
            ivaPorcentaje: cotizacion.ivaPorcentaje ?? 16,
            items: cotizacion.items.map((i) => ({ descripcion: i.descripcion, cantidad: i.cantidad, precioUnitario: i.precioUnitario })),
          });
          setCotizacionData(null);
          setAdjuntos([]);
          setPasoClienteConfirmado(true);
        } else {
          reset(DEFAULT_VALUES);
          setCotizacionData(null);
          setAdjuntos([]);
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
  }, [open, cotizacionId, duplicarDesdeId, isEdit, reset]);

  // Contactos del cliente elegido — se recargan cada vez que cambia (permite
  // elegir cuál va como "Requisitor" de la cotización, como en el legacy).
  useEffect(() => {
    if (!clienteSeleccionado) { setContactosCliente([]); return; }
    let cancelado = false;
    listarContactos(clienteSeleccionado)
      .then((lista) => { if (!cancelado) setContactosCliente(lista); })
      .catch(() => { if (!cancelado) setContactosCliente([]); });
    return () => { cancelado = true; };
  }, [clienteSeleccionado]);

  const onSubmit = async (data) => {
    setSubmitError("");
    try {
      if (isEdit) {
        await actualizarCotizacion(cotizacionId, data);
      } else {
        await crearCotizacion(data);
      }
      pedirRefrescoAlertas();
      onSaved();
    } catch (err) {
      setSubmitError(err.response?.data?.message || "No se pudo guardar la cotización.");
    }
  };

  const clienteObj = (isEdit && cotizacionData?.cliente) || clientes.find((c) => c._id === clienteSeleccionado);
  const clienteNombre = clienteObj?.nombre;
  const contactoSeleccionadoId = watch("contacto");
  const contactoSeleccionado = contactosCliente.find((c) => c._id === contactoSeleccionadoId);
  const telefonoMostrado = contactoSeleccionado?.telefono || (!contactoSeleccionadoId ? clienteObj?.contacto?.telefono : "");

  const subirArchivo = async (archivo) => {
    if (!archivo || !cotizacionId) return;
    setSubiendoAdjunto(true);
    try {
      const cot = await subirAdjuntoCotizacion(cotizacionId, archivo);
      setAdjuntos(cot.adjuntos || []);
    } catch {
      setSubmitError("No se pudo subir el archivo adjunto.");
    } finally {
      setSubiendoAdjunto(false);
    }
  };

  const descargarAdjunto = async (adjunto) => {
    try {
      const blob = await fetchAdjuntoCotizacionBlob(cotizacionId, adjunto._id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = adjunto.nombreOriginal || "archivo";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch {
      setSubmitError("No se pudo descargar el archivo.");
    }
  };

  const quitarAdjunto = async (adjunto) => {
    try {
      const cot = await eliminarAdjuntoCotizacion(cotizacionId, adjunto._id);
      setAdjuntos(cot.adjuntos || []);
    } catch {
      setSubmitError("No se pudo eliminar el archivo.");
    }
  };

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
                {isEdit && cotizacionData && (
                  <AppCard
                    dense
                    sx={{ mb: 2.5 }}
                    title={`Cotización ${cotizacionData.folio}`}
                    subtitle={`Creada ${formatDate(cotizacionData.fecha)}`}
                    action={
                      <Chip size="small" label={STATUS_MAP[cotizacionData.status]?.label || cotizacionData.status}
                        color={STATUS_MAP[cotizacionData.status]?.color || "default"} />
                    }
                  >
                    <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                      {cotizacionData.reporte && (
                        <AppButton size="small" variant="outlined" startIcon={<FactCheckOutlinedIcon />}
                          onClick={() => { onClose(); navigate(`/reportes/${cotizacionData.reporte._id}`); }}
                          sx={{ borderRadius: 2 }}>
                          Reporte: {cotizacionData.reporte.folio}
                        </AppButton>
                      )}
                      {cotizacionData.status === "aprobada" && onGenerarFactura && (
                        <AppButton size="small" startIcon={<ReceiptLongOutlinedIcon />} onClick={() => onGenerarFactura(cotizacionData)} sx={{ borderRadius: 2 }}>
                          Generar Factura
                        </AppButton>
                      )}
                      {onDuplicar && (
                        <AppButton size="small" variant="outlined" startIcon={<ContentCopyOutlinedIcon />} onClick={() => onDuplicar(cotizacionId)} sx={{ borderRadius: 2 }}>
                          Duplicar
                        </AppButton>
                      )}
                      <AppButton size="small" variant="outlined" startIcon={<PrintOutlinedIcon />}
                        onClick={() => window.open(`/informe/cotizacion/${cotizacionId}`, "_blank")} sx={{ borderRadius: 2 }}>
                        Imprimir
                      </AppButton>
                    </Box>
                  </AppCard>
                )}

                <AppCard
                  dense
                  title="Cliente"
                  sx={{ mb: 2.5 }}
                  action={
                    !isEdit && (
                      <AppButton variant="text" size="small" onClick={() => setPasoClienteConfirmado(false)}>
                        Cambiar cliente
                      </AppButton>
                    )
                  }
                >
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>Cliente</Typography>
                      <Typography variant="body2" fontWeight={700}>{clienteNombre}</Typography>
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>Dirección</Typography>
                      <Typography variant="body2">
                        {[
                          [clienteObj?.domicilioFiscal?.calle, clienteObj?.domicilioFiscal?.numExterior].filter(Boolean).join(" "),
                          clienteObj?.domicilioFiscal?.colonia,
                          clienteObj?.domicilioFiscal?.ciudad || clienteObj?.domicilioFiscal?.municipio,
                        ].filter(Boolean).join(", ") || "—"}
                      </Typography>
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Contacto</InputLabel>
                        <Controller
                          name="contacto" control={control}
                          render={({ field }) => (
                            <Select label="Contacto" {...field} sx={{ borderRadius: 2 }}>
                              <MenuItem value="">
                                {contactosCliente.length === 0 ? "Sin contactos registrados para este cliente" : "— Sin especificar —"}
                              </MenuItem>
                              {contactosCliente.map((c) => <MenuItem key={c._id} value={c._id}>{c.nombre}</MenuItem>)}
                            </Select>
                          )}
                        />
                      </FormControl>
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>Teléfono</Typography>
                      <Typography variant="body2">{telefonoMostrado || "—"}</Typography>
                    </Grid>
                  </Grid>
                </AppCard>

                <AppCard dense title="Configuración de la cotización" sx={{ mb: 2.5 }}>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, md: 3 }}>
                      <FormControl fullWidth size="small" error={!!errors.razonSocial}>
                        <InputLabel>Razón Social Interna</InputLabel>
                        <Controller
                          name="razonSocial" control={control} rules={{ required: "Elige la razón social" }}
                          render={({ field }) => (
                            <Select label="Razón Social Interna" {...field} sx={{ borderRadius: 2 }}>
                              {razonesSociales.map((r) => <MenuItem key={r._id} value={r._id}>{r.nombre}</MenuItem>)}
                            </Select>
                          )}
                        />
                      </FormControl>
                    </Grid>
                    <Grid size={{ xs: 12, md: 3 }}>
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
                    <Grid size={{ xs: 6, md: 3 }}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Moneda</InputLabel>
                        <Controller
                          name="moneda" control={control}
                          render={({ field }) => (
                            <Select label="Moneda" {...field} sx={{ borderRadius: 2 }}>
                              {MONEDAS.map((m) => <MenuItem key={m} value={m}>{m}</MenuItem>)}
                            </Select>
                          )}
                        />
                      </FormControl>
                    </Grid>
                    <Grid size={{ xs: 6, md: 3 }}>
                      <FormControl fullWidth size="small">
                        <InputLabel>IVA</InputLabel>
                        <Controller
                          name="ivaPorcentaje" control={control}
                          render={({ field }) => (
                            <Select label="IVA" {...field} sx={{ borderRadius: 2 }}>
                              {IVAS.map((v) => <MenuItem key={v} value={v}>{v}%</MenuItem>)}
                            </Select>
                          )}
                        />
                      </FormControl>
                    </Grid>
                  </Grid>
                </AppCard>

                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
                  Servicios / Partidas
                </Typography>
                <Paper elevation={0} sx={{ border: 1, borderColor: "divider", borderRadius: 1.5, overflow: "hidden", mb: 2 }}>
                  <Table size="small" sx={{ "& .MuiTableCell-root": { py: 1.5, px: 2.25 } }}>
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
                    <Typography color="text.secondary" variant="body2">Subtotal: {formatCurrency(subtotal)}</Typography>
                    <Typography color="text.secondary" variant="body2">IVA ({ivaPorcentaje || 0}%): {formatCurrency(ivaCalc)}</Typography>
                    <Typography variant="h5" fontWeight={700} color="secondary.main">{formatCurrency(total)} {moneda}</Typography>
                  </Box>
                </Box>

                <AppInput
                  label="Observaciones o condiciones especiales"
                  multiline
                  rows={3}
                  {...register("observaciones")}
                  sx={{ mb: 3 }}
                />

                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
                  Archivos adjuntos
                </Typography>
                {!isEdit ? (
                  <Typography variant="caption" color="text.secondary">
                    Podrás adjuntar archivos extra una vez que guardes la cotización.
                  </Typography>
                ) : (
                  <Box>
                    {adjuntos.length > 0 && (
                      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75, mb: 1.5 }}>
                        {adjuntos.map((a) => (
                          <Box key={a._id} sx={{ display: "flex", alignItems: "center", gap: 1, p: 1, borderRadius: 2, border: 1, borderColor: "divider" }}>
                            <InsertDriveFileOutlinedIcon fontSize="small" sx={{ color: "text.secondary" }} />
                            <Typography variant="body2" sx={{ flex: 1, minWidth: 0 }} noWrap>{a.nombreOriginal}</Typography>
                            <Typography variant="caption" color="text.secondary">{tamanoLegible(a.tamano)}</Typography>
                            <IconButton size="small" onClick={() => descargarAdjunto(a)}>
                              <DownloadOutlinedIcon fontSize="small" sx={{ color: "secondary.main" }} />
                            </IconButton>
                            <IconButton size="small" onClick={() => quitarAdjunto(a)}>
                              <DeleteOutlineIcon fontSize="small" sx={{ color: "error.main" }} />
                            </IconButton>
                          </Box>
                        ))}
                      </Box>
                    )}
                    <AppButton
                      component="label" variant="outlined" size="small" startIcon={<AttachFileOutlinedIcon />}
                      loading={subiendoAdjunto} sx={{ borderRadius: 2 }}
                    >
                      Adjuntar archivo
                      <input
                        type="file" hidden
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) subirArchivo(f); e.target.value = ""; }}
                      />
                    </AppButton>
                  </Box>
                )}
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
