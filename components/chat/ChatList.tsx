'use client'

import { useState } from 'react'
import { MessageCircle, Plus, Search, Sparkles } from 'lucide-react'
import { Avatar } from './Avatar'
import { StoryBar } from './StoryBar'
import { formatTime } from '@/lib/chat-utils'
import type { ConversationPreview, Profile } from '@/lib/types'

export type ChatListProps = {
  currentUser: Profile | null
  conversations: ConversationPreview[]
  activeConversationId: string | null
  onSelect: (id: string) => void
  onNewChat: () => void
  onAddStory: () => void
}

export function ChatList({
  currentUser,
  conversations,
  activeConversationId,
  onSelect,
  onNewChat,
  onAddStory,
}: ChatListProps) {
  const [query, setQuery] = useState('')

  const filtered = conversations.filter((c) =>
    (c.other?.username ?? '').toLowerCase().includes(query.toLowerCase()),
  )

  return (
    <aside className="flex w-[49%] min-w-[270px] flex-col border-r-4 border-cindel-accent bg-cindel-bg">
      <header className="flex items-center justify-between px-5 pb-3 pt-4">
        <div>
          <div className="text-3xl font-bold tracking-[-0.08em] text-cindel-accent">Cindel</div>
          <p className="flex items-center gap-1 text-xs text-white">
            <Sparkles className="size-3 text-cindel-accent" /> Very busy
          </p>
        </div>
        <button
          type="button"
          onClick={onNewChat}
          className="flex items-center gap-2 rounded-lg bg-cindel-accent px-3 py-2 text-sm font-semibold text-white transition hover:bg-cindel-accent/80"
        >
          <Plus className="size-4" /> New Chat
        </button>
      </header>

      <div className="px-5">
        <label className="flex items-center gap-2 rounded-lg border border-cindel-border bg-cindel-panel px-3 py-2.5 text-sm text-cindel-muted">
          <Search className="size-4" />
          <span className="sr-only">Search conversations</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search people..."
            className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-cindel-muted"
          />
        </label>
      </div>

      <StoryBar currentUser={currentUser} onAddStory={onAddStory} />

      <div className="flex-1 overflow-y-auto px-3 pb-4">
        {conversations.length === 0 && (
          <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
            <MessageCircle className="size-8 text-cindel-muted" />
            <p className="text-sm text-cindel-muted">
              No conversations yet. Tap &ldquo;New Chat&rdquo; to start one.
            </p>
          </div>
        )}
        {filtered.map((c) => (
          <button
            key={c.conversationId}
            type="button"
            onClick={() => onSelect(c.conversationId)}
            className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-cindel-panel ${
              activeConversationId === c.conversationId ? 'bg-cindel-panel' : ''
            }`}
          >
            <Avatar name={c.other?.username} />
            <span className="min-w-0 flex-1">
              <span className="flex items-baseline justify-between gap-2">
                <strong className="truncate text-sm text-white">{c.other?.username ?? 'Unknown'}</strong>
                <span className="shrink-0 text-[10px] text-cindel-muted">{formatTime(c.lastTime)}</span>
              </span>
              <span className="block truncate text-xs text-cindel-muted">{c.lastMessage ?? ''}</span>
            </span>
          </button>
        ))}
      </div>
    </aside>
  )
}
