'use client'

import Image from 'next/image'
import { Plus, Search } from 'lucide-react'
import { StatusDropdown } from './StatusDropdown'

const CINDEL_LOGO =
  'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/new_logo-removebg-preview-M56wuRQ1qh1E0XNJv9s6nlTGWgJ46K.png'

export type AppHeaderProps = {
  status: string
  onStatusChange: (status: string) => void
  onNewHive: () => void
  query: string
  onQueryChange: (query: string) => void
  /** Dev-only fake-hive preview state + setter (from useChat). */
  previewHiveCount: number | null
  onPreviewHiveCountChange: (count: number | null) => void
}

/**
 * Full-width fixed header that sits on top of the three scroll areas.
 * Contains the Cindel logo, status dropdown, search, "New Hive" button, and
 * (in dev only) the fake-hive preview toggle. flex-shrink-0 so it never
 * collapses.
 */
export function AppHeader({
  status,
  onStatusChange,
  onNewHive,
  query,
  onQueryChange,
  previewHiveCount,
  onPreviewHiveCountChange,
}: AppHeaderProps) {
  return (
    <header className="flex shrink-0 items-center justify-between gap-2 border-b border-cindel-border bg-cindel-header px-3 py-3 sm:gap-4 sm:px-5">
      <div className="flex items-center gap-2 sm:gap-4">
        <Image
          src={CINDEL_LOGO}
          alt="Cindel logo"
          width={120}
          height={40}
          priority
          className="h-auto w-24 sm:w-32"
        />
        <StatusDropdown status={status} onStatusChange={onStatusChange} />
      </div>

      <div className="min-w-0 max-w-xl flex-1">
        <label className="flex w-full items-center gap-2 rounded-lg border border-cindel-border bg-cindel-panel px-3 py-2 text-sm text-cindel-muted">
          <Search className="size-4 shrink-0" />
          <span className="sr-only">Search hives</span>
          <input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search Hives..."
            className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-cindel-muted"
          />
        </label>
      </div>

      {/* Dev-only fake-hive preview toggle. Never rendered in production. */}
      {process.env.NODE_ENV !== 'production' && (
        <label className="flex shrink-0 items-center gap-1.5 rounded-lg border border-cindel-border bg-cindel-panel px-2 py-1.5">
          <span className="hidden text-[10px] font-semibold uppercase tracking-wider text-cindel-muted sm:inline">
            Preview
          </span>
          <select
            value={previewHiveCount ?? 0}
            onChange={(e) => {
              const n = Number(e.target.value)
              onPreviewHiveCountChange(n > 0 ? n : null)
            }}
            aria-label="Preview fake hives"
            className="cursor-pointer bg-transparent text-xs font-semibold text-white outline-none"
          >
            <option value={0}>Off</option>
            {[1, 3, 6, 12, 24, 48].map((n) => (
              <option key={n} value={n}>
                {n} hives
              </option>
            ))}
          </select>
        </label>
      )}

      <button
        type="button"
        onClick={onNewHive}
        className="flex shrink-0 items-center gap-1.5 rounded-lg bg-cindel-accent px-3 py-2 text-xs font-semibold text-white transition hover:bg-cindel-accent/80"
      >
        <Plus className="size-4" />
        <span className="hidden sm:inline">New Hive</span>
      </button>
    </header>
  )
}
