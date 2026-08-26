import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Grid,
  Paper,
  Typography,
  Box,
  Divider,
  Chip,
  Avatar,
  LinearProgress,
  Skeleton,
} from "@mui/material";
import {
  People,
  Description,
  Engineering,
  AttachMoney,
  TrendingUp,
  CheckCircle,
  Cancel,
  ReceiptLong,
} from "@mui/icons-material";
import { useTheme } from "@mui/material/styles";
import { formatCurrency } from "../../shared/utils/currency";
import { formatDate } from "../../shared/utils/formatDate";
import { listarClientes } from "../../services/clientes";
import { listarCotizaciones } from "../../services/cotizaciones";

const COTIZACION_STATUS_MAP = {
  pendiente: { label: "Pendiente", color: "warning" },
  aprobada:  { label: "Aprobada",  color: "success" },
  rechazada: { label: "Rechazada", color: "error" },
  facturada: { label: "Facturada", color: "info" },
  vencida:   { label: "Vencida",   color: "default" },
};

const ESTADOS_COTIZACION = ["pendiente", "aprobada", "rechazada", "facturada", "vencida"];

const ESTADO_COLOR = {
  pendiente: "#F59E0B",
  aprobada: "#22C55E",
  rechazada: "#EF4444",
  facturada: "#2563EB",
  vencida: "#6B7280",
};

function getFechaHoy() {
  const hoy = new Date();

  const fechaFormateada = hoy.toLocaleDateString("es-MX", {
    month: "long",
    year: "numeric",
  });
  return (
    fechaFormateada.charAt(0).toLocaleUpperCase() + fechaFormateada.slice(1)
  );
}

export default function Dashboard() {
  const theme = useTheme();
  const navigate = useNavigate();
  const fechaFormateada = getFechaHoy();

  const [cargandoStats, setCargandoStats] = useState(true);
  const [cargandoDetalle, setCargandoDetalle] = useState(true);
  const [datos, setDatos] = useState({ totalClientes: 0, totalCotizaciones: 0, cotizacionesPendientes: 0 });
  const [recientes, setRecientes] = useState([]);
  const [porEstado, setPorEstado] = useState({});

  useEffect(() => {
    let cancelado = false;

    (async () => {
      setCargandoStats(true);
      setCargandoDetalle(true);
      try {
        const [clientesRes, cotizacionesRes, pendientesRes, recientesRes, ...estadoRes] = await Promise.all([
          listarClientes({ pageSize: 1 }),
          listarCotizaciones({ pageSize: 1 }),
          listarCotizaciones({ pageSize: 1, status: "pendiente" }),
          listarCotizaciones({ pageSize: 5 }),
          ...ESTADOS_COTIZACION.map((status) => listarCotizaciones({ pageSize: 1, status })),
        ]);
        if (cancelado) return;

        setDatos({
          totalClientes: clientesRes.total,
          totalCotizaciones: cotizacionesRes.total,
          cotizacionesPendientes: pendientesRes.total,
        });
        setRecientes(recientesRes.items);
        setPorEstado(
          ESTADOS_COTIZACION.reduce((acc, status, i) => {
            acc[status] = estadoRes[i].total;
            return acc;
          }, {})
        );
      } catch {
        // Silencioso: si falla, las secciones simplemente muestran vacío
      } finally {
        if (!cancelado) {
          setCargandoStats(false);
          setCargandoDetalle(false);
        }
      }
    })();

    return () => {
      cancelado = true;
    };
  }, []);

  const stats = [
    {
      titulo: "Clientes Registrados",
      valor: datos.totalClientes,
      formato: "numero",
      real: true,
      icono: <People sx={{ fontSize: 32 }} />,
      color: theme.palette.secondary.main,
      sub: "Total en el sistema",
      onClick: () => navigate("/clientes"),
    },
    {
      titulo: "Cotizaciones",
      valor: datos.totalCotizaciones,
      formato: "numero",
      real: true,
      icono: <Description sx={{ fontSize: 32 }} />,
      color: theme.palette.success.main,
      sub: `${datos.cotizacionesPendientes} pendientes`,
      onClick: () => navigate("/cotizaciones"),
    },
    {
      titulo: "Equipos",
      valor: 412,
      formato: "numero",
      real: false,
      icono: <Engineering sx={{ fontSize: 32 }} />,
      color: theme.palette.warning.main,
      sub: "28 por calibrar",
      onClick: () => navigate("/equipos"),
    },
    {
      titulo: "Facturación",
      valor: 284600,
      formato: "moneda",
      real: false,
      icono: <AttachMoney sx={{ fontSize: 32 }} />,
      color: theme.palette.error.main,
      sub: "Junio 2025",
    },
  ];

  const totalPorEstado = ESTADOS_COTIZACION.reduce((s, e) => s + (porEstado[e] || 0), 0) || 1;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", width: "100%" }}>
      <Box sx={{ mb: "15px" }}>
        <Typography variant="h4" fontWeight={700}>
          Dashboard
        </Typography>
        <Typography /*color="text.secondary"*/>
          Resumen general — {fechaFormateada}
        </Typography>
      </Box>

      {/* Tarjetas de stats */}
      <Grid container spacing={4} sx={{ mb: 3.5 }}>
        {stats.map((card) => (
          <Grid key={card.titulo} size={{ xs: 12, sm: 6, md: 3 }}>
            <Paper
              elevation={0}
              onClick={card.onClick}
              sx={{
                p: 3.5,
                borderRadius: 3,
                border: 1,
                borderColor: "divider",
                cursor: card.onClick ? "pointer" : "default",
                transition: ".3s",
                "&:hover": {
                  transform: "translateY(-4px)",
                  boxShadow: "0 12px 30px rgba(0,0,0,.08)",
                },
              }}
            >
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <Box sx={{ minWidth: 0 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 1 }}>
                    <Typography color="text.secondary" variant="body2">
                      {card.titulo}
                    </Typography>
                    {!card.real && (
                      <Chip label="datos de prueba" size="small" variant="outlined" sx={{ height: 16, fontSize: 10 }} />
                    )}
                  </Box>
                  {cargandoStats && card.real ? (
                    <Skeleton variant="text" width={80} height={44} />
                  ) : (
                    <Typography variant="h4" fontWeight={800}>
                      {card.formato === "moneda"
                        ? formatCurrency(card.valor)
                        : card.valor}
                    </Typography>
                  )}
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    mt={1}
                    display="flex"
                    alignItems="center"
                    gap={0.4}
                  >
                    {card.tendencia && (
                      <TrendingUp
                        sx={{ fontSize: 14, color: "success.main" }}
                      />
                    )}
                    {card.sub}
                  </Typography>
                </Box>
                <Box sx={{ width: 60, height: 60, flexShrink: 0, borderRadius: 3, background: card.color + "18", color: card.color, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {card.icono}
                </Box>
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={4} sx={{ alignItems: "stretch" }}>
        {/* Cotizaciones recientes */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper
            elevation={0}
            sx={{
              borderRadius: 2,
              border: 1,
              borderColor: "divider",
              overflow: "hidden",
              width: "100%",
              padding: "25px",
            }}
          >
            <Box sx={{ borderBottom: 1, px: 3.5, py: 3, display: "flex", justifyContent: "space-between", alignItems: "center", borderColor: "divider" }}>
              <Typography fontWeight={700}>Cotizaciones Recientes</Typography>
              <Chip
                label="Ver todas"
                size="small"
                clickable
                onClick={() => navigate("/cotizaciones")}
                sx={{ borderRadius: 2, padding: "5px", mb: "10px", mt: "10px" }}
              />
            </Box>

            {cargandoDetalle ? (
              Array.from({ length: 5 }).map((_, i) => (
                <Box key={i} sx={{ display: "flex", alignItems: "center", gap: 2, p: 2 }}>
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
                const s = COTIZACION_STATUS_MAP[c.status] ?? { label: c.status, color: "default" };
                const clienteNombre = c.clienteInfo?.nombre || c.cliente?.nombre || "—";
                return (
                  <Box key={c._id}>
                    <Box
                      onClick={() => navigate(`/cotizaciones?editar=${c._id}`)}
                      sx={{
                        display: "grid", gridTemplateColumns: "minmax(0, 1fr) 120px 120px 120px",
                        alignItems: "center", padding: 2, gap: 3, cursor: "pointer",
                        transition: ".3s",
                        "&:hover": { transform: "translateY(-2px)", bgcolor: "action.hover", borderRadius: "10px" },
                        borderRadius: "10px",
                      }}
                    >
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0 }}>
                        <Avatar
                          sx={{
                            width: 34, height: 34, flexShrink: 0,
                            bgcolor: theme.palette.secondary.main + "1F", color: "secondary.main",
                            fontSize: 14, fontWeight: 700,
                          }}
                        >
                          {clienteNombre.charAt(0)}
                        </Avatar>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="body2" fontWeight={600} noWrap>{c.folio}</Typography>
                          <Typography variant="caption" color="text.secondary" noWrap sx={{ display: "block" }}>
                            {clienteNombre}
                          </Typography>
                        </Box>
                      </Box>

                      <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: "nowrap" }}>
                        {formatDate(c.fecha)}
                      </Typography>

                      <Typography variant="body2" fontWeight={700} sx={{ whiteSpace: "nowrap" }}>
                        {formatCurrency(c.total)}
                      </Typography>

                      <Chip label={s.label} color={s.color} size="small" sx={{ whiteSpace: "nowrap" }} />
                    </Box>

                    {i < recientes.length - 1 && <Divider />}
                  </Box>
                );
              })
            )}
          </Paper>
        </Grid>

        {/* Cotizaciones por estado */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper
            elevation={0}
            sx={{ borderRadius: 2, border: 1, borderColor: "divider", p: 3.5 }}
          >
            <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
              Cotizaciones por Estado
            </Typography>

            {cargandoDetalle ? (
              Array.from({ length: 4 }).map((_, i) => (
                <Box key={i} sx={{ mb: 3 }}>
                  <Skeleton variant="text" width="60%" />
                  <Skeleton variant="rounded" height={8} sx={{ borderRadius: 4 }} />
                </Box>
              ))
            ) : (
              ESTADOS_COTIZACION.map((estado) => {
                const cantidad = porEstado[estado] || 0;
                const porcentaje = Math.round((cantidad / totalPorEstado) * 100);
                const s = COTIZACION_STATUS_MAP[estado];
                return (
                  <Box key={estado} sx={{ mb: 3, padding: "8px", transition: ".3s", "&:hover": {
                        transform: "translateY(-2px)",
                        bgcolor: "action.hover",
                        borderRadius: "10px",
                      } }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.75 }}>
                      <Typography variant="body1" fontWeight={600}>
                        {s.label}
                      </Typography>
                      <Typography variant="body1" color="text.secondary">
                        {cantidad} {cantidad === 1 ? "cotización" : "cotizaciones"}
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={porcentaje}
                      sx={{
                        height: 8,
                        borderRadius: 4,
                        bgcolor: "action.hover",
                        "& .MuiLinearProgress-bar": {
                          bgcolor: ESTADO_COLOR[estado],
                          borderRadius: 4,
                        },
                      }}
                    />
                  </Box>
                );
              })
            )}

            <Divider sx={{ my: 2 }} />

            <Box sx={{ textAlign: "center", margin: "10px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr" }}>
              {[
                { icono: <CheckCircle sx={{ fontSize: 16 }} />, valor: porEstado.aprobada || 0, label: "Aprobadas", color: theme.palette.success.main },
                { icono: <Cancel sx={{ fontSize: 16 }} />, valor: porEstado.rechazada || 0, label: "Rechazadas", color: theme.palette.error.main },
                { icono: <ReceiptLong sx={{ fontSize: 16 }} />, valor: porEstado.facturada || 0, label: "Facturadas", color: theme.palette.secondary.main },
              ].map((resumen) => (
                <Box key={resumen.label} sx={{ width: "100%", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 0.5 }}>
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" }}>
                    <Box sx={{ width: 32, height: 32, borderRadius: "50%", background: resumen.color + "18", color: resumen.color, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {resumen.icono}
                    </Box>
                    <Typography
                      variant="h5"
                      fontWeight={800}
                      sx={{ color: resumen.color }}
                    >
                      {resumen.valor}
                    </Typography>
                  </Box>

                  <Typography variant="h7" color="text.secondary">
                    {resumen.label}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
