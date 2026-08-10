'use client'

import { useState } from 'react'
import Image from 'next/image'
import { ArrowLeft, Edit3 } from 'lucide-react'
import { toast } from 'sonner'
import { AppHeader } from './AppHeader'
import { Sidebar } from './Sidebar'
import { HivesGrid, type Hive } from './HivesGrid'
import { ChatWindow } from './ChatWindow'
import { useChat } from '@/hooks/useChat'

const CINDEL_LOGO =
  'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/new_logo-removebg-preview-M56wuRQ1qh1E0XNJv9s6nlTGWgJ46K.png'

export type ChatAppProps = {
  userId: string
}

type MobileView = 'sidebar' | 'hives' | 'chat'

/**
 * Composes the WhatsApp-like layout with a fixed header and three independent
 * scroll areas (Sidebar / HivesGrid / ChatWindow). Root is h-screen
 * overflow-hidden; each area scrolls on its own.
 */
export function ChatApp({ userId }: ChatAppProps) {
  const {
    loading,
    error,
    currentUser,
    displayName,
    status,
    conversations,
    activeConversationId,
    activeMessages,
    activeOther,
    setActiveConversationId,
    sendMessage,
    startConversation,
    setStatus,
    setName,
  } = useChat(userId)

  const [showNewChat, setShowNewChat] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [phone, setPhone] = useState('')
  const [isStarting, setIsStarting] = useState(false)
  const [query, setQuery] = useState('')

  // Mobile: show one panel at a time (hives is the default landing view).
  const [mobileView, setMobileView] = useState<MobileView>('hives')

  const openHive = (id: string) => {
    setActiveConversationId(id)
    if (window.innerWidth < 1024) setMobileView('chat')
  }

  // Called by HivesGrid after a drag-and-drop reorder. Persist the new order.
  const handleReorderHives = (reordered: Hive[]) => {
    // TODO: wire to Supabase once the `hives` table stores per-user positions.
    console.log('Reorder hives', reordered)
  }

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
      toast.error(
        res.error === 'No user with that phone number'
          ? 'No Cindel user with that phone.'
          : res.error,
      )
    }
  }

  return (
    <main className="flex h-screen flex-col overflow-hidden bg-cindel-bg font-sans text-white">
      <AppHeader
        status={status}
        onStatusChange={(s) => void setStatus(s)}
        onNewHive={() => setShowNewChat(true)}
        query={query}
        onQueryChange={setQuery}
      />

      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Left-most vertical rail — 72px, independent scroll */}
        <Sidebar
          currentUser={currentUser}
          onOpenProfile={() => setShowProfile(true)}
        />

        {/* Hives honeycomb column — fixed 280px, independent scroll */}
        <div className="hidden w-[280px] min-w-0 shrink-0 border-r border-cindel-border sm:block">
          <HivesGrid
            conversations={conversations}
            activeConversationId={activeConversationId}
            query={query}
            onSelectHive={openHive}
            onNewHive={() => setShowNewChat(true)}
            onReorderHives={handleReorderHives}
          />
        </div>

        {/* ChatWindow — takes the remaining space, independent scroll */}
        <div className="hidden min-w-0 flex-1 border-l border-cindel-border lg:block">
          <ChatWindow
            other={activeOther}
            myId={userId}
            messages={activeMessages}
            onSend={(content) => void sendMessage(content)}
            onOpenProfile={() => toast.info(`${activeOther?.username ?? 'User'}'s profile`)}
          />
        </div>
      </div>

      {/* Mobile view switcher — shows depending on the selected mobile view */}
      {mobileView === 'sidebar' && (
        <div className="absolute inset-0 z-10 sm:hidden">
          <Sidebar
            currentUser={currentUser}
            onOpenProfile={() => setShowProfile(true)}
          />
        </div>
      )}
      {mobileView === 'chat' && (
        <div className="absolute inset-0 z-20 flex flex-col bg-cindel-bg md:hidden">
          <ChatWindow
            other={activeOther}
            myId={userId}
            messages={activeMessages}
            onSend={(content) => void sendMessage(content)}
            onOpenProfile={() => toast.info(`${activeOther?.username ?? 'User'}'s profile`)}
          />
        </div>
      )}

      {/* Profile dropdown — anchored to the left rail, opens via the "Me" button */}
      {showProfile && (
        <div className="fixed inset-0 z-30 sm:left-[72px] sm:top-0 sm:right-auto sm:h-full sm:w-72">
          {/* Backdrop on mobile only */}
          <div
            className="absolute inset-0 bg-black/50 sm:hidden"
            onClick={() => setShowProfile(false)}
          />
          <div
            className="absolute bottom-0 left-0 top-0 flex w-64 flex-col gap-3 border-r border-cindel-border bg-cindel-header p-4 shadow-xl sm:h-full sm:w-auto sm:border"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white">Profile</h2>
              <button
                type="button"
                onClick={() => setShowProfile(false)}
                className="rounded-lg p-1 text-cindel-muted transition hover:text-white"
                aria-label="Close profile"
              >
                <ArrowLeft className="size-4" />
              </button>
            </div>

            {/* Avatar */}
            <div className="flex flex-col items-center gap-2">
              <div className="hex flex size-16 items-center justify-center bg-gradient-to-br from-[#a855f7] to-[#7c3aed]">
{currentUser?.avatar_url ? (
                  <img
                    src={currentUser.avatar_url}
                    alt={currentUser.username ?? 'You'}
                    className="size-14 rounded-full object-cover"
                  />
                ) : (
                  <span className="text-lg font-semibold text-white">
                    {displayName.slice(0, 2).toUpperCase()}
                  </span>
                )}
              </div>
            </div>

            {/* Name editor */}
            <label className="flex flex-col gap-1 text-xs text-cindel-muted">
              <span className="flex items-center gap-1 font-medium">
                <Edit3 className="size-3" /> Name
              </span>
              <input
                key={displayName}
                defaultValue={displayName}
                onBlur={(e) => void setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                }}
                placeholder="Enter your name"
                className="w-full rounded-lg border border-cindel-border bg-cindel-panel px-3 py-2 text-sm text-white outline-none placeholder:text-cindel-muted focus:border-cindel-accent"
              />
              <span className="text-[10px] text-cindel-muted/70">
                Press Enter or click away to save.
              </span>
            </label>

            {/* Phone */}
            <div className="flex flex-col gap-1 text-xs text-cindel-muted">
              <span className="font-medium">Phone</span>
              <span className="rounded-lg border border-cindel-border bg-cindel-panel px-3 py-2 text-sm text-white">
                {currentUser?.phone ?? 'No phone'}
              </span>
            </div>

            {/* Status editor */}
            <label className="flex flex-col gap-1 text-xs text-cindel-muted">
              <span className="flex items-center gap-1 font-medium">
                <Edit3 className="size-3" /> Status
              </span>
              <input
                defaultValue={status}
                onBlur={(e) => void setStatus(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                }}
                placeholder="Update your status"
                className="w-full rounded-lg border border-cindel-border bg-cindel-panel px-3 py-2 text-sm text-white outline-none placeholder:text-cindel-muted focus:border-cindel-accent"
              />
              <span className="text-[10px] text-cindel-muted/70">
                Press Enter or click away to save.
              </span>
            </label>

            <div className="mt-auto rounded-lg bg-cindel-panel px-3 py-2 text-center text-xs text-cindel-muted">
              Cindel v0.1.0
            </div>
          </div>
        </div>
      )}

      {/* Mobile bottom nav */}
      <nav className="flex shrink-0 items-center justify-around border-t border-cindel-border bg-cindel-header py-2 md:hidden">
        <button
          type="button"
          onClick={() => setMobileView('sidebar')}
          className={`rounded-lg px-4 py-2 text-xs font-semibold transition ${
            mobileView === 'sidebar'
              ? 'bg-cindel-panel text-cindel-accent'
              : 'text-cindel-muted hover:text-white'
          }`}
        >
          Me
        </button>
        <button
          type="button"
          onClick={() => setMobileView('hives')}
          className={`rounded-lg px-4 py-2 text-xs font-semibold transition ${
            mobileView === 'hives'
              ? 'bg-cindel-panel text-cindel-accent'
              : 'text-cindel-muted hover:text-white'
          }`}
        >
          Hives
        </button>
        <button
          type="button"
          onClick={() => setMobileView('chat')}
          className={`rounded-lg px-4 py-2 text-xs font-semibold transition ${
            mobileView === 'chat'
              ? 'bg-cindel-panel text-cindel-accent'
              : 'text-cindel-muted hover:text-white'
          }`}
        >
          Chat
        </button>
      </nav>

      {/* Overlays (loading / error / new-chat modal) */}
      {loading && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-cindel-bg/70 text-cindel-muted">
          <Image
            src={CINDEL_LOGO}
            alt="Cindel logo"
            width={160}
            height={60}
            priority
            className="h-auto w-40 opacity-80"
          />
          <p className="animate-pulse text-sm">Loading…</p>
        </div>
      )}
      {error && (
        <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-lg border border-red-500/40 bg-cindel-panel px-4 py-2 text-sm text-red-400">
          {error}
        </div>
      )}

      {showNewChat && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-sm rounded-2xl border border-cindel-border bg-cindel-header p-5">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowNewChat(false)}
                className="text-white"
                aria-label="Close"
              >
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
    </main>
  )
}
