import { Paper, Box, Typography } from "@mui/material";

export default function AppCard({ title, children, action, sx = {} }) {
  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: 4,
        border: 1,
        borderColor: "divider",
        p: 3,
        ...sx,
      }}
    >
      {(title || action) && (
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
          {title && (
            <Typography variant="h6" fontWeight={700}>
              {title}
            </Typography>
          )}
          {action && <Box>{action}</Box>}
        </Box>
      )}
      {children}
    </Paper>
  );
}
