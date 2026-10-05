import { useState } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Box, Typography, Chip,
  Table, TableHead, TableRow, TableCell, TableBody, Alert, TextField,
  MenuItem, Select, FormControl, InputLabel, Snackbar,
} from "@mui/material";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import AppButton from "../../shared/components/AppButton";
import { formatCurrency } from "../../shared/utils/currency";
import { formatDate } from "../../shared/utils/formatDate";
import {
  timbrarCfdi, cancelarCfdi, descargarXmlCfdi, descargarPdfCfdi, previsualizarXmlCfdi,
  resolverSolicitudCancelacionCfdi, confirmarCancelacionEnProcesoCfdi, eliminarCfdi,
} from "../../services/cfdi";
import CodeOutlinedIcon from "@mui/icons-material/CodeOutlined";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import PaymentsOutlinedIcon from "@mui/icons-material/PaymentsOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import { ESTADO_CFDI_CHIP, MOTIVOS_CANCELACION } from "./estadosCfdi";
import RegistrarPagoDialog from "./RegistrarPagoDialog";
import ConfirmDialog from "../../shared/components/ConfirmDialog";

function descargarBlob(blob, nombre) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = nombre;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function CfdiDetalleDialog({ cfdi, onClose, onCambiado, onEliminado, accionInicial }) {
  const [error, setError] = useState(null); // { message, code }
  const [cargando, setCargando] = useState(false);
  const [motivoCodigoCancelacion, setMotivoCodigoCancelacion] = useState("");
  const [folioSustitucion, setFolioSustitucion] = useState("");
  const [pidiendoCancelacion, setPidiendoCancelacion] = useState(false);
  const [preview, setPreview] = useState(null); // { xml, nombre } | null
  const [previewDeId, setPreviewDeId] = useState(null);
  const [cargandoPreview, setCargandoPreview] = useState(false);
  const [pagando, setPagando] = useState(false);
  const [toast, setToast] = useState(null); // { message, severity } | null
  const [accionAplicadaPara, setAccionAplicadaPara] = useState(null);
  const [pidiendoEliminar, setPidiendoEliminar] = useState(false);
  const [eliminando, setEliminando] = useState(false);

  // Si se abre un comprobante distinto, se descarta el XML mostrado del
  // anterior — sin esto quedaba viendo el XML de otro CFDI hasta volver a
  // darle "Ver XML" a propósito.
  if (cfdi && preview && previewDeId !== cfdi._id) {
    setPreview(null);
    setPreviewDeId(null);
  }

  // Permite abrir el diálogo directo en "Cancelar" o "Registrar pago" desde
  // el menú de acciones de la tabla, sin obligar a un clic extra dentro del
  // detalle — se aplica una sola vez por comprobante abierto.
  if (cfdi && accionInicial && accionAplicadaPara !== cfdi._id) {
    setAccionAplicadaPara(cfdi._id);
    if (accionInicial === "cancelar") setPidiendoCancelacion(true);
    if (accionInicial === "pagar") setPagando(true);
  }

  if (!cfdi) return null;
  const s = ESTADO_CFDI_CHIP[cfdi.estado] || { label: cfdi.estado, color: "default" };
  const puedeTimbrar = ["borrador", "pendiente_timbrar", "error_timbrado"].includes(cfdi.estado);
  const puedeEliminar = ["borrador", "error_timbrado"].includes(cfdi.estado);
  const puedeCancelar = cfdi.estado === "timbrada";
  const esperandoAceptacion = cfdi.estado === "cancelacion_pendiente";
  const cancelacionEnProceso = cfdi.estado === "cancelacion_en_proceso";
  const esFacturaPPD = cfdi.tipoComprobante === "I" && cfdi.metodoPago === "PPD";
  const saldo = cfdi.saldoPendiente ?? (esFacturaPPD ? cfdi.total : null);
  const puedeRegistrarPago = cfdi.estado === "timbrada" && esFacturaPPD && saldo > 0;

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
      setToast({
        message: `Factura ${actualizado.folioInterno} timbrada correctamente${actualizado.uuid ? ` — UUID ${actualizado.uuid}` : ""}`,
        severity: "success",
      });
    } catch (err) {
      manejarError(err);
      setToast({ message: "No se pudo timbrar el comprobante.", severity: "error" });
    } finally { setCargando(false); }
  };

  const cancelar = async () => {
    if (!motivoCodigoCancelacion) { setError({ message: "Selecciona el motivo de cancelación." }); return; }
    if (motivoCodigoCancelacion === "01" && !folioSustitucion.trim()) {
      setError({ message: "El motivo 01 requiere el folio fiscal (UUID) del CFDI que sustituye a este." });
      return;
    }
    setCargando(true); setError(null);
    try {
      const actualizado = await cancelarCfdi(cfdi._id, motivoCodigoCancelacion, undefined, folioSustitucion.trim() || undefined);
      onCambiado(actualizado);
      setPidiendoCancelacion(false);
      setToast({
        message: actualizado.estado === "cancelacion_pendiente"
          ? `Solicitud de cancelación enviada — pendiente de aceptación del receptor.`
          : `Factura ${actualizado.folioInterno} cancelada correctamente.`,
        severity: "success",
      });
    } catch (err) {
      manejarError(err);
      setToast({ message: "No se pudo cancelar el comprobante.", severity: "error" });
    } finally { setCargando(false); }
  };

  const resolverCancelacion = async (aceptar) => {
    setCargando(true); setError(null);
    try {
      const actualizado = await resolverSolicitudCancelacionCfdi(cfdi._id, aceptar);
      onCambiado(actualizado);
      setToast({
        message: aceptar ? "Cancelación aceptada." : "Cancelación rechazada — el comprobante sigue vigente.",
        severity: "success",
      });
    } catch (err) {
      manejarError(err);
      setToast({ message: "No se pudo resolver la solicitud de cancelación.", severity: "error" });
    } finally { setCargando(false); }
  };

  const confirmarCancelacion = async () => {
    setCargando(true); setError(null);
    try {
      const actualizado = await confirmarCancelacionEnProcesoCfdi(cfdi._id);
      onCambiado(actualizado);
      setToast({ message: `Factura ${actualizado.folioInterno} marcada como cancelada.`, severity: "success" });
    } catch (err) {
      manejarError(err);
      setToast({ message: "No se pudo confirmar la cancelación.", severity: "error" });
    } finally { setCargando(false); }
  };

  const verPreview = async () => {
    setCargandoPreview(true); setError(null);
    try {
      if (cfdi.uuid) {
        // Ya está timbrado: se muestra el XML REAL firmado, no uno reconstruido.
        const blob = await descargarXmlCfdi(cfdi._id);
        setPreview({ xml: await blob.text(), nombre: `${cfdi.folioInterno}.xml` });
      } else {
        setPreview(await previsualizarXmlCfdi(cfdi._id));
      }
      setPreviewDeId(cfdi._id);
    } catch (err) { manejarError(err); } finally { setCargandoPreview(false); }
  };

  const descargarPreview = () => {
    if (!preview) return;
    descargarBlob(new Blob([preview.xml], { type: "application/xml" }), preview.nombre);
  };

  const eliminar = async () => {
    setEliminando(true); setError(null);
    try {
      await eliminarCfdi(cfdi._id);
      setPidiendoEliminar(false);
      onEliminado?.(cfdi);
    } catch (err) {
      manejarError(err);
      setToast({ message: "No se pudo eliminar el comprobante.", severity: "error" });
    } finally { setEliminando(false); }
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

        {cfdi.estado === "cancelada" && cfdi.cancelacion && (
          <Alert severity="info" sx={{ mb: 2.5, borderRadius: 2 }}>
            Cancelada el {formatDate(cfdi.cancelacion.fecha)} — motivo {cfdi.cancelacion.motivoCodigo}
            {cfdi.cancelacion.folioSustitucion && <> · sustituye a {cfdi.cancelacion.folioSustitucion}</>}
          </Alert>
        )}

        {esperandoAceptacion && (
          <Alert severity="warning" sx={{ mb: 2.5, borderRadius: 2 }}>
            Solicitud de cancelación pendiente de aceptación del receptor (monto superior a $5,000).
            {cfdi.cancelacion?.fechaLimiteRespuesta && (
              <> Vence el {formatDate(cfdi.cancelacion.fechaLimiteRespuesta)}; si no hay respuesta se acepta automáticamente.</>
            )}
          </Alert>
        )}

        {cancelacionEnProceso && (
          <Alert severity="warning" sx={{ mb: 2.5, borderRadius: 2 }}>
            Cancelación enviada al PAC, pero <b>todavía no está confirmada ante el SAT</b> — el proveedor solo la
            encoló (puede tardar unos minutos). Este comprobante sigue vigente fiscalmente hasta confirmarla.
            Verifica el folio como cancelado en el portal del SAT o en el panel del PAC antes de confirmar aquí.
          </Alert>
        )}

        {esFacturaPPD && cfdi.estado === "timbrada" && (
          <Alert severity={saldo > 0 ? "info" : "success"} sx={{ mb: 2.5, borderRadius: 2 }}>
            {saldo > 0
              ? <>Pago en parcialidades o diferido — saldo pendiente: <b>{formatCurrency(saldo)}</b></>
              : <b>Pagada totalmente — sin saldo pendiente</b>}
          </Alert>
        )}

        {cfdi.tipoComprobante === "P" && cfdi.pago && (
          <Box sx={{ mb: 2.5, p: 1.5, borderRadius: 2, bgcolor: "background.default", border: 1, borderColor: "divider" }}>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5 }}>Complemento de Pago</Typography>
            <Typography variant="caption" sx={{ display: "block" }}>
              Fecha de pago: {formatDate(cfdi.pago.fechaPago)} · Forma de pago: {cfdi.pago.formaPago} · Monto: {formatCurrency(cfdi.pago.monto)}
            </Typography>
            {cfdi.pago.docRelacionado && (
              <Typography variant="caption" sx={{ display: "block" }}>
                Documento relacionado: {cfdi.pago.docRelacionado.serie || ""}{cfdi.pago.docRelacionado.folio || ""} · Parcialidad {cfdi.pago.docRelacionado.numParcialidad} ·
                {" "}Saldo anterior {formatCurrency(cfdi.pago.docRelacionado.impSaldoAnterior)} → insoluto {formatCurrency(cfdi.pago.docRelacionado.impSaldoInsoluto)}
              </Typography>
            )}
          </Box>
        )}

        <Table size="small" sx={{ mb: 2, "& .MuiTableCell-root": { py: 1.25, fontSize: 13.5 }, "& td:not(:first-of-type), & th:not(:first-of-type)": { whiteSpace: "nowrap" } }}>
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
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 2 }}>
            <FormControl size="small" fullWidth>
              <InputLabel>Motivo de cancelación (SAT)</InputLabel>
              <Select
                label="Motivo de cancelación (SAT)"
                value={motivoCodigoCancelacion}
                onChange={(e) => setMotivoCodigoCancelacion(e.target.value)}
                sx={{ borderRadius: 2 }}
              >
                {MOTIVOS_CANCELACION.map((m) => (
                  <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
            {motivoCodigoCancelacion === "01" && (
              <TextField
                fullWidth size="small" label="Folio fiscal (UUID) que sustituye a este CFDI"
                value={folioSustitucion} onChange={(e) => setFolioSustitucion(e.target.value)}
              />
            )}
          </Box>
        )}

        {preview && (
          <Box sx={{ mt: 2.5 }}>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
              <Typography variant="subtitle2" fontWeight={700}>
                XML {cfdi.uuid ? "timbrado" : "sin timbrar (vista previa)"}
              </Typography>
              <AppButton type="button" size="small" variant="text" startIcon={<DownloadOutlinedIcon />} onClick={descargarPreview}>
                Descargar
              </AppButton>
            </Box>
            {!cfdi.uuid && (
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
                Este XML todavía no está firmado ni timbrado ante el SAT — es solo para revisar que los datos
                salgan bien formados antes de conectar un PAC.
              </Typography>
            )}
            <Box
              component="pre"
              sx={{
                m: 0, p: 1.5, borderRadius: 2, bgcolor: "background.default", border: 1, borderColor: "divider",
                fontSize: 11.5, fontFamily: "monospace", whiteSpace: "pre-wrap", wordBreak: "break-all",
                maxHeight: 260, overflow: "auto",
              }}
            >
              {preview.xml}
            </Box>
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, flexWrap: "wrap", gap: 1 }}>
        <AppButton type="button" variant="outlined" startIcon={<CodeOutlinedIcon />} loading={cargandoPreview} onClick={verPreview} sx={{ borderRadius: 2 }}>
          Ver XML
        </AppButton>
        {cfdi.uuid && (
          <AppButton type="button" variant="outlined" onClick={descargarPdf} sx={{ borderRadius: 2 }}>PDF</AppButton>
        )}
        <Box sx={{ flex: 1 }} />
        {puedeRegistrarPago && (
          <AppButton type="button" variant="outlined" startIcon={<PaymentsOutlinedIcon />} onClick={() => setPagando(true)} sx={{ borderRadius: 2 }}>
            Registrar pago
          </AppButton>
        )}
        {esperandoAceptacion && (
          <>
            <AppButton type="button" variant="outlined" color="error" loading={cargando} onClick={() => resolverCancelacion(false)} sx={{ borderRadius: 2 }}>
              Rechazar cancelación
            </AppButton>
            <AppButton type="button" color="success" loading={cargando} onClick={() => resolverCancelacion(true)} sx={{ borderRadius: 2 }}>
              Aceptar cancelación
            </AppButton>
          </>
        )}
        {cancelacionEnProceso && (
          <AppButton type="button" color="success" loading={cargando} onClick={confirmarCancelacion} sx={{ borderRadius: 2 }}>
            Confirmar cancelación
          </AppButton>
        )}
        {puedeCancelar && !pidiendoCancelacion && (
          <AppButton type="button" variant="outlined" color="error" onClick={() => setPidiendoCancelacion(true)} sx={{ borderRadius: 2 }}>
            Cancelar CFDI
          </AppButton>
        )}
        {puedeEliminar && (
          <AppButton type="button" variant="outlined" color="error" startIcon={<DeleteOutlineIcon />} onClick={() => setPidiendoEliminar(true)} sx={{ borderRadius: 2 }}>
            Eliminar borrador
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
      <RegistrarPagoDialog
        cfdi={pagando ? cfdi : null}
        onClose={() => setPagando(false)}
        onCreado={(creado) => {
          setPagando(false);
          onCambiado(creado);
          setToast({ message: `Pago registrado — se generó el Complemento de Pago ${creado.folioInterno}.`, severity: "success" });
        }}
      />
      <ConfirmDialog
        open={pidiendoEliminar}
        title="Eliminar borrador"
        message={`¿Eliminar el borrador ${cfdi.folioInterno}? Esto no se puede deshacer.`}
        loading={eliminando}
        onCancel={() => setPidiendoEliminar(false)}
        onConfirm={eliminar}
      />
      <Snackbar
        open={!!toast}
        autoHideDuration={5000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        {toast && (
          <Alert severity={toast.severity} variant="filled" onClose={() => setToast(null)} sx={{ borderRadius: 2 }}>
            {toast.message}
          </Alert>
        )}
      </Snackbar>
    </Dialog>
  );
}
