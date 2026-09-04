import { useEffect, useState } from "react";
import {
  Box, Typography, Paper, Grid, Button, Tooltip,
} from "@mui/material";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import AddIcon from "@mui/icons-material/Add";
import AppButton from "../../shared/components/AppButton";
import PageHeader from "../../shared/components/PageHeader";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import NuevaActividad from "../../shared/components/NuevaActividad/NuevaActividad";
import { listarActividades } from "../../services/actividades";

const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

const STATUS_COLOR = {
  pendiente: "#F59E0B",
  en_proceso: "#2563EB",
  completada: "#22C55E",
};

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDay(year, month) {
  return new Date(year, month, 1).getDay();
}

function toFecha(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export default function ActividadesPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [actividades, setActividades] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [fechaSugerida, setFechaSugerida] = useState("");

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDay(year, month);
  const today = now.getDate();
  const isCurrentMonth = now.getFullYear() === year && now.getMonth() === month;

  const cargarActividades = () => {
    listarActividades({ year, month: month + 1 })
      .then(setActividades)
      .catch(() => setActividades([]));
  };

  useEffect(cargarActividades, [year, month]);

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  };

  const abrirNueva = (fecha = "") => {
    setFechaSugerida(fecha);
    setModalOpen(true);
  };

  const eventosPorDia = actividades.reduce((acc, act) => {
    const fecha = (act.fechaActividad || "").slice(0, 10);
    (acc[fecha] ??= []).push(act);
    return acc;
  }, {});

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <Box>
      <PageHeader
        icon={<CalendarMonthOutlinedIcon />}
        title="Calendario de Actividades"
        actions={
          <AppButton startIcon={<AddIcon />} sx={{ borderRadius: 2 }} onClick={() => abrirNueva()}>
            Nueva Actividad
          </AppButton>
        }
      />

      <Paper elevation={0} sx={{ border: 1, borderColor: "divider", borderRadius: 2, overflow: "hidden" }}>
        <Box sx={{ borderBottom: 1, display: "flex", alignItems: "center", justifyContent: "space-between", px: 3, py: 2, borderColor: "divider" }}>
          <Button onClick={prevMonth} size="small" sx={{ minWidth: 36 }}><ChevronLeftIcon /></Button>
          <Typography variant="h6" fontWeight={700}>
            {MESES[month]} {year}
          </Typography>
          <Button onClick={nextMonth} size="small" sx={{ minWidth: 36 }}><ChevronRightIcon /></Button>
        </Box>

        <Grid container sx={{ borderBottom: 1, borderColor: "divider", bgcolor: "background.default" }}>
          {DIAS.map((d) => (
            <Grid key={d} size={{ xs: 12 / 7 }} sx={{ textAlign: "center", py: 1 }}>
              <Typography variant="caption" fontWeight={700} color="text.secondary">{d}</Typography>
            </Grid>
          ))}
        </Grid>

        <Grid container>
          {cells.map((day, idx) => {
            const fecha = day ? toFecha(year, month, day) : null;
            const eventos = fecha ? (eventosPorDia[fecha] ?? []) : [];
            const isToday = isCurrentMonth && day === today;

            return (
              <Grid
                key={idx}
                size={{ xs: 12 / 7 }}
                onClick={() => day && abrirNueva(fecha)}
                sx={{
                  minHeight: 100,
                  borderRight: (idx + 1) % 7 !== 0 ? 1 : 0,
                  borderBottom: 1,
                  borderColor: "divider",
                  p: 1,
                  bgcolor: !day ? "background.default" : "background.paper",
                  cursor: day ? "pointer" : "default",
                  "&:hover": day ? { bgcolor: "action.hover" } : {},
                }}
              >
                {day && (
                  <>
                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 0.5 }}>
                      <Box sx={{ width: 28, height: 28, borderRadius: "50%", bgcolor: isToday ? "secondary.main" : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Typography variant="body2" fontWeight={isToday ? 700 : 400} sx={{ color: isToday ? "#fff" : "text.primary" }}>
                          {day}
                        </Typography>
                      </Box>
                      {eventos.length > 0 && (
                        <Tooltip title={`${eventos.length} actividad(es)`}>
                          <Box sx={{ minWidth: 18, height: 18, px: 0.5, borderRadius: "9px", bgcolor: "secondary.main", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700 }}>
                            {eventos.length}
                          </Box>
                        </Tooltip>
                      )}
                    </Box>
                    {eventos.slice(0, 3).map((ev) => (
                      <Box
                        key={ev._id}
                        sx={{ bgcolor: STATUS_COLOR[ev.status] ?? "#6B7280", color: "#fff", borderRadius: 1, px: 0.75, py: 0.25, mb: 0.5, fontSize: 11, fontWeight: 600, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}
                      >
                        {ev.actividad}
                      </Box>
                    ))}
                    {eventos.length > 3 && (
                      <Typography variant="caption" color="text.secondary">+{eventos.length - 3} más</Typography>
                    )}
                  </>
                )}
              </Grid>
            );
          })}
        </Grid>
      </Paper>

      <Box sx={{ display: "flex", gap: 2, mt: 2, flexWrap: "wrap" }}>
        {Object.entries(STATUS_COLOR).map(([status, color]) => (
          <Box key={status} sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
            <Box sx={{ width: 12, height: 12, borderRadius: 1, bgcolor: color }} />
            <Typography variant="caption" sx={{ textTransform: "capitalize" }}>{status.replace("_", " ")}</Typography>
          </Box>
        ))}
      </Box>

      <NuevaActividad
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={cargarActividades}
        fechaSugerida={fechaSugerida}
      />
    </Box>
  );
}
