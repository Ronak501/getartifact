import { motion } from 'framer-motion'

/**
 * GlassCard — reusable glassmorphism card.
 *
 * Props:
 *   children, className, hover (bool), glow (color hex), animate (bool), padding
 */
export default function GlassCard({
  children,
  className   = '',
  hover       = false,
  glow        = null,
  animate     = false,
  padding     = 'p-6',
  onClick,
}) {
  const glowStyle = glow
    ? { boxShadow: `0 0 40px ${glow}33, 0 8px 32px rgba(0,0,0,0.4)` }
    : {}

  const base = `
    relative rounded-2xl
    bg-white/[0.05] backdrop-blur-md
    border border-white/[0.10]
    ${padding}
    ${hover ? 'cursor-pointer' : ''}
    ${className}
  `.trim()

  if (animate || hover) {
    return (
      <motion.div
        className={base}
        style={glowStyle}
        whileHover={hover ? { y: -4, scale: 1.01, borderColor: 'rgba(255,255,255,0.2)' } : {}}
        transition={{ duration: 0.3 }}
        onClick={onClick}
      >
        {/* Inner highlight */}
        <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-b from-white/[0.06] to-transparent" />
        {children}
      </motion.div>
    )
  }

  return (
    <div className={base} style={glowStyle} onClick={onClick}>
      <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-b from-white/[0.06] to-transparent" />
      {children}
    </div>
  )
}
