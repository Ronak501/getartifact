/** Hex → RGB tuple */
export function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return [r, g, b]
}

/** Hex → Three.js-ready normalised RGB [0,1] */
export function hexToNorm(hex) {
  return hexToRgb(hex).map(v => v / 255)
}

/** Hex with alpha → CSS rgba() */
export function hexAlpha(hex, alpha) {
  const [r, g, b] = hexToRgb(hex)
  return `rgba(${r},${g},${b},${alpha})`
}

/** Lighten/darken a hex color by a percentage (-100 to 100) */
export function adjustBrightness(hex, pct) {
  const [r, g, b] = hexToRgb(hex)
  const factor = 1 + pct / 100
  const clamp  = v => Math.max(0, Math.min(255, Math.round(v * factor)))
  return `#${[clamp(r), clamp(g), clamp(b)].map(v => v.toString(16).padStart(2, '0')).join('')}`
}

/** Build a CSS linear-gradient from two palette colors */
export function paletteGradient(from, to, angle = 135) {
  return `linear-gradient(${angle}deg, ${from}, ${to})`
}

/** Palette → Tailwind-compatible CSS vars object */
export function paletteToVars(palette) {
  return {
    '--color-primary':    palette.primary,
    '--color-secondary':  palette.secondary,
    '--color-accent':     palette.accent,
    '--color-bg':         palette.background,
    '--color-surface':    palette.surface,
    '--color-text':       palette.text,
    '--color-text-muted': palette.textMuted,
  }
}
