'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Plus } from 'lucide-react'
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

/** Minimum number of cells so the honeycomb always looks full. */
const MIN_HIVES = 12

/** Fixed hexagon size. */
const HIVE_SIZE = 'h-28 w-24'

/** Offset for even rows = half a hexagon width (w-24 = 96px => 48px = pl-12). */
const OFFSET_CLASS = 'pl-12'

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
 * Empty hives are appended to fill the grid up to at least MIN_HIVES cells.
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

  while (hives.length < MIN_HIVES) {
    hives.push({
      id: `empty-${hives.length}`,
      name: '',
      avatar: '',
      lastMessage: '',
      empty: true,
      position: hives.length,
    })
  }
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

/** Responsive columns: Mobile 2, Tablet 3, Desktop 4. */
function colsForWidth(width: number): number {
  if (width < 640) return 2
  if (width < 1024) return 3
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
                <Plus className="size-5 text-[#555]" />
              </span>
            </span>
          </button>
          <span className="mt-1 text-[8px] text-cindel-muted">Empty Hive</span>
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
                className={`${HEX} absolute inset-[2px] flex flex-col items-center justify-center gap-1 bg-[#0d0d11] p-2`}
              >
                <Avatar name={hive.name} size="size-10" />
                <span className="max-w-full truncate text-[10px] font-semibold text-white">
                  {hive.name}
                </span>
                <span className="max-w-full truncate text-[8px] text-cindel-muted">
                  {hive.lastMessage}
                </span>
              </span>
            </span>
          </button>
          <span className="mt-1 text-[8px] text-cindel-muted">{hive.name}</span>
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
      className="h-full min-w-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-4"
    >
      <DndContext sensors={sensors} onDragEnd={handleDragEnd} collisionDetection={closestCenter}>
        <SortableContext items={hives.map((h) => h.id)} strategy={rectSortingStrategy}>
          <div className="flex flex-col gap-6">
            {rows.map((row, rowIndex) => (
              <div
                key={rowIndex}
                className={`flex w-full gap-x-4 ${
                  row.isOffset ? `justify-center ${OFFSET_CLASS}` : 'justify-center'
                }`}
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
              </div>
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  )
}
