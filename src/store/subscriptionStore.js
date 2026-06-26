/**
 * subscriptionStore — Zustand store for subscription plan state.
 *
 * Tracks:
 *   selectedPlan  — plan the user is currently hovering/selecting on /pricing
 *   activePlan    — the plan the logged-in user has subscribed to
 *   billingCycle  — 'monthly' | 'yearly'
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ─── Plan definitions ──────────────────────────────────────────────────────────

export const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    tagline: 'Blazing-fast inference',
    description: 'Perfect for individuals and small projects that need speed above all else.',
    price: { monthly: 9, yearly: 7 },
    model: {
      provider: 'Groq',
      name: 'Llama 3.3 70B',
      id: 'llama-3.3-70b-versatile',
      badge: 'GROQ',
      color: '#f59e0b',
      bgColor: 'rgba(245,158,11,0.08)',
      borderColor: 'rgba(245,158,11,0.25)',
      glowColor: 'rgba(245,158,11,0.35)',
      icon: '⚡',
      stat: { label: 'Tokens/sec', value: '2,600+' },
      description: 'The fastest LLM inference on the planet via Groq LPU hardware.',
    },
    limits: {
      buildsPerMonth: 10,
      contextWindow: '128K',
      videoGenerations: 0,
      apiAccess: false,
    },
    features: [
      { label: '10 website builds / month', included: true },
      { label: 'Llama 3.3 70B via Groq', included: true },
      { label: '128K context window', included: true },
      { label: 'Blueprint generation', included: true },
      { label: 'React + Three.js code export', included: true },
      { label: 'Standard support', included: true },
      { label: 'Gemini Veo 2 video generation', included: false },
      { label: 'Custom domain export', included: false },
      { label: 'API access', included: false },
      { label: 'Priority queue', included: false },
    ],
    cta: 'Start with Groq',
    highlight: false,
    badge: null,
  },
  {
    id: 'growth',
    name: 'Growth',
    tagline: 'Multimodal intelligence',
    description: 'For professionals who need deep reasoning, vision, and 1M token context.',
    price: { monthly: 29, yearly: 23 },
    model: {
      provider: 'Google',
      name: 'Gemini 2.5 Flash',
      id: 'gemini-2.5-flash',
      badge: 'GEMINI',
      color: '#10b981',
      bgColor: 'rgba(16,185,129,0.08)',
      borderColor: 'rgba(16,185,129,0.25)',
      glowColor: 'rgba(16,185,129,0.35)',
      icon: '💎',
      stat: { label: 'Context window', value: '1M tokens' },
      description: 'Google\'s fastest multimodal model with industry-leading context.',
    },
    limits: {
      buildsPerMonth: 50,
      contextWindow: '1M',
      videoGenerations: 5,
      apiAccess: false,
    },
    features: [
      { label: '50 website builds / month', included: true },
      { label: 'Gemini 2.5 Flash via Google AI', included: true },
      { label: '1M context window', included: true },
      { label: 'Blueprint + video script generation', included: true },
      { label: 'React + Three.js code export', included: true },
      { label: '5 Veo 2 video generations / month', included: true },
      { label: 'Priority support', included: true },
      { label: 'Custom domain export', included: true },
      { label: 'API access', included: false },
      { label: 'Priority queue', included: false },
    ],
    cta: 'Start with Gemini',
    highlight: false,
    badge: 'Most Popular',
  },
  {
    id: 'pro',
    name: 'Pro',
    tagline: 'Peak reasoning power',
    description: 'Unleash the most capable AI model for complex, enterprise-grade website generation.',
    price: { monthly: 79, yearly: 63 },
    model: {
      provider: 'Anthropic',
      name: 'Claude Sonnet 4.6',
      id: 'claude-sonnet-4-6',
      badge: 'CLAUDE',
      color: '#9333ea',
      bgColor: 'rgba(147,51,234,0.08)',
      borderColor: 'rgba(147,51,234,0.3)',
      glowColor: 'rgba(147,51,234,0.4)',
      icon: '🧠',
      stat: { label: 'Context window', value: '200K tokens' },
      description: 'Anthropic\'s most intelligent model — unmatched nuance and architecture.',
    },
    limits: {
      buildsPerMonth: -1,
      contextWindow: '200K',
      videoGenerations: 25,
      apiAccess: true,
    },
    features: [
      { label: 'Unlimited website builds', included: true },
      { label: 'Claude Sonnet 4.6 via Anthropic', included: true },
      { label: '200K context window', included: true },
      { label: 'Full pipeline generation', included: true },
      { label: 'React + Three.js code export', included: true },
      { label: '25 Veo 2 video generations / month', included: true },
      { label: 'Dedicated support', included: true },
      { label: 'Custom domain export', included: true },
      { label: 'Full API access', included: true },
      { label: 'Priority queue (0 wait)', included: true },
    ],
    cta: 'Start with Claude',
    highlight: true,
    badge: 'Most Powerful',
  },
]

// ─── Store ─────────────────────────────────────────────────────────────────────

const useSubscriptionStore = create(
  persist(
    (set) => ({
      selectedPlan:  null,          // plan id being hovered/focused on pricing page
      activePlan:    null,          // plan id the user has subscribed to
      billingCycle:  'monthly',     // 'monthly' | 'yearly'

      selectPlan:    (id)     => set({ selectedPlan: id }),
      setActivePlan: (id)     => set({ activePlan: id }),
      setBilling:    (cycle)  => set({ billingCycle: cycle }),
      clearPlan:     ()       => set({ selectedPlan: null }),
    }),
    {
      name: 'ai3d-subscription',
      partialize: (state) => ({
        activePlan:   state.activePlan,
        billingCycle: state.billingCycle,
      }),
    }
  )
)

export default useSubscriptionStore
