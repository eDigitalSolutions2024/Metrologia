import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Typography, TextField, InputAdornment, IconButton, Chip, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogActions, Alert,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import RuleFolderOutlinedIcon from "@mui/icons-material/RuleFolderOutlined";

import AppButton from "../../shared/components/AppButton";
import AppTable from "../../shared/components/AppTable";
import PageHeader from "../../shared/components/PageHeader";
import { listarModelos, eliminarModelo } from "../../services/incertidumbre";

// Administración de plantillas de presupuesto de incertidumbre (ModeloIncertidumbre):
// magnitud -> tipo de instrumento, con sus contribuciones GUM/EA-4/02 predefinidas.
export default function PlantillasIncertidumbrePage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [aEliminar, setAEliminar] = useState(null);
  const [eliminando, setEliminando] = useState(false);

  const cargar = () => {
    setLoading(true);
    listarModelos()
      .then((data) => setItems(data || []))
      .catch(() => setError("No se pudieron cargar las plantillas."))
      .finally(() => setLoading(false));
  };

  useEffect(cargar, []);

  const filtrados = items.filter((m) => {
    const texto = `${m.nombre} ${m.magnitud} ${m.tipoInstrumento}`.toLowerCase();
    return texto.includes(search.toLowerCase());
  });

  const confirmarEliminar = async () => {
    setEliminando(true);
    try {
      await eliminarModelo(aEliminar._id);
      setAEliminar(null);
      cargar();
    } catch (err) {
      setError(err?.response?.data?.message || "No se pudo eliminar la plantilla.");
      setAEliminar(null);
    } finally {
      setEliminando(false);
    }
  };

  const columns = [
    { field: "nombre", headerName: "Nombre" },
    { field: "magnitud", headerName: "Magnitud" },
    { field: "tipoInstrumento", headerName: "Tipo de instrumento" },
    {
      field: "contribuciones",
      headerName: "Contribuciones",
      renderCell: (row) => <Chip label={row.contribuciones?.length || 0} size="small" />,
    },
    {
      field: "activo",
      headerName: "Estado",
      renderCell: (row) => (
        <Chip label={row.activo ? "Activa" : "Inactiva"} color={row.activo ? "success" : "default"} size="small" />
      ),
    },
    {
      field: "acciones",
      headerName: "Acciones",
      align: "center",
      renderCell: (row) => (
        <>
          <Tooltip title="Editar plantilla">
            <IconButton size="small" onClick={() => navigate(`/incertidumbre/plantillas/${row._id}/editar`)}>
              <EditOutlinedIcon fontSize="small" sx={{ color: "secondary.main" }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Eliminar plantilla">
            <IconButton size="small" onClick={() => setAEliminar(row)}>
              <DeleteOutlineIcon fontSize="small" sx={{ color: "error.main" }} />
            </IconButton>
          </Tooltip>
        </>
      ),
    },
  ];

  return (
    <Box>
      <PageHeader
        icon={<RuleFolderOutlinedIcon />}
        title="Plantillas de Incertidumbre"
        subtitle={`${filtrados.length} plantillas (magnitud → tipo de instrumento)`}
        actions={
          <AppButton startIcon={<AddIcon />} onClick={() => navigate("/incertidumbre/plantillas/nueva")} sx={{ borderRadius: 2 }}>
            Nueva Plantilla
          </AppButton>
        }
      />

      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError("")}>{error}</Alert>}

      <Box sx={{ mb: 2 }}>
        <TextField
          placeholder="Buscar por nombre, magnitud o tipo de instrumento..."
          size="small"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ width: 400, "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
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

      <AppTable columns={columns} rows={filtrados} totalCount={filtrados.length} loading={loading} />

      <Dialog open={!!aEliminar} onClose={() => setAEliminar(null)}>
        <DialogTitle component="div">
          <Typography variant="h6" component="p" fontWeight={700}>Eliminar plantilla</Typography>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            ¿Eliminar la plantilla "{aEliminar?.nombre}"? Esta acción no se puede deshacer. Los cálculos ya realizados con ella no se ven afectados.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <AppButton variant="outlined" onClick={() => setAEliminar(null)} sx={{ borderRadius: 2 }}>Cancelar</AppButton>
          <AppButton color="error" loading={eliminando} onClick={confirmarEliminar} sx={{ borderRadius: 2 }}>Eliminar</AppButton>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
