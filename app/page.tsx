import { redirect } from 'next/navigation'

import { CindelWorkspace } from '@/components/cindel-workspace'
import { createClient } from '@/lib/supabase/server'

export default async function HomePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  return <CindelWorkspace email={user.email ?? undefined} />
}
