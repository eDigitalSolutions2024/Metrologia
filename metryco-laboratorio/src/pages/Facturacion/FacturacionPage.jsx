import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Box, Typography, Chip, TextField, InputAdornment, MenuItem, Select, FormControl, InputLabel, Alert, IconButton, Menu, ListItemIcon, ListItemText, Snackbar, Tooltip } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import AddIcon from "@mui/icons-material/Add";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import PendingActionsOutlinedIcon from "@mui/icons-material/PendingActionsOutlined";
import VerifiedOutlinedIcon from "@mui/icons-material/VerifiedOutlined";
import ReportProblemOutlinedIcon from "@mui/icons-material/ReportProblemOutlined";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import CodeOutlinedIcon from "@mui/icons-material/CodeOutlined";
import PaymentsOutlinedIcon from "@mui/icons-material/PaymentsOutlined";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import AccountBalanceOutlinedIcon from "@mui/icons-material/AccountBalanceOutlined";
import CreditCardOutlinedIcon from "@mui/icons-material/CreditCardOutlined";
import HelpOutlineOutlinedIcon from "@mui/icons-material/HelpOutlineOutlined";
import SearchIcon from "@mui/icons-material/Search";
import MenuBookOutlinedIcon from "@mui/icons-material/MenuBookOutlined";
import BusinessOutlinedIcon from "@mui/icons-material/BusinessOutlined";
import NumbersOutlinedIcon from "@mui/icons-material/NumbersOutlined";

import AppButton from "../../shared/components/AppButton";
import AppTable from "../../shared/components/AppTable";
import PageHeader from "../../shared/components/PageHeader";
import StatCard from "../../shared/components/StatCard";
import ConfirmDialog from "../../shared/components/ConfirmDialog";
import { usePolling } from "../../shared/hooks/usePolling";
import { useDebounce } from "../../shared/hooks/useDebounce";
import { formatDateShort } from "../../shared/utils/formatDate";
import { formatCurrency } from "../../shared/utils/currency";
import { listarClientes } from "../../services/clientes";
import { listarCfdi, obtenerCfdi, descargarPdfCfdi, descargarXmlCfdi, eliminarCfdi } from "../../services/cfdi";
import CrearCfdiDialog from "./CrearCfdiDialog";
import CfdiDetalleDialog from "./CfdiDetalleDialog";
import { ESTADO_CFDI_CHIP, FORMAS_PAGO_SAT } from "./estadosCfdi";

const ICONOS_FORMA_PAGO = {
  "01": PaymentsOutlinedIcon,
  "02": ReceiptLongOutlinedIcon,
  "03": AccountBalanceOutlinedIcon,
  "04": CreditCardOutlinedIcon,
  "28": CreditCardOutlinedIcon,
  "99": HelpOutlineOutlinedIcon,
};

function CeldaIcono({ icon: Icon, wrap = false, children }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.9 }}>
      <Icon sx={{ fontSize: 16, color: "text.secondary", flexShrink: 0 }} />
      <Typography variant="body2" fontSize={13.5} fontWeight={wrap ? 600 : 400} sx={{ whiteSpace: wrap ? "normal" : "nowrap", lineHeight: 1.3 }}>{children}</Typography>
    </Box>
  );
}

const TIPOS_PAGO = [
  { v: "pue", l: "Una exhibición (PUE)" },
  { v: "ppd", l: "Parcialidades (PPD)" },
  { v: "complemento", l: "Complementos de pago" },
];

function descargarBlob(blob, nombre) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = nombre;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function AccionesMenu({ row, onVerDetalle, onCancelar, onRegistrarPago, onDescargarPdf, onVerXml, onEliminar }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const esFacturaPPD = row.tipoComprobante === "I" && row.metodoPago === "PPD";
  const saldo = row.saldoPendiente ?? (esFacturaPPD ? row.total : null);
  const puedeCancelar = row.estado === "timbrada";
  const puedeRegistrarPago = row.estado === "timbrada" && esFacturaPPD && saldo > 0;
  const puedeEliminar = ["borrador", "error_timbrado"].includes(row.estado);

  const cerrar = () => setAnchorEl(null);
  const accion = (fn) => () => { cerrar(); fn(row); };

  return (
    <>
      <Tooltip title="Acciones">
        <IconButton
          size="small"
          onClick={(e) => setAnchorEl(e.currentTarget)}
          sx={{ border: 1, borderColor: "divider", borderRadius: 1.5 }}
        >
          <MoreVertIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Menu anchorEl={anchorEl} open={!!anchorEl} onClose={cerrar}>
        <MenuItem onClick={accion(onVerDetalle)}>
          <ListItemIcon><VisibilityOutlinedIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Ver detalle</ListItemText>
        </MenuItem>
        <MenuItem onClick={accion(onVerXml)}>
          <ListItemIcon><CodeOutlinedIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Ver / descargar XML</ListItemText>
        </MenuItem>
        <MenuItem onClick={accion(onDescargarPdf)} disabled={!row.uuid}>
          <ListItemIcon><DownloadOutlinedIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Descargar PDF</ListItemText>
        </MenuItem>
        {puedeRegistrarPago && (
          <MenuItem onClick={accion(onRegistrarPago)}>
            <ListItemIcon><PaymentsOutlinedIcon fontSize="small" /></ListItemIcon>
            <ListItemText>Registrar pago</ListItemText>
          </MenuItem>
        )}
        {puedeCancelar && (
          <MenuItem onClick={accion(onCancelar)}>
            <ListItemIcon><CancelOutlinedIcon fontSize="small" color="error" /></ListItemIcon>
            <ListItemText sx={{ color: "error.main" }}>Cancelar CFDI</ListItemText>
          </MenuItem>
        )}
        {puedeEliminar && (
          <MenuItem onClick={accion(onEliminar)}>
            <ListItemIcon><DeleteOutlineIcon fontSize="small" color="error" /></ListItemIcon>
            <ListItemText sx={{ color: "error.main" }}>Eliminar borrador</ListItemText>
          </MenuItem>
        )}
      </Menu>
    </>
  );
}

export default function FacturacionPage() {
  const theme = useTheme();
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [clientes, setClientes] = useState([]);
  const [clienteId, setClienteId] = useState("");
  const [estado, setEstado] = useState("");
  const [tipoPago, setTipoPago] = useState("");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchParams, setSearchParams] = useSearchParams();
  const [prefill, setPrefill] = useState(() => {
    const cotizacion = searchParams.get("cotizacion");
    const cliente = searchParams.get("cliente");
    return cotizacion || cliente ? { cotizacion: cotizacion || "", cliente: cliente || "" } : null;
  });
  const [crearOpen, setCrearOpen] = useState(() => !!(searchParams.get("cotizacion") || searchParams.get("cliente")));
  const [detalle, setDetalle] = useState(null);
  const [accionInicial, setAccionInicial] = useState(null);
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);
  const [porEliminar, setPorEliminar] = useState(null);
  const [eliminando, setEliminando] = useState(false);

  // `silencioso` es para el refresco automático de abajo — sin esto, cada
  // 20s se vería un parpadeo del spinner de carga sobre la tabla aunque no
  // haya cambios reales.
  const cargar = useCallback((silencioso = false) => {
    if (!silencioso) setLoading(true);
    listarCfdi({ clienteId, estado, tipoPago, search: debouncedSearch, page, pageSize: rowsPerPage })
      .then(({ items, total }) => { setRows(items); setTotal(total); })
      .catch(() => { if (!silencioso) setError("No se pudieron cargar los comprobantes."); })
      .finally(() => { if (!silencioso) setLoading(false); });
  }, [clienteId, estado, tipoPago, debouncedSearch, page, rowsPerPage]);

  useEffect(() => { cargar(); }, [cargar]);
  useEffect(() => { listarClientes({ pageSize: 300 }).then(({ items }) => setClientes(items)).catch(() => {}); }, []);
  usePolling(() => cargar(true));

  // Enlace directo desde la ficha del cliente: /facturacion?cfdi=ID abre ese comprobante.
  const cfdiIdUrl = searchParams.get("cfdi");
  const accionUrl = searchParams.get("accion");
  useEffect(() => {
    if (!cfdiIdUrl) return;
    obtenerCfdi(cfdiIdUrl)
      .then((c) => { setAccionInicial(accionUrl === "pagar" ? "pagar" : null); setDetalle(c); })
      .catch(() => setError("No se encontró el comprobante solicitado."))
      .finally(() => setSearchParams({}, { replace: true }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cfdiIdUrl]);

  // Saldo pendiente real de una factura PPD (pago en parcialidades/diferido)
  // ya timbrada — solo tiene sentido para tipoComprobante "I" con
  // metodoPago "PPD"; el resto (Complementos de Pago, PUE) siempre es 0.
  const saldoDe = (r) => (
    r.tipoComprobante === "I" && r.metodoPago === "PPD" && r.estado === "timbrada"
      ? (r.saldoPendiente ?? r.total)
      : 0
  );

  const stats = [
    { t: "Total", v: total, icon: <ReceiptLongOutlinedIcon />, color: theme.palette.secondary.main },
    { t: "Borrador", v: rows.filter((r) => r.estado === "borrador").length, icon: <PendingActionsOutlinedIcon />, color: theme.palette.info.main },
    { t: "Timbradas", v: rows.filter((r) => r.estado === "timbrada").length, icon: <VerifiedOutlinedIcon />, color: theme.palette.success.main },
    { t: "Con saldo pendiente (PPD)", v: rows.filter((r) => saldoDe(r) > 0).length, icon: <PaymentsOutlinedIcon />, color: theme.palette.warning.main },
    { t: "Error / canceladas", v: rows.filter((r) => ["error_timbrado", "cancelada"].includes(r.estado)).length, icon: <ReportProblemOutlinedIcon />, color: theme.palette.error.main },
  ];

  const columns = [
    {
      field: "folio", headerName: "Comprobante", minWidth: 130,
      renderCell: (r, { compacto, estrecho }) => (
        <Box component="button" type="button" onClick={() => setDetalle(r)} sx={{ border: "none", background: "none", p: 0, cursor: "pointer", textAlign: "left", display: "block", width: "100%", maxWidth: 150 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.7 }}>
            <NumbersOutlinedIcon sx={{ fontSize: 16, color: "secondary.main" }} />
            <Tooltip title={compacto && r.uuid ? r.uuid : ""}>
              <Typography variant="body2" fontWeight={700} color="secondary.main">{r.folioInterno}</Typography>
            </Tooltip>
          </Box>
          {estrecho && (
            <Chip size="small" label={(ESTADO_CFDI_CHIP[r.estado] || { label: r.estado }).label} color={(ESTADO_CFDI_CHIP[r.estado] || {}).color || "default"} sx={{ mt: 0.5, height: 20, fontSize: 11 }} />
          )}
          {r.uuid && !compacto && (
            <Tooltip title={r.uuid}>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {r.uuid}
              </Typography>
            </Tooltip>
          )}
        </Box>
      ),
    },
    {
      field: "cliente", headerName: "Cliente", minWidth: 170,
      renderCell: (r) => (
        <Box sx={{ maxWidth: 190 }}>
          <CeldaIcono icon={BusinessOutlinedIcon} wrap>{r.receptor?.nombre || r.cliente?.nombre || "—"}</CeldaIcono>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", whiteSpace: "nowrap", pl: 2.6 }}>
            {[r.receptor?.rfc, formatDateShort(r.createdAt)].filter(Boolean).join(" · ")}
          </Typography>
        </Box>
      ),
    },
    { field: "total", headerName: "Total", width: 100, align: "right", nowrap: true, renderCell: (r) => <Typography fontWeight={700} fontSize={13.5}>{formatCurrency(r.total)}</Typography> },
    {
      field: "pago", headerName: "Pago", minWidth: 130, nowrap: true,
      renderCell: (r, { estrecho }) => {
        // Complemento de Pago: lo que interesa es cuánto se abonó.
        if (r.tipoComprobante === "P") {
          return (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <PaymentsOutlinedIcon fontSize="small" sx={{ color: "success.main" }} />
              <Box>
                <Typography variant="body2" fontSize={13} fontWeight={600} sx={{ lineHeight: 1.2 }}>Abono {formatCurrency(r.pago?.monto)}</Typography>
                <Typography variant="caption" color="text.secondary">Complemento de pago</Typography>
              </Box>
            </Box>
          );
        }
        if (r.tipoComprobante !== "I") return <Typography variant="caption" color="text.secondary">—</Typography>;
        const saldo = saldoDe(r);
        const esPPD = r.metodoPago === "PPD";
        const timbrada = r.estado === "timbrada";
        const FormaIcon = ICONOS_FORMA_PAGO[r.formaPago] || HelpOutlineOutlinedIcon;
        return (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <FormaIcon fontSize="small" sx={{ color: "text.secondary" }} />
            <Box>
              <Typography variant="body2" fontSize={13} fontWeight={600} sx={{ lineHeight: 1.2 }}>
                {FORMAS_PAGO_SAT[r.formaPago] || "—"}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", lineHeight: 1.3 }}>
                {/* Con poco espacio se muestra solo lo más importante: cuánto debe / si está pagada. */}
                {!(estrecho && (saldo > 0 || (timbrada && saldo === 0))) && (esPPD ? "Parcialidades" : "Una exhibición")}
                {saldo > 0 && <Box component="span" sx={{ color: "warning.main", fontWeight: 700 }}>{estrecho ? "" : " · "}Debe {formatCurrency(saldo)}</Box>}
                {timbrada && saldo === 0 && <Box component="span" sx={{ color: "success.main", fontWeight: 700 }}>{estrecho ? "" : " · "}Pagada</Box>}
              </Typography>
            </Box>
          </Box>
        );
      },
    },
    {
      field: "estado", headerName: "Estado", width: 120, nowrap: true, hideBelow: 820,
      renderCell: (r) => {
        const s = ESTADO_CFDI_CHIP[r.estado] || { label: r.estado, color: "default" };
        return <Chip size="small" label={s.label} color={s.color} />;
      },
    },
    {
      field: "acciones", headerName: "Acciones", align: "center", width: 70, sticky: "right",
      renderCell: (r) => (
        <AccionesMenu
          row={r}
          onVerDetalle={(row) => { setAccionInicial(null); setDetalle(row); }}
          onCancelar={(row) => { setAccionInicial("cancelar"); setDetalle(row); }}
          onRegistrarPago={(row) => { setAccionInicial("pagar"); setDetalle(row); }}
          onDescargarPdf={async (row) => {
            try { descargarBlob(await descargarPdfCfdi(row._id), `${row.folioInterno}.pdf`); }
            catch { setToast({ message: "No se pudo descargar el PDF.", severity: "error" }); }
          }}
          onVerXml={async (row) => {
            try {
              const blob = row.uuid ? await descargarXmlCfdi(row._id) : null;
              if (blob) { descargarBlob(blob, `${row.folioInterno}.xml`); return; }
              // Sin timbrar todavía: no hay XML final que descargar — se abre
              // el detalle, que sí sabe generar la vista previa sin firmar.
              setAccionInicial(null);
              setDetalle(row);
            } catch { setToast({ message: "No se pudo obtener el XML.", severity: "error" }); }
          }}
          onEliminar={(row) => setPorEliminar(row)}
        />
      ),
    },
  ];

  const confirmarEliminar = async () => {
    setEliminando(true);
    try {
      await eliminarCfdi(porEliminar._id);
      setPorEliminar(null);
      cargar();
      setToast({ message: `Borrador ${porEliminar.folioInterno} eliminado.`, severity: "success" });
    } catch (err) {
      setToast({ message: err.response?.data?.message || "No se pudo eliminar el comprobante.", severity: "error" });
    } finally {
      setEliminando(false);
    }
  };

  return (
    <Box>
      <PageHeader
        icon={<ReceiptLongOutlinedIcon />}
        title="Facturación (CFDI)"
        subtitle={`${total} comprobantes · Etapa 2 — requiere PAC configurado para timbrar de verdad`}
        actions={
          <>
          <AppButton
            variant="outlined" startIcon={<MenuBookOutlinedIcon />} sx={{ borderRadius: 2 }}
            onClick={() => window.open("/Guia-Timbrado-Facturas-CFDI.pdf", "_blank")}
          >
            Guía de timbrado
          </AppButton>
          <AppButton startIcon={<AddIcon />} onClick={() => { setPrefill(null); setCrearOpen(true); }} sx={{ borderRadius: 2 }}>
            Nuevo comprobante
          </AppButton>
          </>
        }
      />

      <Alert severity="info" sx={{ mb: 2.5, borderRadius: 2 }}>
        Esta pantalla es distinta de <b>Cuentas por Cobrar</b> (Cobranza): ahí se lleva el control de qué se cobró
        y cuándo; aquí se genera el comprobante fiscal (CFDI) formal ante el SAT.
      </Alert>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2,1fr)", md: "repeat(3,1fr)", lg: "repeat(5,1fr)" }, gap: 2.5, mb: 3.5 }}>
        {stats.map((s) => <StatCard key={s.t} label={s.t} value={s.v} icon={s.icon} color={s.color} />)}
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError("")}>{error}</Alert>}

      <Box sx={{ display: "flex", gap: 2, mb: 2, flexWrap: "wrap" }}>
        <TextField
          size="small" placeholder="Buscar por folio, UUID, RFC o cliente…"
          value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          sx={{ minWidth: 300, "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
          slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> } }}
        />
        <FormControl size="small" sx={{ minWidth: 220 }}>
          <InputLabel shrink>Cliente</InputLabel>
          <Select label="Cliente" notched displayEmpty value={clienteId} onChange={(e) => { setClienteId(e.target.value); setPage(0); }} sx={{ borderRadius: 2 }}>
            <MenuItem value="">Todos</MenuItem>
            {clientes.map((c) => <MenuItem key={c._id} value={c._id}>{c.nombre}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel shrink>Estado</InputLabel>
          <Select label="Estado" notched displayEmpty value={estado} onChange={(e) => { setEstado(e.target.value); setPage(0); }} sx={{ borderRadius: 2 }}>
            <MenuItem value="">Todos</MenuItem>
            {Object.entries(ESTADO_CFDI_CHIP).map(([k, v]) => <MenuItem key={k} value={k}>{v.label}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 220 }}>
          <InputLabel shrink>Tipo de pago</InputLabel>
          <Select label="Tipo de pago" notched displayEmpty value={tipoPago} onChange={(e) => { setTipoPago(e.target.value); setPage(0); }} sx={{ borderRadius: 2 }}>
            <MenuItem value="">Todos</MenuItem>
            {TIPOS_PAGO.map((t) => <MenuItem key={t.v} value={t.v}>{t.l}</MenuItem>)}
          </Select>
        </FormControl>
      </Box>

      <AppTable
        columns={columns}
        rows={rows.map((r) => ({ ...r, id: r._id }))}
        loading={loading}
        totalCount={total}
        page={page}
        rowsPerPage={rowsPerPage}
        onPageChange={setPage}
        onRowsPerPageChange={(n) => { setRowsPerPage(n); setPage(0); }}
        dense
        emptyText="Sin comprobantes fiscales"
        onRowClick={(row) => { setAccionInicial(null); setDetalle(row); }}
      />

      <CrearCfdiDialog
        open={crearOpen}
        prefill={prefill}
        onClose={() => { setCrearOpen(false); setPrefill(null); setSearchParams({}, { replace: true }); }}
        onCreado={(cfdi) => { setCrearOpen(false); setPrefill(null); setSearchParams({}, { replace: true }); cargar(); setDetalle(cfdi); }}
      />
      <CfdiDetalleDialog
        cfdi={detalle}
        accionInicial={accionInicial}
        onClose={() => { setDetalle(null); setAccionInicial(null); }}
        onCambiado={(actualizado) => { setDetalle(actualizado); cargar(); }}
        onEliminado={(eliminado) => {
          setDetalle(null); setAccionInicial(null); cargar();
          setToast({ message: `Borrador ${eliminado.folioInterno} eliminado.`, severity: "success" });
        }}
      />
      <ConfirmDialog
        open={!!porEliminar}
        title="Eliminar borrador"
        message={`¿Eliminar el borrador ${porEliminar?.folioInterno}? Esto no se puede deshacer. Un CFDI ya timbrado nunca se puede eliminar — solo cancelar.`}
        loading={eliminando}
        onCancel={() => setPorEliminar(null)}
        onConfirm={confirmarEliminar}
      />
      <Snackbar
        open={!!toast}
        autoHideDuration={5000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        {toast && (
          <Alert severity={toast.severity} variant="filled" onClose={() => setToast(null)} sx={{ borderRadius: 2 }}>
            {toast.message}
          </Alert>
        )}
      </Snackbar>
    </Box>
  );
}
