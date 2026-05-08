import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom'
import { getCookie } from '@/lib/utils'
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

function Guard() {
  const token = getCookie('accessToken')
  return token ? <Outlet /> : <Navigate to="/login" replace />
}

export const router = createBrowserRouter([
  { path: '/',      element: <Navigate to="/login" replace /> },
  { path: '/login', element: <LoginPage /> },
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
        { path: '/timeline',          element: <TimelinePage /> },
        { path: '/reports',           element: <ReportsPage /> },
      ],
    }],
  },
])
