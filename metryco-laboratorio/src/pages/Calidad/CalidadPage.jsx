import { useEffect, useMemo, useState } from "react";
import {
  Box, Typography, Button, MenuItem, Select, FormControl, InputLabel,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Chip, Tooltip, IconButton,
} from "@mui/material";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutlineOutlined";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import HistoryOutlinedIcon from "@mui/icons-material/HistoryOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import InsertChartOutlinedIcon from "@mui/icons-material/InsertChartOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";

import AppButton from "../../shared/components/AppButton";
import AppTable from "../../shared/components/AppTable";
import PageHeader from "../../shared/components/PageHeader";
import ScienceOutlinedIcon from "@mui/icons-material/ScienceOutlined";
import { formatDate } from "../../shared/utils/formatDate";
import { listarClientes } from "../../services/clientes";
import { obtenerDirectorio } from "../../services/usuarios";
import { exportCsv } from "../../shared/utils/exportCsv";
import { MOCK } from "./mockData";

const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

function RechazarDialog({ open, onClose, onConfirm }) {
  const [motivo, setMotivo] = useState("");

  const cerrar = () => { setMotivo(""); onClose(); };

  return (
    <Dialog open={open} onClose={cerrar} fullWidth maxWidth="xs">
      <DialogTitle>Rechazar asignación</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          Indica el motivo del rechazo. Quedará registrado en el historial.
        </Typography>
        <TextField
          autoFocus
          fullWidth
          multiline
          minRows={3}
          size="small"
          placeholder="Ej. Falta firma del técnico en la hoja de datos originales."
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <AppButton variant="outlined" onClick={cerrar} sx={{ borderRadius: 2 }}>Cancelar</AppButton>
        <AppButton
          color="error"
          disabled={!motivo.trim()}
          onClick={() => { onConfirm(motivo.trim()); setMotivo(""); }}
          sx={{ borderRadius: 2 }}
        >
          Enviar rechazo
        </AppButton>
      </DialogActions>
    </Dialog>
  );
}

function HistorialDialog({ open, onClose, asignacion }) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Historial de revisión — MET {asignacion?.id}</DialogTitle>
      <DialogContent>
        {(asignacion?.historial ?? []).length === 0 ? (
          <Typography variant="body2" color="text.secondary">Sin comentarios registrados.</Typography>
        ) : (
          asignacion.historial.map((h, i) => (
            <Box key={i} sx={{ mb: 1.5, pb: 1.5, borderBottom: i < asignacion.historial.length - 1 ? 1 : 0, borderColor: "divider" }}>
              <Typography variant="caption" color="text.secondary">{formatDate(h.fecha)}</Typography>
              <Typography variant="body2">{h.comentario}</Typography>
            </Box>
          ))
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <AppButton variant="outlined" onClick={onClose} sx={{ borderRadius: 2 }}>Cerrar</AppButton>
      </DialogActions>
    </Dialog>
  );
}

function ConsultarTab() {
  const [clientes, setClientes] = useState([]);
  const [clienteFiltro, setClienteFiltro] = useState("");
  const [asignaciones, setAsignaciones] = useState(MOCK);
  const [rechazarTarget, setRechazarTarget] = useState(null);
  const [historialTarget, setHistorialTarget] = useState(null);
  const [page, setPage] = useState(0);

  useEffect(() => {
    listarClientes({ pageSize: 200 })
      .then(({ items }) => setClientes(items))
      .catch(() => setClientes([]));
  }, []);

  // Igual que el PHP: la cola de Calidad solo muestra pendientes (0) y rechazados (2);
  // al autorizar, la fila sale de la lista.
  const pendientes = useMemo(
    () => asignaciones.filter((a) => a.statusCalidad === 0 || a.statusCalidad === 2),
    [asignaciones]
  );

  const filtered = clienteFiltro
    ? pendientes.filter((a) => String(a.clienteId) === String(clienteFiltro))
    : pendientes;

  const autorizar = (id) => {
    setAsignaciones((prev) => prev.map((a) => (a.id === id ? { ...a, statusCalidad: 1 } : a)));
  };

  const confirmarRechazo = (motivo) => {
    const fecha = new Date().toISOString().slice(0, 10);
    setAsignaciones((prev) =>
      prev.map((a) =>
        a.id === rechazarTarget.id
          ? { ...a, statusCalidad: 2, historial: [...a.historial, { fecha, comentario: motivo }] }
          : a
      )
    );
    setRechazarTarget(null);
  };

  const columns = [
    { field: "id", headerName: "MET" },
    { field: "cliente", headerName: "Cliente" },
    { field: "fechaAsignacion", headerName: "Fecha Asignación", renderCell: (r) => formatDate(r.fechaAsignacion) },
    { field: "fechaCaptura", headerName: "Fecha Captura", renderCell: (r) => (r.fechaCaptura ? formatDate(r.fechaCaptura) : "—") },
    { field: "tecnico", headerName: "Técnico" },
    { field: "idClienteInterno", headerName: "ID Cliente" },
    {
      field: "editarPortada",
      headerName: "Editar Portada",
      align: "center",
      renderCell: (r) =>
        r.statusAsignacion === 1 ? (
          <Tooltip title="Editar portada">
            <IconButton size="small"><EditOutlinedIcon fontSize="small" sx={{ color: "warning.main" }} /></IconButton>
          </Tooltip>
        ) : "N/A",
    },
    {
      field: "portada",
      headerName: "Portada",
      align: "center",
      renderCell: (r) =>
        r.statusAsignacion === 1 ? (
          <Tooltip title="Descargar portada">
            <IconButton size="small"><DescriptionOutlinedIcon fontSize="small" sx={{ color: "secondary.main" }} /></IconButton>
          </Tooltip>
        ) : "En Proceso",
    },
    {
      field: "grafica",
      headerName: "Gráfica",
      align: "center",
      renderCell: (r) =>
        r.statusAsignacion === 1 ? (
          <Tooltip title="Descargar gráfica">
            <IconButton size="small"><InsertChartOutlinedIcon fontSize="small" sx={{ color: "info.main" }} /></IconButton>
          </Tooltip>
        ) : "En Proceso",
    },
    {
      field: "statusCalidad",
      headerName: "Estatus Calidad",
      renderCell: (r) =>
        r.statusCalidad === 2 ? (
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
            <Chip label="Rechazado" color="error" size="small" />
            <Tooltip title="Ver historial">
              <IconButton size="small" onClick={() => setHistorialTarget(r)}>
                <HistoryOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        ) : (
          <Chip label="Pendiente" color="warning" size="small" />
        ),
    },
    {
      field: "accion",
      headerName: "Acción",
      align: "center",
      renderCell: (r) => (
        <Box sx={{ display: "flex", gap: 0.5, justifyContent: "center" }}>
          <Tooltip title="Autorizar">
            <IconButton size="small" onClick={() => autorizar(r.id)}>
              <CheckCircleOutlineIcon fontSize="small" sx={{ color: "success.main" }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Rechazar">
            <IconButton size="small" onClick={() => setRechazarTarget(r)}>
              <CancelOutlinedIcon fontSize="small" sx={{ color: "error.main" }} />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  return (
    <Box>
      <Box sx={{ display: "flex", gap: 2, mb: 2, alignItems: "center", flexWrap: "wrap" }}>
        <FormControl size="small" sx={{ minWidth: 280 }}>
          <InputLabel>Filtrar búsqueda por cliente</InputLabel>
          <Select
            label="Filtrar búsqueda por cliente"
            value={clienteFiltro}
            onChange={(e) => { setClienteFiltro(e.target.value); setPage(0); }}
            sx={{ borderRadius: 2 }}
          >
            <MenuItem value="">Todos los clientes</MenuItem>
            {clientes.map((c) => (
              <MenuItem key={c._id} value={c._id}>{c.nombre}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button variant="contained" onClick={() => setPage(0)} sx={{ borderRadius: 2 }}>Buscar</Button>
      </Box>

      <AppTable
        columns={columns}
        rows={filtered.slice(page * 10, page * 10 + 10)}
        totalCount={filtered.length}
        page={page}
        rowsPerPage={10}
        onPageChange={setPage}
        emptyText="No hay certificados pendientes de aprobar"
      />

      <RechazarDialog open={!!rechazarTarget} onClose={() => setRechazarTarget(null)} onConfirm={confirmarRechazo} />
      <HistorialDialog open={!!historialTarget} onClose={() => setHistorialTarget(null)} asignacion={historialTarget} />
    </Box>
  );
}

function ExportarDialog({ open, onClose }) {
  const [modo, setModo] = useState("tecnico");
  const [tecnicos, setTecnicos] = useState([]);
  const [tecnico, setTecnico] = useState("");
  const [mes, setMes] = useState("");
  const [anio, setAnio] = useState("");

  const anios = useMemo(() => {
    const actual = new Date().getFullYear();
    return [actual, actual - 1, actual - 2];
  }, []);

  useEffect(() => {
    if (!open) return;
    obtenerDirectorio()
      .then((lista) => setTecnicos(lista.filter((u) => u.rol === "tecnico")))
      .catch(() => setTecnicos([]));
  }, [open]);

  const cerrar = () => {
    setModo("tecnico"); setTecnico(""); setMes(""); setAnio("");
    onClose();
  };

  const exportar = () => {
    const filas = MOCK
      .filter((a) => modo === "general" || !tecnico || tecnicos.find((t) => t._id === tecnico)?.nombre === a.tecnico)
      .map((a) => ({
        MET: a.id, Cliente: a.cliente, Tecnico: a.tecnico,
        FechaAsignacion: a.fechaAsignacion, EstatusCalidad: a.statusCalidad,
      }));

    exportCsv(filas, modo === "tecnico"
      ? `calidad_certificados_${anio || "todos"}.csv`
      : `calidad_certificados_general_${anio || "todos"}.csv`);
    cerrar();
  };

  return (
    <Dialog open={open} onClose={cerrar} fullWidth maxWidth="xs">
      <DialogTitle>Exportar certificados de Calidad</DialogTitle>
      <DialogContent>
        <FormControl size="small" fullWidth sx={{ mb: 2, mt: 0.5 }}>
          <InputLabel>Tipo de exportación</InputLabel>
          <Select label="Tipo de exportación" value={modo} onChange={(e) => setModo(e.target.value)} sx={{ borderRadius: 2 }}>
            <MenuItem value="tecnico">Por técnico</MenuItem>
            <MenuItem value="general">General (por año)</MenuItem>
          </Select>
        </FormControl>

        {modo === "tecnico" && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mb: 1 }}>
            <FormControl size="small" fullWidth>
              <InputLabel>Técnico</InputLabel>
              <Select label="Técnico" value={tecnico} onChange={(e) => setTecnico(e.target.value)} sx={{ borderRadius: 2 }}>
                <MenuItem value="">Todos</MenuItem>
                {tecnicos.map((t) => <MenuItem key={t._id} value={t._id}>{t.nombre}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl size="small" fullWidth>
              <InputLabel>Mes</InputLabel>
              <Select label="Mes" value={mes} onChange={(e) => setMes(e.target.value)} sx={{ borderRadius: 2 }}>
                <MenuItem value="">Todos</MenuItem>
                {MESES.map((m, i) => <MenuItem key={m} value={i + 1}>{m}</MenuItem>)}
              </Select>
            </FormControl>
          </Box>
        )}

        <FormControl size="small" fullWidth>
          <InputLabel>Año</InputLabel>
          <Select label="Año" value={anio} onChange={(e) => setAnio(e.target.value)} sx={{ borderRadius: 2 }}>
            <MenuItem value="">Todos</MenuItem>
            {anios.map((a) => <MenuItem key={a} value={a}>{a}</MenuItem>)}
          </Select>
        </FormControl>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <AppButton variant="outlined" onClick={cerrar} sx={{ borderRadius: 2 }}>Cancelar</AppButton>
        <AppButton startIcon={<FileDownloadOutlinedIcon />} onClick={exportar} sx={{ borderRadius: 2 }}>
          Exportar
        </AppButton>
      </DialogActions>
    </Dialog>
  );
}

export default function CalidadPage() {
  const [exportarOpen, setExportarOpen] = useState(false);

  return (
    <Box>
      <PageHeader
        icon={<ScienceOutlinedIcon />}
        title="Calidad"
        subtitle="Certificados pendientes de aprobar por Calidad"
        actions={
          <AppButton
            variant="outlined"
            startIcon={<FileDownloadOutlinedIcon />}
            onClick={() => setExportarOpen(true)}
            sx={{ borderRadius: 2 }}
          >
            Exportar Excel
          </AppButton>
        }
      />

      <ConsultarTab />
      <ExportarDialog open={exportarOpen} onClose={() => setExportarOpen(false)} />
    </Box>
  );
}
