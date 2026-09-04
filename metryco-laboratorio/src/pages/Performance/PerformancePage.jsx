import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, TextField, InputAdornment, IconButton, Tooltip, Chip } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";

import AppButton from "../../shared/components/AppButton";
import AppTable from "../../shared/components/AppTable";
import PageHeader from "../../shared/components/PageHeader";
import SpeedOutlinedIcon from "@mui/icons-material/SpeedOutlined";
import { listarPerformance } from "../../services/performance";

// Consultar Performance = php/performance_buscar.php.
export default function PerformancePage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [buscar, setBuscar] = useState("");
  const [page, setPage] = useState(0);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    listarPerformance({ search: buscar, page, pageSize: 10 })
      .then(({ items, total }) => { setItems(items); setTotal(total); })
      .catch(() => { setItems([]); setTotal(0); })
      .finally(() => setLoading(false));
  }, [buscar, page]);

  const columns = [
    { field: "nombre", headerName: "Nombre" },
    { field: "comentarios", headerName: "Comentarios" },
    {
      field: "puntos",
      headerName: "Puntos de Prueba",
      renderCell: (row) => <Chip label={`${row.puntos?.length ?? 0} puntos`} size="small" variant="outlined" />,
    },
    {
      field: "acciones",
      headerName: "Acciones",
      align: "center",
      renderCell: (row) => (
        <Tooltip title="Editar performance">
          <IconButton size="small" onClick={() => navigate(`/performance/${row._id}/editar`)}>
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
        subtitle={`${total} plantillas de puntos de prueba para calibración`}
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
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { setPage(0); setBuscar(search); } }}
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
        rows={items}
        totalCount={total}
        page={page}
        rowsPerPage={10}
        onPageChange={setPage}
        loading={loading}
      />
    </Box>
  );
}
