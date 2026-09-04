import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Box, Typography, MenuItem, TextField, IconButton, Chip, Divider, Alert,
  Table, TableHead, TableBody, TableRow, TableCell, Button, Snackbar,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import ScienceOutlinedIcon from "@mui/icons-material/ScienceOutlined";
import InsightsOutlinedIcon from "@mui/icons-material/InsightsOutlined";
import LinkOutlinedIcon from "@mui/icons-material/LinkOutlined";
import RuleFolderOutlinedIcon from "@mui/icons-material/RuleFolderOutlined";
import { useNavigate } from "react-router-dom";

import AppCard from "../../shared/components/AppCard";
import AppButton from "../../shared/components/AppButton";
import PageHeader from "../../shared/components/PageHeader";
import { listarReportes, listarAsignaciones } from "../../services/reportes";
import {
  listarMagnitudes, listarModelos, previewIncertidumbre, listarCalculos,
  crearCalculo, recalcularCalculo, revisarCalculo, aprobarCalculo,
} from "../../services/incertidumbre";
import AsistentePanel from "./AsistentePanel";

const MODOS = [
  { v: "semiamplitud", l: "Semiamplitud (a)" },
  { v: "desviacion_std", l: "Desv. estándar (s, n)" },
  { v: "incertidumbre_std", l: "Incert. estándar (u)" },
  { v: "certificado", l: "Certificado (U, k)" },
];
const DISTRIBUCIONES = [
  { v: "normal", l: "Normal" },
  { v: "rectangular", l: "Rectangular" },
  { v: "triangular", l: "Triangular" },
  { v: "forma_u", l: "Forma U" },
];
const NIVELES = ["95.45%", "95%"];

const filaVacia = () => ({
  fuente: "", simbolo: "", tipo: "B", modo: "semiamplitud", distribucion: "rectangular",
  valor: "", k: 2, n: "", coefSensibilidad: 1, gradosLibertad: "", unidad: "", notas: "",
});
const numOrU = (x) => {
  const n = parseFloat(x);
  return Number.isFinite(n) ? n : undefined;
};

export default function IncertidumbrePage() {
  const navigate = useNavigate();
  const [magnitudes, setMagnitudes] = useState([]);
  const [magnitud, setMagnitud] = useState("");
  const [tipo, setTipo] = useState("");
  const [modelos, setModelos] = useState([]);
  const [modeloId, setModeloId] = useState("");

  const [mensurando, setMensurando] = useState("");
  const [unidad, setUnidad] = useState("");
  const [puntoNominal, setPuntoNominal] = useState("");
  const [nivelConfianza, setNivelConfianza] = useState("95.45%");

  const [contribuciones, setContribuciones] = useState([filaVacia()]);
  const [lecturasTxt, setLecturasTxt] = useState("");

  // Contexto de calibración (opcional)
  const [reportes, setReportes] = useState([]);
  const [reporteId, setReporteId] = useState("");
  const [asignaciones, setAsignaciones] = useState([]);
  const [asignacionId, setAsignacionId] = useState("");
  const [calcsLigados, setCalcsLigados] = useState([]);

  const [preview, setPreview] = useState(null);
  const [calc, setCalc] = useState(null);
  const [toast, setToast] = useState("");
  const debRef = useRef();

  /* ---------- catálogos ---------- */
  useEffect(() => { listarMagnitudes().then(setMagnitudes).catch(() => setMagnitudes([])); }, []);
  useEffect(() => {
    listarReportes({ pageSize: 100 }).then(({ items }) => setReportes(items)).catch(() => {});
  }, []);

  const tiposDeMagnitud = useMemo(
    () => magnitudes.find((m) => m.clave === magnitud)?.tipos || [],
    [magnitudes, magnitud]
  );

  useEffect(() => {
    if (!magnitud || !tipo) { setModelos([]); return; }
    listarModelos({ magnitud, tipoInstrumento: tipo }).then(setModelos).catch(() => setModelos([]));
  }, [magnitud, tipo]);

  /* ---------- contexto de calibración ---------- */
  useEffect(() => {
    if (!reporteId) { setAsignaciones([]); setAsignacionId(""); return; }
    listarAsignaciones({ reporteId, pageSize: 100 }).then(({ items }) => setAsignaciones(items)).catch(() => {});
  }, [reporteId]);

  const asignacionSel = asignaciones.find((a) => a._id === asignacionId);

  useEffect(() => {
    if (!asignacionId) { setCalcsLigados([]); return; }
    listarCalculos({ asignacion: asignacionId, pageSize: 50 }).then(({ items }) => setCalcsLigados(items)).catch(() => {});
    // pre-selecciona magnitud a partir de la categoría del equipo
    const cat = asignacionSel?.equipo?.categoria?.toLowerCase();
    if (cat) {
      const mag = magnitudes.find((m) => m.clave === cat || m.nombre.toLowerCase() === cat);
      if (mag) setMagnitud(mag.clave);
    }
  }, [asignacionId]); // eslint-disable-line

  // ¿esta contribución es el placeholder genérico del patrón (lo pone el motor real)?
  const esPlaceholderPatron = (c) =>
    /certificad/i.test(c.modo || "") && /patr[oó]n de referencia|patr[oó]n\b/i.test(c.fuente || "");

  const cargarPlantilla = (id) => {
    setModeloId(id);
    const m = modelos.find((x) => x._id === id);
    if (!m) return;
    setMensurando(m.mensurando || "");
    setUnidad(m.unidad || "");
    setNivelConfianza(m.nivelConfianza?.includes("95.4") ? "95.45%" : m.nivelConfianza || "95.45%");
    setContribuciones(
      m.contribuciones
        // si hay patrones en la asignación, el motor inyecta su U real; se quita el genérico
        .filter((c) => !(patronIds?.length && esPlaceholderPatron(c)))
        .map((c) => ({
          fuente: c.fuente, simbolo: c.simbolo || "", tipo: c.tipo || "B",
          modo: c.modo || "semiamplitud", distribucion: c.distribucion || "rectangular",
          valor: c.valorSugerido || "", k: c.k ?? 2, n: c.n ?? "",
          coefSensibilidad: c.coefSensibilidad ?? 1, gradosLibertad: c.gradosLibertad ?? "",
          unidad: c.unidad || m.unidad || "", notas: c.ayuda || "",
        }))
    );
    setCalc(null);
  };

  /* ---------- lecturas ---------- */
  const lecturas = useMemo(
    () => lecturasTxt.split(/[\s,;]+/).map(Number).filter(Number.isFinite),
    [lecturasTxt]
  );
  const statsLecturas = useMemo(() => {
    if (lecturas.length < 2) return null;
    const media = lecturas.reduce((a, b) => a + b, 0) / lecturas.length;
    const s = Math.sqrt(lecturas.reduce((a, b) => a + (b - media) ** 2, 0) / (lecturas.length - 1));
    return { n: lecturas.length, media, s };
  }, [lecturas]);
  const repOffset = statsLecturas ? 1 : 0;

  const payloadContribs = useCallback(
    () =>
      contribuciones
        .filter((c) => c.fuente.trim())
        .map((c) => ({
          fuente: c.fuente, simbolo: c.simbolo, tipo: c.tipo, modo: c.modo, distribucion: c.distribucion,
          valor: numOrU(c.valor) ?? 0, k: numOrU(c.k) ?? 2, n: numOrU(c.n),
          coefSensibilidad: numOrU(c.coefSensibilidad) ?? 1, gradosLibertad: numOrU(c.gradosLibertad),
          unidad: c.unidad || unidad,
        })),
    [contribuciones, unidad]
  );

  const patronIds = useMemo(
    () => (asignacionSel?.patrones || []).map((p) => p._id || p).filter(Boolean),
    [asignacionSel]
  );

  /* ---------- preview en vivo ---------- */
  useEffect(() => {
    clearTimeout(debRef.current);
    const contribs = payloadContribs();
    if (!contribs.length && !statsLecturas && !patronIds.length) { setPreview(null); return; }
    debRef.current = setTimeout(() => {
      previewIncertidumbre({
        contribuciones: contribs, lecturas,
        valorMedido: numOrU(puntoNominal), puntoNominal: numOrU(puntoNominal),
        nivelConfianza, unidad,
        patronesUsados: patronIds.length ? patronIds : undefined,
      }).then(setPreview).catch(() => setPreview(null));
    }, 350);
    return () => clearTimeout(debRef.current);
  }, [payloadContribs, lecturas, puntoNominal, nivelConfianza, unidad, statsLecturas, patronIds]);

  const setFila = (i, campo, val) =>
    setContribuciones((cs) => cs.map((c, idx) => (idx === i ? { ...c, [campo]: val } : c)));
  const quitarFila = (i) => setContribuciones((cs) => cs.filter((_, idx) => idx !== i));
  const agregarFila = () => setContribuciones((cs) => [...cs, filaVacia()]);
  const agregarDesdeAsistente = (s) =>
    setContribuciones((cs) => [
      ...cs,
      { ...filaVacia(), fuente: s.fuente || "Componente sugerido", tipo: s.tipo || "B", modo: s.modo || "semiamplitud", distribucion: s.distribucion || "rectangular", unidad },
    ]);

  const guardar = async () => {
    try {
      const c = await crearCalculo({
        modelo: modeloId || undefined,
        magnitud: magnitud || undefined,
        tipoInstrumento: tipo || undefined,
        mensurando, unidad,
        puntoNominal: numOrU(puntoNominal),
        lecturas,
        contribuciones: payloadContribs(),
        nivelConfianza,
        asignacion: asignacionId || undefined,
        equipo: asignacionSel?.equipo?._id || undefined,
        patronesUsados: asignacionSel?.patrones?.map?.((p) => p._id || p) || undefined,
      });
      setCalc(c);
      setToast(`Guardado ${c.folio}${asignacionId ? " · ligado a la calibración" : ""}`);
      if (asignacionId) listarCalculos({ asignacion: asignacionId, pageSize: 50 }).then(({ items }) => setCalcsLigados(items));
    } catch (e) {
      setToast(e?.response?.data?.message || "No se pudo guardar");
    }
  };
  const accion = async (fn, ok) => {
    try {
      setCalc(await fn(calc._id, {}));
      setToast(ok);
      if (asignacionId) listarCalculos({ asignacion: asignacionId, pageSize: 50 }).then(({ items }) => setCalcsLigados(items));
    } catch (e) { setToast(e?.response?.data?.message || "Error"); }
  };

  const contexto = {
    magnitud, tipoInstrumento: tipo, mensurando, unidad,
    puntoNominal: numOrU(puntoNominal), valorMedido: numOrU(puntoNominal),
    lecturas, contribuciones: payloadContribs(),
    equipo: asignacionSel?.equipo?.idInterno,
  };

  const R = preview?.resultado;
  const pc = preview?.contribuciones || [];

  return (
    <Box>
      <PageHeader
        icon={<InsightsOutlinedIcon />}
        title="Análisis de Incertidumbre"
        subtitle="Método GUM (JCGM 100:2008) · EA-4/02 — motor determinístico, mismos datos = mismo resultado"
        actions={
          <AppButton
            variant="outlined"
            startIcon={<RuleFolderOutlinedIcon />}
            onClick={() => navigate("/incertidumbre/plantillas")}
            sx={{ borderRadius: 2 }}
          >
            Plantillas
          </AppButton>
        }
      />

      <Box sx={{ display: "flex", gap: 3, flexDirection: { xs: "column", lg: "row" }, alignItems: "flex-start" }}>
        <Box sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2.5 }}>
          {/* ---- Contexto de calibración ---- */}
          <AppCard title="Contexto de calibración" subtitle="Opcional — liga este cálculo a un equipo/asignación para que su certificado lo recoja" icon={<LinkOutlinedIcon fontSize="small" />} accent="#2563EB">
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
              <TextField select size="small" label="Reporte de servicio" value={reporteId} onChange={(e) => { setReporteId(e.target.value); setCalc(null); }}>
                <MenuItem value="">— sin ligar —</MenuItem>
                {reportes.map((r) => <MenuItem key={r._id} value={r._id}>{r.folio} · {r.cliente?.nombre}</MenuItem>)}
              </TextField>
              <TextField select size="small" label="Asignación (equipo)" value={asignacionId} disabled={!reporteId} onChange={(e) => { setAsignacionId(e.target.value); setCalc(null); }}>
                {asignaciones.length === 0
                  ? <MenuItem value="" disabled>Sin asignaciones en este reporte</MenuItem>
                  : <MenuItem value="">— sin elegir —</MenuItem>}
                {asignaciones.map((a) => <MenuItem key={a._id} value={a._id}>{a.equipo?.idInterno} — {a.equipo?.marca} {a.equipo?.modelo}</MenuItem>)}
              </TextField>
            </Box>
            {asignacionSel && (
              <Box sx={{ mt: 1.5, display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}>
                <Chip size="small" color="secondary" variant="outlined" label={`equipo: ${asignacionSel.equipo?.idInterno}`} />
                {calcsLigados.length > 0 && (
                  <Typography variant="caption" color="text.secondary">
                    {calcsLigados.length} cálculo(s) ligado(s):
                  </Typography>
                )}
                {calcsLigados.map((c) => (
                  <Chip key={c._id} size="small" label={`${c.folio} · ${c.puntoNominal ?? "?"} ${c.unidad || ""} · ${c.estado}`}
                    color={c.estado === "aprobado" ? "success" : "default"} />
                ))}
              </Box>
            )}
          </AppCard>

          {/* ---- Instrumento ---- */}
          <AppCard title="Instrumento" icon={<ScienceOutlinedIcon fontSize="small" />}>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr 1fr" }, gap: 2 }}>
              <TextField select size="small" label="Magnitud" value={magnitud} onChange={(e) => { setMagnitud(e.target.value); setTipo(""); setModeloId(""); }}>
                {magnitudes.map((m) => <MenuItem key={m.clave} value={m.clave}>{m.nombre}</MenuItem>)}
              </TextField>
              <TextField select size="small" label="Tipo de instrumento" value={tipo} disabled={!magnitud} onChange={(e) => { setTipo(e.target.value); setModeloId(""); }}>
                {tiposDeMagnitud.map((t) => <MenuItem key={t.clave} value={t.clave}>{t.nombre}</MenuItem>)}
              </TextField>
              <TextField select size="small" label="Plantilla" value={modeloId} disabled={!tipo} onChange={(e) => cargarPlantilla(e.target.value)}>
                {modelos.length === 0 && <MenuItem value="" disabled>Sin plantilla para este tipo</MenuItem>}
                {modelos.map((m) => <MenuItem key={m._id} value={m._id}>{m.nombre}</MenuItem>)}
              </TextField>
              <TextField size="small" label="Mensurando" value={mensurando} onChange={(e) => setMensurando(e.target.value)} sx={{ gridColumn: { sm: "span 2" } }} />
              <TextField size="small" label="Unidad" value={unidad} onChange={(e) => setUnidad(e.target.value)} />
              <TextField size="small" label="Punto nominal / valor medido" value={puntoNominal} onChange={(e) => setPuntoNominal(e.target.value)} />
              <TextField select size="small" label="Nivel de confianza" value={nivelConfianza} onChange={(e) => setNivelConfianza(e.target.value)}>
                {NIVELES.map((n) => <MenuItem key={n} value={n}>{n}</MenuItem>)}
              </TextField>
            </Box>
          </AppCard>

          {/* ---- Lecturas ---- */}
          <AppCard title="Lecturas — repetibilidad (tipo A)">
            <TextField fullWidth size="small" multiline minRows={2}
              placeholder="Pega las lecturas separadas por espacio, coma o salto de línea…"
              value={lecturasTxt} onChange={(e) => setLecturasTxt(e.target.value)} />
            {statsLecturas ? (
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 1.5 }}>
                <Chip size="small" label={`n = ${statsLecturas.n}`} />
                <Chip size="small" label={`media = ${statsLecturas.media.toPrecision(6)}`} />
                <Chip size="small" label={`s = ${statsLecturas.s.toPrecision(4)}`} />
                <Chip size="small" color="secondary" variant="outlined" label={`u(rep) = s/√n = ${(statsLecturas.s / Math.sqrt(statsLecturas.n)).toPrecision(4)}`} />
              </Box>
            ) : (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
                Con ≥ 2 lecturas el motor añade solo la contribución de repetibilidad (ν = n − 1).
              </Typography>
            )}
          </AppCard>

          {/* ---- Presupuesto ---- */}
          <AppCard title="Presupuesto de incertidumbre"
            action={<Button size="small" startIcon={<AddIcon />} onClick={agregarFila} sx={{ borderRadius: 2 }}>Componente</Button>}>
            <Box sx={{ overflowX: "auto", mx: -1 }}>
              <Table size="small" sx={{ minWidth: 900 }}>
                <TableHead>
                  <TableRow>
                    {["Fuente", "Tipo", "Modo", "Distrib.", "Valor", "k / n", "cᵢ", "u(xᵢ)", "cᵢ·u(xᵢ)", "%", ""].map((h) => (
                      <TableCell key={h}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {statsLecturas && (
                    <TableRow sx={{ bgcolor: "background.default" }}>
                      <TableCell><Typography variant="caption" fontWeight={700}>Repetibilidad (tipo A)</Typography></TableCell>
                      <TableCell><Chip size="small" label="A" /></TableCell>
                      <TableCell colSpan={2}><Typography variant="caption" color="text.secondary">s / √n · auto</Typography></TableCell>
                      <TableCell><Typography variant="caption">{statsLecturas.s.toPrecision(4)}</Typography></TableCell>
                      <TableCell><Typography variant="caption">n={statsLecturas.n}</Typography></TableCell>
                      <TableCell>1</TableCell>
                      <TableCell><b>{fmt(pc[0]?.u)}</b></TableCell>
                      <TableCell>{fmt(pc[0]?.contribucion)}</TableCell>
                      <TableCell><PctBar v={pc[0]?.porcentajeVarianza} /></TableCell>
                      <TableCell />
                    </TableRow>
                  )}

                  {contribuciones.map((c, i) => {
                    const comp = pc[i + repOffset];
                    return (
                      <TableRow key={i}>
                        <TableCell sx={{ minWidth: 170 }}>
                          <TextField variant="standard" fullWidth placeholder="Fuente" value={c.fuente} onChange={(e) => setFila(i, "fuente", e.target.value)} />
                        </TableCell>
                        <TableCell>
                          <TextField select variant="standard" value={c.tipo} onChange={(e) => setFila(i, "tipo", e.target.value)}>
                            <MenuItem value="A">A</MenuItem><MenuItem value="B">B</MenuItem>
                          </TextField>
                        </TableCell>
                        <TableCell>
                          <TextField select variant="standard" sx={{ minWidth: 130 }} value={c.modo} onChange={(e) => setFila(i, "modo", e.target.value)}>
                            {MODOS.map((m) => <MenuItem key={m.v} value={m.v}>{m.l}</MenuItem>)}
                          </TextField>
                        </TableCell>
                        <TableCell>
                          <TextField select variant="standard" sx={{ minWidth: 110 }} disabled={c.modo === "desviacion_std" || c.modo === "incertidumbre_std"}
                            value={c.distribucion} onChange={(e) => setFila(i, "distribucion", e.target.value)}>
                            {DISTRIBUCIONES.map((d) => <MenuItem key={d.v} value={d.v}>{d.l}</MenuItem>)}
                          </TextField>
                        </TableCell>
                        <TableCell sx={{ width: 90 }}>
                          <TextField variant="standard" value={c.valor} onChange={(e) => setFila(i, "valor", e.target.value)} placeholder="0" />
                        </TableCell>
                        <TableCell sx={{ width: 70 }}>
                          {c.modo === "certificado" ? (
                            <TextField variant="standard" value={c.k} onChange={(e) => setFila(i, "k", e.target.value)} placeholder="k=2" />
                          ) : c.modo === "desviacion_std" ? (
                            <TextField variant="standard" value={c.n} onChange={(e) => setFila(i, "n", e.target.value)} placeholder="n" />
                          ) : "—"}
                        </TableCell>
                        <TableCell sx={{ width: 56 }}>
                          <TextField variant="standard" value={c.coefSensibilidad} onChange={(e) => setFila(i, "coefSensibilidad", e.target.value)} />
                        </TableCell>
                        <TableCell><b>{fmt(comp?.u)}</b></TableCell>
                        <TableCell>{fmt(comp?.contribucion)}</TableCell>
                        <TableCell><PctBar v={comp?.porcentajeVarianza} /></TableCell>
                        <TableCell>
                          <IconButton size="small" onClick={() => quitarFila(i)} disabled={contribuciones.length === 1}>
                            <DeleteOutlineIcon fontSize="small" sx={{ color: "error.main" }} />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    );
                  })}

                  {/* Contribuciones inyectadas por el motor desde los patrones */}
                  {pc.slice(repOffset + contribuciones.length).map((comp, j) => (
                    <TableRow key={`auto-${j}`} sx={{ bgcolor: "background.default" }}>
                      <TableCell>
                        <Typography variant="caption" fontWeight={700}>{comp.fuente}</Typography>
                        <Chip size="small" label="del patrón" sx={{ ml: 1, height: 16, fontSize: 10 }} color="secondary" variant="outlined" />
                      </TableCell>
                      <TableCell><Chip size="small" label={comp.tipo || "B"} /></TableCell>
                      <TableCell colSpan={2}><Typography variant="caption" color="text.secondary">{comp.modo} · {comp.distribucion || "—"}</Typography></TableCell>
                      <TableCell><Typography variant="caption">{fmt(comp.valor)}</Typography></TableCell>
                      <TableCell><Typography variant="caption">{comp.modo === "certificado" ? `k=${comp.k}` : "—"}</Typography></TableCell>
                      <TableCell>{comp.coefSensibilidad ?? 1}</TableCell>
                      <TableCell><b>{fmt(comp.u)}</b></TableCell>
                      <TableCell>{fmt(comp.contribucion)}</TableCell>
                      <TableCell><PctBar v={comp.porcentajeVarianza} /></TableCell>
                      <TableCell />
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          </AppCard>

          {(preview?.advertencias?.length || calc?.advertencias?.length) > 0 && (
            <Alert severity="warning" sx={{ borderRadius: 3 }}>
              {[...(preview?.advertencias || []), ...(calc?.advertencias || [])]
                .filter((v, i, a) => a.indexOf(v) === i)
                .map((w, i) => <div key={i}>{w}</div>)}
            </Alert>
          )}

          {/* ---- Resultado (hero) ---- */}
          <ResultadoHero R={R} motor={preview?.motor} calc={calc} onGuardar={guardar} onAccion={accion} />
        </Box>

        {/* ---- Asistente ---- */}
        <Box
          sx={{
            width: { xs: "100%", lg: 380 }, flexShrink: 0, position: { lg: "sticky" }, top: { lg: 96 },
            height: { xs: 520, lg: "calc(100vh - 120px)" }, maxHeight: { lg: "calc(100vh - 120px)" },
          }}
        >
          <AsistentePanel contexto={contexto} onAgregarComponente={agregarDesdeAsistente} />
        </Box>
      </Box>

      <Snackbar open={!!toast} autoHideDuration={3500} onClose={() => setToast("")} message={toast} />
    </Box>
  );
}

/* -------------------------------------------------------------------------- */
function ResultadoHero({ R, motor, calc, onGuardar, onAccion }) {
  return (
    <Box
      sx={{
        borderRadius: 2,
        overflow: "hidden",
        color: "#E6EDF6",
        background: "radial-gradient(900px 400px at 12% 0%, rgba(37,99,235,.35), transparent 60%), linear-gradient(150deg, #0B1220 0%, #0F172A 55%, #111E3A 100%)",
        p: { xs: 2.5, sm: 3.5 },
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
        <InsightsOutlinedIcon sx={{ color: "#60A5FA" }} />
        <Typography variant="h6" fontWeight={800}>Resultado</Typography>
        {motor && (
          <Chip size="small" label={`${motor.nombre} v${motor.version}`}
            sx={{ ml: "auto", color: "#93C5FD", borderColor: "rgba(147,197,253,.4)", bgcolor: "transparent" }} variant="outlined" />
        )}
      </Box>

      {!R ? (
        <Typography variant="body2" sx={{ color: "rgba(230,237,246,.7)" }}>
          Captura al menos un componente o lecturas para calcular.
        </Typography>
      ) : (
        <>
          <Typography sx={{ fontSize: { xs: 24, sm: 30 }, fontWeight: 800, letterSpacing: "-.02em" }}>
            {R.expresion}
          </Typography>
          <Box sx={{ display: "flex", gap: { xs: 2, sm: 4 }, flexWrap: "wrap", mt: 2 }}>
            <HeroDato k="u combinada (u_c)" v={fmt(R.uCombinada)} />
            <HeroDato k="ν efectivos" v={R.gradosLibertadEfectivos ?? "∞"} />
            <HeroDato k="factor k" v={R.k} />
            <HeroDato k="confianza" v={R.nivelConfianza} />
            {R.incertidumbreExpandidaRel != null && (
              <HeroDato k="U relativa" v={`${(R.incertidumbreExpandidaRel * 100).toPrecision(3)} %`} />
            )}
          </Box>
          <Typography variant="caption" sx={{ color: "rgba(230,237,246,.55)", mt: 1.25, display: "block" }}>
            {R.kMetodo}
          </Typography>
        </>
      )}

      <Divider sx={{ my: 2.25, borderColor: "rgba(255,255,255,.12)" }} />

      {!calc ? (
        <AppButton startIcon={<ScienceOutlinedIcon />} onClick={onGuardar} disabled={!R}
          sx={{ borderRadius: 2, bgcolor: "#2563EB", "&:hover": { bgcolor: "#1D4ED8" } }}>
          Guardar cálculo
        </AppButton>
      ) : (
        <Box sx={{ display: "flex", gap: 1.25, flexWrap: "wrap", alignItems: "center" }}>
          <Chip label={`${calc.folio} · v${calc.version}`} sx={{ color: "#E6EDF6", bgcolor: "rgba(255,255,255,.08)" }} />
          <Chip label={calc.estado}
            color={calc.estado === "aprobado" ? "success" : calc.estado === "revisado" ? "info" : "default"} />
          <Button size="small" onClick={() => onAccion(recalcularCalculo, "Recalculado (nueva versión)")}
            disabled={calc.estado === "aprobado"} sx={{ color: "#93C5FD" }}>Recalcular</Button>
          <Button size="small" onClick={() => onAccion(revisarCalculo, "Marcado como revisado")}
            disabled={calc.estado !== "calculado"} sx={{ color: "#93C5FD" }}>Revisar</Button>
          <Button size="small" variant="contained" onClick={() => onAccion(aprobarCalculo, "Aprobado")}
            disabled={!["calculado", "revisado"].includes(calc.estado)}
            sx={{ borderRadius: 2, bgcolor: "#16A34A", "&:hover": { bgcolor: "#15803D" } }}>Aprobar</Button>
        </Box>
      )}
      {calc && (
        <Typography variant="caption" sx={{ color: "rgba(230,237,246,.55)", mt: 1.5, display: "block" }}>
          Recalcular archiva la versión anterior (no se sobrescribe). Aprobado queda inmutable.
          {calc.creadoPor?.nombre ? ` · creó: ${calc.creadoPor.nombre}` : ""}
          {calc.aprobadoPor?.nombre ? ` · aprobó: ${calc.aprobadoPor.nombre}` : ""}
        </Typography>
      )}
    </Box>
  );
}

function HeroDato({ k, v }) {
  return (
    <Box>
      <Typography component="div" variant="caption" sx={{ color: "rgba(230,237,246,.55)", textTransform: "uppercase", letterSpacing: ".06em", fontSize: 10 }}>{k}</Typography>
      <Typography component="div" sx={{ fontWeight: 800, fontSize: 17 }}>{v}</Typography>
    </Box>
  );
}

function PctBar({ v }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, minWidth: 74 }}>
      <Box sx={{ flex: 1, height: 6, borderRadius: 999, bgcolor: "divider", overflow: "hidden" }}>
        <Box sx={{ width: `${Math.min(100, v || 0)}%`, height: "100%", background: "linear-gradient(90deg,#3B82F6,#2563EB)" }} />
      </Box>
      <Typography variant="caption" sx={{ minWidth: 24, textAlign: "right" }}>{v ?? "—"}</Typography>
    </Box>
  );
}

function fmt(x) {
  if (x == null || Number.isNaN(x)) return "—";
  if (x === 0) return "0";
  if (Math.abs(x) < 1e-4 || Math.abs(x) >= 1e6) return Number(x).toExponential(3);
  return Number(x).toPrecision(4);
}
