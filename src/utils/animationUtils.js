/**
 * Shared Framer Motion & GSAP animation presets.
 * Import these instead of redefining inline every time.
 */

// ─── Framer Motion variants ───────────────────────────────────────────────────

export const fadeUp = {
  hidden:  { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } },
}

export const fadeIn = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.6 } },
}

export const scaleIn = {
  hidden:  { opacity: 0, scale: 0.85 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: [0.34, 1.56, 0.64, 1] } },
}

export const slideLeft = {
  hidden:  { opacity: 0, x: -40 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
}

export const slideRight = {
  hidden:  { opacity: 0, x: 40 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
}

/** Stagger container */
export const staggerContainer = (stagger = 0.1, delay = 0) => ({
  hidden:  {},
  visible: { transition: { staggerChildren: stagger, delayChildren: delay } },
})

/** Card hover effect */
export const cardHover = {
  rest:  { scale: 1,    y: 0,  transition: { duration: 0.3 } },
  hover: { scale: 1.02, y: -4, transition: { duration: 0.3, ease: 'easeOut' } },
}

// ─── GSAP helpers ─────────────────────────────────────────────────────────────

/** GSAP-style ease strings mapped to CSS cubic-bezier */
export const EASES = {
  smooth:  'cubic-bezier(0.16, 1, 0.3, 1)',
  spring:  'cubic-bezier(0.34, 1.56, 0.64, 1)',
  sharp:   'cubic-bezier(0.4, 0, 0.2, 1)',
  linear:  'linear',
}
