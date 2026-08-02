"use client"

import { Link } from '@lib/router-shim'
import ArtifactCard from '@components/ArtifactCard'

export default function HistoryGallery({ artifacts, deletingId, onToggleFavorite, onDelete }) {
  if (!artifacts.length) {
    return (
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-10 text-center">
        <p className="text-white text-lg font-semibold">No artifacts yet</p>
        <p className="text-white/45 text-sm mt-2">
          Create your first artifact from the builder to see it here.
        </p>
        <Link
          to="/builder"
          className="inline-flex mt-5 px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-sm font-semibold text-white"
        >
          Go to Builder
        </Link>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {artifacts.map((artifact) => (
        <ArtifactCard
          key={artifact.id}
          artifact={artifact}
          deleting={deletingId === artifact.id}
          onToggleFavorite={onToggleFavorite}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
}
