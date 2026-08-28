import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Typography, TextField, InputAdornment, IconButton,
  Tooltip, MenuItem, Select, FormControl, InputLabel, Button,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";

import AppButton from "../../shared/components/AppButton";
import AppTable from "../../shared/components/AppTable";
import PageHeader from "../../shared/components/PageHeader";
import PrecisionManufacturingOutlinedIcon from "@mui/icons-material/PrecisionManufacturingOutlined";
import { listarClientes } from "../../services/clientes";
import { EQUIPOS_MOCK } from "./mockData";

// Consultar Equipos = php/equipo_buscar.php: el equipo pertenece a un cliente
// (tabla `equipo`, campo empId). Certificado/Portada/Gráfica dependen de las
// asignaciones de calibración (aún no migradas), por eso van en Historial
// de Certificados, no aquí.
export default function EquiposPage() {
  const navigate = useNavigate();
  const [clientes, setClientes] = useState([]);
  const [clienteFiltro, setClienteFiltro] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  useEffect(() => {
    listarClientes({ pageSize: 200 })
      .then(({ items }) => setClientes(items))
      .catch(() => setClientes([]));
  }, []);

  const filtered = EQUIPOS_MOCK.filter((e) => {
    const matchCliente = !clienteFiltro || String(e.clienteId) === String(clienteFiltro);
    const term = search.toLowerCase();
    const matchSearch =
      !term ||
      e.idInterno.toLowerCase().includes(term) ||
      e.descripcion.toLowerCase().includes(term) ||
      e.marca.toLowerCase().includes(term) ||
      e.serie.toLowerCase().includes(term);
    return matchCliente && matchSearch;
  });

  const columns = [
    { field: "id", headerName: "MET" },
    { field: "clienteNombre", headerName: "Cliente" },
    { field: "idInterno", headerName: "ID Cliente" },
    { field: "descripcion", headerName: "Descripción" },
    { field: "marca", headerName: "Marca" },
    { field: "modelo", headerName: "Modelo" },
    { field: "serie", headerName: "Serie" },
    { field: "categoria", headerName: "Categoría" },
    { field: "rango", headerName: "Rango" },
    {
      field: "acciones",
      headerName: "Acciones",
      align: "center",
      renderCell: (row) => (
        <Tooltip title="Editar equipo">
          <IconButton size="small" onClick={() => navigate(`/equipos/${row.id}/editar`)}>
            <EditOutlinedIcon fontSize="small" sx={{ color: "secondary.main" }} />
          </IconButton>
        </Tooltip>
      ),
    },
  ];

  return (
    <Box>
      <PageHeader
        icon={<PrecisionManufacturingOutlinedIcon />}
        title="Consultar Equipos"
        subtitle={`${filtered.length} de ${EQUIPOS_MOCK.length} equipos de clientes`}
        actions={
          <AppButton startIcon={<AddIcon />} onClick={() => navigate("/equipos/nuevo")} sx={{ borderRadius: 2 }}>
            Alta de Equipo
          </AppButton>
        }
      />

      <Box sx={{ display: "flex", gap: 2, mb: 2, flexWrap: "wrap", alignItems: "center" }}>
        <TextField
          placeholder="Buscar por ID, descripción, marca o serie..."
          size="small"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          sx={{ width: 360, "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
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
        <Button variant="contained" onClick={() => setPage(0)} sx={{ borderRadius: 2 }}>Buscar</Button>
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
