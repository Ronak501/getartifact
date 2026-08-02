"use client"

export default function ArtifactCard({ artifact, deleting, onToggleFavorite, onDelete }) {
  const promptText = artifact.prompt?.trim() || 'Untitled artifact'
  const previewText = getOutputPreviewText(artifact.output)
  const previewImage = getOutputPreviewImage(artifact.output)
  const createdAt = new Date(artifact.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 flex flex-col gap-3">
      {previewImage ? (
        <img
          src={previewImage}
          alt="Artifact preview"
          className="w-full h-32 object-cover rounded-xl border border-white/[0.08]"
        />
      ) : (
        <div className="w-full h-32 rounded-xl border border-white/[0.08] bg-white/[0.02] p-3 overflow-hidden">
          <p className="text-xs text-white/50 leading-relaxed line-clamp-5">{previewText}</p>
        </div>
      )}

      <div>
        <h3 className="text-sm font-semibold text-white line-clamp-2">{promptText}</h3>
        <p className="text-xs text-white/30 mt-1">{createdAt}</p>
      </div>

      <div className="flex items-center justify-between gap-2 mt-auto">
        <button
          onClick={() => onToggleFavorite(artifact.id, artifact.is_favorited)}
          className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
            artifact.is_favorited
              ? 'border-yellow-400/50 text-yellow-300 bg-yellow-500/10'
              : 'border-white/[0.12] text-white/50 hover:text-white'
          }`}
        >
          {artifact.is_favorited ? '★ Favorited' : '☆ Favorite'}
        </button>

        <button
          onClick={() => onDelete(artifact.id)}
          disabled={deleting}
          className="text-xs px-2.5 py-1 rounded-lg border border-red-400/30 text-red-300 hover:text-red-200 disabled:opacity-60"
        >
          {deleting ? 'Deleting...' : 'Delete'}
        </button>
      </div>
    </div>
  )
}

function getOutputPreviewImage(output) {
  return (
    output?.modelAsset?.previewUrl ||
    output?.modelAsset?.modelUrl ||
    output?.previewUrl ||
    null
  )
}

function getOutputPreviewText(output) {
  if (!output) return 'No output preview available.'
  if (typeof output === 'string') return output
  if (output?.concept?.websiteName) {
    const style = output?.concept?.designStyle ? ` (${output.concept.designStyle})` : ''
    return `${output.concept.websiteName}${style}`
  }
  const serialized = JSON.stringify(output)
  return serialized.length > 260 ? `${serialized.slice(0, 260)}…` : serialized
}
