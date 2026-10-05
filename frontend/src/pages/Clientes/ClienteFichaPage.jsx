import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Box, Typography, Chip, Alert, Grid, Tooltip, CircularProgress } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import BusinessOutlinedIcon from "@mui/icons-material/BusinessOutlined";
import RequestQuoteOutlinedIcon from "@mui/icons-material/RequestQuoteOutlined";
import AssignmentOutlinedIcon from "@mui/icons-material/AssignmentOutlined";
import PrecisionManufacturingOutlinedIcon from "@mui/icons-material/PrecisionManufacturingOutlined";
import WorkspacePremiumOutlinedIcon from "@mui/icons-material/WorkspacePremiumOutlined";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import PaymentsOutlinedIcon from "@mui/icons-material/PaymentsOutlined";
import ScheduleOutlinedIcon from "@mui/icons-material/ScheduleOutlined";
import VerifiedOutlinedIcon from "@mui/icons-material/VerifiedOutlined";
import ReportProblemOutlinedIcon from "@mui/icons-material/ReportProblemOutlined";
import PersonOutlineOutlinedIcon from "@mui/icons-material/PersonOutlineOutlined";
import PhoneOutlinedIcon from "@mui/icons-material/PhoneOutlined";
import MailOutlineOutlinedIcon from "@mui/icons-material/MailOutlineOutlined";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";

import AppButton from "../../shared/components/AppButton";
import AppCard from "../../shared/components/AppCard";
import PageHeader from "../../shared/components/PageHeader";
import StatCard from "../../shared/components/StatCard";
import { formatCurrency } from "../../shared/utils/currency";
import { formatDate } from "../../shared/utils/formatDate";
import { resumenCliente } from "../../services/clientes";
import { usePolling } from "../../shared/hooks/usePolling";
import { ESTADO_CFDI_CHIP } from "../Facturacion/estadosCfdi";

const STATUS_COTIZACION = {
  pendiente: { label: "Pendiente", color: "warning" },
  aprobada: { label: "Aprobada", color: "success" },
  rechazada: { label: "Rechazada", color: "error" },
  facturada: { label: "Facturada", color: "info" },
  vencida: { label: "Vencida", color: "default" },
};
const STATUS_REPORTE = {
  recepcion: { label: "Recepción", color: "info" },
  en_proceso: { label: "En proceso", color: "warning" },
  terminado: { label: "Terminado", color: "success" },
  entregado: { label: "Entregado", color: "success" },
  cancelado: { label: "Cancelado", color: "default" },
};
const ESTADO_CERT = {
  borrador: { label: "Borrador", color: "default" },
  vigente: { label: "Vigente", color: "success" },
  por_vencer: { label: "Por vencer", color: "warning" },
  vencido: { label: "Vencido", color: "error" },
  anulado: { label: "Anulado", color: "default" },
};

function Fila({ principal, secundario, chip, onClick }) {
  return (
    <Box
      onClick={onClick}
      sx={{
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, py: 1,
        borderBottom: 1, borderColor: "divider", "&:last-of-type": { borderBottom: 0 },
        cursor: onClick ? "pointer" : "default", "&:hover": onClick ? { bgcolor: "action.hover" } : {},
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="body2" fontWeight={700} noWrap>{principal}</Typography>
        <Typography variant="caption" color="text.secondary" noWrap>{secundario}</Typography>
      </Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, flexShrink: 0 }}>
        {chip}
        {onClick && <ChevronRightIcon fontSize="small" sx={{ color: "text.disabled" }} />}
      </Box>
    </Box>
  );
}

function Seccion({ titulo, icono, vacio, items, verTodo, children }) {
  return (
    <AppCard
      dense title={titulo} icon={icono}
      action={verTodo && <AppButton type="button" size="small" variant="text" onClick={verTodo}>Ver todo</AppButton>}
      sx={{ height: "100%" }}
    >
      {items.length === 0
        ? <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>{vacio}</Typography>
        : children}
    </AppCard>
  );
}

export default function ClienteFichaPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  return (
    <FichaContenido
      id={id}
      encabezado={(cliente) => (
        <PageHeader
          icon={<BusinessOutlinedIcon />}
          eyebrow="Ficha del cliente"
          title={cliente.nombre}
          subtitle={[cliente.rfc, cliente.domicilioFiscal?.ciudad].filter(Boolean).join(" · ") || "Sin RFC"}
          actions={
            <>
              <AppButton variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => navigate("/clientes")} sx={{ borderRadius: 2 }}>Clientes</AppButton>
              <AppButton startIcon={<EditOutlinedIcon />} onClick={() => navigate(`/clientes/${id}/editar`)} sx={{ borderRadius: 2 }}>Editar</AppButton>
            </>
          }
        />
      )}
    />
  );
}

// Cuerpo de la ficha, reutilizado por la página completa y por el panel
// lateral de la tabla de Clientes (`compacto` = una columna, para el panel).
export function FichaContenido({ id, encabezado, compacto = false }) {
  const navigate = useNavigate();
  const theme = useTheme();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  const cargar = useCallback(() => {
    resumenCliente(id)
      .then(setData)
      .catch((err) => setError(err.response?.data?.message || "No se pudo cargar la ficha del cliente."));
  }, [id]);

  useEffect(() => { cargar(); }, [cargar]);
  usePolling(cargar);

  if (error) return <Alert severity="error" sx={{ borderRadius: 2 }}>{error}</Alert>;
  if (!data) return <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}><CircularProgress /></Box>;

  const { cliente, cotizaciones, reportes, equipos, certificados, cfdi, cobranza } = data;
  const faltantes = [
    !cliente.rfc && "RFC", !cliente.regimenFiscal && "régimen fiscal",
    !cliente.usoCFDI && "uso de CFDI", !cliente.domicilioFiscal?.cp && "CP fiscal",
  ].filter(Boolean);

  const stats = [
    { t: "Aprobado / facturado", v: formatCurrency(cotizaciones.aprobado), icon: <RequestQuoteOutlinedIcon />, color: theme.palette.secondary.main },
    { t: "Reportes abiertos", v: reportes.abiertos, icon: <AssignmentOutlinedIcon />, color: theme.palette.info.main },
    { t: "Equipos activos", v: equipos.activos, icon: <PrecisionManufacturingOutlinedIcon />, color: theme.palette.primary.main },
    { t: "Certificados vigentes", v: certificados.vigentes, icon: <WorkspacePremiumOutlinedIcon />, color: theme.palette.success.main,
      hint: certificados.porVencer ? `${certificados.porVencer} por vencer en 30 días` : undefined },
    { t: "Saldo pendiente (PPD)", v: formatCurrency(cfdi.saldoPendiente), icon: <ScheduleOutlinedIcon />, color: theme.palette.warning.main },
    { t: "Cobranza atrasada", v: formatCurrency(cobranza.atrasado), icon: <PaymentsOutlinedIcon />, color: theme.palette.error.main },
  ];

  return (
    <Box>
      {encabezado?.(cliente)}

      <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", alignItems: "center", mb: 2.5 }}>
        <Chip size="small" label={cliente.status === "activo" ? "Activo" : "Inactivo"} color={cliente.status === "activo" ? "success" : "default"} />
        {faltantes.length === 0
          ? <Chip size="small" color="success" variant="outlined" icon={<VerifiedOutlinedIcon />} label="Listo para facturar" />
          : (
            <Tooltip title={`Falta: ${faltantes.join(", ")}`}>
              <Chip size="small" color="warning" variant="outlined" icon={<ReportProblemOutlinedIcon />} label={`Datos fiscales incompletos (${faltantes.length})`} />
            </Tooltip>
          )}
        {cliente.diasCredito !== undefined && (
          <Chip size="small" variant="outlined" icon={<ScheduleOutlinedIcon />} label={cliente.diasCredito > 0 ? `Crédito ${cliente.diasCredito} días` : "Contado"} />
        )}
        {cliente.contacto?.nombre && <Chip size="small" variant="outlined" icon={<PersonOutlineOutlinedIcon />} label={cliente.contacto.nombre} />}
        {cliente.contacto?.telefono && <Chip size="small" variant="outlined" icon={<PhoneOutlinedIcon />} label={cliente.contacto.telefono} />}
        {cliente.contacto?.emailCotizaciones && <Chip size="small" variant="outlined" icon={<MailOutlineOutlinedIcon />} label={cliente.contacto.emailCotizaciones} />}
      </Box>

      <Box sx={{ display: "grid", gridTemplateColumns: compacto ? "repeat(2,1fr)" : { xs: "1fr", sm: "repeat(2,1fr)", lg: "repeat(3,1fr)" }, gap: 2.5, mb: 3 }}>
        {stats.map((s) => <StatCard key={s.t} label={s.t} value={s.v} icon={s.icon} color={s.color} hint={s.hint} />)}
      </Box>

      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, md: compacto ? 12 : 6 }}>
          <Seccion titulo={`Cotizaciones (${cotizaciones.total})`} icono={<RequestQuoteOutlinedIcon />} vacio="Sin cotizaciones" items={cotizaciones.ultimas} verTodo={() => navigate("/cotizaciones")}>
            {cotizaciones.ultimas.map((q) => {
              const s = STATUS_COTIZACION[q.status] || { label: q.status, color: "default" };
              return <Fila key={q._id} onClick={() => navigate(`/cotizaciones?editar=${q._id}`)} principal={q.folio} secundario={`${formatDate(q.fecha)} · ${formatCurrency(q.total)}`} chip={<Chip size="small" label={s.label} color={s.color} />} />;
            })}
          </Seccion>
        </Grid>
        <Grid size={{ xs: 12, md: compacto ? 12 : 6 }}>
          <Seccion titulo={`Reportes (${reportes.total})`} icono={<AssignmentOutlinedIcon />} vacio="Sin reportes" items={reportes.ultimos} verTodo={() => navigate("/reportes")}>
            {reportes.ultimos.map((r) => {
              const s = STATUS_REPORTE[r.status] || { label: r.status, color: "default" };
              return <Fila key={r._id} onClick={() => navigate(`/reportes/${r._id}`)} principal={r.folio} secundario={formatDate(r.createdAt)} chip={<Chip size="small" label={s.label} color={s.color} />} />;
            })}
          </Seccion>
        </Grid>
        <Grid size={{ xs: 12, md: compacto ? 12 : 6 }}>
          <Seccion titulo={`Certificados (${certificados.total})`} icono={<WorkspacePremiumOutlinedIcon />} vacio="Sin certificados" items={certificados.ultimos} verTodo={() => navigate("/reportes/certificados")}>
            {certificados.ultimos.map((c) => {
              const s = ESTADO_CERT[c.estado] || { label: c.estado, color: "default" };
              return <Fila key={c._id} onClick={() => window.open(`/informe/certificado/${c._id}`, "_blank")} principal={c.folio} secundario={c.vigencia ? `Vigencia ${formatDate(c.vigencia)}` : "Sin vigencia"} chip={<Chip size="small" label={s.label} color={s.color} />} />;
            })}
          </Seccion>
        </Grid>
        <Grid size={{ xs: 12, md: compacto ? 12 : 6 }}>
          <Seccion titulo={`Facturas CFDI (${cfdi.total})`} icono={<ReceiptLongOutlinedIcon />} vacio="Sin facturas" items={cfdi.ultimos} verTodo={() => navigate("/facturacion")}>
            {cfdi.ultimos.map((f) => {
              const s = ESTADO_CFDI_CHIP[f.estado] || { label: f.estado, color: "default" };
              const tipo = f.tipoComprobante === "P" ? "Complemento de pago" : f.metodoPago === "PPD" ? "Parcialidades" : "Una exhibición";
              return <Fila key={f._id} onClick={() => navigate(`/facturacion?cfdi=${f._id}`)} principal={f.folioInterno} secundario={`${tipo} · ${formatCurrency(f.total)}`} chip={<Chip size="small" label={s.label} color={s.color} />} />;
            })}
          </Seccion>
        </Grid>
      </Grid>
    </Box>
  );
}
