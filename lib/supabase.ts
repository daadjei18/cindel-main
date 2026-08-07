import { createBrowserClient } from '@supabase/ssr'

/**
 * Browser-side Supabase client.
 * Reading env at runtime from NEXT_PUBLIC_* is required so the anon key is
 * exposed to the client bundle (it is safe to expose).
 */
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    cookieOptions: { secure: process.env.NODE_ENV === 'production' },
  },
)
