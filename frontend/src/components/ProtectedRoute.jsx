import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { useAuth } from '../context/AuthContext'
import FullPageLoader from './FullPageLoader'

/** Blocks unauthenticated access and remembers where the user was headed. */
export default function ProtectedRoute() {
  const { isAuthenticated, initializing } = useAuth()
  const location = useLocation()

  if (initializing) return <FullPageLoader message="Restoring your session…" />
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  return <Outlet />
}
