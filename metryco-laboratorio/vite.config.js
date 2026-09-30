import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:4001',
        changeOrigin: true,
      },
      // Logos, fotos de perfil y firmas digitales se sirven desde el backend
      // como archivos estáticos (fuera de /api) — sin este proxy, en dev
      // BACKEND_ORIGIN queda vacío (VITE_API_URL=/api) y las imágenes
      // apuntan al propio Vite en vez del backend.
      '/uploads': {
        target: 'http://127.0.0.1:4001',
        changeOrigin: true,
      },
    },
  },
})
