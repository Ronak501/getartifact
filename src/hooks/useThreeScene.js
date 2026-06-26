/**
 * useThreeScene — utility hook for common Three.js patterns.
 * Provides: mouse tracking, scroll progress, reduced-motion check.
 */

import { useEffect, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'

/** Track normalised mouse position [-1, 1] */
export function useMouseTracker() {
  const mouse = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const handler = e => {
      mouse.current.x = (e.clientX / window.innerWidth)  * 2 - 1
      mouse.current.y = -(e.clientY / window.innerHeight) * 2 + 1
    }
    window.addEventListener('mousemove', handler, { passive: true })
    return () => window.removeEventListener('mousemove', handler)
  }, [])

  return mouse
}

/** Smoothly lerp a ref value toward target each frame */
export function useSmoothValue(initial = 0, lerpFactor = 0.05) {
  const current  = useRef(initial)
  const target   = useRef(initial)

  const set = val => { target.current = val }

  useFrame(() => {
    current.current += (target.current - current.current) * lerpFactor
  })

  return { current, set }
}

/** Check OS reduced-motion preference */
export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handler = e => setReduced(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  return reduced
}

/** Scroll progress [0,1] based on page scroll */
export function useScrollProgress() {
  const progress = useRef(0)

  useEffect(() => {
    const handler = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight
      progress.current = max > 0 ? window.scrollY / max : 0
    }
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  return progress
}
