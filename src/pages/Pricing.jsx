/**
 * Pricing — Subscription tiers page
 *
 * Design Identity: "Neural Power Tiers"
 * - style:      Mission-control spec sheet meets sports-car brochure
 * - layout:     Three equal cards — each with its own AI model identity
 * - animation:  Staggered card rise, orbital CSS rings, shimmer CTA sweep
 * - colors:     Amber/Groq  · Emerald/Gemini  · Violet/Claude
 * - typography: JetBrains Mono for model IDs, Syne for plan names, Inter for features
 * - 3D:         CSS orbital rings (keep page lightweight, no Canvas)
 */

import { useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import GlassCard from '@components/ui/GlassCard'
import Badge from '@components/ui/Badge'
import useAuthStore from '@store/authStore'
import useSubscriptionStore, { PLANS } from '@store/subscriptionStore'
import { useScrollAnimation } from '@hooks/useScrollAnimation'

// ─── FAQ data ─────────────────────────────────────────────────────────────────

const FAQ = [
  {
    q: 'What is the difference between the AI models?',
    a: 'Each plan uses a different underlying AI: Starter uses Groq (ultra-fast Llama inference), Growth uses Google\'s Gemini 2.5 Flash (multimodal, 1M context), and Pro uses Anthropic\'s Claude Sonnet 4.6 (highest reasoning quality). The model determines the quality, speed, and capability of generated blueprints.',
  },
  {
    q: 'Can I switch plans after subscribing?',
    a: 'Yes. You can upgrade or downgrade at any time. Upgrades take effect immediately and you\'re charged pro-rata. Downgrades take effect at the start of your next billing cycle.',
  },
  {
    q: 'What counts as a "website build"?',
    a: 'One build = one full pipeline run: AI Architect analysis → JSON blueprint → optional video script → React + Three.js code generation. Regenerating just the code from an existing blueprint does not count.',
  },
  {
    q: 'Do you offer a free trial?',
    a: 'Every account gets 3 free builds on signup — no credit card required. These use the Groq model (Starter tier). You can upgrade at any time to unlock more builds and access to Gemini or Claude.',
  },
  {
    q: 'Is API access available?',
    a: 'API access is available on the Pro plan only. You\'ll receive a personal API key from your dashboard that lets you trigger builds programmatically via REST.',
  },
  {
    q: 'What happens if I hit my monthly build limit?',
    a: 'You\'ll receive an in-app notification when you reach 80% and 100% of your limit. You can either wait until the next billing cycle or upgrade to a higher plan instantly.',
  },
]

// ─── Main component ───────────────────────────────────────────────────────────

export default function Pricing() {
  const { billingCycle, setBilling, activePlan, setActivePlan } = useSubscriptionStore()
  const { user } = useAuthStore()
  const navigate  = useNavigate()
  const faqRef    = useRef(null)
  const { isVisible: faqVisible } = useScrollAnimation(faqRef)

  const handleChoosePlan = (planId) => {
    if (!user) {
      navigate(`/signup?plan=${planId}&billing=${billingCycle}`)
      return
    }
    setActivePlan(planId)
    navigate('/dashboard')
  }

  return (
    <main className="relative min-h-screen overflow-x-hidden">

      {/* ── Ambient background ─────────────────────────────────────────────── */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full opacity-[0.035]
          bg-[#f59e0b] blur-[160px]" />
        <div className="absolute top-1/4 right-1/4 w-[500px] h-[500px] rounded-full opacity-[0.04]
          bg-[#10b981] blur-[140px]" />
        <div className="absolute bottom-1/4 left-1/3 w-[700px] h-[700px] rounded-full opacity-[0.04]
          bg-[#9333ea] blur-[180px]" />
      </div>

      <div className="relative z-10">

        {/* ── Header ───────────────────────────────────────────────────────── */}
        <section className="pt-32 pb-16 px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            <Badge color="neon" dot className="mb-6">
              Three Models. One Platform.
            </Badge>

            <h1 className="font-display font-extrabold text-5xl sm:text-6xl lg:text-7xl
              text-white leading-[0.95] mb-5">
              Choose Your
              <br />
              <span className="relative inline-block">
                <span className="bg-gradient-to-r from-[#f59e0b] via-[#10b981] to-[#9333ea]
                  bg-clip-text text-transparent">
                  AI Engine
                </span>
                <motion.span
                  className="absolute -bottom-1 left-0 right-0 h-[2px] rounded-full
                    bg-gradient-to-r from-[#f59e0b] via-[#10b981] to-[#9333ea]"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: 0.5, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                />
              </span>
            </h1>

            <p className="text-white/50 text-lg max-w-xl mx-auto leading-relaxed mb-10">
              Every plan generates full React + Three.js websites. The difference is which
              AI model powers your blueprint — and how deep it can think.
            </p>

            {/* ── Billing toggle ──────────────────────────────────────────── */}
            <BillingToggle value={billingCycle} onChange={setBilling} />
          </motion.div>
        </section>

        {/* ── Model comparison strip ────────────────────────────────────────── */}
        <ModelStrip />

        {/* ── Pricing cards ─────────────────────────────────────────────────── */}
        <section className="py-12 px-6">
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
            {PLANS.map((plan, i) => (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.12, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                className="flex"
              >
                <PlanCard
                  plan={plan}
                  billing={billingCycle}
                  isActive={activePlan === plan.id}
                  onChoose={() => handleChoosePlan(plan.id)}
                />
              </motion.div>
            ))}
          </div>

          {/* Save badge */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-center text-white/35 text-sm mt-6"
          >
            {billingCycle === 'yearly'
              ? '✓ You\'re saving ~20% with yearly billing'
              : 'Switch to yearly billing to save ~20%'}
          </motion.p>
        </section>

        {/* ── Feature comparison table ──────────────────────────────────────── */}
        <ComparisonTable />

        {/* ── FAQ ──────────────────────────────────────────────────────────── */}
        <section ref={faqRef} className="py-24 px-6">
          <div className="max-w-3xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={faqVisible ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6 }}
              className="text-center mb-12"
            >
              <h2 className="font-display text-3xl font-bold text-white mb-3">
                Frequently Asked Questions
              </h2>
              <p className="text-white/40 text-base">
                Everything you need to know before picking a plan.
              </p>
            </motion.div>

            <div className="flex flex-col gap-3">
              {FAQ.map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 16 }}
                  animate={faqVisible ? { opacity: 1, y: 0 } : {}}
                  transition={{ delay: i * 0.06, duration: 0.5 }}
                >
                  <FAQItem q={item.q} a={item.a} />
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Bottom CTA ────────────────────────────────────────────────────── */}
        <section className="py-24 px-6 border-t border-white/[0.05]">
          <div className="max-w-2xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <div className="w-14 h-14 rounded-2xl mx-auto mb-6 flex items-center justify-center text-2xl
                bg-gradient-to-br from-[#f59e0b]/15 via-[#10b981]/10 to-[#9333ea]/15
                border border-white/[0.08]">
                🚀
              </div>
              <h2 className="font-display text-4xl font-extrabold text-white mb-4">
                Start for Free
              </h2>
              <p className="text-white/40 text-base mb-8">
                3 free builds on every new account. No credit card required.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  to="/signup"
                  className="px-8 py-4 rounded-2xl text-base font-semibold text-white
                    bg-brand-500 hover:bg-brand-600
                    shadow-[0_0_30px_rgba(61,94,255,0.4)] hover:shadow-[0_0_50px_rgba(61,94,255,0.6)]
                    transition-all duration-200"
                >
                  Create Free Account
                </Link>
                <Link
                  to="/builder"
                  className="px-8 py-4 rounded-2xl text-base font-medium text-white/70 hover:text-white
                    bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.1] hover:border-white/20
                    transition-all duration-200"
                >
                  Try Builder First
                </Link>
              </div>
            </motion.div>
          </div>
        </section>

      </div>
    </main>
  )
}

// ─── Billing toggle ────────────────────────────────────────────────────────────

function BillingToggle({ value, onChange }) {
  return (
    <div className="inline-flex items-center gap-3 p-1 rounded-xl bg-white/[0.05] border border-white/[0.08]">
      {['monthly', 'yearly'].map((cycle) => (
        <button
          key={cycle}
          onClick={() => onChange(cycle)}
          className={`relative px-5 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
            value === cycle
              ? 'text-white'
              : 'text-white/40 hover:text-white/70'
          }`}
        >
          {value === cycle && (
            <motion.div
              layoutId="billing-pill"
              className="absolute inset-0 rounded-lg bg-white/[0.1] border border-white/[0.12]"
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            />
          )}
          <span className="relative capitalize">{cycle}</span>
          {cycle === 'yearly' && (
            <span className="relative ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-semibold
              bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/30">
              -20%
            </span>
          )}
        </button>
      ))}
    </div>
  )
}

// ─── Model strip ──────────────────────────────────────────────────────────────

function ModelStrip() {
  return (
    <div className="px-6 mb-4">
      <div className="max-w-6xl mx-auto grid grid-cols-3 gap-6">
        {PLANS.map((plan, i) => (
          <motion.div
            key={plan.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 + i * 0.08, duration: 0.5 }}
            className="flex items-center justify-center gap-2 py-2 rounded-xl border border-dashed"
            style={{ borderColor: plan.model.borderColor }}
          >
            <span className="text-base">{plan.model.icon}</span>
            <span
              className="font-mono text-[11px] font-semibold tracking-widest uppercase"
              style={{ color: plan.model.color }}
            >
              {plan.model.badge}
            </span>
            <span className="text-white/25 text-xs">·</span>
            <span className="font-mono text-[11px] text-white/40">
              {plan.model.id}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

// ─── Plan card ────────────────────────────────────────────────────────────────

function PlanCard({ plan, billing, isActive, onChoose }) {
  const { model, price, features, highlight, badge, cta } = plan
  const displayPrice = billing === 'yearly' ? price.yearly : price.monthly

  return (
    <div className="relative flex flex-col w-full group">

      {/* Orbital ring decoration */}
      <OrbitalRing color={model.color} active={highlight} />

      {/* Badge */}
      {badge && (
        <div
          className="absolute -top-3 left-1/2 -translate-x-1/2 z-20
            px-3 py-1 rounded-full text-[11px] font-semibold tracking-wide whitespace-nowrap
            border"
          style={{
            background: model.bgColor,
            borderColor: model.borderColor,
            color: model.color,
          }}
        >
          {badge}
        </div>
      )}

      {/* Card */}
      <div
        className={`relative flex flex-col flex-1 rounded-2xl border overflow-hidden
          transition-all duration-300 group-hover:translate-y-[-4px]
          ${highlight ? 'border-opacity-50' : 'border-white/[0.10]'}`}
        style={{
          background: highlight
            ? `linear-gradient(135deg, ${model.bgColor}, rgba(10,10,20,0.9))`
            : 'rgba(255,255,255,0.03)',
          borderColor: highlight ? model.borderColor : undefined,
          boxShadow: highlight
            ? `0 0 60px ${model.glowColor}, 0 8px 32px rgba(0,0,0,0.5)`
            : '0 4px 24px rgba(0,0,0,0.3)',
        }}
      >
        {/* Inner shine */}
        <div className="pointer-events-none absolute inset-0 rounded-2xl
          bg-gradient-to-b from-white/[0.04] to-transparent" />

        {/* Header */}
        <div className="relative p-7 pb-5 border-b border-white/[0.06]">

          {/* Model badge */}
          <div
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg mb-4
              text-[11px] font-mono font-semibold tracking-widest"
            style={{
              background: model.bgColor,
              border: `1px solid ${model.borderColor}`,
              color: model.color,
            }}
          >
            <span>{model.icon}</span>
            <span>{model.badge}</span>
          </div>

          <h3 className="font-display text-2xl font-bold text-white mb-1">
            {plan.name}
          </h3>
          <p className="text-white/45 text-sm leading-relaxed mb-5">
            {plan.tagline}
          </p>

          {/* Price */}
          <div className="flex items-end gap-2 mb-1">
            <span className="text-white/40 text-lg">$</span>
            <span className="font-display font-extrabold text-5xl text-white leading-none">
              {displayPrice}
            </span>
            <span className="text-white/35 text-sm pb-1.5">
              / mo{billing === 'yearly' ? ' · billed yearly' : ''}
            </span>
          </div>

          {billing === 'yearly' && (
            <p className="text-[11px] text-white/30 font-mono">
              ${price.monthly}/mo if billed monthly
            </p>
          )}
        </div>

        {/* Model spec card */}
        <div
          className="mx-5 mt-5 p-3.5 rounded-xl border"
          style={{
            background: model.bgColor,
            borderColor: model.borderColor,
          }}
        >
          <p className="text-[10px] font-mono font-semibold tracking-widest uppercase text-white/40 mb-1.5">
            Powered by
          </p>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-white text-sm">{model.name}</p>
              <p className="text-white/40 text-xs font-mono">{model.provider}</p>
            </div>
            <div className="text-right">
              <p
                className="font-mono font-bold text-base"
                style={{ color: model.color }}
              >
                {model.stat.value}
              </p>
              <p className="text-[10px] text-white/35 font-mono">{model.stat.label}</p>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="flex-1 p-5 pt-4">
          <ul className="space-y-2.5">
            {features.map((f, i) => (
              <li key={i} className="flex items-center gap-2.5 text-sm">
                <span
                  className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 text-[10px]
                    ${f.included ? 'text-white' : 'text-white/20'}`}
                  style={f.included ? {
                    background: model.bgColor,
                    border: `1px solid ${model.borderColor}`,
                    color: model.color,
                  } : {
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.07)',
                  }}
                >
                  {f.included ? '✓' : '—'}
                </span>
                <span className={f.included ? 'text-white/75' : 'text-white/25 line-through decoration-white/15'}>
                  {f.label}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* CTA button */}
        <div className="p-5 pt-2">
          <button
            onClick={onChoose}
            className="relative w-full py-3.5 rounded-xl text-sm font-semibold
              overflow-hidden transition-all duration-300 group/btn"
            style={highlight ? {
              background: `linear-gradient(135deg, ${model.color}dd, ${model.color}99)`,
              boxShadow: `0 0 24px ${model.glowColor}`,
              color: '#fff',
            } : {
              background: model.bgColor,
              border: `1px solid ${model.borderColor}`,
              color: model.color,
            }}
          >
            {/* Shimmer sweep */}
            <span
              className="absolute inset-0 translate-x-[-100%] group-hover/btn:translate-x-[100%]
                transition-transform duration-700
                bg-gradient-to-r from-transparent via-white/20 to-transparent"
            />
            <span className="relative">{cta}</span>
          </button>

          {isActive && (
            <p className="text-center text-[11px] text-white/30 mt-2 font-mono">
              ✓ Current plan
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Orbital ring ─────────────────────────────────────────────────────────────

function OrbitalRing({ color, active }) {
  if (!active) return null
  return (
    <div className="pointer-events-none absolute -inset-px z-0 rounded-2xl overflow-hidden">
      <div
        className="absolute inset-0 rounded-2xl opacity-30"
        style={{
          background: `conic-gradient(from 0deg, transparent, ${color}40, transparent, ${color}20, transparent)`,
          animation: 'spin 8s linear infinite',
        }}
      />
    </div>
  )
}

// ─── Comparison table ─────────────────────────────────────────────────────────

const COMPARISON_ROWS = [
  { label: 'Monthly builds', values: ['10', '50', 'Unlimited'] },
  { label: 'AI model', values: ['Llama 3.3 70B', 'Gemini 2.5 Flash', 'Claude Sonnet 4.6'] },
  { label: 'Context window', values: ['128K tokens', '1M tokens', '200K tokens'] },
  { label: 'Blueprint generation', values: [true, true, true] },
  { label: 'React + Three.js export', values: [true, true, true] },
  { label: 'Video script (Veo 2)', values: [false, '5 / month', '25 / month'] },
  { label: 'Custom domain export', values: [false, true, true] },
  { label: 'API access', values: [false, false, true] },
  { label: 'Priority queue', values: [false, false, true] },
  { label: 'Support', values: ['Standard', 'Priority', 'Dedicated'] },
]

function ComparisonTable() {
  const tableRef = useRef(null)
  const { isVisible } = useScrollAnimation(tableRef)

  return (
    <section ref={tableRef} className="py-16 px-6">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-10"
        >
          <h2 className="font-display text-3xl font-bold text-white mb-2">
            Full Comparison
          </h2>
          <p className="text-white/35 text-sm">
            Every feature, side by side.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.1, duration: 0.6 }}
          className="rounded-2xl border border-white/[0.08] overflow-hidden
            bg-white/[0.02] backdrop-blur-sm"
        >
          {/* Table header */}
          <div className="grid grid-cols-4 border-b border-white/[0.08]">
            <div className="p-4 text-xs font-semibold text-white/30 uppercase tracking-widest">
              Feature
            </div>
            {PLANS.map(plan => (
              <div
                key={plan.id}
                className="p-4 text-center border-l border-white/[0.06]"
              >
                <span
                  className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg
                    text-[10px] font-mono font-semibold tracking-wider"
                  style={{
                    background: plan.model.bgColor,
                    border: `1px solid ${plan.model.borderColor}`,
                    color: plan.model.color,
                  }}
                >
                  {plan.model.icon} {plan.name}
                </span>
              </div>
            ))}
          </div>

          {/* Rows */}
          {COMPARISON_ROWS.map((row, i) => (
            <div
              key={row.label}
              className={`grid grid-cols-4 ${
                i < COMPARISON_ROWS.length - 1 ? 'border-b border-white/[0.05]' : ''
              } ${i % 2 === 0 ? 'bg-white/[0.015]' : ''}`}
            >
              <div className="p-4 text-sm text-white/55 flex items-center">
                {row.label}
              </div>
              {row.values.map((val, j) => (
                <div
                  key={j}
                  className="p-4 border-l border-white/[0.05] flex items-center justify-center"
                >
                  <TableCell value={val} color={PLANS[j].model.color} />
                </div>
              ))}
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

function TableCell({ value, color }) {
  if (value === true) {
    return (
      <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
        style={{ background: `${color}18`, border: `1px solid ${color}40`, color }}>
        ✓
      </span>
    )
  }
  if (value === false) {
    return <span className="text-white/20 text-xs">—</span>
  }
  return <span className="text-white/65 text-sm text-center">{value}</span>
}

// ─── FAQ item ─────────────────────────────────────────────────────────────────

function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false)

  return (
    <div
      className="rounded-xl border border-white/[0.08] bg-white/[0.025] overflow-hidden
        hover:border-white/[0.14] transition-colors duration-200"
    >
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-left gap-4"
      >
        <span className="text-white/80 text-sm font-medium leading-snug">{q}</span>
        <motion.span
          animate={{ rotate: open ? 45 : 0 }}
          transition={{ duration: 0.2 }}
          className="flex-shrink-0 w-5 h-5 rounded-full bg-white/[0.06] border border-white/[0.1]
            flex items-center justify-center text-white/40 text-xs"
        >
          +
        </motion.span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
          >
            <p className="px-5 pb-4 text-sm text-white/45 leading-relaxed border-t border-white/[0.06] pt-3">
              {a}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
