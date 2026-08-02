import HistoryPage from '@pages/HistoryPage'
import AuthGuard from '@components/auth/AuthGuard'

export default function HistoryRoute() {
  return (
    <AuthGuard>
      <HistoryPage />
    </AuthGuard>
  )
}
