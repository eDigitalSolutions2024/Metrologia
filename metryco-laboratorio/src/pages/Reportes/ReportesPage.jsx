import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Typography, TextField, InputAdornment, Chip, Tooltip, IconButton,
  MenuItem, Select, FormControl, InputLabel, Grid,
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Alert,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import PictureAsPdfOutlinedIcon from "@mui/icons-material/PictureAsPdfOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import HourglassTopOutlinedIcon from "@mui/icons-material/HourglassTopOutlined";
import TaskAltOutlinedIcon from "@mui/icons-material/TaskAltOutlined";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import OpenInNewOutlinedIcon from "@mui/icons-material/OpenInNewOutlined";
import RequestQuoteOutlinedIcon from "@mui/icons-material/RequestQuoteOutlined";

import AppButton from "../../shared/components/AppButton";
import AppTable from "../../shared/components/AppTable";
import PageHeader from "../../shared/components/PageHeader";
import StatCard from "../../shared/components/StatCard";
import FactCheckOutlinedIcon from "@mui/icons-material/FactCheckOutlined";
import { formatDate } from "../../shared/utils/formatDate";
import { listarClientes } from "../../services/clientes";
import { listarReportes, crearReporte } from "../../services/reportes";
import { listarContactos } from "../../services/contactos";
import { listarCotizaciones } from "../../services/cotizaciones";
import { useAuth } from "../../core/auth/useAuth";

const STATUS = {
  recepcion:  { label: "Recepción",  color: "default" },
  en_proceso: { label: "En proceso", color: "warning" },
  terminado:  { label: "Terminado",  color: "info" },
  entregado:  { label: "Entregado",  color: "success" },
  cancelado:  { label: "Cancelado",  color: "error" },
};

const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const ANIO_ACTUAL = new Date().getFullYear();
const ANIOS = [ANIO_ACTUAL, ANIO_ACTUAL - 1, ANIO_ACTUAL - 2, ANIO_ACTUAL - 3];

export default function ReportesPage() {
  const navigate = useNavigate();
  const theme = useTheme();
  const { user } = useAuth();
  const puedeCrearReporte = ["admin", "coordinador", "ventas"].includes(user?.rol);

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("todos");
  const [mes, setMes] = useState("");
  const [anio, setAnio] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [nuevoOpen, setNuevoOpen] = useState(false);

  const cargar = useCallback(() => {
    setLoading(true);
    listarReportes({ search, status, mes, anio, page, pageSize: rowsPerPage })
      .then(({ items, total }) => { setRows(items); setTotal(total); })
      .catch(() => { setRows([]); setTotal(0); })
      .finally(() => setLoading(false));
  }, [search, status, mes, anio, page, rowsPerPage]);
  useEffect(() => { cargar(); }, [cargar]);

  const stats = useMemo(() => {
    const c = (s) => rows.filter((r) => r.status === s).length;
    return [
      { t: "Total (página)", v: rows.length, icon: <DescriptionOutlinedIcon />, color: theme.palette.secondary.main },
      { t: "En proceso", v: c("en_proceso"), icon: <HourglassTopOutlinedIcon />, color: theme.palette.warning.main },
      { t: "Terminados", v: c("terminado"), icon: <TaskAltOutlinedIcon />, color: theme.palette.info?.main || "#0288D1" },
      { t: "Entregados", v: c("entregado"), icon: <LocalShippingOutlinedIcon />, color: theme.palette.success.main },
    ];
  }, [rows, theme]);

  const columns = [
    {
      field: "folio", headerName: "Reporte de Servicio",
      renderCell: (r) => (
        <Tooltip title="Abrir reporte">
          <Chip
            size="small" clickable label={r.folio} icon={<OpenInNewOutlinedIcon sx={{ fontSize: 14 }} />}
            onClick={() => navigate(`/reportes/${r._id}`)}
            sx={{
              fontWeight: 700, color: "secondary.main", borderColor: "secondary.main", borderRadius: "6px",
              "& .MuiChip-icon": { color: "secondary.main" }, "& .MuiChip-label": { px: 1 },
            }}
            variant="outlined"
          />
        </Tooltip>
      ),
    },
    { field: "cliente", headerName: "Cliente", renderCell: (r) => r.cliente?.nombre || "—" },
    { field: "fechaRecepcion", headerName: "Fecha", renderCell: (r) => formatDate(r.fechaRecepcion) },
    {
      field: "status", headerName: "Estatus",
      renderCell: (r) => {
        const s = STATUS[r.status] || { label: r.status, color: "default" };
        return <Chip size="small" label={s.label} color={s.color} />;
      },
    },
    {
      field: "pdf", headerName: "Descargar", align: "center",
      renderCell: (r) => (
        <Tooltip title="Descargar Reporte de Servicio (PDF)">
          <IconButton size="small" onClick={() => window.open(`/informe/reporte/${r._id}`, "_blank")}>
            <PictureAsPdfOutlinedIcon fontSize="small" sx={{ color: "error.main" }} />
          </IconButton>
        </Tooltip>
      ),
    },
    {
      field: "cotizacion", headerName: "Cotización", align: "center",
      renderCell: (r) =>
        r.cotizacion?._id ? (
          <Tooltip title="Abrir cotización ligada">
            <Chip
              size="small" clickable label={r.cotizacion.folio} icon={<RequestQuoteOutlinedIcon sx={{ fontSize: 14 }} />}
              onClick={() => navigate(`/cotizaciones?editar=${r.cotizacion._id}`)}
              sx={{
                color: "info.main", borderColor: "info.main", borderRadius: "6px",
                "& .MuiChip-icon": { color: "info.main" }, "& .MuiChip-label": { px: 1 },
              }}
              variant="outlined"
            />
          </Tooltip>
        ) : "—",
    },
    { field: "ordenCompra", headerName: "Orden de Compra", renderCell: (r) => r.ordenCompra || "—" },
    { field: "factura", headerName: "Factura", renderCell: (r) => r.factura || "—" },
    { field: "cantidadEnProceso", headerName: "Cantidad en Proceso", align: "center", renderCell: (r) => r.cantidadEnProceso ?? 0 },
    { field: "numEquipos", headerName: "Cantidad Asignaciones", align: "center", renderCell: (r) => r.numEquipos ?? 0 },
    {
      field: "acciones", headerName: "Acciones", align: "center",
      renderCell: (r) => (
        <Tooltip title="Ver reporte">
          <IconButton size="small" onClick={() => navigate(`/reportes/${r._id}`)}>
            <VisibilityOutlinedIcon fontSize="small" sx={{ color: "secondary.main" }} />
          </IconButton>
        </Tooltip>
      ),
    },
  ];

  return (
    <Box>
      <PageHeader
        icon={<FactCheckOutlinedIcon />}
        title="Reportes de Servicio"
        subtitle={`${total} reportes · cualquier usuario puede iniciar uno`}
        actions={
          <>
            <AppButton variant="outlined" startIcon={<FileDownloadOutlinedIcon />} onClick={() => navigate("/reportes/exportar")} sx={{ borderRadius: 2 }}>
              Exportar
            </AppButton>
            {puedeCrearReporte && (
              <AppButton startIcon={<AddIcon />} onClick={() => setNuevoOpen(true)} sx={{ borderRadius: 2 }}>
                Nuevo Reporte
              </AppButton>
            )}
          </>
        }
      />

      <Grid container spacing={2.5} sx={{ mb: 3.5 }}>
        {stats.map((s) => (
          <Grid key={s.t} size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard label={s.t} value={s.v} icon={s.icon} color={s.color} />
          </Grid>
        ))}
      </Grid>

      <Box sx={{ display: "flex", gap: 2, mb: 2, flexWrap: "wrap" }}>
        <TextField
          placeholder="Buscar por folio, OC o factura…" size="small"
          value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          sx={{ width: 300, "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
          slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" sx={{ color: "text.secondary" }} /></InputAdornment> } }}
        />
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Mes</InputLabel>
          <Select label="Mes" value={mes} onChange={(e) => { setMes(e.target.value); setPage(0); }} sx={{ borderRadius: 2 }}>
            <MenuItem value="">Todos</MenuItem>
            {MESES.map((m, i) => <MenuItem key={m} value={i + 1}>{m}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 130 }}>
          <InputLabel>Año</InputLabel>
          <Select label="Año" value={anio} onChange={(e) => { setAnio(e.target.value); setPage(0); }} sx={{ borderRadius: 2 }}>
            <MenuItem value="">Todos</MenuItem>
            {ANIOS.map((a) => <MenuItem key={a} value={a}>{a}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>Estado</InputLabel>
          <Select label="Estado" value={status} onChange={(e) => { setStatus(e.target.value); setPage(0); }} sx={{ borderRadius: 2 }}>
            <MenuItem value="todos">Todos</MenuItem>
            {Object.entries(STATUS).map(([k, v]) => <MenuItem key={k} value={k}>{v.label}</MenuItem>)}
          </Select>
        </FormControl>
      </Box>

      <AppTable
        columns={columns} rows={rows} loading={loading}
        totalCount={total} page={page} rowsPerPage={rowsPerPage}
        onPageChange={setPage}
        onRowsPerPageChange={(n) => { setRowsPerPage(n); setPage(0); }}
        emptyText="Sin reportes todavía"
      />

      <NuevoReporteDialog open={nuevoOpen} onClose={() => setNuevoOpen(false)} onDone={(r) => { setNuevoOpen(false); cargar(); if (r?._id) navigate(`/reportes/${r._id}`); }} />
    </Box>
  );
}

function NuevoReporteDialog({ open, onClose, onDone }) {
  const [clientes, setClientes] = useState([]);
  const [cliente, setCliente] = useState("");
  const [contactos, setContactos] = useState([]);
  const [contacto, setContacto] = useState("");
  const [cotizaciones, setCotizaciones] = useState([]);
  const [cotizacion, setCotizacion] = useState("");
  const [oc, setOc] = useState("");
  const [obs, setObs] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCliente(""); setOc(""); setObs(""); setError("");
    setContactos([]); setContacto(""); setCotizaciones([]); setCotizacion("");
    listarClientes({ pageSize: 200 }).then(({ items }) => setClientes(items)).catch(() => {});
  }, [open]);

  useEffect(() => {
    setContacto(""); setCotizacion("");
    if (!cliente) { setContactos([]); setCotizaciones([]); return; }
    listarContactos(cliente).then(setContactos).catch(() => setContactos([]));
    listarCotizaciones({ clienteId: cliente, pageSize: 100 })
      .then(({ items }) => setCotizaciones(items))
      .catch(() => setCotizaciones([]));
  }, [cliente]);

  const crear = async () => {
    if (!cliente) { setError("Elige un cliente."); return; }
    setSaving(true); setError("");
    try {
      const r = await crearReporte({
        cliente, contacto: contacto || undefined, cotizacion: cotizacion || undefined,
        ordenCompra: oc || undefined, observaciones: obs || undefined,
      });
      onDone(r);
    } catch (e) {
      setError(e?.response?.data?.message || "No se pudo crear el reporte.");
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>Nuevo Reporte de Servicio</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 0.5 }}>
          <TextField select fullWidth size="small" label="Cliente" value={cliente} onChange={(e) => setCliente(e.target.value)}>
            {clientes.map((c) => <MenuItem key={c._id} value={c._id}>{c.nombre}</MenuItem>)}
          </TextField>
          <TextField
            select fullWidth size="small" label="Contacto (opcional)" value={contacto}
            onChange={(e) => setContacto(e.target.value)} disabled={!cliente}
            helperText={cliente && contactos.length === 0 ? "Este cliente no tiene contactos registrados" : ""}
          >
            <MenuItem value="">— Sin especificar —</MenuItem>
            {contactos.map((c) => <MenuItem key={c._id} value={c._id}>{c.nombre}</MenuItem>)}
          </TextField>
          <TextField
            select fullWidth size="small" label="Cotización (opcional)" value={cotizacion}
            onChange={(e) => setCotizacion(e.target.value)} disabled={!cliente}
            helperText={cliente && cotizaciones.length === 0 ? "Este cliente no tiene cotizaciones registradas" : ""}
          >
            <MenuItem value="">— Sin especificar —</MenuItem>
            {cotizaciones.map((c) => <MenuItem key={c._id} value={c._id}>{c.folio}</MenuItem>)}
          </TextField>
          <TextField fullWidth size="small" label="Orden de compra (opcional)" value={oc} onChange={(e) => setOc(e.target.value)} />
          <TextField fullWidth size="small" label="Observaciones (opcional)" multiline minRows={2} value={obs} onChange={(e) => setObs(e.target.value)} />
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={crear} disabled={saving} sx={{ borderRadius: 2 }}>Crear</Button>
      </DialogActions>
    </Dialog>
  );
}
