import { supabase } from '@/lib/supabase'
import type { ConversationPreview, Message, Profile } from '@/lib/types'

/** Fetch the signed-in user's profile. */
export async function fetchCurrentUser(uid: string): Promise<Profile | null> {
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', uid)
    .single()
  return (data as Profile | null) ?? null
}

type PreviewRow = {
  conversation_id: string
  other_id: string
  other_username: string | null
  other_avatar_url: string | null
  other_status: string | null
  other_last_seen: string | null
  last_message: string | null
  last_time: string | null
  last_sender_id: string | null
  unread_count: number | null
}

/**
 * One SQL call returns ONE row per conversation:
 *  - no more duplicate "Me" row for your own participant entry
 *  - no more downloading entire message histories (SQL picks the last one)
 *  - no contact details exposed to other users
 */
export async function fetchConversations(uid: string): Promise<ConversationPreview[]> {
  const { data, error } = await supabase.rpc('get_conversation_previews', { p_uid: uid })
  if (error) {
    console.log('fetchConversations error', error)
    return []
  }
  const rows = (data ?? []) as PreviewRow[]
  return rows
    .map((r) => {
      const mine = r.last_sender_id === uid
      const other: Profile = {
        id: r.other_id,
        email: null, // email is never exposed to other clients
        username: r.other_username,
        avatar_url: r.other_avatar_url,
        last_seen: r.other_last_seen,
        status: r.other_status,
        created_at: null,
      }
      return {
        conversationId: r.conversation_id,
        other,
        lastMessage: r.last_message ? (mine ? `You: ${r.last_message}` : r.last_message) : 'Start chatting',
        lastTime: r.last_time,
        unread: Number(r.unread_count ?? 0),
      }
    })
    .sort((a, b) => (b.lastTime ?? '').localeCompare(a.lastTime ?? ''))
}

/** Load all messages for one conversation (oldest first) — now bounded to one chat. */
export async function fetchMessages(convId: string): Promise<Message[]> {
  const { data } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', convId)
    .order('created_at', { ascending: true })
  return (data ?? []) as Message[]
}

/** Insert a message and return the saved row (needed for optimistic UI). */
export async function insertMessage(convId: string, senderId: string, content: string) {
  return supabase
    .from('messages')
    .insert({ conversation_id: convId, sender_id: senderId, content })
    .select('*')
    .single()
}

/** Update the current user's status text in the database. */
export async function updateProfileStatus(uid: string, status: string): Promise<{ error?: string }> {
  const { error } = await supabase
    .from('profiles')
    .update({ status })
    .eq('id', uid)
  return { error: error?.message }
}

/** Update the current user's display name in the database. */
export async function updateProfileUsername(uid: string, name: string): Promise<{ error?: string }> {
  const { error } = await supabase
    .from('profiles')
    .update({ username: name })
    .eq('id', uid)
  return { error: error?.message }
}

/** Create (or reuse) a 1:1 conversation with the user who owns `username`. */
export async function startConversationWith(username: string): Promise<{ convId?: string; error?: string }> {
  const normalized = username.trim()
  if (!normalized) return { error: 'Enter a username.' }
  const { data: convId, error } = await supabase.rpc('create_conversation', {
    other_username: normalized,
  })
  if (error) return { error: error.message }
  return { convId: convId as string }
}

/** Load saved hive order (array of conversation ids, first = top-left). */
export async function fetchHiveOrder(uid: string): Promise<string[]> {
  const { data } = await supabase
    .from('hive_positions')
    .select('conversation_id, position')
    .eq('user_id', uid)
    .order('position', { ascending: true })
  return ((data ?? []) as { conversation_id: string }[]).map((r) => r.conversation_id)
}

/** Save hive order. Upsert = one atomic call (no delete-then-insert). */
export async function saveHiveOrder(uid: string, orderedIds: string[]) {
  return supabase.from('hive_positions').upsert(
    orderedIds.map((conversation_id, position) => ({ user_id: uid, conversation_id, position })),
    { onConflict: 'user_id,conversation_id' },
  )
}