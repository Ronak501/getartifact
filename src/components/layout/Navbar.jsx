"use client"

import { useState, useEffect, useRef } from 'react'
import NextLink from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import useAuthStore from '@store/authStore'

// Next.js Navigation Compatibility Helpers
function Link({ to, href, children, className, ...props }) {
  return (
    <NextLink href={to || href} className={className} {...props}>
      {children}
    </NextLink>
  )
}

function NavLink({ to, children, className, end, onClick }) {
  const pathname = usePathname()
  const isActive = end ? pathname === to : pathname.startsWith(to)
  const resolvedClass = typeof className === 'function' ? className({ isActive }) : className
  return (
    <NextLink href={to} className={resolvedClass} onClick={onClick}>
      {children}
    </NextLink>
  )
}

const useNavigate = () => {
  const router = useRouter()
  return (to) => router.push(to)
}

const NAV_LINKS = [
  { to: '/templates', label: 'Templates' },
  { to: '/pricing',   label: 'Pricing' },
  { to: '/docs',      label: 'Docs' },
]

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { user, profile, signOut } = useAuthStore()

  return (
    <div className="fixed top-0 inset-x-0 z-50 flex justify-center px-4 pt-3 pointer-events-none">

      {/* ── Floating pill container ─────────────────────────────────────── */}
      <motion.header
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="pointer-events-auto w-full max-w-4xl"
      >
        <nav className="
          flex items-center justify-between gap-2 px-3 h-12
          rounded-2xl
          bg-[#0d0d1c]/80 backdrop-blur-2xl
          border border-white/[0.09]
          shadow-[0_4px_32px_rgba(0,0,0,0.45),0_0_0_1px_rgba(255,255,255,0.03)]
        ">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group flex-shrink-0 pl-1">
            <div className="w-7 h-7 rounded-lg bg-brand-500/20 border border-brand-500/35
              flex items-center justify-center group-hover:border-brand-400/55
              group-hover:bg-brand-500/30 transition-all duration-200">
              <HexIcon />
            </div>
            <span className="font-display font-bold text-white text-[13px] tracking-wide">
              Get<span className="text-brand-400">Artifact</span>
            </span>
          </Link>

          {/* Divider */}
          <div className="hidden md:block w-px h-4 bg-white/[0.10] mx-1" />

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-0.5 flex-1">
            {NAV_LINKS.map(link => (
              <NavLink
                key={link.to} to={link.to} end={link.to === '/'}
                className={({ isActive }) => `
                  px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all duration-150
                  ${isActive
                    ? 'text-white bg-white/[0.09]'
                    : 'text-white/45 hover:text-white hover:bg-white/[0.06]'}
                `}
              >
                {link.label}
              </NavLink>
            ))}
          </div>

          {/* Right side */}
          <div className="hidden md:flex items-center gap-1.5 flex-shrink-0 pr-1">
            {user ? (
              <UserMenu user={user} profile={profile} onSignOut={signOut} />
            ) : (
              <>
                <Link to="/login"
                  className="px-3 py-1.5 rounded-lg text-[13px] font-medium text-white/50
                    hover:text-white hover:bg-white/[0.06] transition-all duration-150">
                  Sign In
                </Link>
                <Link to="/signup"
                  className="px-4 py-1.5 rounded-xl text-[13px] font-semibold text-white
                    bg-brand-500 hover:bg-brand-600
                    shadow-[0_0_14px_rgba(61,94,255,0.4)]
                    hover:shadow-[0_0_22px_rgba(61,94,255,0.6)]
                    transition-all duration-200">
                  Get Started
                </Link>
              </>
            )}
          </div>

          {/* Mobile toggle */}
          <button
            className="md:hidden p-1.5 rounded-lg text-white/50 hover:text-white
              hover:bg-white/[0.07] transition-colors mr-1"
            onClick={() => setMobileOpen(o => !o)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <XIcon /> : <MenuIcon />}
          </button>
        </nav>

        {/* Mobile dropdown — attached below the pill */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="mt-2 rounded-2xl border border-white/[0.09]
                bg-[#0d0d1c]/95 backdrop-blur-2xl overflow-hidden
                shadow-[0_8px_40px_rgba(0,0,0,0.5)]"
            >
              <div className="p-2 flex flex-col gap-0.5">
                {NAV_LINKS.map(link => (
                  <NavLink key={link.to} to={link.to} end={link.to === '/'}
                    onClick={() => setMobileOpen(false)}
                    className={({ isActive }) => `
                      px-4 py-2.5 rounded-xl text-sm font-medium
                      ${isActive ? 'text-white bg-white/[0.08]' : 'text-white/50 hover:text-white hover:bg-white/[0.05]'}
                    `}
                  >
                    {link.label}
                  </NavLink>
                ))}

                <div className="my-1 h-px bg-white/[0.07] mx-2" />

                {user ? (
                  <>
                    <Link to="/dashboard" onClick={() => setMobileOpen(false)}
                      className="px-4 py-2.5 rounded-xl text-sm font-medium text-white/50 hover:text-white hover:bg-white/[0.05]">
                      Dashboard
                    </Link>
                    <Link to="/history" onClick={() => setMobileOpen(false)}
                      className="px-4 py-2.5 rounded-xl text-sm font-medium text-white/50 hover:text-white hover:bg-white/[0.05]">
                      History
                    </Link>
                    <button onClick={() => { signOut(); setMobileOpen(false) }}
                      className="text-left px-4 py-2.5 rounded-xl text-sm font-medium text-red-400/70 hover:text-red-400 hover:bg-red-500/[0.08]">
                      Sign Out
                    </button>
                  </>
                ) : (
                  <div className="flex gap-2 p-1">
                    <Link to="/login" onClick={() => setMobileOpen(false)}
                      className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-white/50
                        hover:text-white border border-white/[0.09] hover:bg-white/[0.05] text-center transition-all">
                      Sign In
                    </Link>
                    <Link to="/signup" onClick={() => setMobileOpen(false)}
                      className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white
                        bg-brand-500 hover:bg-brand-600 text-center transition-all">
                      Get Started
                    </Link>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>
    </div>
  )
}

/* ─── User avatar + dropdown ──────────────────────────────────────────────── */
function UserMenu({ user, profile, onSignOut }) {
  const [open, setOpen]   = useState(false)
  const ref               = useRef(null)
  const navigate          = useNavigate()

  const displayName = profile?.display_name ?? user.email?.split('@')[0] ?? 'User'
  const initials    = displayName.slice(0, 2).toUpperCase()

  // Close on outside click
  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const go = to => { setOpen(false); navigate(to) }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-xl hover:bg-white/[0.06] transition-all"
      >
        {/* Avatar */}
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-neon-purple
          flex items-center justify-center text-white text-xs font-bold
          shadow-[0_0_16px_rgba(61,94,255,0.4)]">
          {initials}
        </div>
        <span className="text-sm text-white/75 font-medium max-w-[100px] truncate hidden lg:block">
          {displayName}
        </span>
        <ChevronIcon open={open} />
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-52 rounded-2xl border border-white/[0.10]
              bg-[#0f0f1e]/95 backdrop-blur-xl shadow-[0_16px_48px_rgba(0,0,0,0.5)]
              overflow-hidden z-50"
          >
            {/* User info */}
            <div className="px-4 py-3 border-b border-white/[0.07]">
              <p className="text-xs font-semibold text-white">{displayName}</p>
              <p className="text-2xs text-white/35 truncate">{user.email}</p>
            </div>

            {/* Menu items */}
            <div className="p-1.5 flex flex-col gap-0.5">
              <DropItem icon="⚡" label="Dashboard" onClick={() => go('/dashboard')} />
              <DropItem icon="🕘" label="History"   onClick={() => go('/history')} />
              <DropItem icon="🏗️" label="Builder"   onClick={() => go('/builder')} />
            </div>

            <div className="p-1.5 border-t border-white/[0.07]">
              <DropItem
                icon="↪"
                label="Sign Out"
                onClick={() => { onSignOut(); setOpen(false) }}
                danger
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function DropItem({ icon, label, onClick, danger }) {
  return (
    <button onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium
        transition-all duration-150 text-left
        ${danger
          ? 'text-red-400/80 hover:text-red-400 hover:bg-red-500/10'
          : 'text-white/60 hover:text-white hover:bg-white/[0.07]'}
      `}>
      <span className="text-base w-5 text-center">{icon}</span>
      {label}
    </button>
  )
}

function ChevronIcon({ open }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none"
      className={`transition-transform duration-200 ${open ? 'rotate-180' : ''} text-white/40`}>
      <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function HexIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <polygon points="8,1 14,4.5 14,11.5 8,15 2,11.5 2,4.5" stroke="#3d5eff" strokeWidth="1.2" fill="none" />
      <circle cx="8" cy="8" r="2" fill="#3d5eff" />
    </svg>
  )
}
function MenuIcon() {
  return <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
}
function XIcon() {
  return <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
}
