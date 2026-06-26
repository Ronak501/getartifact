import { useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Navbar    from '@components/layout/Navbar'
import Footer    from '@components/layout/Footer'
import AuthGuard from '@components/auth/AuthGuard'
import Home      from '@pages/Home'
import Builder   from '@pages/Builder'
import Login     from '@pages/Login'
import Signup    from '@pages/Signup'
import Dashboard from '@pages/Dashboard'
import useAuthStore from '@store/authStore'
import Pricing    from '@pages/Pricing'
import Templates  from '@pages/Templates'

export default function App() {
  const init = useAuthStore(s => s.init)

  // Bootstrap Supabase session once on mount
  useEffect(() => { init() }, [init])

  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col bg-[#0a0a14] text-white">
        <Navbar />
        <div className="flex-1">
          <Routes>
            <Route path="/"          element={<Home />} />
            <Route path="/builder"   element={<Builder />} />
            <Route path="/pricing"    element={<Pricing />} />
            <Route path="/templates" element={<Templates />} />
            <Route path="/login"     element={<Login />} />
            <Route path="/signup"    element={<Signup />} />
            <Route path="/dashboard" element={
              <AuthGuard>
                <Dashboard />
              </AuthGuard>
            } />
          </Routes>
        </div>
        <Footer />
      </div>
    </BrowserRouter>
  )
}
