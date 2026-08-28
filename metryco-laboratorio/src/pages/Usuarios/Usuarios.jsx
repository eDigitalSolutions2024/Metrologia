import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  TextField,
  InputAdornment,
  IconButton,
  Chip,
  Tooltip,
  Avatar,
  Alert,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Grid,
  Paper,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import BlockOutlinedIcon from "@mui/icons-material/BlockOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlineOutlined";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutlineOutlined";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutlineOutlined";
import BlockOutlined from "@mui/icons-material/BlockOutlined";
import AdminPanelSettingsOutlinedIcon from "@mui/icons-material/AdminPanelSettingsOutlined";

import AppButton from "../../shared/components/AppButton";
import AppTable from "../../shared/components/AppTable";
import PageHeader from "../../shared/components/PageHeader";
import StatCard from "../../shared/components/StatCard";
import ManageAccountsOutlinedIcon from "@mui/icons-material/ManageAccountsOutlined";
import ConfirmDialog from "../../shared/components/ConfirmDialog";

import PasswordConfirmDialog from "../../shared/components/PasswordConfirmDialog";
import NuevoUsuario from "../../shared/components/NuevoUsuario/NuevoUsuario";
import EditarUsuario from "../../shared/components/EditarUsuario/EditarUsuario";
import ObservacionesUsuario from "../../shared/components/ObservacionesUsuario/ObservacionesUsuario";
import { listarUsuarios, desactivarUsuario, eliminarUsuario } from "../../services/usuarios";
import { useDebounce } from "../../shared/hooks/useDebounce";

const ROL_MAP = {
  admin: { label: "Administrador", color: "error" },
  tecnico: { label: "Técnico", color: "primary" },
  ventas: { label: "Ventas", color: "success" },
  coordinador: { label: "Coordinador", color: "info" },
};

export default function Usuarios() {
  const theme = useTheme();
  const [openNuevoUsuario, setOpenNuevoUsuario] = useState(false);
  const [stats, setStats] = useState({ total: 0, activos: 0, inactivos: 0, admins: 0 });
  const [editTarget, setEditTarget] = useState(null);
  const [deactivateTarget, setDeactivateTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [observacionesTarget, setObservacionesTarget] = useState(null);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [menuRow, setMenuRow] = useState(null);

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  const [rows, setRows] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const debouncedSearch = useDebounce(search, 400);

  const [prevSearch, setPrevSearch] = useState(debouncedSearch);
  if (prevSearch !== debouncedSearch) {
    setPrevSearch(debouncedSearch);
    setPage(0);
  }

  useEffect(() => {
    let cancelado = false;

    (async () => {
      setLoading(true);
      setError("");
      try {
        const { items, total } = await listarUsuarios({
          search: debouncedSearch,
          page,
          pageSize: 5,
        });
        if (cancelado) return;
        setRows(items.map((u) => ({ ...u, id: u._id })));
        setTotalCount(total);
      } catch {
        if (!cancelado) setError("No se pudieron cargar los usuarios. Intenta de nuevo.");
      } finally {
        if (!cancelado) setLoading(false);
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [debouncedSearch, page, reloadKey]);

  useEffect(() => {
    let cancelado = false;

    (async () => {
      try {
        const [total, activos, inactivos, admins] = await Promise.all([
          listarUsuarios({ pageSize: 1 }),
          listarUsuarios({ pageSize: 1, status: "activo" }),
          listarUsuarios({ pageSize: 1, status: "inactivo" }),
          listarUsuarios({ pageSize: 1, rol: "admin" }),
        ]);
        if (cancelado) return;
        setStats({
          total: total.total,
          activos: activos.total,
          inactivos: inactivos.total,
          admins: admins.total,
        });
      } catch {
        // Silencioso: las tarjetas de resumen no son críticas para el listado
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [reloadKey]);

  const statCards = [
    { titulo: "Total de Usuarios", valor: stats.total, icono: <GroupsOutlinedIcon sx={{ fontSize: 28 }} />, color: theme.palette.secondary.main, sub: "Registrados en el sistema" },
    { titulo: "Activos", valor: stats.activos, icono: <CheckCircleOutlineIcon sx={{ fontSize: 28 }} />, color: theme.palette.success.main, sub: "Pueden iniciar sesión" },
    { titulo: "Inactivos", valor: stats.inactivos, icono: <BlockOutlined sx={{ fontSize: 28 }} />, color: theme.palette.error.main, sub: "Acceso deshabilitado" },
    { titulo: "Administradores", valor: stats.admins, icono: <AdminPanelSettingsOutlinedIcon sx={{ fontSize: 28 }} />, color: theme.palette.warning.main, sub: "Rol con más permisos" },
  ];

  const recargar = () => setReloadKey((k) => k + 1);

  const abrirMenu = (e, row) => {
    setMenuAnchor(e.currentTarget);
    setMenuRow(row);
  };
  const cerrarMenu = () => {
    setMenuAnchor(null);
    setMenuRow(null);
  };

  const handleDesactivar = async () => {
    const target = deactivateTarget;
    setDeactivateTarget(null);
    try {
      await desactivarUsuario(target.id);
      recargar();
    } catch {
      setError("No se pudo desactivar el usuario. Intenta de nuevo.");
    }
  };

  const handleEliminar = async () => {
    const target = deleteTarget;
    await eliminarUsuario(target.id);
    setDeleteTarget(null);
    recargar();
  };

  const columns = [
    {
      field: "nombre",
      headerName: "Usuario",
      renderCell: (row) => (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Avatar
            sx={{
              width: 32,
              height: 32,
              fontSize: 13,
              bgcolor: "secondary.main",
            }}
          >
            {row.nombre.charAt(0)}
          </Avatar>
          <Box>
            <Typography variant="body2" fontWeight={600}>
              {row.nombre}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              @{row.usuario}
            </Typography>
          </Box>
        </Box>
      ),
    },
    { field: "email", headerName: "Correo" },
    {
      field: "rol",
      headerName: "Rol",
      renderCell: (row) => {
        const r = ROL_MAP[row.rol] ?? { label: row.rol, color: "default" };
        return <Chip label={r.label} color={r.color} size="small" />;
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
        <Box sx={{ display: "flex", gap: 1, justifyContent: "center" }}>
          <Tooltip title="Editar">
            <IconButton size="small" onClick={() => setEditTarget(row)}>
              <EditOutlinedIcon fontSize="small" sx={{ color: "secondary.main" }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Observaciones">
            <IconButton size="small" onClick={() => setObservacionesTarget(row)}>
              <ChatBubbleOutlineIcon fontSize="small" sx={{ color: "secondary.main" }} />
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
    <Box sx={{ "& > * + *": { mt: 3 } }}>
      <PageHeader
        icon={<ManageAccountsOutlinedIcon />}
        title="Usuarios del Sistema"
        subtitle={`${totalCount} usuarios`}
        actions={
          <AppButton startIcon={<AddIcon />} sx={{ borderRadius: 2 }} onClick={() => setOpenNuevoUsuario(true)}>
            Nuevo Usuario
          </AppButton>
        }
      />

      {error && <Alert severity="error" sx={{ borderRadius: 2 }}>{error}</Alert>}

      <Grid container spacing={2.5}>
        {statCards.map((card) => (
          <Grid key={card.titulo} size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard label={card.titulo} value={card.valor} icon={card.icono} color={card.color} hint={card.sub} />
          </Grid>
        ))}
      </Grid>

      <Box>
        <TextField
          placeholder="Buscar por nombre, usuario o correo..."
          size="small"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ width: 340, "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
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
        rows={rows}
        loading={loading}
        totalCount={totalCount}
        page={page}
        rowsPerPage={5}
        onPageChange={setPage}
      />

      <NuevoUsuario
        open={openNuevoUsuario}
        onClose={() => setOpenNuevoUsuario(false)}
        onCreated={recargar}
      />

      <EditarUsuario
        open={!!editTarget}
        usuario={editTarget}
        onClose={() => setEditTarget(null)}
        onSaved={recargar}
      />

      <ConfirmDialog
        open={!!deactivateTarget}
        title="Desactivar usuario"
        message={`¿Deseas desactivar a "${deactivateTarget?.nombre}"? Ya no podrá iniciar sesión.`}
        onConfirm={handleDesactivar}
        onCancel={() => setDeactivateTarget(null)}
      />

      <PasswordConfirmDialog
        open={!!deleteTarget}
        title="Eliminar usuario"
        message={`Esto eliminará a "${deleteTarget?.nombre}" de forma permanente y no se puede deshacer. Ingresa la contraseña de administrador para continuar.`}
        onConfirm={handleEliminar}
        onCancel={() => setDeleteTarget(null)}
      />

      <ObservacionesUsuario
        open={!!observacionesTarget}
        usuario={observacionesTarget}
        onClose={() => setObservacionesTarget(null)}
        onSaved={recargar}
      />

      <Menu
        anchorEl={menuAnchor}
        open={!!menuAnchor}
        onClose={cerrarMenu}
        slotProps={{ paper: { sx: { borderRadius: 2, minWidth: 200 } } }}
      >
        <MenuItem
          disabled={menuRow?.status === "inactivo"}
          onClick={() => {
            setDeactivateTarget(menuRow);
            cerrarMenu();
          }}
        >
          <ListItemIcon>
            <BlockOutlinedIcon fontSize="small" sx={{ color: "error.main" }} />
          </ListItemIcon>
          <ListItemText>Desactivar</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            setDeleteTarget(menuRow);
            cerrarMenu();
          }}
        >
          <ListItemIcon>
            <DeleteOutlineIcon fontSize="small" sx={{ color: "error.dark" }} />
          </ListItemIcon>
          <ListItemText>Eliminar permanentemente</ListItemText>
        </MenuItem>
      </Menu>
    </Box>
  );
}
