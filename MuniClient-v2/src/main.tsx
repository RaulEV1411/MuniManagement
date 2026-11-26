// Primero: configura zod antes de que cualquier módulo cree sus esquemas.
import './lib/zod'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { router } from './router'
import { initApp } from './store/app'
import '@fontsource-variable/inter'
import './index.css'
import AplicarMarca from './components/layout/AplicarMarca'
import { MotionConfig } from 'framer-motion'

initApp()

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 1000 * 60, retry: 1 },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      {/* Si el sistema pide menos movimiento, las animaciones de desplazamiento y escala se omiten. */}
      <MotionConfig reducedMotion="user">
        <AplicarMarca />
        <RouterProvider router={router} />
        <Toaster richColors position="top-right" />
      </MotionConfig>
    </QueryClientProvider>
  </StrictMode>,
)
