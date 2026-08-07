/** A user profile / participant. */
export type Profile = {
  id: string
  phone: string | null
  username: string | null
  avatar_url: string | null
  last_seen: string | null
  created_at: string | null
}

/** A direct/group conversation. */
export type Conversation = {
  id: string
  created_at: string
  participants: Profile[]
}

/** A single chat message. */
export type Message = {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  created_at: string
}

/** Shape used by the left sidebar to render a conversation row. */
export type ConversationPreview = {
  conversationId: string
  other: Profile | null
  lastMessage: string | null
  lastTime: string | null
  unread: number
}
