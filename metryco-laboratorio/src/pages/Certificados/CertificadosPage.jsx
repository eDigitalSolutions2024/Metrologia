import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box, Typography, TextField, InputAdornment, IconButton, Tooltip, Chip,
  MenuItem, Select, FormControl, InputLabel, Grid, Tabs, Tab, Paper,
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Alert,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";
import QrCode2OutlinedIcon from "@mui/icons-material/QrCode2Outlined";
import LabelOutlinedIcon from "@mui/icons-material/LabelOutlined";
import ArticleOutlinedIcon from "@mui/icons-material/ArticleOutlined";
import BlockOutlinedIcon from "@mui/icons-material/BlockOutlined";
import VerifiedOutlinedIcon from "@mui/icons-material/VerifiedOutlined";
import ScheduleOutlinedIcon from "@mui/icons-material/ScheduleOutlined";
import ReportGmailerrorredOutlinedIcon from "@mui/icons-material/ReportGmailerrorredOutlined";
import WorkspacePremiumOutlinedIcon from "@mui/icons-material/WorkspacePremiumOutlined";

import AppButton from "../../shared/components/AppButton";
import AppTable from "../../shared/components/AppTable";
import PageHeader from "../../shared/components/PageHeader";
import StatCard from "../../shared/components/StatCard";
import { formatDate } from "../../shared/utils/formatDate";
import { useAuth } from "../../core/auth/useAuth";
import { listarClientes } from "../../services/clientes";
import {
  listarCertificados, emitirCertificado, cambiarEstadoCertificado, anularCertificado,
  listarCertificadosPorVencer,
} from "../../services/certificados";
import { listarAsignaciones } from "../../services/reportes";
import { obtenerDirectorio } from "../../services/usuarios";
import QrDialog from "./QrDialog";
import EtiquetaDialog from "./EtiquetaDialog";
import EditarCertificadoDialog from "./EditarCertificadoDialog";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";

const ESTADO_CHIP = {
  vigente:    { label: "Vigente",     color: "success" },
  por_vencer: { label: "Por vencer",  color: "warning" },
  vencido:    { label: "Vencido",     color: "error" },
  anulado:    { label: "Anulado",     color: "default" },
  borrador:   { label: "Borrador",    color: "info" },
};

export default function CertificadosPage() {
  const theme = useTheme();
  const { user } = useAuth();
  const esAdmin = ["admin", "coordinador"].includes(user?.rol);

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [estado, setEstado] = useState("");
  const [clienteId, setClienteId] = useState("");
  const [clientes, setClientes] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [qrCert, setQrCert] = useState(null);
  const [etiquetaCert, setEtiquetaCert] = useState(null);
  const [emitirOpen, setEmitirOpen] = useState(false);
  const [anularCert, setAnularCert] = useState(null);
  const [editarCertId, setEditarCertId] = useState(null);

  const [tab, setTab] = useState(0); // 0 = listado, 1 = por vencer
  const [vencClienteId, setVencClienteId] = useState("");
  const [vencEstado, setVencEstado] = useState("");
  const [vencRows, setVencRows] = useState([]);
  const [vencLoading, setVencLoading] = useState(false);

  const cargar = useCallback(() => {
    setLoading(true);
    listarCertificados({ search, estado, clienteId, page, pageSize: rowsPerPage })
      .then(({ items, total }) => { setRows(items); setTotal(total); })
      .catch(() => { setRows([]); setTotal(0); })
      .finally(() => setLoading(false));
  }, [search, estado, clienteId, page, rowsPerPage]);

  useEffect(() => { cargar(); }, [cargar]);

  const cargarPorVencer = useCallback(() => {
    setVencLoading(true);
    listarCertificadosPorVencer({ clienteId: vencClienteId, estado: vencEstado })
      .then(setVencRows)
      .catch(() => setVencRows([]))
      .finally(() => setVencLoading(false));
  }, [vencClienteId, vencEstado]);

  useEffect(() => { if (tab === 1) cargarPorVencer(); }, [tab, cargarPorVencer]);
  useEffect(() => {
    listarClientes({ pageSize: 200 }).then(({ items }) => setClientes(items)).catch(() => {});
  }, []);

  const stats = useMemo(() => {
    const c = (e) => rows.filter((r) => (r.estadoEfectivo || r.estado) === e).length;
    return [
      { t: "Total", v: total, icon: <WorkspacePremiumOutlinedIcon />, color: theme.palette.secondary.main },
      { t: "Vigentes", v: c("vigente"), icon: <VerifiedOutlinedIcon />, color: theme.palette.success.main },
      { t: "Por vencer", v: c("por_vencer"), icon: <ScheduleOutlinedIcon />, color: theme.palette.warning.main },
      { t: "Vencidos", v: c("vencido"), icon: <ReportGmailerrorredOutlinedIcon />, color: theme.palette.error.main },
    ];
  }, [rows, total, theme]);

  const columns = [
    {
      field: "folio",
      headerName: "Certificado",
      renderCell: (r) => (
        <Box>
          <Typography variant="body2" fontWeight={700}>{r.folio}</Typography>
          <Typography variant="caption" color="text.secondary">
            {r.equipoSnapshot?.idInterno} · {r.equipoSnapshot?.descripcion}
          </Typography>
        </Box>
      ),
    },
    { field: "cliente", headerName: "Cliente", renderCell: (r) => r.clienteSnapshot?.nombre || r.cliente?.nombre || "—" },
    { field: "fechaCalibracion", headerName: "Calibración", renderCell: (r) => formatDate(r.fechaCalibracion) },
    { field: "vigencia", headerName: "Vigencia", renderCell: (r) => formatDate(r.vigencia) },
    {
      field: "estado",
      headerName: "Estado",
      renderCell: (r) => {
        const s = ESTADO_CHIP[r.estadoEfectivo || r.estado] || { label: r.estado, color: "default" };
        return <Chip size="small" label={s.label} color={s.color} />;
      },
    },
    {
      field: "acciones",
      headerName: "Acciones",
      align: "center",
      renderCell: (r) => (
        <Box sx={{ display: "flex", gap: 0.25, justifyContent: "center" }}>
          {r.estado === "borrador" && (
            <Tooltip title="Marcar vigente">
              <IconButton size="small" onClick={() => cambiarEstadoCertificado(r._id, "vigente").then(cargar)}>
                <VerifiedOutlinedIcon fontSize="small" sx={{ color: "success.main" }} />
              </IconButton>
            </Tooltip>
          )}
          <Tooltip title="Informe de calibración (PDF)">
            <IconButton size="small" onClick={() => window.open(`/informe/certificado/${r._id}`, "_blank")}>
              <ArticleOutlinedIcon fontSize="small" sx={{ color: "secondary.main" }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Código QR">
            <IconButton size="small" onClick={() => setQrCert(r)}>
              <QrCode2OutlinedIcon fontSize="small" sx={{ color: "secondary.main" }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Etiqueta / imprimir">
            <IconButton size="small" onClick={() => setEtiquetaCert(r)}>
              <LabelOutlinedIcon fontSize="small" sx={{ color: "secondary.main" }} />
            </IconButton>
          </Tooltip>
          {esAdmin && r.estado === "vigente" && (
            <Tooltip title="Editar certificado (servicio, condiciones, comentarios)">
              <IconButton size="small" onClick={() => setEditarCertId(r._id)}>
                <EditOutlinedIcon fontSize="small" sx={{ color: "secondary.main" }} />
              </IconButton>
            </Tooltip>
          )}
          {esAdmin && r.estado !== "anulado" && (
            <Tooltip title="Anular">
              <IconButton size="small" onClick={() => setAnularCert(r)}>
                <BlockOutlinedIcon fontSize="small" sx={{ color: "text.secondary" }} />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      ),
    },
  ];

  const vencColumns = [
    {
      field: "folio",
      headerName: "Certificado",
      renderCell: (r) => (
        <Box>
          <Typography variant="body2" fontWeight={700}>{r.folio}</Typography>
          <Typography variant="caption" color="text.secondary">
            {r.equipoSnapshot?.idInterno} · {r.equipoSnapshot?.descripcion}
          </Typography>
        </Box>
      ),
    },
    { field: "cliente", headerName: "Cliente", renderCell: (r) => r.clienteSnapshot?.nombre || r.cliente?.nombre || "—" },
    { field: "vigencia", headerName: "Vigencia", renderCell: (r) => formatDate(r.vigencia) },
    {
      field: "estado",
      headerName: "Estado",
      renderCell: (r) => {
        const s = ESTADO_CHIP[r.estadoEfectivo] || { label: r.estadoEfectivo, color: "default" };
        return <Chip size="small" label={s.label} color={s.color} />;
      },
    },
    {
      field: "acciones",
      headerName: "Acciones",
      align: "center",
      renderCell: (r) => (
        <Box sx={{ display: "flex", gap: 0.25, justifyContent: "center" }}>
          <Tooltip title="Informe de calibración (PDF)">
            <IconButton size="small" onClick={() => window.open(`/informe/certificado/${r._id}`, "_blank")}>
              <ArticleOutlinedIcon fontSize="small" sx={{ color: "secondary.main" }} />
            </IconButton>
          </Tooltip>
          {esAdmin && (
            <Tooltip title="Editar certificado (servicio, condiciones, comentarios)">
              <IconButton size="small" onClick={() => setEditarCertId(r._id)}>
                <EditOutlinedIcon fontSize="small" sx={{ color: "secondary.main" }} />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      ),
    },
  ];

  return (
    <Box>
      <PageHeader
        icon={<WorkspacePremiumOutlinedIcon />}
        title="Certificados de Calibración"
        subtitle={`${total} certificados emitidos`}
        actions={
          <AppButton startIcon={<AddIcon />} onClick={() => setEmitirOpen(true)} sx={{ borderRadius: 2 }}>
            Emitir certificado
          </AppButton>
        }
      />

      <Grid container spacing={2.5} sx={{ mb: 3.5 }}>
        {stats.map((s) => (
          <Grid key={s.t} size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard label={s.t} value={s.v} icon={s.icon} color={s.color} />
          </Grid>
        ))}
      </Grid>

      <Paper variant="outlined" sx={{ borderRadius: 2, mb: 2.5 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 1.5, borderBottom: 1, borderColor: "divider" }}>
          <Tab label="Todos los certificados" />
          <Tab label="Por vencer" />
        </Tabs>
      </Paper>

      {tab === 0 ? (
        <>
          <Box sx={{ display: "flex", gap: 2, mb: 2, flexWrap: "wrap" }}>
            <TextField
              placeholder="Buscar por folio, equipo, serie o cliente…"
              size="small"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              sx={{ width: 340, "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
              slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" sx={{ color: "text.secondary" }} /></InputAdornment> } }}
            />
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>Estado</InputLabel>
              <Select label="Estado" value={estado} onChange={(e) => { setEstado(e.target.value); setPage(0); }} sx={{ borderRadius: 2 }}>
                <MenuItem value="">Todos</MenuItem>
                <MenuItem value="borrador">Borrador</MenuItem>
                <MenuItem value="vigente">Vigente</MenuItem>
                <MenuItem value="anulado">Anulado</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 220 }}>
              <InputLabel>Cliente</InputLabel>
              <Select label="Cliente" value={clienteId} onChange={(e) => { setClienteId(e.target.value); setPage(0); }} sx={{ borderRadius: 2 }}>
                <MenuItem value="">Todos</MenuItem>
                {clientes.map((c) => <MenuItem key={c._id} value={c._id}>{c.nombre}</MenuItem>)}
              </Select>
            </FormControl>
          </Box>

          <AppTable
            columns={columns}
            rows={rows}
            loading={loading}
            totalCount={total}
            page={page}
            rowsPerPage={rowsPerPage}
            onPageChange={setPage}
            onRowsPerPageChange={(n) => { setRowsPerPage(n); setPage(0); }}
            emptyText="Sin certificados"
          />
        </>
      ) : (
        <>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Certificados vigentes cuya vigencia ya venció o vence dentro de los próximos 30 días.
          </Typography>
          <Box sx={{ display: "flex", gap: 2, mb: 2, flexWrap: "wrap" }}>
            <FormControl size="small" sx={{ minWidth: 220 }}>
              <InputLabel>Cliente</InputLabel>
              <Select label="Cliente" value={vencClienteId} onChange={(e) => setVencClienteId(e.target.value)} sx={{ borderRadius: 2 }}>
                <MenuItem value="">Todos</MenuItem>
                {clientes.map((c) => <MenuItem key={c._id} value={c._id}>{c.nombre}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>Estado</InputLabel>
              <Select label="Estado" value={vencEstado} onChange={(e) => setVencEstado(e.target.value)} sx={{ borderRadius: 2 }}>
                <MenuItem value="">Todos (vencidos + por vencer)</MenuItem>
                <MenuItem value="por_vencer">Solo por vencer</MenuItem>
                <MenuItem value="vencido">Solo vencidos</MenuItem>
              </Select>
            </FormControl>
          </Box>

          <AppTable
            columns={vencColumns}
            rows={vencRows}
            loading={vencLoading}
            totalCount={vencRows.length}
            page={0}
            rowsPerPage={vencRows.length || 10}
            onPageChange={() => {}}
            onRowsPerPageChange={() => {}}
            emptyText="Sin certificados por vencer"
          />
        </>
      )}

      <QrDialog open={!!qrCert} onClose={() => setQrCert(null)} certificado={qrCert} />
      <EtiquetaDialog open={!!etiquetaCert} onClose={() => setEtiquetaCert(null)} certificado={etiquetaCert} />
      <EmitirDialog open={emitirOpen} onClose={() => setEmitirOpen(false)} onDone={() => { setEmitirOpen(false); cargar(); }} />
      <AnularDialog cert={anularCert} onClose={() => setAnularCert(null)} onDone={() => { setAnularCert(null); cargar(); }} />
      {editarCertId && (
        <EditarCertificadoDialog
          certificadoId={editarCertId}
          onClose={() => setEditarCertId(null)}
          onDone={() => { setEditarCertId(null); cargar(); if (tab === 1) cargarPorVencer(); }}
        />
      )}
    </Box>
  );
}

/* --------------------------- Emitir --------------------------- */
// Razón/tipo/procedimiento/temperatura/humedad/comentarios ya no se piden
// aquí: se capturan una sola vez al calibrar ("Iniciar calibración" en el
// detalle del Reporte) y el certificado los hereda de la asignación
// (ver certificado.service.js `emitir`). Emitir solo confirma y genera el PDF.
const emitirVacio = { sel: "", vigencia: "", revisadoPor: "", autorizadoPor: "" };

function EmitirDialog({ open, onClose, onDone }) {
  const { user } = useAuth();
  const [asignaciones, setAsignaciones] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [f, setF] = useState(emitirVacio);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [vigenciaTocada, setVigenciaTocada] = useState(false);
  const set = (campo) => (e) => setF((s) => ({ ...s, [campo]: e.target.value }));

  useEffect(() => {
    if (!open) return;
    // Se pre-selecciona a quien está emitiendo como revisor técnico — sigue
    // siendo editable, casi siempre es la misma persona quien hace ambas cosas.
    setF({ ...emitirVacio, revisadoPor: user?.id || "" });
    setError(""); setVigenciaTocada(false);
    listarAsignaciones({ estadoCertificado: "autorizado", pageSize: 100 })
      .then(({ items }) => setAsignaciones(items))
      .catch(() => setAsignaciones([]));
    obtenerDirectorio().then(setUsuarios).catch(() => setUsuarios([]));
  }, [open, user?.id]);

  // Al elegir la calibración, se propone vigencia = fecha de calibración + 1
  // año (intervalo típico) — se puede ajustar si el equipo requiere otro.
  useEffect(() => {
    if (!f.sel || vigenciaTocada) return;
    const asig = asignaciones.find((a) => a._id === f.sel);
    if (!asig?.fechaCalibracion) return;
    const v = new Date(asig.fechaCalibracion);
    v.setFullYear(v.getFullYear() + 1);
    setF((s) => ({ ...s, vigencia: v.toISOString().slice(0, 10) }));
  }, [f.sel]); // eslint-disable-line react-hooks/exhaustive-deps

  const asignacionSel = asignaciones.find((a) => a._id === f.sel);

  const emitir = async () => {
    if (!f.sel) { setError("Elige una calibración."); return; }
    setSaving(true); setError("");
    try {
      await emitirCertificado({
        asignacion: f.sel,
        vigencia: f.vigencia || undefined,
        revisadoPor: f.revisadoPor || undefined,
        autorizadoPor: f.autorizadoPor || undefined,
      });
      onDone();
    } catch (e) {
      setError(e?.response?.data?.message || "No se pudo emitir el certificado.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>Emitir certificado</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Se genera desde una calibración ya autorizada por Calidad. El equipo, cliente, patrones y los
          datos del servicio (capturados al calibrar) se copian tal cual al certificado.
        </Typography>

        <Grid container spacing={2}>
          <Grid size={12}>
            <TextField
              select fullWidth size="small" label="Calibración" value={f.sel}
              onChange={set("sel")}
            >
              {asignaciones.length === 0 && <MenuItem value="" disabled>No hay calibraciones autorizadas por certificar</MenuItem>}
              {asignaciones.map((a) => (
                <MenuItem key={a._id} value={a._id}>
                  {a.reporte?.folio} · {a.equipo?.idInterno} — {a.equipo?.marca} {a.equipo?.modelo}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          {asignacionSel && (
            <Grid size={12}>
              <Alert severity="info" icon={false} sx={{ borderRadius: 2, py: 0.5 }}>
                <Typography variant="caption">
                  Del servicio capturado al calibrar: <b>{asignacionSel.servicio?.razon || "—"}</b> ·{" "}
                  <b>{asignacionSel.servicio?.tipo || "—"}</b>
                  {asignacionSel.servicio?.procedimiento ? ` · ${asignacionSel.servicio.procedimiento}` : ""}
                  {asignacionSel.condiciones?.temperatura != null ? ` · ${asignacionSel.condiciones.temperatura} °C` : ""}
                  {asignacionSel.condiciones?.humedad != null ? ` · ${asignacionSel.condiciones.humedad} % HR` : ""}
                </Typography>
              </Alert>
            </Grid>
          )}

          <Grid size={12}>
            <TextField
              type="date" fullWidth size="small" label="Vigencia"
              helperText="Sugerida a 1 año de la calibración — puedes cambiarla"
              value={f.vigencia} onChange={(e) => { setVigenciaTocada(true); set("vigencia")(e); }}
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Grid>

          <Grid size={{ xs: 6 }}>
            <TextField select fullWidth size="small" label="Revisó (aprobación técnica)" value={f.revisadoPor} onChange={set("revisadoPor")}>
              <MenuItem value="">— Sin especificar —</MenuItem>
              {usuarios.map((u) => <MenuItem key={u._id} value={u._id}>{u.nombre}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid size={{ xs: 6 }}>
            <TextField select fullWidth size="small" label="Autorizó (aseguramiento de calidad)" value={f.autorizadoPor} onChange={set("autorizadoPor")}>
              <MenuItem value="">— Sin especificar —</MenuItem>
              {usuarios.map((u) => <MenuItem key={u._id} value={u._id}>{u.nombre}</MenuItem>)}
            </TextField>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={emitir} disabled={saving} sx={{ borderRadius: 2 }}>
          Emitir
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/* --------------------------- Anular --------------------------- */
function AnularDialog({ cert, onClose, onDone }) {
  const [motivo, setMotivo] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => { setMotivo(""); }, [cert]);

  return (
    <Dialog open={!!cert} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>Anular {cert?.folio}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          El certificado se marca como anulado (no se borra). La verificación pública mostrará el motivo.
        </Typography>
        <TextField
          label="Motivo" fullWidth size="small" multiline minRows={2}
          value={motivo} onChange={(e) => setMotivo(e.target.value)}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancelar</Button>
        <Button
          color="error" variant="contained" disabled={!motivo.trim() || saving}
          onClick={async () => {
            setSaving(true);
            try { await anularCertificado(cert._id, motivo.trim()); onDone(); }
            finally { setSaving(false); }
          }}
          sx={{ borderRadius: 2 }}
        >
          Anular
        </Button>
      </DialogActions>
    </Dialog>
  );
}
