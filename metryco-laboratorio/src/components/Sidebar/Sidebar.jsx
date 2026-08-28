import { Box, List, Typography } from "@mui/material";

import menu from "./menuConfig";
import SidebarItem from "./SidebarItem";
import { useAuth } from "../../core/auth/useAuth";

const ROL_LABELS = {
  admin: "Administrador",
  tecnico: "Técnico",
  ventas: "Ventas",
  coordinador: "Coordinador",
};

function BrandMark({ size = 30 }) {
  const ticks = Array.from({ length: 12 }, (_, i) => {
    const a = (i * 30 * Math.PI) / 180;
    const o = 21;
    const inner = i % 3 === 0 ? 15 : 18;
    return (
      <line
        key={i}
        x1={24 + o * Math.cos(a)} y1={24 + o * Math.sin(a)}
        x2={24 + inner * Math.cos(a)} y2={24 + inner * Math.sin(a)}
        stroke="currentColor" strokeWidth={i % 3 === 0 ? 2 : 1} strokeLinecap="round"
      />
    );
  });
  return (
    <Box component="svg" viewBox="0 0 48 48" sx={{ width: size, height: size, color: "#60A5FA", flexShrink: 0 }}>
      <circle cx="24" cy="24" r="22" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.35" />
      <circle cx="24" cy="24" r="12.5" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
      {ticks}
      <line x1="24" y1="24" x2="34" y2="14" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="24" cy="24" r="3.4" fill="currentColor" />
    </Box>
  );
}

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
        color: "#E6EDF6",
        display: "flex",
        flexDirection: "column",
        borderRight: "1px solid rgba(255,255,255,.06)",
        overflowY: "auto",
        zIndex: 1200,
        transform: open ? "translateX(0)" : "translateX(-100%)",
        transition: "transform .28s cubic-bezier(.4,0,.2,1)",
        background:
          "radial-gradient(520px 220px at 15% -8%, rgba(59,130,246,.30), transparent 62%)," +
          "linear-gradient(180deg, #0A101C 0%, #0C1424 55%, #0A101C 100%)",
        "&::-webkit-scrollbar": { width: 6 },
        "&::-webkit-scrollbar-thumb": { background: "rgba(255,255,255,.1)", borderRadius: 99 },
      }}
    >
      {/* Marca */}
      <Box sx={{ px: 2.5, pt: 3, pb: 2, display: "flex", alignItems: "center", gap: 1.5 }}>
        <Box
          sx={{
            width: 40, height: 40, borderRadius: 2.5, display: "grid", placeItems: "center",
            background: "linear-gradient(135deg, rgba(37,99,235,.25), rgba(37,99,235,.05))",
            border: "1px solid rgba(96,165,250,.25)",
          }}
        >
          <BrandMark size={24} />
        </Box>
        <Box>
          <Typography sx={{ fontWeight: 800, fontSize: 15, letterSpacing: ".14em", lineHeight: 1 }}>
            METROLOGÍA
          </Typography>
          <Typography sx={{ fontSize: 10.5, letterSpacing: ".22em", color: "rgba(230,237,246,.45)" }}>
            SISTEMA ERP
          </Typography>
        </Box>
      </Box>

      {/* Navegación por secciones */}
      <Box sx={{ flex: 1, px: 1.25, pb: 1 }}>
        {menu.map((grupo) => (
          <Box key={grupo.section} sx={{ mb: 1.5 }}>
            <Typography
              sx={{
                px: 1.75, mt: 1.5, mb: 0.5,
                fontSize: 10, fontWeight: 700, letterSpacing: ".14em",
                textTransform: "uppercase", color: "rgba(230,237,246,.34)",
              }}
            >
              {grupo.section}
            </Typography>
            <List disablePadding>
              {grupo.items.map((item) => (
                <SidebarItem key={item.title} item={item} />
              ))}
            </List>
          </Box>
        ))}
      </Box>

      {/* Usuario */}
      <Box sx={{ borderTop: "1px solid rgba(255,255,255,.07)", p: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box
            sx={{
              width: 38, height: 38, borderRadius: 2.5, display: "grid", placeItems: "center",
              fontWeight: 800, fontSize: 15, color: "#fff",
              background: "linear-gradient(135deg, #2563EB, #1D4ED8)",
              boxShadow: "0 6px 16px rgba(37,99,235,.35)",
            }}
          >
            {inicial}
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontWeight: 700, fontSize: 13.5, lineHeight: 1.2 }} noWrap>{nombre}</Typography>
            <Typography sx={{ fontSize: 11.5, color: "rgba(230,237,246,.5)" }}>{rolLabel}</Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
