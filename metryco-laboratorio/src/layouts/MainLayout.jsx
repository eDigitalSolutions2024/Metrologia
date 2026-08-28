import { useState } from "react";
import { Box } from "@mui/material";
import { Outlet, useLocation } from "react-router-dom";

import Sidebar from "../components/Sidebar/Sidebar";
import Navbar from "../components/Navbar/Navbar";

const SIDEBAR_WIDTH = 280;

export default function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();

  return (
    <Box sx={{ width: "100%", minHeight: "100vh", bgcolor: "background.default" }}>
      <Sidebar open={sidebarOpen} />

      <Box
        sx={{
          marginLeft: sidebarOpen ? `${SIDEBAR_WIDTH}px` : 0,
          width: sidebarOpen ? `calc(100% - ${SIDEBAR_WIDTH}px)` : "100%",
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          transition: "margin-left .28s cubic-bezier(.4,0,.2,1), width .28s cubic-bezier(.4,0,.2,1)",
        }}
      >
        <Navbar sidebarOpen={sidebarOpen} onToggleSidebar={() => setSidebarOpen((p) => !p)} />

        <Box
          component="main"
          sx={{
            flex: 1,
            minWidth: 0,
            pt: "96px",
            pb: 6,
            px: { xs: 2.5, sm: 4 },
            overflowY: "auto",
            position: "relative",
            "&::before": {
              content: '""',
              position: "fixed",
              inset: 0,
              pointerEvents: "none",
              zIndex: 0,
              background:
                "radial-gradient(900px 380px at 78% -8%, rgba(37,99,235,.07), transparent 60%)," +
                "radial-gradient(700px 320px at 0% 100%, rgba(37,99,235,.05), transparent 55%)",
            },
            "&::after": {
              content: '""',
              position: "fixed",
              inset: 0,
              pointerEvents: "none",
              zIndex: 0,
              opacity: 0.5,
              backgroundImage: "radial-gradient(currentColor 0.75px, transparent 0.75px)",
              backgroundSize: "26px 26px",
              color: "var(--mui-palette-divider)",
              maskImage: "linear-gradient(180deg, rgba(0,0,0,.35), transparent 420px)",
              WebkitMaskImage: "linear-gradient(180deg, rgba(0,0,0,.35), transparent 420px)",
            },
            "@keyframes pageIn": {
              from: { opacity: 0, transform: "translateY(8px)" },
              to: { opacity: 1, transform: "translateY(0)" },
            },
          }}
        >
          <Box
            key={location.pathname}
            sx={{
              position: "relative",
              zIndex: 1,
              maxWidth: 1440,
              mx: "auto",
              animation: "pageIn .26s cubic-bezier(.4,0,.2,1)",
            }}
          >
            <Outlet />
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
