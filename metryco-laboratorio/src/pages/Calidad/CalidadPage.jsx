import { useState } from "react";
import {
  Box, Typography, TextField, InputAdornment, IconButton,
  Chip, Tooltip, MenuItem, Select, FormControl, InputLabel,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";

import AppButton from "../../shared/components/AppButton";
import AppTable from "../../shared/components/AppTable";
import { formatDate } from "../../shared/utils/formatDate";
import { MOCK } from "./mockData";

const TIPO_MAP = {
  procedimiento: { label: "Procedimiento",       color: "primary" },
  instruccion:   { label: "Instrucción de Trab.", color: "info" },
  politica:      { label: "Política",             color: "secondary" },
  formato:       { label: "Formato",              color: "default" },
  manual:        { label: "Manual",               color: "error" },
};


export default function CalidadPage() {
  const [search, setSearch] = useState("");
  const [tipoFilter, setTipoFilter] = useState("todos");
  const [page, setPage] = useState(0);

  const filtered = MOCK.filter((d) => {
    const matchSearch =
      d.codigo.toLowerCase().includes(search.toLowerCase()) ||
      d.titulo.toLowerCase().includes(search.toLowerCase()) ||
      d.responsable.toLowerCase().includes(search.toLowerCase());
    const matchTipo = tipoFilter === "todos" || d.tipo === tipoFilter;
    return matchSearch && matchTipo;
  });

  const columns = [
    { field: "codigo",      headerName: "Código" },
    { field: "titulo",      headerName: "Título del Documento" },
    {
      field: "tipo",
      headerName: "Tipo",
      renderCell: (row) => {
        const t = TIPO_MAP[row.tipo] ?? { label: row.tipo, color: "default" };
        return <Chip label={t.label} color={t.color} size="small" variant="outlined" />;
      },
    },
    { field: "revision",    headerName: "Rev.", align: "center" },
    { field: "fecha",       headerName: "Fecha",        renderCell: (row) => formatDate(row.fecha) },
    { field: "responsable", headerName: "Responsable" },
    {
      field: "status",
      headerName: "Estado",
      renderCell: (row) => (
        <Chip
          label={row.status === "vigente" ? "Vigente" : "En Revisión"}
          color={row.status === "vigente" ? "success" : "warning"}
          size="small"
        />
      ),
    },
    {
      field: "acciones",
      headerName: "Acciones",
      align: "center",
      renderCell: () => (
        <Box sx={{ display: "flex", gap: 0.5, justifyContent: "center" }}>
          <Tooltip title="Ver documento">
            <IconButton size="small">
              <VisibilityOutlinedIcon fontSize="small" sx={{ color: "secondary.main" }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Descargar">
            <IconButton size="small">
              <FileDownloadOutlinedIcon fontSize="small" sx={{ color: "success.main" }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Editar">
            <IconButton size="small">
              <EditOutlinedIcon fontSize="small" sx={{ color: "warning.main" }} />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Control de Documentos</Typography>
          <Typography variant="body2" color="text.secondary">
            {filtered.length} de {MOCK.length} documentos del SGC
          </Typography>
        </Box>
        <AppButton startIcon={<AddIcon />} sx={{ borderRadius: 2 }}>Nuevo Documento</AppButton>
      </Box>

      <Box sx={{ display: "flex", gap: 2, mb: 2, flexWrap: "wrap" }}>
        <TextField
          placeholder="Buscar por código, título o responsable..."
          size="small"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          sx={{ width: 380, "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" sx={{ color: "text.secondary" }} />
              </InputAdornment>
            ),
          }}
        />
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Tipo de documento</InputLabel>
          <Select label="Tipo de documento" value={tipoFilter} onChange={(e) => { setTipoFilter(e.target.value); setPage(0); }} sx={{ borderRadius: 2 }}>
            <MenuItem value="todos">Todos los tipos</MenuItem>
            <MenuItem value="manual">Manual</MenuItem>
            <MenuItem value="procedimiento">Procedimiento</MenuItem>
            <MenuItem value="instruccion">Instrucción de Trabajo</MenuItem>
            <MenuItem value="politica">Política</MenuItem>
            <MenuItem value="formato">Formato</MenuItem>
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
    </Box>
  );
}
