import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, TextField, InputAdornment, IconButton,
  Tooltip, MenuItem, Select, FormControl, InputLabel, Button,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import QrCode2OutlinedIcon from "@mui/icons-material/QrCode2Outlined";

import AppButton from "../../shared/components/AppButton";
import AppTable from "../../shared/components/AppTable";
import PageHeader from "../../shared/components/PageHeader";
import EtiquetaEquipoDialog from "../../shared/components/EtiquetaEquipoDialog";
import PrecisionManufacturingOutlinedIcon from "@mui/icons-material/PrecisionManufacturingOutlined";
import { listarClientes } from "../../services/clientes";
import { listarEquipos, fetchQrEquipoBlob } from "../../services/equipos";

// Consultar Equipos = php/equipo_buscar.php: el equipo pertenece a un cliente
// (tabla `equipo`, campo empId). Certificado/Portada/Gráfica dependen de las
// asignaciones de calibración (aún no migradas), por eso van en Historial
// de Certificados, no aquí.
export default function EquiposPage() {
  const navigate = useNavigate();
  const [clientes, setClientes] = useState([]);
  const [clienteFiltro, setClienteFiltro] = useState("");
  const [search, setSearch] = useState("");
  const [buscar, setBuscar] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [etiquetaEquipo, setEtiquetaEquipo] = useState(null);

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
        <>
          <Tooltip title="Editar equipo">
            <IconButton size="small" onClick={() => navigate(`/equipos/${row._id}/editar`)}>
              <EditOutlinedIcon fontSize="small" sx={{ color: "secondary.main" }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Etiqueta / imprimir">
            <IconButton size="small" onClick={() => setEtiquetaEquipo(row)}>
              <QrCode2OutlinedIcon fontSize="small" sx={{ color: "primary.main" }} />
            </IconButton>
          </Tooltip>
        </>
      ),
    },
  ];

  return (
    <Box>
      <PageHeader
        icon={<PrecisionManufacturingOutlinedIcon />}
        title="Consultar Equipos"
        subtitle={`${total} equipos de clientes`}
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
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { setPage(0); setBuscar(search); } }}
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
        <Button variant="contained" onClick={() => { setPage(0); setBuscar(search); }} sx={{ borderRadius: 2 }}>Buscar</Button>
      </Box>

      <AppTable
        columns={columns}
        rows={items}
        totalCount={total}
        page={page}
        rowsPerPage={rowsPerPage}
        onPageChange={setPage}
        onRowsPerPageChange={(n) => { setRowsPerPage(n); setPage(0); }}
        loading={loading}
      />

      <EtiquetaEquipoDialog
        open={!!etiquetaEquipo}
        onClose={() => setEtiquetaEquipo(null)}
        item={etiquetaEquipo}
        tipo="equipo"
        fetchQr={fetchQrEquipoBlob}
      />
    </Box>
  );
}
