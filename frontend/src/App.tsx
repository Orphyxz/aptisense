import type { ReactElement } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './auth-context'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import StudentDashboard from './pages/StudentDashboard'
import StudentHistoryPage from './pages/StudentHistoryPage'
import AdminDashboard from './pages/AdminDashboard'
import AdminStudentDetailPage from './pages/AdminStudentDetailPage'
import TestPage from './pages/TestPage'
import ResultsPage from './pages/ResultsPage'
import AppTopbar from './components/ui/AppTopbar'

function ProtectedRoute({
  children,
  roles,
}: {
  children: ReactElement
  roles?: Array<'student' | 'admin'>
}) {
  const { user, token } = useAuth()

  if (!token || !user) return <Navigate to="/login" replace />
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />
  return children
}

function HomeRedirect() {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return <Navigate to={user.role === 'admin' ? '/admin' : '/student'} replace />
}

export default function App() {
  return (
    <div className="app-shell">
      <AppTopbar />
      <Routes>
        <Route path="/" element={<HomeRedirect />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route
          path="/student"
          element={
            <ProtectedRoute roles={['student']}>
              <StudentDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/student/history"
          element={
            <ProtectedRoute roles={['student']}>
              <StudentHistoryPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin"
          element={
            <ProtectedRoute roles={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/students/:id"
          element={
            <ProtectedRoute roles={['admin']}>
              <AdminStudentDetailPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/test/:id"
          element={
            <ProtectedRoute roles={['student']}>
              <TestPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/results"
          element={
            <ProtectedRoute roles={['student']}>
              <ResultsPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </div>
  )
}
