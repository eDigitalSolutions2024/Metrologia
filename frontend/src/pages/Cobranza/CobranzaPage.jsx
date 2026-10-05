import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Box, Typography, Grid, Paper, Chip, Tooltip, IconButton, Alert, InputAdornment,
  LinearProgress, TextField, Dialog, DialogTitle, DialogContent, DialogActions, MenuItem, Select, FormControl, InputLabel, Tab, Tabs,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useForm, Controller } from "react-hook-form";
import AddIcon from "@mui/icons-material/Add";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutlineOutlined";
import ReplayOutlinedIcon from "@mui/icons-material/ReplayOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import BusinessOutlinedIcon from "@mui/icons-material/BusinessOutlined";
import AssignmentOutlinedIcon from "@mui/icons-material/AssignmentOutlined";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import EventOutlinedIcon from "@mui/icons-material/EventOutlined";
import EventBusyOutlinedIcon from "@mui/icons-material/EventBusyOutlined";
import EventAvailableOutlinedIcon from "@mui/icons-material/EventAvailableOutlined";
import ChatBubbleOutlineOutlinedIcon from "@mui/icons-material/ChatBubbleOutlineOutlined";
import ErrorOutlineOutlinedIcon from "@mui/icons-material/ErrorOutlineOutlined";
import ScheduleOutlinedIcon from "@mui/icons-material/ScheduleOutlined";
import TaskAltOutlinedIcon from "@mui/icons-material/TaskAltOutlined";

import AppButton from "../../shared/components/AppButton";
import AppCard from "../../shared/components/AppCard";
import AppTable from "../../shared/components/AppTable";
import PageHeader from "../../shared/components/PageHeader";
import StatCard from "../../shared/components/StatCard";
import PaymentsOutlinedIcon from "@mui/icons-material/PaymentsOutlined";
import AppInput from "../../shared/components/AppInput";
import AppDatePicker from "../../shared/components/AppDatePicker";
import { formatDate } from "../../shared/utils/formatDate";
import { formatCurrency } from "../../shared/utils/currency";
import { exportCsv } from "../../shared/utils/exportCsv";
import { listarClientes } from "../../services/clientes";
import { crearFactura, listarFacturas, aplicarPagoFactura, reabrirFactura, registrarAbonoFactura, eliminarAbonoFactura } from "../../services/cobranza";
import { pedirRefrescoAlertas } from "../../shared/utils/alertasBus";
import { DIAS_PAGO_OPCIONES } from "./constantes";
import { usePolling } from "../../shared/hooks/usePolling";

function NuevoRegistroDialog({ open, onClose, onCreated, prefill }) {
  const [clientes, setClientes] = useState([]);
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const { register, control, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: { oc: "", clienteId: "", folio: "", monto: "", fechaCr: "", diasPago: 30, comentarios: "" },
  });

  useEffect(() => {
    if (!open) return;
    listarClientes({ pageSize: 200 }).then(({ items }) => setClientes(items)).catch(() => setClientes([]));
  }, [open]);

  // Prellenado al venir de "Generar factura" desde una Cotización aprobada.
  useEffect(() => {
    if (open && prefill) {
      reset({
        oc: "", clienteId: prefill.cliente || "", folio: prefill.folio ? `FAC-${prefill.folio}` : "",
        monto: prefill.monto || "", fechaCr: "", diasPago: 30, comentarios: "",
      });
    }
  }, [open, prefill, reset]);

  const cerrar = () => { reset(); setError(""); onClose(); };

  const onSubmit = async (data) => {
    setGuardando(true); setError("");
    try {
      const factura = await crearFactura({
        ...data, cliente: data.clienteId, monto: Number(data.monto),
        cotizacion: prefill?.cotizacion || undefined,
      });
      onCreated(factura);
      cerrar();
    } catch (err) {
      setError(err?.response?.data?.message || "No se pudo guardar el registro.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Dialog open={open} onClose={cerrar} fullWidth maxWidth="md">
      <DialogTitle sx={{ fontWeight: 700 }}>
        {prefill ? `Generar factura — Cotización ${prefill.folio}` : "Nuevo Registro de Cuenta por Cobrar"}
      </DialogTitle>
      <Box component="form" onSubmit={handleSubmit(onSubmit)}>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError("")}>{error}</Alert>}
          <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
            Las facturas que <b>timbras en el sistema</b> (Facturación) ya crean su cuenta por cobrar solas. Usa este
            registro solo para facturas emitidas <b>fuera</b> del sistema.
          </Alert>

          <AppCard dense title="Cliente y referencia" sx={{ mb: 2.5 }}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Controller
                  name="clienteId"
                  control={control}
                  rules={{ required: "Elige el cliente" }}
                  render={({ field }) => (
                    <FormControl fullWidth size="small" error={!!errors.clienteId}>
                      <InputLabel>Cliente</InputLabel>
                      <Select label="Cliente" {...field} value={field.value ?? ""} sx={{ borderRadius: 2 }}>
                        {clientes.length === 0 && <MenuItem value="" disabled>No hay clientes registrados</MenuItem>}
                        {clientes.map((c) => <MenuItem key={c._id} value={c._id}>{c.nombre}</MenuItem>)}
                      </Select>
                    </FormControl>
                  )}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <AppInput
                  label="Orden de Compra" placeholder="Ej. OC-2026-0451"
                  helperText="Número de orden de compra del cliente"
                  error={errors.oc} {...register("oc", { required: "Obligatorio" })}
                />
              </Grid>
            </Grid>
          </AppCard>

          <AppCard dense title="Datos de la factura" sx={{ mb: 1 }}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <AppInput
                  label="Folio de factura" placeholder="Ej. FAC-2026-0089"
                  helperText="Folio ya timbrado, o uno provisional"
                  error={errors.folio} {...register("folio", { required: "Obligatorio" })}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <AppInput
                  label="Monto" type="number" placeholder="0.00"
                  slotProps={{
                    htmlInput: { min: 0.01, step: "0.01" },
                    input: {
                      startAdornment: <InputAdornment position="start">$</InputAdornment>,
                      endAdornment: <InputAdornment position="end">MXN</InputAdornment>,
                    },
                  }}
                  error={errors.monto}
                  {...register("monto", { required: "Obligatorio", min: { value: 0.01, message: "Debe ser mayor a 0" } })}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Controller
                  name="fechaCr"
                  control={control}
                  rules={{ required: "Obligatorio" }}
                  render={({ field }) => <AppDatePicker label="Fecha C/R (creación/recepción)" error={errors.fechaCr} {...field} />}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Días de Pago</InputLabel>
                  <Controller
                    name="diasPago"
                    control={control}
                    render={({ field }) => (
                      <Select label="Días de Pago" {...field} value={field.value ?? 30} sx={{ borderRadius: 2 }}>
                        {DIAS_PAGO_OPCIONES.map((d) => <MenuItem key={d} value={d}>{d === 0 ? "Contado" : `${d} días`}</MenuItem>)}
                      </Select>
                    )}
                  />
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <AppInput
                  label="Comentarios" placeholder="Notas visibles en el calendario de pagos (opcional)"
                  multiline minRows={2} {...register("comentarios")}
                />
              </Grid>
            </Grid>
          </AppCard>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <AppButton type="button" variant="outlined" onClick={cerrar} sx={{ borderRadius: 2 }}>Cancelar</AppButton>
          <AppButton type="submit" loading={guardando} sx={{ borderRadius: 2 }}>Guardar</AppButton>
        </DialogActions>
      </Box>
    </Dialog>
  );
}

const HOY = new Date().toISOString().slice(0, 10);

// Lo cobrado / lo que falta de una cuenta (el servidor los manda calculados; el
// respaldo cubre cuentas de respuestas viejas en caché).
const cobradoDe = (r) => r.cobrado ?? (r.statusPago === 1 ? r.monto : 0);
const saldoDe = (r) => r.saldo ?? (r.statusPago === 1 ? 0 : r.monto);

// Historial de abonos de una cuenta + registrar abono / liquidar / reabrir.
// Las facturas a parcialidades (PPD) timbradas en el sistema NO se cobran aquí:
// su pago es el Complemento de Pago (fiscal) y esta cuenta se actualiza sola.
function AbonosDialog({ cuenta, onClose, onCambio }) {
  const navigate = useNavigate();
  const [monto, setMonto] = useState("");
  const [fecha, setFecha] = useState(HOY);
  const [nota, setNota] = useState("");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [cuentaIdPrevio, setCuentaIdPrevio] = useState(null);

  if (cuenta && cuenta._id !== cuentaIdPrevio) {
    setCuentaIdPrevio(cuenta._id);
    setMonto(""); setFecha(HOY); setNota(""); setError("");
  }
  if (!cuenta) return null;

  const saldo = saldoDe(cuenta);
  const cobrado = cobradoDe(cuenta);
  const pagada = cuenta.statusPago === 1;
  const porComplemento = !!cuenta.requiereComplemento;
  const avance = cuenta.monto > 0 ? Math.min(100, (cobrado / cuenta.monto) * 100) : 0;

  const ejecutar = async (accion) => {
    setGuardando(true); setError("");
    try {
      await accion();
      onCambio();
    } catch (err) {
      setError(err?.response?.data?.message || "No se pudo completar la acción.");
    } finally {
      setGuardando(false);
    }
  };

  const registrarAbono = () => {
    const m = Number(monto);
    if (!(m > 0)) { setError("Escribe el monto del abono."); return; }
    if (m > saldo + 0.005) { setError(`El abono no puede ser mayor al saldo (${formatCurrency(saldo)}).`); return; }
    ejecutar(async () => {
      await registrarAbonoFactura(cuenta._id, { monto: m, fecha, nota: nota || undefined });
      setMonto(""); setNota("");
    });
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontWeight: 700 }}>
        Pagos de la factura {cuenta.folio}
        <Typography variant="body2" color="text.secondary">{cuenta.cliente?.nombre}</Typography>
      </DialogTitle>
      <DialogContent dividers>
        {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError("")}>{error}</Alert>}

        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 2, mb: 1.5 }}>
          <Box><Typography variant="caption" color="text.secondary">Monto</Typography><Typography fontWeight={700}>{formatCurrency(cuenta.monto)}</Typography></Box>
          <Box><Typography variant="caption" color="text.secondary">Cobrado</Typography><Typography fontWeight={700} color="success.main">{formatCurrency(cobrado)}</Typography></Box>
          <Box><Typography variant="caption" color="text.secondary">Saldo</Typography><Typography fontWeight={700} color={saldo > 0 ? "warning.main" : "success.main"}>{formatCurrency(saldo)}</Typography></Box>
        </Box>
        <LinearProgress variant="determinate" value={avance} color={pagada ? "success" : "warning"} sx={{ height: 8, borderRadius: 4, mb: 2.5 }} />

        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>Abonos registrados</Typography>
        {(cuenta.abonos || []).length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {pagada ? "Esta cuenta se marcó pagada antes de que existieran los abonos." : "Todavía no hay abonos."}
          </Typography>
        ) : (
          <Box sx={{ mb: 2 }}>
            {cuenta.abonos.map((a) => (
              <Box key={a._id} sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", py: 0.75, borderBottom: 1, borderColor: "divider" }}>
                <Box>
                  <Typography variant="body2" fontWeight={600}>{formatCurrency(a.monto)} · {formatDate(a.fecha)}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {a.comprobante ? "Complemento de Pago" : "Manual"}{a.nota ? ` — ${a.nota}` : ""}
                  </Typography>
                </Box>
                {!a.comprobante && (
                  <Tooltip title="Quitar abono">
                    <IconButton size="small" disabled={guardando} onClick={() => ejecutar(() => eliminarAbonoFactura(cuenta._id, a._id))}>
                      <DeleteOutlineIcon fontSize="small" sx={{ color: "error.main" }} />
                    </IconButton>
                  </Tooltip>
                )}
              </Box>
            ))}
          </Box>
        )}

        {!pagada && porComplemento && (
          <Alert severity="info" sx={{ borderRadius: 2 }}>
            Esta factura es a <b>parcialidades (PPD)</b>: sus pagos se registran con el <b>Complemento de Pago</b> en
            Facturación (ahí se declara al SAT) y esta cuenta se actualiza sola.
          </Alert>
        )}

        {!pagada && !porComplemento && (
          <Box>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>Registrar abono</Typography>
            <Box sx={{ display: "flex", gap: 1.5, mb: 1.5 }}>
              <TextField
                size="small" type="number" label="Monto" value={monto} onChange={(e) => setMonto(e.target.value)}
                placeholder={String(saldo)} slotProps={{ htmlInput: { min: 0.01, step: "0.01" }, inputLabel: { shrink: true } }} fullWidth
              />
              <TextField
                size="small" type="date" label="Fecha" value={fecha} onChange={(e) => setFecha(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }} fullWidth
              />
            </Box>
            <TextField size="small" label="Nota (opcional)" value={nota} onChange={(e) => setNota(e.target.value)} fullWidth />
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, flexWrap: "wrap", gap: 1 }}>
        {pagada && (
          <AppButton type="button" variant="outlined" color="warning" startIcon={<ReplayOutlinedIcon />} loading={guardando}
            onClick={() => ejecutar(() => reabrirFactura(cuenta._id))} sx={{ borderRadius: 2 }}>
            Reabrir
          </AppButton>
        )}
        <Box sx={{ flex: 1 }} />
        <AppButton type="button" variant="outlined" onClick={onClose} sx={{ borderRadius: 2 }}>Cerrar</AppButton>
        {!pagada && porComplemento && cuenta.comprobante && (
          <AppButton type="button" startIcon={<PaymentsOutlinedIcon />} sx={{ borderRadius: 2 }}
            onClick={() => navigate(`/facturacion?cfdi=${cuenta.comprobante}&accion=pagar`)}>
            Registrar pago en Facturación
          </AppButton>
        )}
        {!pagada && !porComplemento && (
          <>
            <AppButton type="button" variant="outlined" color="success" startIcon={<CheckCircleOutlineIcon />} loading={guardando}
              onClick={() => ejecutar(() => aplicarPagoFactura(cuenta._id, fecha))} sx={{ borderRadius: 2 }}>
              Liquidar saldo ({formatCurrency(saldo)})
            </AppButton>
            <AppButton type="button" loading={guardando} onClick={registrarAbono} sx={{ borderRadius: 2 }}>Registrar abono</AppButton>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}


// Refleja el flujo real de php/calendario_generar.php + calendario_consultar.php:
// alta de registro + 3 pestañas (Atrasadas / Por Pagar / Pagadas) sobre la misma
// tabla `events`, con acciones Aplicar pago / Reabrir.
function CeldaIcono({ icon: Icon, color = "text.secondary", bold = false, top = false, children }) {
  return (
    <Box sx={{ display: "flex", alignItems: top ? "flex-start" : "center", gap: 0.9 }}>
      <Icon sx={{ fontSize: 16, color, mt: top ? 0.25 : 0, flexShrink: 0 }} />
      <Typography variant="body2" fontSize={13} fontWeight={bold ? 700 : 400} sx={{ color: color === "text.secondary" ? "text.primary" : color }}>
        {children}
      </Typography>
    </Box>
  );
}

export default function CobranzaPage() {
  const theme = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();
  const [prefillFactura, setPrefillFactura] = useState(null);
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [nuevoOpen, setNuevoOpen] = useState(false);
  const [cuentaId, setCuentaId] = useState(null);
  const [error, setError] = useState("");

  const cargar = (silencioso = false) => {
    if (!silencioso) setLoading(true);
    listarFacturas()
      .then(setRegistros)
      .catch(() => { if (!silencioso) setError("No se pudieron cargar las facturas."); })
      .finally(() => { if (!silencioso) setLoading(false); });
  };

  useEffect(() => { cargar(); }, []);
  usePolling(() => cargar(true));

  // Llega desde Cotizaciones → "Generar factura" (cotización aprobada) con
  // cliente/monto/folio ya resueltos — se prellena el diálogo y se abre solo.
  useEffect(() => {
    const cotizacionId = searchParams.get("cotizacion");
    if (!cotizacionId) return;
    setPrefillFactura({
      cotizacion: cotizacionId,
      cliente: searchParams.get("cliente") || "",
      monto: searchParams.get("monto") || "",
      folio: searchParams.get("folio") || "",
    });
    setNuevoOpen(true);
    setSearchParams({}, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fechaCorta = (v) => String(v).slice(0, 10);

  const atrasadas = useMemo(() => registros.filter((r) => r.statusPago === 0 && fechaCorta(r.fechaPago) < HOY), [registros]);
  const porPagar = useMemo(() => registros.filter((r) => r.statusPago === 0 && fechaCorta(r.fechaPago) >= HOY), [registros]);
  const pagadas = useMemo(() => registros.filter((r) => r.statusPago === 1), [registros]);

  const tabs = [
    { label: "Facturas Atrasadas", rows: atrasadas, color: "error", icon: <ErrorOutlineOutlinedIcon fontSize="small" /> },
    { label: "Facturas x Pagar", rows: porPagar, color: "warning", icon: <ScheduleOutlinedIcon fontSize="small" /> },
    { label: "Facturas Pagadas", rows: pagadas, color: "success", icon: <TaskAltOutlinedIcon fontSize="small" /> },
  ];
  const rowsActuales = tabs[tab].rows;
  const totalActual = rowsActuales.reduce((s, r) => s + (tab === 2 ? r.monto : saldoDe(r)), 0);

  // El diálogo lee la cuenta de la lista (que se refresca sola), así siempre muestra su saldo actual.
  const cuentaAbierta = registros.find((r) => r._id === cuentaId) || null;
  const alCambiarCuenta = () => { cargar(true); pedirRefrescoAlertas(); };

  const columns = [
    { field: "cliente", headerName: "Cliente", minWidth: 180, renderCell: (r) => <CeldaIcono icon={BusinessOutlinedIcon}>{r.cliente?.nombre || "—"}</CeldaIcono> },
    { field: "oc", headerName: "OC", nowrap: true, hideBelow: 1000, renderCell: (r) => <CeldaIcono icon={AssignmentOutlinedIcon}>{r.oc || "—"}</CeldaIcono> },
    {
      field: "folio", headerName: "Folio", nowrap: true,
      renderCell: (r, { compacto }) => (
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
          <CeldaIcono icon={ReceiptLongOutlinedIcon}>{r.folio || "—"}</CeldaIcono>
          {r.comprobante && !compacto && (
            <Tooltip title="Creada automáticamente al timbrar el CFDI">
              <Chip size="small" color="success" variant="outlined" label="CFDI" sx={{ height: 18, fontSize: 10 }} />
            </Tooltip>
          )}
        </Box>
      ),
    },
    { field: "monto", headerName: "Monto", nowrap: true, hideBelow: 820, renderCell: (r) => <Typography variant="body2" fontWeight={700} fontSize={13}>{formatCurrency(r.monto)}</Typography> },
    ...(tab !== 2
      ? [{
          field: "saldo", headerName: "Saldo", minWidth: 130,
          renderCell: (r, { estrecho }) => {
            const cobrado = cobradoDe(r);
            return (
              <Box>
                <Typography variant="body2" fontSize={13} fontWeight={700} color={cobrado > 0 ? "warning.main" : "text.primary"}>
                  {formatCurrency(saldoDe(r))}
                </Typography>
                {estrecho && <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>de {formatCurrency(r.monto)}</Typography>}
                {cobrado > 0 && (
                  <>
                    <LinearProgress variant="determinate" value={Math.min(100, (cobrado / r.monto) * 100)} color="success" sx={{ height: 4, borderRadius: 2, my: 0.4 }} />
                    <Typography variant="caption" color="text.secondary">Cobrado {formatCurrency(cobrado)}</Typography>
                  </>
                )}
              </Box>
            );
          },
        }]
      : []),
    { field: "fechaCr", headerName: "Fecha C/R", nowrap: true, hideBelow: 1300, renderCell: (r) => <CeldaIcono icon={EventOutlinedIcon}>{formatDate(r.fechaCr)}</CeldaIcono> },
    {
      field: "fechaPago",
      headerName: "Fecha de Pago",
      nowrap: true,
      renderCell: (r) => (
        <CeldaIcono
          icon={tab === 0 ? EventBusyOutlinedIcon : EventAvailableOutlinedIcon}
          color={tab === 0 ? "error.main" : "text.primary"}
          bold={tab === 0}
        >
          {formatDate(r.fechaPago)}
        </CeldaIcono>
      ),
    },
    {
      field: "comentarios", headerName: "Comentarios", hideBelow: 1300, minWidth: 180,
      renderCell: (r) => r.comentarios
        ? <Box sx={{ maxWidth: 280 }}><CeldaIcono icon={ChatBubbleOutlineOutlinedIcon} top>{r.comentarios}</CeldaIcono></Box>
        : <Typography variant="caption" color="text.secondary">—</Typography>,
    },
    ...(tab === 2
      ? [{ field: "fechaPagada", headerName: "Fecha Pagada", nowrap: true, renderCell: (r) => <CeldaIcono icon={TaskAltOutlinedIcon} color="success.main">{formatDate(r.fechaPagada)}</CeldaIcono> }]
      : []),
    {
      field: "acciones", headerName: "Pagos", align: "center", sticky: "right",
      renderCell: (r) => (
        <Tooltip title={r.statusPago === 1 ? "Ver pagos / reabrir" : "Abonos y pagos"}>
          <IconButton size="small" onClick={() => setCuentaId(r._id)}>
            <PaymentsOutlinedIcon fontSize="small" sx={{ color: r.statusPago === 1 ? "success.main" : "warning.main" }} />
          </IconButton>
        </Tooltip>
      ),
    },
  ];

  const exportar = () => {
    exportCsv(
      registros.map((r) => ({
        Cliente: r.cliente?.nombre || "", OC: r.oc, Folio: r.folio, Monto: r.monto, Cobrado: cobradoDe(r), Saldo: saldoDe(r),
        FechaCR: fechaCorta(r.fechaCr), FechaPago: fechaCorta(r.fechaPago), Status: r.statusPago === 1 ? "Pagado" : "Pendiente",
        FechaPagada: r.fechaPagada ? fechaCorta(r.fechaPagada) : "",
      })),
      "cuentas_por_cobrar.csv"
    );
  };

  return (
    <Box>
      <PageHeader
        icon={<PaymentsOutlinedIcon />}
        title="Cuentas por Cobrar"
        actions={
          <>
            <AppButton variant="outlined" startIcon={<FileDownloadOutlinedIcon />} onClick={exportar} sx={{ borderRadius: 2 }}>
              Exportar Reporte Excel
            </AppButton>
            <AppButton startIcon={<AddIcon />} onClick={() => { setPrefillFactura(null); setNuevoOpen(true); }} sx={{ borderRadius: 2 }}>
              Nuevo Registro
            </AppButton>
          </>
        }
      />

      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError("")}>{error}</Alert>}

      <Grid container spacing={2.5} mb={3}>
        {[
          { label: "Total Atrasado", valor: atrasadas.reduce((s, r) => s + saldoDe(r), 0), color: theme.palette.error.main, icon: <ErrorOutlineOutlinedIcon /> },
          { label: "Total por Pagar", valor: porPagar.reduce((s, r) => s + saldoDe(r), 0), color: theme.palette.warning.main, icon: <ScheduleOutlinedIcon /> },
          { label: "Total Cobrado", valor: registros.reduce((s, r) => s + cobradoDe(r), 0), color: theme.palette.success.main, icon: <TaskAltOutlinedIcon /> },
        ].map((s) => (
          <Grid key={s.label} size={{ xs: 12, sm: 4 }}>
            <StatCard label={s.label} value={formatCurrency(s.valor)} color={s.color} icon={s.icon} />
          </Grid>
        ))}
      </Grid>

      <Tabs value={tab} onChange={(_, v) => { setTab(v); setPage(0); }} sx={{ mb: 2, borderBottom: 1, borderColor: "divider" }}>
        {tabs.map((t) => (
          <Tab key={t.label} label={<Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>{t.icon}{t.label} <Chip label={t.rows.length} size="small" color={t.color} /></Box>} />
        ))}
      </Tabs>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        Suma de {rowsActuales.length} registro(s): <strong>{formatCurrency(totalActual)}</strong>
      </Typography>

      <AppTable
        columns={columns}
        rows={rowsActuales.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)}
        totalCount={rowsActuales.length}
        page={page}
        rowsPerPage={rowsPerPage}
        onPageChange={setPage}
        onRowsPerPageChange={(n) => { setRowsPerPage(n); setPage(0); }}
        loading={loading}
        emptyText="Sin registros en esta pestaña"
        dense
        onRowClick={(r) => setCuentaId(r._id)}
      />

      <NuevoRegistroDialog
        open={nuevoOpen}
        onClose={() => { setNuevoOpen(false); setPrefillFactura(null); }}
        onCreated={() => { cargar(); pedirRefrescoAlertas(); }}
        prefill={prefillFactura}
      />
      <AbonosDialog cuenta={cuentaAbierta} onClose={() => setCuentaId(null)} onCambio={alCambiarCuenta} />
    </Box>
  );
}
