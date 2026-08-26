import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  IconButton,
  Avatar,
  Badge,
  Tooltip,
} from "@mui/material";

import MenuIcon from "@mui/icons-material/Menu";
import NotificationsNoneOutlinedIcon from "@mui/icons-material/NotificationsNoneOutlined";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";
import LightModeOutlinedIcon from "@mui/icons-material/LightModeOutlined";
import { useColorScheme } from "@mui/material";
import SearchBar from "./SearchBar";
import ProfileMenu from "./ProfileMenu";
import { useLocation } from "react-router-dom";
import { useAuth } from "../../core/auth/useAuth";

const SIDEBAR_WIDTH = 280;

export default function Navbar({ onToggleSidebar, sidebarOpen = true }) {
  const location = useLocation();

  const pageName =
    location.pathname.split("/").filter(Boolean)[0] || "Dashboard";

  const pageNameFormatted =
    pageName.charAt(0).toUpperCase() + pageName.slice(1);

  const { mode, setMode } = useColorScheme();
  const { user } = useAuth();
  const inicial = (user?.nombre || user?.usuario || "?").charAt(0).toUpperCase();

  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        top: 0,
        left: sidebarOpen ? `${SIDEBAR_WIDTH}px` : 0,
        width: sidebarOpen ? `calc(100% - ${SIDEBAR_WIDTH}px)` : "100%",
        backgroundColor: "background.paper",
        color: "text.primary",
        borderBottom: 1,
        borderColor: "divider",
        zIndex: 1100,
        transition: "left .25s ease, width .25s ease",
      }}
    >
      <Toolbar
        sx={{
          display: "flex",
          justifyContent: "space-between",
          height: 72,
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 2,
          }}
        >
          <Tooltip title="Mostrar/ocultar menú">
            <IconButton onClick={onToggleSidebar}>
              <MenuIcon />
            </IconButton>
          </Tooltip>

          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
            }}
          >
            {pageNameFormatted}
          </Typography>
        </Box>

        <SearchBar />

        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
          }}
        >
          <Tooltip title="Modo Oscuro">
            <IconButton
              onClick={() => setMode(mode === "dark" ? "light" : "dark")}
            >
              {mode === "dark" ? (
                <LightModeOutlinedIcon
                />
              ) : (
                <DarkModeOutlinedIcon
                />
              )}
            </IconButton>
          </Tooltip>

          <Tooltip title="Configuración">
            <IconButton>
              <SettingsOutlinedIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title="Notificaciones">
            <IconButton>
              <Badge badgeContent={5} color="error">
                <NotificationsNoneOutlinedIcon />
              </Badge>
            </IconButton>
          </Tooltip>

          <Avatar
            sx={{
              bgcolor: "secondary.main",
              ml: 1,
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
