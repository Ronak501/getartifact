/**
 * VideoScriptGenerator — Phase 3
 *
 * Converts a blueprint's videoScript section into:
 *   1. A human-readable formatted storyboard string
 *   2. A structured scene-by-scene script object
 *   3. A single-shot AI video generation prompt
 */

/**
 * Format a blueprint's videoScript into a readable storyboard.
 * @param {object} blueprint
 * @returns {string}
 */
export function formatStoryboard(blueprint) {
  const { videoScript, concept } = blueprint
  const lines = []

  lines.push(`# ${concept.websiteName} — Website Preview Storyboard`)
  lines.push(`**Style:** ${videoScript.style}`)
  lines.push(`**Duration:** ${videoScript.duration}s  |  **Resolution:** ${videoScript.resolution}  |  **FPS:** ${videoScript.fps}`)
  lines.push('')
  lines.push('---')
  lines.push('')

  videoScript.scenes.forEach(scene => {
    lines.push(`## Scene ${scene.id}: ${scene.name}`)
    lines.push(`**Duration:** ${scene.duration}s  |  **Camera:** ${scene.camera}`)
    lines.push('')
    lines.push(`**Description:** ${scene.description}`)
    lines.push('')
    lines.push('**Elements:**')
    scene.elements.forEach(el => lines.push(`  - ${el}`))
    lines.push('')
    lines.push('---')
    lines.push('')
  })

  lines.push('## AI Video Generation Prompt')
  lines.push('')
  lines.push('```')
  lines.push(videoScript.aiVideoPrompt)
  lines.push('```')

  return lines.join('\n')
}

/**
 * Generate a timeline representation for visual display.
 * @param {object} videoScript
 * @returns {Array<{id, name, start, end, duration, color}>}
 */
export function buildTimeline(videoScript) {
  const colors = [
    '#3d5eff', '#00d4ff', '#bf5fff',
    '#ff2d78', '#00ff88', '#ffdd00', '#ff8c00',
  ]
  let cursor = 0
  return videoScript.scenes.map((scene, i) => {
    const entry = {
      id:       scene.id,
      name:     scene.name,
      start:    cursor,
      end:      cursor + scene.duration,
      duration: scene.duration,
      color:    colors[i % colors.length],
    }
    cursor += scene.duration
    return entry
  })
}
