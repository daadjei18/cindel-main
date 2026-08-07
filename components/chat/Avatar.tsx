import { initialsOf, toneFor } from '@/lib/chat-utils'

export type AvatarProps = {
  name: string | null | undefined
  online?: boolean
  size?: string
}

/** Octagon avatar in the WhatsApp-like Cindel style. */
export function Avatar({ name, online = false, size = 'size-11' }: AvatarProps) {
  return (
    <span
      className={`relative inline-flex ${size} shrink-0 items-center justify-center ${toneFor(
        name,
      )} text-lg font-semibold text-white [clip-path:polygon(25%_3%,75%_3%,98%_25%,98%_75%,75%_97%,25%_97%,2%_75%,2%_25%)]`}
    >
      <span className="absolute inset-1 flex items-center justify-center bg-cindel-panel text-sm [clip-path:inherit]">
        {initialsOf(name)}
      </span>
      {online && (
        <span className="absolute bottom-0 right-0 size-2.5 rounded-full border-2 border-cindel-bg bg-cindel-online" />
      )}
    </span>
  )
}
