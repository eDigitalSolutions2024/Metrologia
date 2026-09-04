import { Paper, Box, Typography } from "@mui/material";

/**
 * Contenedor de sección. Compatible hacia atrás (title / action / sx / children)
 * y con extras opcionales: subtitle, icon, dense, accent (franja de color).
 */
export default function AppCard({
  title,
  subtitle,
  icon,
  action,
  accent,
  dense = false,
  children,
  sx = {},
}) {
  return (
    <Paper
      elevation={0}
      sx={{
        position: "relative",
        borderRadius: 2,
        border: 1,
        borderColor: "divider",
        p: dense ? 2.25 : 3,
        overflow: "hidden",
        ...(accent && {
          "&::before": {
            content: '""',
            position: "absolute",
            insetBlock: 0,
            left: 0,
            width: 3,
            background: `linear-gradient(180deg, ${accent}, ${accent}00)`,
          },
        }),
        ...sx,
      }}
    >
      {(title || action) && (
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 1.5,
            mb: dense ? 1.5 : 2.25,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, minWidth: 0 }}>
            {icon && (
              <Box
                sx={{
                  width: 34,
                  height: 34,
                  flexShrink: 0,
                  borderRadius: 2,
                  display: "grid",
                  placeItems: "center",
                  color: "secondary.main",
                  bgcolor: "secondary.main",
                  background: (t) => `${t.palette.secondary.main}16`,
                }}
              >
                {icon}
              </Box>
            )}
            {title && (
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.2 }}>
                  {title}
                </Typography>
                {subtitle && (
                  <Typography variant="caption" color="text.secondary">
                    {subtitle}
                  </Typography>
                )}
              </Box>
            )}
          </Box>
          {action && <Box sx={{ flexShrink: 0 }}>{action}</Box>}
        </Box>
      )}
      {children}
    </Paper>
  );
}
