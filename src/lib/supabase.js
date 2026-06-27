import { createClient } from '@supabase/supabase-js'

const url  = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? (typeof window !== 'undefined' && window.__ENV__?.NEXT_PUBLIC_SUPABASE_URL)
const key  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY ?? (typeof window !== 'undefined' && window.__ENV__?.NEXT_PUBLIC_SUPABASE_ANON_KEY)

if (!url || !key) {
  console.warn(
    '[Supabase] SUPABASE_URL or SUPABASE_ANON_KEY missing.\n' +
    'Add them to your .env file to enable auth and cloud saves.'
  )
}

export const supabase = createClient(url ?? '', key ?? '', {
  auth: {
    persistSession:    true,
    autoRefreshToken:  true,
    detectSessionInUrl: true,
  },
})
