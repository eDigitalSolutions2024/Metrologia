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
import ReportProblemOutlinedIcon from "@mui/icons-material/ReportProblemOutlined";
import PlayCircleOutlineIcon from "@mui/icons-material/PlayCircleOutlineOutlined";
import VerifiedOutlinedIcon from "@mui/icons-material/VerifiedOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";

import AppButton from "../../shared/components/AppButton";
import PageHeader from "../../shared/components/PageHeader";
import { formatDate } from "../../shared/utils/formatDate";
import FactCheckOutlinedIcon from "@mui/icons-material/FactCheckOutlined";
import {
  obtenerReporte, actualizarReporte, agregarComentarioReporte,
  crearAsignacion, actualizarAsignacion, cambiarEstadoAsignacion, eliminarAsignacion,
} from "../../services/reportes";
import { listarEquipos } from "../../services/equipos";
import { obtenerDirectorio } from "../../services/usuarios";
import { listarPatrones } from "../../services/patrones";
import { listarPerformance } from "../../services/performance";
import { listarContactos, crearContacto } from "../../services/contactos";
import { listarCotizaciones } from "../../services/cotizaciones";
import { listarCertificadosPorReporte, emitirCertificado, cambiarEstadoCertificado } from "../../services/certificados";
import { aprobarCalculosPorAsignacion } from "../../services/incertidumbre";
import { direccionCliente } from "./imprimir/shared";
import { useAuth } from "../../core/auth/useAuth";
import CapturarCalibracionDialog from "./CapturarCalibracionDialog";

const EST_ENTREGA = { pendiente: "Pendiente", entregado: "Entregado" };
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

// El backend expone `calibracion.vencimiento` (fecha) — la categoría
// vigente/por_vencer/vencido se calcula aquí, a 30 días de aviso.
function vigenciaPatron(p) {
  const v = p?.calibracion?.vencimiento || p?.ultimaCalibracion?.vencimiento;
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
  const [certificadoPorAsignacion, setCertificadoPorAsignacion] = useState({});
  const [calibracionTarget, setCalibracionTarget] = useState(null);
  const [aprobando, setAprobando] = useState(null);
  const [editarTarget, setEditarTarget] = useState(null);
  const [eliminarTarget, setEliminarTarget] = useState(null);
  const [eliminando, setEliminando] = useState(false);
  const [emitirTarget, setEmitirTarget] = useState(null);
  const [contactoDialog, setContactoDialog] = useState(false);
  const [cotizacionDialog, setCotizacionDialog] = useState(false);

  const cargar = useCallback(() => {
    setLoading(true);
    obtenerReporte(id)
      .then((d) => { setData(d); setFactura(d.reporte.factura || ""); })
      .catch(() => setError("No se pudo cargar el reporte."))
      .finally(() => setLoading(false));
    listarCertificadosPorReporte(id)
      .then((certs) => {
        const mapa = {};
        certs.forEach((c) => { if (c.asignacion) mapa[c.asignacion] = c._id; });
        setCertificadoPorAsignacion(mapa);
      })
      .catch(() => setCertificadoPorAsignacion({}));
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

  // Aprueba de un jalón todos los cálculos de incertidumbre de la asignación
  // y autoriza el certificado — reemplaza aprobar cálculo por cálculo y
  // luego cambiar el <Select> de Certificado a mano.
  const aprobarYAutorizar = async (a) => {
    setAprobando(a._id);
    try {
      await aprobarCalculosPorAsignacion(a._id);
      await cambiarEstadoAsignacion(a._id, { dominio: "certificado", valor: "autorizado" });
      cargar();
    } catch (e) {
      setError(e?.response?.data?.message || "No se pudo aprobar y autorizar.");
    } finally {
      setAprobando(null);
    }
  };

  // Calidad revisa el certificado ya emitido (en revisión) y lo aprueba →
  // pasa a "vigente" (el certificado oficial). Si algo está mal, se rechaza
  // con motivo (botón aparte) y regresa al técnico a re-calibrar.
  const aprobarCertificado = async (certId) => {
    if (!certId) return;
    setAprobando(certId);
    try {
      await cambiarEstadoCertificado(certId, "vigente");
      cargar();
    } catch (e) {
      setError(e?.response?.data?.message || "No se pudo aprobar el certificado.");
    } finally {
      setAprobando(null);
    }
  };

  const confirmarEliminarAsignacion = async () => {
    if (!eliminarTarget) return;
    setEliminando(true);
    try {
      await eliminarAsignacion(eliminarTarget._id);
      setEliminarTarget(null);
      cargar();
    } catch (e) {
      setError(e?.response?.data?.message || "No se pudo quitar la asignación.");
    } finally {
      setEliminando(false);
    }
  };

  // Editar/quitar solo tiene sentido mientras nada haya arrancado.
  const asignacionEditable = (a) =>
    a.estados?.calibracion === "pendiente" && a.estados?.certificado === "sin_generar";

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
      <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, mb: 2.5 }}>
        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
          <Box>
            <Campo label="Cliente" value={cliente.nombre} />
            <Campo label="Contacto">
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, minWidth: 0 }}>
                <Typography variant="body2" noWrap>{reporte.contacto?.nombre || "—"}</Typography>
                {puedeEditarReporte && (
                  <Tooltip title={reporte.contacto ? "Cambiar contacto" : "Asignar contacto"}>
                    <IconButton size="small" onClick={() => setContactoDialog(true)}>
                      <EditOutlinedIcon sx={{ fontSize: 15 }} />
                    </IconButton>
                  </Tooltip>
                )}
              </Box>
            </Campo>
            <Campo label="Teléfono" value={reporte.contacto?.telefono || reporte.contacto?.correo} />
            <Campo label="Reporte" value={reporte.folio} />
            <Campo label="Orden de Compra" value={reporte.ordenCompra} />
          </Box>
          <Box>
            <Campo label="Dirección" value={direccionCliente(cliente)} />
            <Campo label="Cotización">
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, minWidth: 0 }}>
                {reporte.cotizacion?.folio ? (
                  <MuiLink component="button" variant="body2" onClick={() => navigate(`/cotizaciones?editar=${reporte.cotizacion._id}`)}>
                    {reporte.cotizacion.folio}
                  </MuiLink>
                ) : <Typography variant="body2">—</Typography>}
                {puedeEditarReporte && (
                  <Tooltip title={reporte.cotizacion ? "Cambiar cotización" : "Asignar cotización"}>
                    <IconButton size="small" onClick={() => setCotizacionDialog(true)}>
                      <EditOutlinedIcon sx={{ fontSize: 15 }} />
                    </IconButton>
                  </Tooltip>
                )}
              </Box>
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
      <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, mb: 2.5, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1.5 }}>
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
          <Tooltip title="Paquete de Certificados (todos los equipos, un solo PDF)">
            <IconButton size="small" onClick={() => window.open(`/informe/reporte/${id}/certificados`, "_blank")}>
              <PictureAsPdfOutlinedIcon sx={{ color: "success.main" }} />
            </IconButton>
          </Tooltip>
        </Box>
      </Paper>

      {/* Equipos cotizados — referencia de lo que trae la cotización ligada, sin precios */}
      {reporte.cotizacion?.items?.length > 0 && (
        <>
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
            Equipos Cotizados
            <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1, fontWeight: 400 }}>
              (de la cotización {reporte.cotizacion.folio})
            </Typography>
          </Typography>
          <Paper variant="outlined" sx={{ borderRadius: 1.5, mb: 2.5, overflow: "auto" }}>
            <Box component="table" sx={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <Box component="thead" sx={{ bgcolor: "background.default" }}>
                <Box component="tr">
                  {["Descripción", "Marca", "Modelo", "Cantidad", "Tiempo de entrega"].map((h) => (
                    <Box
                      component="th" key={h}
                      sx={{ px: 2, py: 1.5, textAlign: "left", borderBottom: 1, borderColor: "divider", fontSize: 11, fontWeight: 700, color: "text.secondary" }}
                    >{h}</Box>
                  ))}
                </Box>
              </Box>
              <Box component="tbody">
                {reporte.cotizacion.items.map((it, i) => (
                  <Box component="tr" key={i} sx={{ "& td": { px: 2, py: 1.25, borderBottom: 1, borderColor: "divider" } }}>
                    <Box component="td">{it.descripcion || "—"}</Box>
                    <Box component="td">{it.marca || "—"}</Box>
                    <Box component="td">{it.modelo || "—"}</Box>
                    <Box component="td">{it.cantidad ?? "—"}</Box>
                    <Box component="td">{it.tiempoEntrega || "—"}</Box>
                  </Box>
                ))}
              </Box>
            </Box>
          </Paper>
        </>
      )}

      {/* Recolección de equipos */}
      <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>Recolección de equipos</Typography>
      <Paper variant="outlined" sx={{ borderRadius: 1.5, mb: 2.5, overflow: "auto" }}>
        <Box component="table" sx={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <Box component="thead" sx={{ bgcolor: "background.default" }}>
            <Box component="tr">
              {["Marca", "Modelo", "Descripción", "En Sitio", "En Laboratorio", "Ubicación", "Recolectado", "Info. Recolección"].map((h) => (
                <Box
                  component="th" key={h}
                  sx={{ px: 2, py: 1.5, textAlign: "left", borderBottom: 1, borderColor: "divider", fontSize: 11, fontWeight: 700, color: "text.secondary" }}
                >{h}</Box>
              ))}
            </Box>
          </Box>
          <Box component="tbody">
            {asignaciones.map((a) => (
              <Box component="tr" key={a._id} sx={{ "& td": { px: 2, py: 1.25, borderBottom: 1, borderColor: "divider" } }}>
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
          <AsignarForm clienteId={cliente._id} reporteId={id} equiposYaAsignados={asignaciones.map((a) => a.equipo?._id)} onDone={cargar} />
        </>
      )}

      {/* Asignaciones */}
      <Typography variant="subtitle2" fontWeight={700} sx={{ mt: 3, mb: 1 }}>Asignaciones ({asignaciones.length})</Typography>
      {asignaciones.length === 0 && (
        <Box sx={{ py: 4, textAlign: "center", border: "1px dashed", borderColor: "divider", borderRadius: 2, mb: 2.5 }}>
          <Typography variant="body2" color="text.secondary">Sin asignaciones todavía.</Typography>
        </Box>
      )}
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, mb: 2.5 }}>
        {asignaciones.map((a) => {
          const tecnico = a.tecnicoEjecutor || a.tecnicoAsignado;
          return (
            <Paper key={a._id} elevation={0} sx={{ p: 2, borderRadius: 2, border: 1, borderColor: "divider" }}>
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
                  {puedeAsignar && asignacionEditable(a) && (
                    <>
                      <Tooltip title="Editar asignación (técnico, patrones, Tolerancia)">
                        <IconButton size="small" onClick={() => setEditarTarget(a)}>
                          <EditOutlinedIcon fontSize="small" sx={{ color: "secondary.main" }} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Quitar asignación">
                        <IconButton size="small" onClick={() => setEliminarTarget(a)}>
                          <DeleteOutlineIcon fontSize="small" sx={{ color: "error.main" }} />
                        </IconButton>
                      </Tooltip>
                    </>
                  )}
                </Box>
              </Box>

              <StateTracker estados={a.estados} />

              {a.estados?.entrega === "entregado" && a.estados?.certificado !== "autorizado" && (
                <Tooltip title="El equipo ya fue entregado pero su certificado no está autorizado por Calidad (fue rechazado o anulado después de la entrega). Revisa este caso manualmente.">
                  <Alert
                    icon={<ReportProblemOutlinedIcon fontSize="small" />}
                    severity="warning"
                    sx={{ mt: 1, py: 0, "& .MuiAlert-message": { fontSize: 12.5 } }}
                  >
                    Entregado con certificado sin autorizar — requiere revisión.
                  </Alert>
                </Tooltip>
              )}

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

              {a.motivoRechazo && (() => {
                const ultimo = (a.historialRechazos || [])[a.historialRechazos.length - 1];
                return (
                  <Alert
                    severity="error" icon={<ReportProblemOutlinedIcon />}
                    sx={{ mt: 1.5, borderRadius: 2, alignItems: "flex-start", "& .MuiAlert-message": { width: "100%" } }}
                  >
                    <Typography variant="body2" fontWeight={700}>Certificado rechazado — pendiente de corrección</Typography>
                    <Typography variant="body2" sx={{ mt: 0.25 }}>{a.motivoRechazo}</Typography>
                    {ultimo && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                        {ultimo.usuario?.nombre || "Calidad"} · {formatDate(ultimo.fecha)}
                      </Typography>
                    )}
                  </Alert>
                );
              })()}

              <Box sx={{ display: "flex", gap: 1.5, mt: 1.5, flexWrap: "wrap", alignItems: "flex-start" }}>
                {/* Capturar / editar la calibración — antes de que arranque el
                    certificado, o después de un rechazo para corregirla (el
                    backend reabre el certificado solo al volver a Terminar). */}
                {puedeOperarAsignacion &&
                  (a.estados?.certificado === "sin_generar" || a.estados?.certificado === "rechazado") && (
                  <AppButton
                    type="button" variant="outlined" size="small" startIcon={<PlayCircleOutlineIcon />}
                    onClick={() => setCalibracionTarget(a)}
                    sx={{ borderRadius: 2, height: 40 }}
                  >
                    {a.estados?.certificado === "rechazado"
                      ? "Corregir calibración"
                      : a.estados?.calibracion === "pendiente"
                      ? "Iniciar calibración"
                      : a.estados?.calibracion === "en_proceso"
                      ? "Continuar calibración"
                      : "Editar calibración"}
                  </AppButton>
                )}

                {/* Ver la calibración capturada como se vería en el certificado
                    (sin folio ni QR reales) — para que Calidad la revise antes
                    de aprobar/rechazar, sin entrar a editarla. */}
                {a.estados?.calibracion === "terminada" && !certificadoPorAsignacion[a._id] && (
                  <AppButton
                    type="button" variant="outlined" size="small" startIcon={<PictureAsPdfOutlinedIcon />}
                    onClick={() => window.open(`/informe/asignacion/${a._id}/preview`, "_blank")}
                    sx={{ borderRadius: 2, height: 40 }}
                  >
                    Consultar calibración
                  </AppButton>
                )}

                {/* Calidad: aprobar los cálculos y autorizar */}
                {puedeCertificado && a.estados?.calibracion === "terminada" && a.estados?.certificado === "sin_generar" && (
                  <AppButton
                    type="button" variant="contained" color="success" size="small" startIcon={<VerifiedOutlinedIcon />}
                    loading={aprobando === a._id}
                    onClick={() => aprobarYAutorizar(a)}
                    sx={{ borderRadius: 2, height: 40 }}
                  >
                    Aprobar y autorizar certificado
                  </AppButton>
                )}

                {/* Calidad: emitir el documento del certificado */}
                {puedeCertificado && a.estados?.certificado === "autorizado" && !certificadoPorAsignacion[a._id] && (
                  <AppButton
                    type="button" variant="contained" size="small" startIcon={<WorkspacePremiumOutlinedIcon />}
                    onClick={() => setEmitirTarget(a)}
                    sx={{ borderRadius: 2, height: 40 }}
                  >
                    Emitir certificado
                  </AppButton>
                )}

                {certificadoPorAsignacion[a._id] && (
                  <AppButton
                    type="button" variant="outlined" size="small" startIcon={<PictureAsPdfOutlinedIcon />}
                    onClick={() => window.open(`/informe/certificado/${certificadoPorAsignacion[a._id]}`, "_blank")}
                    sx={{ borderRadius: 2, height: 40 }}
                  >
                    Ver certificado (PDF)
                  </AppButton>
                )}

                {/* Calidad: revisar el certificado emitido → aprobarlo (vigente) */}
                {puedeCertificado && a.estados?.certificado === "en_revision" && certificadoPorAsignacion[a._id] && (
                  <AppButton
                    type="button" variant="contained" color="success" size="small" startIcon={<VerifiedOutlinedIcon />}
                    loading={aprobando === certificadoPorAsignacion[a._id]}
                    onClick={() => aprobarCertificado(certificadoPorAsignacion[a._id])}
                    sx={{ borderRadius: 2, height: 40 }}
                  >
                    Aprobar certificado
                  </AppButton>
                )}

                {/* Calidad: algo está mal → rechazar con motivo. Regresa la
                    calibración a "pendiente" para que el técnico la termine.
                    Disponible mientras se revisa (calibración terminada sin
                    certificado, o certificado emitido en revisión). Una vez
                    autorizado ya no se rechaza desde aquí. */}
                {puedeCertificado &&
                  a.estados?.calibracion === "terminada" &&
                  ["sin_generar", "en_revision"].includes(a.estados?.certificado) && (
                    <AppButton
                      type="button" variant="outlined" color="error" size="small" startIcon={<ReportProblemOutlinedIcon />}
                      onClick={() => onCambiarEstado(a._id, "certificado", "rechazado")}
                      sx={{ borderRadius: 2, height: 40 }}
                    >
                      Rechazar
                    </AppButton>
                  )}

                {/* La calibración y el certificado se manejan solo con los
                    botones de arriba y la barra de 3 pasos; el único estado
                    que se marca a mano es la entrega del equipo. */}
                <FormControl size="small" sx={{ minWidth: 150 }} disabled={!puedeOperarAsignacion}>
                  <InputLabel>Entrega</InputLabel>
                  <Select label="Entrega" value={a.estados?.entrega} onChange={(e) => onCambiarEstado(a._id, "entrega", e.target.value)}>
                    {Object.entries(EST_ENTREGA).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
                  </Select>
                </FormControl>
                <TextField size="small" label="Factura" defaultValue={a.factura || ""} disabled={!puedeOperarAsignacion}
                  onBlur={(e) => guardarFacturaAsignacion(a._id, e.target.value)} />
              </Box>
            </Paper>
          );
        })}
      </Box>

      {/* Comentarios */}
      <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>Comentarios</Typography>
      <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, mb: 2.5 }}>
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
          <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, mb: 2.5 }}>
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

      <CapturarCalibracionDialog
        open={!!calibracionTarget}
        asignacion={calibracionTarget}
        onClose={() => setCalibracionTarget(null)}
        onDone={() => { setCalibracionTarget(null); cargar(); }}
      />

      <EditarAsignacionDialog
        open={!!editarTarget}
        asignacion={editarTarget}
        onClose={() => setEditarTarget(null)}
        onDone={() => { setEditarTarget(null); cargar(); }}
      />

      <EmitirCertificadoDialog
        open={!!emitirTarget}
        asignacion={emitirTarget}
        onClose={() => setEmitirTarget(null)}
        onDone={() => { setEmitirTarget(null); cargar(); }}
      />

      <AsignarContactoDialog
        open={contactoDialog}
        reporteId={id}
        clienteId={cliente._id}
        actual={reporte.contacto?._id || ""}
        onClose={() => setContactoDialog(false)}
        onDone={() => { setContactoDialog(false); cargar(); }}
      />

      <AsignarCotizacionDialog
        open={cotizacionDialog}
        reporteId={id}
        clienteId={cliente._id}
        actual={reporte.cotizacion?._id || ""}
        onClose={() => setCotizacionDialog(false)}
        onDone={() => { setCotizacionDialog(false); cargar(); }}
      />

      <Dialog open={!!eliminarTarget} onClose={() => setEliminarTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Quitar asignación</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            ¿Quitar <b>{eliminarTarget?.equipo?.idInterno}</b> ({eliminarTarget?.equipo?.marca} {eliminarTarget?.equipo?.modelo}) de este reporte?
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
            Solo se puede mientras la calibración no haya arrancado. Se puede volver a asignar después.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setEliminarTarget(null)}>Cancelar</Button>
          <Button color="error" variant="contained" disabled={eliminando} onClick={confirmarEliminarAsignacion} sx={{ borderRadius: 2 }}>
            Quitar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// Asignar / cambiar el contacto del cliente en el reporte, con alta rápida
// para no tener que salir a la ficha del cliente.
function AsignarContactoDialog({ open, reporteId, clienteId, actual, onClose, onDone }) {
  const [contactos, setContactos] = useState([]);
  const [sel, setSel] = useState("");
  const [nuevo, setNuevo] = useState(null); // { nombre, telefono, correo } | null
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setSel(actual || ""); setNuevo(null); setError("");
    if (clienteId) listarContactos(clienteId).then(setContactos).catch(() => setContactos([]));
  }, [open, clienteId, actual]);

  const agregar = async () => {
    if (!nuevo?.nombre?.trim()) { setError("Escribe el nombre del contacto."); return; }
    setGuardando(true); setError("");
    try {
      const c = await crearContacto(clienteId, {
        nombre: nuevo.nombre.trim(), telefono: nuevo.telefono?.trim() || undefined, correo: nuevo.correo?.trim() || undefined,
      });
      const lista = await listarContactos(clienteId).catch(() => contactos);
      setContactos(lista);
      setSel(c._id);
      setNuevo(null);
    } catch (e) {
      setError(e?.response?.data?.message || "No se pudo agregar el contacto.");
    } finally { setGuardando(false); }
  };

  const guardar = async () => {
    setGuardando(true); setError("");
    try {
      await actualizarReporte(reporteId, { contacto: sel || null });
      onDone();
    } catch (e) {
      setError(e?.response?.data?.message || "No se pudo asignar el contacto.");
    } finally { setGuardando(false); }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>Contacto del reporte</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 0.5 }}>
          <TextField select fullWidth size="small" label="Contacto" value={sel} onChange={(e) => setSel(e.target.value)}
            helperText={contactos.length === 0 ? "Este cliente no tiene contactos — agrega uno abajo" : ""}>
            <MenuItem value="">— Sin contacto —</MenuItem>
            {contactos.map((c) => (
              <MenuItem key={c._id} value={c._id}>{c.nombre}{c.telefono ? ` · ${c.telefono}` : ""}</MenuItem>
            ))}
          </TextField>

          {nuevo ? (
            <Box sx={{ p: 1.5, border: "1px dashed", borderColor: "divider", borderRadius: 2, display: "flex", flexDirection: "column", gap: 1.5 }}>
              <Typography variant="caption" fontWeight={700} color="text.secondary">Nuevo contacto</Typography>
              <TextField size="small" label="Nombre" value={nuevo.nombre} onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })} autoFocus />
              <Box sx={{ display: "flex", gap: 1 }}>
                <TextField size="small" label="Teléfono" value={nuevo.telefono} onChange={(e) => setNuevo({ ...nuevo, telefono: e.target.value })} fullWidth />
                <TextField size="small" label="Correo" value={nuevo.correo} onChange={(e) => setNuevo({ ...nuevo, correo: e.target.value })} fullWidth />
              </Box>
              <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end" }}>
                <Button size="small" onClick={() => setNuevo(null)}>Cancelar</Button>
                <Button size="small" variant="contained" onClick={agregar} disabled={guardando} sx={{ borderRadius: 2 }}>Agregar</Button>
              </Box>
            </Box>
          ) : (
            <Button size="small" startIcon={<AddIcon />} onClick={() => setNuevo({ nombre: "", telefono: "", correo: "" })} sx={{ alignSelf: "flex-start", borderRadius: 2 }}>
              Nuevo contacto
            </Button>
          )}
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={guardar} disabled={guardando} sx={{ borderRadius: 2 }}>Guardar</Button>
      </DialogActions>
    </Dialog>
  );
}

// Ligar / cambiar la cotización del reporte (útil cuando el reporte no nació
// desde una cotización).
function AsignarCotizacionDialog({ open, reporteId, clienteId, actual, onClose, onDone }) {
  const [cotizaciones, setCotizaciones] = useState([]);
  const [sel, setSel] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setSel(actual || ""); setError("");
    if (clienteId) {
      listarCotizaciones({ clienteId, pageSize: 100 })
        .then(({ items }) => setCotizaciones(items || []))
        .catch(() => setCotizaciones([]));
    }
  }, [open, clienteId, actual]);

  const guardar = async () => {
    setGuardando(true); setError("");
    try {
      await actualizarReporte(reporteId, { cotizacion: sel || null });
      onDone();
    } catch (e) {
      setError(e?.response?.data?.message || "No se pudo asignar la cotización.");
    } finally { setGuardando(false); }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>Cotización del reporte</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}
        <TextField select fullWidth size="small" label="Cotización" value={sel} onChange={(e) => setSel(e.target.value)} sx={{ mt: 0.5 }}
          helperText={cotizaciones.length === 0 ? "Este cliente no tiene cotizaciones registradas" : ""}>
          <MenuItem value="">— Sin cotización —</MenuItem>
          {cotizaciones.map((c) => (
            <MenuItem key={c._id} value={c._id}>{c.folio}{c.total != null ? ` · $${Number(c.total).toLocaleString()}` : ""}</MenuItem>
          ))}
        </TextField>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={guardar} disabled={guardando} sx={{ borderRadius: 2 }}>Guardar</Button>
      </DialogActions>
    </Dialog>
  );
}

// Editar una asignación ya creada (mientras no haya arrancado): cambiar
// técnico, patrones o plantilla de Tolerancia sin tener que quitarla y rehacerla.
function EditarAsignacionDialog({ open, asignacion, onClose, onDone }) {
  const [tecnicos, setTecnicos] = useState([]);
  const [patronesDisp, setPatronesDisp] = useState([]);
  const [performanceDisp, setPerformanceDisp] = useState([]);
  const [tecnicoAsignado, setTecnicoAsignado] = useState("");
  const [patrones, setPatrones] = useState([]);
  const [performance, setPerformance] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    obtenerDirectorio().then((l) => setTecnicos(l.filter((u) => u.rol === "tecnico"))).catch(() => {});
    listarPatrones({ soloVigentes: "true", pageSize: 200 }).then(({ items }) => setPatronesDisp(items)).catch(() => {});
    listarPerformance({ pageSize: 200 }).then(({ items }) => setPerformanceDisp(items)).catch(() => {});
  }, [open]);

  useEffect(() => {
    if (!open || !asignacion) return;
    setError("");
    setTecnicoAsignado(asignacion.tecnicoAsignado?._id || asignacion.tecnicoAsignado || "");
    setPerformance(asignacion.performance?._id || asignacion.performance || "");
    setPatrones((asignacion.patrones || []).map((p) => (typeof p === "string" ? { _id: p, codigo: p, nombre: "" } : p)));
  }, [open, asignacion]);

  // Al llegar el catálogo de patrones, cambia los del asignación por los
  // objetos completos (para que se vean bien las etiquetas).
  useEffect(() => {
    if (!patronesDisp.length || !asignacion) return;
    const ids = new Set((asignacion.patrones || []).map((p) => p._id || p));
    setPatrones(patronesDisp.filter((p) => ids.has(p._id)));
  }, [patronesDisp, asignacion]);

  const guardar = async () => {
    setSaving(true); setError("");
    try {
      await actualizarAsignacion(asignacion._id, {
        tecnicoAsignado: tecnicoAsignado || undefined,
        patrones: patrones.map((p) => p._id),
        performance: performance || undefined,
      });
      onDone();
    } catch (e) {
      setError(e?.response?.data?.message || "No se pudo guardar la asignación.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>
        Editar asignación{asignacion ? ` — ${asignacion.equipo?.idInterno}` : ""}
      </DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
        {error && <Alert severity="error" sx={{ borderRadius: 2 }}>{error}</Alert>}
        <FormControl size="small" fullWidth>
          <InputLabel>Técnico</InputLabel>
          <Select label="Técnico" value={tecnicoAsignado} onChange={(e) => setTecnicoAsignado(e.target.value)}>
            <MenuItem value="">Sin asignar</MenuItem>
            {tecnicos.map((t) => <MenuItem key={t._id} value={t._id}>{t.nombre}</MenuItem>)}
          </Select>
        </FormControl>
        <Autocomplete
          multiple size="small" options={patronesDisp} value={patrones}
          getOptionLabel={(p) => `${p.codigo}${p.nombre ? ` — ${p.nombre}` : ""}`}
          isOptionEqualToValue={(x, y) => x._id === y._id}
          onChange={(_, v) => setPatrones(v)}
          renderInput={(params) => <TextField {...params} label="Patrón" />}
        />
        <FormControl size="small" fullWidth>
          <InputLabel>Tolerancia</InputLabel>
          <Select label="Tolerancia" value={performance} onChange={(e) => setPerformance(e.target.value)}>
            <MenuItem value="">Ninguna</MenuItem>
            {performanceDisp.map((p) => <MenuItem key={p._id} value={p._id}>{p.nombre}</MenuItem>)}
          </Select>
        </FormControl>
        <Typography variant="caption" color="text.secondary">
          El equipo no se cambia aquí — si es el equipo equivocado, quita la asignación y crea otra.
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" disabled={saving} onClick={guardar} sx={{ borderRadius: 2 }}>Guardar</Button>
      </DialogActions>
    </Dialog>
  );
}

// Emitir el certificado de UNA asignación desde su tarjeta, sin ir a la
// pantalla de Certificados. Razón/tipo/temp/humedad ya vienen de la
// calibración (los hereda certificado.service.js), aquí solo vigencia y firmas.
function EmitirCertificadoDialog({ open, asignacion, onClose, onDone }) {
  const { user } = useAuth();
  const [usuarios, setUsuarios] = useState([]);
  const [vigencia, setVigencia] = useState("");
  const [revisadoPor, setRevisadoPor] = useState("");
  const [autorizadoPor, setAutorizadoPor] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError(""); setRevisadoPor(user?.id || ""); setAutorizadoPor("");
    obtenerDirectorio().then(setUsuarios).catch(() => setUsuarios([]));
    const base = asignacion?.fechaCalibracion ? new Date(asignacion.fechaCalibracion) : new Date();
    base.setFullYear(base.getFullYear() + 1);
    setVigencia(base.toISOString().slice(0, 10));
  }, [open, asignacion, user?.id]);

  const emitir = async () => {
    setSaving(true); setError("");
    try {
      await emitirCertificado({
        asignacion: asignacion._id,
        vigencia: vigencia || undefined,
        revisadoPor: revisadoPor || undefined,
        autorizadoPor: autorizadoPor || undefined,
      });
      onDone();
    } catch (e) {
      setError(e?.response?.data?.message || "No se pudo emitir el certificado.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>
        Emitir certificado{asignacion ? ` — ${asignacion.equipo?.idInterno}` : ""}
      </DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
        {error && <Alert severity="error" sx={{ borderRadius: 2 }}>{error}</Alert>}
        <Typography variant="caption" color="text.secondary">
          Equipo, cliente, patrones y datos del servicio se copian tal cual de la calibración.
        </Typography>
        <TextField
          type="date" size="small" label="Vigencia"
          helperText="Sugerida a 1 año de la calibración"
          value={vigencia} onChange={(e) => setVigencia(e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <FormControl size="small" fullWidth>
          <InputLabel>Revisó (aprobación técnica)</InputLabel>
          <Select label="Revisó (aprobación técnica)" value={revisadoPor} onChange={(e) => setRevisadoPor(e.target.value)}>
            <MenuItem value="">— Sin especificar —</MenuItem>
            {usuarios.map((u) => <MenuItem key={u._id} value={u._id}>{u.nombre}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small" fullWidth>
          <InputLabel>Autorizó (calidad)</InputLabel>
          <Select label="Autorizó (calidad)" value={autorizadoPor} onChange={(e) => setAutorizadoPor(e.target.value)}>
            <MenuItem value="">— Sin especificar —</MenuItem>
            {usuarios.map((u) => <MenuItem key={u._id} value={u._id}>{u.nombre}</MenuItem>)}
          </Select>
        </FormControl>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" disabled={saving} onClick={emitir} sx={{ borderRadius: 2 }}>Emitir</Button>
      </DialogActions>
    </Dialog>
  );
}

function AsignarForm({ clienteId, reporteId, equiposYaAsignados = [], onDone }) {
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
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, mb: 2.5 }}>
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
            {equipos.filter((eq) => !equiposYaAsignados.includes(eq._id)).map((eq) => (
              <MenuItem key={eq._id} value={eq._id}>{eq.idInterno} — {eq.marca} {eq.modelo}</MenuItem>
            ))}
            {equipos.length > 0 && equipos.every((eq) => equiposYaAsignados.includes(eq._id)) && (
              <MenuItem value="" disabled>Todos los equipos de este cliente ya están asignados aquí</MenuItem>
            )}
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
          <InputLabel>Tolerancia</InputLabel>
          <Select label="Tolerancia" value={performance} onChange={(e) => setPerformance(e.target.value)}>
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
