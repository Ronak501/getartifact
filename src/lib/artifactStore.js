import { supabase } from '@lib/supabase'

export async function getArtifacts(userId) {
  if (!userId) return { data: [], error: null }
  return supabase
    .from('artifacts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
}

export async function addArtifact(artifactData) {
  return supabase
    .from('artifacts')
    .insert(artifactData)
    .select()
    .single()
}

export async function deleteArtifact(artifactId) {
  return supabase
    .from('artifacts')
    .delete()
    .eq('id', artifactId)
}

export async function toggleFavorite(artifactId, currentState) {
  return supabase
    .from('artifacts')
    .update({ is_favorited: !currentState })
    .eq('id', artifactId)
    .select('id, is_favorited')
    .single()
}
