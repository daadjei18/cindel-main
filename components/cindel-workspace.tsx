'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'

import { createClient } from '@/lib/supabase/client'
import {
  Camera,
  Home,
  MessageCircle,
  MoreHorizontal,
  Paperclip,
  Phone,
  Play,
  Plus,
  Search,
  Send,
  Settings,
  Sparkles,
  UserCircle,
  Video,
  Waves,
} from 'lucide-react'

import { LogoutButton } from '@/components/logout-button'

const stories = [
  { name: 'Maya', initials: 'M', tone: 'bg-cindel-violet' },
  { name: 'James', initials: 'J', tone: 'bg-cindel-blue' },
  { name: 'Aisha', initials: 'A', tone: 'bg-cindel-pink' },
  { name: 'Noah', initials: 'N', tone: 'bg-cindel-indigo' },
  { name: 'Sofia', initials: 'S', tone: 'bg-cindel-orchid' },
]

const conversations: Conversation[] = [
  { id: 'design', name: 'Design', preview: 'Got the mockups ready for review', time: '10:42 AM', count: 3, initials: 'D', tone: 'bg-cindel-violet' },
  { id: 'product', name: 'Product', preview: 'We should revisit the roadmap', time: '09:15 AM', count: 1, initials: 'P', tone: 'bg-cindel-blue' },
  { id: 'dev', name: 'Dev', preview: 'Pushed fix to staging', time: 'Yesterday', count: 0, initials: 'D', tone: 'bg-cindel-indigo' },
  { id: 'marketing', name: 'Marketing', preview: 'Campaign metrics are live now', time: 'Yesterday', count: 5, initials: 'M', tone: 'bg-cindel-pink' },
]

function OctagonAvatar({ initials, tone, online = false, size = 'size-11' }: { initials: string; tone: string; online?: boolean; size?: string }) {
  return (
    <span className={`relative inline-flex ${size} shrink-0 items-center justify-center ${tone} text-lg font-semibold text-white [clip-path:polygon(25%_3%,75%_3%,98%_25%,98%_75%,75%_97%,25%_97%,2%_75%,2%_25%)]`}>
      <span className="absolute inset-1 flex items-center justify-center bg-cindel-panel [clip-path:inherit]">{initials}</span>
      {online && <span className="absolute bottom-0 right-0 size-2.5 rounded-full border-2 border-cindel-bg bg-cindel-online" />}
    </span>
  )
}

type Conversation = {
  id: string
  name: string
  preview: string
  time: string
  count: number
  initials: string
  tone: string
}

type ChatMessage = {
  id: string
  body: string
  sender_id: string
  message_type: 'text' | 'voice'
  duration_seconds: number | null
  created_at: string
}

export function CindelWorkspace({ email }: { email?: string }) {
  const supabase = useMemo(() => createClient(), [])
  const [activeConversation, setActiveConversation] = useState('Design')
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [message, setMessage] = useState('')
  const [conversationsData, setConversationsData] = useState<Conversation[]>(conversations)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  const filteredConversations = useMemo(
    () => conversationsData.filter((conversation) => conversation.name.toLowerCase().includes(query.toLowerCase())),
    [conversationsData, query],
  )

  const activeConversationData =
    conversationsData.find((conversation) => conversation.name === activeConversation) ?? conversationsData[0]

  useEffect(() => {
    let mounted = true

    async function loadConversations() {
      const { data } = await supabase
        .from('conversations')
        .select('id, title, preview, unread_count, last_message_at')
        .order('last_message_at', { ascending: false })

      if (!mounted || !data?.length) return
      const nextConversations = data.map((conversation, index) => ({
        id: conversation.id,
        name: conversation.title,
        preview: conversation.preview ?? 'No messages yet',
        time: conversation.last_message_at
          ? new Date(conversation.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : '',
        count: conversation.unread_count,
        initials: conversation.title.charAt(0).toUpperCase(),
        tone: ['bg-cindel-violet', 'bg-cindel-blue', 'bg-cindel-indigo', 'bg-cindel-pink'][index % 4],
      }))
      setConversationsData(nextConversations)
      setActiveConversationId(nextConversations[0]?.id ?? null)
      setActiveConversation(nextConversations[0]?.name ?? 'Design')
    }

    loadConversations()
    return () => {
      mounted = false
    }
  }, [supabase])

  useEffect(() => {
    let mounted = true

    async function loadIdentity() {
      const { data: userData } = await supabase.auth.getUser()
      if (mounted && userData.user) setCurrentUserId(userData.user.id)
    }

    loadIdentity()
    return () => {
      mounted = false
    }
  }, [supabase])

  useEffect(() => {
    if (!activeConversationId) return
    let mounted = true

    async function loadMessages() {
      const { data } = await supabase
        .from('messages')
        .select('id, body, sender_id, message_type, duration_seconds, created_at')
        .eq('conversation_id', activeConversationId)
        .order('created_at', { ascending: true })
      if (mounted && data) setMessages(data as ChatMessage[])
    }

    loadMessages()
    const channel = supabase
      .channel(`conversation-${activeConversationId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${activeConversationId}` }, (payload) => {
        setMessages((current) => [...current, payload.new as ChatMessage])
      })
      .subscribe()

    return () => {
      mounted = false
      void supabase.removeChannel(channel)
    }
  }, [activeConversationId, supabase])

  const sendMessage = async () => {
    const trimmed = message.trim()
    if (!trimmed || !activeConversationId) return
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) return
    await supabase.from('messages').insert({ conversation_id: activeConversationId, sender_id: userData.user.id, body: trimmed, message_type: 'text' })
    setMessage('')
  }

  const selectConversation = (conversation: Conversation) => {
    setActiveConversation(conversation.name)
    setActiveConversationId(conversation.id ?? null)
  }

  const isOwnMessage = (senderId: string) => Boolean(currentUserId) && senderId === currentUserId

  return (
    <main className="min-h-svh bg-cindel-bg font-sans text-white">
      <div className="mx-auto flex min-h-svh w-full max-w-[1500px] overflow-hidden border-x border-cindel-border">
        <aside className="flex w-[49%] min-w-[270px] flex-col border-r-4 border-cindel-accent bg-cindel-bg">
          <header className="flex items-center justify-between px-5 pb-3 pt-4">
            <div>
              <div className="text-3xl font-bold tracking-[-0.08em] text-cindel-accent">Cindel</div>
              <p className="flex items-center gap-1 text-xs text-white"><Sparkles className="size-3 text-cindel-accent" /> Very busy</p>
            </div>
            <button className="flex items-center gap-2 rounded-lg bg-cindel-accent px-3 py-2 text-sm font-semibold text-white transition hover:bg-cindel-accent/80" type="button">
              <Plus className="size-4" /> New Hive
            </button>
          </header>

          <div className="px-5">
            <label className="flex items-center gap-2 rounded-lg border border-cindel-border bg-cindel-panel px-3 py-2.5 text-sm text-cindel-muted">
              <Search className="size-4" />
              <span className="sr-only">Search conversations</span>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search conversations..." className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-cindel-muted" />
            </label>
          </div>

          <section className="px-6 pb-4 pt-4">
            <p className="mb-3 text-xs font-medium uppercase tracking-widest text-cindel-muted">Stories</p>
            <div className="flex justify-between gap-2">
              {stories.map((story) => <button key={story.name} type="button" className="flex flex-col items-center gap-1 text-[10px] text-cindel-muted"><OctagonAvatar {...story} online size="size-12" /><span>{story.name}</span></button>)}
            </div>
          </section>

          <section className="flex-1 px-3 pt-2">
            <p className="px-3 pb-3 text-xs font-medium uppercase tracking-widest text-cindel-muted">Conversations</p>
            <div className="flex flex-col gap-1">
              {filteredConversations.map((conversation) => (
                <button key={conversation.name} type="button" onClick={() => selectConversation(conversation)} className={`flex items-center gap-3 rounded-xl px-3 py-3 text-left transition ${activeConversation === conversation.name ? 'bg-cindel-panel ring-1 ring-cindel-border' : 'hover:bg-cindel-panel/70'}`}>
                  <OctagonAvatar {...conversation} online />
                  <span className="min-w-0 flex-1"><span className="flex items-center justify-between gap-2"><strong className="text-sm text-white">{conversation.name}</strong><span className="text-[11px] text-cindel-muted">{conversation.time}</span></span><span className="block truncate text-xs text-cindel-muted">{conversation.preview}</span></span>
                  {conversation.count > 0 && <span className="flex size-6 items-center justify-center rounded-full bg-cindel-accent text-xs font-bold text-white">{conversation.count}</span>}
                </button>
              ))}
            </div>
          </section>

          <nav className="flex items-center justify-around border-t border-cindel-border px-3 py-3 text-xs text-cindel-muted">
            <Link href="/" className="flex flex-col items-center gap-1 text-white"><Home className="size-5" />Home</Link>
            <Link href="/chat" className="flex flex-col items-center gap-1 text-white" aria-current="page"><MessageCircle className="size-5 text-cindel-accent" />Hives</Link>
            <button className="flex flex-col items-center gap-1" type="button"><Camera className="size-5" />Camera</button>
            <button className="flex flex-col items-center gap-1" type="button"><UserCircle className="size-5" />Profile</button>
          </nav>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col bg-cindel-bg md:flex">
          <header className="flex items-center justify-between border-b border-cindel-border bg-cindel-header px-5 py-3">
            <div className="flex items-center gap-3"><OctagonAvatar initials={activeConversationData?.initials ?? 'M'} tone={activeConversationData?.tone ?? 'bg-cindel-violet'} online size="size-12" /><div><h1 className="text-sm font-bold">Chat with {activeConversation} – {activeConversationData?.count ?? 0} Messages</h1><p className="text-xs text-cindel-muted">Online now · {activeConversation}</p></div></div>
            <div className="flex items-center gap-4 text-white"><Phone className="size-5" /><Video className="size-5" /><MoreHorizontal className="size-5" /><LogoutButton /></div>
          </header>
          <div className="flex flex-1 flex-col gap-3 overflow-y-auto bg-cindel-bg px-5 py-4">
            <div className="max-w-[76%] self-start rounded-2xl rounded-bl-sm rounded-tl-sm bg-cindel-accent px-3 py-2 text-xs leading-4 shadow-lg"><p className="font-semibold">Cindel AI</p><p>Hey team! I&apos;ve analyzed the latest design draft. Here are 3 quick suggestions:</p><p>1) Increase contrast on the CTA button for better accessibility.<br />2) Consider adding more spacing in the card layout.<br />3) The typography is clean but the subheading could be slightly bolder.</p><p className="mt-1 text-right text-[10px] text-white/80">10:42 AM ✓</p></div>
            <div className="flex max-w-[70%] items-center gap-3 self-end rounded-2xl bg-cindel-bubble px-4 py-3"><button className="flex size-8 items-center justify-center rounded-full bg-white/10" type="button"><Play className="size-4 fill-white" /></button><Waves className="h-7 flex-1 text-cindel-muted" /><span className="text-xs">0:12</span></div>
            <div className="max-w-[72%] self-start rounded-2xl rounded-bl-sm rounded-tl-sm bg-cindel-accent px-3 py-2 text-xs leading-4"><p>Great, I&apos;ve also pulled the brand color palette to match. Do you want me to generate a few alternative layouts for the header section?</p><p className="mt-1 text-right text-[10px] text-white/80">10:43 AM ✓</p></div>
            <div className="max-w-[55%] self-end rounded-2xl rounded-tr-sm bg-cindel-bubble px-4 py-3 text-sm leading-5"><p>Yes please, keep it minimal and aligned with the new style guide.</p><p className="mt-1 text-right text-[10px] text-cindel-muted">10:44 AM ✓✓</p></div>
            {messages.map((chatMessage) => {
              const own = isOwnMessage(chatMessage.sender_id)
              return (
                <div key={chatMessage.id} className={`max-w-[65%] rounded-2xl px-4 py-3 text-sm leading-5 ${own ? 'self-end rounded-tr-sm bg-cindel-bubble' : 'self-start rounded-tl-sm bg-cindel-accent'}`}>
                  <p>{chatMessage.body}</p>
                  <p className="mt-1 text-right text-[10px] text-cindel-muted">{new Date(chatMessage.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              )
            })}
          </div>
          <div className="flex items-center gap-2 border-t border-cindel-border bg-cindel-bg px-4 py-3"><button type="button" aria-label="Attach file" className="text-cindel-muted hover:text-white"><Paperclip className="size-5" /></button><input value={message} onChange={(event) => setMessage(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.nativeEvent.isComposing && event.keyCode !== 229) sendMessage() }} placeholder="Type a message..." className="flex-1 rounded-xl border border-cindel-border bg-cindel-panel px-4 py-3 text-sm text-white outline-none placeholder:text-cindel-muted focus:border-cindel-accent" /><button type="button" onClick={sendMessage} aria-label="Send message" className="flex size-11 items-center justify-center rounded-full bg-cindel-accent text-white transition hover:bg-cindel-accent/80"><Send className="size-5" /></button></div>
        </section>
      </div>
      <div className="sr-only">Signed in as {email}</div>
    </main>
  )
}
