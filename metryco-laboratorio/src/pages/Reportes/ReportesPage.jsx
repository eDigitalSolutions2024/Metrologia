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
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutlineOutlined";
import { listarClientes } from "../../services/clientes";
import {
  listarReportes, crearReporte, obtenerReporte, crearAsignacion, cambiarEstadoAsignacion,
} from "../../services/reportes";
import { listarEquipos } from "../../services/equipos";
import { listarPatrones } from "../../services/patrones";
import { obtenerDirectorio } from "../../services/usuarios";

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
      <VerReporteDialog id={verId} onClose={() => setVerId(null)} onChange={cargar} />
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

const CAL_NEXT = { pendiente: "en_proceso", en_proceso: "terminada" };
const CAL_LABEL = { pendiente: "Iniciar calibración", en_proceso: "Marcar terminada" };

function VerReporteDialog({ id, onClose, onChange }) {
  const [data, setData] = useState(null);
  const [agregar, setAgregar] = useState(false);
  const [busy, setBusy] = useState(false);

  const cargar = useCallback(() => {
    if (!id) { setData(null); return; }
    obtenerReporte(id).then(setData).catch(() => setData(null));
  }, [id]);
  useEffect(() => { cargar(); }, [cargar]);

  const avanzarCalibracion = async (a) => {
    const sig = CAL_NEXT[a.estados?.calibracion];
    if (!sig) return;
    setBusy(true);
    try { await cambiarEstadoAsignacion(a._id, { dominio: "calibracion", valor: sig }); cargar(); onChange?.(); }
    finally { setBusy(false); }
  };
  const marcarEntregado = async (a) => {
    setBusy(true);
    try { await cambiarEstadoAsignacion(a._id, { dominio: "entrega", valor: "entregado" }); cargar(); onChange?.(); }
    finally { setBusy(false); }
  };

  return (
    <Dialog open={!!id} onClose={onClose} maxWidth="md" fullWidth>
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
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
              <Typography variant="subtitle2" fontWeight={700}>Equipos / asignaciones ({data.asignaciones.length})</Typography>
              <Button size="small" startIcon={<AddCircleOutlineIcon />} onClick={() => setAgregar((v) => !v)}>
                {agregar ? "Cancelar" : "Agregar equipo"}
              </Button>
            </Box>

            {agregar && (
              <AgregarAsignacion
                reporteId={data.reporte._id}
                clienteId={data.reporte.cliente?._id}
                onDone={() => { setAgregar(false); cargar(); onChange?.(); }}
              />
            )}

            {data.asignaciones.length === 0 && !agregar && (
              <Typography variant="caption" color="text.secondary">Aún sin equipos asignados. Usa “Agregar equipo”.</Typography>
            )}

            {data.asignaciones.map((a) => (
              <Box key={a._id} sx={{ py: 1, borderBottom: 1, borderColor: "divider" }}>
                <Typography variant="body2" fontWeight={600}>
                  {a.equipo?.idInterno} — {a.equipo?.marca} {a.equipo?.modelo} · {a.equipo?.descripcion}
                </Typography>
                <Box sx={{ display: "flex", gap: 0.5, mt: 0.5, flexWrap: "wrap", alignItems: "center" }}>
                  <Chip size="small" label={`cal: ${a.estados?.calibracion}`} color={a.estados?.calibracion === "terminada" ? "success" : "default"} />
                  <Chip size="small" label={`entrega: ${a.estados?.entrega}`} color={a.estados?.entrega === "entregado" ? "success" : "default"} />
                  <Chip size="small" label={`cert: ${a.estados?.certificado}`} color={a.estados?.certificado === "autorizado" ? "success" : "default"} />
                  {a.tecnicoAsignado?.nombre && <Chip size="small" variant="outlined" label={`asignado: ${a.tecnicoAsignado.nombre}`} />}
                  {a.tecnicoEjecutor?.nombre && <Chip size="small" variant="outlined" label={`ejecutó: ${a.tecnicoEjecutor.nombre}`} />}
                  {(a.patrones || []).map((p) => <Chip key={p._id || p} size="small" variant="outlined" label={p.codigo || "patrón"} />)}
                </Box>
                <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
                  {CAL_NEXT[a.estados?.calibracion] && (
                    <Button size="small" variant="outlined" disabled={busy} onClick={() => avanzarCalibracion(a)}>
                      {CAL_LABEL[a.estados?.calibracion]}
                    </Button>
                  )}
                  {a.estados?.calibracion === "terminada" && a.estados?.entrega === "pendiente" && (
                    <Button size="small" variant="outlined" disabled={busy} onClick={() => marcarEntregado(a)}>
                      Marcar entregado
                    </Button>
                  )}
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

function AgregarAsignacion({ reporteId, clienteId, onDone }) {
  const [equipos, setEquipos] = useState([]);
  const [tecnicos, setTecnicos] = useState([]);
  const [patrones, setPatrones] = useState([]);
  const [equipoId, setEquipoId] = useState("");
  const [tecnicoId, setTecnicoId] = useState("");
  const [patronIds, setPatronIds] = useState([]);
  const [error, setError] = useState("");
  const [avisos, setAvisos] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    listarEquipos({ clienteId, pageSize: 200 }).then(({ items }) => setEquipos(items)).catch(() => {});
    obtenerDirectorio().then((u) => setTecnicos((u || []).filter((x) => x.rol === "tecnico"))).catch(() => {});
    listarPatrones({ estado: "activo", pageSize: 200 }).then(({ items }) => setPatrones(items)).catch(() => {});
  }, [clienteId]);

  // al elegir equipo, precarga sus patrones sugeridos
  useEffect(() => {
    const eq = equipos.find((e) => e._id === equipoId);
    if (eq?.patronesSugeridos?.length) {
      setPatronIds(eq.patronesSugeridos.map((p) => p._id || p));
    }
  }, [equipoId, equipos]);

  const crear = async () => {
    if (!equipoId) { setError("Elige un equipo."); return; }
    setSaving(true); setError(""); setAvisos([]);
    try {
      const a = await crearAsignacion({
        reporte: reporteId,
        equipo: equipoId,
        tecnicoAsignado: tecnicoId || undefined,
        patrones: patronIds,
      });
      if (a?.advertencias?.length) { setAvisos(a.advertencias); }
      else onDone();
    } catch (e) {
      setError(e?.response?.data?.message || "No se pudo agregar el equipo.");
    } finally { setSaving(false); }
  };

  return (
    <Box sx={{ p: 2, mb: 1.5, borderRadius: 2, border: 1, borderColor: "divider", bgcolor: "background.default" }}>
      {error && <Alert severity="error" sx={{ mb: 1.5, borderRadius: 2 }}>{error}</Alert>}
      {avisos.length > 0 && (
        <Alert severity="warning" sx={{ mb: 1.5, borderRadius: 2 }}>
          {avisos.map((a, i) => <div key={i}>{a}</div>)}
          <Button size="small" sx={{ mt: 1 }} onClick={onDone}>Se agregó de todos modos — continuar</Button>
        </Alert>
      )}
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <FormControl fullWidth size="small">
            <InputLabel>Equipo del cliente</InputLabel>
            <Select label="Equipo del cliente" value={equipoId} onChange={(e) => setEquipoId(e.target.value)}>
              {equipos.length === 0 && <MenuItem value="" disabled>Este cliente no tiene equipos dados de alta</MenuItem>}
              {equipos.map((e) => (
                <MenuItem key={e._id} value={e._id}>{e.idInterno} — {e.marca} {e.modelo} ({e.descripcion})</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <FormControl fullWidth size="small">
            <InputLabel>Técnico asignado</InputLabel>
            <Select label="Técnico asignado" value={tecnicoId} onChange={(e) => setTecnicoId(e.target.value)}>
              <MenuItem value="">— sin asignar —</MenuItem>
              {tecnicos.map((t) => <MenuItem key={t._id} value={t._id}>{t.nombre}</MenuItem>)}
            </Select>
          </FormControl>
        </Grid>
        <Grid size={{ xs: 12 }}>
          <FormControl fullWidth size="small">
            <InputLabel>Patrones de referencia</InputLabel>
            <Select
              multiple label="Patrones de referencia" value={patronIds}
              onChange={(e) => setPatronIds(typeof e.target.value === "string" ? e.target.value.split(",") : e.target.value)}
              renderValue={(sel) => sel.map((id) => patrones.find((p) => p._id === id)?.codigo || id).join(", ")}
            >
              {patrones.map((p) => (
                <MenuItem key={p._id} value={p._id}>
                  {p.codigo} — {p.nombre} {p.vigencia === "vencido" ? "· ⚠ vencido" : p.vigencia === "por_vencer" ? "· por vencer" : ""}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
      </Grid>
      <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 1.5 }}>
        <Button variant="contained" size="small" disabled={saving} onClick={crear} sx={{ borderRadius: 2 }}>
          Agregar al reporte
        </Button>
      </Box>
    </Box>
  );
}
