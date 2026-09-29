import { useCallback, useEffect, useRef, useState } from "react";
import {
  Box, Typography, TextField, InputAdornment, Chip, Avatar, Alert,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import ContactsOutlinedIcon from "@mui/icons-material/ContactsOutlined";

import AppTable from "../../shared/components/AppTable";
import PageHeader from "../../shared/components/PageHeader";
import { obtenerDirectorio } from "../../services/usuarios";
import { useDebounce } from "../../shared/hooks/useDebounce";
import { usePolling } from "../../shared/hooks/usePolling";

const ROL_MAP = {
  admin: { label: "Administrador", color: "error" },
  tecnico: { label: "Técnico", color: "primary" },
  ventas: { label: "Ventas", color: "success" },
  coordinador: { label: "Coordinador", color: "info" },
};

const SUCURSAL_LABELS = {
  juarez: "Juárez",
  chihuahua: "Chihuahua",
  admin: "Admin",
};

export default function General() {
  const [directorio, setDirectorio] = useState([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const debouncedSearch = useDebounce(search, 300);

  // Protege contra condiciones de carrera entre llamadas que se traslapen
  // (ver misma nota en CotizacionesPage.jsx) — aquí es poco probable porque
  // `cargar` no depende de filtros, pero el refresco de fondo (usePolling)
  // sí puede traslaparse con una recarga manual lenta.
  const cargaIdRef = useRef(0);
  const cargar = useCallback(async (silencioso = false) => {
    const miId = ++cargaIdRef.current;
    if (!silencioso) { setLoading(true); setError(""); }
    try {
      const data = await obtenerDirectorio();
      if (cargaIdRef.current !== miId) return;
      setDirectorio(data);
    } catch {
      if (cargaIdRef.current === miId && !silencioso) setError("No se pudo cargar el directorio general.");
    } finally {
      if (cargaIdRef.current === miId && !silencioso) setLoading(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);
  usePolling(() => cargar(true));

  const filtrado = directorio.filter((u) => {
    const q = debouncedSearch.toLowerCase();
    if (!q) return true;
    return (
      u.nombre?.toLowerCase().includes(q) ||
      u.usuario?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q)
    );
  });

  const rows = filtrado
    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
    .map((u) => ({ ...u, id: u._id }));

  const columns = [
    {
      field: "nombre",
      headerName: "Usuario",
      renderCell: (row) => (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Avatar sx={{ width: 32, height: 32, fontSize: 13, bgcolor: "secondary.main" }}>
            {row.nombre?.charAt(0)}
          </Avatar>
          <Box>
            <Typography variant="body2" fontWeight={600}>
              {row.nombre}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              @{row.usuario}
            </Typography>
          </Box>
        </Box>
      ),
    },
    { field: "email", headerName: "Correo" },
    {
      field: "rol",
      headerName: "Rol",
      renderCell: (row) => {
        const r = ROL_MAP[row.rol] ?? { label: row.rol, color: "default" };
        return <Chip label={r.label} color={r.color} size="small" />;
      },
    },
    {
      field: "sucursal",
      headerName: "Sucursal",
      renderCell: (row) => SUCURSAL_LABELS[row.sucursal] || row.sucursal || "—",
    },
  ];

  return (
    <Box sx={{ "& > * + *": { mt: 3 } }}>
      <PageHeader
        icon={<ContactsOutlinedIcon />}
        title="Directorio General"
        subtitle="Consulta de todo el personal de la empresa"
      />

      {error && <Alert severity="error" sx={{ borderRadius: 2 }}>{error}</Alert>}

      <Box>
        <TextField
          placeholder="Buscar por nombre, usuario o correo..."
          size="small"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
          sx={{ width: 340, "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" sx={{ color: "text.secondary" }} />
                </InputAdornment>
              ),
            },
          }}
        />
      </Box>

      <AppTable
        columns={columns}
        rows={rows}
        loading={loading}
        totalCount={filtrado.length}
        page={page}
        rowsPerPage={rowsPerPage}
        onPageChange={setPage}
        onRowsPerPageChange={(n) => { setRowsPerPage(n); setPage(0); }}
      />
    </Box>
  );
}
