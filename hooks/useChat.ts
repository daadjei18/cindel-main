'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import {
  fetchConversations,
  fetchCurrentUser,
  fetchMessages,
  insertMessage,
  startConversationWith,
} from '@/lib/chat-api'
import type { ConversationPreview, Message, Profile } from '@/lib/types'

export type UseChatResult = {
  loading: boolean
  error: string | null
  currentUser: Profile | null
  conversations: ConversationPreview[]
  activeConversationId: string | null
  activeMessages: Message[]
  activeOther: Profile | null
  setActiveConversationId: (id: string | null) => void
  sendMessage: (content: string) => Promise<void>
  startConversation: (phone: string) => Promise<{ ok: boolean; error?: string }>
}

export function useChat(): UseChatResult {
  const [currentUser, setCurrentUser] = useState<Profile | null>(null)
  const [conversations, setConversations] = useState<ConversationPreview[]>([])
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [activeMessages, setActiveMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  // Load profile + conversations once for the signed-in user.
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
        const uid = await getUid()
        if (!uid) {
          // No authed session (e.g. dev-stub user). Treat as no conversations.
          if (!cancelled) {
            setConversations([])
            setCurrentUser(null)
            setLoading(false)
          }
          return
        }
        const me = await fetchCurrentUser(uid)
        const convs = await fetchConversations(uid)
        if (cancelled) return
        setCurrentUser(me)
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
  }, [getUid])

  // Load messages when the active conversation changes.
  useEffect(() => {
    if (!activeConversationId) {
      setActiveMessages([])
      return
    }
    let cancelled = false
    fetchMessages(activeConversationId).then((msgs) => {
      if (!cancelled) setActiveMessages(msgs)
    })
    return () => {
      cancelled = true
    }
  }, [activeConversationId])

  // Realtime: subscribe to new messages in the active conversation.
  useEffect(() => {
    if (!activeConversationId) return
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
      if (!trimmed || !activeConversationId || !currentUser) return
      const { error } = await insertMessage(activeConversationId, currentUser.id, trimmed)
      if (error) setError(error.message)
    },
    [activeConversationId, currentUser],
  )

  // Start (or reuse) a 1:1 conversation with another user by phone.
  const startConversation = useCallback(
    async (phone: string) => {
      const res = await startConversationWith(phone)
      if (res.error) return { ok: false, error: res.error }
      const uid = await getUid()
      if (uid) {
        const convs = await fetchConversations(uid)
        setConversations(convs)
      }
      setActiveConversationId(res.convId ?? null)
      return { ok: true }
    },
    [getUid],
  )

  const activeOther = useMemo(() => {
    const found = conversations.find((c) => c.conversationId === activeConversationId)
    return found?.other ?? null
  }, [conversations, activeConversationId])

  return {
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
  }
}
