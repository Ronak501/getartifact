/**
 * CameraRig — smoothly follows the mouse position.
 * Drop inside any <Canvas> to get subtle parallax camera movement.
 */

import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'

export default function CameraRig({ intensity = 0.3, lerpFactor = 0.05 }) {
  const { camera } = useThree()
  const mouse = useRef({ x: 0, y: 0 })
  const target = useRef({ x: 0, y: 0 })

  // Track mouse globally
  if (typeof window !== 'undefined') {
    window.__cameraRigMouse = mouse
  }

  useFrame(({ pointer }) => {
    target.current.x = pointer.x * intensity
    target.current.y = pointer.y * intensity * 0.6

    mouse.current.x += (target.current.x - mouse.current.x) * lerpFactor
    mouse.current.y += (target.current.y - mouse.current.y) * lerpFactor

    camera.position.x = mouse.current.x
    camera.position.y = mouse.current.y
    camera.lookAt(0, 0, 0)
  })

  return null
}
