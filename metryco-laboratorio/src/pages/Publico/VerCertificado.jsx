import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Box, Typography, Paper, Divider, Chip, Button, CircularProgress,
  Table, TableHead, TableBody, TableRow, TableCell,
} from "@mui/material";
import VerifiedOutlinedIcon from "@mui/icons-material/VerifiedOutlined";
import ReportGmailerrorredOutlinedIcon from "@mui/icons-material/ReportGmailerrorredOutlined";
import ScheduleOutlinedIcon from "@mui/icons-material/ScheduleOutlined";
import BlockOutlinedIcon from "@mui/icons-material/BlockOutlined";
import PictureAsPdfOutlinedIcon from "@mui/icons-material/PictureAsPdfOutlined";
import { verificarPublico, publicoPdfUrl } from "../../services/certificados";
import { formatDate } from "../../shared/utils/formatDate";

const ESTADO_UI = {
  vigente:   { label: "Certificado válido",    color: "#16A34A", bg: "#16A34A18", Icon: VerifiedOutlinedIcon },
  por_vencer:{ label: "Próximo a vencer",       color: "#D97706", bg: "#D9770618", Icon: ScheduleOutlinedIcon },
  vencido:   { label: "Vigencia terminada",     color: "#DC2626", bg: "#DC262618", Icon: ReportGmailerrorredOutlinedIcon },
  anulado:   { label: "Certificado anulado",    color: "#DC2626", bg: "#DC262618", Icon: BlockOutlinedIcon },
  borrador:  { label: "Certificado en proceso", color: "#64748B", bg: "#64748B18", Icon: ScheduleOutlinedIcon },
};

function Mark({ size = 34 }) {
  return (
    <Box component="svg" viewBox="0 0 48 48" sx={{ width: size, height: size, color: "#60A5FA" }}>
      <circle cx="24" cy="24" r="21" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.5" />
      <circle cx="24" cy="24" r="12" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.6" />
      <line x1="24" y1="24" x2="34" y2="14" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="24" cy="24" r="3.2" fill="currentColor" />
    </Box>
  );
}

function Campo({ label, children }) {
  if (children == null || children === "" || (Array.isArray(children) && !children.length)) return null;
  return (
    <Box>
      <Typography component="div" variant="caption" sx={{ color: "text.secondary", textTransform: "uppercase", letterSpacing: 0.6, fontSize: 10.5 }}>
        {label}
      </Typography>
      <Typography component="div" variant="body2" sx={{ fontWeight: 600, mt: 0.25 }}>
        {children}
      </Typography>
    </Box>
  );
}

export default function VerCertificado() {
  const { token } = useParams();
  const [estado, setEstado] = useState("cargando"); // cargando | ok | noEncontrado | error
  const [cert, setCert] = useState(null);

  useEffect(() => {
    let vivo = true;
    verificarPublico(token)
      .then((d) => vivo && (setCert(d), setEstado("ok")))
      .catch((err) => {
        if (!vivo) return;
        setEstado(err?.response?.status === 404 ? "noEncontrado" : "error");
      });
    return () => { vivo = false; };
  }, [token]);

  return (
    <Box
      sx={{
        minHeight: "100dvh",
        bgcolor: "background.default",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        px: 2,
        py: { xs: 4, sm: 7 },
      }}
    >
      {/* Encabezado marca */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, mb: 3 }}>
        <Mark />
        <Box>
          <Typography sx={{ fontWeight: 800, letterSpacing: 2, fontSize: 15, lineHeight: 1 }}>
            METROLOGÍA
          </Typography>
          <Typography sx={{ fontSize: 10.5, letterSpacing: 3, color: "text.secondary" }}>
            VERIFICACIÓN DE CERTIFICADO
          </Typography>
        </Box>
      </Box>

      <Paper
        elevation={0}
        sx={{ width: "100%", maxWidth: 560, borderRadius: 2, border: 1, borderColor: "divider", overflow: "hidden" }}
      >
        {estado === "cargando" && (
          <Box sx={{ py: 8, display: "flex", justifyContent: "center" }}>
            <CircularProgress />
          </Box>
        )}

        {estado === "noEncontrado" && (
          <Box sx={{ p: 5, textAlign: "center" }}>
            <ReportGmailerrorredOutlinedIcon sx={{ fontSize: 44, color: "text.disabled" }} />
            <Typography variant="h6" fontWeight={700} sx={{ mt: 1 }}>
              Certificado no encontrado
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              El código escaneado no corresponde a ningún certificado emitido por el laboratorio.
            </Typography>
          </Box>
        )}

        {estado === "error" && (
          <Box sx={{ p: 5, textAlign: "center" }}>
            <Typography variant="h6" fontWeight={700}>No se pudo verificar</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Inténtalo de nuevo en unos momentos.
            </Typography>
          </Box>
        )}

        {estado === "ok" && cert && <Contenido cert={cert} token={token} />}
      </Paper>

      <Typography variant="caption" color="text.secondary" sx={{ mt: 3, textAlign: "center", maxWidth: 460 }}>
        Verificación en línea. Esta página muestra únicamente información pública del certificado.
        {cert?.consultadoEn ? ` Consulta: ${new Date(cert.consultadoEn).toLocaleString("es-MX")}` : ""}
      </Typography>
    </Box>
  );
}

function Contenido({ cert, token }) {
  const ui = ESTADO_UI[cert.estado] || ESTADO_UI.borrador;
  const eq = cert.equipo || {};

  return (
    <>
      <Box sx={{ px: 4, pt: 4, pb: 3, bgcolor: ui.bg, display: "flex", alignItems: "center", gap: 1.75 }}>
        <ui.Icon sx={{ fontSize: 38, color: ui.color }} />
        <Box>
          <Typography sx={{ fontWeight: 800, color: ui.color, lineHeight: 1.2 }}>{ui.label}</Typography>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            Folio <b>{cert.folio}</b>
          </Typography>
        </Box>
      </Box>

      {cert.anulado?.motivo && (
        <Box sx={{ px: 4, py: 1.5, bgcolor: "#DC26260D" }}>
          <Typography variant="body2" color="error.main">
            Motivo de anulación: {cert.anulado.motivo}
          </Typography>
        </Box>
      )}

      <Box sx={{ p: 4, display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2.5 }}>
        <Campo label="Identificación del equipo">{eq.identificacion}</Campo>
        <Campo label="Descripción">{eq.descripcion}</Campo>
        <Campo label="Marca / Modelo">{[eq.marca, eq.modelo].filter(Boolean).join(" / ")}</Campo>
        <Campo label="Serie">{eq.serie}</Campo>
        <Campo label="Magnitud">{eq.magnitud}</Campo>
        <Campo label="Cliente">{cert.cliente}</Campo>
        <Campo label="Fecha de calibración">{formatDate(cert.fechaCalibracion)}</Campo>
        <Campo label="Fecha de emisión">{formatDate(cert.fechaEmision)}</Campo>
        {cert.vigencia && <Campo label="Vigencia recomendada">{formatDate(cert.vigencia)}</Campo>}
        <Campo label="Trazabilidad">
          {cert.trazabilidad?.length
            ? cert.trazabilidad.map((t) => <Chip key={t} label={t} size="small" sx={{ mr: 0.5 }} />)
            : null}
        </Campo>
      </Box>

      {cert.puntos?.length > 0 ? (
        <>
          <Divider />
          <Box sx={{ p: 4 }}>
            <Typography variant="caption" sx={{ color: "text.secondary", textTransform: "uppercase", letterSpacing: 0.6 }}>
              Resultados por punto de calibración
            </Typography>
            <Box sx={{ overflowX: "auto", mt: 1 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Punto</TableCell>
                    <TableCell>Valor medido</TableCell>
                    <TableCell>U (k = {cert.puntos[0]?.k})</TableCell>
                    <TableCell>Confianza</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {cert.puntos.map((p, i) => (
                    <TableRow key={i}>
                      <TableCell>{p.puntoNominal} {p.unidad}</TableCell>
                      <TableCell><b>{p.valorMedido}</b> {p.unidad}</TableCell>
                      <TableCell>± {p.incertidumbreExpandida} {p.unidad}</TableCell>
                      <TableCell>{p.nivelConfianza}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          </Box>
        </>
      ) : cert.resultado?.incertidumbreExpandida != null ? (
        <>
          <Divider />
          <Box sx={{ p: 4 }}>
            <Typography variant="caption" sx={{ color: "text.secondary", textTransform: "uppercase", letterSpacing: 0.6 }}>
              Resultado
            </Typography>
            <Typography sx={{ fontWeight: 800, fontSize: 22, mt: 0.5 }}>
              {cert.resultado.valorMedido} ± {cert.resultado.incertidumbreExpandida} {cert.resultado.unidad}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              k = {cert.resultado.k} · nivel de confianza {cert.resultado.nivelConfianza}
            </Typography>
          </Box>
        </>
      ) : null}

      <Divider />
      <Box sx={{ p: 3, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 1.5 }}>
        <Box>
          <Typography variant="body2" fontWeight={700}>{cert.laboratorio?.nombre}</Typography>
          {cert.laboratorio?.acreditacion && (
            <Typography variant="caption" color="text.secondary">
              Acreditación {cert.laboratorio.acreditacion}
            </Typography>
          )}
        </Box>
        {cert.tienePdf && (
          <Button
            component="a"
            href={publicoPdfUrl(token)}
            target="_blank"
            rel="noopener"
            variant="outlined"
            startIcon={<PictureAsPdfOutlinedIcon />}
            sx={{ borderRadius: 2 }}
          >
            Ver PDF
          </Button>
        )}
      </Box>
    </>
  );
}
