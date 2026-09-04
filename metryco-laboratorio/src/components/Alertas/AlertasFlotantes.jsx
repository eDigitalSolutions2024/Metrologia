import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Paper, Typography, IconButton, Collapse, Chip, Divider, Fab, Badge, Tooltip, alpha,
} from "@mui/material";
import NotificationsActiveOutlinedIcon from "@mui/icons-material/NotificationsActiveOutlined";
import CloseIcon from "@mui/icons-material/Close";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import RefreshOutlinedIcon from "@mui/icons-material/RefreshOutlined";
import RequestQuoteOutlinedIcon from "@mui/icons-material/RequestQuoteOutlined";
import DoNotDisturbOutlinedIcon from "@mui/icons-material/DoNotDisturbOutlined";
import CheckCircleOutlinedIcon from "@mui/icons-material/CheckCircleOutlined";
import VerifiedOutlinedIcon from "@mui/icons-material/VerifiedOutlined";
import StraightenOutlinedIcon from "@mui/icons-material/StraightenOutlined";
import ScienceOutlinedIcon from "@mui/icons-material/ScienceOutlined";
import FactCheckOutlinedIcon from "@mui/icons-material/FactCheckOutlined";
import PaymentsOutlinedIcon from "@mui/icons-material/PaymentsOutlined";
import AdminPanelSettingsOutlinedIcon from "@mui/icons-material/AdminPanelSettingsOutlined";
import SupervisorAccountOutlinedIcon from "@mui/icons-material/SupervisorAccountOutlined";
import StorefrontOutlinedIcon from "@mui/icons-material/StorefrontOutlined";
import EngineeringOutlinedIcon from "@mui/icons-material/EngineeringOutlined";
import { obtenerAlertas } from "../../services/alertas";
import { useAuth } from "../../core/auth/useAuth";
import { alSolicitarRefrescoAlertas } from "../../shared/utils/alertasBus";

const POLL_MS = 20 * 1000; // casi en vivo: refresca cada 20s mientras la app sigue abierta
const CERRADO_KEY = "metryco_alertas_cerradas"; // por sesión de pestaña — reaparece al volver a entrar

// Un ícono + color por tipo de alerta (`icono` lo decide el backend en alerta.service.js).
const ICONOS = {
  solicitud: RequestQuoteOutlinedIcon,
  rechazo: DoNotDisturbOutlinedIcon,
  aprobado: CheckCircleOutlinedIcon,
  certificado: VerifiedOutlinedIcon,
  patron: StraightenOutlinedIcon,
  calidad: ScienceOutlinedIcon,
  asignacion: FactCheckOutlinedIcon,
  factura: PaymentsOutlinedIcon,
};

// Mismo criterio de color por rol que ya usa Administración → Roles del Menú
// (RolesMenuPage.jsx) — se reutiliza aquí para que el popup se sienta
// "propio" de quien lo ve, no genérico.
const ROL_ESTILO = {
  admin: { color: "error", label: "Admin", Icono: AdminPanelSettingsOutlinedIcon },
  coordinador: { color: "info", label: "Coordinador", Icono: SupervisorAccountOutlinedIcon },
  ventas: { color: "success", label: "Ventas", Icono: StorefrontOutlinedIcon },
  tecnico: { color: "primary", label: "Técnico", Icono: EngineeringOutlinedIcon },
};

/**
 * Popup flotante de pendientes por rol — siempre presente mientras hay sesión
 * iniciada (montado en MainLayout, no en una pantalla específica). El backend
 * (`alerta.service.js`) ya filtra el contenido según el rol:
 *   admin/coordinador → todo combinado (comercial + calidad/vencimientos)
 *   ventas            → cotizaciones + certificados por vencer (oportunidad de recotizar)
 *   tecnico           → sus asignaciones pendientes + patrones por vencer
 * Cobranza/Facturación no aparece todavía: ese módulo no tiene backend real.
 *
 * El estilo (color, ícono, etiqueta del header y del FAB) cambia según el rol
 * de quien está viendo la sesión — ver ROL_ESTILO.
 */
export default function AlertasFlotantes() {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [grupos, setGrupos] = useState([]);
  const [abierto, setAbierto] = useState(false);
  const [cargado, setCargado] = useState(false);
  const [actualizando, setActualizando] = useState(false);

  const cargar = useCallback(() => {
    setActualizando(true);
    obtenerAlertas()
      .then((data) => { setGrupos(data); setCargado(true); })
      .catch(() => {})
      .finally(() => setActualizando(false));
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    cargar();
    const id = setInterval(cargar, POLL_MS);
    // Refresca también al volver a la pestaña o a la ventana — así un cambio
    // hecho en otra pestaña (o por otro usuario) se refleja casi al instante
    // sin esperar el próximo tick del poll.
    const onVisible = () => { if (document.visibilityState === "visible") cargar(); };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", cargar);
    const quitarBus = alSolicitarRefrescoAlertas(cargar);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", cargar);
      quitarBus();
    };
  }, [isAuthenticated, cargar]);

  useEffect(() => {
    if (!cargado) return;
    const total = grupos.reduce((s, g) => s + g.total, 0);
    if (total > 0 && !sessionStorage.getItem(CERRADO_KEY)) setAbierto(true);
  }, [cargado, grupos]);

  // Se auto-colapsa a los pocos segundos de quedar abierto (sin importar si
  // se abrió solo o con el FAB) — así nunca se queda tapando por accidente
  // botones u otros controles de la pantalla debajo. El FAB con el contador
  // sigue disponible para reabrirlo cuando se quiera.
  useEffect(() => {
    if (!abierto) return;
    const t = setTimeout(() => {
      setAbierto(false);
      sessionStorage.setItem(CERRADO_KEY, "1");
    }, 10000);
    return () => clearTimeout(t);
  }, [abierto]);

  if (!isAuthenticated || !cargado) return null;
  const total = grupos.reduce((s, g) => s + g.total, 0);
  if (total === 0) return null;

  const rolEstilo = ROL_ESTILO[user?.rol] || ROL_ESTILO.admin;
  const RolIcono = rolEstilo.Icono;

  const cerrar = () => {
    setAbierto(false);
    sessionStorage.setItem(CERRADO_KEY, "1");
  };

  const ir = (ruta) => {
    setAbierto(false);
    navigate(ruta);
  };

  return (
    <Box sx={{ position: "fixed", bottom: { xs: 16, sm: 24 }, right: { xs: 16, sm: 24 }, zIndex: 1300, display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
      <Collapse in={abierto} sx={{ transformOrigin: "bottom right" }}>
        <Paper
          elevation={0}
          sx={{
            width: "min(370px, calc(100vw - 32px))", maxHeight: "min(500px, calc(100vh - 140px))",
            display: "flex", flexDirection: "column",
            borderRadius: "18px", border: 1, borderColor: "divider",
            boxShadow: (t) => `0 20px 44px ${alpha(t.palette[rolEstilo.color].main, 0.22)}, 0 4px 14px rgba(15,23,42,.10)`,
            mb: 1.5, overflow: "hidden",
          }}
        >
          <Box
            sx={{
              px: 2, py: 1.75, display: "flex", alignItems: "center", gap: 1.25,
              background: (t) => `linear-gradient(135deg, ${t.palette[rolEstilo.color].light} 0%, ${t.palette[rolEstilo.color].main} 55%, ${t.palette[rolEstilo.color].dark} 100%)`,
              color: "#fff", position: "relative", overflow: "hidden",
            }}
          >
            {/* Filigrana decorativa sutil, mismo espíritu que el panel del Login */}
            <RolIcono sx={{ position: "absolute", right: -10, top: -14, fontSize: 92, opacity: 0.14 }} />

            <Box
              sx={{
                width: 34, height: 34, borderRadius: "10px", flexShrink: 0,
                display: "grid", placeItems: "center", bgcolor: "rgba(255,255,255,0.18)",
                border: "1px solid rgba(255,255,255,0.3)",
              }}
            >
              <RolIcono sx={{ fontSize: 19 }} />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0, position: "relative" }}>
              <Typography variant="subtitle2" fontWeight={800} noWrap>Pendientes · {rolEstilo.label}</Typography>
              <Typography variant="caption" sx={{ opacity: 0.85 }}>{total} {total === 1 ? "elemento" : "elementos"} por revisar</Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.25, position: "relative" }}>
              <Tooltip title="Actualizar">
                <IconButton
                  size="small"
                  onClick={cargar}
                  sx={{ color: "#fff", animation: actualizando ? "spin .7s linear infinite" : "none", "@keyframes spin": { to: { transform: "rotate(360deg)" } } }}
                >
                  <RefreshOutlinedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <IconButton size="small" onClick={cerrar} sx={{ color: "#fff" }}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>

          <Box sx={{ overflowY: "auto", flex: 1, bgcolor: "background.paper" }}>
            {grupos.map((g, i) => {
              const Icono = ICONOS[g.icono] || FactCheckOutlinedIcon;
              return (
                <Box key={g.clave}>
                  {i > 0 && <Divider />}
                  <Box
                    sx={{
                      px: 2, py: 1.5, borderLeft: 3, borderColor: `${g.severidad}.main`,
                      transition: "background-color .15s ease",
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.75 }}>
                      <Box
                        sx={{
                          width: 26, height: 26, borderRadius: "8px", display: "grid", placeItems: "center",
                          bgcolor: (t) => alpha(t.palette[g.severidad].main, 0.14),
                          color: `${g.severidad}.main`, flexShrink: 0,
                        }}
                      >
                        <Icono sx={{ fontSize: 15 }} />
                      </Box>
                      <Tooltip title={g.titulo}>
                        <Typography variant="body2" fontWeight={700} noWrap sx={{ flex: 1, minWidth: 0 }}>{g.titulo}</Typography>
                      </Tooltip>
                      <Chip
                        label={g.total} size="small" color={g.severidad}
                        sx={{ height: 20, fontSize: 11, fontWeight: 700, borderRadius: "6px" }}
                      />
                    </Box>
                    {g.items.map((it) => (
                      <Box
                        key={it.id}
                        onClick={it.ruta ? () => ir(it.ruta) : undefined}
                        sx={{
                          display: "flex", justifyContent: "space-between", gap: 1, py: 0.5, px: 1, ml: 3.25,
                          cursor: it.ruta ? "pointer" : "default",
                          borderRadius: "8px",
                          "&:hover": it.ruta ? { bgcolor: "action.hover" } : undefined,
                        }}
                      >
                        <Typography variant="caption" color="text.secondary" noWrap sx={{ minWidth: 0, flex: "1 1 auto" }}>
                          {it.texto}
                        </Typography>
                        {it.detalle && (
                          <Typography
                            variant="caption" color={`${g.severidad}.main`} fontWeight={600} noWrap
                            sx={{ flex: "0 1 auto", maxWidth: "42%" }}
                          >
                            {it.detalle}
                          </Typography>
                        )}
                      </Box>
                    ))}
                    <Box
                      onClick={() => ir(g.ruta)}
                      sx={{
                        display: "inline-flex", alignItems: "center", gap: 0.25, mt: 0.5, ml: 3.25, cursor: "pointer",
                        color: `${rolEstilo.color}.main`, "&:hover": { textDecoration: "underline" },
                      }}
                    >
                      <Typography variant="caption" fontWeight={700}>Ver todos</Typography>
                      <ChevronRightIcon sx={{ fontSize: 14 }} />
                    </Box>
                  </Box>
                </Box>
              );
            })}
          </Box>
        </Paper>
      </Collapse>

      {!abierto && (
        <Tooltip title={`Pendientes de ${rolEstilo.label}`}>
          <Badge badgeContent={total} color="error" max={99}>
            <Fab
              size="medium"
              onClick={() => setAbierto(true)}
              sx={{
                background: (t) => `linear-gradient(135deg, ${t.palette[rolEstilo.color].light}, ${t.palette[rolEstilo.color].dark})`,
                color: "#fff",
                boxShadow: (t) => `0 10px 26px ${alpha(t.palette[rolEstilo.color].main, 0.4)}`,
                "&:hover": { background: (t) => `linear-gradient(135deg, ${t.palette[rolEstilo.color].main}, ${t.palette[rolEstilo.color].dark})` },
              }}
            >
              <RolIcono />
            </Fab>
          </Badge>
        </Tooltip>
      )}
    </Box>
  );
}
