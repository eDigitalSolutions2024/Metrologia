import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Typography, TextField, InputAdornment, IconButton, Drawer,
  Chip, Tooltip, MenuItem, Select, FormControl, InputLabel, Alert,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import ToggleOnIcon from "@mui/icons-material/ToggleOn";
import ToggleOffOutlinedIcon from "@mui/icons-material/ToggleOffOutlined";
import { DeleteOutlined as DeleteOutlineIcon } from "@mui/icons-material";

import AppButton from "../../shared/components/AppButton";
import AppTable from "../../shared/components/AppTable";
import PageHeader from "../../shared/components/PageHeader";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";
import ConfirmDialog from "../../shared/components/ConfirmDialog";
import PasswordConfirmDialog from "../../shared/components/PasswordConfirmDialog";
import { listarClientes, actualizarCliente, eliminarCliente } from "../../services/clientes";
import { useDebounce } from "../../shared/hooks/useDebounce";
import { SECTORES, SECTOR_MAP } from "../../shared/constants/sectores";
import { usePolling } from "../../shared/hooks/usePolling";
import { FichaContenido } from "./ClienteFichaPage";
import BusinessOutlinedIcon from "@mui/icons-material/BusinessOutlined";
import PersonOutlineOutlinedIcon from "@mui/icons-material/PersonOutlineOutlined";
import MailOutlineOutlinedIcon from "@mui/icons-material/MailOutlineOutlined";
import CloseIcon from "@mui/icons-material/Close";
import OpenInNewOutlinedIcon from "@mui/icons-material/OpenInNewOutlined";
import VerifiedOutlinedIcon from "@mui/icons-material/VerifiedOutlined";
import ReportProblemOutlinedIcon from "@mui/icons-material/ReportProblemOutlined";

function CeldaIcono({ icon: Icon, bold = false, children }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.9, minWidth: 0 }}>
      <Icon sx={{ fontSize: 16, color: "text.secondary", flexShrink: 0 }} />
      <Typography variant="body2" fontSize={13} fontWeight={bold ? 700 : 400} noWrap sx={{ minWidth: 0 }}>{children}</Typography>
    </Box>
  );
}

// Datos que el SAT exige del receptor para poder facturarle un CFDI 4.0.
function faltantesFiscales(c) {
  return [
    !c.rfc && "RFC",
    !c.regimenFiscal && "régimen fiscal",
    !c.usoCFDI && "uso de CFDI",
    !c.domicilioFiscal?.cp && "CP fiscal",
  ].filter(Boolean);
}

export default function ClientesPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [sectorFilter, setSectorFilter] = useState("todos");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [toggleTarget, setToggleTarget] = useState(null);
  const [fichaId, setFichaId] = useState(null);

  const [rows, setRows] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const debouncedSearch = useDebounce(search, 400);

  // Reinicia la página cuando cambian los filtros, sin pasar por un efecto
  // (patrón recomendado por React para "ajustar estado cuando cambia una prop/dep")
  const [prevFiltros, setPrevFiltros] = useState([debouncedSearch, sectorFilter]);
  if (prevFiltros[0] !== debouncedSearch || prevFiltros[1] !== sectorFilter) {
    setPrevFiltros([debouncedSearch, sectorFilter]);
    setPage(0);
  }

  // Protege contra condiciones de carrera entre filtros que cambian rápido
  // y el refresco automático de fondo (usePolling) — ver misma nota en
  // CotizacionesPage.jsx.
  const cargaIdRef = useRef(0);
  const cargar = useCallback(async (silencioso = false) => {
    const miId = ++cargaIdRef.current;
    if (!silencioso) { setLoading(true); setError(""); }
    try {
      const { items, total } = await listarClientes({
        search: debouncedSearch,
        sector: sectorFilter,
        page,
        pageSize: rowsPerPage,
      });
      if (cargaIdRef.current !== miId) return;
      setRows(items.map((c) => ({ ...c, id: c._id })));
      setTotalCount(total);
    } catch {
      if (cargaIdRef.current === miId && !silencioso) setError("No se pudieron cargar los clientes. Intenta de nuevo.");
    } finally {
      if (cargaIdRef.current === miId && !silencioso) setLoading(false);
    }
  }, [debouncedSearch, sectorFilter, page, rowsPerPage]);

  useEffect(() => { cargar(); }, [cargar, reloadKey]);

  usePolling(() => cargar(true));

  const handleEliminar = async () => {
    const target = deleteTarget;
    await eliminarCliente(target.id);
    setDeleteTarget(null);
    setReloadKey((k) => k + 1);
  };

  const handleToggleEstado = async () => {
    const target = toggleTarget;
    setToggleTarget(null);
    const nuevoStatus = target.status === "activo" ? "inactivo" : "activo";
    try {
      await actualizarCliente(target.id, { status: nuevoStatus });
      setReloadKey((k) => k + 1);
    } catch {
      setError("No se pudo actualizar el estado del cliente. Intenta de nuevo.");
    }
  };

  const columns = [
    {
      field: "nombre", headerName: "Cliente", minWidth: 220,
      renderCell: (row) => (
        <Box sx={{ minWidth: 0, maxWidth: 280 }}>
          <CeldaIcono icon={BusinessOutlinedIcon} bold>{row.nombre}</CeldaIcono>
          <Typography variant="caption" color="text.secondary" noWrap sx={{ display: "block", pl: 2.6 }}>
            {[row.rfc, row.domicilioFiscal?.ciudad].filter(Boolean).join(" · ") || "—"}
          </Typography>
        </Box>
      ),
    },
    {
      field: "contacto", headerName: "Contacto", minWidth: 170,
      renderCell: (row) => (
        <Box sx={{ minWidth: 0, maxWidth: 200 }}>
          <CeldaIcono icon={PersonOutlineOutlinedIcon}>{row.contacto?.nombre || "—"}</CeldaIcono>
          <Typography variant="caption" color="text.secondary" noWrap sx={{ display: "block", pl: 2.6 }}>
            {row.contacto?.telefono || "Sin teléfono"}
          </Typography>
        </Box>
      ),
    },
    {
      field: "email", headerName: "Correo", minWidth: 180, hideBelow: "lg",
      renderCell: (row) => (
        <Tooltip title={row.contacto?.emailCotizaciones || ""}>
          <Box sx={{ minWidth: 0, maxWidth: 210 }}>
            <CeldaIcono icon={MailOutlineOutlinedIcon}>{row.contacto?.emailCotizaciones || "—"}</CeldaIcono>
          </Box>
        </Tooltip>
      ),
    },
    {
      field: "fiscal", headerName: "Fiscal", nowrap: true,
      renderCell: (row) => {
        const faltan = faltantesFiscales(row);
        return faltan.length === 0
          ? (
            <Tooltip title="RFC, régimen, uso de CFDI y CP fiscal completos">
              <Chip size="small" color="success" variant="outlined" icon={<VerifiedOutlinedIcon />} label="Listo" />
            </Tooltip>
          )
          : (
            <Tooltip title={`Falta: ${faltan.join(", ")}`}>
              <Chip size="small" color="warning" variant="outlined" icon={<ReportProblemOutlinedIcon />} label={`Falta ${faltan.length}`} />
            </Tooltip>
          );
      },
    },
    {
      field: "sector",
      headerName: "Sector",
      nowrap: true, hideBelow: "xl",
      renderCell: (row) => {
        const s = SECTOR_MAP[row.sector] ?? { label: row.sector || "—", color: "default" };
        return <Chip label={s.label} color={s.color} size="small" variant="outlined" />;
      },
    },
    {
      field: "status",
      headerName: "Estado",
      nowrap: true,
      renderCell: (row) => (
        <Chip
          label={row.status === "activo" ? "Activo" : "Inactivo"}
          color={row.status === "activo" ? "success" : "default"}
          size="small"
        />
      ),
    },
    {
      field: "acciones",
      headerName: "Acciones",
      align: "center",
      width: 120,
      renderCell: (row) => (
        <Box onClick={(e) => e.stopPropagation()} sx={{ display: "flex", gap: 0.5, justifyContent: "center" }}>
          <Tooltip title="Editar">
            <IconButton size="small" onClick={() => navigate(`/clientes/${row.id}/editar`)}>
              <EditOutlinedIcon fontSize="small" sx={{ color: "secondary.main" }} />
            </IconButton>
          </Tooltip>
          <Tooltip title={row.status === "activo" ? "Desactivar" : "Activar"}>
            <IconButton size="small" onClick={() => setToggleTarget(row)}>
              {row.status === "activo"
                ? <ToggleOnIcon fontSize="small" sx={{ color: "success.main" }} />
                : <ToggleOffOutlinedIcon fontSize="small" sx={{ color: "text.disabled" }} />}
            </IconButton>
          </Tooltip>
          <Tooltip title="Eliminar">
            <IconButton size="small" onClick={() => setDeleteTarget(row)}>
              <DeleteOutlineIcon fontSize="small" sx={{ color: "error.main" }} />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  return (
    <Box>
      <PageHeader
        icon={<GroupsOutlinedIcon />}
        title="Clientes"
        subtitle={`${totalCount} registros`}
        actions={
          <AppButton startIcon={<AddIcon />} onClick={() => navigate("/clientes/nuevo")} sx={{ borderRadius: 2 }}>
            Nuevo Cliente
          </AppButton>
        }
      />

      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

      <Box sx={{ display: "flex", gap: 2, mb: 2, flexWrap: "wrap" }}>
        <TextField
          placeholder="Buscar por nombre, RFC o contacto..."
          size="small"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ width: 360, "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
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
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Sector</InputLabel>
          <Select label="Sector" value={sectorFilter} onChange={(e) => setSectorFilter(e.target.value)} sx={{ borderRadius: 2 }}>
            <MenuItem value="todos">Todos los sectores</MenuItem>
            {SECTORES.map((s) => (
              <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      <AppTable
        columns={columns}
        rows={rows}
        loading={loading}
        totalCount={totalCount}
        page={page}
        rowsPerPage={rowsPerPage}
        onPageChange={setPage}
        onRowsPerPageChange={(n) => { setRowsPerPage(n); setPage(0); }}
        onRowClick={(row) => setFichaId(row.id)}
      />

      <Drawer
        anchor="right" open={!!fichaId} onClose={() => setFichaId(null)}
        slotProps={{ paper: { sx: { width: { xs: "100%", sm: 560 }, p: 2.5 } } }}
      >
        {fichaId && (
          <FichaContenido
            id={fichaId} compacto
            encabezado={(cliente) => (
              <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 1, mb: 2 }}>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="overline" color="text.secondary">Ficha del cliente</Typography>
                  <Typography variant="h6" fontWeight={800} sx={{ lineHeight: 1.2 }}>{cliente.nombre}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {[cliente.rfc, cliente.domicilioFiscal?.ciudad].filter(Boolean).join(" · ") || "Sin RFC"}
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", gap: 0.5, flexShrink: 0 }}>
                  <Tooltip title="Abrir en página completa">
                    <IconButton size="small" onClick={() => navigate(`/clientes/${fichaId}`)}><OpenInNewOutlinedIcon fontSize="small" /></IconButton>
                  </Tooltip>
                  <Tooltip title="Editar">
                    <IconButton size="small" onClick={() => navigate(`/clientes/${fichaId}/editar`)}><EditOutlinedIcon fontSize="small" /></IconButton>
                  </Tooltip>
                  <IconButton size="small" onClick={() => setFichaId(null)}><CloseIcon fontSize="small" /></IconButton>
                </Box>
              </Box>
            )}
          />
        )}
      </Drawer>

      <ConfirmDialog
        open={!!toggleTarget}
        title={toggleTarget?.status === "activo" ? "Desactivar cliente" : "Activar cliente"}
        message={
          toggleTarget?.status === "activo"
            ? `¿Deseas desactivar a "${toggleTarget?.nombre}"? Podrás reactivarlo cuando quieras.`
            : `¿Deseas activar de nuevo a "${toggleTarget?.nombre}"?`
        }
        confirmLabel={toggleTarget?.status === "activo" ? "Desactivar" : "Activar"}
        confirmColor={toggleTarget?.status === "activo" ? "error" : "success"}
        onConfirm={handleToggleEstado}
        onCancel={() => setToggleTarget(null)}
      />

      <PasswordConfirmDialog
        open={!!deleteTarget}
        title="Eliminar cliente"
        message={`Esto eliminará a "${deleteTarget?.nombre}" de forma permanente y no se puede deshacer. Ingresa la contraseña de administrador para continuar.`}
        onConfirm={handleEliminar}
        onCancel={() => setDeleteTarget(null)}
      />
    </Box>
  );
}
