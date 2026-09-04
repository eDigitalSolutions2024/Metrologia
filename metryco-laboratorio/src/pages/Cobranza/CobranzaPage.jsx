import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Box, Typography, Grid, Paper, Chip, Tooltip, IconButton, Alert, InputAdornment,
  Dialog, DialogTitle, DialogContent, DialogActions, MenuItem, Select, FormControl, InputLabel, Tab, Tabs,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useForm, Controller } from "react-hook-form";
import AddIcon from "@mui/icons-material/Add";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutlineOutlined";
import ReplayOutlinedIcon from "@mui/icons-material/ReplayOutlined";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";

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
import { crearFactura, listarFacturas, aplicarPagoFactura, reabrirFactura } from "../../services/cobranza";
import { pedirRefrescoAlertas } from "../../shared/utils/alertasBus";
import { DIAS_PAGO_OPCIONES } from "./constantes";

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
    <Dialog open={open} onClose={cerrar} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontWeight: 700 }}>
        {prefill ? `Generar factura — Cotización ${prefill.folio}` : "Nuevo Registro de Cuenta por Cobrar"}
      </DialogTitle>
      <Box component="form" onSubmit={handleSubmit(onSubmit)}>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError("")}>{error}</Alert>}

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
                  <Select label="Días de Pago" defaultValue={30} {...register("diasPago")} sx={{ borderRadius: 2 }}>
                    {DIAS_PAGO_OPCIONES.map((d) => <MenuItem key={d} value={d}>{d === 0 ? "Contado" : `${d} días`}</MenuItem>)}
                  </Select>
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
          <AppButton variant="outlined" onClick={cerrar} sx={{ borderRadius: 2 }}>Cancelar</AppButton>
          <AppButton type="submit" loading={guardando} sx={{ borderRadius: 2 }}>Guardar</AppButton>
        </DialogActions>
      </Box>
    </Dialog>
  );
}

function AplicarPagoDialog({ target, onClose, onConfirm }) {
  const [fechaPagada, setFechaPagada] = useState(new Date().toISOString().slice(0, 10));

  return (
    <Dialog open={!!target} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Aplicar pago — {target?.folio}</DialogTitle>
      <DialogContent>
        <AppDatePicker label="Fecha pagada" value={fechaPagada} onChange={setFechaPagada} />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <AppButton variant="outlined" onClick={onClose} sx={{ borderRadius: 2 }}>Cancelar</AppButton>
        <AppButton onClick={() => onConfirm(fechaPagada)} sx={{ borderRadius: 2 }}>Aplicar</AppButton>
      </DialogActions>
    </Dialog>
  );
}

const HOY = new Date().toISOString().slice(0, 10);

// Refleja el flujo real de php/calendario_generar.php + calendario_consultar.php:
// alta de registro + 3 pestañas (Atrasadas / Por Pagar / Pagadas) sobre la misma
// tabla `events`, con acciones Aplicar pago / Reabrir.
export default function CobranzaPage() {
  const theme = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();
  const [prefillFactura, setPrefillFactura] = useState(null);
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(0);
  const [page, setPage] = useState(0);
  const [nuevoOpen, setNuevoOpen] = useState(false);
  const [aplicarTarget, setAplicarTarget] = useState(null);
  const [error, setError] = useState("");

  const cargar = () => {
    setLoading(true);
    listarFacturas()
      .then(setRegistros)
      .catch(() => setError("No se pudieron cargar las facturas."))
      .finally(() => setLoading(false));
  };

  useEffect(() => { cargar(); }, []);

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
    { label: "Facturas Atrasadas", rows: atrasadas, color: "error" },
    { label: "Facturas x Pagar", rows: porPagar, color: "warning" },
    { label: "Facturas Pagadas", rows: pagadas, color: "success" },
  ];
  const rowsActuales = tabs[tab].rows;
  const totalActual = rowsActuales.reduce((s, r) => s + r.monto, 0);

  const aplicarPago = async (fechaPagada) => {
    setError("");
    try {
      await aplicarPagoFactura(aplicarTarget._id, fechaPagada);
      setAplicarTarget(null);
      cargar();
      pedirRefrescoAlertas();
    } catch (err) {
      setError(err?.response?.data?.message || "No se pudo aplicar el pago.");
    }
  };

  const reabrir = async (id) => {
    setError("");
    try {
      await reabrirFactura(id);
      cargar();
      pedirRefrescoAlertas();
    } catch (err) {
      setError(err?.response?.data?.message || "No se pudo reabrir el registro.");
    }
  };

  const columns = [
    { field: "cliente", headerName: "Cliente", renderCell: (r) => r.cliente?.nombre || "—" },
    { field: "oc", headerName: "OC" },
    { field: "folio", headerName: "Folio" },
    { field: "monto", headerName: "Monto", renderCell: (r) => formatCurrency(r.monto) },
    { field: "fechaCr", headerName: "Fecha C/R", renderCell: (r) => formatDate(r.fechaCr) },
    {
      field: "fechaPago",
      headerName: "Fecha de Pago",
      renderCell: (r) => (
        <Typography variant="body2" color={tab === 0 ? "error.main" : "text.primary"} fontWeight={tab === 0 ? 700 : 400}>
          {formatDate(r.fechaPago)}
        </Typography>
      ),
    },
    { field: "comentarios", headerName: "Comentarios" },
    ...(tab === 2
      ? [
          { field: "fechaPagada", headerName: "Fecha Pagada", renderCell: (r) => formatDate(r.fechaPagada) },
          {
            field: "acciones", headerName: "Acción", align: "center",
            renderCell: (r) => (
              <Tooltip title="Reabrir">
                <IconButton size="small" onClick={() => reabrir(r._id)}>
                  <ReplayOutlinedIcon fontSize="small" sx={{ color: "warning.main" }} />
                </IconButton>
              </Tooltip>
            ),
          },
        ]
      : [
          {
            field: "acciones", headerName: "Acción", align: "center",
            renderCell: (r) => (
              <Tooltip title="Aplicar pago">
                <IconButton size="small" onClick={() => setAplicarTarget(r)}>
                  <CheckCircleOutlineIcon fontSize="small" sx={{ color: "success.main" }} />
                </IconButton>
              </Tooltip>
            ),
          },
        ]),
  ];

  const exportar = () => {
    exportCsv(
      registros.map((r) => ({
        Cliente: r.cliente?.nombre || "", OC: r.oc, Folio: r.folio, Monto: r.monto,
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
          { label: "Total Atrasado", valor: atrasadas.reduce((s, r) => s + r.monto, 0), color: theme.palette.error.main },
          { label: "Total por Pagar", valor: porPagar.reduce((s, r) => s + r.monto, 0), color: theme.palette.warning.main },
          { label: "Total Cobrado", valor: pagadas.reduce((s, r) => s + r.monto, 0), color: theme.palette.success.main },
        ].map((s) => (
          <Grid key={s.label} size={{ xs: 12, sm: 4 }}>
            <StatCard label={s.label} value={formatCurrency(s.valor)} color={s.color} />
          </Grid>
        ))}
      </Grid>

      <Tabs value={tab} onChange={(_, v) => { setTab(v); setPage(0); }} sx={{ mb: 2, borderBottom: 1, borderColor: "divider" }}>
        {tabs.map((t) => (
          <Tab key={t.label} label={<Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>{t.label} <Chip label={t.rows.length} size="small" color={t.color} /></Box>} />
        ))}
      </Tabs>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        Suma de {rowsActuales.length} registro(s): <strong>{formatCurrency(totalActual)}</strong>
      </Typography>

      <AppTable
        columns={columns}
        rows={rowsActuales.slice(page * 10, page * 10 + 10)}
        totalCount={rowsActuales.length}
        page={page}
        rowsPerPage={10}
        onPageChange={setPage}
        loading={loading}
        emptyText="Sin registros en esta pestaña"
      />

      <NuevoRegistroDialog
        open={nuevoOpen}
        onClose={() => { setNuevoOpen(false); setPrefillFactura(null); }}
        onCreated={() => { cargar(); pedirRefrescoAlertas(); }}
        prefill={prefillFactura}
      />
      <AplicarPagoDialog target={aplicarTarget} onClose={() => setAplicarTarget(null)} onConfirm={aplicarPago} />
    </Box>
  );
}
