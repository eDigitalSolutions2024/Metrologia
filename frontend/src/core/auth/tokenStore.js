// Guarda el access token solo en memoria (no en localStorage) para reducir el
// riesgo de robo vía XSS. Se pierde en cada recarga completa; AuthProvider lo
// vuelve a obtener con /auth/refresh usando la cookie httpOnly de refresh.
let accessToken = null;

export function getToken() {
  return accessToken;
}

export function setToken(token) {
  accessToken = token;
}

export function clearToken() {
  accessToken = null;
}
