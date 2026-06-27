import Dashboard from '@pages/Dashboard'
import AuthGuard from '@components/auth/AuthGuard'

export default function DashboardRoute() {
  return (
    <AuthGuard>
      <Dashboard />
    </AuthGuard>
  )
}
