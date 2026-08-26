import { Box, Typography } from "@mui/material";

export default function SidebarHeader() {
  return (
    <Box
      sx={{
        height: 80,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
        borderBottom: "1px solid rgba(255,255,255,.08)",
      }}
    >
      <Typography
        sx={{
          color: "#fff",
          fontWeight: 700,
          fontSize: 26,
          letterSpacing: 1,
        }}
      >
        METROLOGÍA
      </Typography>

      <Typography
        sx={{
          color: "#94A3B8",
          fontSize: 13,
        }}
      >
        ERP v2.0
      </Typography>
    </Box>
  );
}