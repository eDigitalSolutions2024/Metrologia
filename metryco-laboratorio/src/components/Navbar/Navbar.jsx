import {
  AppBar, Toolbar, Typography, Box, IconButton, Avatar, Tooltip, useColorScheme,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";
import LightModeOutlinedIcon from "@mui/icons-material/LightModeOutlined";
import { useLocation } from "react-router-dom";
import SearchBar from "./SearchBar";
import ProfileMenu from "./ProfileMenu";
import { useAuth } from "../../core/auth/useAuth";

const SIDEBAR_WIDTH = 280;

const TITULOS = {
  "": "Dashboard",
  reportes: "Reportes",
  incertidumbre: "Incertidumbre",
  clientes: "Clientes",
  cotizaciones: "Cotizaciones",
  equipos: "Equipos",
  calidad: "Calidad",
  actividades: "Actividades",
  cobranza: "Cuentas por Cobrar",
  performance: "Performance",
  usuarios: "Usuarios",
  general: "General",
};

export default function Navbar({ onToggleSidebar, sidebarOpen = true }) {
  const location = useLocation();
  const seg = location.pathname.split("/").filter(Boolean)[0] || "";
  const titulo = TITULOS[seg] || seg.charAt(0).toUpperCase() + seg.slice(1);

  const { mode, setMode } = useColorScheme();
  const { user } = useAuth();
  const inicial = (user?.nombre || user?.usuario || "?").charAt(0).toUpperCase();

  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={[
        {
          top: 0,
          left: sidebarOpen ? `${SIDEBAR_WIDTH}px` : 0,
          width: sidebarOpen ? `calc(100% - ${SIDEBAR_WIDTH}px)` : "100%",
          color: "text.primary",
          borderBottom: 1,
          borderColor: "divider",
          zIndex: 1100,
          transition: "left .25s ease, width .25s ease",
          backdropFilter: "blur(12px)",
          backgroundColor: "rgba(255,255,255,0.72)",
        },
        (theme) => theme.applyStyles("dark", { backgroundColor: "rgba(15,24,38,0.72)" }),
      ]}
    >
      <Toolbar sx={{ display: "flex", justifyContent: "space-between", gap: 2, height: 72 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0 }}>
          <Tooltip title="Mostrar/ocultar menú">
            <IconButton onClick={onToggleSidebar} size="small">
              <MenuIcon />
            </IconButton>
          </Tooltip>
          <Typography variant="h6" fontWeight={800} sx={{ letterSpacing: "-.01em" }} noWrap>
            {titulo}
          </Typography>
        </Box>

        <SearchBar />

        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <Tooltip title={mode === "dark" ? "Modo claro" : "Modo oscuro"}>
            <IconButton size="small" onClick={() => setMode(mode === "dark" ? "light" : "dark")}>
              {mode === "dark" ? <LightModeOutlinedIcon /> : <DarkModeOutlinedIcon />}
            </IconButton>
          </Tooltip>
          <Tooltip title="Configuración">
            <IconButton size="small"><SettingsOutlinedIcon /></IconButton>
          </Tooltip>
          <Avatar
            sx={{
              width: 36, height: 36, ml: 1, fontSize: 15, fontWeight: 700,
              background: "linear-gradient(135deg, var(--mui-palette-secondary-light), var(--mui-palette-secondary-dark))",
            }}
          >
            {inicial}
          </Avatar>
          <ProfileMenu />
        </Box>
      </Toolbar>
    </AppBar>
  );
}
