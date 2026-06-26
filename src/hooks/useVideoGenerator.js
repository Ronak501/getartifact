/**
 * useVideoGenerator — manages Veo 2 video generation state.
 *
 * Uses fetch() with a ReadableStream to consume the server's SSE-style
 * streaming response from /api/generate-video.
 *
 * States:
 *   idle → starting → processing → complete | error
 */

import { useState, useRef, useCallback } from 'react'

export const VIDEO_GEN_STATUS = {
  IDLE:       'idle',
  STARTING:   'starting',
  PROCESSING: 'processing',
  COMPLETE:   'complete',
  ERROR:      'error',
}

export function useVideoGenerator() {
  const [status,   setStatus]   = useState(VIDEO_GEN_STATUS.IDLE)
  const [message,  setMessage]  = useState('')
  const [progress, setProgress] = useState(0)
  const [videoUrl, setVideoUrl] = useState(null)
  const [videoUri, setVideoUri] = useState(null)   // raw gs:// or https:// URI
  const [elapsed,  setElapsed]  = useState(0)
  const abortRef  = useRef(null)
  const timerRef  = useRef(null)

  const generate = useCallback(async (veoPrompt) => {
    if (!veoPrompt?.trim()) return

    // Reset
    setStatus(VIDEO_GEN_STATUS.STARTING)
    setMessage('Sending to Veo 2...')
    setProgress(0)
    setVideoUrl(null)
    setVideoUri(null)
    setElapsed(0)

    // Elapsed timer
    const start = Date.now()
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000))
    }, 1000)

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const res = await fetch('/api/generate-video', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ veoPrompt }),
        signal:  controller.signal,
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
        throw new Error(err.error || `Server error ${res.status}`)
      }

      // Stream SSE events from the server
      const reader  = res.body.getReader()
      const decoder = new TextDecoder()
      let   buffer  = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        // Parse complete SSE lines
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''   // keep incomplete last line

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const event = JSON.parse(line.slice(6))
            handleEvent(event)
          } catch {
            // ignore malformed lines
          }
        }
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        setStatus(VIDEO_GEN_STATUS.IDLE)
        setMessage('')
      } else {
        setStatus(VIDEO_GEN_STATUS.ERROR)
        setMessage(err.message)
      }
    } finally {
      clearInterval(timerRef.current)
    }

    function handleEvent(event) {
      switch (event.status) {
        case 'starting':
          setStatus(VIDEO_GEN_STATUS.STARTING)
          setMessage(event.message)
          setProgress(5)
          break

        case 'processing':
          setStatus(VIDEO_GEN_STATUS.PROCESSING)
          setMessage(event.message)
          setProgress(Math.min(90, (event.progress ?? 0) * 100))
          break

        case 'complete':
          setStatus(VIDEO_GEN_STATUS.COMPLETE)
          setMessage('Video ready!')
          setProgress(100)
          setVideoUri(event.videoUri)
          // Proxy the GCS URI through our server so the browser can play it
          if (event.videoUri?.startsWith('gs://')) {
            setVideoUrl(`/api/video-proxy?uri=${encodeURIComponent(event.videoUri)}`)
          } else {
            setVideoUrl(event.videoUri)
          }
          clearInterval(timerRef.current)
          break

        case 'error':
          setStatus(VIDEO_GEN_STATUS.ERROR)
          setMessage(event.message)
          clearInterval(timerRef.current)
          break
      }
    }
  }, [])

  const cancel = useCallback(() => {
    abortRef.current?.abort()
    clearInterval(timerRef.current)
    setStatus(VIDEO_GEN_STATUS.IDLE)
    setMessage('')
    setProgress(0)
  }, [])

  const reset = useCallback(() => {
    cancel()
    setVideoUrl(null)
    setVideoUri(null)
    setElapsed(0)
  }, [cancel])

  return {
    status,
    message,
    progress,
    videoUrl,
    videoUri,
    elapsed,
    generate,
    cancel,
    reset,
    isRunning: status === VIDEO_GEN_STATUS.STARTING || status === VIDEO_GEN_STATUS.PROCESSING,
  }
}
