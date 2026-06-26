import { motion } from 'framer-motion'

const VARIANTS = {
  primary: `
    bg-brand-500 hover:bg-brand-600 text-white
    shadow-[0_0_20px_rgba(61,94,255,0.4)] hover:shadow-[0_0_35px_rgba(61,94,255,0.65)]
    border border-brand-400/30
  `,
  secondary: `
    bg-white/[0.08] hover:bg-white/[0.14] text-white
    border border-white/[0.12] hover:border-white/[0.25]
    backdrop-blur-sm
  `,
  ghost: `
    bg-transparent hover:bg-white/[0.06] text-white/70 hover:text-white
    border border-white/[0.10] hover:border-white/[0.2]
  `,
  danger: `
    bg-red-500/20 hover:bg-red-500/30 text-red-400
    border border-red-500/30
  `,
  neon: `
    bg-transparent text-neon-blue
    border border-neon-blue/50 hover:border-neon-blue
    shadow-[0_0_15px_rgba(0,212,255,0.3)] hover:shadow-[0_0_30px_rgba(0,212,255,0.6)]
  `,
}

const SIZES = {
  sm:  'px-3 py-1.5 text-sm rounded-lg',
  md:  'px-5 py-2.5 text-sm rounded-xl',
  lg:  'px-7 py-3.5 text-base rounded-xl',
  xl:  'px-9 py-4 text-lg rounded-2xl',
}

export default function Button({
  children,
  variant   = 'primary',
  size      = 'md',
  icon,
  iconRight,
  loading   = false,
  disabled  = false,
  className = '',
  onClick,
  type      = 'button',
}) {
  const base = `
    inline-flex items-center justify-center gap-2
    font-medium transition-all duration-200
    select-none outline-none focus-visible:ring-2 focus-visible:ring-brand-400/60
    disabled:opacity-40 disabled:cursor-not-allowed
    ${VARIANTS[variant] ?? VARIANTS.primary}
    ${SIZES[size]       ?? SIZES.md}
    ${className}
  `.trim()

  return (
    <motion.button
      type={type}
      className={base}
      disabled={disabled || loading}
      whileTap={!disabled && !loading ? { scale: 0.97 } : {}}
      onClick={onClick}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
      )}
      {!loading && icon && <span>{icon}</span>}
      {children}
      {!loading && iconRight && <span>{iconRight}</span>}
    </motion.button>
  )
}
