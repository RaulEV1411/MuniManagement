import { createBrowserRouter, Navigate } from 'react-router-dom'
import Guard from '@/components/layout/Guard'
import AppShell from '@/components/layout/AppShell'
import LoginPage from '@/pages/Login'
import DashboardPage from '@/pages/Dashboard'
import ProjectDetailPage from '@/pages/ProjectDetail'
import ProjectCreatePage from '@/pages/ProjectCreate'
import UsersPage from '@/pages/Users'
import UserCreatePage from '@/pages/UserCreate'
import UserProfilePage from '@/pages/UserProfile'
import DirectionsPage from '@/pages/Directions'
import DepartmentsPage from '@/pages/Departments'
import ConfigPage from '@/pages/Config'
import TimelinePage from '@/pages/Timeline'
import ReportsPage from '@/pages/Reports'
import PublicProjectsPage from '@/pages/PublicProjects'
import PublicProjectDetailPage from '@/pages/PublicProjectDetail'
import AyudaPage from '@/pages/Ayuda'
import OlvideClavePage from '@/pages/OlvideClave'
import DefinirClavePage from '@/pages/DefinirClave'
import AccesibilidadPage from '@/pages/Accesibilidad'
import AuditoriaPage from '@/pages/Auditoria'

export const router = createBrowserRouter([
  { path: '/',      element: <Navigate to="/login" replace /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/olvide-clave',             element: <OlvideClavePage /> },
  { path: '/definir-clave/:uid/:token', element: <DefinirClavePage /> },
  { path: '/publico',                  element: <PublicProjectsPage /> },
  { path: '/publico/proyectos/:id',    element: <PublicProjectDetailPage /> },
  { path: '/accesibilidad',            element: <AccesibilidadPage /> },
  {
    element: <Guard />,
    children: [{
      element: <AppShell />,
      children: [
        { path: '/dashboard',         element: <DashboardPage /> },
        { path: '/projects/new',      element: <ProjectCreatePage /> },
        { path: '/projects/:id',      element: <ProjectDetailPage /> },
        { path: '/users',             element: <UsersPage /> },
        { path: '/users/new',         element: <UserCreatePage /> },
        { path: '/users/:id',         element: <UserProfilePage /> },
        { path: '/directions',        element: <DirectionsPage /> },
        { path: '/departments',       element: <DepartmentsPage /> },
        { path: '/config',            element: <ConfigPage /> },
        { path: '/auditoria',         element: <AuditoriaPage /> },
        { path: '/timeline',          element: <TimelinePage /> },
        { path: '/reports',           element: <ReportsPage /> },
        { path: '/ayuda',             element: <AyudaPage /> },
      ],
    }],
  },
])
