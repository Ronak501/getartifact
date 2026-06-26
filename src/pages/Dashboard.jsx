import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@lib/supabase'
import useAuthStore from '@store/authStore'
import useBlueprintStore, { OUTPUT_TABS } from '@store/blueprintStore'
import useCreditStore from '@store/creditStore'
import { PLANS } from '@store/subscriptionStore'

export default function Dashboard() {
  const { user, profile } = useAuthStore()
  const navigate           = useNavigate()

  const [blueprints, setBlueprints] = useState([])
  const [loading,    setLoading]    = useState(true)
  const [deleting,   setDeleting]   = useState(null)
  const [filter,     setFilter]     = useState('all')   // all | favorite

  useEffect(() => {
    if (!user) return
    fetchBlueprints()
  }, [user, filter])

  const fetchBlueprints = async () => {
    setLoading(true)
    let query = supabase
      .from('blueprint_summary')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (filter === 'favorite') query = query.eq('is_favorite', true)

    const { data, error } = await query
    if (!error) setBlueprints(data ?? [])
    setLoading(false)
  }

  const handleLoad = async (id) => {
    // Fetch the full blueprint data
    const { data } = await supabase
      .from('blueprints')
      .select('blueprint_json, website_blueprint_json, veo_data_json, prompt')
      .eq('id', id)
      .single()

    if (!data) return

    const store = useBlueprintStore.getState()
    store.finishGeneration(
      data.blueprint_json,
      data.blueprint_json?.intent ?? null,
      data.website_blueprint_json,
      data.veo_data_json,
    )
    store.setPrompt(data.prompt ?? '')
    navigate('/builder')
  }

  const handleDelete = async (id) => {
    setDeleting(id)
    await supabase.from('blueprints').delete().eq('id', id)
    setBlueprints(prev => prev.filter(b => b.id !== id))
    setDeleting(null)
  }

  const handleToggleFavorite = async (id, current) => {
    await supabase.from('blueprints').update({ is_favorite: !current }).eq('id', id)
    setBlueprints(prev => prev.map(b => b.id === id ? { ...b, is_favorite: !current } : b))
  }

  const credits     = useCreditStore()
  const displayName = profile?.display_name ?? user?.email?.split('@')[0] ?? 'User'
  const initials    = displayName.slice(0, 2).toUpperCase()
  const planInfo    = PLANS.find(p => p.id === credits.plan) ?? null

  return (
    <div className="min-h-screen bg-[#0a0a14] pt-16">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/3 w-[600px] h-96 bg-brand-500/6 blur-[120px] rounded-full" />
      </div>

      <div className="max-w-6xl mx-auto px-6 py-10 relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-neon-purple flex items-center justify-center text-white font-bold text-lg shadow-[0_0_30px_rgba(61,94,255,0.4)]">
              {initials}
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold text-white">{displayName}</h1>
              <p className="text-sm text-white/35">
                {blueprints.length} build{blueprints.length !== 1 ? 's' : ''} ·{' '}
                <span className="capitalize text-brand-400">{profile?.plan ?? 'free'} plan</span>
              </p>
            </div>
          </div>

          <Link to="/builder"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600
              text-sm font-semibold text-white shadow-[0_0_24px_rgba(61,94,255,0.4)]
              transition-all duration-200">
            <span>+</span> New Build
          </Link>
        </div>

        {/* Credit usage card */}
        <CreditBar credits={credits} planInfo={planInfo} />

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Total Builds',    value: blueprints.length },
            { label: 'With Veo Video',  value: blueprints.filter(b => b.has_veo).length },
            { label: 'Favorites',       value: blueprints.filter(b => b.is_favorite).length },
          ].map(stat => (
            <div key={stat.label}
              className="rounded-xl border border-white/[0.07] bg-white/[0.03] px-5 py-4">
              <p className="text-2xl font-bold text-white font-display">{stat.value}</p>
              <p className="text-xs text-white/35 mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-6">
          {['all', 'favorite'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-lg text-xs font-medium capitalize transition-all
                ${filter === f ? 'bg-white/[0.10] text-white' : 'text-white/35 hover:text-white/60'}`}>
              {f === 'all' ? 'All Builds' : '⭐ Favorites'}
            </button>
          ))}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1,2,3].map(i => (
              <div key={i} className="rounded-2xl border border-white/[0.07] bg-white/[0.02] h-48 animate-pulse" />
            ))}
          </div>
        ) : blueprints.length === 0 ? (
          <EmptyState filter={filter} />
        ) : (
          <motion.div
            layout
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
          >
            <AnimatePresence>
              {blueprints.map(bp => (
                <motion.div
                  key={bp.id}
                  layout
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3 }}
                >
                  <BlueprintCard
                    bp={bp}
                    onLoad={handleLoad}
                    onDelete={handleDelete}
                    onFavorite={handleToggleFavorite}
                    deleting={deleting === bp.id}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </div>
  )
}

/* ─── Blueprint Card ──────────────────────────────────────────────────────── */
function BlueprintCard({ bp, onLoad, onDelete, onFavorite, deleting }) {
  const [showConfirm, setShowConfirm] = useState(false)
  const primary   = bp.color_primary   ?? '#3d5eff'
  const secondary = '#00d4ff'
  const accent    = '#bf5fff'

  const date = new Date(bp.created_at).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })

  return (
    <div className="group relative rounded-2xl border border-white/[0.08] bg-white/[0.03]
      hover:border-white/[0.16] hover:bg-white/[0.05]
      transition-all duration-300 overflow-hidden flex flex-col">

      {/* Color band preview */}
      <div className="h-2 flex-shrink-0" style={{
        background: `linear-gradient(90deg, ${primary}, ${accent}, ${secondary})`,
      }} />

      <div className="p-5 flex flex-col gap-3 flex-1">
        {/* Title row */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-white truncate">{bp.name}</h3>
            {bp.design_style && (
              <span className="inline-block mt-1 text-2xs font-medium px-2 py-0.5 rounded
                bg-white/[0.06] text-white/45 border border-white/[0.08]">
                {bp.design_style}
              </span>
            )}
          </div>
          <button
            onClick={() => onFavorite(bp.id, bp.is_favorite)}
            className="flex-shrink-0 text-base leading-none"
            title={bp.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            {bp.is_favorite ? '⭐' : '☆'}
          </button>
        </div>

        {/* Prompt preview */}
        <p className="text-xs text-white/35 leading-relaxed line-clamp-2">{bp.prompt}</p>

        {/* Badges */}
        <div className="flex flex-wrap gap-1.5">
          {bp.has_preview && (
            <span className="text-2xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">
              Preview
            </span>
          )}
          {bp.has_veo && (
            <span className="text-2xs px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
              Veo 2
            </span>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-auto pt-3 border-t border-white/[0.06]">
          <span className="text-2xs text-white/25">{date}</span>

          <div className="flex items-center gap-2">
            {showConfirm ? (
              <>
                <button onClick={() => setShowConfirm(false)}
                  className="text-xs text-white/40 hover:text-white/70 transition-colors">
                  Cancel
                </button>
                <button
                  onClick={() => { onDelete(bp.id); setShowConfirm(false) }}
                  disabled={deleting}
                  className="text-xs text-red-400 hover:text-red-300 transition-colors">
                  {deleting ? '...' : 'Confirm'}
                </button>
              </>
            ) : (
              <>
                <button onClick={() => setShowConfirm(true)}
                  className="text-xs text-white/25 hover:text-red-400 transition-colors">
                  Delete
                </button>
                <button
                  onClick={() => onLoad(bp.id)}
                  className="text-xs font-semibold text-brand-400 hover:text-brand-300 transition-colors">
                  Load →
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Credit Bar ──────────────────────────────────────────────────────────── */
function CreditBar({ credits, planInfo }) {
  const { plan, builds_used, builds_limit, can_build } = credits
  const isUnlimited = builds_limit === -1
  const pct         = isUnlimited ? 0 : Math.min(100, Math.round((builds_used / (builds_limit || 1)) * 100))
  const color       = planInfo?.model?.color ?? '#3d5eff'
  const remaining   = isUnlimited ? '∞' : Math.max(0, builds_limit - builds_used)

  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] px-5 py-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          {planInfo && (
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-mono font-semibold tracking-widest"
              style={{ background: planInfo.model.bgColor, border: `1px solid ${planInfo.model.borderColor}`, color }}
            >
              {planInfo.model.icon} {planInfo.model.badge}
            </span>
          )}
          <span className="text-sm font-semibold text-white capitalize">{plan} Plan</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-white/40">
            {isUnlimited ? 'Unlimited builds' : `${remaining} build${remaining !== 1 ? 's' : ''} remaining`}
          </span>
          <Link to="/pricing"
            className="text-xs font-medium px-2.5 py-1 rounded-lg transition-colors"
            style={{ background: `${color}14`, border: `1px solid ${color}30`, color }}>
            {plan === 'pro' ? 'Manage' : 'Upgrade'}
          </Link>
        </div>
      </div>

      {!isUnlimited && (
        <>
          <div className="h-1.5 rounded-full bg-white/[0.07] overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
              style={{ background: pct >= 90 ? '#ef4444' : pct >= 70 ? '#f59e0b' : color }}
            />
          </div>
          <div className="flex items-center justify-between mt-1.5">
            <span className="text-2xs text-white/25">{builds_used} used</span>
            <span className="text-2xs text-white/25">{builds_limit} total</span>
          </div>
        </>
      )}

      {!can_build && (
        <p className="text-xs text-red-400/80 mt-2 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block" />
          Build limit reached — upgrade to continue
        </p>
      )}
    </div>
  )
}

/* ─── Empty ───────────────────────────────────────────────────────────────── */
function EmptyState({ filter }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="text-5xl mb-5">{filter === 'favorite' ? '⭐' : '🚀'}</div>
      <h3 className="font-display text-xl font-bold text-white mb-2">
        {filter === 'favorite' ? 'No favorites yet' : 'No builds yet'}
      </h3>
      <p className="text-white/35 text-sm mb-6">
        {filter === 'favorite'
          ? 'Star a build to pin it here'
          : 'Generate your first AI-powered 3D website'}
      </p>
      <Link to="/builder"
        className="px-6 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-sm font-semibold text-white
          shadow-[0_0_24px_rgba(61,94,255,0.4)] transition-all duration-200">
        Start Building
      </Link>
    </div>
  )
}
