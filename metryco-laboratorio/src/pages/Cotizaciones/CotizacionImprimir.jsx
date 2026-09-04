import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Box, CircularProgress, Typography } from "@mui/material";
import { obtenerCotizacionParaImprimir } from "../../services/cotizaciones";
import { formatDate } from "../../shared/utils/formatDate";
import { formatCurrency } from "../../shared/utils/currency";
import { direccionCliente } from "../Reportes/imprimir/shared";
import PrintLayout from "../Reportes/imprimir/PrintLayout";

function Centro({ children }) {
  return <Box sx={{ minHeight: "100dvh", display: "grid", placeItems: "center", bgcolor: "#fff" }}>{children}</Box>;
}

const TERMINOS = [
  "Esta cotización tiene vigencia de 90 días. El equipo o servicio se entregará de 2 a 3 días después de recibida la orden de compra, salvo que se indique lo contrario.",
  "El costo del servicio es aplicable aun cuando el equipo no pase la calibración o no responda al proceso de ajuste; en cuyo caso, un reporte con información detallada de la falla presentada por su equipo le será entregado.",
  "El servicio de calibración descrito se ofrece usando los métodos y procedimientos internos del laboratorio, si existen requisitos específicos del cliente, se iniciará nuevamente el proceso de cotización.",
  "En el caso del almacenamiento de equipo, el cliente podrá disponer del mismo tiempo de resguardar los equipos.",
  "En ventas se especificará en la cotización la vigencia de la misma, y su tiempo de entrega.",
  "No hay garantía de que el equipo mantendrá las tolerancias especificadas a lo largo del intervalo de calibración; esto depende de su deriva, medio ambiente, manejo y otras situaciones fuera de nuestro control.",
];

export default function CotizacionImprimir() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [estado, setEstado] = useState("cargando");

  useEffect(() => {
    obtenerCotizacionParaImprimir(id)
      .then((d) => { setData(d); setEstado("ok"); })
      .catch(() => setEstado("error"));
  }, [id]);

  if (estado === "cargando") return <Centro><CircularProgress /></Centro>;
  if (estado === "error" || !data) return <Centro><Typography>No se pudo cargar la cotización.</Typography></Centro>;

  const { cotizacion, laboratorio, logo } = data;
  const cliente = cotizacion.cliente || {};

  return (
    <PrintLayout laboratorio={laboratorio} logo={logo} titulo="COTIZACIÓN" subtitulo="QUOTE" folio={`Cot# ${cotizacion.folio}`}>
      {laboratorio?.acreditacion && (
        <Typography sx={{ textAlign: "center", fontSize: 11, fontWeight: 700, color: "#0F172A", mb: 1.5 }}>
          Laboratorio Acreditado ante ISO17025:2017
        </Typography>
      )}
      <Typography sx={{ fontSize: 11, mb: 1.5, textAlign: "justify" }}>
        Por medio de la presente le enviamos un cordial saludo y al mismo tiempo nos permitimos presentar a su amable
        consideración la cotización de los equipos y/o servicios que se describen a continuación:
      </Typography>

      <div className="rep-band">INFORMACIÓN DEL CLIENTE</div>
      <Box sx={{ display: "grid", gridTemplateColumns: "110px 1fr 110px 1fr", rowGap: 0.5, fontSize: 12, mb: 1 }}>
        <b>Cliente:</b><span>{cliente.nombre || "—"}</span>
        <b>Requisitor:</b><span>{cotizacion.contacto?.nombre || cliente.contacto?.nombre || "—"}</span>
        <b>Domicilio:</b><span>{direccionCliente(cliente) || "—"}</span>
        <b>Teléfono:</b><span>{cotizacion.contacto?.telefono || cliente.contacto?.telefono || "—"}</span>
        <b>Fecha:</b><span>{formatDate(cotizacion.fecha)}</span>
        <b>RFC:</b><span>{cliente.rfc || "—"}</span>
        <b>Vigencia:</b><span>{formatDate(cotizacion.vigencia)}</span>
        <b>Vendedor:</b><span>{cotizacion.creadoPor?.nombre || "—"}</span>
      </Box>

      <div className="rep-band">INFORMACIÓN DE LA COTIZACIÓN</div>
      <table className="rep-table">
        <thead>
          <tr>
            <th style={{ width: 55 }}>Cant.</th>
            <th style={{ textAlign: "left" }}>Descripción</th>
            <th style={{ width: 100 }}>P. Unitario</th>
            <th style={{ width: 100 }}>P. Total</th>
          </tr>
        </thead>
        <tbody>
          {cotizacion.items.map((it, i) => (
            <tr key={i}>
              <td>{it.cantidad}</td>
              <td style={{ textAlign: "left" }}>{it.descripcion}</td>
              <td>{formatCurrency(it.precioUnitario)}</td>
              <td>{formatCurrency(it.cantidad * it.precioUnitario)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 1.5 }}>
        <Box sx={{ width: 220, fontSize: 12 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between" }}><span>SUB-TOTAL:</span><b>{formatCurrency(cotizacion.subtotal)}</b></Box>
          <Box sx={{ display: "flex", justifyContent: "space-between" }}><span>IVA:</span><b>{formatCurrency(cotizacion.iva)}</b></Box>
          <Box sx={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid #111", pt: 0.3, mt: 0.3 }}>
            <span>TOTAL:</span><b>{formatCurrency(cotizacion.total)} MXN</b>
          </Box>
        </Box>
      </Box>

      {cotizacion.observaciones && (
        <Typography sx={{ fontSize: 11, fontWeight: 700, mb: 1.5 }}>{cotizacion.observaciones}</Typography>
      )}

      <Typography sx={{ fontSize: 10.5, textAlign: "center", mt: 2, mb: 1 }}>
        Sin otro particular por el momento y en espera de servirle como merece, quedo a sus órdenes.
        {laboratorio?.telefono && <><br />Teléfonos: {laboratorio.telefono}</>}
      </Typography>

      <div className="rep-band">TÉRMINOS Y CONDICIONES</div>
      {TERMINOS.map((t, i) => (
        <Typography key={i} sx={{ fontSize: 9.5, mb: 0.3 }}>{i + 1}.- {t}</Typography>
      ))}

      <Typography sx={{ fontSize: 9, color: "#888", textAlign: "center", mt: 3, borderTop: "1px solid #E4E9F2", pt: 1 }}>
        Prohibida su reproducción parcial o total sin autorización de {laboratorio?.nombre || "el laboratorio"}.
      </Typography>
    </PrintLayout>
  );
}
