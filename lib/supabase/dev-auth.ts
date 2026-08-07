import { cookies } from 'next/headers'

const DEV_AUTH_COOKIE = 'cindel_dev_auth'

/**
 * Returns a minimal user stub when the dev-mode auth cookie is present.
 * In production this always returns null, so protected pages fall through to
 * the real Supabase session check as normal.
 */
export async function getDevUser(): Promise<{ id: string; phone?: string } | null> {
  if (process.env.NODE_ENV === 'production') return null

  try {
    const cookieStore = await cookies()
    const val = cookieStore.get(DEV_AUTH_COOKIE)?.value
    if (val === '1') {
      return { id: 'dev-user-00000000-0000-0000-0000-000000000000' }
    }
  } catch {
    // cookies() may throw in edge contexts; safe to ignore.
  }

  return null
}

