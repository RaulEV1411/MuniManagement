import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  // En desarrollo, /api va a Django: así front y API comparten origen, como en producción.
  // Se conserva el Host, como hace Caddy en producción: si se reescribiera, Django vería otro
  // origen y rechazaría el CSRF de las escrituras.
  server: {
    proxy: {
      '/api': { target: process.env.VITE_PROXY_API ?? 'http://localhost:8000', changeOrigin: false },
    },
  },
})
