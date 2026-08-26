import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Typography, TextField, InputAdornment, IconButton,
  Chip, Tooltip, MenuItem, Select, FormControl, InputLabel,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import { DeleteOutlined as DeleteOutlineIcon } from "@mui/icons-material";

import AppButton from "../../shared/components/AppButton";
import AppTable from "../../shared/components/AppTable";
import ConfirmDialog from "../../shared/components/ConfirmDialog";
import { formatDate } from "../../shared/utils/formatDate";
import { MOCK } from "./mockData";

const STATUS_MAP = {
  activo:      { label: "Activo",          color: "success" },
  calibracion: { label: "En Calibración",  color: "warning" },
  baja:        { label: "Baja",            color: "error" },
  vencido:     { label: "Cal. Vencida",    color: "error" },
};

const today = new Date();
function diasParaVencer(fechaStr) {
  if (!fechaStr) return null;
  const diff = new Date(fechaStr) - today;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}


export default function EquiposPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [page, setPage] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const filtered = MOCK.filter((e) => {
    const matchSearch =
      e.codigo.toLowerCase().includes(search.toLowerCase()) ||
      e.descripcion.toLowerCase().includes(search.toLowerCase()) ||
      e.marca.toLowerCase().includes(search.toLowerCase()) ||
      e.serie.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "todos" || e.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const columns = [
    { field: "codigo",      headerName: "Código" },
    { field: "descripcion", headerName: "Descripción" },
    { field: "marca",       headerName: "Marca" },
    { field: "modelo",      headerName: "Modelo" },
    { field: "serie",       headerName: "No. Serie" },
    { field: "rango",       headerName: "Rango" },
    { field: "resolucion",  headerName: "Resolución" },
    {
      field: "proximaCal",
      headerName: "Próxima Cal.",
      renderCell: (row) => {
        const dias = diasParaVencer(row.proximaCal);
        const color = dias !== null && dias < 30 ? "error.main" : dias !== null && dias < 60 ? "warning.main" : "success.main";
        return (
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            {dias !== null && dias < 30 && <WarningAmberOutlinedIcon sx={{ fontSize: 14, color }} />}
            <Typography variant="body2" sx={{ color }}>{formatDate(row.proximaCal)}</Typography>
          </Box>
        );
      },
    },
    {
      field: "status",
      headerName: "Estado",
      renderCell: (row) => {
        const s = STATUS_MAP[row.status] ?? { label: row.status, color: "default" };
        return <Chip label={s.label} color={s.color} size="small" />;
      },
    },
    {
      field: "acciones",
      headerName: "Acciones",
      align: "center",
      renderCell: (row) => (
        <Box sx={{ display: "flex", gap: 0.5, justifyContent: "center" }}>
          <Tooltip title="Editar">
            <IconButton size="small" onClick={() => navigate(`/equipos/${row.id}/editar`)}>
              <EditOutlinedIcon fontSize="small" sx={{ color: "secondary.main" }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Dar de baja">
            <IconButton size="small" onClick={() => setDeleteTarget(row)}>
              <DeleteOutlineIcon fontSize="small" sx={{ color: "error.main" }} />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  const porVencer = MOCK.filter((e) => { const d = diasParaVencer(e.proximaCal); return d !== null && d < 30 && d >= 0; }).length;
  const vencidos  = MOCK.filter((e) => e.status === "vencido").length;

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Equipos de Medición</Typography>
          <Typography variant="body2" color="text.secondary">
            {filtered.length} de {MOCK.length} equipos
            {porVencer > 0 && <Box component="span" sx={{ color: "warning.main", fontWeight: 700 }}> · {porVencer} por vencer</Box>}
            {vencidos  > 0 && <Box component="span" sx={{ color: "error.main", fontWeight: 700 }}> · {vencidos} vencidos</Box>}
          </Typography>
        </Box>
        <AppButton startIcon={<AddIcon />} onClick={() => navigate("/equipos/nuevo")} sx={{ borderRadius: 2 }}>
          Alta de Equipo
        </AppButton>
      </Box>

      <Box sx={{ display: "flex", gap: 2, mb: 2, flexWrap: "wrap" }}>
        <TextField
          placeholder="Buscar por código, descripción, marca o serie..."
          size="small"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          sx={{ width: 400, "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" sx={{ color: "text.secondary" }} />
              </InputAdornment>
            ),
          }}
        />
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Estado</InputLabel>
          <Select label="Estado" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }} sx={{ borderRadius: 2 }}>
            <MenuItem value="todos">Todos</MenuItem>
            <MenuItem value="activo">Activo</MenuItem>
            <MenuItem value="calibracion">En Calibración</MenuItem>
            <MenuItem value="vencido">Cal. Vencida</MenuItem>
            <MenuItem value="baja">Baja</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <AppTable
        columns={columns}
        rows={filtered.slice(page * 10, page * 10 + 10)}
        totalCount={filtered.length}
        page={page}
        rowsPerPage={10}
        onPageChange={setPage}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Dar de baja equipo"
        message={`¿Deseas dar de baja el equipo "${deleteTarget?.descripcion}" (${deleteTarget?.codigo})?`}
        onConfirm={() => setDeleteTarget(null)}
        onCancel={() => setDeleteTarget(null)}
      />
    </Box>
  );
}
