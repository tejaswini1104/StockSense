import { Navigate, Route, Routes } from 'react-router-dom'

import ProtectedRoute from './components/ProtectedRoute'
import PublicOnlyRoute from './components/PublicOnlyRoute'
import { AuthProvider } from './context/AuthContext'
import AppLayout from './layouts/AppLayout'
import AuthLayout from './layouts/AuthLayout'
import Dashboard from './pages/Dashboard'
import ForgotPassword from './pages/ForgotPassword'
import Login from './pages/Login'
import MoveHistory from './pages/MoveHistory'
import NotFound from './pages/NotFound'
import Operations from './pages/Operations'
import Products from './pages/Products'
import Profile from './pages/Profile'
import Signup from './pages/Signup'
import StockLedger from './pages/StockLedger'
import Warehouse from './pages/Warehouse'

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        {/* Auth pages - redirect to the dashboard when already signed in. */}
        <Route element={<PublicOnlyRoute />}>
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
          </Route>
        </Route>

        {/* Everything below requires a valid token. */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/products" element={<Products />} />
            <Route path="/operations" element={<Operations />} />
            <Route path="/warehouse" element={<Warehouse />} />
            <Route path="/move-history" element={<MoveHistory />} />
            <Route path="/stock-ledger" element={<StockLedger />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Route>
      </Routes>
    </AuthProvider>
  )
}
