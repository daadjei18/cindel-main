'use client'

import { useEffect, useRef, useState } from 'react'

/* ------------------------------------------------------------------ */
/* Theming                                                             */
/* ------------------------------------------------------------------ */

// Hexagon clip-path (pointy top/bottom, flat left/right). Used inline so the
// component works standalone in any React + Tailwind project.
const HEX = 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)'

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

type ChatMessage = {
  id: number
  from: 'me' | 'maya'
  text: string
  time: string
}

/* ------------------------------------------------------------------ */
/* Mock data — the 4 messages shown in the reference                   */
/* ------------------------------------------------------------------ */

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: 1,
    from: 'maya',
    text: 'Hey! Just got your message about the new hive 🐝',
    time: '12:10 PM - Sun',
  },
  {
    id: 2,
    from: 'me',
    text: 'Yesss, super excited to get it started!',
    time: '12:12 PM - Sun',
  },
  {
    id: 3,
    from: 'maya',
    text: 'I added a few members. Check the list when you can ✨',
    time: '12:14 PM - Sun',
  },
  {
    id: 4,
    from: 'me',
    text: 'Love it. Let’s meet tomorrow to plan the first event!',
    time: '12:15 PM - Sun',
  },
]

/* ------------------------------------------------------------------ */
/* Small building blocks                                               */
/* ------------------------------------------------------------------ */

/** Hexagon-shaped avatar with initials. Purple ring when online. */
function HexAvatar({
  label,
  online = false,
  size = 'size-9',
  accent = false,
}: {
  label: string
  online?: boolean
  size?: string
  accent?: boolean
}) {
  return (
    <span className={`relative inline-flex shrink-0 ${size}`} style={{ clipPath: HEX }}>
      <span
        className={`flex h-full w-full items-center justify-center text-sm font-bold text-white ${
          accent ? 'bg-cindel-accent' : 'bg-cindel-panel'
        }`}
      >
        {label}
      </span>
      {online && (
        <span className="absolute bottom-0 right-0 size-2.5 rounded-full border-2 border-cindel-bg bg-cindel-online" />
      )}
    </span>
  )
}

/** A single sticky-note style message bubble. */
function MessageBubble({ message }: { message: ChatMessage }) {
  const mine = message.from === 'me'
  return (
    <div
      className={`flex w-full items-end gap-2 ${mine ? 'justify-end' : 'justify-start'}`}
    >
      {!mine && <HexAvatar label="MY" accent />}
      <div
        className={`relative max-w-[70%] rotate-[-1deg] rounded-lg px-4 py-2.5 shadow-lg ${
          mine
            ? 'bg-cindel-accent text-white'
            : 'bg-cindel-bubble text-white rotate-[1deg]'
        }`}
      >
        <p className="text-sm leading-5 text-white">{message.text}</p>
        <p
          className={`mt-1 text-[10px] ${
            mine ? 'text-white/80' : 'text-cindel-muted'
          }`}
        >
          {message.time}
        </p>
      </div>
      {mine && <HexAvatar label="YU" />}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* App                                                                 */
/* ------------------------------------------------------------------ */

export default function App() {
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES)
  const [input, setInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [newHiveCount, setNewHiveCount] = useState(12)
  const bottomRef = useRef<HTMLDivElement | null>(null)

  // Auto-scroll to bottom whenever a new message arrives.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  const send = () => {
    const text = input.trim()
    if (!text) return
    const now = new Date()
    const time = now.toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
    })
    const day = now.toLocaleDateString([], { weekday: 'short' })
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now(),
        from: 'me',
        text,
        time: `${time} - ${day}`,
      },
    ])
    setInput('')
  }

  const hiveCells = Array.from({ length: newHiveCount })

  return (
    <main className="flex h-screen w-full overflow-hidden bg-cindel-bg font-sans text-white">
      {/* ---------------------------------------------------------- */}
      {/* LEFT SIDEBAR — hexagon grid + profile                        */}
      {/* ---------------------------------------------------------- */}
      <aside className="flex w-[340px] shrink-0 flex-col border-r border-cindel-border bg-cindel-header">
        {/* Top: logo + search */}
        <div className="flex flex-col gap-3 border-b border-cindel-border p-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-extrabold tracking-tight text-white">
              Cin<span className="text-cindel-accent">del</span>
            </h1>
            <button
              type="button"
              onClick={() => setNewHiveCount((c) => c + 1)}
              className="rounded-lg bg-cindel-accent px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-cindel-accent/80"
            >
              + New Hive
            </button>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-cindel-border bg-cindel-panel px-3 py-2 text-sm text-cindel-muted">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-4 shrink-0">
              <circle cx="11" cy="11" r="7" />
              <path d="m21 21-4.3-4.3" strokeLinecap="round" />
            </svg>
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Hives..."
              className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-cindel-muted"
            />
          </div>
        </div>

        {/* Hives header */}
        <div className="flex items-center justify-between px-4 pb-2 pt-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-cindel-muted">
            Hives
          </span>
          <span className="text-xs text-cindel-muted">{newHiveCount} active</span>
        </div>

        {/* Hexagon grid — each hex has a "+" */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          <div className="grid grid-cols-4 gap-3 pt-2">
            {hiveCells.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setNewHiveCount((c) => c + 1)}
                className="relative aspect-square w-full transition-transform duration-200 hover:scale-105"
                aria-label={`New hive ${i + 1}`}
              >
                <span
                  className="absolute inset-0 flex items-center justify-center bg-cindel-panel"
                  style={{ clipPath: HEX }}
                >
                  <span
                    className="absolute inset-[2px] flex items-center justify-center border-2 border-dashed border-cindel-border bg-cindel-header"
                    style={{ clipPath: HEX }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-5 text-cindel-accent">
                      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                    </svg>
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Bottom: NIS profile */}
        <div className="flex items-center gap-3 border-t border-cindel-border p-4">
          <HexAvatar label="NIS" online accent />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">Nury Izzati Suhaimi</p>
            <p className="truncate text-xs text-cindel-muted">Online</p>
          </div>
          <button type="button" className="text-cindel-muted transition hover:text-white">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-5">
              <circle cx="12" cy="5" r="1" />
              <circle cx="12" cy="12" r="1" />
              <circle cx="12" cy="19" r="1" />
            </svg>
          </button>
        </div>
      </aside>

      {/* ---------------------------------------------------------- */}
      {/* RIGHT PANEL — Hive: Maya                                    */}
      {/* ---------------------------------------------------------- */}
      <section className="flex min-w-0 flex-1 flex-col bg-cindel-bg">
        {/* Chat header */}
        <header className="flex shrink-0 items-center justify-between border-b border-cindel-border bg-cindel-header px-5 py-3">
          <div className="flex items-center gap-3">
            <HexAvatar label="MY" online accent size="size-11" />
            <div>
              <h2 className="text-sm font-bold text-white">Hive: Maya</h2>
              <p className="text-xs text-cindel-muted">12 members • Online now</p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-white">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-5">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-5">
              <path d="m22 8-6 4 6 4V8Z" />
              <rect x="2" y="6" width="14" height="12" rx="2" />
            </svg>
          </div>
        </header>

        {/* Messages */}
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-5 py-4">
          <div className="mx-auto rounded-lg bg-cindel-panel px-3 py-1 text-[11px] text-white/60">
            Today
          </div>
          {messages.map((m) => (
            <MessageBubble key={m.id} message={m} />
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="flex shrink-0 items-end gap-2 border-t border-cindel-border bg-cindel-header px-4 py-3">
          <button
            type="button"
            aria-label="Attach file"
            className="flex size-10 shrink-0 items-center justify-center text-cindel-muted transition hover:text-white"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-5">
              <path d="M12 5v14M5 12h14" strokeLinecap="round" />
            </svg>
          </button>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.nativeEvent.isComposing) send()
            }}
            placeholder="Write a message to #Hive..."
            className="flex-1 rounded-xl border border-cindel-border bg-cindel-panel px-4 py-3 text-sm text-white outline-none placeholder:text-cindel-muted focus:border-cindel-accent"
          />
          {/* Hexagon send button */}
          <button
            type="button"
            onClick={send}
            aria-label="Send message"
            className="relative flex size-12 shrink-0 items-center justify-center transition hover:scale-105"
            style={{ clipPath: HEX }}
          >
            <span className="absolute inset-0 bg-cindel-accent" />
            <svg
              viewBox="0 0 24 24"
              fill="currentColor"
              className="relative z-10 size-5 text-white"
            >
              <path d="M3.4 20.4 20.85 12.92a1 1 0 0 0 0-1.84L3.4 3.6a.993.993 0 0 0-1.39.91L2 9.12c0 .5.37.93.87.99L17 12 2.87 13.88c-.5.07-.87.5-.87 1l.01 4.61c0 .71.73 1.2 1.39.91Z" />
            </svg>
          </button>
        </div>
      </section>
    </main>
  )
}
