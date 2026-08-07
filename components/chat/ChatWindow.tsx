'use client'

import { useEffect, useRef } from 'react'
import { MessageCircle, MoreHorizontal, Phone, Video } from 'lucide-react'
import { Avatar } from './Avatar'
import { MessageInput } from './MessageInput'
import { formatTime } from '@/lib/chat-utils'
import type { Message, Profile } from '@/lib/types'

export type ChatWindowProps = {
  other: Profile | null
  myId: string | null
  messages: Message[]
  onSend: (content: string) => void
  onOpenProfile: () => void
}

export function ChatWindow({ other, myId, messages, onSend, onOpenProfile }: ChatWindowProps) {
  const bottomRef = useRef<HTMLDivElement | null>(null)

  // Auto-scroll to bottom whenever new messages arrive.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  if (!other) {
    return (
      <section className="flex min-w-0 flex-1 flex-col items-center justify-center bg-cindel-bg px-6 text-center">
        <div className="flex size-16 items-center justify-center rounded-2xl bg-cindel-panel text-cindel-muted">
          <MessageCircle className="size-8" />
        </div>
        <h3 className="mt-4 text-lg font-semibold text-white">Select a conversation</h3>
        <p className="mt-1 max-w-xs text-sm text-cindel-muted">
          Choose a chat from the list, or tap &ldquo;New Chat&rdquo; to start messaging.
        </p>
      </section>
    )
  }

  return (
    <section className="flex min-w-0 flex-1 flex-col bg-cindel-bg">
      <header className="flex items-center justify-between border-b border-cindel-border bg-cindel-header px-5 py-3">
        <div className="flex items-center gap-3">
          <Avatar name={other.username} online size="size-12" />
          <div>
            <h1 className="text-sm font-bold text-white">{other.username ?? 'Unknown'}</h1>
            <p className="text-xs text-cindel-muted">
              {other.last_seen ? `Last seen ${formatTime(other.last_seen)}` : 'Online now'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-white">
          <Phone className="size-5" />
          <Video className="size-5" />
          <button type="button" onClick={onOpenProfile} className="transition hover:text-cindel-muted">
            <MoreHorizontal className="size-5" />
          </button>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-5 py-4">
        {messages.length === 0 && (
          <div className="mx-auto mt-10 max-w-sm rounded-2xl bg-cindel-panel px-4 py-3 text-center text-sm text-cindel-muted">
            This is the beginning of your chat with{' '}
            <strong className="text-white">{other.username ?? 'Unknown'}</strong>. Say hello! 👋
          </div>
        )}
        {messages.map((m, i) => {
          const mine = m.sender_id === myId
          const showSender = !mine && (i === 0 || messages[i - 1].sender_id !== m.sender_id)
          return (
            <div
              key={m.id}
              className={`max-w-[70%] rounded-2xl px-4 py-2 text-sm leading-5 ${
                mine
                  ? 'self-end rounded-tr-sm bg-cindel-bubble text-white'
                  : 'self-start rounded-tl-sm bg-cindel-accent text-white'
              }`}
            >
              {showSender && (
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-white/80">
                  {other.username ?? 'Unknown'}
                </p>
              )}
              <p>{m.content}</p>
              <p className="mt-1 text-right text-[10px] text-white/70">{formatTime(m.created_at)}</p>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      <MessageInput
        placeholder={`Message ${other.username ?? 'them'}...`}
        onSend={onSend}
      />
    </section>
  )
}
