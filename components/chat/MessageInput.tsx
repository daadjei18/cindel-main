'use client'

import { useState } from 'react'
import { Paperclip, Send } from 'lucide-react'

export type MessageInputProps = {
  placeholder?: string
  onSend: (content: string) => void
}

export function MessageInput({ placeholder = 'Type a message...', onSend }: MessageInputProps) {
  const [value, setValue] = useState('')

  const submit = () => {
    const trimmed = value.trim()
    if (!trimmed) return
    onSend(trimmed)
    setValue('')
  }

  return (
    <div className="flex items-center gap-2 border-t border-cindel-border bg-cindel-bg px-4 py-3">
      <button type="button" aria-label="Attach file" className="text-cindel-muted transition hover:text-white">
        <Paperclip className="size-5" />
      </button>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.nativeEvent.isComposing && e.keyCode !== 229) submit()
        }}
        placeholder={placeholder}
        className="flex-1 rounded-xl border border-cindel-border bg-cindel-panel px-4 py-3 text-sm text-white outline-none placeholder:text-cindel-muted focus:border-cindel-accent"
      />
      <button
        type="button"
        onClick={submit}
        aria-label="Send message"
        className="flex size-11 items-center justify-center rounded-full bg-cindel-accent text-white transition hover:bg-cindel-accent/80"
      >
        <Send className="size-5" />
      </button>
    </div>
  )
}
