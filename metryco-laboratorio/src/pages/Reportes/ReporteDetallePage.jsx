import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Box, Typography, TextField, Chip, Checkbox, Button, IconButton, Tooltip, Avatar,
  MenuItem, Select, FormControl, InputLabel, Paper, Alert, Link as MuiLink,
  Dialog, DialogTitle, DialogContent, DialogActions,
} from "@mui/material";
import Autocomplete from "@mui/material/Autocomplete";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AddIcon from "@mui/icons-material/Add";
import PictureAsPdfOutlinedIcon from "@mui/icons-material/PictureAsPdfOutlined";
import RefreshOutlinedIcon from "@mui/icons-material/RefreshOutlined";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import BiotechOutlinedIcon from "@mui/icons-material/BiotechOutlined";
import LocalShippingOutlined from "@mui/icons-material/LocalShippingOutlined";
import WorkspacePremiumOutlinedIcon from "@mui/icons-material/WorkspacePremiumOutlined";

import AppButton from "../../shared/components/AppButton";
import PageHeader from "../../shared/components/PageHeader";
import { formatDate } from "../../shared/utils/formatDate";
import FactCheckOutlinedIcon from "@mui/icons-material/FactCheckOutlined";
import {
  obtenerReporte, actualizarReporte, agregarComentarioReporte,
  crearAsignacion, actualizarAsignacion, cambiarEstadoAsignacion,
} from "../../services/reportes";
import { listarEquipos } from "../../services/equipos";
import { obtenerDirectorio } from "../../services/usuarios";
import { listarPatrones } from "../../services/patrones";
import { listarPerformance } from "../../services/performance";
import { direccionCliente } from "./imprimir/shared";
import { useAuth } from "../../core/auth/useAuth";

const EST_CALIBRACION = { pendiente: "Pendiente", en_proceso: "En proceso", terminada: "Terminada" };
const EST_ENTREGA = { pendiente: "Pendiente", entregado: "Entregado" };
const EST_CERTIFICADO = { sin_generar: "Sin generar", en_revision: "En revisión", autorizado: "Autorizado", rechazado: "Rechazado" };
const STATUS_REPORTE = {
  recepcion: { label: "Recepción", color: "default" },
  en_proceso: { label: "En proceso", color: "warning" },
  terminado: { label: "Terminado", color: "info" },
  entregado: { label: "Entregado", color: "success" },
  cancelado: { label: "Cancelado", color: "error" },
};

function Campo({ label, value, children }) {
  return (
    <Box sx={{ display: "grid", gridTemplateColumns: "110px 1fr", alignItems: "center", py: 0.4 }}>
      <Typography variant="caption" color="text.secondary" fontWeight={700}>{label}</Typography>
      {children || <Typography variant="body2">{value || "—"}</Typography>}
    </Box>
  );
}

const VIG_DOT = { vigente: "#16A34A", por_vencer: "#D97706", vencido: "#DC2626", sin_fecha: "#94A3B8" };

// El backend solo expone `ultimaCalibracion.vencimiento` (fecha) — la
// categoría vigente/por_vencer/vencido se calcula aquí, a 30 días de aviso.
function vigenciaPatron(p) {
  const v = p?.ultimaCalibracion?.vencimiento;
  if (!v) return "sin_fecha";
  const dias = (new Date(v) - Date.now()) / 86400000;
  if (dias < 0) return "vencido";
  if (dias <= 30) return "por_vencer";
  return "vigente";
}

/* Rastreador visual de los 3 estados de una asignación (solo lectura — el
   cambio real se hace con los selects, que respetan permisos por rol). */
function StateTracker({ estados }) {
  const pasos = [
    { key: "calibracion", label: "Calibración", icon: BiotechOutlinedIcon, done: estados?.calibracion === "terminada", active: estados?.calibracion === "en_proceso", texto: estados?.calibracion },
    { key: "entrega", label: "Entrega", icon: LocalShippingOutlined, done: estados?.entrega === "entregado", active: false, texto: estados?.entrega },
    { key: "certificado", label: "Certificado", icon: WorkspacePremiumOutlinedIcon, done: estados?.certificado === "autorizado", active: estados?.certificado === "en_revision", texto: estados?.certificado?.replace("_", " ") },
  ];
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0, mt: 1.5 }}>
      {pasos.map((p, i) => {
        const color = p.done ? "#16A34A" : p.active ? "#2563EB" : "#94A3B8";
        return (
          <Box key={p.key} sx={{ display: "flex", alignItems: "center", flex: i < 2 ? 1 : "0 0 auto" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
              <Box sx={{
                width: 26, height: 26, borderRadius: "50%", display: "grid", placeItems: "center", flexShrink: 0,
                color: p.done || p.active ? "#fff" : color,
                bgcolor: p.done ? "#16A34A" : p.active ? "#2563EB" : "transparent",
                border: p.done || p.active ? "none" : `1.5px solid ${color}`,
              }}>
                {p.done ? <CheckRoundedIcon sx={{ fontSize: 15 }} /> : <p.icon sx={{ fontSize: 14 }} />}
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="caption" fontWeight={700} sx={{ display: "block", lineHeight: 1.1 }}>{p.label}</Typography>
                <Typography variant="caption" sx={{ color: "text.secondary", fontSize: 10.5, textTransform: "capitalize" }}>{p.texto || "—"}</Typography>
              </Box>
            </Box>
            {i < 2 && <Box sx={{ flex: 1, height: 2, mx: 1, borderRadius: 2, bgcolor: p.done ? "#16A34A" : "divider" }} />}
          </Box>
        );
      })}
    </Box>
  );
}

export default function ReporteDetallePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const rol = user?.rol;

  // Permisos por rol (ver reporte.routes.js / asignacion.routes.js en el backend,
  // que son quienes realmente los hacen cumplir — esto solo evita mostrar
  // controles que luego fallarían con 403).
  const puedeEditarReporte = ["admin", "coordinador", "ventas"].includes(rol);
  const puedeAsignar = ["admin", "coordinador", "ventas"].includes(rol);
  const puedeOperarAsignacion = ["admin", "coordinador", "tecnico"].includes(rol); // calibración/entrega/recolección/factura
  const puedeCertificado = ["admin", "coordinador"].includes(rol); // Calidad
  const puedeFinalizar = ["admin", "coordinador"].includes(rol);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [factura, setFactura] = useState("");
  const [comentario, setComentario] = useState("");
  const [rechazoTarget, setRechazoTarget] = useState(null);

  const cargar = useCallback(() => {
    setLoading(true);
    obtenerReporte(id)
      .then((d) => { setData(d); setFactura(d.reporte.factura || ""); })
      .catch(() => setError("No se pudo cargar el reporte."))
      .finally(() => setLoading(false));
  }, [id]);
  useEffect(() => { cargar(); }, [cargar]);

  const guardarFactura = async () => {
    try {
      await actualizarReporte(id, { factura });
      cargar();
    } catch {
      setError("No se pudo guardar la factura.");
    }
  };

  const reabrir = async () => {
    try {
      await actualizarReporte(id, { status: "recepcion" });
      cargar();
    } catch {
      setError("No se pudo reabrir el reporte.");
    }
  };

  const finalizar = async () => {
    try {
      await actualizarReporte(id, { status: "terminado" });
      cargar();
    } catch (e) {
      setError(e?.response?.data?.message || "No se pudo finalizar el reporte.");
    }
  };

  const enviarComentario = async () => {
    if (!comentario.trim()) return;
    try {
      await agregarComentarioReporte(id, comentario.trim());
      setComentario("");
      cargar();
    } catch {
      setError("No se pudo agregar el comentario.");
    }
  };

  const guardarRecoleccion = async (asignacionId, campo, valor) => {
    try {
      await actualizarAsignacion(asignacionId, { recoleccion: { [campo]: valor } });
      cargar();
    } catch {
      setError("No se pudo guardar la información de recolección.");
    }
  };

  const guardarFacturaAsignacion = async (asignacionId, valor) => {
    try {
      await actualizarAsignacion(asignacionId, { factura: valor });
      cargar();
    } catch {
      setError("No se pudo guardar la factura de la asignación.");
    }
  };

  const onCambiarEstado = (asignacionId, dominio, valor) => {
    if (dominio === "certificado" && valor === "rechazado") {
      setRechazoTarget(asignacionId);
      return;
    }
    cambiarEstadoAsignacion(asignacionId, { dominio, valor }).then(cargar).catch(() =>
      setError("No se pudo cambiar el estado.")
    );
  };

  if (loading && !data) {
    return <Box sx={{ p: 4 }}><Typography color="text.secondary">Cargando…</Typography></Box>;
  }
  if (error && !data) {
    return <Box sx={{ p: 4 }}><Alert severity="error">{error}</Alert></Box>;
  }
  if (!data) return null;

  const { reporte, asignaciones } = data;
  const cliente = reporte.cliente || {};
  const st = STATUS_REPORTE[reporte.status] || { label: reporte.status, color: "default" };

  return (
    <Box>
      <PageHeader
        icon={<FactCheckOutlinedIcon />}
        title={`Reporte de Servicio ${reporte.folio}`}
        subtitle={cliente.nombre}
        actions={
          <>
            <AppButton variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => navigate("/reportes")} sx={{ borderRadius: 2 }}>
              Volver
            </AppButton>
            <AppButton variant="outlined" startIcon={<RefreshOutlinedIcon />} onClick={cargar} sx={{ borderRadius: 2 }}>
              Actualizar
            </AppButton>
          </>
        }
      />

      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError("")}>{error}</Alert>}

      {/* Datos del cliente / reporte */}
      <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3, mb: 2.5 }}>
        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
          <Box>
            <Campo label="Cliente" value={cliente.nombre} />
            <Campo label="Contacto" value={reporte.contacto?.nombre} />
            <Campo label="Teléfono" value={reporte.contacto?.telefono} />
            <Campo label="Reporte" value={reporte.folio} />
            <Campo label="Orden de Compra" value={reporte.ordenCompra} />
          </Box>
          <Box>
            <Campo label="Dirección" value={direccionCliente(cliente)} />
            <Campo label="Cotización">
              {reporte.cotizacion?.folio ? (
                <MuiLink component="button" variant="body2" onClick={() => navigate(`/cotizaciones?editar=${reporte.cotizacion._id}`)}>
                  {reporte.cotizacion.folio}
                </MuiLink>
              ) : <Typography variant="body2">—</Typography>}
            </Campo>
            <Campo label="Factura">
              <Box sx={{ display: "flex", gap: 1 }}>
                <TextField size="small" value={factura} onChange={(e) => setFactura(e.target.value)} fullWidth
                  disabled={!puedeEditarReporte}
                  placeholder="Ej. EQUIPOS ENTREGADOS 28/08/26" />
                <Button variant="contained" size="small" onClick={guardarFactura} disabled={!puedeEditarReporte} sx={{ borderRadius: 2 }}>Guardar</Button>
              </Box>
            </Campo>
          </Box>
        </Box>
      </Paper>

      {/* Barra de estatus + PDFs */}
      <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, mb: 2.5, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1.5 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Typography variant="body2" color="text.secondary">
            Creado el {formatDate(reporte.createdAt)}
          </Typography>
          <Chip size="small" label={st.label} color={st.color} />
          {reporte.status !== "recepcion" && puedeFinalizar && (
            <MuiLink component="button" variant="body2" onClick={reabrir}>Reabrir</MuiLink>
          )}
        </Box>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Tooltip title="PDF de Recolección (Reporte de Servicio)">
            <IconButton size="small" onClick={() => window.open(`/informe/reporte/${id}`, "_blank")}>
              <PictureAsPdfOutlinedIcon sx={{ color: "error.main" }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="PDF de Entrega de Equipo">
            <IconButton size="small" onClick={() => window.open(`/informe/reporte-entrega/${id}`, "_blank")}>
              <PictureAsPdfOutlinedIcon sx={{ color: "error.main" }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="PDF de Entrega de Certificados">
            <IconButton size="small" onClick={() => window.open(`/informe/reporte-entrega-certificados/${id}`, "_blank")}>
              <PictureAsPdfOutlinedIcon sx={{ color: "error.main" }} />
            </IconButton>
          </Tooltip>
        </Box>
      </Paper>

      {/* Recolección de equipos */}
      <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>Recolección de equipos</Typography>
      <Paper variant="outlined" sx={{ borderRadius: 3, mb: 2.5, overflow: "auto" }}>
        <Box component="table" sx={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <Box component="thead" sx={{ bgcolor: "background.default" }}>
            <Box component="tr">
              {["Marca", "Modelo", "Descripción", "En Sitio", "En Laboratorio", "Ubicación", "Recolectado", "Info. Recolección"].map((h) => (
                <Box component="th" key={h} sx={{ p: 1, textAlign: "left", borderBottom: 1, borderColor: "divider", fontSize: 11, fontWeight: 700, color: "text.secondary" }}>{h}</Box>
              ))}
            </Box>
          </Box>
          <Box component="tbody">
            {asignaciones.map((a) => (
              <Box component="tr" key={a._id} sx={{ "& td": { p: 1, borderBottom: 1, borderColor: "divider" } }}>
                <Box component="td">{a.equipo?.marca || "—"}</Box>
                <Box component="td">{a.equipo?.modelo || "—"}</Box>
                <Box component="td">{a.equipo?.descripcion || "—"}</Box>
                <Box component="td" sx={{ textAlign: "center" }}>
                  <Checkbox size="small" checked={!!a.recoleccion?.enSitio} disabled={!puedeOperarAsignacion}
                    onChange={(e) => guardarRecoleccion(a._id, "enSitio", e.target.checked)} />
                </Box>
                <Box component="td" sx={{ textAlign: "center" }}>
                  <Checkbox size="small" checked={!!a.recoleccion?.enLaboratorio} disabled={!puedeOperarAsignacion}
                    onChange={(e) => guardarRecoleccion(a._id, "enLaboratorio", e.target.checked)} />
                </Box>
                <Box component="td">
                  <TextField size="small" variant="standard" placeholder="Info. ubicación" disabled={!puedeOperarAsignacion}
                    defaultValue={a.recoleccion?.ubicacionInfo || ""}
                    onBlur={(e) => guardarRecoleccion(a._id, "ubicacionInfo", e.target.value)} />
                </Box>
                <Box component="td" sx={{ textAlign: "center" }}>
                  <Checkbox size="small" checked={!!a.recoleccion?.recolectado} disabled={!puedeOperarAsignacion}
                    onChange={(e) => guardarRecoleccion(a._id, "recolectado", e.target.checked)} />
                </Box>
                <Box component="td">
                  <TextField size="small" variant="standard" placeholder="Info. recolección" disabled={!puedeOperarAsignacion}
                    defaultValue={a.recoleccion?.infoRecoleccion || ""}
                    onBlur={(e) => guardarRecoleccion(a._id, "infoRecoleccion", e.target.value)} />
                </Box>
              </Box>
            ))}
            {asignaciones.length === 0 && (
              <Box component="tr"><Box component="td" colSpan={8} sx={{ p: 2, textAlign: "center", color: "text.secondary" }}>Sin equipos asignados todavía.</Box></Box>
            )}
          </Box>
        </Box>
      </Paper>

      {/* Selecciona el equipo a calibrar */}
      {puedeAsignar && (
        <>
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>Selecciona el equipo a calibrar</Typography>
          <AsignarForm clienteId={cliente._id} reporteId={id} onDone={cargar} />
        </>
      )}

      {/* Asignaciones */}
      <Typography variant="subtitle2" fontWeight={700} sx={{ mt: 3, mb: 1 }}>Asignaciones ({asignaciones.length})</Typography>
      {asignaciones.length === 0 && (
        <Box sx={{ py: 4, textAlign: "center", border: "1px dashed", borderColor: "divider", borderRadius: 3, mb: 2.5 }}>
          <Typography variant="body2" color="text.secondary">Sin asignaciones todavía.</Typography>
        </Box>
      )}
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, mb: 2.5 }}>
        {asignaciones.map((a) => {
          const tecnico = a.tecnicoEjecutor || a.tecnicoAsignado;
          return (
            <Paper key={a._id} elevation={0} sx={{ p: 2, borderRadius: 3, border: 1, borderColor: "divider" }}>
              <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 1.5, flexWrap: "wrap" }}>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="body2" fontWeight={700}>
                    {a.equipo?.idInterno} <Box component="span" sx={{ color: "text.secondary", fontWeight: 500 }}>· {a.equipo?.marca} {a.equipo?.modelo}</Box>
                  </Typography>
                  <Typography variant="caption" color="text.secondary">{a.equipo?.descripcion}</Typography>
                </Box>
                <Box sx={{ display: "flex", gap: 0.5, alignItems: "center", flexWrap: "wrap" }}>
                  {a.equipo?.categoria && <Chip size="small" variant="outlined" label={a.equipo.categoria} />}
                  {tecnico?.nombre && (
                    <Tooltip title={`${a.tecnicoEjecutor ? "Ejecutó" : "Asignado"}: ${tecnico.nombre}`}>
                      <Avatar sx={{ width: 24, height: 24, fontSize: 11, bgcolor: "secondary.main" }}>{tecnico.nombre.charAt(0)}</Avatar>
                    </Tooltip>
                  )}
                </Box>
              </Box>

              <StateTracker estados={a.estados} />

              {(a.patrones || []).length > 0 && (
                <Box sx={{ display: "flex", gap: 0.5, mt: 1.25, flexWrap: "wrap" }}>
                  {a.patrones.map((p) => (
                    <Chip
                      key={p._id} size="small" variant="outlined" label={p.codigo}
                      icon={<Box sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: VIG_DOT[vigenciaPatron(p)], ml: 0.75 }} />}
                    />
                  ))}
                </Box>
              )}

              <Box sx={{ display: "flex", gap: 1.5, mt: 1.5, flexWrap: "wrap", alignItems: "flex-start" }}>
                <FormControl size="small" sx={{ minWidth: 130 }} disabled={!puedeOperarAsignacion}>
                  <InputLabel>Calibración</InputLabel>
                  <Select label="Calibración" value={a.estados?.calibracion} onChange={(e) => onCambiarEstado(a._id, "calibracion", e.target.value)}>
                    {Object.entries(EST_CALIBRACION).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
                  </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 120 }} disabled={!puedeOperarAsignacion}>
                  <InputLabel>Entrega</InputLabel>
                  <Select label="Entrega" value={a.estados?.entrega} onChange={(e) => onCambiarEstado(a._id, "entrega", e.target.value)}>
                    {Object.entries(EST_ENTREGA).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
                  </Select>
                </FormControl>
                <Box>
                  <FormControl size="small" sx={{ minWidth: 140 }} disabled={!puedeCertificado}>
                    <InputLabel>Certificado</InputLabel>
                    <Select label="Certificado" value={a.estados?.certificado} onChange={(e) => onCambiarEstado(a._id, "certificado", e.target.value)}>
                      {Object.entries(EST_CERTIFICADO).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
                    </Select>
                  </FormControl>
                  {a.motivoRechazo && (
                    <Typography variant="caption" color="error.main" sx={{ display: "block", mt: 0.5, maxWidth: 200 }}>
                      {a.motivoRechazo}
                    </Typography>
                  )}
                </Box>
                <TextField size="small" label="Factura" defaultValue={a.factura || ""} disabled={!puedeOperarAsignacion}
                  onBlur={(e) => guardarFacturaAsignacion(a._id, e.target.value)} />
              </Box>
            </Paper>
          );
        })}
      </Box>

      {/* Comentarios */}
      <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>Comentarios</Typography>
      <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, mb: 2.5 }}>
        {(reporte.comentarios || []).map((c, i) => (
          <Box key={i} sx={{ mb: 1, pb: 1, borderBottom: 1, borderColor: "divider" }}>
            <Typography variant="caption" color="text.secondary">
              {formatDate(c.fecha)} · {c.usuario?.nombre || "—"}
            </Typography>
            <Typography variant="body2">{c.texto}</Typography>
          </Box>
        ))}
        <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
          <TextField size="small" fullWidth multiline minRows={2} value={comentario}
            onChange={(e) => setComentario(e.target.value)} placeholder="Escribe un comentario…" />
          <Button variant="contained" onClick={enviarComentario} sx={{ borderRadius: 2, height: "fit-content" }}>Agregar</Button>
        </Box>
      </Paper>

      {/* Historial de actividad */}
      {reporte.historial?.length > 0 && (
        <>
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>Historial</Typography>
          <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3, mb: 2.5 }}>
            <Box sx={{ position: "relative", pl: 2.5 }}>
              <Box sx={{ position: "absolute", left: 4, top: 4, bottom: 4, width: 2, bgcolor: "divider" }} />
              {reporte.historial.slice().reverse().map((h, i) => (
                <Box key={i} sx={{ position: "relative", pb: 1.25 }}>
                  <Box sx={{ position: "absolute", left: -20, top: 5, width: 8, height: 8, borderRadius: "50%", bgcolor: "secondary.main", border: "2px solid var(--mui-palette-background-paper)" }} />
                  <Typography variant="caption" sx={{ display: "block", fontWeight: 600 }}>{h.accion}</Typography>
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    {h.usuario?.nombre || h.usuario?.usuario} · {new Date(h.fecha).toLocaleString("es-MX")}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Paper>
        </>
      )}

      {puedeFinalizar && (
        <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 4 }}>
          <AppButton onClick={finalizar} sx={{ borderRadius: 2 }}>Finalizar Reporte</AppButton>
        </Box>
      )}

      <RechazarDialog open={!!rechazoTarget} onClose={() => setRechazoTarget(null)}
        onConfirm={(motivo) => {
          cambiarEstadoAsignacion(rechazoTarget, { dominio: "certificado", valor: "rechazado", motivo }).then(cargar);
          setRechazoTarget(null);
        }} />
    </Box>
  );
}

function AsignarForm({ clienteId, reporteId, onDone }) {
  const [equipos, setEquipos] = useState([]);
  const [tecnicos, setTecnicos] = useState([]);
  const [patronesDisp, setPatronesDisp] = useState([]);
  const [performanceDisp, setPerformanceDisp] = useState([]);

  const [equipo, setEquipo] = useState("");
  const [tecnicoAsignado, setTecnicoAsignado] = useState("");
  const [patrones, setPatrones] = useState([]);
  const [performance, setPerformance] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!clienteId) return;
    listarEquipos({ clienteId, pageSize: 200 }).then(({ items }) => setEquipos(items)).catch(() => {});
    obtenerDirectorio().then((lista) => setTecnicos(lista.filter((u) => u.rol === "tecnico"))).catch(() => {});
    listarPatrones({ soloVigentes: "true", pageSize: 200 }).then(({ items }) => setPatronesDisp(items)).catch(() => {});
    listarPerformance({ pageSize: 200 }).then(({ items }) => setPerformanceDisp(items)).catch(() => {});
  }, [clienteId]);

  // Al elegir un equipo, precargar los patrones que normalmente se usan para
  // calibrarlo (Equipo.patronesSugeridos) — el usuario los puede quitar/ajustar.
  useEffect(() => {
    const eq = equipos.find((e) => e._id === equipo);
    const sugeridos = eq?.patronesSugeridos || [];
    if (sugeridos.length && patronesDisp.length) {
      const ids = new Set(sugeridos.map((p) => (typeof p === "string" ? p : p._id)));
      setPatrones(patronesDisp.filter((p) => ids.has(p._id)));
    }
  }, [equipo, equipos, patronesDisp]);

  const asignar = async () => {
    if (!equipo) { setError("Elige un equipo."); return; }
    setSaving(true); setError("");
    try {
      await crearAsignacion({
        reporte: reporteId, equipo,
        tecnicoAsignado: tecnicoAsignado || undefined,
        patrones: patrones.map((p) => p._id),
        performance: performance || undefined,
      });
      setEquipo(""); setTecnicoAsignado(""); setPatrones([]); setPerformance("");
      onDone();
    } catch (e) {
      setError(e?.response?.data?.message || "No se pudo asignar el equipo.");
    } finally { setSaving(false); }
  };

  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, mb: 2.5 }}>
      {error && <Alert severity="error" sx={{ mb: 1.5, borderRadius: 2 }}>{error}</Alert>}
      <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", alignItems: "flex-start" }}>
        <FormControl size="small" sx={{ minWidth: 130 }}>
          <InputLabel>Técnico</InputLabel>
          <Select label="Técnico" value={tecnicoAsignado} onChange={(e) => setTecnicoAsignado(e.target.value)}>
            <MenuItem value="">Sin asignar</MenuItem>
            {tecnicos.map((t) => <MenuItem key={t._id} value={t._id}>{t.nombre}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 220 }}>
          <InputLabel>Equipo</InputLabel>
          <Select label="Equipo" value={equipo} onChange={(e) => setEquipo(e.target.value)}>
            {equipos.map((eq) => (
              <MenuItem key={eq._id} value={eq._id}>{eq.idInterno} — {eq.marca} {eq.modelo}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <Autocomplete
          multiple size="small" options={patronesDisp} value={patrones}
          getOptionLabel={(p) => `${p.codigo} — ${p.nombre}`}
          isOptionEqualToValue={(a, b) => a._id === b._id}
          onChange={(_, v) => setPatrones(v)}
          sx={{ minWidth: 240 }}
          renderInput={(params) => <TextField {...params} label="Patrón" />}
        />
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>Performance</InputLabel>
          <Select label="Performance" value={performance} onChange={(e) => setPerformance(e.target.value)}>
            <MenuItem value="">Ninguna</MenuItem>
            {performanceDisp.map((p) => <MenuItem key={p._id} value={p._id}>{p.nombre}</MenuItem>)}
          </Select>
        </FormControl>
        <AppButton startIcon={<AddIcon />} onClick={asignar} disabled={saving} sx={{ borderRadius: 2 }}>Asignar</AppButton>
      </Box>
    </Paper>
  );
}

function RechazarDialog({ open, onClose, onConfirm }) {
  const [motivo, setMotivo] = useState("");
  const cerrar = () => { setMotivo(""); onClose(); };
  return (
    <Dialog open={open} onClose={cerrar} fullWidth maxWidth="xs">
      <DialogTitle sx={{ fontWeight: 700 }}>Rechazar certificado</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          Indica el motivo del rechazo por Calidad. Quedará registrado en el historial.
        </Typography>
        <TextField autoFocus fullWidth multiline minRows={3} size="small"
          placeholder="Ej. Falta firma del técnico en la hoja de datos originales."
          value={motivo} onChange={(e) => setMotivo(e.target.value)} />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={cerrar}>Cancelar</Button>
        <Button color="error" variant="contained" disabled={!motivo.trim()}
          onClick={() => { onConfirm(motivo.trim()); setMotivo(""); }} sx={{ borderRadius: 2 }}>
          Enviar rechazo
        </Button>
      </DialogActions>
    </Dialog>
  );
}
