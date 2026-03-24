import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    // Disable background auto-refresh — it acquires an exclusive browser lock
    // that conflicts with getSession() calls during the analysis pipeline.
    // We manually refresh the session in App.jsx on a safe schedule instead.
    autoRefreshToken: false,
    persistSession: true,
    detectSessionInUrl: true,
  }
})
