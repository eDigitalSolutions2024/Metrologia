import { Routes, Route, Navigate } from "react-router-dom";

import Login from "../pages/Login/Login";
import MainLayout from "../layouts/MainLayout";
import ProtectedRoute from "../core/auth/ProtectedRoute";
import GuestRoute from "../core/auth/GuestRoute";

import Dashboard from "../pages/Dashboard/Dashboard";
import Usuarios from "../pages/Usuarios/Usuarios";
import General from "../pages/General/General";
import ClientesPage from "../pages/Clientes/ClientesPage";
import ClienteForm from "../pages/Clientes/ClienteForm";
import CotizacionesPage from "../pages/Cotizaciones/CotizacionesPage";
import ReportesPage from "../pages/Reportes/ReportesPage";
import ReportesExportar from "../pages/Reportes/ReportesExportar";
import CalidadPage from "../pages/Calidad/CalidadPage";
import EquiposPage from "../pages/Equipos/EquiposPage";
import EquipoForm from "../pages/Equipos/EquipoForm";
import PatronesPage from "../pages/Equipos/PatronesPage";
import ActividadesPage from "../pages/Actividades/ActividadesPage";
import CobranzaPage from "../pages/Cobranza/CobranzaPage";

import ROUTES from "../shared/constants/routes";

export default function AppRouter() {
  return (
    <Routes>
      <Route
        path={ROUTES.LOGIN}
        element={
          <GuestRoute>
            <Login />
          </GuestRoute>
        }
      />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="usuarios" element={<Usuarios />} />
        <Route path="general" element={<General />} />
        <Route path="clientes" element={<ClientesPage />} />
        <Route path="clientes/nuevo" element={<ClienteForm />} />
        <Route path="clientes/:id/editar" element={<ClienteForm />} />
        <Route path="cotizaciones" element={<CotizacionesPage />} />
        <Route path="reportes" element={<ReportesPage />} />
        <Route path="reportes/exportar" element={<ReportesExportar />} />
        <Route path="calidad" element={<CalidadPage />} />
        <Route path="equipos" element={<EquiposPage />} />
        <Route path="equipos/nuevo" element={<EquipoForm />} />
        <Route path="equipos/:id/editar" element={<EquipoForm />} />
        <Route path="equipos/patrones" element={<PatronesPage />} />
        <Route path="actividades" element={<ActividadesPage />} />
        <Route path="cobranza" element={<CobranzaPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
