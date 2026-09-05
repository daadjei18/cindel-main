'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import {
  fetchConversations,
  fetchCurrentUser,
  fetchMessages,
  insertMessage,
  startConversationWith,
  updateProfileStatus,
  updateProfileUsername,
} from '@/lib/chat-api'
import type { ConversationPreview, Message, Profile } from '@/lib/types'

export type UseChatResult = {
  loading: boolean
  error: string | null
  currentUser: Profile | null
  displayName: string
  status: string
  conversations: ConversationPreview[]
  /** Dev preview: number of fake hives shown (null = real data). */
  previewHiveCount: number | null
  setPreviewHiveCount: (count: number | null) => void
  activeConversationId: string | null
  activeMessages: Message[]
  activeOther: Profile | null
  setActiveConversationId: (id: string | null) => void
  sendMessage: (content: string) => Promise<void>
  startConversation: (username: string) => Promise<{ ok: boolean; error?: string }>
  setStatus: (status: string) => Promise<void>
  setName: (name: string) => Promise<void>
}

const DEFAULT_STATUS = 'Very busy'
const DEFAULT_NAME = 'Me'

// ---------------------------------------------------------------------------
// Dev-only fake-hive preview (header toggle)
// ---------------------------------------------------------------------------
// Lets the honeycomb grid (and its chats) be reviewed with N fake conversations
// without database rows. Controlled from the AppHeader "Preview hives" select;
// state lives here as previewHiveCount, and fake ids are prefixed `preview-` so
// they never touch Supabase. Never activates in production.
const FAKE_NAMES = [
  'Ama',
  'Maya',
  'Kofi',
  'Zara',
  'Leo',
  'Nana',
  'Ravi',
  'Ines',
  'Tom',
  'Sara',
  'Jade',
  'Omar',
  'Lily',
  'Hugo',
  'Ada',
  'Yuki',
  'Noah',
  'Eva',
  'Finn',
  'Iris',
]
const FAKE_STATUSES = [
  'Very busy',
  'Online',
  'In a meeting',
  'Out for lunch',
  'On vacation 🌴',
  'In the zone',
]
const FAKE_LAST_LINES = [
  'Hey! Just got your message about the new hive 🐝',
  'Yesss, super excited to get it started!',
  'I added a few members. Check the list when you can ✨',
  'Love it. Let’s meet tomorrow to plan the first event!',
  'Did you see the mockup I sent?',
  'Lunch at 1? I know a good spot nearby.',
  'The demo is live — go take a look 🎉',
  'Can you review my PR when you have a sec?',
  'Thanks, that means a lot 🙏',
  'Meet you at the usual place 😄',
]
const FAKE_MINE_LINES = [
  'Hey!',
  'Yesss, so excited 🎉',
  'I love it!',
  'Let’s do it tomorrow',
  'Perfect 👌',
  'Sounds like a plan!',
]
const FAKE_OTHER_LINES = [
  'Hey! Just got your message 🐝',
  'I added a few members ✨',
  'Check the mockup I sent you',
  'Great, see you then!',
  'Can you review my PR?',
  'The demo is live now 🎉',
]
const FAKE_REPLIES = [
  'Got it! 🐝',
  'Sounds great 👍',
  'On my way!',
  'Let me check and get back to you',
  'Haha love that',
  'Perfect, talk soon!',
]

/** Fake hives carry ids prefixed `preview-` so we never touch Supabase. */
function isFakeConversationId(id: string): boolean {
  return id.startsWith('preview-')
}

/** N fake 1:1 conversations (newest first, like the real fetch). */
function buildFakeConversations(count: number): ConversationPreview[] {
  const now = Date.now()
  return Array.from({ length: count }).map((_, i) => {
    const mine = i % 3 === 0
    const line = FAKE_LAST_LINES[i % FAKE_LAST_LINES.length]
    return {
      conversationId: `preview-${i}`,
      other: {
        id: `fake-user-${i}`,
        email: null,
        username: FAKE_NAMES[i % FAKE_NAMES.length],
        avatar_url: null,
        status: FAKE_STATUSES[i % FAKE_STATUSES.length],
        last_seen: new Date(now - (i + 1) * 3 * 60_000).toISOString(),
        created_at: null,
      },
      lastMessage: mine ? `You: ${line}` : line,
      lastTime: new Date(now - (i + 1) * 5 * 60_000).toISOString(),
      unread: i % 4 === 0 ? 1 : 0,
    }
  })
}

/** Deterministic little chat history for one fake hive (oldest first). */
function buildFakeMessages(convId: string, meId: string): Message[] {
  const parsed = Number.parseInt(convId.replace('preview-', ''), 10)
  const index = Number.isFinite(parsed) ? parsed : 0
  const now = Date.now()
  const total = 6
  return Array.from({ length: total }).map((_, k) => {
    const mine = k % 2 === 0
    return {
      id: `${convId}-msg-${k}`,
      conversation_id: convId,
      sender_id: mine ? meId : `fake-user-${index}`,
      content: mine
        ? FAKE_MINE_LINES[Math.floor(k / 2) % FAKE_MINE_LINES.length]
        : FAKE_OTHER_LINES[Math.floor(k / 2) % FAKE_OTHER_LINES.length],
      created_at: new Date(now - (total - k) * 4 * 60_000).toISOString(),
    }
  })
}

export function useChat(userId?: string): UseChatResult {
  const [currentUser, setCurrentUser] = useState<Profile | null>(null)
  const [displayName, setDisplayName] = useState<string>(DEFAULT_NAME)
  const [status, setStatusState] = useState<string>(DEFAULT_STATUS)
  const [conversations, setConversations] = useState<ConversationPreview[]>([])
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [activeMessages, setActiveMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // Dev-only: N fake hives injected from the header preview toggle.
  const [previewHiveCount, setPreviewHiveCount] = useState<number | null>(null)

  // Fake-hive preview: keep chats in memory and track the active conversation
  // so delayed fake replies never leak into another hive's view.
  const activeConversationIdRef = useRef<string | null>(activeConversationId)
  activeConversationIdRef.current = activeConversationId
  const fakeStore = useRef(new Map<string, Message[]>())

  const getUid = useCallback(async () => {
    const { data, error } = await supabase.auth.getUser()
    if (error) {
      console.log('useChat: getUser error', error)
      return null
    }
    const uid = data.user?.id ?? null
    if (uid) console.log('useChat: current user.id =', uid)
    return uid
  }, [])

  // Load profile + conversations whenever the user or preview toggle changes.
  useEffect(() => {
    let cancelled = false

    // Safety net: never stay on "Loading..." forever. After 1s force it off
    // so the ChatList empty state ("No conversations yet...") is shown even if
    // auth/db stalls, the user isn't authed, or the fetch hangs.
    const timer = setTimeout(() => {
      setLoading(false)
    }, 1000)

    async function init() {
      try {
        // Dev preview toggle: when a count is set, skip auth + Supabase
        // entirely and fill the grid with fake conversations instead.
        const fakeCount =
          process.env.NODE_ENV !== 'production' ? (previewHiveCount ?? 0) : 0
        if (fakeCount > 0) {
          if (!cancelled) {
            setConversations(buildFakeConversations(fakeCount))
            setCurrentUser({
              id: userId ?? 'preview-me',
              email: null,
              username: DEFAULT_NAME,
              avatar_url: null,
              status: DEFAULT_STATUS,
              last_seen: new Date().toISOString(),
              created_at: null,
            })
            setActiveConversationId(null)
            setLoading(false)
          }
          return
        }
        const uid = await getUid()
        if (!uid) {
          // No authed session (e.g. dev-stub user). Treat as no conversations.
          if (!cancelled) {
            setConversations([])
            setCurrentUser(null)
            setActiveConversationId(null)
            setLoading(false)
          }
          return
        }
        const me = await fetchCurrentUser(uid)
        const convs = await fetchConversations(uid)
        if (cancelled) return
        setCurrentUser(me)
        setStatusState(me?.status ?? DEFAULT_STATUS)
        setConversations(convs)
        setLoading(false)
      } catch (e) {
        console.log('useChat: failed to load chats', e)
        if (!cancelled) {
          setError('Failed to load chats')
          setLoading(false)
        }
      }
    }
    init()
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [getUid, userId, previewHiveCount])

  // Load messages when the active conversation changes.
  useEffect(() => {
    if (!activeConversationId) {
      setActiveMessages([])
      return
    }
    // Fake hives read/write an in-memory store — their ids don't exist in
    // Supabase, so skip the fetch and seed a little history instead.
    if (isFakeConversationId(activeConversationId)) {
      if (!fakeStore.current.has(activeConversationId)) {
        fakeStore.current.set(
          activeConversationId,
          buildFakeMessages(activeConversationId, userId ?? 'preview-me'),
        )
      }
      setActiveMessages(fakeStore.current.get(activeConversationId) ?? [])
      return
    }
    let cancelled = false
    fetchMessages(activeConversationId).then((msgs) => {
      if (!cancelled) setActiveMessages(msgs)
    })
    return () => {
      cancelled = true
    }
  }, [activeConversationId, userId])

  // Realtime: subscribe to new messages in the active conversation.
  useEffect(() => {
    if (!activeConversationId || isFakeConversationId(activeConversationId)) return
    const channel = supabase
      .channel(`messages:${activeConversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${activeConversationId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message
          setActiveMessages((prev) =>
            prev.some((m) => m.id === newMsg.id) ? prev : [...prev, newMsg],
          )
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [activeConversationId])

  // Send a message into the active conversation.
  const sendMessage = useCallback(
    async (content: string) => {
      const trimmed = content.trim()
      if (!trimmed || !activeConversationId) return
      // Fake preview: append to the in-memory chat and fire a canned reply.
      if (isFakeConversationId(activeConversationId)) {
        const convId = activeConversationId
        const history = fakeStore.current.get(convId) ?? []
        const mine: Message = {
          id: `${convId}-msg-${Date.now()}`,
          conversation_id: convId,
          sender_id: userId ?? 'preview-me',
          content: trimmed,
          created_at: new Date().toISOString(),
        }
        const updated = [...history, mine]
        fakeStore.current.set(convId, updated)
        setActiveMessages(updated)
        window.setTimeout(() => {
          const reply: Message = {
            id: `${convId}-msg-${Date.now()}`,
            conversation_id: convId,
            sender_id: `fake-user-${convId}`,
            content: FAKE_REPLIES[Math.floor(Math.random() * FAKE_REPLIES.length)],
            created_at: new Date().toISOString(),
          }
          const withReply = [...(fakeStore.current.get(convId) ?? []), reply]
          fakeStore.current.set(convId, withReply)
          if (activeConversationIdRef.current === convId) setActiveMessages(withReply)
        }, 1200)
        return
      }
      if (!currentUser) return
      const { error } = await insertMessage(activeConversationId, currentUser.id, trimmed)
      if (error) setError(error.message)
    },
    [activeConversationId, currentUser, userId],
  )

  // Start (or reuse) a 1:1 conversation with another user by username.
  const startConversation = useCallback(
    async (username: string) => {
      const name = username.trim()
      if (!name) return { ok: false, error: 'Enter a username.' }
      // Fake preview: "New Chat" just appends another fake hive.
      if (process.env.NODE_ENV !== 'production' && (previewHiveCount ?? 0) > 0) {
        const convId = `preview-${Date.now().toString(36)}`
        const other: Profile = {
          id: `fake-user-${convId}`,
          email: null,
          username: name,
          avatar_url: null,
          status: DEFAULT_STATUS,
          last_seen: new Date().toISOString(),
          created_at: null,
        }
        setConversations((prev) => [
          ...prev,
          { conversationId: convId, other, lastMessage: 'Start chatting', lastTime: null, unread: 0 },
        ])
        fakeStore.current.set(convId, [])
        setActiveConversationId(convId)
        return { ok: true }
      }
      const res = await startConversationWith(name)
      if (res.error) return { ok: false, error: res.error }
      const uid = await getUid()
      if (uid) {
        const convs = await fetchConversations(uid)
        setConversations(convs)
      }
      setActiveConversationId(res.convId ?? null)
      return { ok: true }
    },
    [getUid, previewHiveCount],
  )

// Update the current user's status (local first, then persist).
  const setStatus = useCallback(
    async (next: string) => {
      const trimmed = next.trim() || DEFAULT_STATUS
      setStatusState(trimmed)
      if (currentUser?.id) {
        const res = await updateProfileStatus(currentUser.id, trimmed)
        if (res.error) {
          console.log('useChat: failed to persist status', res.error)
        }
      }
    },
    [currentUser],
  )

// Update the current user's display name (local first, then persist).
  const setName = useCallback(
    async (name: string) => {
      const trimmed = name.trim()
      if (!trimmed) return
      setDisplayName(trimmed)
      setCurrentUser((prev) => (prev ? { ...prev, username: trimmed } : prev))
      const uid = currentUser?.id ?? userId
      if (uid) {
        const res = await updateProfileUsername(uid, trimmed)
        if (res.error) {
          console.log('useChat: failed to persist name', res.error)
        }
      }
    },
    [currentUser, userId],
  )

  const activeOther = useMemo(() => {
    const found = conversations.find((c) => c.conversationId === activeConversationId)
    return found?.other ?? null
  }, [conversations, activeConversationId])

  return {
    loading,
    error,
    currentUser,
    displayName,
    status,
    conversations,
    previewHiveCount,
    setPreviewHiveCount,
    activeConversationId,
    activeMessages,
    activeOther,
    setActiveConversationId,
    sendMessage,
    startConversation,
    setStatus,
    setName,
  }
}
