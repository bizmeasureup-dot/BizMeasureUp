import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import Layout from '@/containers/Layout'
import ProtectedRoute from './ProtectedRoute'

// Auth pages
import LoginPage from '@/pages/auth/Login'
import SignUpPage from '@/pages/auth/SignUp'
import ForgotPasswordPage from '@/pages/auth/ForgotPassword'
import ResetPasswordPage from '@/pages/auth/ResetPassword'

// Dashboard
import DashboardPage from '@/pages/Dashboard'

// Delegation module
import TasksPage from '@/pages/delegation/Tasks'
import TaskDetailPage from '@/pages/delegation/TaskDetail'
import EditTaskPage from '@/pages/delegation/EditTask'

// Checklist module
import ChecklistsPage from '@/pages/checklists/Checklists'
import ChecklistDetailPage from '@/pages/checklists/ChecklistDetail'

// Scoreboard module
import ScoreboardPage from '@/pages/scoreboard/Scoreboard'
import MetricConfigPage from '@/pages/scoreboard/MetricConfig'
import EditMetricPage from '@/pages/scoreboard/EditMetric'

// FMS module
import FMSPage from '@/pages/fms/FMS'

// User pages
import ProfilePage from '@/pages/Profile'
import SettingsPage from '@/pages/Settings'

// Organization & Team
import OrganizationSettingsPage from '@/pages/organization/OrganizationSettings'
import TeamManagementPage from '@/pages/team/TeamManagement'

// FMS
import FlowViewsPage from '@/pages/fms/FlowViews'

// Approvals
import ApprovalsPage from '@/pages/approvals/Approvals'

function AppRoutes() {
  const { user, loading } = useAuth()

  // Show loading only on initial load, not on every route change
  if (loading && !user) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="text-lg text-gray-600 dark:text-gray-400">Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignUpPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      
      {/* Protected routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout>
              <DashboardPage />
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* Delegation routes */}
      <Route
        path="/delegation/tasks"
        element={
          <ProtectedRoute>
            <Layout>
              <TasksPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/delegation/tasks/:id"
        element={
          <ProtectedRoute>
            <Layout>
              <TaskDetailPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/delegation/tasks/:id/edit"
        element={
          <ProtectedRoute requiredPermission="tasks.edit">
            <Layout>
              <EditTaskPage />
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* Checklist routes */}
      <Route
        path="/checklists"
        element={
          <ProtectedRoute>
            <Layout>
              <ChecklistsPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/checklists/:taskId"
        element={
          <ProtectedRoute>
            <Layout>
              <ChecklistDetailPage />
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* Scoreboard routes */}
      <Route
        path="/scoreboard"
        element={
          <ProtectedRoute requiredPermission="metrics.view">
            <Layout>
              <ScoreboardPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/scoreboard/metrics/new"
        element={
          <ProtectedRoute requiredPermission="metrics.create">
            <Layout>
              <MetricConfigPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/scoreboard/metrics/:id/edit"
        element={
          <ProtectedRoute requiredPermission="metrics.edit">
            <Layout>
              <EditMetricPage />
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* FMS routes */}
      <Route
        path="/fms"
        element={
          <ProtectedRoute>
            <Layout>
              <FMSPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/fms/views"
        element={
          <ProtectedRoute requiredPermission="flow_views.create">
            <Layout>
              <FlowViewsPage />
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* User routes */}
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Layout>
              <ProfilePage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <Layout>
              <SettingsPage />
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* Approvals routes */}
      <Route
        path="/approvals"
        element={
          <ProtectedRoute>
            <Layout>
              <ApprovalsPage />
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* Organization & Team routes */}
      <Route
        path="/organization/settings"
        element={
          <ProtectedRoute>
            <Layout>
              <OrganizationSettingsPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/team"
        element={
          <ProtectedRoute requiredPermission="team.manage">
            <Layout>
              <TeamManagementPage />
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* Catch all - redirect based on auth status */}
      <Route 
        path="*" 
        element={
          <ProtectedRoute>
            <Navigate to="/" replace />
          </ProtectedRoute>
        } 
      />
    </Routes>
  )
}

export default AppRoutes

