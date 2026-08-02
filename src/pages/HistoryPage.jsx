"use client"

import { useEffect, useState } from 'react'
import { getArtifacts, deleteArtifact, toggleFavorite } from '@lib/artifactStore'
import HistoryGallery from '@components/HistoryGallery'
import useAuthStore from '@store/authStore'

export default function HistoryPage() {
  const { user } = useAuthStore()
  const [artifacts, setArtifacts] = useState([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user?.id) return
    loadArtifacts(user.id)
  }, [user?.id])

  const loadArtifacts = async (userId) => {
    setLoading(true)
    setError('')
    const { data, error: fetchError } = await getArtifacts(userId)
    if (fetchError) {
      setError('Failed to load artifacts.')
      setLoading(false)
      return
    }
    setArtifacts(data ?? [])
    setLoading(false)
  }

  const handleToggleFavorite = async (artifactId, currentState) => {
    const previous = artifacts
    setArtifacts((items) =>
      items.map((item) =>
        item.id === artifactId ? { ...item, is_favorited: !currentState } : item,
      ),
    )

    const { error: updateError } = await toggleFavorite(artifactId, currentState)
    if (updateError) {
      setArtifacts(previous)
      setError('Failed to update artifact.')
    }
  }

  const handleDelete = async (artifactId) => {
    const confirmed = window.confirm('Delete this artifact permanently?')
    if (!confirmed) return

    setDeletingId(artifactId)
    const { error: deleteError } = await deleteArtifact(artifactId)
    if (deleteError) {
      setError('Failed to delete artifact.')
      setDeletingId(null)
      return
    }

    setArtifacts((items) => items.filter((item) => item.id !== artifactId))
    setDeletingId(null)
  }

  return (
    <div className="min-h-screen bg-[#0a0a14] pt-16">
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-white">Artifact History</h1>
          <p className="text-sm text-white/45 mt-2">
            View, favorite, and manage your generated artifacts.
          </p>
        </div>

        {error ? (
          <div className="mb-5 rounded-xl border border-red-400/25 bg-red-500/10 text-red-200 text-sm px-4 py-2.5">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-56 rounded-2xl border border-white/[0.07] bg-white/[0.02] animate-pulse"
              />
            ))}
          </div>
        ) : (
          <HistoryGallery
            artifacts={artifacts}
            deletingId={deletingId}
            onToggleFavorite={handleToggleFavorite}
            onDelete={handleDelete}
          />
        )}
      </div>
    </div>
  )
}
