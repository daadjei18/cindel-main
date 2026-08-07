/** Build initials from a display name, max 2 letters. */
export function initialsOf(name: string | null | undefined): string {
  if (!name) return '?'
  return name
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

/** Format an ISO timestamp as a short time (e.g. "14:05"). */
export function formatTime(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

/** A list of tone classes for avatar backgrounds. */
export const TONES = [
  'bg-cindel-violet',
  'bg-cindel-blue',
  'bg-cindel-pink',
  'bg-cindel-indigo',
  'bg-cindel-orchid',
]

/** Pick a tone deterministically from a string key. */
export function toneFor(key: string | null | undefined): string {
  const base = key ?? ''
  let hash = 0
  for (let i = 0; i < base.length; i++) {
    hash = (hash << 5) - hash + base.charCodeAt(i)
    hash |= 0
  }
  return TONES[Math.abs(hash) % TONES.length]
}
