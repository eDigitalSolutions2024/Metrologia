import { useEffect, useRef, useState } from "react";
import { Box, Paper, Typography } from "@mui/material";

/** Cuenta ascendente suave para valores numéricos. */
function useCountUp(target, ms = 650) {
  const num = typeof target === "number" ? target : null;
  const [val, setVal] = useState(num ?? 0);
  const from = useRef(0);
  useEffect(() => {
    if (num == null) return;
    const start = performance.now();
    const startVal = from.current;
    let raf;
    const tick = (t) => {
      const p = Math.min(1, (t - start) / ms);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(startVal + (num - startVal) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
      else from.current = num;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [num, ms]);
  return num == null ? target : val;
}

/**
 * Tarjeta KPI: número grande (con count-up si es numérico), ícono en chip
 * tenue, hairline de color arriba, lavado de degradado abajo y lift al hover.
 */
export default function StatCard({ label, value, icon, color = "#2563EB", hint, trend }) {
  const shown = useCountUp(value);

  return (
    <Paper
      elevation={0}
      sx={{
        position: "relative",
        p: 2.75,
        borderRadius: 2,
        border: 1,
        borderColor: "divider",
        overflow: "hidden",
        transition: "transform .18s ease, box-shadow .18s ease, border-color .18s ease",
        "&:hover": {
          transform: "translateY(-3px)",
          boxShadow: "0 20px 40px -16px rgba(15,23,42,.22)",
          borderColor: `${color}55`,
        },
        "&::before": {
          content: '""',
          position: "absolute",
          insetInline: 0,
          top: 0,
          height: 3,
          background: `linear-gradient(90deg, ${color}, ${color}00)`,
        },
        "&::after": {
          content: '""',
          position: "absolute",
          right: -40,
          bottom: -40,
          width: 130,
          height: 130,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${color}14, transparent 70%)`,
          pointerEvents: "none",
        },
      }}
    >
      <Box sx={{ position: "relative", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 1 }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.75, fontWeight: 500 }}>
            {label}
          </Typography>
          <Typography variant="h4" fontWeight={800} sx={{ lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
            {shown}
          </Typography>
          {(hint || trend != null) && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.85, display: "block" }}>
              {trend != null && (
                <Box component="span" sx={{ color: trend >= 0 ? "success.main" : "error.main", fontWeight: 700 }}>
                  {trend >= 0 ? "▲" : "▼"} {Math.abs(trend)}%{" "}
                </Box>
              )}
              {hint}
            </Typography>
          )}
        </Box>
        {icon && (
          <Box
            sx={{
              width: 46,
              height: 46,
              flexShrink: 0,
              borderRadius: 2.75,
              display: "grid",
              placeItems: "center",
              color,
              background: `${color}16`,
              border: `1px solid ${color}22`,
            }}
          >
            {icon}
          </Box>
        )}
      </Box>
    </Paper>
  );
}
