import { useState } from "react";
import {
  Box, Alert, Paper, Grid, Typography, Autocomplete, TextField,
} from "@mui/material";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import PlayCircleOutlineIcon from "@mui/icons-material/PlayCircleOutlineOutlined";

import AppButton from "../../shared/components/AppButton";
import PageHeader from "../../shared/components/PageHeader";
import { formatDate } from "../../shared/utils/formatDate";
import { listarCertificados, enviarRecordatorioWhatsApp, ejecutarRecordatoriosWhatsAppLote } from "../../services/certificados";

/**
 * Panel exclusivo de Admin para probar el envío del recordatorio de
 * WhatsApp sin depender de que exista un certificado por vencer de verdad ni
 * arriesgarse a mandarle un mensaje a un cliente real por accidente — el
 * teléfono de destino SIEMPRE se escribe a mano aquí, nunca se usa
 * automáticamente el del cliente (a diferencia del botón en Certificados →
 * Por vencer, que sí lo usa).
 */
export default function WhatsAppPruebasPage() {
  const [opciones, setOpciones] = useState([]);
  const [buscando, setBuscando] = useState(false);
  const [cert, setCert] = useState(null);
  const [telefono, setTelefono] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState(null); // { tipo: "ok"|"error", mensaje }
  const [ejecutandoLote, setEjecutandoLote] = useState(false);
  const [resultadoLote, setResultadoLote] = useState(null);

  const buscar = async (texto) => {
    if (!texto || texto.length < 2) { setOpciones([]); return; }
    setBuscando(true);
    try {
      const { items } = await listarCertificados({ search: texto, pageSize: 20 });
      setOpciones(items);
    } catch {
      setOpciones([]);
    } finally {
      setBuscando(false);
    }
  };

  const enviar = async () => {
    if (!cert || !telefono.trim()) return;
    setEnviando(true);
    setResultado(null);
    try {
      await enviarRecordatorioWhatsApp(cert._id, telefono.trim());
      setResultado({ tipo: "ok", mensaje: "Mensaje de prueba enviado, con el certificado generado por el sistema adjunto en PDF." });
    } catch (err) {
      const data = err.response?.data;
      setResultado({
        tipo: "error",
        mensaje: data?.code === "WHATSAPP_NOT_CONFIGURED"
          ? "WhatsApp todavía no está configurado en el servidor (.env)."
          : (data?.message || "No se pudo enviar el mensaje de prueba."),
      });
    } finally {
      setEnviando(false);
    }
  };

  const ejecutarLote = async () => {
    setEjecutandoLote(true);
    setResultadoLote(null);
    try {
      const r = await ejecutarRecordatoriosWhatsAppLote();
      setResultadoLote(r);
    } catch (err) {
      setResultadoLote({ error: err.response?.data?.message || "No se pudo ejecutar el lote." });
    } finally {
      setEjecutandoLote(false);
    }
  };

  return (
    <Box>
      <PageHeader
        icon={<WhatsAppIcon />}
        title="WhatsApp — Panel de pruebas"
        subtitle="Manda el recordatorio de un certificado real a cualquier número, sin afectar al cliente"
      />

      <Alert severity="info" sx={{ mb: 2.5, borderRadius: "10px", maxWidth: 900 }}>
        Esto NO manda el mensaje al teléfono del cliente — siempre se manda al número que escribas abajo. El PDF se
        genera automáticamente a partir del certificado elegido (el mismo diseño de "Informe de calibración"), no hace
        falta subir nada. Úsalo para confirmar que se ve bien antes de usar el botón real en Certificados → Por vencer.
      </Alert>

      {resultado && (
        <Alert severity={resultado.tipo === "ok" ? "success" : "error"} sx={{ mb: 2.5, borderRadius: "10px", maxWidth: 900 }} onClose={() => setResultado(null)}>
          {resultado.mensaje}
        </Alert>
      )}

      <Paper variant="outlined" sx={{ p: 3, borderRadius: "12px", maxWidth: 900 }}>
        <Grid container spacing={2.5}>
          <Grid size={12}>
            <Autocomplete
              options={opciones}
              loading={buscando}
              value={cert}
              onChange={(_, v) => setCert(v)}
              onInputChange={(_, v) => buscar(v)}
              getOptionLabel={(o) => `${o.folio} — ${o.clienteSnapshot?.nombre || o.cliente?.nombre || "sin cliente"}`}
              isOptionEqualToValue={(a, b) => a._id === b._id}
              renderInput={(params) => (
                <TextField {...params} size="small" label="Buscar certificado por folio o cliente" placeholder="Escribe al menos 2 letras…" />
              )}
              noOptionsText="Sin resultados"
            />
          </Grid>

          {cert && (
            <Grid size={12}>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: "10px", bgcolor: "background.default" }}>
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5 }}>{cert.folio}</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                  Cliente: {cert.clienteSnapshot?.nombre || cert.cliente?.nombre || "—"} · Equipo: {cert.equipoSnapshot?.idInterno} {cert.equipoSnapshot?.descripcion}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                  Vigencia: {formatDate(cert.vigencia) || "sin fecha"}
                </Typography>
              </Paper>
            </Grid>
          )}

          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              size="small" fullWidth label="Número de prueba (con lada, ej. 6561234567)"
              value={telefono} onChange={(e) => setTelefono(e.target.value)}
            />
          </Grid>
        </Grid>

        <Box sx={{ mt: 3, display: "flex", justifyContent: "flex-end" }}>
          <AppButton
            startIcon={<WhatsAppIcon />}
            loading={enviando}
            disabled={!cert || !telefono.trim()}
            onClick={enviar}
            sx={{ borderRadius: "10px" }}
          >
            Enviar mensaje de prueba
          </AppButton>
        </Box>
      </Paper>

      <Paper variant="outlined" sx={{ p: 3, borderRadius: "12px", maxWidth: 900, mt: 3 }}>
        <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 0.5 }}>Recordatorio automático semanal</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Corre solo todos los días a las 9:00 am: manda el recordatorio (con el certificado en PDF) a los clientes
          cuyos certificados están a 30 días o menos de vencer, una vez por semana por certificado, y se detiene
          automáticamente en cuanto ya venció. Este botón lo ejecuta ahora mismo, sin esperar al horario, para
          probar el lote completo — sí manda mensajes reales a los clientes que cumplan la condición en este momento.
        </Typography>

        {resultadoLote && (
          <Alert severity={resultadoLote.error ? "error" : "info"} sx={{ mb: 2, borderRadius: "10px" }} onClose={() => setResultadoLote(null)}>
            {resultadoLote.error
              ? resultadoLote.error
              : `Revisados: ${resultadoLote.revisados} · Enviados: ${resultadoLote.enviados} · Errores: ${resultadoLote.errores}`}
          </Alert>
        )}

        <AppButton
          variant="outlined" startIcon={<PlayCircleOutlineIcon />} loading={ejecutandoLote}
          onClick={ejecutarLote} sx={{ borderRadius: "10px" }}
        >
          Ejecutar lote ahora
        </AppButton>
      </Paper>
    </Box>
  );
}
