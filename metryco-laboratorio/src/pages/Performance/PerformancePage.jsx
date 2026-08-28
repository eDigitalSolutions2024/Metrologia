import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Typography, TextField, InputAdornment, IconButton, Tooltip, Chip } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";

import AppButton from "../../shared/components/AppButton";
import AppTable from "../../shared/components/AppTable";
import PageHeader from "../../shared/components/PageHeader";
import SpeedOutlinedIcon from "@mui/icons-material/SpeedOutlined";
import { MOCK } from "./mockData";

// Consultar Performance = php/performance_buscar.php.
export default function PerformancePage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  const filtered = MOCK.filter((p) => {
    const term = search.toLowerCase();
    return !term || p.nombre.toLowerCase().includes(term) || p.comentarios.toLowerCase().includes(term);
  });

  const columns = [
    { field: "id", headerName: "Id" },
    { field: "nombre", headerName: "Nombre" },
    { field: "comentarios", headerName: "Comentarios" },
    {
      field: "puntos",
      headerName: "Puntos de Prueba",
      renderCell: (row) => <Chip label={`${row.puntos.length} puntos`} size="small" variant="outlined" />,
    },
    {
      field: "acciones",
      headerName: "Acciones",
      align: "center",
      renderCell: (row) => (
        <Tooltip title="Editar performance">
          <IconButton size="small" onClick={() => navigate(`/performance/${row.id}/editar`)}>
            <EditOutlinedIcon fontSize="small" sx={{ color: "secondary.main" }} />
          </IconButton>
        </Tooltip>
      ),
    },
  ];

  return (
    <Box>
      <PageHeader
        icon={<SpeedOutlinedIcon />}
        title="Performance"
        subtitle={`${MOCK.length} plantillas de puntos de prueba para calibración`}
        actions={
          <AppButton startIcon={<AddIcon />} onClick={() => navigate("/performance/nuevo")} sx={{ borderRadius: 2 }}>
            Nuevo Performance
          </AppButton>
        }
      />

      <Box sx={{ mb: 2 }}>
        <TextField
          placeholder="Buscar por nombre o comentarios..."
          size="small"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          sx={{ width: 380, "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" sx={{ color: "text.secondary" }} />
                </InputAdornment>
              ),
            },
          }}
        />
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
