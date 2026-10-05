import { useState } from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, Box, Typography, TextField, MenuItem, Select, FormControl, InputLabel, Alert } from "@mui/material";
import AppButton from "../../shared/components/AppButton";
import { formatCurrency } from "../../shared/utils/currency";
import { emitirComplementoPago } from "../../services/cfdi";

const FORMAS_PAGO_SAT = [
  { v: "01", l: "01 - Efectivo" },
  { v: "02", l: "02 - Cheque nominativo" },
  { v: "03", l: "03 - Transferencia electrónica" },
  { v: "04", l: "04 - Tarjeta de crédito" },
  { v: "28", l: "28 - Tarjeta de débito" },
  { v: "99", l: "99 - Por definir" },
];

/**
 * Registra un pago parcial/total contra un CFDI de Ingreso con MetodoPago
 * "PPD" — crea un Complemento de Pago (CFDI tipo "P") en estado borrador,
 * listo para timbrarse aparte desde su propio detalle.
 */
export default function RegistrarPagoDialog({ cfdi, onClose, onCreado }) {
  const [formaPago, setFormaPago] = useState("03");
  const [fechaPago, setFechaPago] = useState(new Date().toISOString().slice(0, 10));
  const [monto, setMonto] = useState("");
  const [comentarios, setComentarios] = useState("");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [cfdiIdPrevio, setCfdiIdPrevio] = useState(null);

  const saldo = cfdi?.saldoPendiente ?? cfdi?.total ?? 0;

  // Reinicia el formulario cuando se abre para un CFDI distinto — ajuste de
  // estado durante el render (patrón recomendado por React en vez de un
  // useEffect con setState síncrono, que dispara un render en cascada).
  if (cfdi && cfdi._id !== cfdiIdPrevio) {
    setCfdiIdPrevio(cfdi._id);
    setFormaPago("03");
    setFechaPago(new Date().toISOString().slice(0, 10));
    setMonto(String(saldo));
    setComentarios("");
    setError("");
  }

  if (!cfdi) return null;

  const guardar = async () => {
    const montoNum = Number(monto);
    if (!(montoNum > 0)) { setError("El monto debe ser mayor a 0."); return; }
    if (montoNum > saldo) { setError(`El monto no puede ser mayor al saldo pendiente (${formatCurrency(saldo)}).`); return; }
    setGuardando(true); setError("");
    try {
      const creado = await emitirComplementoPago({
        comprobante: cfdi._id, fechaPago, formaPago, monto: montoNum, comentarios: comentarios || undefined,
      });
      onCreado(creado);
    } catch (err) {
      setError(err.response?.data?.message || "No se pudo registrar el pago.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Dialog open={!!cfdi} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>Registrar pago (Complemento)</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {cfdi.folioInterno} · Saldo pendiente: <b>{formatCurrency(saldo)}</b>
        </Typography>
        {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <TextField
            type="date" size="small" label="Fecha de pago" value={fechaPago}
            onChange={(e) => setFechaPago(e.target.value)} slotProps={{ inputLabel: { shrink: true } }}
          />
          <FormControl size="small" fullWidth>
            <InputLabel>Forma de pago (SAT)</InputLabel>
            <Select label="Forma de pago (SAT)" value={formaPago} onChange={(e) => setFormaPago(e.target.value)} sx={{ borderRadius: 2 }}>
              {FORMAS_PAGO_SAT.map((f) => <MenuItem key={f.v} value={f.v}>{f.l}</MenuItem>)}
            </Select>
          </FormControl>
          <TextField
            type="number" size="small" label="Monto pagado" value={monto}
            onChange={(e) => setMonto(e.target.value)} inputProps={{ min: 0.01, max: saldo, step: "0.01" }}
          />
          <TextField
            size="small" label="Comentarios (opcional)" multiline minRows={2}
            value={comentarios} onChange={(e) => setComentarios(e.target.value)}
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <AppButton type="button" variant="outlined" onClick={onClose} sx={{ borderRadius: 2 }}>Cancelar</AppButton>
        <AppButton type="button" loading={guardando} onClick={guardar} sx={{ borderRadius: 2 }}>Registrar pago</AppButton>
      </DialogActions>
    </Dialog>
  );
}
