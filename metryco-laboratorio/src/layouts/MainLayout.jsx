import { useState } from "react";
import { Box } from "@mui/material";
import { Outlet } from "react-router-dom";

import Sidebar from "../components/Sidebar/Sidebar";
import Navbar from "../components/Navbar/Navbar";

const SIDEBAR_WIDTH = 280;

export default function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <Box
      sx={{
        width: "100%",
        minHeight: "100vh",
        backgroundColor: "background.default",
      }}
    >
      <Sidebar open={sidebarOpen} />

      <Box
        sx={{
          marginLeft: sidebarOpen ? `${SIDEBAR_WIDTH}px` : 0,
          width: sidebarOpen ? `calc(100% - ${SIDEBAR_WIDTH}px)` : "100%",
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          transition: "margin-left .25s ease, width .25s ease",
        }}
      >
        <Navbar
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
        />

        <Box
          component="main"
          sx={{
            flex: 1,
            minWidth: 0,
            padding: 4,
            paddingTop: "104px",
            overflowY: "auto",
            minHeight: "100vh",
          }}
        >
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
