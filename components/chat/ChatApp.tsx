'use client'

import { useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { ChatList } from './ChatList'
import { ChatWindow } from './ChatWindow'
import { useChat } from '@/hooks/useChat'

export type ChatAppProps = {
  userId: string
}

/**
 * Composes the WhatsApp-like layout: sidebar chat list + right message window.
 * Owns the "New Chat" modal. All data flows from useChat() -> real Supabase.
 */
export function ChatApp({ userId }: ChatAppProps) {
  const {
    loading,
    error,
    currentUser,
    conversations,
    activeConversationId,
    activeMessages,
    activeOther,
    setActiveConversationId,
    sendMessage,
    startConversation,
  } = useChat()

  const [showNewChat, setShowNewChat] = useState(false)
  const [phone, setPhone] = useState('')
  const [isStarting, setIsStarting] = useState(false)

  const handleStart = async () => {
    if (!phone.trim()) return
    setIsStarting(true)
    const res = await startConversation(phone)
    setIsStarting(false)
    if (res.ok) {
      setShowNewChat(false)
      setPhone('')
      toast.success('Conversation started')
    } else if (res.error) {
      toast.error(res.error === 'No user with that phone number' ? 'No Cindel user with that phone.' : res.error)
    }
  }

  return (
    <main className="min-h-svh bg-cindel-bg font-sans text-white">
      <div className="mx-auto flex min-h-svh w-full max-w-[1500px] overflow-hidden border-x border-cindel-border">
        <ChatList
          currentUser={currentUser}
          conversations={conversations}
          activeConversationId={activeConversationId}
          onSelect={setActiveConversationId}
          onNewChat={() => setShowNewChat(true)}
          onAddStory={() => toast.info('Story creation coming soon')}
        />
        <ChatWindow
          other={activeOther}
          myId={userId}
          messages={activeMessages}
          onSend={(content) => void sendMessage(content)}
          onOpenProfile={() => toast.info(`${activeOther?.username ?? 'User'}'s profile`)}
        />

        {loading && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-cindel-bg/70 text-cindel-muted">
            Loading…
          </div>
        )}
        {error && (
          <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-lg border border-red-500/40 bg-cindel-panel px-4 py-2 text-sm text-red-400">
            {error}
          </div>
        )}

        {showNewChat && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true">
            <div className="w-full max-w-sm rounded-2xl border border-cindel-border bg-cindel-header p-5">
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setShowNewChat(false)} className="text-white" aria-label="Close">
                  <ArrowLeft className="size-5" />
                </button>
                <h2 className="text-sm font-bold text-white">New Chat</h2>
              </div>
              <p className="mt-3 text-xs text-cindel-muted">
                Enter the phone number of a Cindel user to start chatting.
              </p>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void handleStart()
                }}
                placeholder="e.g. 233550123456"
                inputMode="tel"
                className="mt-3 w-full rounded-lg border border-cindel-border bg-cindel-panel px-3 py-2 text-sm text-white outline-none placeholder:text-cindel-muted focus:border-cindel-accent"
              />
              <button
                type="button"
                onClick={() => void handleStart()}
                disabled={isStarting}
                className="mt-4 w-full rounded-lg bg-cindel-accent px-3 py-2 text-sm font-semibold text-white transition hover:bg-cindel-accent/80 disabled:opacity-50"
              >
                {isStarting ? 'Starting…' : 'Start Chat'}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
