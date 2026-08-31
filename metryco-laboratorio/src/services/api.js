import axios from "axios";
import { getToken, setToken, clearToken } from "../core/auth/tokenStore";

export const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

export const ENDPOINTS = {
  LOGIN: "/auth/login",
  REFRESH: "/auth/refresh",
  LOGOUT: "/auth/logout",
  VERIFICAR_ADMIN: "/auth/verificar-admin",
  CLIENTES: "/clientes",
  COTIZACIONES: "/cotizaciones",
  REPORTES: "/reportes",
  ASIGNACIONES: "/asignaciones",
  CERTIFICADOS: "/certificados",
  EQUIPOS: "/equipos",
  PATRONES: "/patrones",
  PERFORMANCE: "/performance",
  MAGNITUDES: "/magnitudes",
  INCERTIDUMBRE: "/incertidumbre",
  PUBLICO: "/publico",
  CALIDAD: "/calidad",
  ACTIVIDADES: "/actividades",
  COBRANZA: "/cobranza",
  USUARIOS: "/usuarios",
  CONFIGURACION: "/configuracion",
  ALERTAS: "/alertas",
};

// Solo se persiste el usuario (datos no sensibles) para mostrarlo mientras se
// restaura la sesión. El access token vive en memoria (ver core/auth/tokenStore).
export const USER_KEY = "metryco_user";

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // necesario para que viaje la cookie httpOnly del refresh token
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Evita disparar varios refresh en paralelo si varias peticiones fallan a la vez con 401
let refreshInFlight = null;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const isAuthRoute = original?.url?.startsWith("/auth/");

    if (error.response?.status === 401 && original && !original._retry && !isAuthRoute) {
      original._retry = true;
      try {
        refreshInFlight =
          refreshInFlight ??
          axios.post(`${API_BASE_URL}${ENDPOINTS.REFRESH}`, {}, { withCredentials: true });

        const { data } = await refreshInFlight;
        refreshInFlight = null;

        setToken(data.data.token);
        original.headers.Authorization = `Bearer ${data.data.token}`;
        return api(original);
      } catch (refreshError) {
        refreshInFlight = null;
        clearToken();
        localStorage.removeItem(USER_KEY);
        window.location.href = "/login";
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
