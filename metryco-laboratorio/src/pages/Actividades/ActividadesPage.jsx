import { useState } from "react";
import {
  Box, Typography, Paper, Grid, Chip, Button, Divider,
} from "@mui/material";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import AddIcon from "@mui/icons-material/Add";
import AppButton from "../../shared/components/AppButton";

const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

const EVENTOS = {
  "2025-6-3": [{ titulo: "Calibración AUDI", tipo: "calibracion" }],
  "2025-6-5": [{ titulo: "Entrega reporte FOXCONN", tipo: "entrega" }],
  "2025-6-10": [{ titulo: "Visita ASSA ABLOY", tipo: "visita" }, { titulo: "Calibración Bombardier", tipo: "calibracion" }],
  "2025-6-15": [{ titulo: "Auditoría interna", tipo: "auditoria" }],
  "2025-6-20": [{ titulo: "Calibración Honeywell", tipo: "calibracion" }],
  "2025-6-25": [{ titulo: "Reunión con clientes", tipo: "reunion" }],
};

const TIPO_COLOR = {
  calibracion: "#2563EB",
  entrega: "#22C55E",
  visita: "#F59E0B",
  auditoria: "#EF4444",
  reunion: "#8B5CF6",
};

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDay(year, month) {
  return new Date(year, month, 1).getDay();
}

export default function ActividadesPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDay(year, month);
  const today = now.getDate();
  const isCurrentMonth = now.getFullYear() === year && now.getMonth() === month;

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  };

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>Calendario de Actividades</Typography>
        <AppButton startIcon={<AddIcon />} sx={{ borderRadius: 2 }}>Nueva Actividad</AppButton>
      </Box>

      <Paper elevation={0} sx={{ border: 1, borderColor: "divider", borderRadius: 4, overflow: "hidden" }}>
        {/* Header del calendario */}
        <Box sx={{ borderBottom: 1, display: "flex", alignItems: "center", justifyContent: "space-between", px: 3, py: 2, borderColor: "divider" }}>
          <Button onClick={prevMonth} size="small" sx={{ minWidth: 36 }}><ChevronLeftIcon /></Button>
          <Typography variant="h6" fontWeight={700}>
            {MESES[month]} {year}
          </Typography>
          <Button onClick={nextMonth} size="small" sx={{ minWidth: 36 }}><ChevronRightIcon /></Button>
        </Box>

        {/* Días de la semana */}
        <Grid container sx={{ borderBottom: 1, borderColor: "divider", bgcolor: "background.default" }}>
          {DIAS.map((d) => (
            <Grid key={d} size={{ xs: 12 / 7 }} sx={{ textAlign: "center", py: 1 }}>
              <Typography variant="caption" fontWeight={700} color="text.secondary">{d}</Typography>
            </Grid>
          ))}
        </Grid>

        {/* Celdas del calendario */}
        <Grid container>
          {cells.map((day, idx) => {
            const key = day ? `${year}-${month + 1}-${day}` : null;
            const eventos = key ? (EVENTOS[key] ?? []) : [];
            const isToday = isCurrentMonth && day === today;

            return (
              <Grid
                key={idx}
                size={{ xs: 12 / 7 }}
                sx={{
                  minHeight: 100,
                  borderRight: (idx + 1) % 7 !== 0 ? 1 : 0,
                  borderBottom: 1,
                  borderColor: "divider",
                  p: 1,
                  bgcolor: !day ? "background.default" : "background.paper",
                  "&:hover": day ? { bgcolor: "action.hover" } : {},
                }}
              >
                {day && (
                  <>
                    <Box sx={{ width: 28, height: 28, borderRadius: "50%", bgcolor: isToday ? "secondary.main" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", mb: 0.5 }}>
                      <Typography
                        variant="body2"
                        fontWeight={isToday ? 700 : 400}
                        sx={{ color: isToday ? "#fff" : "text.primary" }}
                      >
                        {day}
                      </Typography>
                    </Box>
                    {eventos.map((ev, i) => (
                      <Box key={i} sx={{ bgcolor: TIPO_COLOR[ev.tipo] ?? "#6B7280", color: "#fff", borderRadius: 1, px: 0.75, py: 0.25, mb: 0.5, fontSize: 11, fontWeight: 600, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                        {ev.titulo}
                      </Box>
                    ))}
                  </>
                )}
              </Grid>
            );
          })}
        </Grid>
      </Paper>

      {/* Leyenda */}
      <Box sx={{ display: "flex", gap: 2, mt: 2, flexWrap: "wrap" }}>
        {Object.entries(TIPO_COLOR).map(([tipo, color]) => (
          <Box key={tipo} sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
            <Box sx={{ width: 12, height: 12, borderRadius: 1, bgcolor: color }} />
            <Typography variant="caption" sx={{ textTransform: "capitalize" }}>{tipo}</Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
