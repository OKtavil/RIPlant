import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Demo por túnel: el frontend y el backend tienen que compartir origen para
  // que la cookie de sesión (`sameSite: 'lax'`) viaje en los fetch. Vite
  // reenvía `/api/...` al backend quitando el prefijo, igual que `/uploads`.
  server: {
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
