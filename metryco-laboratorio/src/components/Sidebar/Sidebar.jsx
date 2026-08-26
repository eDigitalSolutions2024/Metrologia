import { Box, List } from "@mui/material";

import menu from "./menuConfig";
import SidebarHeader from "./SidebarHeader";
import SidebarItem from "./SidebarItem";
import { useAuth } from "../../core/auth/useAuth";

const ROL_LABELS = {
  admin: "Administrador",
  tecnico: "Técnico",
  ventas: "Ventas",
  coordinador: "Coordinador",
};

export default function Sidebar({ open = true }) {
  const { user } = useAuth();
  const nombre = user?.nombre || user?.usuario || "Usuario";
  const inicial = nombre.charAt(0).toUpperCase();
  const rolLabel = ROL_LABELS[user?.rol] || user?.rol || "";

  return (
    <Box
      sx={{
        width: 280,
        minWidth: 280,
        height: "100vh",
        position: "fixed",
        left: 0,
        top: 0,
        background: "#0F172A",
        color: "#fff",
        display: "flex",
        flexDirection: "column",
        borderRight: "1px solid rgba(255,255,255,.08)",
        overflowY: "auto",
        zIndex: 1200,
        transform: open ? "translateX(0)" : "translateX(-100%)",
        transition: "transform .25s ease",
      }}
    >
      {/* ==========================
          CABECERA
      ========================== */}

      <SidebarHeader />

      {/* ==========================
          MENÚ
      ========================== */}

      <List
        sx={{
          mt: 2,
          px: 1,
          flex: 1,
        }}
      >
        {menu.map((item) => (
          <SidebarItem key={item.title} item={item} />
        ))}
      </List>

      {/* ==========================
          FOOTER
      ========================== */}

      <Box
        sx={{
          borderTop: "1px solid rgba(255,255,255,.08)",
          p: 2,
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 2,
          }}
        >
          <Box
            sx={{
              width: 42,
              height: 42,
              borderRadius: "50%",
              background: "#2563EB",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              fontWeight: "bold",
              fontSize: 18,
            }}
          >
            {inicial}
          </Box>

          <Box>
            <Box
              sx={{
                fontWeight: 700,
                fontSize: 14,
              }}
            >
              {nombre}
            </Box>

            <Box
              sx={{
                fontSize: 12,
                opacity: 0.7,
              }}
            >
              {rolLabel}
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
