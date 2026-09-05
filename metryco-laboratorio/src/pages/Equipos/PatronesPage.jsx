import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Typography, TextField, InputAdornment, IconButton, Tooltip, Chip, Avatar,
  MenuItem, Select, FormControl, InputLabel, Menu, ListItemIcon, ListItemText, Alert,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import QrCode2OutlinedIcon from "@mui/icons-material/QrCode2Outlined";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutlineOutlined";
import BlockOutlinedIcon from "@mui/icons-material/BlockOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";

import AppButton from "../../shared/components/AppButton";
import AppTable from "../../shared/components/AppTable";
import PageHeader from "../../shared/components/PageHeader";
import StatCard from "../../shared/components/StatCard";
import EtiquetaEquipoDialog from "../../shared/components/EtiquetaEquipoDialog";
import ConfirmDialog from "../../shared/components/ConfirmDialog";
import PasswordConfirmDialog from "../../shared/components/PasswordConfirmDialog";
import StraightenOutlinedIcon from "@mui/icons-material/StraightenOutlined";
import VerifiedOutlinedIcon from "@mui/icons-material/VerifiedOutlined";
import ScheduleOutlinedIcon from "@mui/icons-material/ScheduleOutlined";
import ReportGmailerrorredOutlinedIcon from "@mui/icons-material/ReportGmailerrorredOutlined";
import { formatDate } from "../../shared/utils/formatDate";
import { exportCsv } from "../../shared/utils/exportCsv";
import { CATEGORIAS, iconoCategoria, colorCategoria } from "./categorias";
import { listarPatrones, actualizarPatron, eliminarPatron, eliminarPatronPermanente, fetchQrPatronBlob } from "../../services/patrones";
import { useAuth } from "../../core/auth/useAuth";

const VIG = {
  vigente: { label: "Vigente", color: "success" },
  por_vencer: { label: "Por vencer", color: "warning" },
  vencido: { label: "Vencido", color: "error" },
  sin_fecha: { label: "Sin fecha", color: "default" },
};

const ESTADO_MAP = {
  activo: { label: "Activo", color: "success" },
  en_calibracion: { label: "En calibración", color: "info" },
  baja: { label: "De baja", color: "default" },
};

export default function PatronesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const puedeEditar = user?.rol !== "tecnico";
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoria, setCategoria] = useState("");
  const [vigencia, setVigencia] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [etiquetaPatron, setEtiquetaPatron] = useState(null);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [menuRow, setMenuRow] = useState(null);
  const [bajaTarget, setBajaTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [error, setError] = useState("");

  const cargar = useCallback(() => {
    setLoading(true);
    listarPatrones({ search, categoria, vigencia, page, pageSize: rowsPerPage })
      .then(({ items, total }) => { setRows(items); setTotal(total); })
      .catch(() => { setRows([]); setTotal(0); })
      .finally(() => setLoading(false));
  }, [search, categoria, vigencia, page, rowsPerPage]);
  useEffect(() => { cargar(); }, [cargar]);

  const cuenta = (v) => rows.filter((r) => r.vigencia === v).length;

  const abrirMenu = (e, row) => { setMenuAnchor(e.currentTarget); setMenuRow(row); };
  const cerrarMenu = () => { setMenuAnchor(null); setMenuRow(null); };

  const activar = async (row) => {
    setError("");
    try {
      await actualizarPatron(row._id, { estado: "activo" });
      cargar();
    } catch {
      setError("No se pudo activar el patrón. Intenta de nuevo.");
    }
  };

  const confirmarBaja = async () => {
    const target = bajaTarget;
    setBajaTarget(null);
    try {
      await eliminarPatron(target._id);
      cargar();
    } catch {
      setError("No se pudo dar de baja el patrón. Intenta de nuevo.");
    }
  };

  const confirmarEliminar = async () => {
    const target = deleteTarget;
    setError("");
    try {
      await eliminarPatronPermanente(target._id);
      setDeleteTarget(null);
      cargar();
    } catch (err) {
      setDeleteTarget(null);
      setError(err?.response?.data?.message || "No se pudo eliminar el patrón. Intenta de nuevo.");
    }
  };

  const columns = [
    {
      field: "codigo", headerName: "Patrón",
      renderCell: (r) => {
        const Icono = iconoCategoria(r.categoria);
        const color = colorCategoria(r.categoria);
        return (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
            <Avatar sx={{ width: 32, height: 32, bgcolor: `${color}1a`, color }}>
              <Icono fontSize="small" />
            </Avatar>
            <Box>
              <Typography variant="body2" fontWeight={700}>{r.codigo}</Typography>
              <Typography variant="caption" color="text.secondary">{r.nombre}</Typography>
            </Box>
          </Box>
        );
      },
    },
    {
      field: "categoria", headerName: "Categoría",
      renderCell: (r) => r.categoria
        ? <Chip size="small" variant="outlined" label={r.categoria} sx={{ borderColor: colorCategoria(r.categoria), color: colorCategoria(r.categoria) }} />
        : "—",
    },
    { field: "trazabilidad", headerName: "Trazabilidad", renderCell: (r) => r.trazabilidad || "—" },
    {
      field: "incertidumbre", headerName: "U (cert.)",
      renderCell: (r) =>
        r.incertidumbre?.modo === "tabla"
          ? <Chip size="small" variant="outlined" label={`tabla · ${r.incertidumbre.puntos?.length || 0} pts`} />
          : r.incertidumbre?.valor != null
          ? <span>{r.incertidumbre.valor} {r.incertidumbre.unidad || r.unidad} <Typography component="span" variant="caption" color="text.secondary">k={r.incertidumbre.k}</Typography></span>
          : "—",
    },
    { field: "venc", headerName: "Vence", renderCell: (r) => formatDate(r.calibracion?.vencimiento) },
    {
      field: "vigencia", headerName: "Vigencia",
      renderCell: (r) => {
        const v = VIG[r.vigencia] || VIG.sin_fecha;
        return <Chip size="small" label={v.label} color={v.color} />;
      },
    },
    {
      field: "estado", headerName: "Estado",
      renderCell: (r) => {
        const e = ESTADO_MAP[r.estado] || ESTADO_MAP.activo;
        return <Chip size="small" label={e.label} color={e.color} variant={r.estado === "baja" ? "outlined" : "filled"} />;
      },
    },
    {
      field: "acciones", headerName: "Acciones", align: "center",
      renderCell: (r) => (
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", flexWrap: "nowrap" }}>
          {puedeEditar && (
            <Tooltip title="Editar patrón">
              <IconButton size="small" onClick={() => navigate(`/equipos/patrones/${r._id}/editar`)}>
                <EditOutlinedIcon fontSize="small" sx={{ color: "secondary.main" }} />
              </IconButton>
            </Tooltip>
          )}
          <Tooltip title="Etiqueta / imprimir">
            <IconButton size="small" onClick={() => setEtiquetaPatron(r)}>
              <QrCode2OutlinedIcon fontSize="small" sx={{ color: "primary.main" }} />
            </IconButton>
          </Tooltip>
          {puedeEditar && (
            <Tooltip title="Más opciones">
              <IconButton size="small" onClick={(e) => abrirMenu(e, r)}>
                <MoreVertIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      ),
    },
  ];

  const exportar = () =>
    exportCsv(
      rows.map((r) => ({
        Codigo: r.codigo, Nombre: r.nombre, Categoria: r.categoria, Trazabilidad: r.trazabilidad,
        U: r.incertidumbre?.valor ?? "", k: r.incertidumbre?.k ?? "",
        Vence: r.calibracion?.vencimiento?.slice?.(0, 10) || "", Estado: r.vigencia,
      })),
      "patrones.csv"
    );

  return (
    <Box>
      <PageHeader
        icon={<StraightenOutlinedIcon />}
        title="Consultar Patrones"
        subtitle={`${total} patrones registrados`}
        actions={
          <>
            <AppButton variant="outlined" startIcon={<FileDownloadOutlinedIcon />} onClick={exportar} sx={{ borderRadius: 2 }}>
              Exportar Patrones
            </AppButton>
            <AppButton startIcon={<AddIcon />} onClick={() => navigate("/equipos/patrones/nuevo")} sx={{ borderRadius: 2 }}>
              Alta de Patrón
            </AppButton>
          </>
        }
      />

      {error && <Alert severity="error" sx={{ borderRadius: 2, mb: 2 }} onClose={() => setError("")}>{error}</Alert>}

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(3,1fr)" }, gap: 2.5, mb: 3.5 }}>
        <StatCard label="Vigentes (página)" value={cuenta("vigente")} icon={<VerifiedOutlinedIcon />} color="#16A34A" />
        <StatCard label="Por vencer" value={cuenta("por_vencer")} icon={<ScheduleOutlinedIcon />} color="#D97706" />
        <StatCard label="Vencidos" value={cuenta("vencido")} icon={<ReportGmailerrorredOutlinedIcon />} color="#DC2626" />
      </Box>

      <Box sx={{ display: "flex", gap: 2, mb: 2, flexWrap: "wrap" }}>
        <TextField
          placeholder="Buscar por código, nombre o N° de certificado…"
          size="small"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          sx={{ width: 360, "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
          slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" sx={{ color: "text.secondary" }} /></InputAdornment> } }}
        />
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>Categoría</InputLabel>
          <Select label="Categoría" value={categoria} onChange={(e) => { setCategoria(e.target.value); setPage(0); }} sx={{ borderRadius: 2 }}>
            <MenuItem value="">Todas</MenuItem>
            {CATEGORIAS.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Vigencia</InputLabel>
          <Select label="Vigencia" value={vigencia} onChange={(e) => { setVigencia(e.target.value); setPage(0); }} sx={{ borderRadius: 2 }}>
            <MenuItem value="">Todas</MenuItem>
            <MenuItem value="vigente">Vigente</MenuItem>
            <MenuItem value="por_vencer">Por vencer</MenuItem>
            <MenuItem value="vencido">Vencido</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <AppTable
        columns={columns}
        rows={rows}
        loading={loading}
        totalCount={total}
        page={page}
        rowsPerPage={rowsPerPage}
        onPageChange={setPage}
        emptyText="Sin patrones registrados"
        onRowsPerPageChange={(n) => { setRowsPerPage(n); setPage(0); }}
      />

      <EtiquetaEquipoDialog
        open={!!etiquetaPatron}
        onClose={() => setEtiquetaPatron(null)}
        item={etiquetaPatron}
        tipo="patron"
        fetchQr={fetchQrPatronBlob}
      />

      <ConfirmDialog
        open={!!bajaTarget}
        title="Dar de baja el patrón"
        message={`¿Deseas dar de baja "${bajaTarget?.codigo}"? Deja de aparecer como disponible para calibrar, pero los certificados que ya lo usaron conservan su trazabilidad.`}
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
        {menuRow?.estado === "baja" ? (
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
        <MenuItem onClick={() => { setDeleteTarget(menuRow); cerrarMenu(); }}>
          <ListItemIcon>
            <DeleteOutlineIcon fontSize="small" sx={{ color: "error.dark" }} />
          </ListItemIcon>
          <ListItemText>Eliminar permanentemente</ListItemText>
        </MenuItem>
      </Menu>

      <PasswordConfirmDialog
        open={!!deleteTarget}
        title="Eliminar patrón"
        message={`Esto eliminará "${deleteTarget?.codigo}" de forma permanente y no se puede deshacer. Solo es posible si nunca se usó en una calibración. Ingresa la contraseña de administrador para continuar.`}
        onConfirm={confirmarEliminar}
        onCancel={() => setDeleteTarget(null)}
      />
    </Box>
  );
}
