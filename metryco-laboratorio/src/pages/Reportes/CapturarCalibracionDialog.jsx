import { useEffect, useMemo, useState } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Box, Typography, TextField, MenuItem,
  ToggleButton, ToggleButtonGroup, Chip, IconButton, Tooltip, Alert,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";

import AppButton from "../../shared/components/AppButton";
import { listarMagnitudes, listarModelos, listarCalculos, crearCalculo } from "../../services/incertidumbre";
import { obtenerPerformance } from "../../services/performance";
import { cambiarEstadoAsignacion, actualizarAsignacion } from "../../services/reportes";
import { obtenerLaboratorio } from "../../services/configuracion";

const RAZONES_SERVICIO = ["Calibración", "Revisión", "Reparación", "Verificación"];
const TIPOS_SERVICIO = ["Acreditado", "No acreditado"];

const numOrU = (x) => {
  const n = parseFloat(x);
  return Number.isFinite(n) ? n : undefined;
};
// Number("") === 0, así que hay que descartar los segmentos vacíos ANTES de
// convertir a número — si no, una caja de lecturas vacía se lee como "una
// lectura de valor 0" (falso PASA/NO PASA, y hasta se llegaría a guardar).
const parseLecturas = (txt) =>
  (txt || "").split(/[\s,;]+/).map((s) => s.trim()).filter(Boolean).map(Number).filter(Number.isFinite);
const media = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

let uidSeq = 0;
const puntoVacio = () => ({
  id: `p${++uidSeq}`, prueba: "", nominal: "", unidad: "", emp: "",
  lecturasUnico: "", lecturasEncontrado: "", lecturasDejado: "",
});

/**
 * Un solo popup para capturar una calibración completa: tolerancia (EMP,
 * heredado del Performance ligado a la asignación si existe) e incertidumbre
 * (GUM, vía una plantilla) juntas, punto por punto. Reemplaza tener que
 * visitar Performance e Incertidumbre por separado para lo mismo.
 *
 * No edita contribuciones a mano — requiere elegir una plantilla y deja que
 * el motor las derive (igual que hace `crearCalculo` cuando no se manda
 * `contribuciones` explícitas). Ajustes finos siguen viviendo en
 * Incertidumbre → Análisis de Incertidumbre, sin tocar esta pantalla.
 */
export default function CapturarCalibracionDialog({ open, asignacion, onClose, onDone }) {
  const [magnitudes, setMagnitudes] = useState([]);
  const [magnitud, setMagnitud] = useState("");
  const [tipo, setTipo] = useState("");
  const [modelos, setModelos] = useState([]);
  const [modeloId, setModeloId] = useState("");
  const [mensurando, setMensurando] = useState("");
  const [unidad, setUnidad] = useState("");
  const [nivelConfianza, setNivelConfianza] = useState("95.45%");

  // Datos del servicio — antes se preguntaban de nuevo al Emitir certificado;
  // se capturan aquí, una sola vez, y el certificado los hereda solo.
  const [razon, setRazon] = useState("Calibración");
  const [tipoServicio, setTipoServicio] = useState("");
  const [procedimiento, setProcedimiento] = useState("");
  const [temperatura, setTemperatura] = useState("");
  const [humedad, setHumedad] = useState("");
  const [comentarios, setComentarios] = useState("");

  const [modoCaptura, setModoCaptura] = useState("unico");
  const [puntos, setPuntos] = useState([puntoVacio()]);
  const [cargandoPuntos, setCargandoPuntos] = useState(false);
  const [avisoPerformance, setAvisoPerformance] = useState("");
  const [calcsPrevios, setCalcsPrevios] = useState(0);

  const [guardando, setGuardando] = useState(false);
  const [errorGlobal, setErrorGlobal] = useState("");
  const [resumen, setResumen] = useState(null); // { ok, fallos: [{etiqueta, mensaje}] }

  const tiposDeMagnitud = useMemo(
    () => magnitudes.find((m) => m.clave === magnitud)?.tipos || [],
    [magnitudes, magnitud]
  );
  const patronesUsados = useMemo(
    () => (asignacion?.patrones || []).map((p) => p._id || p).filter(Boolean),
    [asignacion]
  );

  // Reinicia y precarga cada vez que se abre para una asignación distinta.
  useEffect(() => {
    if (!open || !asignacion) return;
    setMagnitud(""); setTipo(""); setModeloId(""); setModelos([]);
    setMensurando(""); setUnidad(""); setNivelConfianza("95.45%");
    setModoCaptura("unico");
    setErrorGlobal(""); setResumen(null);

    // Datos del servicio: si ya se habían capturado antes para esta
    // asignación, se precargan; si no, defaults razonables.
    setRazon(asignacion.servicio?.razon || "Calibración");
    setProcedimiento(asignacion.servicio?.procedimiento || "");
    setTemperatura(asignacion.condiciones?.temperatura ?? "");
    setHumedad(asignacion.condiciones?.humedad ?? "");
    setComentarios(asignacion.comentarios || "");
    if (asignacion.servicio?.tipo) {
      setTipoServicio(asignacion.servicio.tipo);
    } else {
      // Si el laboratorio tiene acreditación configurada, "Acreditado" es el
      // default razonable — si falla (p.ej. rol sin permiso), se deja "Acreditado" fijo.
      obtenerLaboratorio()
        .then((lab) => setTipoServicio(lab?.acreditacion ? "Acreditado" : "No acreditado"))
        .catch(() => setTipoServicio("Acreditado"));
    }

    listarMagnitudes().then(setMagnitudes).catch(() => setMagnitudes([]));
    listarCalculos({ asignacion: asignacion._id, pageSize: 1 })
      .then(({ total }) => setCalcsPrevios(total || 0))
      .catch(() => setCalcsPrevios(0));

    const perfId = asignacion.performance?._id || asignacion.performance;
    if (perfId) {
      setCargandoPuntos(true);
      setAvisoPerformance("");
      obtenerPerformance(perfId)
        .then((perf) => {
          const filas = (perf.puntos || []).map((p) => ({
            id: `p${++uidSeq}`,
            prueba: p.prueba || "",
            nominal: p.nominal ?? "",
            unidad: p.unidad || "",
            emp: p.maximo != null && p.minimo != null ? Number(((p.maximo - p.minimo) / 2).toPrecision(6)) : "",
            lecturasUnico: "", lecturasEncontrado: "", lecturasDejado: "",
          }));
          setPuntos(filas.length ? filas : [puntoVacio()]);
        })
        .catch(() => {
          setPuntos([puntoVacio()]);
          setAvisoPerformance("No se pudo cargar el Performance vinculado a esta asignación — captura los puntos a mano.");
        })
        .finally(() => setCargandoPuntos(false));
    } else {
      setPuntos([puntoVacio()]);
    }
  }, [open, asignacion]);

  useEffect(() => {
    if (!magnitud || !tipo) { setModelos([]); return; }
    listarModelos({ magnitud, tipoInstrumento: tipo }).then(setModelos).catch(() => setModelos([]));
  }, [magnitud, tipo]);

  const cargarPlantilla = (id) => {
    setModeloId(id);
    const m = modelos.find((x) => x._id === id);
    if (!m) return;
    setMensurando(m.mensurando || "");
    setUnidad(m.unidad || "");
    setNivelConfianza(m.nivelConfianza || "95.45%");
  };

  const setPunto = (id, campo, val) =>
    setPuntos((ps) => ps.map((p) => (p.id === id ? { ...p, [campo]: val } : p)));
  const quitarPunto = (id) => setPuntos((ps) => ps.filter((p) => p.id !== id));
  const agregarPunto = () => setPuntos((ps) => [...ps, puntoVacio()]);

  const guardar = async () => {
    setErrorGlobal(""); setResumen(null);
    if (!modeloId) { setErrorGlobal("Elige una plantilla de incertidumbre."); return; }

    const tareas = [];
    puntos.forEach((p, idx) => {
      const etiquetaBase = `Punto ${idx + 1} (${p.nominal || "?"} ${p.unidad || ""})`.trim();
      const condiciones = modoCaptura === "unico"
        ? [{ condicion: "unico", lecturasTxt: p.lecturasUnico }]
        : [
            { condicion: "encontrado", lecturasTxt: p.lecturasEncontrado },
            { condicion: "dejado", lecturasTxt: p.lecturasDejado },
          ];
      condiciones.forEach(({ condicion, lecturasTxt }) => {
        const lecturas = parseLecturas(lecturasTxt);
        if (p.nominal === "" || !lecturas.length) return;
        tareas.push({
          etiqueta: modoCaptura === "unico" ? etiquetaBase : `${etiquetaBase} · ${condicion === "encontrado" ? "como se encontró" : "como se dejó"}`,
          payload: {
            modelo: modeloId, magnitud, tipoInstrumento: tipo,
            mensurando, unidad: p.unidad || unidad,
            puntoNominal: numOrU(p.nominal),
            lecturas, nivelConfianza,
            asignacion: asignacion._id,
            equipo: asignacion.equipo?._id,
            patronesUsados: patronesUsados.length ? patronesUsados : undefined,
            condicion,
            emp: p.emp !== "" ? numOrU(p.emp) : undefined,
          },
        });
      });
    });

    if (!tareas.length) { setErrorGlobal("Captura al menos un punto con nominal y lecturas."); return; }

    setGuardando(true);
    // Datos del servicio: quedan en la asignación para que "Emitir
    // certificado" ya no los vuelva a pedir (ver certificado.service.js).
    try {
      await actualizarAsignacion(asignacion._id, {
        servicio: { razon, tipo: tipoServicio, procedimiento: procedimiento || undefined },
        condiciones: {
          temperatura: temperatura === "" ? undefined : numOrU(temperatura),
          humedad: humedad === "" ? undefined : numOrU(humedad),
        },
        comentarios: comentarios || undefined,
      });
    } catch { /* no bloquea la captura de puntos */ }

    const resultados = await Promise.allSettled(tareas.map((t) => crearCalculo(t.payload)));
    const ok = resultados.filter((r) => r.status === "fulfilled").length;
    const fallos = resultados
      .map((r, i) => (r.status === "rejected" ? { etiqueta: tareas[i].etiqueta, mensaje: r.reason?.response?.data?.message || "Error al guardar" } : null))
      .filter(Boolean);
    setResumen({ ok, fallos });
    setGuardando(false);

    if (ok > 0) {
      try { await cambiarEstadoAsignacion(asignacion._id, { dominio: "calibracion", valor: "terminada" }); } catch { /* no bloquea el resumen */ }
      onDone?.();
    }
    if (!fallos.length) onClose?.();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>
        Iniciar calibración{asignacion ? ` — ${asignacion.equipo?.idInterno} · ${asignacion.equipo?.marca || ""} ${asignacion.equipo?.modelo || ""}` : ""}
      </DialogTitle>
      <DialogContent dividers sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
        {errorGlobal && <Alert severity="error" onClose={() => setErrorGlobal("")} sx={{ borderRadius: 2 }}>{errorGlobal}</Alert>}

        {calcsPrevios > 0 && (
          <Alert severity="info" sx={{ borderRadius: 2 }}>
            Esta asignación ya tiene {calcsPrevios} cálculo(s) de incertidumbre registrados. Este formulario siempre agrega nuevos.
          </Alert>
        )}

        {!patronesUsados.length && (
          <Alert severity="warning" sx={{ borderRadius: 2 }}>
            Sin patrón asignado: el presupuesto usará el valor genérico de la plantilla.
          </Alert>
        )}

        {avisoPerformance && <Alert severity="warning" sx={{ borderRadius: 2 }}>{avisoPerformance}</Alert>}

        <Box>
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>Datos del servicio</Typography>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", sm: "1fr 1fr 1fr" }, gap: 1.5, mb: 1.5 }}>
            <TextField select size="small" label="Razón del servicio" value={razon} onChange={(e) => setRazon(e.target.value)}>
              {RAZONES_SERVICIO.map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
            </TextField>
            <TextField select size="small" label="Tipo de servicio" value={tipoServicio} onChange={(e) => setTipoServicio(e.target.value)}>
              {TIPOS_SERVICIO.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
            </TextField>
            <TextField size="small" label="Procedimiento" placeholder="PRO-CAL-023" value={procedimiento} onChange={(e) => setProcedimiento(e.target.value)} />
            <TextField size="small" type="number" label="Temperatura (°C)" value={temperatura} onChange={(e) => setTemperatura(e.target.value)} />
            <TextField size="small" type="number" label="Humedad (% HR)" value={humedad} onChange={(e) => setHumedad(e.target.value)} />
          </Box>
          <TextField
            fullWidth size="small" multiline minRows={1} label="Comentarios"
            value={comentarios} onChange={(e) => setComentarios(e.target.value)}
          />
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
            Esto queda en la asignación — al emitir el certificado ya no se vuelve a preguntar.
          </Typography>
        </Box>

        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr 1fr" }, gap: 2 }}>
          <TextField
            select size="small" label="Magnitud" value={magnitud}
            onChange={(e) => { setMagnitud(e.target.value); setTipo(""); setModeloId(""); }}
          >
            {magnitudes.map((m) => <MenuItem key={m.clave} value={m.clave}>{m.nombre}</MenuItem>)}
          </TextField>
          <TextField
            select size="small" label="Tipo de instrumento" value={tipo} disabled={!magnitud}
            onChange={(e) => { setTipo(e.target.value); setModeloId(""); }}
          >
            {tiposDeMagnitud.map((t) => <MenuItem key={t.clave} value={t.clave}>{t.nombre}</MenuItem>)}
          </TextField>
          <TextField
            select size="small" label="Plantilla de incertidumbre" value={modeloId} disabled={!tipo}
            onChange={(e) => cargarPlantilla(e.target.value)}
          >
            {modelos.length === 0 && <MenuItem value="" disabled>Sin plantilla para este tipo</MenuItem>}
            {modelos.map((m) => <MenuItem key={m._id} value={m._id}>{m.nombre}</MenuItem>)}
          </TextField>
        </Box>
        {modeloId && (
          <Typography variant="caption" color="text.secondary">
            Mensurando: <b>{mensurando || "—"}</b> · Unidad: <b>{unidad || "—"}</b> · Nivel de confianza: <b>{nivelConfianza}</b>
            {" · "}Las contribuciones (resolución, patrón, deriva…) las arma el motor desde la plantilla y el patrón.
            Para ajustarlas a mano: Calibración → Análisis de Incertidumbre.
          </Typography>
        )}

        <ToggleButtonGroup
          exclusive size="small" value={modoCaptura}
          onChange={(_, v) => v && setModoCaptura(v)}
          sx={{ alignSelf: "flex-start" }}
        >
          <ToggleButton value="unico">Único</ToggleButton>
          <ToggleButton value="encontrado_dejado">Como se encontró / Como se dejó</ToggleButton>
        </ToggleButtonGroup>

        <Box>
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>Puntos de calibración</Typography>
          {puntos.map((p, idx) => (
            <PuntoRow
              key={p.id} punto={p} index={idx} modoCaptura={modoCaptura}
              onChange={(campo, val) => setPunto(p.id, campo, val)}
              onQuitar={() => quitarPunto(p.id)}
              disableQuitar={puntos.length === 1}
            />
          ))}
          <AppButton type="button" variant="outlined" size="small" startIcon={<AddIcon />} onClick={agregarPunto} sx={{ mt: 1, borderRadius: 2 }}>
            Agregar punto
          </AppButton>
        </Box>

        {resumen && (
          <Alert severity={resumen.fallos.length ? "warning" : "success"} sx={{ borderRadius: 2 }}>
            <Typography variant="body2" fontWeight={700}>
              {resumen.ok} de {resumen.ok + resumen.fallos.length} punto(s) guardado(s).
            </Typography>
            {resumen.fallos.map((f, i) => (
              <Typography key={i} variant="caption" sx={{ display: "block" }}>· {f.etiqueta}: {f.mensaje}</Typography>
            ))}
            {resumen.fallos.length > 0 && (
              <Typography variant="caption" sx={{ display: "block", mt: 0.5 }}>
                Corrige los puntos marcados y vuelve a dar clic en Guardar — los que ya se guardaron no se repiten.
              </Typography>
            )}
          </Alert>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <AppButton type="button" variant="outlined" onClick={onClose} sx={{ borderRadius: 2 }}>Cancelar</AppButton>
        <AppButton type="button" loading={guardando || cargandoPuntos} onClick={guardar} sx={{ borderRadius: 2 }}>
          Guardar y enviar a revisión
        </AppButton>
      </DialogActions>
    </Dialog>
  );
}

function PuntoRow({ punto, index, modoCaptura, onChange, onQuitar, disableQuitar }) {
  const criterio = (lecturasTxt) => {
    const xs = parseLecturas(lecturasTxt);
    const n = numOrU(punto.nominal);
    if (!xs.length || n == null) return null;
    const e = numOrU(punto.emp);
    if (e == null) return { pasa: null };
    return { pasa: Math.abs(media(xs) - n) <= Math.abs(e) };
  };

  const badges = modoCaptura === "unico"
    ? [{ label: "", c: criterio(punto.lecturasUnico) }]
    : [
        { label: "Encontrado", c: criterio(punto.lecturasEncontrado) },
        { label: "Dejado", c: criterio(punto.lecturasDejado) },
      ];

  return (
    <Box sx={{ p: 2, mb: 1.5, borderRadius: 3, border: "1px solid", borderColor: "divider" }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
        <Chip label={`Punto ${index + 1}${punto.prueba ? ` · ${punto.prueba}` : ""}`} size="small" color="secondary" variant="outlined" sx={{ fontWeight: 700 }} />
        <Tooltip title="Quitar punto">
          <span>
            <IconButton size="small" onClick={onQuitar} disabled={disableQuitar}>
              <DeleteOutlineIcon fontSize="small" sx={{ color: "error.main" }} />
            </IconButton>
          </span>
        </Tooltip>
      </Box>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", sm: "1fr 1fr 1fr" }, gap: 1.5, mb: 1.5 }}>
        <TextField size="small" label="Nominal" value={punto.nominal} onChange={(e) => onChange("nominal", e.target.value)} />
        <TextField size="small" label="Unidad" value={punto.unidad} onChange={(e) => onChange("unidad", e.target.value)} />
        <TextField size="small" label="EMP (± tolerancia)" value={punto.emp} onChange={(e) => onChange("emp", e.target.value)} />
      </Box>

      <Box sx={{ display: "grid", gridTemplateColumns: modoCaptura === "unico" ? "1fr" : { xs: "1fr", sm: "1fr 1fr" }, gap: 1.5 }}>
        {modoCaptura === "unico" ? (
          <TextField
            size="small" multiline minRows={1} label="Lecturas" placeholder="Separadas por espacio o coma"
            value={punto.lecturasUnico} onChange={(e) => onChange("lecturasUnico", e.target.value)}
          />
        ) : (
          <>
            <TextField
              size="small" multiline minRows={1} label="Lecturas — Como se encontró"
              value={punto.lecturasEncontrado} onChange={(e) => onChange("lecturasEncontrado", e.target.value)}
            />
            <TextField
              size="small" multiline minRows={1} label="Lecturas — Como se dejó"
              value={punto.lecturasDejado} onChange={(e) => onChange("lecturasDejado", e.target.value)}
            />
          </>
        )}
      </Box>

      {badges.some((b) => b.c) && (
        <Box sx={{ display: "flex", gap: 1, mt: 1.25 }}>
          {badges.map((b, i) => b.c && (
            <Chip
              key={i} size="small"
              label={`${b.label ? b.label + ": " : ""}${b.c.pasa == null ? "sin EMP" : b.c.pasa ? "PASA" : "NO PASA"}`}
              color={b.c.pasa == null ? "default" : b.c.pasa ? "success" : "error"}
            />
          ))}
        </Box>
      )}
    </Box>
  );
}
