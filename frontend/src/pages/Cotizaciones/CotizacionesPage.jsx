import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Box, Typography, TextField, InputAdornment,
  Chip, Tooltip, MenuItem, Select, FormControl, InputLabel, Alert,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import AssignmentOutlinedIcon from "@mui/icons-material/AssignmentOutlined";
import ContentCopyOutlinedIcon from "@mui/icons-material/ContentCopyOutlined";
import { DeleteOutlined as DeleteOutlineIcon } from "@mui/icons-material";

import AppButton from "../../shared/components/AppButton";
import AppTable from "../../shared/components/AppTable";
import MenuAcciones from "../../shared/components/MenuAcciones";
import PageHeader from "../../shared/components/PageHeader";
import StatCard from "../../shared/components/StatCard";
import RequestQuoteOutlinedIcon from "@mui/icons-material/RequestQuoteOutlined";
import PendingActionsOutlinedIcon from "@mui/icons-material/PendingActionsOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutlineOutlined";
import HighlightOffOutlinedIcon from "@mui/icons-material/HighlightOffOutlined";
import PaidOutlinedIcon from "@mui/icons-material/PaidOutlined";
import ConfirmDialog from "../../shared/components/ConfirmDialog";
import CotizacionDialog from "./CotizacionDialog";
import { formatDate } from "../../shared/utils/formatDate";
import { formatCurrency } from "../../shared/utils/currency";
import { listarCotizaciones, eliminarCotizacion } from "../../services/cotizaciones";
import { listarClientes, obtenerCliente } from "../../services/clientes";
import { obtenerDatosRecotizacion } from "../../services/certificados";
import { ESTADO_CFDI_CHIP } from "../Facturacion/estadosCfdi";
import { useDebounce } from "../../shared/hooks/useDebounce";
import { usePolling } from "../../shared/hooks/usePolling";

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

  const editarIdInicial = searchParams.get("editar");
  const [dialogAbierto, setDialogAbierto] = useState(!!editarIdInicial);
  const [cotizacionEditando, setCotizacionEditando] = useState(editarIdInicial);
  const [duplicarDesde, setDuplicarDesde] = useState(null);
  const [prefillCotizacion, setPrefillCotizacion] = useState(null);

  // Enlace desde Certificados ("Cotizar recalibración"): /cotizaciones?recotizar=<certificadoId>
  const recotizarId = searchParams.get("recotizar");
  useEffect(() => {
    if (!recotizarId) return;
    obtenerDatosRecotizacion(recotizarId)
      .then((d) => {
        setPrefillCotizacion({
          cliente: d.cliente, contacto: d.contacto, moneda: d.moneda, ivaPorcentaje: d.ivaPorcentaje,
          observaciones: d.observaciones, items: [d.item],
          aviso: d.precioAnteriorEncontrado
            ? `Recalibración prellenada desde el certificado. Precio tomado de la cotización anterior ${d.cotizacionAnterior?.folio} — revísalo antes de guardar.`
            : "Recalibración prellenada desde el certificado. No se encontró un precio anterior: captura el precio de esta vez.",
        });
        setCotizacionEditando(null);
        setDuplicarDesde(null);
        setDialogAbierto(true);
      })
      .catch(() => setError("No se pudieron cargar los datos del certificado para cotizar."))
      .finally(() => setSearchParams({}, { replace: true }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recotizarId]);

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
    if (editarIdInicial) setSearchParams({}, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Protege contra condiciones de carrera: con filtros que cambian rápido
  // + el refresco automático de fondo (usePolling) puede haber más de una
  // petición en vuelo a la vez — si una vieja resuelve después de una más
  // nueva, no debe pisar los datos ya actualizados.
  const cargaIdRef = useRef(0);
  const cargar = useCallback(async (silencioso = false) => {
    const miId = ++cargaIdRef.current;
    if (!silencioso) { setLoading(true); setError(""); }
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
      if (cargaIdRef.current !== miId) return;
      setRows(items.map((c) => ({ ...c, id: c._id })));
      setTotalCount(total);
    } catch {
      if (cargaIdRef.current === miId && !silencioso) setError("No se pudieron cargar las cotizaciones. Intenta de nuevo.");
    } finally {
      if (cargaIdRef.current === miId && !silencioso) setLoading(false);
    }
  }, [debouncedSearch, statusFilter, mesFilter, anioFilter, clienteFilter, page, rowsPerPage]);

  useEffect(() => { cargar(); }, [cargar, reloadKey]);
  usePolling(() => cargar(true));

  const totalAprobado = rows
    .filter((c) => c.status === "aprobada" || c.status === "facturada")
    .reduce((s, c) => s + c.total, 0);
  const cuenta = (status) => rows.filter((c) => c.status === status).length;

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

  const cerrarDialog = () => { setDialogAbierto(false); setDuplicarDesde(null); setPrefillCotizacion(null); };

  // Lleva la cotización aprobada a Facturación con el CFDI ya armado — antes
  // de salir se revisa que el cliente tenga datos fiscales completos, para
  // no descubrirlo hasta el momento de guardar el borrador.
  const generarFactura = async (row) => {
    setError("");
    try {
      const cliente = await obtenerCliente(row.cliente);
      const faltantes = [
        !cliente.rfc && "RFC",
        !cliente.regimenFiscal && "régimen fiscal",
        !cliente.usoCFDI && "uso de CFDI",
        !cliente.domicilioFiscal?.cp && "código postal fiscal",
      ].filter(Boolean);
      if (faltantes.length) {
        setError(`No se puede facturar ${row.folio}: a "${cliente.nombre}" le faltan datos fiscales (${faltantes.join(", ")}). Complétalos en Clientes.`);
        return;
      }
    } catch {
      setError("No se pudo verificar los datos fiscales del cliente. Intenta de nuevo.");
      return;
    }
    navigate(`/facturacion?${new URLSearchParams({ cotizacion: row.id, cliente: row.cliente }).toString()}`);
  };

  const alGuardar = () => {
    setDialogAbierto(false);
    setDuplicarDesde(null);
    setReloadKey((k) => k + 1);
  };

  const columns = [
    {
      field: "folio", headerName: "Cotización", nowrap: true,
      renderCell: (row) => (
        <Tooltip title="Ver / Editar cotización">
          <Chip
            size="small" clickable label={row.folio} icon={<RequestQuoteOutlinedIcon sx={{ fontSize: 14 }} />}
            onClick={() => abrirEditar(row)}
            sx={{
              fontWeight: 700, color: "secondary.main", borderColor: "secondary.main", borderRadius: "6px",
              "& .MuiChip-icon": { color: "secondary.main" }, "& .MuiChip-label": { px: 1 },
            }}
            variant="outlined"
          />
        </Tooltip>
      ),
    },
    {
      field: "cliente", headerName: "Cliente", minWidth: 180,
      renderCell: (row) =>
        row.cliente ? (
          <Tooltip title="Abrir ficha del cliente">
            <Box
              component="button" type="button"
              onClick={() => navigate(`/clientes/${row.cliente}`)}
              sx={{
                border: "none", background: "none", p: 0, m: 0, cursor: "pointer", textAlign: "left",
                color: "info.main", fontSize: 13.5, fontWeight: 600, "&:hover": { textDecoration: "underline" },
              }}
            >
              {row.clienteInfo?.nombre || "—"}
            </Box>
          </Tooltip>
        ) : (row.clienteInfo?.nombre || "—"),
    },
    { field: "descripcion", headerName: "Descripción", hideBelow: 1000, minWidth: 200, renderCell: (row) => <Box sx={{ maxWidth: 300 }}>{descripcionResumen(row.items)}</Box> },
    { field: "total",       headerName: "Total", nowrap: true, align: "right", renderCell: (row) => (
      <Typography fontWeight={700} fontSize={13.5}>{formatCurrency(row.total)}</Typography>
    )},
    { field: "fecha",       headerName: "Fecha", nowrap: true, hideBelow: 900, renderCell: (row) => formatDate(row.fecha) },
    { field: "vendedor",    headerName: "Vendedor", nowrap: true, hideBelow: "xl", renderCell: (row) => row.vendedorInfo?.nombre || "—" },
    {
      field: "status",
      headerName: "Estatus",
      minWidth: 140,
      renderCell: (row) => {
        const s = STATUS_MAP[row.status] ?? { label: row.status, color: "default" };
        const f = row.cfdi;
        const fs = f && (ESTADO_CFDI_CHIP[f.estado] || { label: f.estado });
        const cobro = f && f.estado === "timbrada" && f.metodoPago === "PPD"
          ? ((f.saldoPendiente ?? f.total) > 0 ? ` · Debe ${formatCurrency(f.saldoPendiente ?? f.total)}` : " · Pagada")
          : "";
        return (
          <Box>
            <Chip label={s.label} color={s.color} size="small" />
            {row.facturacion?.parcial && (
              <Typography variant="caption" color="warning.main" fontWeight={700} sx={{ display: "block", mt: 0.5 }}>
                Facturación parcial · {row.facturacion.partidasFacturadas}/{row.facturacion.partidasTotal} partidas
              </Typography>
            )}
            {f && (
              <Tooltip title="Abrir la factura en Facturación">
                <Typography
                  component="button" type="button" variant="caption" onClick={() => navigate(`/facturacion?cfdi=${f._id}`)}
                  sx={{ display: "block", mt: 0.5, p: 0, border: "none", background: "none", cursor: "pointer", textAlign: "left", color: "info.main", fontWeight: 600, "&:hover": { textDecoration: "underline" } }}
                >
                  {f.folioInterno} · {fs.label}{cobro}
                </Typography>
              </Tooltip>
            )}
          </Box>
        );
      },
    },
    {
      field: "acciones",
      headerName: "Acciones",
      align: "center",
      sticky: "right",
      renderCell: (row) => (
        <Box sx={{ display: "flex", gap: 0.5, justifyContent: "center" }}>
          <MenuAcciones
            acciones={[
              { label: "Ver / editar", icon: <VisibilityOutlinedIcon fontSize="small" />, onClick: () => abrirEditar(row) },
              {
                label: "Crear reporte de servicio", icon: <AssignmentOutlinedIcon fontSize="small" />,
                disabled: !["aprobada", "facturada"].includes(row.status), hint: "Solo cotizaciones aprobadas",
                onClick: () => navigate(`/reportes?${new URLSearchParams({ nuevo: "1", cotizacion: row.id, cliente: row.cliente }).toString()}`),
              },
              {
                label: "Generar factura", icon: <ReceiptLongOutlinedIcon fontSize="small" />,
                disabled: row.status !== "aprobada", hint: "Solo cotizaciones aprobadas",
                onClick: () => generarFactura(row),
              },
              { label: "Imprimir / descargar PDF", icon: <FileDownloadOutlinedIcon fontSize="small" />, onClick: () => window.open(`/informe/cotizacion/${row._id}`, "_blank") },
              { label: "Duplicar cotización", icon: <ContentCopyOutlinedIcon fontSize="small" />, onClick: () => abrirDuplicar(row) },
              { label: "Eliminar", icon: <DeleteOutlineIcon fontSize="small" />, color: "error", separador: true, onClick: () => setDeleteTarget(row) },
            ]}
          />
        </Box>
      ),
    },
  ];

  return (
    <Box>
      <PageHeader
        icon={<RequestQuoteOutlinedIcon />}
        title="Cotizaciones"
        subtitle={`${totalCount} registros en total`}
        actions={
          <AppButton startIcon={<AddIcon />} onClick={abrirNueva} sx={{ borderRadius: 2 }}>
            Nueva Cotización
          </AppButton>
        }
      />

      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2,1fr)", md: "repeat(4,1fr)" }, gap: 2.5, mb: 3.5 }}>
        <StatCard label="Pendientes (página)" value={cuenta("pendiente")} icon={<PendingActionsOutlinedIcon />} color="#D97706" />
        <StatCard label="Aprobadas (página)" value={cuenta("aprobada")} icon={<CheckCircleOutlineIcon />} color="#16A34A" />
        <StatCard label="Rechazadas (página)" value={cuenta("rechazada")} icon={<HighlightOffOutlinedIcon />} color="#DC2626" />
        <StatCard label="Aprobado + Facturado" value={formatCurrency(totalAprobado)} icon={<PaidOutlinedIcon />} color="#0F766E" />
      </Box>

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
        dense
        onRowClick={abrirEditar}
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
        prefill={prefillCotizacion}
        onClose={cerrarDialog}
        onSaved={alGuardar}
        onGenerarFactura={(cot) => { cerrarDialog(); generarFactura({ id: cot._id, cliente: cot.cliente?._id || cot.cliente, total: cot.total, folio: cot.folio }); }}
        onDuplicar={(id) => { setCotizacionEditando(null); setDuplicarDesde(id); }}
      />
    </Box>
  );
}
