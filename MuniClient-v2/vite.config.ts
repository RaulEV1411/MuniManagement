import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  // En desarrollo, /api va a Django: así front y API comparten origen, como en producción.
  server: {
    proxy: {
      '/api': process.env.VITE_PROXY_API ?? 'http://localhost:8000',
    },
  },
})
