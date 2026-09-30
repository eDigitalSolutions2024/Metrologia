import { Fragment, useEffect, useMemo, useState } from "react";
import {
  Box, Typography, Switch, Alert, Tooltip, Tabs, Tab,
  Table, TableHead, TableBody, TableRow, TableCell, TableContainer, Paper,
} from "@mui/material";
import RuleOutlinedIcon from "@mui/icons-material/RuleOutlined";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";

import AppButton from "../../shared/components/AppButton";
import PageHeader from "../../shared/components/PageHeader";
import { itemsPersonalizables, ROLES, ROL_LABELS } from "../../components/Sidebar/menuConfig";
import { obtenerMenuPermisos, actualizarMenuPermisos } from "../../services/configuracion";

// Mismos colores que ya usa el directorio general (pages/General/General.jsx)
// para estos roles — se reusan aquí para que un rol "se vea igual" en toda la app.
const ROL_COLOR = { admin: "error", tecnico: "primary", ventas: "success", coordinador: "info" };

const FILAS_BASE = itemsPersonalizables();

function construirEstadoInicial(overrides) {
  const estado = {};
  for (const fila of FILAS_BASE) {
    estado[fila.key] = overrides[fila.key] || fila.rolesPorDefecto;
  }
  return estado;
}

// Agrupa la lista plana en {sección: [{...item, hijos: [...]}]} — cada ítem
// de primer nivel arrastra a sus hijos inmediatos siguientes en el arreglo.
function construirArbol() {
  const porSeccion = {};
  let actual = null;
  for (const fila of FILAS_BASE) {
    porSeccion[fila.seccion] = porSeccion[fila.seccion] || [];
    if (!fila.grupo) {
      actual = { ...fila, hijos: [] };
      porSeccion[fila.seccion].push(actual);
    } else {
      actual.hijos.push(fila);
    }
  }
  return porSeccion;
}
const ARBOL = construirArbol();
const SECCIONES = Object.keys(ARBOL);

function Leyenda() {
  return (
    <Box sx={{ display: "flex", gap: 2.5, flexWrap: "wrap", mb: 2.5 }}>
      {ROLES.map((rol) => (
        <Box key={rol} sx={{ display: "flex", alignItems: "center", gap: 0.75, px: 1.25, py: 0.5, borderRadius: "8px", bgcolor: "background.paper", border: 1, borderColor: "divider" }}>
          <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: `${ROL_COLOR[rol]}.main` }} />
          <Typography variant="caption" color="text.secondary" fontWeight={700}>{ROL_LABELS[rol]}</Typography>
        </Box>
      ))}
    </Box>
  );
}

export default function RolesMenuPage() {
  const [permisos, setPermisos] = useState(() => construirEstadoInicial({}));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [guardado, setGuardado] = useState(false);
  const [tab, setTab] = useState(0);

  useEffect(() => {
    obtenerMenuPermisos()
      .then((overrides) => setPermisos(construirEstadoInicial(overrides)))
      .catch(() => setError("No se pudieron cargar los permisos guardados — se muestran los valores por defecto."))
      .finally(() => setLoading(false));
  }, []);

  const nodosVisibles = useMemo(() => ARBOL[SECCIONES[tab]] || [], [tab]);

  const toggle = (key, rol) => {
    setGuardado(false);
    setPermisos((prev) => {
      const actuales = prev[key] || [];
      const nuevos = actuales.includes(rol) ? actuales.filter((r) => r !== rol) : [...actuales, rol];
      return { ...prev, [key]: nuevos };
    });
  };

  const guardar = async () => {
    setSaving(true); setError(""); setGuardado(false);
    try {
      await actualizarMenuPermisos(permisos);
      setGuardado(true);
    } catch {
      setError("No se pudieron guardar los cambios.");
    } finally {
      setSaving(false);
    }
  };

  const restaurar = () => {
    setPermisos(construirEstadoInicial({}));
    setGuardado(false);
  };

  return (
    <Box>
      <PageHeader
        icon={<RuleOutlinedIcon />}
        title="Roles del Menú"
        subtitle="Qué ve cada rol en el menú lateral — los cambios aplican de inmediato a todos los usuarios"
        actions={
          <>
            <AppButton variant="outlined" startIcon={<RestartAltIcon />} onClick={restaurar} sx={{ borderRadius: "10px" }}>
              Restaurar valores por defecto
            </AppButton>
            <AppButton loading={saving} onClick={guardar} sx={{ borderRadius: "10px" }}>
              Guardar cambios
            </AppButton>
          </>
        }
      />

      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: "10px" }}>{error}</Alert>}
      {guardado && <Alert severity="success" sx={{ mb: 2, borderRadius: "10px" }} onClose={() => setGuardado(false)}>Permisos guardados.</Alert>}

      <Alert icon={<InfoOutlinedIcon fontSize="small" />} severity="info" sx={{ mb: 2.5, borderRadius: "10px" }}>
        "Administración" no aparece aquí — siempre es exclusivo de Admin, para que nunca se pueda
        quedar sin acceso a esta misma pantalla.
      </Alert>

      <Leyenda />

      <Box sx={{ borderBottom: 2, borderColor: "divider", mb: 0 }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          slotProps={{ indicator: { sx: { height: 3, borderRadius: "3px 3px 0 0" } } }}
          sx={{ minHeight: 44, "& .MuiTab-root": { minHeight: 44, fontSize: 13.5 } }}
        >
          {SECCIONES.map((s) => <Tab key={s} label={s} />)}
        </Tabs>
      </Box>

      <TableContainer
        component={Paper}
        elevation={0}
        sx={{
          borderRadius: "0 0 12px 12px", border: 1, borderTop: 0, borderColor: "divider",
          boxShadow: "0 12px 28px -14px rgba(15,23,42,.18)",
        }}
      >
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell
                sx={{
                  fontWeight: 800, fontSize: 11, letterSpacing: ".06em", textTransform: "uppercase", color: "secondary.main",
                  background: (t) => `linear-gradient(180deg, ${t.palette.secondary.main}0F, transparent)`,
                }}
              >
                Elemento del menú
              </TableCell>
              {ROLES.map((rol) => (
                <TableCell
                  key={rol} align="center"
                  sx={{
                    fontWeight: 800, fontSize: 11, letterSpacing: ".06em", textTransform: "uppercase", color: "secondary.main", minWidth: 96,
                    background: (t) => `linear-gradient(180deg, ${t.palette.secondary.main}0F, transparent)`,
                  }}
                >
                  {ROL_LABELS[rol]}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {!loading && nodosVisibles.map((nodo) => (
              <Fragment key={nodo.key}>
                <TableRow hover>
                  <TableCell sx={{ py: 1.4 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
                      {nodo.icon && (
                        <Box sx={{ width: 26, height: 26, borderRadius: "8px", display: "grid", placeItems: "center", bgcolor: "secondary.main", color: "#fff", flexShrink: 0 }}>
                          <nodo.icon sx={{ fontSize: 15 }} />
                        </Box>
                      )}
                      <Typography variant="body2" fontWeight={700}>{nodo.titulo}</Typography>
                    </Box>
                  </TableCell>
                  {ROLES.map((rol) => (
                    <TableCell key={rol} align="center" sx={{ py: 1.4 }}>
                      <Tooltip title={ROL_LABELS[rol]}>
                        <Switch size="small" color={ROL_COLOR[rol]}
                          checked={(permisos[nodo.key] || []).includes(rol)}
                          onChange={() => toggle(nodo.key, rol)} />
                      </Tooltip>
                    </TableCell>
                  ))}
                </TableRow>
                {nodo.hijos.map((hijo) => (
                  <TableRow key={hijo.key} hover>
                    <TableCell sx={{ py: 1.15, pl: 6 }}>
                      <Typography variant="body2" color="text.secondary">{hijo.titulo}</Typography>
                    </TableCell>
                    {ROLES.map((rol) => (
                      <TableCell key={rol} align="center" sx={{ py: 1.15 }}>
                        <Tooltip title={ROL_LABELS[rol]}>
                          <Switch size="small" color={ROL_COLOR[rol]}
                            checked={(permisos[hijo.key] || []).includes(rol)}
                            onChange={() => toggle(hijo.key, rol)} />
                        </Tooltip>
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </Fragment>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
