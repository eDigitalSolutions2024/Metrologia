import { useEffect, useState } from "react";
import { Alert, Link as MuiLink } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../core/auth/useAuth";
import { listarFacturas } from "../../services/cobranza";
import { formatCurrency } from "../utils/currency";

const ROLES_CON_COBRANZA = ["admin", "coordinador", "ventas"];

/**
 * Aviso amarillo cuando el cliente tiene cuentas por cobrar atrasadas. Se
 * muestra solo a quien maneja cobranza (el técnico no ve montos de deuda) y
 * no dice nada si el cliente está al corriente.
 */
export default function AvisoDeuda({ clienteId, sx }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [atrasadas, setAtrasadas] = useState(null);
  const autorizado = ROLES_CON_COBRANZA.includes(user?.rol);

  useEffect(() => {
    if (!clienteId || !autorizado) return undefined;
    let vigente = true;
    listarFacturas({ clienteId })
      .then((facturas) => {
        if (!vigente) return;
        const ahora = new Date();
        setAtrasadas(facturas.filter((f) => f.statusPago === 0 && new Date(f.fechaPago) < ahora));
      })
      .catch(() => { if (vigente) setAtrasadas(null); });
    return () => { vigente = false; };
  }, [clienteId, autorizado]);

  if (!autorizado || !clienteId || !atrasadas || atrasadas.length === 0) return null;
  const total = atrasadas.reduce((s, f) => s + (f.saldo ?? f.monto), 0);

  return (
    <Alert severity="warning" sx={{ borderRadius: 2, ...sx }}>
      Este cliente tiene <b>{atrasadas.length} {atrasadas.length === 1 ? "factura atrasada" : "facturas atrasadas"}</b> por{" "}
      <b>{formatCurrency(total)}</b>.{" "}
      <MuiLink component="button" type="button" variant="body2" onClick={() => navigate("/cobranza")}>Ver en Cobranza</MuiLink>
    </Alert>
  );
}
