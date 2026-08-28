import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Typography, TextField, InputAdornment, Chip, Tooltip, IconButton,
  MenuItem, Select, FormControl, InputLabel, Grid, Paper,
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Alert, Divider,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import HourglassTopOutlinedIcon from "@mui/icons-material/HourglassTopOutlined";
import TaskAltOutlinedIcon from "@mui/icons-material/TaskAltOutlined";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";

import AppButton from "../../shared/components/AppButton";
import AppTable from "../../shared/components/AppTable";
import PageHeader from "../../shared/components/PageHeader";
import StatCard from "../../shared/components/StatCard";
import FactCheckOutlinedIcon from "@mui/icons-material/FactCheckOutlined";
import { formatDate } from "../../shared/utils/formatDate";
import { listarClientes } from "../../services/clientes";
import { listarReportes, crearReporte, obtenerReporte } from "../../services/reportes";

const STATUS = {
  recepcion:  { label: "Recepción",  color: "default" },
  en_proceso: { label: "En proceso", color: "warning" },
  terminado:  { label: "Terminado",  color: "info" },
  entregado:  { label: "Entregado",  color: "success" },
  cancelado:  { label: "Cancelado",  color: "error" },
};

export default function ReportesPage() {
  const navigate = useNavigate();
  const theme = useTheme();

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("todos");
  const [page, setPage] = useState(0);
  const [nuevoOpen, setNuevoOpen] = useState(false);
  const [verId, setVerId] = useState(null);

  const cargar = useCallback(() => {
    setLoading(true);
    listarReportes({ search, status, page, pageSize: 10 })
      .then(({ items, total }) => { setRows(items); setTotal(total); })
      .catch(() => { setRows([]); setTotal(0); })
      .finally(() => setLoading(false));
  }, [search, status, page]);
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
      field: "folio", headerName: "Reporte",
      renderCell: (r) => (
        <Box>
          <Typography variant="body2" fontWeight={700}>{r.folio}</Typography>
          <Typography variant="caption" color="text.secondary">{r.cliente?.nombre}</Typography>
        </Box>
      ),
    },
    { field: "numEquipos", headerName: "Equipos", align: "center", renderCell: (r) => r.numEquipos ?? 0 },
    { field: "ordenCompra", headerName: "OC", renderCell: (r) => r.ordenCompra || "—" },
    { field: "fechaRecepcion", headerName: "Recepción", renderCell: (r) => formatDate(r.fechaRecepcion) },
    { field: "creadoPor", headerName: "Inició", renderCell: (r) => r.creadoPor?.nombre || "—" },
    {
      field: "status", headerName: "Estado",
      renderCell: (r) => {
        const s = STATUS[r.status] || { label: r.status, color: "default" };
        return <Chip size="small" label={s.label} color={s.color} />;
      },
    },
    {
      field: "acciones", headerName: "Acciones", align: "center",
      renderCell: (r) => (
        <Tooltip title="Ver reporte">
          <IconButton size="small" onClick={() => setVerId(r._id)}>
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
            <AppButton startIcon={<AddIcon />} onClick={() => setNuevoOpen(true)} sx={{ borderRadius: 2 }}>
              Nuevo Reporte
            </AppButton>
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
          sx={{ width: 340, "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
          slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" sx={{ color: "text.secondary" }} /></InputAdornment> } }}
        />
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
        totalCount={total} page={page} rowsPerPage={10} onPageChange={setPage}
        emptyText="Sin reportes todavía"
      />

      <NuevoReporteDialog open={nuevoOpen} onClose={() => setNuevoOpen(false)} onDone={() => { setNuevoOpen(false); cargar(); }} />
      <VerReporteDialog id={verId} onClose={() => setVerId(null)} />
    </Box>
  );
}

function NuevoReporteDialog({ open, onClose, onDone }) {
  const [clientes, setClientes] = useState([]);
  const [cliente, setCliente] = useState("");
  const [oc, setOc] = useState("");
  const [obs, setObs] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCliente(""); setOc(""); setObs(""); setError("");
    listarClientes({ pageSize: 200 }).then(({ items }) => setClientes(items)).catch(() => {});
  }, [open]);

  const crear = async () => {
    if (!cliente) { setError("Elige un cliente."); return; }
    setSaving(true); setError("");
    try {
      await crearReporte({ cliente, ordenCompra: oc || undefined, observaciones: obs || undefined });
      onDone();
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

function VerReporteDialog({ id, onClose }) {
  const [data, setData] = useState(null);
  useEffect(() => {
    if (!id) { setData(null); return; }
    obtenerReporte(id).then(setData).catch(() => setData(null));
  }, [id]);

  return (
    <Dialog open={!!id} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>{data?.reporte?.folio || "Reporte"}</DialogTitle>
      <DialogContent>
        {!data ? (
          <Typography variant="body2" color="text.secondary">Cargando…</Typography>
        ) : (
          <>
            <Typography variant="body2"><b>Cliente:</b> {data.reporte.cliente?.nombre}</Typography>
            <Typography variant="body2"><b>Estado:</b> {STATUS[data.reporte.status]?.label || data.reporte.status}</Typography>
            {data.reporte.ordenCompra && <Typography variant="body2"><b>OC:</b> {data.reporte.ordenCompra}</Typography>}

            <Divider sx={{ my: 1.5 }} />
            <Typography variant="subtitle2" fontWeight={700} gutterBottom>Asignaciones ({data.asignaciones.length})</Typography>
            {data.asignaciones.length === 0 && <Typography variant="caption" color="text.secondary">Aún sin equipos asignados.</Typography>}
            {data.asignaciones.map((a) => (
              <Box key={a._id} sx={{ py: 0.75, borderBottom: 1, borderColor: "divider" }}>
                <Typography variant="body2" fontWeight={600}>{a.equipo?.idInterno} — {a.equipo?.descripcion}</Typography>
                <Box sx={{ display: "flex", gap: 0.5, mt: 0.5, flexWrap: "wrap" }}>
                  <Chip size="small" label={`cal: ${a.estados?.calibracion}`} />
                  <Chip size="small" label={`entrega: ${a.estados?.entrega}`} />
                  <Chip size="small" label={`cert: ${a.estados?.certificado}`} />
                  {a.tecnicoEjecutor?.nombre && <Chip size="small" variant="outlined" label={`ejecutó: ${a.tecnicoEjecutor.nombre}`} />}
                </Box>
              </Box>
            ))}

            <Divider sx={{ my: 1.5 }} />
            <Typography variant="subtitle2" fontWeight={700} gutterBottom>Historial</Typography>
            {data.reporte.historial?.map((h, i) => (
              <Typography key={i} variant="caption" sx={{ display: "block", color: "text.secondary" }}>
                {new Date(h.fecha).toLocaleString("es-MX")} · {h.accion} · {h.usuario?.nombre || h.usuario?.usuario}
              </Typography>
            ))}
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button variant="contained" onClick={onClose} sx={{ borderRadius: 2 }}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  );
}
