import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

interface ProtectedRouteProps {
  children: ReactNode
  requireAdmin?: boolean
  requirePermission?: { resource: string; action: string }
}

export default function ProtectedRoute({ children, requireAdmin, requirePermission }: ProtectedRouteProps) {
  const { isAuthenticated, user, hasPermission } = useAuth()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (requireAdmin && user?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />
  }

  if (requirePermission && !hasPermission(requirePermission.resource, requirePermission.action)) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}
