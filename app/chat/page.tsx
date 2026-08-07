import { redirect } from 'next/navigation'

import { ChatApp } from '@/components/chat/ChatApp'
import { createClient } from '@/lib/supabase/server'
import { getDevUser } from '@/lib/supabase/dev-auth'

/**
 * Chat page: main layout only. Authenticates the user (real Supabase session,
 * falling back to the dev-mode stub) then renders the client chat app.
 */
export default async function ChatPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const effectiveUser = user ?? (await getDevUser())

  if (!effectiveUser) {
    redirect('/auth/login')
  }

  return <ChatApp userId={effectiveUser.id} />
}
