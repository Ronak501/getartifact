import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import useAuthStore from '@store/authStore'

export default function Login() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const from      = location.state?.from ?? '/dashboard'

  const { signIn, signInWithGoogle, error, clearError } = useAuthStore()

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [gLoading, setGLoading] = useState(false)

  const handleSubmit = async e => {
    e.preventDefault()
    setLoading(true)
    clearError()
    try {
      await signIn(email, password)
      navigate(from, { replace: true })
    } catch {
      // error already set in store
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = async () => {
    setGLoading(true)
    clearError()
    try { await signInWithGoogle() } catch { setGLoading(false) }
  }

  return (
    <div className="min-h-screen bg-[#0a0a14] flex items-center justify-center px-4 pt-16">
      {/* Background blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-brand-500/10 blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-neon-purple/8 blur-[100px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-md"
      >
        {/* Card */}
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl p-8 shadow-[0_24px_80px_rgba(0,0,0,0.5)]">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-12 h-12 rounded-xl bg-brand-500/20 border border-brand-500/40 flex items-center justify-center mx-auto mb-4">
              <HexIcon />
            </div>
            <h1 className="font-display text-2xl font-bold text-white mb-1">Welcome back</h1>
            <p className="text-sm text-white/40">Sign in to your AI3DBuilder account</p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-5 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/25 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Google */}
          <button
            onClick={handleGoogle}
            disabled={gLoading}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl
              border border-white/[0.10] bg-white/[0.04] hover:bg-white/[0.08]
              text-sm font-medium text-white/80 hover:text-white
              transition-all duration-200 mb-5 disabled:opacity-50"
          >
            {gLoading ? (
              <Spinner />
            ) : (
              <GoogleIcon />
            )}
            Continue with Google
          </button>

          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-white/[0.08]" />
            <span className="text-xs text-white/25">or email</span>
            <div className="flex-1 h-px bg-white/[0.08]" />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="you@example.com"
                className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/[0.10]
                  focus:border-brand-500/60 focus:bg-white/[0.07] focus:outline-none
                  text-sm text-white placeholder:text-white/25
                  transition-all duration-200"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-white/50 mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/[0.10]
                  focus:border-brand-500/60 focus:bg-white/[0.07] focus:outline-none
                  text-sm text-white placeholder:text-white/25
                  transition-all duration-200"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full py-3 rounded-xl bg-brand-500 hover:bg-brand-600
                text-sm font-semibold text-white
                shadow-[0_0_24px_rgba(61,94,255,0.4)] hover:shadow-[0_0_36px_rgba(61,94,255,0.6)]
                transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed
                flex items-center justify-center gap-2"
            >
              {loading ? <Spinner /> : 'Sign In'}
            </button>
          </form>

          {/* Footer */}
          <p className="text-center text-sm text-white/35 mt-6">
            Don't have an account?{' '}
            <Link to="/signup" className="text-brand-400 hover:text-brand-300 font-medium transition-colors">
              Sign up free
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}

function HexIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 16 16" fill="none">
      <polygon points="8,1 14,4.5 14,11.5 8,15 2,11.5 2,4.5" stroke="#3d5eff" strokeWidth="1.2" fill="none" />
      <circle cx="8" cy="8" r="2" fill="#3d5eff" />
    </svg>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  )
}

function Spinner() {
  return (
    <svg className="animate-spin" width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" strokeOpacity="0.3" />
      <path d="M14 8A6 6 0 0 0 8 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}
