import { Navigate, Outlet } from 'react-router-dom'
import { getCookie } from '@/lib/utils'

export default function Guard() {
  const token = getCookie('accessToken')
  return token ? <Outlet /> : <Navigate to="/login" replace />
}
