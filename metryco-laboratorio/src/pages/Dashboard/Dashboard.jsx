import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Grid, Box, Typography, Divider, Chip, Avatar, LinearProgress, Skeleton,
} from "@mui/material";
import {
  PeopleAltOutlined, DescriptionOutlined, PrecisionManufacturingOutlined,
  WorkspacePremiumOutlined, CheckCircleOutlineOutlined, BlockOutlined, ReceiptLongOutlined,
} from "@mui/icons-material";
import { useTheme } from "@mui/material/styles";
import { formatCurrency } from "../../shared/utils/currency";
import { formatDate } from "../../shared/utils/formatDate";
import PageHeader from "../../shared/components/PageHeader";
import StatCard from "../../shared/components/StatCard";
import AppCard from "../../shared/components/AppCard";
import { listarClientes } from "../../services/clientes";
import { listarCotizaciones } from "../../services/cotizaciones";
import { listarCertificados } from "../../services/certificados";
import { listarReportes } from "../../services/reportes";
import { useAuth } from "../../core/auth/useAuth";

const STATUS_MAP = {
  pendiente: { label: "Pendiente", color: "warning" },
  aprobada:  { label: "Aprobada",  color: "success" },
  rechazada: { label: "Rechazada", color: "error" },
  facturada: { label: "Facturada", color: "info" },
  vencida:   { label: "Vencida",   color: "default" },
};
const ESTADOS = ["pendiente", "aprobada", "rechazada", "facturada", "vencida"];
const ESTADO_COLOR = {
  pendiente: "#D97706", aprobada: "#16A34A", rechazada: "#DC2626", facturada: "#2563EB", vencida: "#64748B",
};

function mesActual() {
  const s = new Date().toLocaleDateString("es-MX", { month: "long", year: "numeric" });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function Dashboard() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { user } = useAuth();
  // Clientes/Cotizaciones son datos comerciales — el técnico no tiene permiso
  // de leerlos (ver cliente.routes.js/cotizacion.routes.js), así que ni se piden.
  const puedeVerComercial = ["admin", "coordinador", "ventas"].includes(user?.rol);

  const [cargando, setCargando] = useState(true);
  const [datos, setDatos] = useState({ clientes: 0, cotizaciones: 0, pendientes: 0, certificados: 0, reportes: 0 });
  const [recientes, setRecientes] = useState([]);
  const [porEstado, setPorEstado] = useState({});

  useEffect(() => {
    let cancelado = false;
    (async () => {
      setCargando(true);
      try {
        const [cli, cot, pend, cert, rep, recientesRes, ...est] = await Promise.all([
          puedeVerComercial ? listarClientes({ pageSize: 1 }) : Promise.resolve({ total: 0 }),
          puedeVerComercial ? listarCotizaciones({ pageSize: 1 }) : Promise.resolve({ total: 0 }),
          puedeVerComercial ? listarCotizaciones({ pageSize: 1, status: "pendiente" }) : Promise.resolve({ total: 0 }),
          listarCertificados({ pageSize: 1 }).catch(() => ({ total: 0 })),
          listarReportes({ pageSize: 1 }).catch(() => ({ total: 0 })),
          puedeVerComercial ? listarCotizaciones({ pageSize: 5 }) : Promise.resolve({ items: [] }),
          ...ESTADOS.map((status) => puedeVerComercial ? listarCotizaciones({ pageSize: 1, status }) : Promise.resolve({ total: 0 })),
        ]);
        if (cancelado) return;
        setDatos({
          clientes: cli.total, cotizaciones: cot.total, pendientes: pend.total,
          certificados: cert.total, reportes: rep.total,
        });
        setRecientes(recientesRes.items);
        setPorEstado(ESTADOS.reduce((a, s, i) => ((a[s] = est[i].total), a), {}));
      } catch { /* vacío */ }
      finally { if (!cancelado) setCargando(false); }
    })();
    return () => { cancelado = true; };
  }, [puedeVerComercial]);

  const stats = [
    ...(puedeVerComercial ? [
      { label: "Clientes", value: datos.clientes, icon: <PeopleAltOutlined />, color: theme.palette.secondary.main, hint: "Registrados", onClick: () => navigate("/clientes") },
      { label: "Cotizaciones", value: datos.cotizaciones, icon: <DescriptionOutlined />, color: theme.palette.success.main, hint: `${datos.pendientes} pendientes`, onClick: () => navigate("/cotizaciones") },
    ] : []),
    { label: "Reportes de servicio", value: datos.reportes, icon: <PrecisionManufacturingOutlined />, color: theme.palette.warning.main, hint: "En el sistema", onClick: () => navigate("/reportes") },
    { label: "Certificados", value: datos.certificados, icon: <WorkspacePremiumOutlined />, color: theme.palette.info.main, hint: "Emitidos", onClick: () => navigate("/reportes/certificados") },
  ];

  const totalEstados = ESTADOS.reduce((s, e) => s + (porEstado[e] || 0), 0) || 1;

  return (
    <Box>
      <PageHeader title="Panel general" subtitle={`Resumen del laboratorio — ${mesActual()}`} />

      <Grid container spacing={2.5} sx={{ mb: 3.5 }}>
        {stats.map((s) => (
          <Grid key={s.label} size={{ xs: 12, sm: 6, md: 3 }}>
            <Box onClick={s.onClick} sx={{ cursor: "pointer", height: "100%" }}>
              {cargando ? (
                <Skeleton variant="rounded" height={128} sx={{ borderRadius: 3.5 }} />
              ) : (
                <StatCard label={s.label} value={s.value} icon={s.icon} color={s.color} hint={s.hint} />
              )}
            </Box>
          </Grid>
        ))}
      </Grid>

      {puedeVerComercial && (
      <Grid container spacing={2.5} sx={{ alignItems: "stretch" }}>
        <Grid size={{ xs: 12, md: 8 }}>
          <AppCard
            title="Cotizaciones recientes"
            action={<Chip label="Ver todas" size="small" clickable onClick={() => navigate("/cotizaciones")} />}
            sx={{ height: "100%" }}
          >
            {cargando ? (
              Array.from({ length: 5 }).map((_, i) => (
                <Box key={i} sx={{ display: "flex", alignItems: "center", gap: 2, py: 1.25 }}>
                  <Skeleton variant="circular" width={34} height={34} />
                  <Skeleton variant="text" width="100%" />
                </Box>
              ))
            ) : recientes.length === 0 ? (
              <Box sx={{ py: 6, textAlign: "center" }}>
                <Typography color="text.secondary" variant="body2">Todavía no hay cotizaciones registradas.</Typography>
              </Box>
            ) : (
              recientes.map((c, i) => {
                const s = STATUS_MAP[c.status] ?? { label: c.status, color: "default" };
                const cliente = c.clienteInfo?.nombre || c.cliente?.nombre || "—";
                return (
                  <Box key={c._id}>
                    <Box
                      onClick={() => navigate(`/cotizaciones?editar=${c._id}`)}
                      sx={{
                        display: "grid", gridTemplateColumns: "minmax(0,1fr) 110px 120px 110px",
                        alignItems: "center", gap: 2, py: 1.5, px: 1, cursor: "pointer",
                        borderRadius: 2, transition: "background-color .15s ease",
                        "&:hover": { bgcolor: "action.hover" },
                      }}
                    >
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0 }}>
                        <Avatar sx={{ width: 34, height: 34, flexShrink: 0, fontSize: 14, fontWeight: 700, bgcolor: theme.palette.secondary.main + "1F", color: "secondary.main" }}>
                          {cliente.charAt(0)}
                        </Avatar>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="body2" fontWeight={600} noWrap>{c.folio}</Typography>
                          <Typography variant="caption" color="text.secondary" noWrap sx={{ display: "block" }}>{cliente}</Typography>
                        </Box>
                      </Box>
                      <Typography variant="caption" color="text.secondary" noWrap>{formatDate(c.fecha)}</Typography>
                      <Typography variant="body2" fontWeight={700} noWrap>{formatCurrency(c.total)}</Typography>
                      <Chip label={s.label} color={s.color} size="small" />
                    </Box>
                    {i < recientes.length - 1 && <Divider />}
                  </Box>
                );
              })
            )}
          </AppCard>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <AppCard title="Cotizaciones por estado" sx={{ height: "100%" }}>
            {cargando ? (
              Array.from({ length: 4 }).map((_, i) => (
                <Box key={i} sx={{ mb: 2.5 }}>
                  <Skeleton variant="text" width="60%" />
                  <Skeleton variant="rounded" height={6} sx={{ borderRadius: 4 }} />
                </Box>
              ))
            ) : (
              ESTADOS.map((estado) => {
                const cant = porEstado[estado] || 0;
                const pct = Math.round((cant / totalEstados) * 100);
                return (
                  <Box key={estado} sx={{ mb: 2.25 }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.75 }}>
                      <Typography variant="body2" fontWeight={600}>{STATUS_MAP[estado].label}</Typography>
                      <Typography variant="body2" color="text.secondary">{cant}</Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate" value={pct}
                      sx={{ height: 6, borderRadius: 999, bgcolor: "action.hover", "& .MuiLinearProgress-bar": { bgcolor: ESTADO_COLOR[estado], borderRadius: 999 } }}
                    />
                  </Box>
                );
              })
            )}

            <Divider sx={{ my: 2 }} />

            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 1 }}>
              {[
                { icon: <CheckCircleOutlineOutlined sx={{ fontSize: 16 }} />, valor: porEstado.aprobada || 0, label: "Aprobadas", color: theme.palette.success.main },
                { icon: <BlockOutlined sx={{ fontSize: 16 }} />, valor: porEstado.rechazada || 0, label: "Rechazadas", color: theme.palette.error.main },
                { icon: <ReceiptLongOutlined sx={{ fontSize: 16 }} />, valor: porEstado.facturada || 0, label: "Facturadas", color: theme.palette.secondary.main },
              ].map((r) => (
                <Box key={r.label} sx={{ textAlign: "center" }}>
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0.75 }}>
                    <Box sx={{ width: 28, height: 28, borderRadius: 2, display: "grid", placeItems: "center", background: r.color + "18", color: r.color }}>
                      {r.icon}
                    </Box>
                    <Typography variant="h6" fontWeight={800} sx={{ color: r.color }}>{r.valor}</Typography>
                  </Box>
                  <Typography variant="caption" color="text.secondary">{r.label}</Typography>
                </Box>
              ))}
            </Box>
          </AppCard>
        </Grid>
      </Grid>
      )}
    </Box>
  );
}
