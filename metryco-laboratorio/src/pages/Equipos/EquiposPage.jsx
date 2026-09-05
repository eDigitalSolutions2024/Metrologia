import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, TextField, InputAdornment, IconButton, Typography, Avatar,
  Tooltip, MenuItem, Select, FormControl, InputLabel, Button,
  Chip, Menu, ListItemIcon, ListItemText, Alert, FormControlLabel, Checkbox,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import QrCode2OutlinedIcon from "@mui/icons-material/QrCode2Outlined";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutlineOutlined";
import BlockOutlinedIcon from "@mui/icons-material/BlockOutlined";

import AppButton from "../../shared/components/AppButton";
import AppTable from "../../shared/components/AppTable";
import PageHeader from "../../shared/components/PageHeader";
import EtiquetaEquipoDialog from "../../shared/components/EtiquetaEquipoDialog";
import ConfirmDialog from "../../shared/components/ConfirmDialog";
import PrecisionManufacturingOutlinedIcon from "@mui/icons-material/PrecisionManufacturingOutlined";
import { listarClientes } from "../../services/clientes";
import { listarEquipos, fetchQrEquipoBlob, eliminarEquipo, reactivarEquipo } from "../../services/equipos";
import { iconoCategoria, colorCategoria } from "./categorias";

// Consultar Equipos = php/equipo_buscar.php: el equipo pertenece a un cliente
// (tabla `equipo`, campo empId). Certificado/Portada/Gráfica van en Historial
// de Certificados (con datos reales de Asignaciones/Certificados), no aquí.
export default function EquiposPage() {
  const navigate = useNavigate();
  const [clientes, setClientes] = useState([]);
  const [clienteFiltro, setClienteFiltro] = useState("");
  const [search, setSearch] = useState("");
  const [buscar, setBuscar] = useState("");
  const [incluirInactivos, setIncluirInactivos] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [etiquetaEquipo, setEtiquetaEquipo] = useState(null);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [menuRow, setMenuRow] = useState(null);
  const [bajaTarget, setBajaTarget] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    listarClientes({ pageSize: 200 })
      .then(({ items }) => setClientes(items))
      .catch(() => setClientes([]));
  }, []);

  const cargar = () => {
    setLoading(true);
    listarEquipos({ search: buscar, clienteId: clienteFiltro, incluirInactivos, page, pageSize: rowsPerPage })
      .then(({ items, total }) => { setItems(items); setTotal(total); })
      .catch(() => { setItems([]); setTotal(0); })
      .finally(() => setLoading(false));
  };
  useEffect(cargar, [buscar, clienteFiltro, incluirInactivos, page, rowsPerPage]);

  const abrirMenu = (e, row) => { setMenuAnchor(e.currentTarget); setMenuRow(row); };
  const cerrarMenu = () => { setMenuAnchor(null); setMenuRow(null); };

  const activar = async (row) => {
    setError("");
    try {
      await reactivarEquipo(row._id);
      cargar();
    } catch {
      setError("No se pudo activar el equipo. Intenta de nuevo.");
    }
  };

  const confirmarBaja = async () => {
    const target = bajaTarget;
    setBajaTarget(null);
    try {
      await eliminarEquipo(target._id);
      cargar();
    } catch {
      setError("No se pudo dar de baja el equipo. Intenta de nuevo.");
    }
  };

  const columns = [
    {
      field: "idInterno", headerName: "Equipo",
      renderCell: (row) => {
        const Icono = iconoCategoria(row.categoria);
        const color = colorCategoria(row.categoria);
        return (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
            <Avatar sx={{ width: 32, height: 32, bgcolor: `${color}1a`, color }}>
              <Icono fontSize="small" />
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body2" fontWeight={700} noWrap>{row.idInterno}</Typography>
              <Typography variant="caption" color="text.secondary" noWrap sx={{ display: "block" }}>{row.descripcion || "—"}</Typography>
            </Box>
          </Box>
        );
      },
    },
    { field: "cliente", headerName: "Cliente", renderCell: (row) => row.cliente?.nombre || "—" },
    { field: "marcaModelo", headerName: "Marca / Modelo", renderCell: (row) => [row.marca, row.modelo].filter(Boolean).join(" / ") || "—" },
    { field: "serie", headerName: "Serie" },
    {
      field: "categoria", headerName: "Categoría",
      renderCell: (row) => row.categoria
        ? <Chip size="small" variant="outlined" label={row.categoria} sx={{ borderColor: colorCategoria(row.categoria), color: colorCategoria(row.categoria) }} />
        : "—",
    },
    { field: "rango", headerName: "Rango" },
    {
      field: "status", headerName: "Estado",
      renderCell: (row) => (
        <Chip size="small" label={row.status === "activo" ? "Activo" : "Inactivo"} color={row.status === "activo" ? "success" : "default"} />
      ),
    },
    {
      field: "acciones",
      headerName: "Acciones",
      align: "center",
      renderCell: (row) => (
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", flexWrap: "nowrap" }}>
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
          <Tooltip title="Más opciones">
            <IconButton size="small" onClick={(e) => abrirMenu(e, row)}>
              <MoreVertIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
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
        <FormControlLabel
          control={<Checkbox checked={incluirInactivos} onChange={(e) => { setIncluirInactivos(e.target.checked); setPage(0); }} />}
          label="Mostrar dados de baja"
        />
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError("")}>{error}</Alert>}

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

      <ConfirmDialog
        open={!!bajaTarget}
        title="Dar de baja el equipo"
        message={`¿Deseas dar de baja "${bajaTarget?.idInterno}"? Deja de aparecer disponible para asignar en nuevos reportes, pero conserva su historial de calibraciones.`}
        confirmLabel="Dar de baja"
        onConfirm={confirmarBaja}
        onCancel={() => setBajaTarget(null)}
      />

      <Menu
        anchorEl={menuAnchor}
        open={!!menuAnchor}
        onClose={cerrarMenu}
        slotProps={{ paper: { sx: { borderRadius: 2, minWidth: 200 } } }}
      >
        {menuRow?.status === "inactivo" ? (
          <MenuItem onClick={() => { activar(menuRow); cerrarMenu(); }}>
            <ListItemIcon>
              <CheckCircleOutlineIcon fontSize="small" sx={{ color: "success.main" }} />
            </ListItemIcon>
            <ListItemText>Activar</ListItemText>
          </MenuItem>
        ) : (
          <MenuItem onClick={() => { setBajaTarget(menuRow); cerrarMenu(); }}>
            <ListItemIcon>
              <BlockOutlinedIcon fontSize="small" sx={{ color: "error.main" }} />
            </ListItemIcon>
            <ListItemText>Dar de baja</ListItemText>
          </MenuItem>
        )}
      </Menu>
    </Box>
  );
}
