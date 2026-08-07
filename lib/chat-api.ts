import { supabase } from '@/lib/supabase'
import type { ConversationPreview, Message, Profile } from '@/lib/types'

const DEFAULT_OTHER: Profile = {
  id: 'me',
  phone: null,
  username: 'Me',
  avatar_url: null,
  last_seen: null,
  created_at: null,
}

/** Fetch the signed-in user's profile. */
export async function fetchCurrentUser(uid: string): Promise<Profile | null> {
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', uid)
    .single()
  return (data as Profile | null) ?? null
}

/** Load conversation previews (with the "other" participant + last message). */
export async function fetchConversations(uid: string): Promise<ConversationPreview[]> {
  const { data: membership } = await supabase
    .from('conversation_participants')
    .select('conversation_id')
    .eq('user_id', uid)

  const convIds = (membership ?? [])
    .map((m) => (m as { conversation_id: string }).conversation_id)
    .filter(Boolean)

  if (convIds.length === 0) return []

  const { data: parts } = await supabase
    .from('conversation_participants')
    .select(`conversation_id, profile:user_id (id, phone, username, avatar_url, last_seen)`)
    .in('conversation_id', convIds)

  const { data: msgs } = await supabase
    .from('messages')
    .select('conversation_id, content, created_at, sender_id')
    .in('conversation_id', convIds)
    .order('created_at', { ascending: true })

  const byConv = new Map<string, Message[]>()
  for (const m of msgs ?? []) {
    const arr = byConv.get(m.conversation_id) ?? []
    arr.push(m as Message)
    byConv.set(m.conversation_id, arr)
  }

const previews: ConversationPreview[] = (parts ?? []).map((row) => {
const convId = (row as { conversation_id: string }).conversation_id
    // Supabase returns the joined profile as an array (to-one not inferred).
    const rawProfile = (row as unknown as { profile?: Profile | Profile[] }).profile
    const profile = Array.isArray(rawProfile) ? (rawProfile[0] as Profile) : rawProfile
    const other = profile && profile.id !== uid ? profile : { ...DEFAULT_OTHER, id: uid }
    const list = byConv.get(convId) ?? []
    const last = list[list.length - 1]
    return {
      conversationId: convId,
      other,
      lastMessage: last ? (last.sender_id === uid ? `You: ${last.content}` : last.content) : 'Start chatting',
      lastTime: last ? last.created_at : null,
      unread: 0,
    }
  })

  previews.sort((a, b) => (b.lastTime ?? '').localeCompare(a.lastTime ?? ''))
  return previews
}

/** Load all messages for a conversation, oldest first. */
export async function fetchMessages(convId: string): Promise<Message[]> {
  const { data } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', convId)
    .order('created_at', { ascending: true })
  return (data ?? []) as Message[]
}

/** Insert a new message into a conversation. */
export async function insertMessage(convId: string, senderId: string, content: string) {
  return supabase.from('messages').insert({
    conversation_id: convId,
    sender_id: senderId,
    content,
  })
}

/** Create (or reuse) a 1:1 conversation with the user who owns `phone`. */
export async function startConversationWith(phone: string): Promise<{ convId?: string; error?: string }> {
  const normalized = phone.replace(/\D/g, '')
  if (!normalized) return { error: 'Enter a phone number.' }
  const { data: convId, error } = await supabase.rpc('create_conversation', {
    other_phone: normalized,
  })
  if (error) return { error: error.message }
  return { convId: convId as string }
}
