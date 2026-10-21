import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Demo por túnel: el frontend y el backend tienen que compartir origen para
  // que la cookie de sesión (`sameSite: 'lax'`) viaje en los fetch. Vite
  // reenvía `/api/...` al backend quitando el prefijo, igual que `/uploads`.
  //
  // El proxy solo sirve si el frontend pide rutas relativas: con
  // `VITE_API_URL=/api`, el cliente HTTP usa `/api` como base y todas las
  // llamadas entran por acá. Con la base por defecto (`http://localhost:3000`)
  // el browser va directo al backend y salta el proxy: desde la URL del túnel
  // `localhost` es la máquina del visitante, no esta.
  server: {
    // El host de `trycloudflare` cambia en cada arranque; el sufijo cubre todos
    // sin fijar uno. Sin esto Vite rechaza el Host header del túnel.
    allowedHosts: ['.trycloudflare.com'],
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      '/uploads': 'http://localhost:3000',
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
})
