/**
 * useScrollAnimation — IntersectionObserver-based scroll trigger.
 * Returns { isVisible, ref } — attach ref to any DOM element.
 */

import { useEffect, useRef, useState } from 'react'

export function useScrollAnimation(externalRef, options = {}) {
  const internalRef = useRef(null)
  const ref = externalRef ?? internalRef
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          if (!options.repeat) observer.disconnect()
        } else if (options.repeat) {
          setIsVisible(false)
        }
      },
      {
        threshold: options.threshold ?? 0.15,
        rootMargin: options.rootMargin ?? '0px 0px -60px 0px',
      }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [ref, options.threshold, options.rootMargin, options.repeat])

  return { isVisible, ref }
}
