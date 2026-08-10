'use client'

import { User } from 'lucide-react'
import { initialsOf } from '@/lib/chat-utils'
import type { Profile } from '@/lib/types'

const HEX = 'hex'

export type SidebarProps = {
  currentUser: Profile | null
  /** Opened when the user clicks the profile button at the bottom. */
  onOpenProfile: () => void
}

/**
 * Left-most vertical rail (72px desktop / 56px mobile) with a dark background.
 * Top: app logo (purple hexagon with stacked lines). Bottom: the current
 * user's profile button (purple hexagon with a person icon) labelled "Me".
 */
export function Sidebar({ currentUser, onOpenProfile }: SidebarProps) {
  return (
    <aside className="flex w-[72px] shrink-0 flex-col items-center overflow-y-auto border-r border-cindel-border bg-[#0A0A0F]">
      {/* Top: app logo — purple hexagon w/ stacked white lines, 12px padding top */}
      <div className="pt-3">
        <div className="group relative">
          <span
            className={`${HEX} flex size-12 items-center justify-center bg-gradient-to-br from-[#a855f7] to-[#7c3aed] shadow-[0_0_12px_rgba(168,85,247,0.45)] transition-transform duration-200 group-hover:scale-110`}
          >
            {/* stacked lines inside the hexagon — the "Cindel" mark */}
            <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
              <line x1="5" y1="8" x2="19" y2="8" />
              <line x1="5" y1="12" x2="19" y2="12" />
              <line x1="5" y1="16" x2="13" y2="16" />
            </svg>
          </span>
          {/* active state: purple left border */}
          <span className="absolute -left-3 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r bg-cindel-accent opacity-0 transition-opacity group-hover:opacity-100" />
        </div>
      </div>

      {/* Middle: empty scrollable space */}
      <div className="flex-1" />

      {/* Bottom: user profile button — purple hexagon + person icon, "Me" label */}
      <div className="pb-4">
        <button
          type="button"
          onClick={onOpenProfile}
          aria-label="Open your profile"
          className="group relative flex flex-col items-center gap-1 outline-none"
        >
          <span
            className={`${HEX} flex size-12 items-center justify-center bg-gradient-to-br from-[#a855f7] to-[#7c3aed] shadow-[0_0_10px_rgba(168,85,247,0.35)] transition-transform duration-200 group-hover:scale-110`}
          >
            {currentUser?.avatar_url ? (
              <img
                src={currentUser.avatar_url}
                alt=""
                className="size-10 rounded-full object-cover"
              />
            ) : currentUser?.username ? (
              <span className="text-sm font-semibold text-white">
                {initialsOf(currentUser.username)}
              </span>
            ) : (
              <User className="size-5 text-white" />
            )}
          </span>
          <span className="text-[10px] font-medium text-cindel-muted transition-colors group-hover:text-white">
            Me
          </span>
          {/* active state: purple left border */}
          <span className="absolute -left-3 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r bg-cindel-accent opacity-60" />
        </button>
      </div>
</aside>
  )
}
