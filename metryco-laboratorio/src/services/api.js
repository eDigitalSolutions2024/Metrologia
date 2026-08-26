import axios from "axios";

export const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

export const ENDPOINTS = {
  LOGIN: "/auth/login",
  REFRESH: "/auth/refresh",
  LOGOUT: "/auth/logout",
  VERIFICAR_ADMIN: "/auth/verificar-admin",
  CLIENTES: "/clientes",
  COTIZACIONES: "/cotizaciones",
  REPORTES: "/reportes",
  EQUIPOS: "/equipos",
  PATRONES: "/equipos/patrones",
  CALIDAD: "/calidad",
  ACTIVIDADES: "/actividades",
  COBRANZA: "/cobranza",
  USUARIOS: "/usuarios",
};

export const TOKEN_KEY = "metryco_token";
export const USER_KEY = "metryco_user";

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // necesario para que viaje la cookie httpOnly del refresh token
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
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

        localStorage.setItem(TOKEN_KEY, data.data.token);
        original.headers.Authorization = `Bearer ${data.data.token}`;
        return api(original);
      } catch (refreshError) {
        refreshInFlight = null;
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        window.location.href = "/login";
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
