import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Typography, TextField, InputAdornment, Chip, Tooltip, IconButton, Avatar,
  MenuItem, Select, FormControl, InputLabel, Grid, Paper, Checkbox, ListItemText, Collapse,
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Alert, Divider,
} from "@mui/material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import LocalShippingOutlined from "@mui/icons-material/LocalShippingOutlined";
import WorkspacePremiumOutlinedIcon from "@mui/icons-material/WorkspacePremiumOutlined";
import BiotechOutlinedIcon from "@mui/icons-material/BiotechOutlined";
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

/* ---------------------------------------------------------------------------
   Detalle del reporte de servicio + gestión de asignaciones (equipos)
--------------------------------------------------------------------------- */
const CAL_NEXT = { pendiente: "en_proceso", en_proceso: "terminada" };
const CAL_LABEL = { pendiente: "Iniciar calibración", en_proceso: "Marcar como terminada" };

const VIG_DOT = { vigente: "#16A34A", por_vencer: "#D97706", vencido: "#DC2626", sin_fecha: "#94A3B8" };

/* Rastreador de los 3 estados de una asignación */
function StateTracker({ estados }) {
  const pasos = [
    {
      key: "calibracion", label: "Calibración", icon: BiotechOutlinedIcon,
      done: estados?.calibracion === "terminada",
      active: estados?.calibracion === "en_proceso",
      texto: estados?.calibracion,
    },
    {
      key: "entrega", label: "Entrega", icon: LocalShippingOutlined,
      done: estados?.entrega === "entregado", active: false, texto: estados?.entrega,
    },
    {
      key: "certificado", label: "Certificado", icon: WorkspacePremiumOutlinedIcon,
      done: estados?.certificado === "autorizado",
      active: estados?.certificado === "en_revision",
      texto: estados?.certificado?.replace("_", " "),
    },
  ];
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0, mt: 1.5 }}>
      {pasos.map((p, i) => {
        const color = p.done ? "#16A34A" : p.active ? "#2563EB" : "#94A3B8";
        return (
          <Box key={p.key} sx={{ display: "flex", alignItems: "center", flex: i < 2 ? 1 : "0 0 auto" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
              <Box sx={{
                width: 26, height: 26, borderRadius: "50%", display: "grid", placeItems: "center", flexShrink: 0,
                color: p.done || p.active ? "#fff" : color,
                bgcolor: p.done ? "#16A34A" : p.active ? "#2563EB" : "transparent",
                border: p.done || p.active ? "none" : `1.5px solid ${color}`,
              }}>
                {p.done ? <CheckRoundedIcon sx={{ fontSize: 15 }} /> : <p.icon sx={{ fontSize: 14 }} />}
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="caption" fontWeight={700} sx={{ display: "block", lineHeight: 1.1 }}>{p.label}</Typography>
                <Typography variant="caption" sx={{ color: "text.secondary", fontSize: 10.5, textTransform: "capitalize" }}>{p.texto || "—"}</Typography>
              </Box>
            </Box>
            {i < 2 && <Box sx={{ flex: 1, height: 2, mx: 1, borderRadius: 2, bgcolor: p.done ? "#16A34A" : "divider" }} />}
          </Box>
        );
      })}
    </Box>
  );
}

function VerReporteDialog({ id, onClose, onChange }) {
  const [data, setData] = useState(null);
  const [agregar, setAgregar] = useState(false);
  const [busy, setBusy] = useState(false);

  const cargar = useCallback(() => {
    if (!id) { setData(null); return; }
    obtenerReporte(id).then(setData).catch(() => setData(null));
  }, [id]);
  useEffect(() => { cargar(); }, [cargar]);
  useEffect(() => { if (!id) setAgregar(false); }, [id]);

  const transicion = async (a, dominio, valor) => {
    setBusy(true);
    try { await cambiarEstadoAsignacion(a._id, { dominio, valor }); cargar(); onChange?.(); }
    finally { setBusy(false); }
  };

  const r = data?.reporte;
  const st = r ? (STATUS[r.status] || { label: r.status, color: "default" }) : null;

  return (
    <Dialog open={!!id} onClose={onClose} maxWidth="md" fullWidth
      slotProps={{ paper: { sx: { borderRadius: 3.5, overflow: "hidden" } } }}>
      {/* Cabecera */}
      <Box sx={{
        px: 3, py: 2.25, position: "relative",
        background: "radial-gradient(600px 200px at 8% 0%, rgba(37,99,235,.14), transparent 60%), var(--mui-palette-background-default)",
        borderBottom: 1, borderColor: "divider",
      }}>
        <IconButton onClick={onClose} size="small" sx={{ position: "absolute", top: 12, right: 12 }}>
          <CloseRoundedIcon fontSize="small" />
        </IconButton>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
          <Box sx={{ width: 40, height: 40, borderRadius: 2.5, display: "grid", placeItems: "center", color: "#fff", background: "linear-gradient(140deg,#3B82F6,#1D4ED8)", boxShadow: "0 8px 20px -6px rgba(37,99,235,.5)" }}>
            <FactCheckOutlinedIcon fontSize="small" />
          </Box>
          <Box>
            <Typography variant="h6" fontWeight={800} sx={{ lineHeight: 1.1 }}>{r?.folio || "Reporte"}</Typography>
            <Typography variant="body2" color="text.secondary">{r?.cliente?.nombre || "—"}</Typography>
          </Box>
          {st && <Chip size="small" label={st.label} color={st.color} sx={{ ml: "auto", mr: 4 }} />}
        </Box>
      </Box>

      <DialogContent sx={{ p: 3 }}>
        {!data ? (
          <Typography variant="body2" color="text.secondary">Cargando…</Typography>
        ) : (
          <>
            {/* Meta */}
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(4,1fr)" }, gap: 1.25, mb: 2.5 }}>
              {[
                ["Orden de compra", r.ordenCompra || "—"],
                ["Factura", r.factura || "—"],
                ["Recepción", formatDate(r.fechaRecepcion)],
                ["Inició", r.creadoPor?.nombre || "—"],
              ].map(([k, v]) => (
                <Box key={k} sx={{ p: 1.25, borderRadius: 2, bgcolor: "background.default", border: 1, borderColor: "divider" }}>
                  <Typography variant="caption" sx={{ color: "text.secondary", textTransform: "uppercase", letterSpacing: .5, fontSize: 9.5, display: "block" }}>{k}</Typography>
                  <Typography variant="body2" fontWeight={600} noWrap>{v}</Typography>
                </Box>
              ))}
            </Box>

            {/* Equipos */}
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
              <Typography variant="subtitle2" fontWeight={800} sx={{ letterSpacing: .3 }}>
                EQUIPOS · {data.asignaciones.length}
              </Typography>
              <Button
                size="small" variant={agregar ? "text" : "contained"}
                startIcon={agregar ? null : <AddCircleOutlineIcon />}
                onClick={() => setAgregar((v) => !v)}
                sx={{ borderRadius: 2 }}
              >
                {agregar ? "Cancelar" : "Agregar equipo"}
              </Button>
            </Box>

            <Collapse in={agregar} timeout={220} unmountOnExit>
              <AgregarAsignacion
                reporteId={r._id}
                clienteId={r.cliente?._id}
                onDone={() => { setAgregar(false); cargar(); onChange?.(); }}
              />
            </Collapse>

            {data.asignaciones.length === 0 && !agregar && (
              <Box sx={{ py: 4, textAlign: "center", border: "1px dashed", borderColor: "divider", borderRadius: 3 }}>
                <Typography variant="body2" color="text.secondary">Todavía no hay equipos en este reporte.</Typography>
                <Button size="small" startIcon={<AddCircleOutlineIcon />} onClick={() => setAgregar(true)} sx={{ mt: 1 }}>
                  Agregar el primero
                </Button>
              </Box>
            )}

            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
              {data.asignaciones.map((a) => (
                <Paper key={a._id} elevation={0} sx={{ p: 2, borderRadius: 3, border: 1, borderColor: "divider" }}>
                  <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 1.5, flexWrap: "wrap" }}>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="body2" fontWeight={700}>
                        {a.equipo?.idInterno} <Box component="span" sx={{ color: "text.secondary", fontWeight: 500 }}>· {a.equipo?.marca} {a.equipo?.modelo}</Box>
                      </Typography>
                      <Typography variant="caption" color="text.secondary">{a.equipo?.descripcion}</Typography>
                    </Box>
                    <Box sx={{ display: "flex", gap: 0.5, alignItems: "center", flexWrap: "wrap" }}>
                      {a.equipo?.categoria && <Chip size="small" variant="outlined" label={a.equipo.categoria} />}
                      {a.tecnicoAsignado?.nombre && (
                        <Tooltip title={`Asignado: ${a.tecnicoAsignado.nombre}`}>
                          <Avatar sx={{ width: 24, height: 24, fontSize: 11, bgcolor: "secondary.main" }}>
                            {a.tecnicoAsignado.nombre.charAt(0)}
                          </Avatar>
                        </Tooltip>
                      )}
                    </Box>
                  </Box>

                  <StateTracker estados={a.estados} />

                  {(a.patrones || []).length > 0 && (
                    <Box sx={{ display: "flex", gap: 0.5, mt: 1.25, flexWrap: "wrap" }}>
                      {a.patrones.map((p) => (
                        <Chip
                          key={p._id || p} size="small" variant="outlined"
                          label={p.codigo || "patrón"}
                          icon={<Box sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: VIG_DOT[p.vigencia] || VIG_DOT.sin_fecha, ml: 0.75 }} />}
                        />
                      ))}
                    </Box>
                  )}

                  <Box sx={{ display: "flex", gap: 1, mt: 1.5, flexWrap: "wrap" }}>
                    {CAL_NEXT[a.estados?.calibracion] && (
                      <Button size="small" variant="contained" disableElevation disabled={busy}
                        startIcon={a.estados.calibracion === "pendiente" ? <PlayArrowRoundedIcon /> : <CheckRoundedIcon />}
                        onClick={() => transicion(a, "calibracion", CAL_NEXT[a.estados.calibracion])}
                        sx={{ borderRadius: 2 }}>
                        {CAL_LABEL[a.estados.calibracion]}
                      </Button>
                    )}
                    {a.estados?.calibracion === "terminada" && a.estados?.entrega === "pendiente" && (
                      <Button size="small" variant="outlined" disabled={busy}
                        startIcon={<LocalShippingOutlined />}
                        onClick={() => transicion(a, "entrega", "entregado")}
                        sx={{ borderRadius: 2 }}>
                        Marcar entregado
                      </Button>
                    )}
                  </Box>
                </Paper>
              ))}
            </Box>

            {/* Historial */}
            {data.reporte.historial?.length > 0 && (
              <>
                <Typography variant="subtitle2" fontWeight={800} sx={{ letterSpacing: .3, mt: 3, mb: 1 }}>ACTIVIDAD</Typography>
                <Box sx={{ position: "relative", pl: 2.5 }}>
                  <Box sx={{ position: "absolute", left: 4, top: 4, bottom: 4, width: 2, bgcolor: "divider" }} />
                  {data.reporte.historial.slice().reverse().map((h, i) => (
                    <Box key={i} sx={{ position: "relative", pb: 1.25 }}>
                      <Box sx={{ position: "absolute", left: -20, top: 5, width: 8, height: 8, borderRadius: "50%", bgcolor: "secondary.main", border: "2px solid var(--mui-palette-background-paper)" }} />
                      <Typography variant="caption" sx={{ display: "block", fontWeight: 600 }}>{h.accion}</Typography>
                      <Typography variant="caption" sx={{ color: "text.secondary" }}>
                        {h.usuario?.nombre || h.usuario?.usuario} · {new Date(h.fecha).toLocaleString("es-MX")}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </>
            )}
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
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

  useEffect(() => {
    const eq = equipos.find((e) => e._id === equipoId);
    if (eq?.patronesSugeridos?.length) setPatronIds(eq.patronesSugeridos.map((p) => p._id || p));
  }, [equipoId, equipos]);

  const crear = async () => {
    if (!equipoId) { setError("Elige un equipo."); return; }
    setSaving(true); setError(""); setAvisos([]);
    try {
      const a = await crearAsignacion({
        reporte: reporteId, equipo: equipoId,
        tecnicoAsignado: tecnicoId || undefined, patrones: patronIds,
      });
      if (a?.advertencias?.length) setAvisos(a.advertencias);
      else onDone();
    } catch (e) {
      setError(e?.response?.data?.message || "No se pudo agregar el equipo.");
    } finally { setSaving(false); }
  };

  return (
    <Paper elevation={0} sx={{ p: 2.25, mb: 2, borderRadius: 3, border: 1, borderColor: "divider", bgcolor: "background.default" }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.75 }}>
        <Box sx={{ width: 28, height: 28, borderRadius: 2, display: "grid", placeItems: "center", bgcolor: "secondary.main", color: "#fff" }}>
          <AddCircleOutlineIcon sx={{ fontSize: 16 }} />
        </Box>
        <Typography variant="subtitle2" fontWeight={700}>Agregar equipo al reporte</Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 1.5, borderRadius: 2 }}>{error}</Alert>}
      {avisos.length > 0 && (
        <Alert severity="warning" sx={{ mb: 1.5, borderRadius: 2 }}>
          {avisos.map((a, i) => <div key={i}>{a}</div>)}
          <Button size="small" sx={{ mt: 1 }} onClick={onDone}>Se agregó de todos modos — continuar</Button>
        </Alert>
      )}

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 7 }}>
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
        <Grid size={{ xs: 12, md: 5 }}>
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
              renderValue={(sel) => (
                <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                  {sel.map((sid) => <Chip key={sid} size="small" label={patrones.find((p) => p._id === sid)?.codigo || sid} />)}
                </Box>
              )}
            >
              {patrones.map((p) => (
                <MenuItem key={p._id} value={p._id}>
                  <Checkbox size="small" checked={patronIds.indexOf(p._id) > -1} />
                  <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: VIG_DOT[p.vigencia] || VIG_DOT.sin_fecha, mr: 1, flexShrink: 0 }} />
                  <ListItemText primary={`${p.codigo} — ${p.nombre}`}
                    secondary={p.vigencia === "vencido" ? "Vencido" : p.vigencia === "por_vencer" ? "Por vencer" : null}
                    slotProps={{ secondary: { sx: { color: p.vigencia === "vencido" ? "error.main" : "warning.main" } } }} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
      </Grid>

      <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1, mt: 1.75 }}>
        <Button size="small" onClick={onDone}>Cancelar</Button>
        <Button variant="contained" size="small" disabled={saving} onClick={crear} sx={{ borderRadius: 2 }}>
          Agregar al reporte
        </Button>
      </Box>
    </Paper>
  );
}
