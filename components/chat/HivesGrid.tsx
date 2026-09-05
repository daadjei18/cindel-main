'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { MessageCircle, Plus } from 'lucide-react'
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Avatar } from './Avatar'
import type { ConversationPreview } from '@/lib/types'

/**
 * Real CSS hexagon via the .hex class defined in app/globals.css:
 *   clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)
 * Using a plain CSS class guarantees the hexagon renders (Tailwind arbitrary
 * values with commas can silently fail to generate).
 */
const HEX = 'hex'

/** One "+ New chat" slot always trails the real conversations. */
const MIN_HIVES = 1

/**
 * Compact hexagon (64px x 74px) so a full desktop row of 4 fits the fixed
 * 280px rail without clipping. 4 x (64 + 2px gap) = 264px = the padded rail.
 */
const HIVE_SIZE = 'h-[74px] w-16'

/** One honeycomb slot = hexagon width (64px) + a 2px seam. */
const PITCH = 66

/**
 * True honeycomb interlock inside the 280px rail:
 *  - rows are centered; an offset row has one fewer hexagon, so centering
 *    shifts it by exactly half a hexagon pitch (no manual padding needed)
 *  - each row after the first pulls up by ~1/4 of the hex height so the
 *    hexagon points nest into the valleys of the row above
 */
const ROW_OVERLAP_CLASS = '-mt-[18px]'

// ---------------------------------------------------------------------------
// Hive shape + mapper
// ---------------------------------------------------------------------------

export type Hive = {
  id: string
  name: string
  avatar: string
  lastMessage: string
  empty?: boolean
  /** Sort order in the honeycomb (0 = top-left). Persisted to Supabase. */
  position: number
}

/**
 * Maps Supabase conversation previews into Hive cells.
 * Real conversations first, then a single "+ New chat" slot so the grid never
 * fills with dead placeholder hives.
 * (conversations already come from useChat() -> lib/chat-api.ts -> Supabase)
 */
export function mapConversationsToHives(conversations: ConversationPreview[]): Hive[] {
  const hives: Hive[] = conversations.map((c, i) => ({
    id: c.conversationId,
    name: c.other?.username ?? 'Unknown',
    avatar: c.other?.avatar_url ?? '',
    lastMessage: c.lastMessage ?? '',
    position: i,
  }))

  // Always end with exactly one "+" tile to start a new chat.
  hives.push({
    id: `empty-${hives.length}`,
    name: '',
    avatar: '',
    lastMessage: '',
    empty: true,
    position: hives.length,
  })
  // Load hives already sorted by position (drag/drop reorder persists).
  return hives.sort((a, b) => a.position - b.position)
}

// ---------------------------------------------------------------------------
// Vertical-scroll honeycomb row builder
// ---------------------------------------------------------------------------

type HiveRow = {
  cells: Hive[]
  isOffset: boolean
  startIndex: number
}

/**
 * Groups hives into honeycomb rows for a VERTICAL SCROLL layout.
 * Pattern (1-indexed): odd rows hold `cols` cells (centered), even rows hold
 * `cols - 1` cells offset 50% to the right -> true honeycomb interlock.
 */
export function buildRows(hives: Hive[], cols: number): HiveRow[] {
  const rows: HiveRow[] = []
  let i = 0
  let rowIndex = 0
  while (i < hives.length) {
    const isOffset = rowIndex % 2 === 1
    const size = isOffset ? Math.max(cols - 1, 1) : cols
    rows.push({ cells: hives.slice(i, i + size), isOffset, startIndex: i })
    i += size
    rowIndex += 1
  }
  return rows
}

/**
 * Columns by the HONEYCOMB RAIL width (a fixed 280px column, not the whole
 * viewport). Anything >= ~210px fits 4 compact hexagons (264px); only very
 * narrow rails drop to 2.
 */
function colsForWidth(width: number): number {
  if (width < 210) return 2
  return 4
}

// ---------------------------------------------------------------------------
// Sortable hive cell
// ---------------------------------------------------------------------------

type SortableCellProps = {
  hive: Hive
  isActive: boolean
  onSelectHive: (id: string) => void
  onEmptyClick: () => void
}

function SortableCell({ hive, isActive, onSelectHive, onEmptyClick }: SortableCellProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({ id: hive.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    // While dragging: scale-110, z-50, opacity-80
    ...(isDragging
      ? { transform: `${CSS.Transform.toString(transform)} scale(1.1)`, zIndex: 50, opacity: 0.8 }
      : {}),
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-hive-id={hive.id}
      data-hive-empty={hive.empty ? 'true' : 'false'}
      data-draggable="true"
      // Drop zone: subtle purple outline when another hexagon is dragged over it.
      className={`flex flex-col items-center ${
        isOver && !isDragging ? 'rounded-xl outline outline-2 outline-cindel-accent/70' : ''
      }`}
    >
      {hive.empty ? (
        <>
          {/* Empty hive: dashed outline, NO hover highlight */}
          <button
            {...attributes}
            {...listeners}
            type="button"
            onClick={onEmptyClick}
            className={`relative ${HIVE_SIZE} cursor-grab opacity-40 active:cursor-grabbing ${
              isDragging ? 'scale-110 z-50 opacity-80' : ''
            }`}
          >
            <span className={`${HEX} absolute inset-0`}>
              <span
                className={`${HEX} absolute inset-[2px] flex items-center justify-center border-2 border-dashed border-[#555] bg-transparent`}
              >
                <Plus className="size-4 text-[#555]" />
              </span>
            </span>
          </button>
          <span className="text-[8px] text-cindel-muted">New chat</span>
        </>
      ) : (
        <>
          {/* Filled hive: avatar + name + last message, hover scale only here */}
          <button
            {...attributes}
            {...listeners}
            type="button"
            onClick={() => onSelectHive(hive.id)}
            className={`relative ${HIVE_SIZE} cursor-grab transition-transform duration-200 hover:scale-105 active:cursor-grabbing ${
              isActive ? 'rounded-xl ring-4 ring-cindel-accent' : ''
            } ${isDragging ? 'scale-110 z-50 opacity-80' : ''}`}
          >
            <span className={`${HEX} absolute inset-0 bg-gradient-to-b from-cindel-panel to-[#16161c]`}>
              <span
                className={`${HEX} absolute inset-[2px] flex flex-col items-center justify-center gap-0.5 bg-[#0d0d11] p-1.5`}
              >
                <Avatar name={hive.name} size="size-8" />
                <span className="max-w-full truncate text-[9px] font-semibold text-white">
                  {hive.name}
                </span>
                <span className="max-w-full truncate text-[7px] text-cindel-muted">
                  {hive.lastMessage}
                </span>
              </span>
            </span>
          </button>
        </>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// HivesGrid props
// ---------------------------------------------------------------------------

export type HivesGridProps = {
  conversations: ConversationPreview[]
  activeConversationId: string | null
  query: string
  onSelectHive: (id: string) => void
  onNewHive: () => void
  /** Called after a drag-end with all hives in their new order. */
  onReorderHives: (hives: Hive[]) => void
}

export function HivesGrid({
  conversations,
  activeConversationId,
  query,
  onSelectHive,
  onNewHive,
  onReorderHives,
}: HivesGridProps) {
  const cellRefs = useRef(new Map<string, HTMLDivElement | null>())
  const gridRef = useRef<HTMLDivElement | null>(null)
  const [cols, setCols] = useState(4)

  // Supabase data -> honeycomb grid
  const hives = useMemo(() => mapConversationsToHives(conversations), [conversations])

  // Zero real conversations: no filler hexes, show a designed empty state.
  const isEmpty = hives.length === 1 && hives[0]?.empty === true

  // Responsive columns based on the actual container width (2 / 3 / 4).
  useEffect(() => {
    const el = gridRef.current
    if (!el) return
    const update = () => setCols(colsForWidth(el.clientWidth))
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // VERTICAL SCROLL HONEYCOMB GRID: rows stack top-to-bottom, scroll down for more.
  const rows = useMemo(() => buildRows(hives, cols), [hives, cols])

  // Drag activation: require ~200ms hold OR small movement threshold so a plain
  // click still opens the chat / starts a new chat instead of starting a drag.
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    }),
  )

  // Search: filter by hive name or last message. On a match, scroll to it and
  // flash a purple ring highlight for 2s. No match => do nothing.
  useEffect(() => {
    const q = query.trim().toLowerCase()
    if (!q) return
    const match = hives.find(
      (h) =>
        !h.empty &&
        (h.name.toLowerCase().includes(q) || h.lastMessage.toLowerCase().includes(q)),
    )
    if (!match) return
    const el = cellRefs.current.get(match.id)
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    el.classList.add('ring-4', 'ring-cindel-accent', 'rounded-xl')
    const timer = setTimeout(() => {
      el.classList.remove('ring-4', 'ring-cindel-accent', 'rounded-xl')
    }, 2000)
    return () => clearTimeout(timer)
  }, [query, hives])

  // Empty hive clicked => confirm, then create a new hive at this position.
  const handleEmptyClick = () => {
    // TODO(Simeon): add a flow to place a user into this hive position.
    if (window.confirm('Start new chat in this hive?')) {
      onNewHive()
    }
  }

  // Drag end: reorder the flat array, renumber positions, rebuild rows, persist.
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const fromIndex = hives.findIndex((h) => h.id === active.id)
    const toIndex = hives.findIndex((h) => h.id === over.id)
    if (fromIndex < 0 || toIndex < 0) return

    const reordered = arrayMove(hives, fromIndex, toIndex).map((h, i) => ({
      ...h,
      position: i,
    }))

    onReorderHives(reordered)
  }

  return (
    <div
      ref={gridRef}
      className="h-full min-w-0 flex-1 overflow-y-auto overflow-x-hidden px-2 py-4"
    >
      {isEmpty ? (
        <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
          <span
            className={`${HEX} flex size-16 items-center justify-center border-2 border-dashed border-[#555] bg-transparent`}
          >
            <MessageCircle className="size-6 text-[#555]" />
          </span>
          <div className="flex flex-col gap-1">
            <p className="text-sm font-semibold text-white">No hives yet</p>
            <p className="max-w-[200px] text-xs leading-5 text-cindel-muted">
              Start a chat with a Cindel user and it will appear here as a hive.
            </p>
          </div>
          <button
            type="button"
            onClick={onNewHive}
            className="rounded-lg bg-cindel-accent px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-cindel-accent/80"
          >
            Start your first chat
          </button>
        </div>
      ) : (
      <DndContext sensors={sensors} onDragEnd={handleDragEnd} collisionDetection={closestCenter}>
        <SortableContext items={hives.map((h) => h.id)} strategy={rectSortingStrategy}>
          <div className="flex flex-col">
            {rows.map((row, rowIndex) => {
              // Slot-exact strips: every row is a fixed-width strip of N cell
              // slots. Missing slots render as invisible spacers, so a row's
              // cells always sit in the SAME grid columns (no drifting when a
              // row is partially full). Offset rows are one slot narrower and
              // centered, which shifts them half a pitch -> real interlock.
              const slotCount = row.isOffset ? cols - 1 : cols
              const stripWidth = slotCount * PITCH
              const emptySlots = Math.max(slotCount - row.cells.length, 0)
              return (
                <div
                  key={rowIndex}
                  className={`mx-auto flex justify-start ${
                    rowIndex > 0 ? ROW_OVERLAP_CLASS : ''
                  }`}
                  style={{ width: stripWidth }}
                >
                  {row.cells.map((hive, cellIndex) => {
                    const isActive = !hive.empty && hive.id === activeConversationId
                    return (
                      <div
                        key={hive.id}
                        ref={(el) => {
                          cellRefs.current.set(hive.id, el)
                        }}
                        data-hive-index={row.startIndex + cellIndex}
                        className="w-[66px] shrink-0"
                      >
                        <SortableCell
                          hive={hive}
                          isActive={isActive}
                          onSelectHive={onSelectHive}
                          onEmptyClick={handleEmptyClick}
                        />
                      </div>
                    )
                  })}
                  {Array.from({ length: emptySlots }).map((_, i) => (
                    <div key={`pad-${i}`} className="w-[66px] shrink-0" aria-hidden="true" />
                  ))}
                </div>
              )
            })}
          </div>
        </SortableContext>
      </DndContext>
      )}
    </div>
  )
}
