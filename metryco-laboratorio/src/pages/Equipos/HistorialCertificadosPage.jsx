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
import { listarEquipos } from "../../services/equipos";
import { listarPatrones } from "../../services/patrones";

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
          const venc = p.ultimaCalibracion?.vencimiento;
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
                  <Typography variant="body2" color="warning.main" fontWeight={600}>{p.ultimaCalibracion?.vencimiento}</Typography>
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
// Planta (id_interno del equipo), listado de certificados emitidos por equipo.
export default function HistorialCertificadosPage() {
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

  useEffect(() => {
    listarClientes({ pageSize: 200 })
      .then(({ items }) => setClientes(items))
      .catch(() => setClientes([]));
  }, []);

  useEffect(() => {
    setLoading(true);
    listarEquipos({ search: buscar, clienteId: clienteFiltro, page, pageSize: rowsPerPage })
      .then(({ items, total }) => { setItems(items); setTotal(total); })
      .catch(() => { setItems([]); setTotal(0); })
      .finally(() => setLoading(false));
  }, [buscar, clienteFiltro, page, rowsPerPage]);

  const columns = [
    { field: "idInterno", headerName: "ID Cliente" },
    { field: "cliente", headerName: "Cliente", renderCell: (row) => row.cliente?.nombre || "—" },
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
      items.map((e) => ({
        IDCliente: e.idInterno, Cliente: e.cliente?.nombre || "", Marca: e.marca, Modelo: e.modelo, Serie: e.serie,
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
            {total} equipos con certificados asociados
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
          onChange={(e) => setIdPlanta(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { setPage(0); setBuscar(idPlanta); } }}
          sx={{ width: 260, "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
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
