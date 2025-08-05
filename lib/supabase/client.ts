import { createClient } from '@supabase/supabase-js'

// Client-side Supabase client
let supabaseInstance: ReturnType<typeof createClient> | null = null

export const supabase = () => {
  if (!supabaseInstance) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!url || !key) {
      console.warn('Missing Supabase environment variables - app will use dummy data')
      return null
    }
    
    supabaseInstance = createClient(url, key)
  }
  return supabaseInstance
}

// Server-side Supabase client with service role key
// Only create this on the server side
export const getSupabaseAdmin = () => {
  if (typeof window !== 'undefined') {
    throw new Error('Supabase admin client should only be used on the server')
  }
  
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!url || !key) {
    throw new Error('Missing Supabase admin environment variables')
  }
  
  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
} 