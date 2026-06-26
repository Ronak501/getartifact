/**
 * Export utilities — download blueprint JSON or generated code as files.
 */

/** Trigger browser download of any string as a file */
function downloadString(content, filename, mime = 'text/plain') {
  const blob = new Blob([content], { type: mime })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/** Download blueprint as JSON */
export function exportBlueprintJSON(blueprint) {
  const name = blueprint.concept?.websiteName?.replace(/\s+/g, '-').toLowerCase() || 'blueprint'
  downloadString(JSON.stringify(blueprint, null, 2), `${name}-blueprint.json`, 'application/json')
}

/** Download generated code file */
export function exportCodeFile(code, filename) {
  downloadString(code, filename, 'text/javascript')
}

/** Copy text to clipboard, returns a promise */
export function copyToClipboard(text) {
  return navigator.clipboard.writeText(text)
}

/** Format file size */
export function formatBytes(bytes) {
  if (bytes < 1024)       return `${bytes} B`
  if (bytes < 1024 ** 2)  return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`
}
