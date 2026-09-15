import { useState } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Box, Typography, Chip,
  Table, TableHead, TableRow, TableCell, TableBody, Alert, TextField,
} from "@mui/material";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import AppButton from "../../shared/components/AppButton";
import { formatCurrency } from "../../shared/utils/currency";
import { formatDate } from "../../shared/utils/formatDate";
import { timbrarCfdi, cancelarCfdi, descargarXmlCfdi, descargarPdfCfdi } from "../../services/cfdi";
import { ESTADO_CFDI_CHIP } from "./estadosCfdi";

function descargarBlob(blob, nombre) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = nombre;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function CfdiDetalleDialog({ cfdi, onClose, onCambiado }) {
  const [error, setError] = useState(null); // { message, code }
  const [cargando, setCargando] = useState(false);
  const [motivoCancelacion, setMotivoCancelacion] = useState("");
  const [pidiendoCancelacion, setPidiendoCancelacion] = useState(false);

  if (!cfdi) return null;
  const s = ESTADO_CFDI_CHIP[cfdi.estado] || { label: cfdi.estado, color: "default" };
  const puedeTimbrar = ["borrador", "pendiente_timbrar", "error_timbrado"].includes(cfdi.estado);
  const puedeCancelar = cfdi.estado === "timbrada";

  // Con responseType:"blob" (descargas de XML/PDF), axios entrega el cuerpo
  // del error como Blob, no como JSON — sin esto, cualquier error al
  // descargar (incluido PAC_NOT_CONFIGURED) se mostraba como "Ocurrió un
  // error." genérico en vez del mensaje real del backend.
  const manejarError = async (err) => {
    const data = err.response?.data;
    if (data instanceof Blob) {
      try {
        const parsed = JSON.parse(await data.text());
        setError({ message: parsed.message || "Ocurrió un error.", code: parsed.code });
        return;
      } catch {
        // el blob no era JSON (respuesta no esperada) — cae al mensaje genérico
      }
    }
    setError({ message: data?.message || "Ocurrió un error.", code: data?.code });
  };

  const timbrar = async () => {
    setCargando(true); setError(null);
    try {
      const actualizado = await timbrarCfdi(cfdi._id);
      onCambiado(actualizado);
    } catch (err) { manejarError(err); } finally { setCargando(false); }
  };

  const cancelar = async () => {
    if (!motivoCancelacion.trim()) { setError({ message: "Indica el motivo de cancelación." }); return; }
    setCargando(true); setError(null);
    try {
      const actualizado = await cancelarCfdi(cfdi._id, motivoCancelacion.trim());
      onCambiado(actualizado);
      setPidiendoCancelacion(false);
    } catch (err) { manejarError(err); } finally { setCargando(false); }
  };

  const descargarXml = async () => {
    try { descargarBlob(await descargarXmlCfdi(cfdi._id), `${cfdi.folioInterno}.xml`); }
    catch (err) { manejarError(err); }
  };
  const descargarPdf = async () => {
    try { descargarBlob(await descargarPdfCfdi(cfdi._id), `${cfdi.folioInterno}.pdf`); }
    catch (err) { manejarError(err); }
  };

  return (
    <Dialog open={!!cfdi} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontWeight: 700 }}>
        {cfdi.folioInterno}
        <Chip size="small" label={s.label} color={s.color} />
      </DialogTitle>
      <DialogContent dividers>
        {error && (
          <Alert
            severity={error.code === "PAC_NOT_CONFIGURED" ? "warning" : "error"}
            icon={error.code === "PAC_NOT_CONFIGURED" ? <WarningAmberOutlinedIcon /> : undefined}
            sx={{ mb: 2, borderRadius: 2 }}
            onClose={() => setError(null)}
          >
            {error.message}
            {error.code === "PAC_NOT_CONFIGURED" && (
              <Typography variant="caption" sx={{ display: "block", mt: 0.5 }}>
                No hay ningún proveedor de timbrado (PAC) conectado todavía — este comprobante no se puede
                timbrar hasta que se contrate uno y se configuren sus credenciales en el servidor.
              </Typography>
            )}
          </Alert>
        )}

        {cfdi.errorTimbrado?.mensaje && cfdi.estado === "error_timbrado" && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
            Último intento de timbrado falló: {cfdi.errorTimbrado.mensaje}
          </Alert>
        )}

        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 3, mb: 2.5 }}>
          <Box>
            <Typography variant="caption" color="text.secondary">Emisor</Typography>
            <Typography variant="body2" fontWeight={700}>{cfdi.emisor?.nombre}</Typography>
            <Typography variant="caption">RFC {cfdi.emisor?.rfc} · Régimen {cfdi.emisor?.regimenFiscal}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">Receptor</Typography>
            <Typography variant="body2" fontWeight={700}>{cfdi.receptor?.nombre}</Typography>
            <Typography variant="caption">
              RFC {cfdi.receptor?.rfc} · CP {cfdi.receptor?.codigoPostal} · Uso CFDI {cfdi.receptor?.usoCFDI}
            </Typography>
          </Box>
        </Box>

        {cfdi.uuid && (
          <Box sx={{ mb: 2.5, p: 1.5, borderRadius: 2, bgcolor: "success.main", color: "#fff" }}>
            <Typography variant="caption">UUID fiscal</Typography>
            <Typography variant="body2" fontWeight={700} sx={{ wordBreak: "break-all" }}>{cfdi.uuid}</Typography>
            <Typography variant="caption">Timbrado el {formatDate(cfdi.fechaTimbrado)}</Typography>
          </Box>
        )}

        {cfdi.estado === "cancelada" && cfdi.cancelacion?.motivo && (
          <Alert severity="info" sx={{ mb: 2.5, borderRadius: 2 }}>
            Cancelada el {formatDate(cfdi.cancelacion.fecha)} — motivo: {cfdi.cancelacion.motivo}
          </Alert>
        )}

        <Table size="small" sx={{ mb: 2 }}>
          <TableHead>
            <TableRow>
              <TableCell>Descripción</TableCell>
              <TableCell align="right">Cantidad</TableCell>
              <TableCell align="right">Valor unitario</TableCell>
              <TableCell align="right">Importe</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(cfdi.conceptos || []).map((c, i) => (
              <TableRow key={i}>
                <TableCell>{c.descripcion}</TableCell>
                <TableCell align="right">{c.cantidad}</TableCell>
                <TableCell align="right">{formatCurrency(c.valorUnitario)}</TableCell>
                <TableCell align="right">{formatCurrency(c.importe)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
          <Box sx={{ textAlign: "right" }}>
            <Typography variant="body2" color="text.secondary">Subtotal: {formatCurrency(cfdi.subtotal)}</Typography>
            <Typography variant="body2" color="text.secondary">IVA: {formatCurrency(cfdi.totalImpuestosTrasladados)}</Typography>
            <Typography variant="h6" fontWeight={700} color="secondary.main">{formatCurrency(cfdi.total)}</Typography>
          </Box>
        </Box>

        {pidiendoCancelacion && (
          <TextField
            fullWidth size="small" sx={{ mt: 2 }} label="Motivo de cancelación (obligatorio)"
            value={motivoCancelacion} onChange={(e) => setMotivoCancelacion(e.target.value)}
          />
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, flexWrap: "wrap", gap: 1 }}>
        {cfdi.uuid && (
          <>
            <AppButton type="button" variant="outlined" onClick={descargarXml} sx={{ borderRadius: 2 }}>XML</AppButton>
            <AppButton type="button" variant="outlined" onClick={descargarPdf} sx={{ borderRadius: 2 }}>PDF</AppButton>
          </>
        )}
        <Box sx={{ flex: 1 }} />
        {puedeCancelar && !pidiendoCancelacion && (
          <AppButton type="button" variant="outlined" color="error" onClick={() => setPidiendoCancelacion(true)} sx={{ borderRadius: 2 }}>
            Cancelar CFDI
          </AppButton>
        )}
        {pidiendoCancelacion && (
          <AppButton type="button" color="error" loading={cargando} onClick={cancelar} sx={{ borderRadius: 2 }}>
            Confirmar cancelación
          </AppButton>
        )}
        {puedeTimbrar && (
          <AppButton type="button" loading={cargando} onClick={timbrar} sx={{ borderRadius: 2 }}>
            Timbrar
          </AppButton>
        )}
        <AppButton type="button" variant="outlined" onClick={onClose} sx={{ borderRadius: 2 }}>Cerrar</AppButton>
      </DialogActions>
    </Dialog>
  );
}
