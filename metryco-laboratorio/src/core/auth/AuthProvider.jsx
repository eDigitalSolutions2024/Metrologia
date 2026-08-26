import { useState, useCallback } from "react";
import { loginRequest } from "./LoginService";
import api, { ENDPOINTS } from "../../services/api";
import { AuthContext } from "./AuthContext";

const TOKEN_KEY = "metryco_token";
const USER_KEY = "metryco_user";

export default function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY));
    } catch {
      return null;
    }
  });

  const login = useCallback(async (usuario, password) => {
    const data = await loginRequest(usuario, password);
    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
  }, []);

  const logout = useCallback(() => {
    api.post(ENDPOINTS.LOGOUT).catch(() => {});
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ token, user, login, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}
