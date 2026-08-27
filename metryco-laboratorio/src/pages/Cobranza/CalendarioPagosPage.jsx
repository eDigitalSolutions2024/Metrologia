import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Typography, Paper, Grid, Button, Dialog, DialogTitle, DialogContent, DialogActions, Chip,
} from "@mui/material";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";

import AppButton from "../../shared/components/AppButton";
import { formatDate } from "../../shared/utils/formatDate";
import { formatCurrency } from "../../shared/utils/currency";
import { MOCK } from "./mockData";

const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}
// Lunes = 0 (igual que el legacy, que arranca la semana en lunes)
function getFirstDayMonFirst(year, month) {
  return (new Date(year, month, 1).getDay() + 6) % 7;
}
function toFecha(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

// Refleja php/calendario_consultar.php + class_calendar.php: calendario mensual,
// cada día muestra "N Registros" (pagos con esa fecha de vencimiento) y al hacer
// clic se abre el detalle, igual que el sidebar getEvents() del legacy.
export default function CalendarioPagosPage() {
  const navigate = useNavigate();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [diaSeleccionado, setDiaSeleccionado] = useState(null);

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayMonFirst(year, month);
  const today = now.getDate();
  const isCurrentMonth = now.getFullYear() === year && now.getMonth() === month;

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear((y) => y - 1); } else setMonth((m) => m - 1); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear((y) => y + 1); } else setMonth((m) => m + 1); };

  const registrosPorDia = MOCK.reduce((acc, r) => {
    (acc[r.fechaPago] ??= []).push(r);
    return acc;
  }, {});

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const registrosDelDia = diaSeleccionado ? (registrosPorDia[diaSeleccionado] ?? []) : [];

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>Calendario de Pagos</Typography>
        <AppButton startIcon={<ReceiptLongOutlinedIcon />} onClick={() => navigate("/cobranza")} sx={{ borderRadius: 2 }}>
          Administrar Facturas
        </AppButton>
      </Box>

      <Paper elevation={0} sx={{ border: 1, borderColor: "divider", borderRadius: 4, overflow: "hidden" }}>
        <Box sx={{ borderBottom: 1, display: "flex", alignItems: "center", justifyContent: "space-between", px: 3, py: 2, borderColor: "divider" }}>
          <Button onClick={prevMonth} size="small" sx={{ minWidth: 36 }}><ChevronLeftIcon /></Button>
          <Typography variant="h6" fontWeight={700}>{MESES[month]} {year}</Typography>
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
            const registros = fecha ? (registrosPorDia[fecha] ?? []) : [];
            const isToday = isCurrentMonth && day === today;

            return (
              <Grid
                key={idx}
                size={{ xs: 12 / 7 }}
                onClick={() => day && setDiaSeleccionado(fecha)}
                sx={{
                  minHeight: 90,
                  borderRight: (idx + 1) % 7 !== 0 ? 1 : 0,
                  borderBottom: 1,
                  borderColor: "divider",
                  p: 1,
                  bgcolor: !day ? "background.default" : isToday ? "secondary.main" + "14" : "background.paper",
                  cursor: day ? "pointer" : "default",
                  "&:hover": day ? { bgcolor: "action.hover" } : {},
                }}
              >
                {day && (
                  <>
                    <Typography variant="body2" fontWeight={isToday ? 700 : 400} sx={{ color: isToday ? "secondary.main" : "text.primary", mb: 0.5 }}>
                      {day}
                    </Typography>
                    <Typography variant="caption" sx={{ color: registros.length > 0 ? "warning.main" : "text.secondary", fontWeight: registros.length > 0 ? 700 : 400 }}>
                      {registros.length} Registros
                    </Typography>
                  </>
                )}
              </Grid>
            );
          })}
        </Grid>
      </Paper>

      <Dialog open={!!diaSeleccionado} onClose={() => setDiaSeleccionado(null)} fullWidth maxWidth="sm">
        <DialogTitle>{diaSeleccionado && formatDate(diaSeleccionado)}</DialogTitle>
        <DialogContent>
          {registrosDelDia.length === 0 ? (
            <Typography variant="body2" color="text.secondary">Sin registros para este día.</Typography>
          ) : (
            registrosDelDia.map((r) => (
              <Box key={r.id} sx={{ py: 1.25, borderBottom: 1, borderColor: "divider" }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Typography variant="body2" fontWeight={700}>{r.clienteNombre} — {r.oc}</Typography>
                  <Chip label={r.statusPago === 1 ? "Pagado" : "Pendiente"} color={r.statusPago === 1 ? "success" : "warning"} size="small" />
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                  Factura: {r.folio} · Monto: {formatCurrency(r.monto)} · C/R: {formatDate(r.fechaCr)}
                </Typography>
                {r.comentarios && <Typography variant="caption">{r.comentarios}</Typography>}
              </Box>
            ))
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <AppButton variant="outlined" onClick={() => setDiaSeleccionado(null)} sx={{ borderRadius: 2 }}>Cerrar</AppButton>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
