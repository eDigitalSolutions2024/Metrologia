import { Box, Typography } from "@mui/material";

/**
 * Encabezado de página. Ícono en chip con degradado, título grande y editorial,
 * eyebrow opcional (rótulo pequeño arriba) y zona de acciones a la derecha.
 */
export default function PageHeader({ eyebrow, title, subtitle, icon, actions, sx = {} }) {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: { xs: "flex-start", sm: "center" },
        justifyContent: "space-between",
        gap: 2,
        flexWrap: "wrap",
        mb: 3.5,
        ...sx,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, minWidth: 0 }}>
        {icon && (
          <Box
            sx={{
              width: 46,
              height: 46,
              borderRadius: 3,
              flexShrink: 0,
              display: "grid",
              placeItems: "center",
              color: "#fff",
              background: "linear-gradient(140deg, #3B82F6 0%, #1D4ED8 100%)",
              boxShadow: "0 10px 24px -6px rgba(37,99,235,.55)",
            }}
          >
            {icon}
          </Box>
        )}
        <Box sx={{ minWidth: 0 }}>
          {eyebrow && (
            <Typography
              sx={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: ".12em",
                textTransform: "uppercase",
                color: "text.secondary",
                mb: 0.25,
              }}
            >
              {eyebrow}
            </Typography>
          )}
          <Typography variant="h4" sx={{ fontSize: { xs: 24, sm: 28 }, lineHeight: 1.1 }}>
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.4 }}>
              {subtitle}
            </Typography>
          )}
        </Box>
      </Box>
      {actions && <Box sx={{ display: "flex", gap: 1.25, flexWrap: "wrap" }}>{actions}</Box>}
    </Box>
  );
}
