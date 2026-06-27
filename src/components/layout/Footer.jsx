"use client"

import NextLink from 'next/link'

function Link({ to, href, children, className, ...props }) {
  return (
    <NextLink href={to || href} className={className} {...props}>
      {children}
    </NextLink>
  )
}

export default function Footer() {
  return (
    <footer className="border-t border-white/[0.07] bg-[#0a0a14]">
      <div className="max-w-7xl mx-auto px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="font-display font-bold text-white/60 text-sm">
            Tech<span className="text-brand-400">Sodh</span>
          </span>
          <span className="text-white/20 text-sm">—</span>
          <span className="text-white/30 text-xs">AI-Powered Website Generation</span>
        </div>

        <div className="flex items-center gap-6">
          <Link to="/"        className="text-xs text-white/30 hover:text-white/60 transition-colors">Home</Link>
          <Link to="/builder" className="text-xs text-white/30 hover:text-white/60 transition-colors">Builder</Link>
          <Link to="/templates" className="text-xs text-white/30 hover:text-white/60 transition-colors">Templates</Link>
          <Link to="/pricing"   className="text-xs text-white/30 hover:text-white/60 transition-colors">Pricing</Link>
        </div>

        <p className="text-xs text-white/20">
          © 2026 Getartifactact · All rights reserved
        </p>
      </div>
    </footer>
  )
}
