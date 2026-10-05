import { useEffect, useRef, useState } from "react";
import {
  Box, Typography, TextField, IconButton, Paper, Chip, Button, CircularProgress, Divider,
} from "@mui/material";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import SmartToyOutlinedIcon from "@mui/icons-material/SmartToyOutlined";
import AddCircleOutlineOutlinedIcon from "@mui/icons-material/AddCircleOutlineOutlined";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import { consultarAsistente } from "../../services/incertidumbre";

const SUGERENCIAS_RAPIDAS = [
  "¿Qué componentes necesito para este instrumento?",
  "¿Cómo capturo la incertidumbre del certificado del patrón?",
  "Revisa si me falta algún dato",
];

export default function AsistentePanel({ contexto, onAgregarComponente }) {
  const [mensajes, setMensajes] = useState([
    {
      rol: "asistente",
      texto:
        "Hola. Te ayudo a armar el presupuesto de incertidumbre: qué componentes considerar, qué distribución usan y qué datos faltan. El cálculo final lo hace el motor determinístico, no yo.",
    },
  ]);
  const [texto, setTexto] = useState("");
  const [cargando, setCargando] = useState(false);
  const finRef = useRef(null);

  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes, cargando]);

  const enviar = async (preguntaTexto) => {
    const pregunta = (preguntaTexto ?? texto).trim();
    if (!pregunta || cargando) return;
    setTexto("");
    setMensajes((m) => [...m, { rol: "usuario", texto: pregunta }]);
    setCargando(true);
    try {
      const r = await consultarAsistente({ contexto, pregunta });
      setMensajes((m) => [...m, { rol: "asistente", ...r }]);
    } catch {
      setMensajes((m) => [
        ...m,
        { rol: "asistente", texto: "No pude responder ahora. Inténtalo de nuevo." },
      ]);
    } finally {
      setCargando(false);
    }
  };

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: 2, border: 1, borderColor: "divider",
        display: "flex", flexDirection: "column", height: "100%", minHeight: 520, overflow: "hidden",
      }}
    >
      <Box sx={{ p: 2.25, display: "flex", alignItems: "center", gap: 1.25, borderBottom: 1, borderColor: "divider", bgcolor: "background.default" }}>
        <Box sx={{ width: 34, height: 34, borderRadius: 2, display: "grid", placeItems: "center", bgcolor: "secondary.main", color: "#fff" }}>
          <SmartToyOutlinedIcon fontSize="small" />
        </Box>
        <Box>
          <Typography variant="subtitle2" fontWeight={700}>Asistente de incertidumbre</Typography>
          <Typography variant="caption" color="text.secondary">IA de apoyo · no calcula el resultado</Typography>
        </Box>
      </Box>

      <Box sx={{ flex: 1, overflowY: "auto", p: 2, display: "flex", flexDirection: "column", gap: 1.5 }}>
        {mensajes.map((m, i) => (
          <Mensaje key={i} m={m} onAgregar={onAgregarComponente} />
        ))}
        {cargando && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, color: "text.secondary" }}>
            <CircularProgress size={14} /> <Typography variant="caption">Pensando…</Typography>
          </Box>
        )}
        <div ref={finRef} />
      </Box>

      <Box sx={{ px: 2, pt: 1, display: "flex", gap: 0.75, flexWrap: "wrap" }}>
        {SUGERENCIAS_RAPIDAS.map((s) => (
          <Chip key={s} label={s} size="small" variant="outlined" onClick={() => enviar(s)} sx={{ cursor: "pointer" }} />
        ))}
      </Box>

      <Box sx={{ p: 2, display: "flex", gap: 1 }}>
        <TextField
          fullWidth size="small" placeholder="Escribe tu pregunta…"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), enviar())}
          sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
        />
        <IconButton color="primary" onClick={() => enviar()} disabled={cargando || !texto.trim()}>
          <SendRoundedIcon />
        </IconButton>
      </Box>
    </Paper>
  );
}

function Mensaje({ m, onAgregar }) {
  if (m.rol === "usuario") {
    return (
      <Box sx={{ alignSelf: "flex-end", maxWidth: "85%", bgcolor: "secondary.main", color: "#fff", px: 1.5, py: 1, borderRadius: 2, borderBottomRightRadius: 4 }}>
        <Typography variant="body2">{m.texto}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ alignSelf: "flex-start", maxWidth: "92%" }}>
      <Box sx={{ bgcolor: "background.default", px: 1.5, py: 1, borderRadius: 2, borderBottomLeftRadius: 4 }}>
        <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>{m.texto || m.respuesta}</Typography>
      </Box>

      {m.sugerencias?.length > 0 && (
        <Box sx={{ mt: 1, display: "flex", flexDirection: "column", gap: 0.75 }}>
          {m.sugerencias.map((s, i) => (
            <Paper key={i} elevation={0} sx={{ p: 1, border: 1, borderColor: "divider", borderRadius: 2, display: "flex", alignItems: "flex-start", gap: 1 }}>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" fontWeight={600}>{s.fuente}</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                  {[s.tipo && `tipo ${s.tipo}`, s.distribucion, s.modo].filter(Boolean).join(" · ")}
                </Typography>
                {s.porQue && <Typography variant="caption" color="text.secondary">{s.porQue}</Typography>}
              </Box>
              {onAgregar && (
                <IconButton size="small" onClick={() => onAgregar(s)} title="Agregar al presupuesto">
                  <AddCircleOutlineOutlinedIcon fontSize="small" color="secondary" />
                </IconButton>
              )}
            </Paper>
          ))}
        </Box>
      )}

      {m.datosFaltantes?.length > 0 && (
        <Box sx={{ mt: 1, p: 1, borderRadius: 2, bgcolor: "#F59E0B14" }}>
          <Typography variant="caption" fontWeight={700} sx={{ display: "flex", alignItems: "center", gap: 0.5, color: "#B45309" }}>
            <WarningAmberOutlinedIcon sx={{ fontSize: 15 }} /> Datos faltantes
          </Typography>
          <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
            {m.datosFaltantes.map((d, i) => <li key={i}><Typography variant="caption">{d}</Typography></li>)}
          </Box>
        </Box>
      )}

      {m.advertencias?.length > 0 && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.75, display: "block", fontStyle: "italic" }}>
          {m.advertencias.join(" · ")}
        </Typography>
      )}

      {m.nota && (
        <>
          <Divider sx={{ my: 1 }} />
          <Typography variant="caption" color="text.secondary">{m.nota}</Typography>
        </>
      )}
    </Box>
  );
}
