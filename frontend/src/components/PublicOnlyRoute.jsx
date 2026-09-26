import { Navigate, Outlet } from 'react-router-dom'

import { useAuth } from '../context/AuthContext'
import FullPageLoader from './FullPageLoader'

/** Keeps signed-in users out of the auth pages. */
export default function PublicOnlyRoute() {
  const { isAuthenticated, initializing } = useAuth()

  if (initializing) return <FullPageLoader message="Restoring your session…" />
  if (isAuthenticated) return <Navigate to="/dashboard" replace />
  return <Outlet />
}
