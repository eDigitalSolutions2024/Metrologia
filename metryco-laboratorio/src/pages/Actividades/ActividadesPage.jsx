import { useEffect, useState } from "react";
import {
  Box, Typography, Paper, Grid, Button, Tooltip, Chip, Avatar,
} from "@mui/material";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import AddIcon from "@mui/icons-material/Add";
import EventAvailableOutlinedIcon from "@mui/icons-material/EventAvailableOutlined";
import AppButton from "../../shared/components/AppButton";
import AppCard from "../../shared/components/AppCard";
import PageHeader from "../../shared/components/PageHeader";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import NuevaActividad from "../../shared/components/NuevaActividad/NuevaActividad";
import { listarActividades } from "../../services/actividades";
import { formatDate } from "../../shared/utils/formatDate";

const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

const STATUS_COLOR = {
  pendiente: "#F59E0B",
  en_proceso: "#2563EB",
  completada: "#22C55E",
};
const STATUS_LABEL = { pendiente: "Pendiente", en_proceso: "En proceso", completada: "Completada" };
const STATUS_CHIP_COLOR = { pendiente: "warning", en_proceso: "info", completada: "success" };

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
  const [actividadSeleccionada, setActividadSeleccionada] = useState(null);

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

  const pendientes = actividades
    .filter((a) => a.status !== "completada")
    .sort((a, b) => new Date(a.fechaActividad) - new Date(b.fechaActividad));

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

      <Paper elevation={0} sx={{ border: 1, borderColor: "divider", borderRadius: 2, overflow: "hidden", mb: 2.5 }}>
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

      <AppCard
        dense
        title="Actividades a realizar"
        subtitle={`${pendientes.length} pendiente(s) / en proceso este mes`}
        icon={<EventAvailableOutlinedIcon fontSize="small" />}
        sx={{ mb: 2.5 }}
      >
        {pendientes.length === 0 ? (
          <Typography variant="body2" color="text.secondary">Sin actividades pendientes este mes.</Typography>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {pendientes.map((act) => (
              <Box
                key={act._id}
                onClick={() => setActividadSeleccionada((prev) => (prev?._id === act._id ? null : act))}
                sx={{
                  display: "flex", alignItems: "center", gap: 1.5, p: 1.25, borderRadius: 2,
                  border: 1,
                  borderColor: actividadSeleccionada?._id === act._id ? "secondary.main" : "divider",
                  cursor: "pointer",
                  "&:hover": { bgcolor: "action.hover" },
                }}
              >
                <Avatar sx={{ width: 30, height: 30, fontSize: 12, bgcolor: "secondary.main" }}>
                  {act.tecnico?.nombre?.charAt(0) || "?"}
                </Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" fontWeight={600} noWrap>{act.actividad}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {act.tecnico?.nombre || "Sin técnico"} · {formatDate(act.fechaActividad)} · {act.horaInicio}–{act.horaFin}
                  </Typography>
                </Box>
                <Chip size="small" label={STATUS_LABEL[act.status] || act.status} color={STATUS_CHIP_COLOR[act.status] || "default"} />
              </Box>
            ))}
          </Box>
        )}

        {actividadSeleccionada && (
          <Box
            sx={{
              mt: 1.5, p: 1.5, borderRadius: 2, border: 1, borderColor: "divider",
              bgcolor: "background.default",
            }}
          >
            <Typography variant="subtitle2" fontWeight={700}>{actividadSeleccionada.actividad}</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
              {actividadSeleccionada.tecnico?.nombre || "Sin técnico"} · {formatDate(actividadSeleccionada.fechaActividad)} · {actividadSeleccionada.horaInicio}–{actividadSeleccionada.horaFin}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {actividadSeleccionada.comentarios || "Sin comentarios adicionales."}
            </Typography>
          </Box>
        )}
      </AppCard>

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
