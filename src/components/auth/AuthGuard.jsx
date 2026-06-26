import { Navigate, useLocation } from 'react-router-dom'
import useAuthStore from '@store/authStore'

/**
 * AuthGuard — wraps routes that require a logged-in user.
 * Redirects to /login and remembers the attempted destination.
 * Shows nothing while the initial session check is in progress.
 */
export default function AuthGuard({ children }) {
  const { user, loading } = useAuthStore()
  const location          = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a14] flex items-center justify-center">
        <svg className="animate-spin w-8 h-8 text-brand-400" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeOpacity="0.2" />
          <path d="M22 12A10 10 0 0 0 12 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }

  return children
}
