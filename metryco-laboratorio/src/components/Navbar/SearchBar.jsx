import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  TextField, InputAdornment, Paper, Box, Typography,
  List, ListItemButton, ListItemText, Chip, CircularProgress, ClickAwayListener,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { listarClientes } from "../../services/clientes";
import { listarCotizaciones } from "../../services/cotizaciones";
import { listarUsuarios } from "../../services/usuarios";
import { useDebounce } from "../../shared/hooks/useDebounce";

import { MOCK as REPORTES_MOCK } from "../../pages/Reportes/mockData";
import { MOCK as CALIDAD_MOCK } from "../../pages/Calidad/mockData";
import { EQUIPOS_MOCK } from "../../pages/Equipos/mockData";
import { MOCK as COBRANZA_MOCK } from "../../pages/Cobranza/mockData";

function coincide(texto, query) {
  return (texto || "").toString().toLowerCase().includes(query.toLowerCase());
}

export default function SearchBar() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [clientes, setClientes] = useState([]);
  const [cotizaciones, setCotizaciones] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const containerRef = useRef(null);

  const debouncedQuery = useDebounce(query, 350);
  const inputRef = useRef(null);

  // Atajo ⌘K / Ctrl+K para enfocar la búsqueda global.
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!debouncedQuery.trim()) return;

    let cancelado = false;

    (async () => {
      setLoading(true);
      const [resClientes, resCotizaciones, resUsuarios] = await Promise.allSettled([
        listarClientes({ search: debouncedQuery, pageSize: 5 }),
        listarCotizaciones({ search: debouncedQuery, pageSize: 5 }),
        listarUsuarios({ search: debouncedQuery, pageSize: 5 }),
      ]);
      if (cancelado) return;
      setClientes(resClientes.status === "fulfilled" ? resClientes.value.items : []);
      setCotizaciones(resCotizaciones.status === "fulfilled" ? resCotizaciones.value.items : []);
      setUsuarios(resUsuarios.status === "fulfilled" ? resUsuarios.value.items : []);
      setLoading(false);
    })();

    return () => {
      cancelado = true;
    };
  }, [debouncedQuery]);

  const reportes = useMemo(() => {
    if (!debouncedQuery.trim()) return [];
    return REPORTES_MOCK.filter(
      (r) => coincide(r.folio, debouncedQuery) || coincide(r.cliente, debouncedQuery) || coincide(r.tecnico, debouncedQuery)
    ).slice(0, 5);
  }, [debouncedQuery]);

  const calidad = useMemo(() => {
    if (!debouncedQuery.trim()) return [];
    return CALIDAD_MOCK.filter(
      (d) => coincide(d.codigo, debouncedQuery) || coincide(d.titulo, debouncedQuery) || coincide(d.responsable, debouncedQuery)
    ).slice(0, 5);
  }, [debouncedQuery]);

  const equipos = useMemo(() => {
    if (!debouncedQuery.trim()) return [];
    return EQUIPOS_MOCK.filter(
      (e) => coincide(e.idInterno, debouncedQuery) || coincide(e.descripcion, debouncedQuery) || coincide(e.marca, debouncedQuery)
    ).slice(0, 5);
  }, [debouncedQuery]);

  const cobranza = useMemo(() => {
    if (!debouncedQuery.trim()) return [];
    return COBRANZA_MOCK.filter(
      (f) => coincide(f.folio, debouncedQuery) || coincide(f.clienteNombre, debouncedQuery) || coincide(f.oc, debouncedQuery)
    ).slice(0, 5);
  }, [debouncedQuery]);

  const cerrar = () => setOpen(false);

  const ir = (ruta) => {
    cerrar();
    setQuery("");
    navigate(ruta);
  };

  const grupos = [
    { label: "Clientes", real: true, items: clientes, render: (c) => ({ key: c._id, primary: c.nombre, secondary: c.rfc, onClick: () => ir(`/clientes/${c._id}/editar`) }) },
    { label: "Cotizaciones", real: true, items: cotizaciones, render: (c) => ({ key: c._id, primary: c.folio, secondary: c.clienteInfo?.nombre, extra: c.status, onClick: () => ir(`/cotizaciones?editar=${c._id}`) }) },
    { label: "Usuarios", real: true, items: usuarios, render: (u) => ({ key: u._id, primary: u.nombre, secondary: `@${u.usuario}`, extra: u.rol, onClick: () => ir("/usuarios") }) },
    { label: "Equipos", real: false, items: equipos, render: (e) => ({ key: e.id, primary: e.descripcion, secondary: e.idInterno, extra: e.clienteNombre, onClick: () => ir(`/equipos/${e.id}/editar`) }) },
    { label: "Reportes", real: false, items: reportes, render: (r) => ({ key: r.id, primary: r.folio, secondary: r.cliente, extra: r.status, onClick: () => ir("/reportes") }) },
    { label: "Calidad", real: false, items: calidad, render: (d) => ({ key: d.id, primary: d.titulo, secondary: d.codigo, onClick: () => ir("/calidad") }) },
    { label: "Cobranza", real: false, items: cobranza, render: (f) => ({ key: f.id, primary: f.folio, secondary: f.clienteNombre, extra: f.statusPago === 1 ? "Pagado" : "Pendiente", onClick: () => ir("/cobranza") }) },
  ];

  const hayResultados = grupos.some((g) => g.items.length > 0);
  const mostrarPanel = open && debouncedQuery.trim().length > 0;

  return (
    <ClickAwayListener onClickAway={cerrar}>
      <Box ref={containerRef} sx={{ position: "relative", width: { xs: 200, sm: 320, md: 380 } }}>
        <TextField
          size="small"
          inputRef={inputRef}
          placeholder="Buscar en todo el sistema…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          fullWidth
          sx={{
            "& .MuiOutlinedInput-root": {
              borderRadius: 999,
              bgcolor: "background.default",
              transition: "box-shadow .15s, background-color .15s",
              "&.Mui-focused": { bgcolor: "background.paper" },
            },
          }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" sx={{ color: "text.secondary" }} />
                </InputAdornment>
              ),
              endAdornment: loading ? (
                <InputAdornment position="end">
                  <CircularProgress size={16} />
                </InputAdornment>
              ) : !query ? (
                <InputAdornment position="end">
                  <Box
                    component="kbd"
                    sx={{
                      fontFamily: "inherit", fontSize: 11, fontWeight: 600,
                      color: "text.secondary", border: 1, borderColor: "divider",
                      borderRadius: 1, px: 0.75, py: 0.15, lineHeight: 1.4,
                      bgcolor: "background.paper",
                    }}
                  >
                    ⌘K
                  </Box>
                </InputAdornment>
              ) : null,
            },
          }}
        />

        {mostrarPanel && (
          <Paper
            elevation={0}
            sx={{
              position: "absolute",
              top: "calc(100% + 8px)",
              left: 0,
              right: 0,
              zIndex: 1300,
              borderRadius: 3,
              border: 1,
              borderColor: "divider",
              boxShadow: "0 24px 60px -12px rgba(15,23,42,.22)",
              maxHeight: 460,
              overflowY: "auto",
            }}
          >
            {!loading && !hayResultados && (
              <Box sx={{ p: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Sin resultados para "{debouncedQuery}"
                </Typography>
              </Box>
            )}

            {grupos.map((grupo) =>
              grupo.items.length === 0 ? null : (
                <Box key={grupo.label}>
                  <Box sx={{ px: 2, pt: 1.5, display: "flex", alignItems: "center", gap: 1 }}>
                    <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700 }}>
                      {grupo.label}
                    </Typography>
                    {!grupo.real && (
                      <Chip label="datos de prueba" size="small" variant="outlined" sx={{ height: 16, fontSize: 10 }} />
                    )}
                  </Box>
                  <List dense>
                    {grupo.items.map((item) => {
                      const r = grupo.render(item);
                      return (
                        <ListItemButton key={r.key} onClick={r.onClick}>
                          <ListItemText primary={r.primary} secondary={r.secondary} />
                          {r.extra && <Chip label={r.extra} size="small" variant="outlined" />}
                        </ListItemButton>
                      );
                    })}
                  </List>
                </Box>
              )
            )}
          </Paper>
        )}
      </Box>
    </ClickAwayListener>
  );
}
