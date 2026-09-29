'use client'

import { DndContext, KeyboardSensor, PointerSensor, TouchSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, arrayMove, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Card } from '@/components/ui/card'
import { ItemAdder } from './item-adder'
import { ItemRow } from './item-row'
import type { DraftItem, QuoteDraft } from '@/lib/quote-service'

type Update = (fn: (d: QuoteDraft) => QuoteDraft) => void

export function StepItems({ draft, update }: { draft: QuoteDraft; update: Update }) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const patch = (key: string, p: Partial<DraftItem>) =>
    update((d) => ({ ...d, items: d.items.map((i) => (i.key === key ? { ...i, ...p } : i)) }))

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e
    if (!over || active.id === over.id) return
    update((d) => {
      const from = d.items.findIndex((i) => i.key === active.id)
      const to = d.items.findIndex((i) => i.key === over.id)
      return { ...d, items: arrayMove(d.items, from, to) }
    })
  }

  const move = (index: number, dir: -1 | 1) =>
    update((d) => ({ ...d, items: arrayMove(d.items, index, index + dir) }))

  return (
    <div className="flex flex-col gap-4">
      <ItemAdder onAdd={(item) => update((d) => ({ ...d, items: [...d.items, item] }))} />
      {draft.items.length === 0 ? (
        <Card className="py-8 text-center text-muted">Nenhum item ainda. Busque no catálogo acima ou adicione uma peça/serviço avulso.</Card>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={draft.items.map((i) => i.key)} strategy={verticalListSortingStrategy}>
            <div className="flex flex-col gap-3">
              {draft.items.map((item, index) => (
                <ItemRow
                  key={item.key} item={item} index={index} total={draft.items.length} params={draft.params}
                  onChange={(p) => patch(item.key, p)}
                  onRemove={() => update((d) => ({ ...d, items: d.items.filter((i) => i.key !== item.key) }))}
                  onMove={(dir) => move(index, dir)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  )
}
