import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Box, Typography, TextField, InputAdornment, IconButton,
  Chip, Tooltip, MenuItem, Select, FormControl, InputLabel, Alert,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import { DeleteOutlined as DeleteOutlineIcon } from "@mui/icons-material";

import AppButton from "../../shared/components/AppButton";
import AppTable from "../../shared/components/AppTable";
import ConfirmDialog from "../../shared/components/ConfirmDialog";
import CotizacionDialog from "./CotizacionDialog";
import { formatDate } from "../../shared/utils/formatDate";
import { formatCurrency } from "../../shared/utils/currency";
import { listarCotizaciones, eliminarCotizacion } from "../../services/cotizaciones";
import { listarClientes } from "../../services/clientes";
import { useDebounce } from "../../shared/hooks/useDebounce";

const STATUS_MAP = {
  pendiente: { label: "Pendiente",  color: "warning" },
  aprobada:  { label: "Aprobada",   color: "success" },
  rechazada: { label: "Rechazada",  color: "error" },
  facturada: { label: "Facturada",  color: "info" },
  vencida:   { label: "Vencida",    color: "default" },
};

const MESES = [
  { value: "1", label: "Enero" }, { value: "2", label: "Febrero" }, { value: "3", label: "Marzo" },
  { value: "4", label: "Abril" }, { value: "5", label: "Mayo" }, { value: "6", label: "Junio" },
  { value: "7", label: "Julio" }, { value: "8", label: "Agosto" }, { value: "9", label: "Septiembre" },
  { value: "10", label: "Octubre" }, { value: "11", label: "Noviembre" }, { value: "12", label: "Diciembre" },
];

const anioActual = new Date().getFullYear();
const ANIOS = Array.from({ length: 6 }, (_, i) => String(anioActual - i));

function descripcionResumen(items) {
  if (!items?.length) return "—";
  const texto = items.map((i) => i.descripcion).join(", ");
  return texto.length > 60 ? `${texto.slice(0, 60)}…` : texto;
}

export default function CotizacionesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [mesFilter, setMesFilter] = useState("");
  const [anioFilter, setAnioFilter] = useState("");
  const [clienteFilter, setClienteFilter] = useState("");
  const [page, setPage] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const [clientesOpciones, setClientesOpciones] = useState([]);
  const [rows, setRows] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const [dialogAbierto, setDialogAbierto] = useState(false);
  const [cotizacionEditando, setCotizacionEditando] = useState(null);

  const debouncedSearch = useDebounce(search, 400);

  const [prevFiltros, setPrevFiltros] = useState([debouncedSearch, statusFilter, mesFilter, anioFilter, clienteFilter]);
  if (
    prevFiltros[0] !== debouncedSearch || prevFiltros[1] !== statusFilter ||
    prevFiltros[2] !== mesFilter || prevFiltros[3] !== anioFilter || prevFiltros[4] !== clienteFilter
  ) {
    setPrevFiltros([debouncedSearch, statusFilter, mesFilter, anioFilter, clienteFilter]);
    setPage(0);
  }

  useEffect(() => {
    listarClientes({ pageSize: 200 }).then(({ items }) => setClientesOpciones(items)).catch(() => {});
  }, []);

  useEffect(() => {
    const editarId = searchParams.get("editar");
    if (editarId) {
      setCotizacionEditando(editarId);
      setDialogAbierto(true);
      setSearchParams({}, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let cancelado = false;

    (async () => {
      setLoading(true);
      setError("");
      try {
        const { items, total } = await listarCotizaciones({
          search: debouncedSearch,
          status: statusFilter,
          mes: mesFilter,
          anio: anioFilter,
          clienteId: clienteFilter,
          page,
          pageSize: 10,
        });
        if (cancelado) return;
        setRows(items.map((c) => ({ ...c, id: c._id })));
        setTotalCount(total);
      } catch {
        if (!cancelado) setError("No se pudieron cargar las cotizaciones. Intenta de nuevo.");
      } finally {
        if (!cancelado) setLoading(false);
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [debouncedSearch, statusFilter, mesFilter, anioFilter, clienteFilter, page, reloadKey]);

  const totalAprobado = rows
    .filter((c) => c.status === "aprobada" || c.status === "facturada")
    .reduce((s, c) => s + c.total, 0);

  const handleEliminar = async () => {
    const target = deleteTarget;
    setDeleteTarget(null);
    try {
      await eliminarCotizacion(target.id);
      setReloadKey((k) => k + 1);
    } catch {
      setError("No se pudo eliminar la cotización. Intenta de nuevo.");
    }
  };

  const abrirNueva = () => {
    setCotizacionEditando(null);
    setDialogAbierto(true);
  };

  const abrirEditar = (row) => {
    setCotizacionEditando(row.id);
    setDialogAbierto(true);
  };

  const cerrarDialog = () => setDialogAbierto(false);

  const alGuardar = () => {
    setDialogAbierto(false);
    setReloadKey((k) => k + 1);
  };

  const columns = [
    { field: "folio",       headerName: "Cotización" },
    { field: "cliente",     headerName: "Cliente", renderCell: (row) => row.clienteInfo?.nombre || "—" },
    { field: "descripcion", headerName: "Descripción", renderCell: (row) => descripcionResumen(row.items) },
    { field: "total",       headerName: "Total", renderCell: (row) => (
      <Typography fontWeight={700} fontSize={13}>{formatCurrency(row.total)}</Typography>
    )},
    { field: "fecha",       headerName: "Fecha", renderCell: (row) => formatDate(row.fecha) },
    { field: "vendedor",    headerName: "Vendedor", renderCell: (row) => row.vendedorInfo?.nombre || "—" },
    {
      field: "status",
      headerName: "Estatus",
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
          <Tooltip title="Ver / Editar">
            <IconButton size="small" onClick={() => abrirEditar(row)}>
              <VisibilityOutlinedIcon fontSize="small" sx={{ color: "secondary.main" }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Descargar PDF (próximamente)">
            <span>
              <IconButton size="small" disabled>
                <FileDownloadOutlinedIcon fontSize="small" />
              </IconButton>
            </span>
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
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Cotizaciones</Typography>
          <Typography variant="body2" color="text.secondary">
            {totalCount} registros · Aprobadas + Facturadas (esta página):{" "}
            <Box component="span" sx={{ fontWeight: 700, color: "secondary.main" }}>{formatCurrency(totalAprobado)}</Box>
          </Typography>
        </Box>
        <AppButton startIcon={<AddIcon />} onClick={abrirNueva} sx={{ borderRadius: 2 }}>
          Nueva Cotización
        </AppButton>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

      <Box sx={{ display: "flex", gap: 2, mb: 2, flexWrap: "wrap" }}>
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Mes</InputLabel>
          <Select label="Mes" value={mesFilter} onChange={(e) => setMesFilter(e.target.value)} sx={{ borderRadius: 2 }}>
            <MenuItem value="">Todos</MenuItem>
            {MESES.map((m) => <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Año</InputLabel>
          <Select label="Año" value={anioFilter} onChange={(e) => setAnioFilter(e.target.value)} sx={{ borderRadius: 2 }}>
            <MenuItem value="">Todos</MenuItem>
            {ANIOS.map((a) => <MenuItem key={a} value={a}>{a}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 220 }}>
          <InputLabel>Cliente</InputLabel>
          <Select label="Cliente" value={clienteFilter} onChange={(e) => setClienteFilter(e.target.value)} sx={{ borderRadius: 2 }}>
            <MenuItem value="">Todos</MenuItem>
            {clientesOpciones.map((c) => <MenuItem key={c._id} value={c._id}>{c.nombre}</MenuItem>)}
          </Select>
        </FormControl>
        <TextField
          placeholder="No. Cotización o folio..."
          size="small"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ width: 240, "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
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
          <Select label="Estado" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} sx={{ borderRadius: 2 }}>
            <MenuItem value="todos">Todos</MenuItem>
            <MenuItem value="pendiente">Pendiente</MenuItem>
            <MenuItem value="aprobada">Aprobada</MenuItem>
            <MenuItem value="rechazada">Rechazada</MenuItem>
            <MenuItem value="facturada">Facturada</MenuItem>
            <MenuItem value="vencida">Vencida</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <AppTable
        columns={columns}
        rows={rows}
        loading={loading}
        totalCount={totalCount}
        page={page}
        rowsPerPage={10}
        onPageChange={setPage}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Eliminar cotización"
        message={`¿Deseas eliminar la cotización "${deleteTarget?.folio}"? Esta acción no se puede deshacer.`}
        onConfirm={handleEliminar}
        onCancel={() => setDeleteTarget(null)}
      />

      <CotizacionDialog
        open={dialogAbierto}
        cotizacionId={cotizacionEditando}
        onClose={cerrarDialog}
        onSaved={alGuardar}
      />
    </Box>
  );
}
