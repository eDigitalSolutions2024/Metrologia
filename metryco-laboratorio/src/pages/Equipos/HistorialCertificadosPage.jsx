import { useEffect, useState } from "react";
import {
  Box, Typography, TextField, MenuItem, Select, FormControl, InputLabel,
  Button, Dialog, DialogTitle, DialogContent, DialogActions, Alert, IconButton, Tooltip,
} from "@mui/material";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import NotificationsActiveOutlinedIcon from "@mui/icons-material/NotificationsActiveOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import InsertChartOutlinedIcon from "@mui/icons-material/InsertChartOutlined";

import AppButton from "../../shared/components/AppButton";
import AppTable from "../../shared/components/AppTable";
import { listarClientes } from "../../services/clientes";
import { exportCsv } from "../../shared/utils/exportCsv";
import { EQUIPOS_MOCK, PATRONES_MOCK } from "./mockData";

function VencimientoAutomaticoDialog({ open, onClose }) {
  const [confirmado, setConfirmado] = useState(false);

  const cerrar = () => { setConfirmado(false); onClose(); };

  // Patrones cuya fecha de vencimiento cae dentro de los próximos 30 días:
  // son los que el job de correos automáticos (automatic/due_date_certificate.php
  // en el legacy) notificaría. Aquí no hay backend de correo todavía, así que se
  // muestra la vista previa en vez de simular un envío que no ocurrió de verdad.
  const proximosAVencer = PATRONES_MOCK.filter((p) => {
    const dias = Math.ceil((new Date(p.fechaVencimiento) - new Date()) / 86400000);
    return dias >= 0 && dias < 30;
  });

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
                <Box key={p.id} sx={{ display: "flex", justifyContent: "space-between", py: 0.75, borderBottom: 1, borderColor: "divider" }}>
                  <Typography variant="body2">{p.idInterno} — {p.descripcion}</Typography>
                  <Typography variant="body2" color="warning.main" fontWeight={600}>{p.fechaVencimiento}</Typography>
                </Box>
              ))
            )}
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <AppButton variant="outlined" onClick={cerrar} sx={{ borderRadius: 2 }}>Cerrar</AppButton>
        {!confirmado && (
          <AppButton onClick={() => setConfirmado(true)} sx={{ borderRadius: 2 }}>Confirmar</AppButton>
        )}
      </DialogActions>
    </Dialog>
  );
}

// Refleja php/historial_certificados_buscar.php: filtro por Cliente o por ID
// Planta (id_interno del equipo), listado de certificados emitidos por equipo.
export default function HistorialCertificadosPage() {
  const [clientes, setClientes] = useState([]);
  const [clienteFiltro, setClienteFiltro] = useState("");
  const [idPlanta, setIdPlanta] = useState("");
  const [page, setPage] = useState(0);
  const [vencimientoOpen, setVencimientoOpen] = useState(false);

  useEffect(() => {
    listarClientes({ pageSize: 200 })
      .then(({ items }) => setClientes(items))
      .catch(() => setClientes([]));
  }, []);

  const filtered = EQUIPOS_MOCK.filter((e) => {
    const matchCliente = !clienteFiltro || String(e.clienteId) === String(clienteFiltro);
    const matchPlanta = !idPlanta || e.idInterno.toLowerCase().includes(idPlanta.toLowerCase());
    return matchCliente && matchPlanta;
  });

  const columns = [
    { field: "id", headerName: "Equipo" },
    { field: "clienteNombre", headerName: "Cliente" },
    { field: "idInterno", headerName: "ID Cliente" },
    { field: "marca", headerName: "Marca" },
    { field: "modelo", headerName: "Modelo" },
    { field: "serie", headerName: "Serie" },
    {
      field: "editarPortada",
      headerName: "Editar Portada",
      align: "center",
      renderCell: () => (
        <Tooltip title="Editar portada (requiere asignación de calibración)">
          <span><IconButton size="small" disabled><EditOutlinedIcon fontSize="small" /></IconButton></span>
        </Tooltip>
      ),
    },
    {
      field: "portada",
      headerName: "Portada",
      align: "center",
      renderCell: () => (
        <Tooltip title="Disponible cuando exista la asignación de calibración">
          <span><IconButton size="small" disabled><DescriptionOutlinedIcon fontSize="small" /></IconButton></span>
        </Tooltip>
      ),
    },
    {
      field: "grafica",
      headerName: "Gráfica",
      align: "center",
      renderCell: () => (
        <Tooltip title="Disponible cuando exista la asignación de calibración">
          <span><IconButton size="small" disabled><InsertChartOutlinedIcon fontSize="small" /></IconButton></span>
        </Tooltip>
      ),
    },
  ];

  const exportarCertificados = () => {
    exportCsv(
      filtered.map((e) => ({
        Equipo: e.id, Cliente: e.clienteNombre, IDCliente: e.idInterno,
        Marca: e.marca, Modelo: e.modelo, Serie: e.serie,
      })),
      "historial_certificados.csv"
    );
  };

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 3, flexWrap: "wrap", gap: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Historial de Certificados</Typography>
          <Typography variant="body2" color="text.secondary">
            {filtered.length} equipos con certificados asociados
          </Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 1.5 }}>
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
        </Box>
      </Box>

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
          label="ID Cliente (Historial Certificados)"
          size="small"
          value={idPlanta}
          onChange={(e) => { setIdPlanta(e.target.value); setPage(0); }}
          sx={{ width: 260, "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
        />
        <Button variant="contained" onClick={() => setPage(0)} sx={{ borderRadius: 2 }}>Buscar</Button>
      </Box>

      <AppTable
        columns={columns}
        rows={filtered.slice(page * 10, page * 10 + 10)}
        totalCount={filtered.length}
        page={page}
        rowsPerPage={10}
        onPageChange={setPage}
        emptyText="Sin certificados para este filtro"
      />

      <VencimientoAutomaticoDialog open={vencimientoOpen} onClose={() => setVencimientoOpen(false)} />
    </Box>
  );
}
