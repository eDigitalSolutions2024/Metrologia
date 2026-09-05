import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Typography, TextField, MenuItem, Select, FormControl, InputLabel, Grid,
  Button, Dialog, DialogTitle, DialogContent, DialogActions, Alert, IconButton, Tooltip, Chip, Avatar,
} from "@mui/material";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import NotificationsActiveOutlinedIcon from "@mui/icons-material/NotificationsActiveOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import InsertChartOutlinedIcon from "@mui/icons-material/InsertChartOutlined";
import HistoryOutlinedIcon from "@mui/icons-material/HistoryOutlined";
import VerifiedOutlinedIcon from "@mui/icons-material/VerifiedOutlined";
import ScheduleOutlinedIcon from "@mui/icons-material/ScheduleOutlined";
import ReportGmailerrorredOutlinedIcon from "@mui/icons-material/ReportGmailerrorredOutlined";

import AppButton from "../../shared/components/AppButton";
import AppTable from "../../shared/components/AppTable";
import PageHeader from "../../shared/components/PageHeader";
import StatCard from "../../shared/components/StatCard";
import { listarClientes } from "../../services/clientes";
import { exportCsv } from "../../shared/utils/exportCsv";
import { listarPatrones } from "../../services/patrones";
import { listarCertificados } from "../../services/certificados";
import { fetchGraficaAsignacionBlob } from "../../services/reportes";
import { formatDate } from "../../shared/utils/formatDate";
import { iconoCategoria, colorCategoria } from "./categorias";

const ESTADO_MAP = {
  vigente: { label: "Vigente", color: "success" },
  por_vencer: { label: "Por vencer", color: "warning" },
  vencido: { label: "Vencido", color: "error" },
  anulado: { label: "Anulado", color: "default" },
  borrador: { label: "Borrador", color: "info" },
};

function VencimientoAutomaticoDialog({ open, onClose }) {
  const [confirmado, setConfirmado] = useState(false);
  const [proximosAVencer, setProximosAVencer] = useState([]);

  const cerrar = () => { setConfirmado(false); onClose(); };

  // Patrones cuya fecha de vencimiento cae dentro de los próximos 30 días:
  // son los que el job de correos automáticos (automatic/due_date_certificate.php
  // en el legacy) notificaría. Aquí no hay backend de correo todavía, así que se
  // muestra la vista previa en vez de simular un envío que no ocurrió de verdad.
  const confirmar = () => {
    setConfirmado(true);
    listarPatrones({ pageSize: 500 })
      .then(({ items }) => {
        const dentroDeRango = items.filter((p) => {
          const venc = p.calibracion?.vencimiento || p.ultimaCalibracion?.vencimiento;
          if (!venc) return false;
          const dias = Math.ceil((new Date(venc) - new Date()) / 86400000);
          return dias >= 0 && dias < 30;
        });
        setProximosAVencer(dentroDeRango);
      })
      .catch(() => setProximosAVencer([]));
  };

  return (
    <Dialog open={open} onClose={cerrar} fullWidth maxWidth="sm">
      <DialogTitle>Vencimiento Automático</DialogTitle>
      <DialogContent>
        {!confirmado ? (
          <Typography variant="body2">
            ¿Seguro que deseas correr la revisión de vencimientos y generar la lista de correos a enviar?
          </Typography>
        ) : (
          <>
            <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
              Aún no hay backend de envío de correos (pendiente: node-cron). Esta es la vista previa de lo
              que se notificaría — patrones que vencen en los próximos 30 días.
            </Alert>
            {proximosAVencer.length === 0 ? (
              <Typography variant="body2" color="text.secondary">No hay patrones por vencer en los próximos 30 días.</Typography>
            ) : (
              proximosAVencer.map((p) => (
                <Box key={p._id} sx={{ display: "flex", justifyContent: "space-between", py: 0.75, borderBottom: 1, borderColor: "divider" }}>
                  <Typography variant="body2">{p.codigo} — {p.descripcion}</Typography>
                  <Typography variant="body2" color="warning.main" fontWeight={600}>{p.calibracion?.vencimiento || p.ultimaCalibracion?.vencimiento}</Typography>
                </Box>
              ))
            )}
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <AppButton variant="outlined" onClick={cerrar} sx={{ borderRadius: 2 }}>Cerrar</AppButton>
        {!confirmado && (
          <AppButton onClick={confirmar} sx={{ borderRadius: 2 }}>Confirmar</AppButton>
        )}
      </DialogActions>
    </Dialog>
  );
}

// Refleja php/historial_certificados_buscar.php: filtro por Cliente o por ID
// Planta (id_interno del equipo), listado de CERTIFICADOS emitidos (uno o
// varios por equipo a lo largo del tiempo).
export default function HistorialCertificadosPage() {
  const navigate = useNavigate();
  const [clientes, setClientes] = useState([]);
  const [clienteFiltro, setClienteFiltro] = useState("");
  const [idPlanta, setIdPlanta] = useState("");
  const [buscar, setBuscar] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [vencimientoOpen, setVencimientoOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    listarClientes({ pageSize: 200 })
      .then(({ items }) => setClientes(items))
      .catch(() => setClientes([]));
  }, []);

  useEffect(() => {
    setLoading(true);
    listarCertificados({ search: buscar, clienteId: clienteFiltro, page, pageSize: rowsPerPage })
      .then(({ items, total }) => { setItems(items); setTotal(total); })
      .catch(() => { setItems([]); setTotal(0); })
      .finally(() => setLoading(false));
  }, [buscar, clienteFiltro, page, rowsPerPage]);

  const cuenta = (estado) => items.filter((c) => (c.estadoEfectivo || c.estado) === estado).length;

  const descargarGrafica = async (cert) => {
    setError("");
    try {
      const blob = await fetchGraficaAsignacionBlob(cert.asignacion);
      const url = URL.createObjectURL(blob);
      const el = document.createElement("a");
      el.href = url; el.download = `grafica-${cert.folio}`;
      el.click();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch {
      setError("Ese certificado no tiene gráfica adjunta.");
    }
  };

  const columns = [
    {
      field: "folio", headerName: "Certificado",
      renderCell: (c) => {
        const Icono = iconoCategoria(c.equipoSnapshot?.categoria);
        const color = colorCategoria(c.equipoSnapshot?.categoria);
        return (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
            <Avatar sx={{ width: 32, height: 32, bgcolor: `${color}1a`, color }}>
              <Icono fontSize="small" />
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body2" fontWeight={700} noWrap>{c.folio}</Typography>
              <Typography variant="caption" color="text.secondary" noWrap sx={{ display: "block" }}>
                {c.equipoSnapshot?.idInterno || "—"} · {c.equipoSnapshot?.descripcion || "—"}
              </Typography>
            </Box>
          </Box>
        );
      },
    },
    { field: "cliente", headerName: "Cliente", renderCell: (c) => c.cliente?.nombre || c.clienteSnapshot?.nombre || "—" },
    { field: "marcaModelo", headerName: "Marca / Modelo", renderCell: (c) => [c.equipoSnapshot?.marca, c.equipoSnapshot?.modelo].filter(Boolean).join(" / ") || "—" },
    { field: "serie", headerName: "Serie", renderCell: (c) => c.equipoSnapshot?.serie || "—" },
    { field: "fecha", headerName: "Fecha Calibración", renderCell: (c) => formatDate(c.fechaCalibracion) },
    {
      field: "estado", headerName: "Estado",
      renderCell: (c) => {
        const e = ESTADO_MAP[c.estadoEfectivo || c.estado] || ESTADO_MAP.borrador;
        return <Chip size="small" label={e.label} color={e.color} />;
      },
    },
    {
      field: "acciones",
      headerName: "Acciones",
      align: "center",
      renderCell: (c) => (
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", flexWrap: "nowrap" }}>
          <Tooltip title={c.reporte ? "Editar en el reporte de origen" : "Sin reporte ligado"}>
            <span>
              <IconButton
                size="small"
                disabled={!c.reporte}
                onClick={() => navigate(`/reportes/${c.reporte?._id || c.reporte}`)}
              >
                <EditOutlinedIcon fontSize="small" sx={{ color: "secondary.main" }} />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Ver / descargar certificado (Portada)">
            <IconButton size="small" onClick={() => window.open(`/informe/certificado/${c._id}`, "_blank")}>
              <DescriptionOutlinedIcon fontSize="small" sx={{ color: "primary.main" }} />
            </IconButton>
          </Tooltip>
          <Tooltip title={c.asignacion ? "Descargar gráfica adjunta" : "Sin asignación ligada"}>
            <span>
              <IconButton size="small" disabled={!c.asignacion} onClick={() => descargarGrafica(c)}>
                <InsertChartOutlinedIcon fontSize="small" sx={{ color: "primary.main" }} />
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      ),
    },
  ];

  const exportarCertificados = () => {
    exportCsv(
      items.map((c) => ({
        Certificado: c.folio,
        IDCliente: c.equipoSnapshot?.idInterno || "",
        Cliente: c.cliente?.nombre || c.clienteSnapshot?.nombre || "",
        Marca: c.equipoSnapshot?.marca || "",
        Modelo: c.equipoSnapshot?.modelo || "",
        Serie: c.equipoSnapshot?.serie || "",
        FechaCalibracion: c.fechaCalibracion ? formatDate(c.fechaCalibracion) : "",
        Estado: c.estadoEfectivo || c.estado,
      })),
      "historial_certificados.csv"
    );
  };

  return (
    <Box>
      <PageHeader
        icon={<HistoryOutlinedIcon />}
        title="Historial de Certificados"
        subtitle={`${total} certificados emitidos`}
        actions={
          <>
            <AppButton
              variant="outlined"
              startIcon={<NotificationsActiveOutlinedIcon />}
              onClick={() => setVencimientoOpen(true)}
              sx={{ borderRadius: 2 }}
            >
              Vencimiento Automático
            </AppButton>
            <AppButton startIcon={<FileDownloadOutlinedIcon />} onClick={exportarCertificados} sx={{ borderRadius: 2 }}>
              Exportar Excel Certificados
            </AppButton>
          </>
        }
      />

      <Grid container spacing={2.5} sx={{ mb: 3.5 }}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <StatCard label="Vigentes (página)" value={cuenta("vigente")} icon={<VerifiedOutlinedIcon />} color="#16A34A" />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <StatCard label="Por vencer" value={cuenta("por_vencer")} icon={<ScheduleOutlinedIcon />} color="#D97706" />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <StatCard label="Vencidos" value={cuenta("vencido")} icon={<ReportGmailerrorredOutlinedIcon />} color="#DC2626" />
        </Grid>
      </Grid>

      {error && <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError("")}>{error}</Alert>}

      <Box sx={{ display: "flex", gap: 2, mb: 2, flexWrap: "wrap", alignItems: "center" }}>
        <FormControl size="small" sx={{ minWidth: 260 }}>
          <InputLabel>Filtrar búsqueda por cliente</InputLabel>
          <Select
            label="Filtrar búsqueda por cliente"
            value={clienteFiltro}
            onChange={(e) => { setClienteFiltro(e.target.value); setPage(0); }}
            sx={{ borderRadius: 2 }}
          >
            <MenuItem value="">Todos los clientes</MenuItem>
            {clientes.map((c) => <MenuItem key={c._id} value={c._id}>{c.nombre}</MenuItem>)}
          </Select>
        </FormControl>
        <TextField
          label="ID Cliente / folio"
          size="small"
          value={idPlanta}
          onChange={(e) => setIdPlanta(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { setPage(0); setBuscar(idPlanta); } }}
          sx={{ width: 280, "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
        />
        <Button variant="contained" onClick={() => { setPage(0); setBuscar(idPlanta); }} sx={{ borderRadius: 2 }}>Buscar</Button>
      </Box>

      <AppTable
        columns={columns}
        rows={items}
        loading={loading}
        totalCount={total}
        page={page}
        rowsPerPage={rowsPerPage}
        onPageChange={setPage}
        onRowsPerPageChange={(n) => { setRowsPerPage(n); setPage(0); }}
        emptyText="Sin certificados para este filtro"
      />

      <VencimientoAutomaticoDialog open={vencimientoOpen} onClose={() => setVencimientoOpen(false)} />
    </Box>
  );
}
