const STYLES = {
  blue:   'bg-blue-500/15  text-blue-300  border-blue-500/25',
  purple: 'bg-purple-500/15 text-purple-300 border-purple-500/25',
  green:  'bg-green-500/15  text-green-300  border-green-500/25',
  red:    'bg-red-500/15    text-red-300    border-red-500/25',
  yellow: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/25',
  white:  'bg-white/10      text-white/80   border-white/15',
  neon:   'bg-cyan-400/10   text-cyan-300   border-cyan-400/25',
}

export default function Badge({ children, color = 'blue', dot = false, className = '' }) {
  return (
    <span className={`
      inline-flex items-center gap-1.5
      px-2.5 py-0.5 rounded-full
      text-xs font-medium
      border
      ${STYLES[color] ?? STYLES.blue}
      ${className}
    `}>
      {dot && (
        <span className={`w-1.5 h-1.5 rounded-full ${
          color === 'green' ? 'bg-green-400 animate-pulse' :
          color === 'blue'  ? 'bg-blue-400' :
          'bg-current'
        }`} />
      )}
      {children}
    </span>
  )
}
