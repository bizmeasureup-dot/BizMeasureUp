import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { hasPermission, Permission } from '@/lib/rbac'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredPermission?: Permission
  requiredRole?: string
}

function ProtectedRoute({ children, requiredPermission, requiredRole }: ProtectedRouteProps) {
  const { user, appUser, loading } = useAuth()
  const location = useLocation()

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  // Redirect to login if not authenticated
  if (!user || !appUser) {
    // Don't redirect if already on auth pages - this should never happen as auth pages aren't wrapped in ProtectedRoute
    // But just in case, redirect to login
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  // Check role requirement
  if (requiredRole && appUser.role !== requiredRole) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg text-red-600">Access Denied: Insufficient permissions</div>
      </div>
    )
  }

  // Check permission requirement
  if (requiredPermission && !hasPermission(appUser.role, requiredPermission)) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg text-red-600">Access Denied: Insufficient permissions</div>
      </div>
    )
  }

  return <>{children}</>
}

export default ProtectedRoute

