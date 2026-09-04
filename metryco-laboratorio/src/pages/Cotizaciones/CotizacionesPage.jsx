import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Box, Typography, TextField, InputAdornment, IconButton,
  Chip, Tooltip, MenuItem, Select, FormControl, InputLabel, Alert,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import ContentCopyOutlinedIcon from "@mui/icons-material/ContentCopyOutlined";
import { DeleteOutlined as DeleteOutlineIcon } from "@mui/icons-material";

import AppButton from "../../shared/components/AppButton";
import AppTable from "../../shared/components/AppTable";
import PageHeader from "../../shared/components/PageHeader";
import RequestQuoteOutlinedIcon from "@mui/icons-material/RequestQuoteOutlined";
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
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [mesFilter, setMesFilter] = useState("");
  const [anioFilter, setAnioFilter] = useState("");
  const [clienteFilter, setClienteFilter] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const [clientesOpciones, setClientesOpciones] = useState([]);
  const [rows, setRows] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const [dialogAbierto, setDialogAbierto] = useState(false);
  const [cotizacionEditando, setCotizacionEditando] = useState(null);
  const [duplicarDesde, setDuplicarDesde] = useState(null);

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
          pageSize: rowsPerPage,
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
  }, [debouncedSearch, statusFilter, mesFilter, anioFilter, clienteFilter, page, rowsPerPage, reloadKey]);

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
    setDuplicarDesde(null);
    setDialogAbierto(true);
  };

  const abrirEditar = (row) => {
    setCotizacionEditando(row.id);
    setDuplicarDesde(null);
    setDialogAbierto(true);
  };

  const abrirDuplicar = (row) => {
    setCotizacionEditando(null);
    setDuplicarDesde(row.id);
    setDialogAbierto(true);
  };

  const cerrarDialog = () => { setDialogAbierto(false); setDuplicarDesde(null); };

  const generarFactura = (row) => {
    const params = new URLSearchParams({
      cotizacion: row.id,
      cliente: row.cliente,
      monto: row.total,
      folio: row.folio,
    });
    navigate(`/cobranza?${params.toString()}`);
  };

  const alGuardar = () => {
    setDialogAbierto(false);
    setDuplicarDesde(null);
    setReloadKey((k) => k + 1);
  };

  const columns = [
    {
      field: "folio", headerName: "Cotización",
      renderCell: (row) => (
        <Tooltip title="Ver / Editar cotización">
          <Chip
            size="small" clickable label={row.folio} icon={<RequestQuoteOutlinedIcon sx={{ fontSize: 14 }} />}
            onClick={() => abrirEditar(row)}
            sx={{ fontWeight: 700, color: "secondary.main", borderColor: "secondary.main", "& .MuiChip-icon": { color: "secondary.main" } }}
            variant="outlined"
          />
        </Tooltip>
      ),
    },
    {
      field: "cliente", headerName: "Cliente",
      renderCell: (row) =>
        row.cliente ? (
          <Tooltip title="Abrir ficha del cliente">
            <Box
              component="button" type="button"
              onClick={() => navigate(`/clientes/${row.cliente}/editar`)}
              sx={{
                border: "none", background: "none", p: 0, m: 0, cursor: "pointer", textAlign: "left",
                color: "info.main", fontSize: 13, fontWeight: 600, "&:hover": { textDecoration: "underline" },
              }}
            >
              {row.clienteInfo?.nombre || "—"}
            </Box>
          </Tooltip>
        ) : (row.clienteInfo?.nombre || "—"),
    },
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
          <Tooltip title={row.status === "aprobada" ? "Generar factura" : "Solo disponible para cotizaciones aprobadas"}>
            <span>
              <IconButton size="small" onClick={() => generarFactura(row)} disabled={row.status !== "aprobada"}>
                <ReceiptLongOutlinedIcon fontSize="small" sx={{ color: row.status === "aprobada" ? "success.main" : undefined }} />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Imprimir / Descargar PDF">
            <IconButton size="small" onClick={() => window.open(`/informe/cotizacion/${row._id}`, "_blank")}>
              <FileDownloadOutlinedIcon fontSize="small" sx={{ color: "error.main" }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Duplicar cotización">
            <IconButton size="small" onClick={() => abrirDuplicar(row)}>
              <ContentCopyOutlinedIcon fontSize="small" sx={{ color: "primary.main" }} />
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
        icon={<RequestQuoteOutlinedIcon />}
        title="Cotizaciones"
        subtitle={
          <>
            {totalCount} registros · Aprobadas + Facturadas (esta página):{" "}
            <Box component="span" sx={{ fontWeight: 700, color: "secondary.main" }}>{formatCurrency(totalAprobado)}</Box>
          </>
        }
        actions={
          <AppButton startIcon={<AddIcon />} onClick={abrirNueva} sx={{ borderRadius: 2 }}>
            Nueva Cotización
          </AppButton>
        }
      />

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
        rowsPerPage={rowsPerPage}
        onPageChange={setPage}
        onRowsPerPageChange={(n) => { setRowsPerPage(n); setPage(0); }}
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
        duplicarDesdeId={duplicarDesde}
        onClose={cerrarDialog}
        onSaved={alGuardar}
        onGenerarFactura={(cot) => { cerrarDialog(); generarFactura({ id: cot._id, cliente: cot.cliente?._id || cot.cliente, total: cot.total, folio: cot.folio }); }}
        onDuplicar={(id) => { setCotizacionEditando(null); setDuplicarDesde(id); }}
      />
    </Box>
  );
}
