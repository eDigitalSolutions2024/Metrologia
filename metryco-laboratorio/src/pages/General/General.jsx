import { useEffect, useState } from "react";
import {
  Box, Typography, TextField, InputAdornment, Chip, Avatar, Alert,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";

import AppTable from "../../shared/components/AppTable";
import { obtenerDirectorio } from "../../services/usuarios";
import { useDebounce } from "../../shared/hooks/useDebounce";

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => {
    let cancelado = false;

    (async () => {
      setLoading(true);
      setError("");
      try {
        const data = await obtenerDirectorio();
        if (cancelado) return;
        setDirectorio(data);
      } catch {
        if (!cancelado) setError("No se pudo cargar el directorio general.");
      } finally {
        if (!cancelado) setLoading(false);
      }
    })();

    return () => {
      cancelado = true;
    };
  }, []);

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
    .slice(page * 10, page * 10 + 10)
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
      <Box>
        <Typography variant="h5" fontWeight={700}>
          Directorio General
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Consulta de todo el personal de la empresa
        </Typography>
      </Box>

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
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" sx={{ color: "text.secondary" }} />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      <AppTable
        columns={columns}
        rows={rows}
        loading={loading}
        totalCount={filtrado.length}
        page={page}
        rowsPerPage={10}
        onPageChange={setPage}
      />
    </Box>
  );
}
