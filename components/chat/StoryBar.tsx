'use client'

import { Plus } from 'lucide-react'
import { Avatar } from './Avatar'
import type { Profile } from '@/lib/types'

export type StoryBarProps = {
  currentUser: Profile | null
  onAddStory: () => void
}

/**
 * Stories row at the top of the sidebar. Shows the current user's avatar
 * plus a "New story" button. No hardcoded fake contacts.
 */
export function StoryBar({ currentUser, onAddStory }: StoryBarProps) {
  return (
    <section className="px-6 pb-4 pt-4">
      <p className="mb-3 text-xs font-medium uppercase tracking-widest text-cindel-muted">Stories</p>
      <div className="flex items-center gap-4">
        <div className="flex flex-col items-center gap-1 text-[10px] text-cindel-muted">
          <Avatar name={currentUser?.username ?? 'Me'} online size="size-12" />
          <span>You</span>
        </div>
        <button
          type="button"
          onClick={onAddStory}
          className="flex flex-col items-center gap-1 text-[10px] text-cindel-muted transition hover:text-white"
        >
          <span className="flex size-12 items-center justify-center rounded-full border-2 border-dashed border-cindel-border text-cindel-muted transition hover:border-cindel-accent hover:text-white">
            <Plus className="size-5" />
          </span>
          <span>New Story</span>
        </button>
      </div>
    </section>
  )
}
