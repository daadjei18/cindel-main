'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, Pencil, Sparkles } from 'lucide-react'

export type StatusDropdownProps = {
  status: string
  onStatusChange: (status: string) => void
}

export const STATUS_PRESETS = [
  'Available',
  'Very busy',
  'In a meeting',
  'At work',
  'On vacation',
  'Sleeping',
]

/**
 * Clickable status pill in the sidebar header. Opens a dropdown with preset
 * situations plus a "Custom…" option that reveals an inline text input.
 */
export function StatusDropdown({ status, onStatusChange }: StatusDropdownProps) {
  const [open, setOpen] = useState(false)
  const [showCustom, setShowCustom] = useState(false)
  const [customValue, setCustomValue] = useState('')
  const rootRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  // Close when clicking outside.
  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false)
        setShowCustom(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  // Focus the custom input when it appears.
  useEffect(() => {
    if (showCustom) inputRef.current?.focus()
  }, [showCustom])

  const pick = (value: string) => {
    onStatusChange(value)
    setOpen(false)
    setShowCustom(false)
    setCustomValue('')
  }

  const submitCustom = () => {
    const trimmed = customValue.trim()
    if (trimmed) pick(trimmed)
  }

  return (
    <div ref={rootRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="group flex max-w-full items-center gap-1 rounded-lg px-2 py-1 text-xs text-cindel-muted transition hover:bg-cindel-panel hover:text-white"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Sparkles className="size-3 shrink-0 text-cindel-accent" />
        <span className="truncate">{status}</span>
        <ChevronDown
          className={`size-3 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute left-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-xl border border-cindel-border bg-cindel-header shadow-2xl shadow-black/40"
        >
          <p className="px-4 pb-1 pt-3 text-[10px] font-medium uppercase tracking-widest text-cindel-muted">
            Set your situation
          </p>
          <div className="max-h-64 overflow-y-auto p-1.5">
            {STATUS_PRESETS.map((option) => (
              <button
                key={option}
                type="button"
                role="menuitem"
                onClick={() => pick(option)}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition hover:bg-cindel-panel ${
                  status === option ? 'text-white' : 'text-cindel-muted hover:text-white'
                }`}
              >
                <span className="truncate">{option}</span>
                {status === option && <Check className="size-4 shrink-0 text-cindel-accent" />}
              </button>
            ))}

            <div className="my-1.5 border-t border-cindel-border" />

            {showCustom ? (
              <div className="flex items-center gap-2 px-1 py-1">
                <input
                  ref={inputRef}
                  value={customValue}
                  onChange={(e) => setCustomValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.nativeEvent.isComposing && e.keyCode !== 229) {
                      submitCustom()
                    }
                    if (e.key === 'Escape') setShowCustom(false)
                  }}
                  placeholder="Type a situation…"
                  className="min-w-0 flex-1 rounded-lg border border-cindel-border bg-cindel-panel px-3 py-1.5 text-sm text-white outline-none placeholder:text-cindel-muted focus:border-cindel-accent"
                />
                <button
                  type="button"
                  onClick={submitCustom}
                  className="shrink-0 rounded-lg bg-cindel-accent px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-cindel-accent/80"
                >
                  Set
                </button>
              </div>
            ) : (
              <button
                type="button"
                role="menuitem"
                onClick={() => setShowCustom(true)}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-cindel-muted transition hover:bg-cindel-panel hover:text-white"
              >
                <Pencil className="size-4 shrink-0" />
                Custom…
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

