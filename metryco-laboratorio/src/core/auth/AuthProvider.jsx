import { useState, useCallback, useEffect } from "react";
import { loginRequest } from "./LoginService";
import { getToken, setToken as setStoredToken, clearToken } from "./tokenStore";
import api, { ENDPOINTS, USER_KEY } from "../../services/api";
import { AuthContext } from "./AuthContext";
import Loading from "../../shared/components/Loading";

function leerUsuarioGuardado() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY));
  } catch {
    return null;
  }
}

export default function AuthProvider({ children }) {
  const [token, setToken] = useState(getToken);
  const [user, setUser] = useState(leerUsuarioGuardado);
  const [booting, setBooting] = useState(() => !!leerUsuarioGuardado());

  // El access token vive solo en memoria, así que al recargar la página se
  // pierde: lo recuperamos con /auth/refresh usando la cookie httpOnly.
  useEffect(() => {
    if (!leerUsuarioGuardado()) return;

    api
      .post(ENDPOINTS.REFRESH)
      .then(({ data }) => {
        setStoredToken(data.data.token);
        setToken(data.data.token);
      })
      .catch(() => {
        clearToken();
        localStorage.removeItem(USER_KEY);
        setToken(null);
        setUser(null);
      })
      .finally(() => setBooting(false));
  }, []);

  const login = useCallback(async (usuario, password) => {
    const data = await loginRequest(usuario, password);
    setStoredToken(data.token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
  }, []);

  const logout = useCallback(() => {
    api.post(ENDPOINTS.LOGOUT).catch(() => {});
    clearToken();
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  }, []);

  if (booting) return <Loading height="100vh" />;

  return (
    <AuthContext.Provider value={{ token, user, login, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}
