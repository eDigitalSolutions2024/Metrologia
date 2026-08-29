import { useEffect, useMemo, useState } from "react";
import {
  Box, Typography, MenuItem, Select, FormControl, InputLabel,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Chip, Tooltip, IconButton, Alert,
} from "@mui/material";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutlineOutlined";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import HistoryOutlinedIcon from "@mui/icons-material/HistoryOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";

import AppButton from "../../shared/components/AppButton";
import AppTable from "../../shared/components/AppTable";
import PageHeader from "../../shared/components/PageHeader";
import ScienceOutlinedIcon from "@mui/icons-material/ScienceOutlined";
import { formatDate } from "../../shared/utils/formatDate";
import { listarClientes } from "../../services/clientes";
import { obtenerDirectorio } from "../../services/usuarios";
import { exportCsv } from "../../shared/utils/exportCsv";
import { listarCalidad, cambiarEstadoAsignacion } from "../../services/reportes";
import { useNavigate } from "react-router-dom";

const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

const EST_CERT_LABEL = { sin_generar: "Pendiente", en_revision: "Pendiente", rechazado: "Rechazado" };

function RechazarDialog({ open, onClose, onConfirm }) {
  const [motivo, setMotivo] = useState("");
  const cerrar = () => { setMotivo(""); onClose(); };

  return (
    <Dialog open={open} onClose={cerrar} fullWidth maxWidth="xs">
      <DialogTitle>Rechazar certificado</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          Indica el motivo del rechazo. Quedará registrado en el historial y la calibración
          regresará a "Pendiente" para que el técnico la rehaga.
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
      <DialogTitle>Historial de rechazos — {asignacion?.equipo?.idInterno}</DialogTitle>
      <DialogContent>
        {(asignacion?.historialRechazos ?? []).length === 0 ? (
          <Typography variant="body2" color="text.secondary">Sin rechazos registrados.</Typography>
        ) : (
          asignacion.historialRechazos.slice().reverse().map((h, i) => (
            <Box key={i} sx={{ mb: 1.5, pb: 1.5, borderBottom: i < asignacion.historialRechazos.length - 1 ? 1 : 0, borderColor: "divider" }}>
              <Typography variant="caption" color="text.secondary">
                {formatDate(h.fecha)} · {h.usuario?.nombre || "—"}
              </Typography>
              <Typography variant="body2">{h.motivo}</Typography>
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
  const navigate = useNavigate();
  const [clientes, setClientes] = useState([]);
  const [clienteFiltro, setClienteFiltro] = useState("");
  const [asignaciones, setAsignaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rechazarTarget, setRechazarTarget] = useState(null);
  const [historialTarget, setHistorialTarget] = useState(null);
  const [page, setPage] = useState(0);

  const cargar = () => {
    setLoading(true);
    listarCalidad({ clienteId: clienteFiltro })
      .then(setAsignaciones)
      .catch(() => setError("No se pudo cargar la cola de Calidad."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    listarClientes({ pageSize: 200 }).then(({ items }) => setClientes(items)).catch(() => {});
  }, []);
  useEffect(() => { cargar(); setPage(0); }, [clienteFiltro]); // eslint-disable-line react-hooks/exhaustive-deps

  const autorizar = async (a) => {
    setError("");
    try {
      await cambiarEstadoAsignacion(a._id, { dominio: "certificado", valor: "autorizado" });
      cargar();
    } catch (e) {
      setError(e?.response?.data?.message || "No se pudo autorizar.");
    }
  };

  const confirmarRechazo = async (motivo) => {
    setError("");
    try {
      await cambiarEstadoAsignacion(rechazarTarget._id, { dominio: "certificado", valor: "rechazado", motivo });
      setRechazarTarget(null);
      cargar();
    } catch (e) {
      setError(e?.response?.data?.message || "No se pudo rechazar.");
    }
  };

  const columns = [
    { field: "reporte", headerName: "Reporte", renderCell: (a) => a.reporte?.folio || "—" },
    { field: "cliente", headerName: "Cliente", renderCell: (a) => a.reporte?.cliente?.nombre || "—" },
    { field: "fechaAsignacion", headerName: "Fecha Asignación", renderCell: (a) => formatDate(a.createdAt) },
    { field: "fechaCaptura", headerName: "Fecha Captura", renderCell: (a) => (a.fechaCalibracion ? formatDate(a.fechaCalibracion) : "—") },
    { field: "tecnico", headerName: "Técnico", renderCell: (a) => a.tecnicoEjecutor?.nombre || a.tecnicoAsignado?.nombre || "—" },
    { field: "idClienteInterno", headerName: "ID Cliente", renderCell: (a) => a.equipo?.idInterno || "—" },
    {
      field: "statusCalidad",
      headerName: "Estatus Calidad",
      renderCell: (a) =>
        a.estados?.certificado === "rechazado" ? (
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
            <Chip label="Rechazado" color="error" size="small" />
            <Tooltip title="Ver historial">
              <IconButton size="small" onClick={() => setHistorialTarget(a)}>
                <HistoryOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        ) : (
          <Chip label={EST_CERT_LABEL[a.estados?.certificado] || "Pendiente"} color="warning" size="small" />
        ),
    },
    {
      field: "accion",
      headerName: "Acción",
      align: "center",
      renderCell: (a) => (
        <Box sx={{ display: "flex", gap: 0.5, justifyContent: "center" }}>
          <Tooltip title="Ver reporte">
            <IconButton size="small" onClick={() => navigate(`/reportes/${a.reporte?._id}`)}>
              <VisibilityOutlinedIcon fontSize="small" sx={{ color: "secondary.main" }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Autorizar">
            <IconButton size="small" onClick={() => autorizar(a)}>
              <CheckCircleOutlineIcon fontSize="small" sx={{ color: "success.main" }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Rechazar">
            <IconButton size="small" onClick={() => setRechazarTarget(a)}>
              <CancelOutlinedIcon fontSize="small" sx={{ color: "error.main" }} />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  return (
    <Box>
      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError("")}>{error}</Alert>}
      <Box sx={{ display: "flex", gap: 2, mb: 2, alignItems: "center", flexWrap: "wrap" }}>
        <FormControl size="small" sx={{ minWidth: 280 }}>
          <InputLabel>Filtrar búsqueda por cliente</InputLabel>
          <Select
            label="Filtrar búsqueda por cliente"
            value={clienteFiltro}
            onChange={(e) => setClienteFiltro(e.target.value)}
            sx={{ borderRadius: 2 }}
          >
            <MenuItem value="">Todos los clientes</MenuItem>
            {clientes.map((c) => (
              <MenuItem key={c._id} value={c._id}>{c.nombre}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      <AppTable
        columns={columns}
        rows={asignaciones.slice(page * 10, page * 10 + 10)}
        loading={loading}
        totalCount={asignaciones.length}
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
  const [error, setError] = useState("");

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
    setModo("tecnico"); setTecnico(""); setMes(""); setAnio(""); setError("");
    onClose();
  };

  const exportar = async () => {
    setError("");
    try {
      const todas = await listarCalidad({});
      const filtradas = todas.filter((a) => {
        if (modo === "tecnico" && tecnico) {
          const nombreTec = tecnicos.find((t) => t._id === tecnico)?.nombre;
          const tecAsig = a.tecnicoEjecutor?.nombre || a.tecnicoAsignado?.nombre;
          if (tecAsig !== nombreTec) return false;
        }
        const fecha = a.fechaCalibracion ? new Date(a.fechaCalibracion) : new Date(a.createdAt);
        if (anio && fecha.getFullYear() !== Number(anio)) return false;
        if (modo === "tecnico" && mes && MESES[fecha.getMonth()] !== mes) return false;
        return true;
      });

      if (filtradas.length === 0) {
        setError("No hay resultados para esos filtros.");
        return;
      }

      exportCsv(
        filtradas.map((a) => ({
          Reporte: a.reporte?.folio || "",
          Cliente: a.reporte?.cliente?.nombre || "",
          Tecnico: a.tecnicoEjecutor?.nombre || a.tecnicoAsignado?.nombre || "",
          FechaAsignacion: formatDate(a.createdAt),
          EstatusCalidad: EST_CERT_LABEL[a.estados?.certificado] || a.estados?.certificado,
        })),
        modo === "tecnico" ? `calidad_certificados_${anio || "todos"}.csv` : `calidad_certificados_general_${anio || "todos"}.csv`
      );
      cerrar();
    } catch {
      setError("No se pudo exportar.");
    }
  };

  return (
    <Dialog open={open} onClose={cerrar} fullWidth maxWidth="xs">
      <DialogTitle>Exportar certificados de Calidad</DialogTitle>
      <DialogContent>
        {error && <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}
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
                {MESES.map((m) => <MenuItem key={m} value={m}>{m}</MenuItem>)}
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
