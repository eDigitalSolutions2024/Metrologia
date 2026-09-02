import { Routes, Route, Navigate } from "react-router-dom";

import Login from "../pages/Login/Login";
import MainLayout from "../layouts/MainLayout";
import ProtectedRoute from "../core/auth/ProtectedRoute";
import GuestRoute from "../core/auth/GuestRoute";
import VerCertificado from "../pages/Publico/VerCertificado";
import CertificadosPage from "../pages/Certificados/CertificadosPage";
import InformeCalibracion from "../pages/Certificados/InformeCalibracion";
import ReporteServicioImprimir from "../pages/Reportes/imprimir/ReporteServicioImprimir";
import EntregaEquipoImprimir from "../pages/Reportes/imprimir/EntregaEquipoImprimir";
import EntregaCertificadosImprimir from "../pages/Reportes/imprimir/EntregaCertificadosImprimir";
import IncertidumbrePage from "../pages/Incertidumbre/IncertidumbrePage";
import PlantillasIncertidumbrePage from "../pages/Incertidumbre/PlantillasIncertidumbrePage";
import PlantillaIncertidumbreForm from "../pages/Incertidumbre/PlantillaIncertidumbreForm";

import Dashboard from "../pages/Dashboard/Dashboard";
import Usuarios from "../pages/Usuarios/Usuarios";
import General from "../pages/General/General";
import RolesMenuPage from "../pages/Administracion/RolesMenuPage";
import LaboratorioPage from "../pages/Administracion/LaboratorioPage";
import ColoresPage from "../pages/Administracion/ColoresPage";
import AuditoriaPage from "../pages/Administracion/AuditoriaPage";
import ClientesPage from "../pages/Clientes/ClientesPage";
import ClienteForm from "../pages/Clientes/ClienteForm";
import CotizacionesPage from "../pages/Cotizaciones/CotizacionesPage";
import ReportesPage from "../pages/Reportes/ReportesPage";
import MisAsignacionesPage from "../pages/Reportes/MisAsignacionesPage";
import ReporteDetallePage from "../pages/Reportes/ReporteDetallePage";
import ReportesExportar from "../pages/Reportes/ReportesExportar";
import CalidadPage from "../pages/Calidad/CalidadPage";
import EquiposPage from "../pages/Equipos/EquiposPage";
import EquipoForm from "../pages/Equipos/EquipoForm";
import PatronesPage from "../pages/Equipos/PatronesPage";
import PatronForm from "../pages/Equipos/PatronForm";
import HistorialCertificadosPage from "../pages/Equipos/HistorialCertificadosPage";
import ActividadesPage from "../pages/Actividades/ActividadesPage";
import CobranzaPage from "../pages/Cobranza/CobranzaPage";
import CalendarioPagosPage from "../pages/Cobranza/CalendarioPagosPage";
import PerformancePage from "../pages/Performance/PerformancePage";
import PerformanceForm from "../pages/Performance/PerformanceForm";

import ROUTES from "../shared/constants/routes";

export default function AppRouter() {
  return (
    <Routes>
      {/* Verificación pública del certificado por token (sin sesión, sin layout) */}
      <Route path="/certificado/ver/:token" element={<VerCertificado />} />

      {/* Informe de calibración para imprimir / PDF (con sesión, sin layout) */}
      <Route
        path="/informe/certificado/:id"
        element={
          <ProtectedRoute>
            <InformeCalibracion />
          </ProtectedRoute>
        }
      />
      <Route
        path="/informe/reporte/:id"
        element={
          <ProtectedRoute>
            <ReporteServicioImprimir />
          </ProtectedRoute>
        }
      />
      <Route
        path="/informe/reporte-entrega/:id"
        element={
          <ProtectedRoute>
            <EntregaEquipoImprimir />
          </ProtectedRoute>
        }
      />
      <Route
        path="/informe/reporte-entrega-certificados/:id"
        element={
          <ProtectedRoute>
            <EntregaCertificadosImprimir />
          </ProtectedRoute>
        }
      />

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
        <Route path="reportes/certificados" element={<CertificadosPage />} />
        <Route path="incertidumbre" element={<IncertidumbrePage />} />
        <Route path="incertidumbre/plantillas" element={<PlantillasIncertidumbrePage />} />
        <Route path="incertidumbre/plantillas/nueva" element={<PlantillaIncertidumbreForm />} />
        <Route path="incertidumbre/plantillas/:id/editar" element={<PlantillaIncertidumbreForm />} />
        <Route path="usuarios" element={<Usuarios />} />
        <Route path="general" element={<General />} />
        <Route path="administracion/roles-menu" element={<RolesMenuPage />} />
        <Route path="administracion/laboratorio" element={<LaboratorioPage />} />
        <Route path="administracion/colores" element={<ColoresPage />} />
        <Route path="administracion/auditoria" element={<AuditoriaPage />} />
        <Route path="clientes" element={<ClientesPage />} />
        <Route path="clientes/nuevo" element={<ClienteForm />} />
        <Route path="clientes/:id/editar" element={<ClienteForm />} />
        <Route path="cotizaciones" element={<CotizacionesPage />} />
        <Route path="reportes" element={<ReportesPage />} />
        <Route path="reportes/mis-asignaciones" element={<MisAsignacionesPage />} />
        <Route path="reportes/exportar" element={<ReportesExportar />} />
        <Route path="reportes/:id" element={<ReporteDetallePage />} />
        <Route path="calidad" element={<CalidadPage />} />
        <Route path="equipos" element={<EquiposPage />} />
        <Route path="equipos/nuevo" element={<EquipoForm />} />
        <Route path="equipos/:id/editar" element={<EquipoForm />} />
        <Route path="equipos/historial-certificados" element={<HistorialCertificadosPage />} />
        <Route path="equipos/patrones" element={<PatronesPage />} />
        <Route path="equipos/patrones/nuevo" element={<PatronForm />} />
        <Route path="equipos/patrones/:id/editar" element={<PatronForm />} />
        <Route path="actividades" element={<ActividadesPage />} />
        <Route path="cobranza" element={<CobranzaPage />} />
        <Route path="cobranza/calendario" element={<CalendarioPagosPage />} />
        <Route path="performance" element={<PerformancePage />} />
        <Route path="performance/nuevo" element={<PerformanceForm />} />
        <Route path="performance/:id/editar" element={<PerformanceForm />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
