import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Typography, TextField, InputAdornment, IconButton,
  Chip, Tooltip, MenuItem, Select, FormControl, InputLabel, Alert,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import ToggleOnIcon from "@mui/icons-material/ToggleOn";
import ToggleOffOutlinedIcon from "@mui/icons-material/ToggleOffOutlined";
import { DeleteOutlined as DeleteOutlineIcon } from "@mui/icons-material";

import AppButton from "../../shared/components/AppButton";
import AppTable from "../../shared/components/AppTable";
import PageHeader from "../../shared/components/PageHeader";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";
import ConfirmDialog from "../../shared/components/ConfirmDialog";
import PasswordConfirmDialog from "../../shared/components/PasswordConfirmDialog";
import { listarClientes, actualizarCliente, eliminarCliente } from "../../services/clientes";
import { useDebounce } from "../../shared/hooks/useDebounce";
import { SECTORES, SECTOR_MAP } from "../../shared/constants/sectores";

export default function ClientesPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [sectorFilter, setSectorFilter] = useState("todos");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [toggleTarget, setToggleTarget] = useState(null);

  const [rows, setRows] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const debouncedSearch = useDebounce(search, 400);

  // Reinicia la página cuando cambian los filtros, sin pasar por un efecto
  // (patrón recomendado por React para "ajustar estado cuando cambia una prop/dep")
  const [prevFiltros, setPrevFiltros] = useState([debouncedSearch, sectorFilter]);
  if (prevFiltros[0] !== debouncedSearch || prevFiltros[1] !== sectorFilter) {
    setPrevFiltros([debouncedSearch, sectorFilter]);
    setPage(0);
  }

  useEffect(() => {
    let cancelado = false;

    (async () => {
      setLoading(true);
      setError("");
      try {
        const { items, total } = await listarClientes({
          search: debouncedSearch,
          sector: sectorFilter,
          page,
          pageSize: rowsPerPage,
        });
        if (cancelado) return;
        setRows(items.map((c) => ({ ...c, id: c._id })));
        setTotalCount(total);
      } catch {
        if (!cancelado) setError("No se pudieron cargar los clientes. Intenta de nuevo.");
      } finally {
        if (!cancelado) setLoading(false);
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [debouncedSearch, sectorFilter, page, rowsPerPage, reloadKey]);

  const handleEliminar = async () => {
    const target = deleteTarget;
    await eliminarCliente(target.id);
    setDeleteTarget(null);
    setReloadKey((k) => k + 1);
  };

  const handleToggleEstado = async () => {
    const target = toggleTarget;
    setToggleTarget(null);
    const nuevoStatus = target.status === "activo" ? "inactivo" : "activo";
    try {
      await actualizarCliente(target.id, { status: nuevoStatus });
      setReloadKey((k) => k + 1);
    } catch {
      setError("No se pudo actualizar el estado del cliente. Intenta de nuevo.");
    }
  };

  const columns = [
    { field: "nombre",   headerName: "Razón Social" },
    { field: "rfc",      headerName: "RFC" },
    { field: "contacto", headerName: "Contacto", renderCell: (row) => row.contacto?.nombre || "—" },
    { field: "telefono", headerName: "Teléfono", renderCell: (row) => row.contacto?.telefono || "—" },
    { field: "email",    headerName: "Correo", renderCell: (row) => row.contacto?.emailCotizaciones || "—" },
    { field: "ciudad",   headerName: "Ciudad", renderCell: (row) => row.domicilioFiscal?.ciudad || "—" },
    {
      field: "sector",
      headerName: "Sector",
      renderCell: (row) => {
        const s = SECTOR_MAP[row.sector] ?? { label: row.sector || "—", color: "default" };
        return <Chip label={s.label} color={s.color} size="small" variant="outlined" />;
      },
    },
    {
      field: "status",
      headerName: "Estado",
      renderCell: (row) => (
        <Chip
          label={row.status === "activo" ? "Activo" : "Inactivo"}
          color={row.status === "activo" ? "success" : "default"}
          size="small"
        />
      ),
    },
    {
      field: "acciones",
      headerName: "Acciones",
      align: "center",
      renderCell: (row) => (
        <Box sx={{ display: "flex", gap: 0.5, justifyContent: "center" }}>
          <Tooltip title="Editar">
            <IconButton size="small" onClick={() => navigate(`/clientes/${row.id}/editar`)}>
              <EditOutlinedIcon fontSize="small" sx={{ color: "secondary.main" }} />
            </IconButton>
          </Tooltip>
          <Tooltip title={row.status === "activo" ? "Desactivar" : "Activar"}>
            <IconButton size="small" onClick={() => setToggleTarget(row)}>
              {row.status === "activo"
                ? <ToggleOnIcon fontSize="small" sx={{ color: "success.main" }} />
                : <ToggleOffOutlinedIcon fontSize="small" sx={{ color: "text.disabled" }} />}
            </IconButton>
          </Tooltip>
          <Tooltip title="Eliminar">
            <IconButton size="small" onClick={() => setDeleteTarget(row)}>
              <DeleteOutlineIcon fontSize="small" sx={{ color: "error.main" }} />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  return (
    <Box>
      <PageHeader
        icon={<GroupsOutlinedIcon />}
        title="Clientes"
        subtitle={`${totalCount} registros`}
        actions={
          <AppButton startIcon={<AddIcon />} onClick={() => navigate("/clientes/nuevo")} sx={{ borderRadius: 2 }}>
            Nuevo Cliente
          </AppButton>
        }
      />

      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

      <Box sx={{ display: "flex", gap: 2, mb: 2, flexWrap: "wrap" }}>
        <TextField
          placeholder="Buscar por nombre, RFC o contacto..."
          size="small"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
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
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Sector</InputLabel>
          <Select label="Sector" value={sectorFilter} onChange={(e) => setSectorFilter(e.target.value)} sx={{ borderRadius: 2 }}>
            <MenuItem value="todos">Todos los sectores</MenuItem>
            {SECTORES.map((s) => (
              <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      <AppTable
        columns={columns}
        rows={rows}
        loading={loading}
        totalCount={totalCount}
        page={page}
        rowsPerPage={rowsPerPage}
        onPageChange={setPage}
        onRowsPerPageChange={(n) => { setRowsPerPage(n); setPage(0); }}
      />

      <ConfirmDialog
        open={!!toggleTarget}
        title={toggleTarget?.status === "activo" ? "Desactivar cliente" : "Activar cliente"}
        message={
          toggleTarget?.status === "activo"
            ? `¿Deseas desactivar a "${toggleTarget?.nombre}"? Podrás reactivarlo cuando quieras.`
            : `¿Deseas activar de nuevo a "${toggleTarget?.nombre}"?`
        }
        confirmLabel={toggleTarget?.status === "activo" ? "Desactivar" : "Activar"}
        confirmColor={toggleTarget?.status === "activo" ? "error" : "success"}
        onConfirm={handleToggleEstado}
        onCancel={() => setToggleTarget(null)}
      />

      <PasswordConfirmDialog
        open={!!deleteTarget}
        title="Eliminar cliente"
        message={`Esto eliminará a "${deleteTarget?.nombre}" de forma permanente y no se puede deshacer. Ingresa la contraseña de administrador para continuar.`}
        onConfirm={handleEliminar}
        onCancel={() => setDeleteTarget(null)}
      />
    </Box>
  );
}
